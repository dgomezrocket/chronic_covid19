# ================================================================
# IMPORTS
# ================================================================

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict
from datetime import date, datetime
from enum import Enum
from app.models.models import RolEnum


# ================================================================
# ENUMS
# ================================================================

class RolEnum(str, Enum):
    paciente = "paciente"
    medico = "medico"
    coordinador = "coordinador"
    admin = "admin"


class GeneroEnum(str, Enum):
    masculino = "masculino"
    femenino = "femenino"
    otro = "otro"


# ========== SCHEMAS DE HOSPITALES ==========

class HospitalBase(BaseModel):
    nombre: str
    codigo: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    barrio: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None

class HospitalCreate(HospitalBase):
    pass

class HospitalUpdate(BaseModel):
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    barrio: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
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
    hospital_id: Optional[int] = None


class PacienteOut(PacienteBase):
    id: int
    rol: RolEnum
    hospital_id: Optional[int] = None
    hospital: Optional["HospitalOut"] = None

    class Config:
        from_attributes = True


# Alias para compatibilidad
PacienteResponse = PacienteOut


class PacienteConMedicoOut(PacienteOut):
    """Paciente con información del médico actualmente asignado"""
    medico_asignado: Optional["MedicoResponse"] = None

    class Config:
        from_attributes = True

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

class CoordinadorCreate(BaseModel):
    documento: str
    nombre: str
    email: EmailStr
    telefono: Optional[str] = None
    password: str
    hospital_id: Optional[int] = None

class CoordinadorUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    documento: Optional[str] = None
    hospital_id: Optional[int] = None

class CoordinadorOut(BaseModel):
    id: int
    documento: str
    nombre: str
    email: EmailStr
    telefono: Optional[str] = None
    hospital_id: Optional[int] = None
    rol: str
    hospital: Optional[HospitalOut] = None

    class Config:
        from_attributes = True


# Alias para compatibilidad
CoordinadorResponse = CoordinadorOut


