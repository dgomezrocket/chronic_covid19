import enum
from sqlalchemy import Column, Integer, String, Date, Float, Enum, ForeignKey, DateTime, JSON, Text, Table, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.db import Base
from datetime import datetime


# ========== ENUMS ==========

class RolEnum(enum.Enum):
    paciente = "paciente"
    medico = "medico"
    coordinador = "coordinador"
    admin = "admin"


class GeneroEnum(enum.Enum):
    masculino = "masculino"
    femenino = "femenino"
    otro = "otro"


# ========== TABLAS DE ASOCIACIÓN (Many-to-Many) ==========

# Tabla intermedia: Médico <-> Hospital
medico_hospital = Table(
    'medico_hospital',
    Base.metadata,
    Column('medico_id', Integer, ForeignKey('medicos.id'), primary_key=True),
    Column('hospital_id', Integer, ForeignKey('hospitales.id'), primary_key=True)
)

# Tabla intermedia: Médico <-> Especialidad
medico_especialidad = Table(
    'medico_especialidad',
    Base.metadata,
    Column('medico_id', Integer, ForeignKey('medicos.id'), primary_key=True),
    Column('especialidad_id', Integer, ForeignKey('especialidades.id'), primary_key=True)
)


# ========== MODELOS ==========

class Paciente(Base):
    __tablename__ = "pacientes"

    id = Column(Integer, primary_key=True, index=True)
    documento = Column(String, unique=True, index=True, nullable=False)
    nombre = Column(String, nullable=False)
    fecha_nacimiento = Column(Date, nullable=False)
    genero = Column(Enum(GeneroEnum), nullable=False)
    direccion = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    telefono = Column(String, nullable=True)
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)
    hashed_password = Column(String, nullable=False)
    rol = Column(Enum(RolEnum), default=RolEnum.paciente, nullable=False)

    hospital_id = Column(Integer, ForeignKey("hospitales.id"), nullable=True)


    # Relaciones
    formularios = relationship("RespuestaFormulario", back_populates="paciente")
    mensajes = relationship("Mensaje", back_populates="paciente")
    asignaciones = relationship("Asignacion", back_populates="paciente")

    hospital = relationship("Hospital", back_populates="pacientes")


class Especialidad(Base):
    __tablename__ = "especialidades"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, nullable=False, index=True)
    descripcion = Column(String, nullable=True)
    activa = Column(Integer, default=1, nullable=False)  # 0 = inactiva, 1 = activa

    # Relación many-to-many con Medico
    medicos = relationship("Medico", secondary=medico_especialidad, back_populates="especialidades")


class Medico(Base):
    __tablename__ = "medicos"

    id = Column(Integer, primary_key=True, index=True)
    documento = Column(String, unique=True, index=True, nullable=False)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    telefono = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    rol = Column(Enum(RolEnum), default=RolEnum.medico, nullable=False)

    # Relaciones Many-to-Many
    especialidades = relationship("Especialidad", secondary=medico_especialidad, back_populates="medicos")
    hospitales = relationship("Hospital", secondary=medico_hospital, back_populates="medicos")

    # Relaciones existentes
    mensajes = relationship("Mensaje", back_populates="medico")
    asignaciones = relationship("Asignacion", back_populates="medico")
    formularios_creados = relationship("Formulario", back_populates="creador")


class Coordinador(Base):
    __tablename__ = "coordinadores"

    id = Column(Integer, primary_key=True, index=True)
    documento = Column(String, unique=True, index=True, nullable=False)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    telefono = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitales.id"), nullable=True)
    rol = Column(Enum(RolEnum), default=RolEnum.coordinador, nullable=False)

    # Relaciones
    hospital = relationship("Hospital", back_populates="coordinadores")


class Hospital(Base):
    __tablename__ = "hospitales"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    codigo = Column(String, unique=True, nullable=True)
    departamento = Column(String, nullable=True)
    ciudad = Column(String, nullable=True)
    barrio = Column(String, nullable=True)
    direccion = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)

    # Relaciones
    medicos = relationship("Medico", secondary=medico_hospital, back_populates="hospitales")
    coordinadores = relationship("Coordinador", back_populates="hospital")
    pacientes = relationship("Paciente", back_populates="hospital")


class Asignacion(Base):
    __tablename__ = "asignaciones"

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False)
    medico_id = Column(Integer, ForeignKey("medicos.id"), nullable=False)
    fecha_asignacion = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    activo = Column(Boolean, default=True, nullable=False)

    # 🆕 NUEVO: Información adicional
    notas = Column(String, nullable=True)  # Notas de la asignación
    fecha_desactivacion = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    paciente = relationship("Paciente", back_populates="asignaciones")
    medico = relationship("Medico", back_populates="asignaciones")


class Formulario(Base):
    __tablename__ = "formularios"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String, nullable=False)
    preguntas = Column(JSON, nullable=False)
    creador_id = Column(Integer, ForeignKey("medicos.id"), nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relaciones
    creador = relationship("Medico", back_populates="formularios_creados")
    respuestas = relationship("RespuestaFormulario", back_populates="formulario")


class RespuestaFormulario(Base):
    __tablename__ = "respuestas_formularios"

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False)
    formulario_id = Column(Integer, ForeignKey("formularios.id"), nullable=False)
    respuestas = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relaciones
    paciente = relationship("Paciente", back_populates="formularios")
    formulario = relationship("Formulario", back_populates="respuestas")


class Mensaje(Base):
    __tablename__ = "mensajes"

    id = Column(Integer, primary_key=True, index=True)
    contenido = Column(Text, nullable=False)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False)
    medico_id = Column(Integer, ForeignKey("medicos.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    leido = Column(Integer, default=0, nullable=False)  # 0 = no leído, 1 = leído

    # Relaciones
    paciente = relationship("Paciente", back_populates="mensajes")
    medico = relationship("Medico", back_populates="mensajes")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    documento = Column(String, unique=True, nullable=False, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    telefono = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    rol = Column(Enum(RolEnum), default=RolEnum.admin, nullable=False)
    activo = Column(Integer, default=1, nullable=False)  # 0 = inactivo, 1 = activo
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Admin(id={self.id}, nombre='{self.nombre}', email='{self.email}')>"