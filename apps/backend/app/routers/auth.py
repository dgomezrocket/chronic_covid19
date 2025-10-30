from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.db import get_db
from app.models.models import Paciente, Medico, Coordinador, RolEnum
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
    existing = db.query(Paciente).filter(Paciente.email == paciente.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email ya registrado"
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

    # Crear token
    access_token = create_access_token(
        data={"sub": str(nuevo_paciente.id), "rol": nuevo_paciente.rol.value}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register/medico", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_medico(medico: MedicoCreate, db: Session = Depends(get_db)):
    """Registra un nuevo médico en el sistema (puede requerir admin)"""
    # Verificar si el email ya existe
    existing = db.query(Medico).filter(Medico.email == medico.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email ya registrado"
        )

    # Crear nuevo médico
    hashed_password = get_password_hash(medico.password)
    nuevo_medico = Medico(
        documento=medico.documento,
        nombre=medico.nombre,
        email=medico.email,
        hashed_password=hashed_password,
        especialidad=medico.especialidad,
        hospital_id=medico.hospital_id,
        rol=RolEnum.medico
    )
    db.add(nuevo_medico)
    db.commit()
    db.refresh(nuevo_medico)

    # Crear token
    access_token = create_access_token(
        data={"sub": str(nuevo_medico.id), "rol": nuevo_medico.rol.value}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register/coordinador", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_coordinador(coordinador: CoordinadorCreate, db: Session = Depends(get_db)):
    """Registra un nuevo coordinador en el sistema (solo admin)"""
    # Verificar si el email ya existe
    existing = db.query(Coordinador).filter(Coordinador.email == coordinador.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email ya registrado"
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

    # Crear token
    access_token = create_access_token(
        data={"sub": str(nuevo_coordinador.id), "rol": nuevo_coordinador.rol.value}
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ========== LOGIN UNIVERSAL ==========

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login universal para pacientes, médicos y coordinadores"""
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

    # Verificar contraseña
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Crear token
    access_token = create_access_token(
        data={"sub": str(user.id), "rol": user.rol.value}
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ========== INFORMACIÓN DEL USUARIO ACTUAL ==========

@router.get("/me", response_model=UserInfo)
def get_me(current_user=Depends(get_current_user)):
    """Obtiene la información del usuario autenticado"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "nombre": current_user.nombre,
        "rol": current_user.rol.value,
    }


# ========== ALIAS PARA COMPATIBILIDAD ==========

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_default(paciente: PacienteCreate, db: Session = Depends(get_db)):
    """Alias de /register/paciente para compatibilidad"""
    return register_paciente(paciente, db)