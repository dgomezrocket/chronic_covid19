from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.db import SessionLocal
from app.models.models import Paciente, Medico, Coordinador, RolEnum
from app.schemas.schemas import PacienteCreate, Token, TokenData
from app.core.security import get_password_hash, verify_password, create_access_token
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register", response_model=Token)
def register_paciente(paciente: PacienteCreate, db: Session = Depends(get_db)):
    db_paciente = db.query(Paciente).filter(Paciente.email == paciente.email).first()
    if db_paciente:
        raise HTTPException(status_code=400, detail="Email ya registrado")
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
    access_token = create_access_token(data={"sub": str(nuevo_paciente.id), "rol": nuevo_paciente.rol.value})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Paciente).filter(Paciente.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    access_token = create_access_token(data={"sub": str(user.id), "rol": user.rol.value})
    return {"access_token": access_token, "token_type": "bearer"}

