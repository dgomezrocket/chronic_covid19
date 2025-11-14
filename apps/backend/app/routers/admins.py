from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.db import get_db
from app.models.models import Admin, RolEnum
from app.schemas.schemas import AdminCreate, AdminUpdate, AdminOut
from app.core.deps import require_admin
from app.core.security import get_password_hash, get_current_user
from datetime import datetime

router = APIRouter()


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
    if admin.id == current_user.id:
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


