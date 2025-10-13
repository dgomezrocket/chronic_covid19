from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import date, datetime
import enum

class RolEnum(str, enum.Enum):
    paciente = "paciente"
    medico = "medico"
    coordinador = "coordinador"
    admin = "admin"

class PacienteBase(BaseModel):
    documento: str
    nombre: str
    fecha_nacimiento: date
    genero: str
    direccion: Optional[str]
    email: EmailStr
    telefono: Optional[str]
    latitud: Optional[float]
    longitud: Optional[float]

class PacienteCreate(PacienteBase):
    password: str

class PacienteUpdate(PacienteBase):
    pass

class PacienteOut(PacienteBase):
    id: int
    rol: RolEnum
    class Config:
        orm_mode = True

class MedicoBase(BaseModel):
    nombre: str
    especialidad: Optional[str]
    email: EmailStr
    telefono: Optional[str]

class MedicoCreate(MedicoBase):
    pass

class MedicoOut(MedicoBase):
    id: int
    rol: RolEnum
    class Config:
        orm_mode = True

class CoordinadorBase(BaseModel):
    nombre: str
    region: Optional[str]

class CoordinadorCreate(CoordinadorBase):
    pass

class CoordinadorOut(CoordinadorBase):
    id: int
    rol: RolEnum
    class Config:
        orm_mode = True

class HospitalBase(BaseModel):
    nombre: str
    codigo: str
    distrito: Optional[str]
    provincia: Optional[str]
    latitud: Optional[float]
    longitud: Optional[float]

class HospitalCreate(HospitalBase):
    pass

class HospitalOut(HospitalBase):
    id: int
    class Config:
        orm_mode = True

class FormularioBase(BaseModel):
    tipo: str
    preguntas: Any

class FormularioCreate(FormularioBase):
    creador_id: int

class FormularioOut(FormularioBase):
    id: int
    creador_id: int
    class Config:
        orm_mode = True

class RespuestaFormularioBase(BaseModel):
    paciente_id: int
    formulario_id: int
    respuestas: Any
    timestamp: Optional[datetime]

class RespuestaFormularioCreate(RespuestaFormularioBase):
    pass

class RespuestaFormularioOut(RespuestaFormularioBase):
    id: int
    class Config:
        orm_mode = True

class AsignacionOut(BaseModel):
    id: int
    medico_id: int
    paciente_id: int
    fecha_asignacion: datetime
    class Config:
        orm_mode = True

class MensajeBase(BaseModel):
    remitente_id: int
    remitente_rol: RolEnum
    destinatario_id: int
    destinatario_rol: RolEnum
    contenido: str
    timestamp: Optional[datetime]

class MensajeCreate(MensajeBase):
    pass

class MensajeOut(MensajeBase):
    id: int
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[int] = None
    rol: Optional[RolEnum] = None