# ================================================================
# AUTH SCHEMAS
# ================================================================

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Datos contenidos en el token JWT"""
    id: Optional[int] = None
    email: Optional[str] = None
    rol: Optional[RolEnum] = None
    nombre: Optional[str] = None


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


# ================================================================
# PACIENTE SCHEMAS
# ================================================================

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
    hospital_id: Optional[int] = None


class PacienteOut(PacienteBase):
    id: int
    rol: RolEnum
    hospital_id: Optional[int] = None
    hospital: Optional["HospitalOut"] = None

    class Config:
        from_attributes = True


# Alias para compatibilidad
PacienteResponse = PacienteOut


# ================================================================
# MEDICO SCHEMAS
# ================================================================

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
    especialidades: List["EspecialidadOut"] = []
    hospitales: List["HospitalOut"] = []

    class Config:
        from_attributes = True


# Alias para compatibilidad
MedicoResponse = MedicoOut


# ================================================================
# COORDINADOR SCHEMAS
# ================================================================

class CoordinadorBase(BaseModel):
    documento: str
    nombre: str
    email: EmailStr
    telefono: Optional[str] = None
    hospital_id: Optional[int] = None


class CoordinadorCreate(CoordinadorBase):
    """Schema para crear un coordinador (usado por admin)"""
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "documento": "1234567",
                "nombre": "Dr. Juan Coordinador",
                "email": "coordinador@hospital.com",
                "telefono": "0981234567",
                "password": "password123",
                "hospital_id": 1,
            }
        }


class CoordinadorUpdate(BaseModel):
    """Schema para actualizar un coordinador"""
    documento: Optional[str] = None
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    hospital_id: Optional[int] = None

    class Config:
        from_attributes = True


class CoordinadorOut(CoordinadorBase):
    """Schema de salida para Coordinador"""
    id: int
    rol: RolEnum
    hospital: Optional["HospitalOut"] = None

    class Config:
        from_attributes = True


# Alias para compatibilidad
CoordinadorResponse = CoordinadorOut


# ================================================================
# HOSPITAL SCHEMAS
# ================================================================

class HospitalBase(BaseModel):
    nombre: str
    codigo: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    barrio: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None


class HospitalCreate(HospitalBase):
    pass


class HospitalUpdate(BaseModel):
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    barrio: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None


class HospitalOut(HospitalBase):
    id: int

    class Config:
        from_attributes = True


# Alias para compatibilidad
HospitalResponse = HospitalOut


# ================================================================
# ESPECIALIDAD SCHEMAS
# ================================================================

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


# ================================================================
# ASIGNACIÓN MEDICO–PACIENTE SCHEMAS
# ================================================================

class AsignacionBase(BaseModel):
    """Schema base para Asignación"""
    paciente_id: int
    medico_id: int


class AsignacionCreate(AsignacionBase):
    """Schema para crear una asignación médico-paciente"""
    notas: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "paciente_id": 1,
                "medico_id": 1,
                "notas": "Asignación para tratamiento de COVID-19 prolongado"
            }
        }


class AsignacionUpdate(BaseModel):
    """Schema para actualizar una asignación"""
    activo: Optional[bool] = None
    notas: Optional[str] = None
    fecha_desactivacion: Optional[datetime] = None

    class Config:
        from_attributes = True


class AsignacionOut(AsignacionBase):
    """Schema de salida para Asignación con datos completos"""
    id: int
    fecha_asignacion: str  # Mantener como string para compatibilidad
    activo: bool = True
    notas: Optional[str] = None
    fecha_desactivacion: Optional[datetime] = None

    # Datos del paciente (para mostrar en listas)
    paciente: Optional[PacienteOut] = None

    # Datos del médico (para mostrar en listas)
    medico: Optional[MedicoResponse] = None

    @field_validator('fecha_asignacion', mode='before')
    @classmethod
    def convert_datetime_to_str(cls, v):
        if isinstance(v, datetime):
            return v.isoformat()
        return v

    class Config:
        from_attributes = True


# Alias para compatibilidad
AsignacionResponse = AsignacionOut


# ================================================================
# ASIGNACIÓN MEDICO–HOSPITAL SCHEMAS
# ================================================================

class AsignacionMedicoHospitalCreate(BaseModel):
    """Schema para asignar un médico a un hospital"""
    medico_id: int
    hospital_id: int

    class Config:
        json_schema_extra = {
            "example": {
                "medico_id": 1,
                "hospital_id": 1
            }
        }


class RemoverMedicoHospitalRequest(BaseModel):
    """Schema para remover un médico de un hospital"""
    medico_id: int
    hospital_id: int


# ================================================================
# ADMIN SCHEMAS
# ================================================================

class AdminBase(BaseModel):
    nombre: str
    email: str
    documento: str
    telefono: Optional[str] = None


class AdminCreate(AdminBase):
    password: str


class AdminUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    activo: Optional[int] = None


class AdminOut(AdminBase):
    id: int
    activo: int
    fecha_creacion: datetime
    rol: RolEnum

    class Config:
        from_attributes = True


# ================================================================
# MENSAJE SCHEMAS
# ================================================================

class MensajeBase(BaseModel):
    contenido: str
    paciente_id: int
    medico_id: int


class MensajeCreate(MensajeBase):
    pass


class MensajeOut(BaseModel):
    id: int
    timestamp: str
    leido: int

    class Config:
        from_attributes = True


# Alias para compatibilidad
MensajeResponse = MensajeOut


# ================================================================
# FORMULARIOS SCHEMAS
# ================================================================

class PreguntaFormulario(BaseModel):
    """Estructura de una pregunta en el formulario"""
    id: str
    type: str  # text, number, select, date
    label: str
    required: bool = False
    options: Optional[List[str]] = None  # Solo para type='select'
    placeholder: Optional[str] = None
    min_value: Optional[float] = None  # Solo para type='number'
    max_value: Optional[float] = None  # Solo para type='number'


class FormularioBase(BaseModel):
    tipo: str
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    preguntas: List[dict]
    meta: Optional[dict] = None


class FormularioCreate(BaseModel):
    tipo: str = "personalizado"
    titulo: str
    descripcion: Optional[str] = None
    preguntas: List[dict]
    meta: Optional[dict] = None


class FormularioUpdate(BaseModel):
    tipo: Optional[str] = None
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    preguntas: Optional[List[dict]] = None
    activo: Optional[bool] = None
    meta: Optional[dict] = None


class FormularioOut(BaseModel):
    id: int
    tipo: str
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    preguntas: List[dict]
    creador_id: Optional[int] = None
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    activo: bool = True
    meta: Optional[dict] = None

    class Config:
        from_attributes = True


class FormularioListOut(BaseModel):
    """Versión resumida para listados"""
    id: int
    tipo: str
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    creador_id: Optional[int] = None
    fecha_creacion: datetime
    activo: bool = True

    class Config:
        from_attributes = True


# Alias para compatibilidad
FormularioResponse = FormularioOut


# ================================================================
# ASIGNACIONES DE FORMULARIOS SCHEMAS
# ================================================================

class FormularioAsignacionCreate(BaseModel):
    """Crear una asignación de formulario a paciente"""
    paciente_id: int
    fecha_expiracion: Optional[datetime] = None
    datos_extra: Optional[dict] = None


class FormularioAsignacionUpdate(BaseModel):
    """Actualizar una asignación"""
    fecha_expiracion: Optional[datetime] = None
    estado: Optional[str] = None  # pendiente, completado, expirado, cancelado
    datos_extra: Optional[dict] = None


class FormularioAsignacionOut(BaseModel):
    """Respuesta de una asignación"""
    id: int
    formulario_id: int
    paciente_id: int
    asignado_por: int
    fecha_asignacion: datetime
    fecha_expiracion: Optional[datetime] = None
    fecha_completado: Optional[datetime] = None
    numero_instancia: int
    estado: str
    datos_extra: Optional[dict] = None

    class Config:
        from_attributes = True


class FormularioAsignacionDetalleOut(FormularioAsignacionOut):
    """Asignación con datos del formulario incluidos"""
    formulario_titulo: Optional[str] = None
    formulario_tipo: str = ""
    formulario_descripcion: Optional[str] = None

    class Config:
        from_attributes = True


# ================================================================
# RESPUESTAS DE FORMULARIOS SCHEMAS
# ================================================================

class RespuestaFormularioBase(BaseModel):
    respuestas: dict


class RespuestaFormularioCreate(BaseModel):
    """Crear respuesta a un formulario"""
    formulario_id: int
    asignacion_id: Optional[int] = None
    respuestas: dict


class RespuestaFormularioOut(BaseModel):
    """Respuesta completa de un formulario"""
    id: int
    paciente_id: int
    formulario_id: int
    asignacion_id: Optional[int] = None
    respuestas: dict
    timestamp: datetime

    class Config:
        from_attributes = True


# Alias para compatibilidad
RespuestaFormularioResponse = RespuestaFormularioOut


# ================================================================
# SCHEMAS EXTENDIDOS CON RELACIONES
# ================================================================

class PacienteConAsignacionOut(PacienteOut):
    """Paciente con información de su hospital y médico asignado"""
    asignaciones: Optional[List[AsignacionOut]] = []

    # Propiedad computada para obtener el médico actualmente asignado
    @property
    def medico_asignado(self):
        asignacion_activa = next((a for a in self.asignaciones if a.activo), None)
        return asignacion_activa.medico if asignacion_activa else None

    class Config:
        from_attributes = True


class HospitalDetalladoOut(HospitalOut):
    """Hospital con información detallada de coordinadores, médicos y pacientes"""
    coordinadores: List[CoordinadorOut] = []
    medicos: List[MedicoResponse] = []
    pacientes_count: int = 0

    class Config:
        from_attributes = True


class HospitalOutExtended(HospitalOut):
    """Hospital con contadores de médicos y pacientes"""
    total_medicos: int = 0
    total_pacientes: int = 0
    total_coordinadores: int = 0

    class Config:
        from_attributes = True


class MedicoConHospitalesOut(MedicoResponse):
    """Médico con información de hospitales donde trabaja"""
    hospitales: List[HospitalOut] = []

    class Config:
        from_attributes = True


# ================================================================
# SCHEMAS PARA BÚSQUEDAS Y FILTROS
# ================================================================

class HospitalConDistanciaOut(HospitalOut):
    """Hospital con distancia calculada desde un punto"""
    distancia_km: Optional[float] = None

    class Config:
        from_attributes = True


class PacienteSinHospitalOut(BaseModel):
    """Paciente sin hospital asignado con distancias a hospitales cercanos"""
    id: int
    documento: str
    nombre: str
    email: EmailStr
    telefono: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    direccion: Optional[str] = None

    # Hospitales cercanos con distancias
    hospitales_cercanos: List[HospitalConDistanciaOut] = []

    class Config:
        from_attributes = True


class BuscarPacienteOut(BaseModel):
    """Resultado de búsqueda de paciente con información de asignaciones"""
    id: int
    documento: str
    nombre: str
    email: EmailStr
    telefono: Optional[str] = None

    # Hospital y médico asignado
    hospital: Optional[HospitalOut] = None
    medico_asignado: Optional[MedicoResponse] = None
    asignacion_activa: Optional[AsignacionOut] = None

    class Config:
        from_attributes = True


class PacienteUpdateExtended(BaseModel):
    """Schema extendido para actualizar paciente (incluye hospital)"""
    nombre: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    genero: Optional[GeneroEnum] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    hospital_id: Optional[int] = None

    class Config:
        from_attributes = True


# ================================================================
# DASHBOARD DE COORDINADOR
# ================================================================

class CoordinadorDashboardOut(BaseModel):
    """Dashboard del coordinador con estadísticas"""
    coordinador: CoordinadorOut
    hospital: Optional[HospitalDetalladoOut] = None

    # Estadísticas
    total_medicos: int = 0
    total_pacientes: int = 0
    pacientes_asignados: int = 0
    pacientes_sin_asignar: int = 0

    class Config:
        from_attributes = True


class MedicosFiltradosOut(BaseModel):
    """Lista de médicos filtrados por hospital y/o especialidad"""
    total: int
    medicos: List[MedicoConHospitalesOut]

    class Config:
        from_attributes = True


# ================================================================
# RESPUESTAS DE OPERACIONES
# ================================================================

class AsignacionSuccessResponse(BaseModel):
    """Respuesta exitosa de una asignación"""
    message: str
    asignacion: AsignacionOut

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Médico asignado exitosamente al paciente",
                "asignacion": {
                    "id": 1,
                    "paciente_id": 1,
                    "medico_id": 1,
                    "fecha_asignacion": "2025-01-18T10:30:00",
                    "activo": True
                }
            }
        }


class OperacionExitosaResponse(BaseModel):
    """Respuesta genérica para operaciones exitosas"""
    message: str
    id: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Operación realizada exitosamente",
                "id": 1
            }
        }


# ================================================================
# SCHEMAS PARA VALIDACIÓN DE PERMISOS
# ================================================================

class VerificarPermisoRequest(BaseModel):
    """Schema para verificar permisos de un coordinador"""
    coordinador_id: int
    hospital_id: int


class VerificarPermisoResponse(BaseModel):
    """Respuesta de verificación de permisos"""
    tiene_permiso: bool
    mensaje: str

    class Config:
        json_schema_extra = {
            "example": {
                "tiene_permiso": True,
                "mensaje": "El coordinador tiene permiso para operar en este hospital"
            }
        }


# ================================================================
# REPORTES Y ESTADÍSTICAS
# ================================================================

class EstadisticasHospitalOut(BaseModel):
    """Estadísticas de un hospital"""
    hospital_id: int
    hospital_nombre: str
    total_medicos: int
    total_pacientes: int
    pacientes_asignados: int
    pacientes_sin_medico: int
    porcentaje_cobertura: float

    medicos_por_especialidad: Dict[str, int] = {}

    class Config:
        from_attributes = True


class EstadisticasGeneralesOut(BaseModel):
    """Estadísticas generales del sistema"""
    total_hospitales: int
    total_coordinadores: int
    total_medicos: int
    total_pacientes: int
    total_asignaciones_activas: int

    pacientes_con_hospital: int
    pacientes_sin_hospital: int
    pacientes_con_medico: int
    pacientes_sin_medico: int

    class Config:
        from_attributes = True