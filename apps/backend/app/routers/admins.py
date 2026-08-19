import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import require_admin
from app.core.security import get_password_hash, get_current_user
from app.db.db import get_db
from app.models.models import Admin, AdminInvitation, Coordinador, Medico, Paciente, RolEnum
from app.schemas.schemas import (
    AdminCreate,
    AdminInvitationAccept,
    AdminInvitationCreate,
    AdminInvitationValidateOut,
    AdminOut,
    AdminUpdate,
    MessageResponse,
)
from app.services import email_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ================================================================
# INVITACIONES DE ADMINISTRADOR
# IMPORTANTE: estas rutas estáticas deben declararse ANTES de las
# rutas dinámicas /{admin_id} para que FastAPI no intente parsear
# "invitaciones" como admin_id.
# ================================================================

def _hash_token(token: str) -> str:
    """Devuelve el hash SHA-256 (hex) del token. Nunca se guarda el token en claro."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _email_registrado(db: Session, email: str) -> bool:
    """Indica si el email ya pertenece a una cuenta existente en cualquiera de las 4 tablas de login."""
    email = email.lower()
    for modelo in (Paciente, Medico, Coordinador, Admin):
        if db.query(modelo).filter(modelo.email == email).first():
            return True
    return False


def _invitacion_valida_por_token(db: Session, token: str) -> AdminInvitation | None:
    """Busca una invitación pendiente (no aceptada, no revocada, no expirada) por token."""
    invitacion = (
        db.query(AdminInvitation)
        .filter(AdminInvitation.token_hash == _hash_token(token))
        .first()
    )
    if not invitacion:
        return None
    if invitacion.accepted_at is not None or invitacion.revoked_at is not None:
        return None
    if invitacion.expires_at < datetime.utcnow():
        return None
    return invitacion


def _invitacion_pendiente_por_email(db: Session, email: str) -> AdminInvitation | None:
    """Devuelve una invitación pendiente y válida para el email, si existe."""
    return (
        db.query(AdminInvitation)
        .filter(
            AdminInvitation.email == email.lower(),
            AdminInvitation.accepted_at.is_(None),
            AdminInvitation.revoked_at.is_(None),
            AdminInvitation.expires_at > datetime.utcnow(),
        )
        .first()
    )


def _crear_y_enviar_invitacion(db: Session, email: str, invited_by_admin_id: int) -> None:
    """Genera un token seguro, persiste la invitación y envía el email. No loguea el token."""
    token = secrets.token_urlsafe(32)
    expira_horas = settings.ADMIN_INVITATION_TOKEN_EXPIRE_HOURS
    invitacion = AdminInvitation(
        email=email.lower(),
        token_hash=_hash_token(token),
        invited_by_admin_id=invited_by_admin_id,
        expires_at=datetime.utcnow() + timedelta(hours=expira_horas),
    )
    db.add(invitacion)
    db.commit()

    # El fallo de envío no debe deshacer la invitación ya persistida.
    try:
        email_service.enviar_invitacion_admin(email.lower(), token, expira_horas)
    except email_service.EmailNoConfiguradoError:
        logger.warning("SMTP no configurado: no se envió el email de invitación de admin.")
    except Exception:  # noqa: BLE001
        logger.exception("Fallo al enviar el email de invitación de admin.")


@router.post("/invitaciones", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def crear_invitacion_admin(
        payload: AdminInvitationCreate,
        db: Session = Depends(get_db),
        current_user=Depends(require_admin)
):
    """Crea y envía una invitación por email para registrar un nuevo administrador."""
    email = payload.email.lower()

    if _email_registrado(db, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta registrada con este correo electrónico."
        )

    if _invitacion_pendiente_por_email(db, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una invitación pendiente para este correo electrónico."
        )

    _crear_y_enviar_invitacion(db, email, current_user["id"])
    return {"message": "Invitación enviada correctamente."}


@router.get("/invitaciones/validar", response_model=AdminInvitationValidateOut)
def validar_invitacion_admin(
        token: str,
        db: Session = Depends(get_db)
):
    """Valida un token de invitación (endpoint público). Devuelve el email precompletado."""
    invitacion = _invitacion_valida_por_token(db, token)
    if not invitacion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta invitación ya no es válida o ha expirado."
        )
    return {"email": invitacion.email}


@router.post("/invitaciones/aceptar", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def aceptar_invitacion_admin(
        payload: AdminInvitationAccept,
        db: Session = Depends(get_db)
):
    """Acepta la invitación y crea la cuenta de administrador (endpoint público, transaccional)."""
    invitacion = _invitacion_valida_por_token(db, payload.token)
    if not invitacion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta invitación ya no es válida o ha expirado."
        )

    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 6 caracteres."
        )

    # Revalidar que el email no esté registrado (pudo registrarse entre invitación y aceptación).
    if _email_registrado(db, invitacion.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta registrada con este correo electrónico."
        )

    # Validar documento no duplicado en admins.
    if db.query(Admin).filter(Admin.documento == payload.documento).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un administrador con ese documento."
        )

    try:
        nuevo_admin = Admin(
            nombre=payload.nombre,
            email=invitacion.email.lower(),
            documento=payload.documento,
            telefono=payload.telefono,
            hashed_password=get_password_hash(payload.password),
            rol=RolEnum.admin,
            activo=1,
            fecha_creacion=datetime.utcnow(),
        )
        db.add(nuevo_admin)
        invitacion.accepted_at = datetime.utcnow()
        db.commit()
    except Exception:  # noqa: BLE001
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo completar el registro. Intentá nuevamente."
        )

    return {"message": "Cuenta de administrador creada correctamente."}


@router.post("/invitaciones/{invitacion_id}/reenviar", response_model=MessageResponse)
def reenviar_invitacion_admin(
        invitacion_id: int,
        db: Session = Depends(get_db),
        current_user=Depends(require_admin)
):
    """Reenvía una invitación: revoca las pendientes de ese email y genera un token nuevo."""
    invitacion = db.query(AdminInvitation).filter(AdminInvitation.id == invitacion_id).first()
    if not invitacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no encontrada."
        )

    if invitacion.accepted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta invitación ya fue aceptada."
        )

    email = invitacion.email.lower()
    if _email_registrado(db, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta registrada con este correo electrónico."
        )

    # Revocar todas las invitaciones pendientes de ese email antes de generar una nueva.
    ahora = datetime.utcnow()
    db.query(AdminInvitation).filter(
        AdminInvitation.email == email,
        AdminInvitation.accepted_at.is_(None),
        AdminInvitation.revoked_at.is_(None),
    ).update({AdminInvitation.revoked_at: ahora}, synchronize_session=False)
    db.commit()

    _crear_y_enviar_invitacion(db, email, current_user["id"])
    return {"message": "Invitación reenviada correctamente."}


@router.get("/", response_model=List[AdminOut])
def get_all_admins(
        incluir_inactivos: bool = False,
        db: Session = Depends(get_db),
        current_user=Depends(require_admin)
):
    """Obtiene todos los administradores (solo admin)"""
    query = db.query(Admin)

    if not incluir_inactivos:
        query = query.filter(Admin.activo == 1)

    admins = query.order_by(Admin.nombre).all()
    return admins


@router.get("/{admin_id}", response_model=AdminOut)
def get_admin_by_id(
        admin_id: int,
        db: Session = Depends(get_db),
        current_user=Depends(get_current_user)  # ← AHORA FUNCIONARÁ
):
    """Obtiene un administrador por ID - el admin puede ver su propio perfil, u otro admin puede ver cualquier perfil"""

    # Verificar que sea admin o que esté viendo su propio perfil
    if current_user["rol"] != "admin" and current_user["id"] != admin_id:  # ← CAMBIO: acceder como dict
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver este perfil de administrador"
        )

    admin = db.query(Admin).filter(Admin.id == admin_id).first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrador no encontrado"
        )

    return admin


@router.post("/", response_model=AdminOut, status_code=status.HTTP_201_CREATED)
def create_admin(
        admin: AdminCreate,
        db: Session = Depends(get_db),
        current_user=Depends(require_admin)
):
    """Crea un nuevo administrador (solo admin)"""
    # Verificar si ya existe un admin con ese email
    existing_email = db.query(Admin).filter(Admin.email == admin.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un administrador con ese email"
        )

    # Verificar si ya existe un admin con ese documento
    existing_doc = db.query(Admin).filter(Admin.documento == admin.documento).first()
    if existing_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un administrador con ese documento"
        )

    # Crear el admin
    nuevo_admin = Admin(
        nombre=admin.nombre,
        email=admin.email.lower(),
        documento=admin.documento,
        telefono=admin.telefono,
        hashed_password=get_password_hash(admin.password),
        rol=RolEnum.admin,
        activo=1,
        fecha_creacion=datetime.utcnow()
    )

    db.add(nuevo_admin)
    db.commit()
    db.refresh(nuevo_admin)

    return nuevo_admin


@router.put("/{admin_id}", response_model=AdminOut)
def update_admin(
        admin_id: int,
        admin_update: AdminUpdate,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """Actualiza un administrador - el admin puede actualizar su propio perfil, u otro admin puede actualizar cualquier perfil"""

    # Verificar que sea admin o que esté editando su propio perfil
    if current_user["rol"] != "admin" and current_user["id"] != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para actualizar este perfil de administrador"
        )

    admin = db.query(Admin).filter(Admin.id == admin_id).first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrador no encontrado"
        )

    # Verificar email duplicado si se está cambiando
    update_data = admin_update.model_dump(exclude_unset=True)
    if "email" in update_data and update_data["email"] != admin.email:
        existing = db.query(Admin).filter(
            Admin.email == update_data["email"]
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un administrador con ese email"
            )
        update_data["email"] = update_data["email"].lower()

    # Verificar documento duplicado si se está cambiando
    if "documento" in update_data and update_data["documento"] != admin.documento:
        existing_doc = db.query(Admin).filter(
            Admin.documento == update_data["documento"]
        ).first()
        if existing_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un administrador con ese documento"
            )

    # Actualizar campos
    for field, value in update_data.items():
        setattr(admin, field, value)

    db.commit()
    db.refresh(admin)

    return admin


@router.delete("/{admin_id}", status_code=status.HTTP_200_OK)
def deactivate_admin(
        admin_id: int,
        db: Session = Depends(get_db),
        current_user=Depends(require_admin)
):
    """Desactiva un administrador (solo admin)"""
    admin = db.query(Admin).filter(Admin.id == admin_id).first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrador no encontrado"
        )

    # No permitir que un admin se desactive a sí mismo
    if admin.id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivarte a ti mismo"
        )

    # Verificar que no sea el último admin activo
    active_admins = db.query(Admin).filter(Admin.activo == 1).count()
    if active_admins <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede desactivar el último administrador activo"
        )

    # Desactivar (baja lógica)
    admin.activo = 0
    db.commit()

    return {"message": "Administrador desactivado exitosamente", "id": admin_id}


@router.post("/{admin_id}/reactivar", response_model=AdminOut)
def reactivate_admin(
        admin_id: int,
        db: Session = Depends(get_db),
        current_user=Depends(require_admin)
):
    """Reactiva un administrador desactivado (solo admin)"""
    admin = db.query(Admin).filter(Admin.id == admin_id).first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrador no encontrado"
        )

    admin.activo = 1
    db.commit()
    db.refresh(admin)

    return admin


