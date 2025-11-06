from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date
from enum import Enum


# ========== ENUMS ==========

class RolEnum(str, Enum):
    paciente = "paciente"
    medico = "medico"
    coordinador = "coordinador"
    admin = "admin"


class GeneroEnum(str, Enum):
    masculino = "masculino"
    femenino = "femenino"
    otro = "otro"


# ========== HOSPITAL SCHEMAS ==========

class HospitalBase(BaseModel):
    nombre: str
    codigo: Optional[str] = None
    departamento: Optional[str] = None
    ciudad: Optional[str] = None
    barrio: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None


class HospitalCreate(HospitalBase):
    pass


class HospitalUpdate(BaseModel):
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    departamento: Optional[str] = None
    ciudad: Optional[str] = None
    barrio: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None


class HospitalOut(HospitalBase):
    id: int

    class Config:
        from_attributes = True


# Alias para compatibilidad
HospitalResponse = HospitalOut


# ========== ESPECIALIDAD SCHEMAS ==========

class EspecialidadBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    activa: int = 1


class EspecialidadCreate(EspecialidadBase):
    pass


class EspecialidadUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[int] = None


class EspecialidadOut(EspecialidadBase):
    id: int

    class Config:
        from_attributes = True


# Alias para compatibilidad
EspecialidadResponse = EspecialidadOut


# ========== PACIENTE SCHEMAS ==========

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
    fecha_nacimiento: Optional[date] = None
    genero: Optional[GeneroEnum] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    email: Optional[EmailStr] = None


class PacienteOut(PacienteBase):
    id: int
    rol: RolEnum

    class Config:
        from_attributes = True


# Alias para compatibilidad
PacienteResponse = PacienteOut


# ========== MEDICO SCHEMAS ==========

class MedicoBase(BaseModel):
    documento: str
    nombre: str
    email: EmailStr
    telefono: Optional[str] = None


class MedicoCreate(MedicoBase):
    password: str
    especialidad_ids: Optional[List[int]] = []
    hospital_ids: Optional[List[int]] = []


class MedicoUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    especialidad_ids: Optional[List[int]] = None
    hospital_ids: Optional[List[int]] = None


class MedicoOut(MedicoBase):
    id: int
    rol: RolEnum
    especialidades: List[EspecialidadOut] = []
    hospitales: List[HospitalOut] = []

    class Config:
        from_attributes = True


# Alias para compatibilidad
MedicoResponse = MedicoOut


# ========== COORDINADOR SCHEMAS ==========

class CoordinadorBase(BaseModel):
    documento: str
    nombre: str
    email: EmailStr
    hospital_id: Optional[int] = None


class CoordinadorCreate(CoordinadorBase):
    password: str


class CoordinadorUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    hospital_id: Optional[int] = None


class CoordinadorOut(CoordinadorBase):
    id: int
    rol: RolEnum
    hospital: Optional[HospitalOut] = None

    class Config:
        from_attributes = True


# Alias para compatibilidad
CoordinadorResponse = CoordinadorOut


# ========== AUTH SCHEMAS ==========

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    id: int
    email: str
    nombre: str
    rol: str

    class Config:
        from_attributes = True


# ========== MENSAJE SCHEMAS ==========

class MensajeBase(BaseModel):
    contenido: str
    paciente_id: int
    medico_id: int


class MensajeCreate(MensajeBase):
    pass


class MensajeOut(MensajeBase):
    id: int
    timestamp: str
    leido: int

    class Config:
        from_attributes = True


# Alias para compatibilidad
MensajeResponse = MensajeOut


# ========== FORMULARIO SCHEMAS ==========

class FormularioBase(BaseModel):
    tipo: str
    preguntas: dict


class FormularioCreate(FormularioBase):
    creador_id: Optional[int] = None


class FormularioOut(FormularioBase):
    id: int
    fecha_creacion: str
    creador_id: Optional[int] = None

    class Config:
        from_attributes = True


# Alias para compatibilidad
FormularioResponse = FormularioOut


class RespuestaFormularioBase(BaseModel):
    paciente_id: int
    formulario_id: int
    respuestas: dict


class RespuestaFormularioCreate(RespuestaFormularioBase):
    pass


class RespuestaFormularioOut(RespuestaFormularioBase):
    id: int
    timestamp: str

    class Config:
        from_attributes = True


# Alias para compatibilidad
RespuestaFormularioResponse = RespuestaFormularioOut


# ========== ASIGNACION SCHEMAS ==========

class AsignacionBase(BaseModel):
    paciente_id: int
    medico_id: int


class AsignacionCreate(AsignacionBase):
    pass


class AsignacionOut(AsignacionBase):
    id: int
    fecha_asignacion: str

    class Config:
        from_attributes = True


# Alias para compatibilidad
AsignacionResponse = AsignacionOut