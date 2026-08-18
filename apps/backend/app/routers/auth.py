import hashlib
import logging
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.db import get_db
from app.models.models import (
    Paciente, Medico, Coordinador, Hospital, Admin, RolEnum, Especialidad,
    PasswordResetToken,
)  # Agregar Hospital aquí
from app.schemas.schemas import (
    PacienteCreate, MedicoCreate, CoordinadorCreate,
    Token, UserInfo,
    ForgotPasswordRequest, ResetPasswordRequest, MessageResponse,
)
from app.core.security import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from app.core.config import settings
from app.services import email_service
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

router = APIRouter()

# Orden de búsqueda de cuentas por email (los usuarios viven en varias tablas).
_MODELOS_POR_ROL = [
    ("paciente", Paciente),
    ("medico", Medico),
    ("coordinador", Coordinador),
    ("admin", Admin),
]


# ========== REGISTRO DE USUARIOS ==========

@router.post("/register/paciente", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_paciente(paciente: PacienteCreate, db: Session = Depends(get_db)):
    """Registra un nuevo paciente en el sistema"""
    # Verificar si el email ya existe
    existing_email = db.query(Paciente).filter(Paciente.email == paciente.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )

    # Verificar si el documento ya existe
    existing_doc = db.query(Paciente).filter(Paciente.documento == paciente.documento).first()
    if existing_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El documento de identidad ya está registrado"
        )

    # Crear nuevo paciente
    hashed_password = get_password_hash(paciente.password)
    nuevo_paciente = Paciente(
        documento=paciente.documento,
        nombre=paciente.nombre,
        fecha_nacimiento=paciente.fecha_nacimiento,
        genero=paciente.genero,
        direccion=paciente.direccion,
        email=paciente.email,
        telefono=paciente.telefono,
        latitud=paciente.latitud,
        longitud=paciente.longitud,
        hashed_password=hashed_password,
        rol=RolEnum.paciente
    )
    db.add(nuevo_paciente)
    db.commit()
    db.refresh(nuevo_paciente)

    # Crear token con nombre y email incluidos
    access_token = create_access_token(
        data={
            "sub": str(nuevo_paciente.id),
            "rol": nuevo_paciente.rol.value,
            "email": nuevo_paciente.email,
            "nombre": nuevo_paciente.nombre
        }
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register/medico", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_medico(medico: MedicoCreate, db: Session = Depends(get_db)):
    """Registra un nuevo médico en el sistema"""
    from app.services.medico_service import crear_medico, MedicoValidationError

    # Verificar que las especialidades existan (por ID, solo activas)
    especialidades = []
    if medico.especialidad_ids:
        for esp_id in medico.especialidad_ids:
            especialidad = db.query(Especialidad).filter(
                Especialidad.id == esp_id,
                Especialidad.activa == 1
            ).first()
            if not especialidad:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Especialidad con ID {esp_id} no encontrada o inactiva"
                )
            especialidades.append(especialidad)

    # Verificar que los hospitales existan (por ID)
    hospitales = []
    if medico.hospital_ids:
        for hospital_id in medico.hospital_ids:
            hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
            if not hospital:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Hospital con ID {hospital_id} no encontrado"
                )
            hospitales.append(hospital)

    # Crear el médico reutilizando la lógica compartida (valida email/documento, hashea, asocia M2M)
    try:
        nuevo_medico = crear_medico(
            db,
            documento=medico.documento,
            nombre=medico.nombre,
            email=medico.email,
            telefono=medico.telefono,
            password=medico.password,
            especialidades=especialidades,
            hospitales=hospitales,
        )
    except MedicoValidationError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Crear token
    access_token = create_access_token(
        data={
            "sub": str(nuevo_medico.id),
            "rol": nuevo_medico.rol.value,
            "email": nuevo_medico.email,
            "nombre": nuevo_medico.nombre
        }
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register/coordinador", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_coordinador(coordinador: CoordinadorCreate, db: Session = Depends(get_db)):
    """Registra un nuevo coordinador en el sistema (solo admin)"""
    # Verificar si el email ya existe
    existing_email = db.query(Coordinador).filter(Coordinador.email == coordinador.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )

    # Verificar si el documento ya existe
    existing_doc = db.query(Coordinador).filter(Coordinador.documento == coordinador.documento).first()
    if existing_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El documento de identidad ya está registrado"
        )

    # Crear nuevo coordinador
    hashed_password = get_password_hash(coordinador.password)
    nuevo_coordinador = Coordinador(
        documento=coordinador.documento,
        nombre=coordinador.nombre,
        email=coordinador.email,
        hashed_password=hashed_password,
        hospital_id=coordinador.hospital_id,
        rol=RolEnum.coordinador
    )
    db.add(nuevo_coordinador)
    db.commit()
    db.refresh(nuevo_coordinador)

    # Crear token con nombre y email incluidos
    access_token = create_access_token(
        data={
            "sub": str(nuevo_coordinador.id),
            "rol": nuevo_coordinador.rol.value,
            "email": nuevo_coordinador.email,
            "nombre": nuevo_coordinador.nombre
        }
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ========== LOGIN UNIVERSAL ==========


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login universal para pacientes, médicos, coordinadores y administradores"""
    # Buscar en todas las tablas de usuarios
    user = None
    user_type = None

    # Buscar en pacientes
    user = db.query(Paciente).filter(Paciente.email == form_data.username).first()
    if user:
        user_type = "paciente"

    # Si no es paciente, buscar en médicos
    if not user:
        user = db.query(Medico).filter(Medico.email == form_data.username).first()
        if user:
            user_type = "medico"

    # Si no es médico, buscar en coordinadores
    if not user:
        user = db.query(Coordinador).filter(Coordinador.email == form_data.username).first()
        if user:
            user_type = "coordinador"

    # Si no es coordinador, buscar en administradores
    if not user:
        user = db.query(Admin).filter(Admin.email == form_data.username).first()
        if user:
            user_type = "admin"
            # Verificar que el admin esté activo
            if user.activo == 0:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cuenta de administrador desactivada. Contacta al sistema.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    # Verificar contraseña
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Crear token con nombre y email incluidos
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "rol": user.rol.value,
            "email": user.email,
            "nombre": user.nombre
        }
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ========== INFORMACIÓN DEL USUARIO ACTUAL ==========

@router.get("/me", response_model=UserInfo)
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtiene la información del usuario autenticado"""
    user_id = current_user["id"]
    user_rol = current_user["rol"]

    # Buscar según el rol
    if user_rol == "paciente":
        user = db.query(Paciente).filter(Paciente.id == user_id).first()
    elif user_rol == "medico":
        user = db.query(Medico).filter(Medico.id == user_id).first()
    elif user_rol == "coordinador":
        user = db.query(Coordinador).filter(Coordinador.id == user_id).first()
    elif user_rol == "admin":
        user = db.query(Admin).filter(Admin.id == user_id).first()
    else:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Retornar información básica del usuario
    return {
        "id": user.id,
        "email": user.email,
        "nombre": user.nombre,
        "rol": user.rol.value,
        "documento": user.documento if hasattr(user, 'documento') else None,
        "telefono": user.telefono if hasattr(user, 'telefono') else None,
        "debe_cambiar_password": bool(getattr(user, "debe_cambiar_password", False)),
    }


# ========== ALIAS PARA COMPATIBILIDAD ==========

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_default(paciente: PacienteCreate, db: Session = Depends(get_db)):
    """Alias de /register/paciente para compatibilidad"""
    return register_paciente(paciente, db)


# ========== RECUPERACIÓN DE CONTRASEÑA ==========

def _hash_token(token: str) -> str:
    """Hash SHA-256 (hex) del token; nunca se guarda el token en claro."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _buscar_cuenta_por_email(db: Session, email: str):
    """Busca una cuenta por email en las 4 tablas de usuarios. Devuelve (rol, user) o (None, None)."""
    for rol, modelo in _MODELOS_POR_ROL:
        user = db.query(modelo).filter(modelo.email == email).first()
        if user:
            return rol, user
    return None, None


def _modelo_por_rol(rol: str):
    for r, modelo in _MODELOS_POR_ROL:
        if r == rol:
            return modelo
    return None


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Solicita la recuperación de contraseña. Por seguridad, la respuesta es SIEMPRE
    genérica: no revela si el email está o no registrado.
    """
    mensaje_generico = {
        "message": "Si el email está registrado, te enviamos instrucciones para restablecer la contraseña."
    }

    email = str(body.email).strip().lower()
    rol, user = _buscar_cuenta_por_email(db, email)
    if not user:
        return mensaje_generico

    # Invalidar tokens anteriores no usados de esta cuenta.
    db.query(PasswordResetToken).filter(
        PasswordResetToken.email == email,
        PasswordResetToken.used == False,  # noqa: E712
    ).update({PasswordResetToken.used: True})

    token = secrets.token_urlsafe(32)
    expira_minutos = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    reset = PasswordResetToken(
        token_hash=_hash_token(token),
        rol=rol,
        usuario_id=user.id,
        email=email,
        expires_at=datetime.utcnow() + timedelta(minutes=expira_minutos),
        used=False,
    )
    db.add(reset)
    db.commit()

    # El fallo de envío NO debe romper la respuesta genérica ni revelar información.
    try:
        email_service.enviar_recuperacion_password(
            email=email,
            nombre=getattr(user, "nombre", ""),
            token=token,
            expira_minutos=expira_minutos,
        )
    except email_service.EmailNoConfiguradoError:
        logger.warning("SMTP no configurado: no se envió el correo de recuperación.")
    except Exception as e:  # noqa: BLE001
        logger.error("Falló el envío del correo de recuperación: %s", e)

    return mensaje_generico


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Restablece la contraseña usando el token recibido por email. El token es de un
    solo uso y con expiración.
    """
    error_invalido = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="El código de recuperación es inválido o expiró.",
    )

    if not body.new_password or len(body.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 6 caracteres.",
        )

    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == _hash_token(body.token),
        PasswordResetToken.used == False,  # noqa: E712
    ).first()
    if not reset or reset.expires_at < datetime.utcnow():
        raise error_invalido

    modelo = _modelo_por_rol(reset.rol)
    user = db.query(modelo).filter(modelo.id == reset.usuario_id).first() if modelo else None
    if not user:
        raise error_invalido

    user.hashed_password = get_password_hash(body.new_password)
    reset.used = True
    db.commit()

    return {"message": "Tu contraseña fue actualizada correctamente. Ya podés iniciar sesión."}