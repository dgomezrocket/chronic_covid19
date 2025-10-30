from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from app.models.models import RolEnum, GeneroEnum


# ===== Token schemas =====
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None
    rol: Optional[str] = None


# ===== User Info =====
class UserInfo(BaseModel):
    id: int
    email: str
    nombre: str
    rol: str


# ===== Paciente schemas =====
class PacienteBase(BaseModel):
    documento: str
    nombre: str
    fecha_nacimiento: date
    genero: GeneroEnum
    direccion: Optional[str] = None
    email: EmailStr
    telefono: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None


class PacienteCreate(PacienteBase):
    password: str


class PacienteUpdate(BaseModel):
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None


class PacienteOut(PacienteBase):
    id: int
    rol: RolEnum

    class Config:
        from_attributes = True


# ===== Medico schemas =====
class MedicoBase(BaseModel):
    documento: str
    nombre: str
    email: EmailStr
    especialidad: Optional[str] = None
    hospital_id: Optional[int] = None


class MedicoCreate(MedicoBase):
    password: str


class MedicoOut(MedicoBase):
    id: int
    rol: RolEnum

    class Config:
        from_attributes = True


# ===== Coordinador schemas =====
class CoordinadorBase(BaseModel):
    documento: str
    nombre: str
    email: EmailStr
    hospital_id: Optional[int] = None


class CoordinadorCreate(CoordinadorBase):
    password: str


class CoordinadorOut(CoordinadorBase):
    id: int
    rol: RolEnum

    class Config:
        from_attributes = True


# ===== Formulario schemas =====
class RespuestaFormularioCreate(BaseModel):
    formulario_id: int
    respuestas: dict
    timestamp: Optional[datetime] = None


class RespuestaFormularioOut(BaseModel):
    id: int
    paciente_id: int
    formulario_id: int
    respuestas: dict
    timestamp: datetime

    class Config:
        from_attributes = True


# ===== Hospital schemas =====
class HospitalOut(BaseModel):
    id: int
    nombre: str
    codigo: Optional[str] = None
    distrito: Optional[str] = None
    provincia: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None

    class Config:
        from_attributes = True


# ===== Formulario schemas =====
class FormularioCreate(BaseModel):
    tipo: str
    preguntas: dict


class FormularioOut(BaseModel):
    id: int
    tipo: str
    preguntas: dict
    creador_id: Optional[int] = None

    class Config:
        from_attributes = True


# ===== Mensaje schemas =====
class MensajeOut(BaseModel):
    id: int
    contenido: str
    paciente_id: int
    medico_id: int
    timestamp: datetime

    class Config:
        from_attributes = True