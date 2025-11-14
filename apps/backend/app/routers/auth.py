from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.db import get_db
from app.models.models import Paciente, Medico, Coordinador, Hospital, Admin, RolEnum  # Agregar Hospital aquí
from app.schemas.schemas import (
    PacienteCreate, MedicoCreate, CoordinadorCreate,
    Token, UserInfo
)
from app.core.security import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

router = APIRouter()


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
    from app.models.models import Especialidad

    # Verificar si el email ya existe en médicos
    existing_email = db.query(Medico).filter(Medico.email == medico.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )

    # Verificar si el email ya existe en pacientes
    existing_email_paciente = db.query(Paciente).filter(Paciente.email == medico.email).first()
    if existing_email_paciente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )

    # Verificar si el documento ya existe
    existing_doc = db.query(Medico).filter(Medico.documento == medico.documento).first()
    if existing_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El documento de identidad ya está registrado"
        )

    # Verificar que las especialidades existan
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

    # Verificar que los hospitales existan
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

    # Crear nuevo médico
    hashed_password = get_password_hash(medico.password)
    nuevo_medico = Medico(
        documento=medico.documento,
        nombre=medico.nombre,
        email=medico.email,
        telefono=medico.telefono,
        hashed_password=hashed_password,
        rol=RolEnum.medico
    )

    # Agregar el médico a la sesión PRIMERO
    db.add(nuevo_medico)

    # Flush para obtener el ID antes de asociar relaciones
    db.flush()

    # Asociar especialidades y hospitales
    if especialidades:
        nuevo_medico.especialidades = especialidades
    if hospitales:
        nuevo_medico.hospitales = hospitales

    db.commit()
    db.refresh(nuevo_medico)

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
    }


# ========== ALIAS PARA COMPATIBILIDAD ==========

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_default(paciente: PacienteCreate, db: Session = Depends(get_db)):
    """Alias de /register/paciente para compatibilidad"""
    return register_paciente(paciente, db)