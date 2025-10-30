import enum
from sqlalchemy import Column, Integer, String, Date, Float, Enum, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
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

    # Relaciones
    formularios = relationship("RespuestaFormulario", back_populates="paciente")
    mensajes = relationship("Mensaje", back_populates="paciente")
    asignaciones = relationship("Asignacion", back_populates="paciente")


class Medico(Base):
    __tablename__ = "medicos"

    id = Column(Integer, primary_key=True, index=True)
    documento = Column(String, unique=True, index=True, nullable=False)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    especialidad = Column(String, nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitales.id"), nullable=True)
    rol = Column(Enum(RolEnum), default=RolEnum.medico, nullable=False)

    # Relaciones
    hospital = relationship("Hospital", back_populates="medicos")
    mensajes = relationship("Mensaje", back_populates="medico")
    asignaciones = relationship("Asignacion", back_populates="medico")
    formularios_creados = relationship("Formulario", back_populates="creador")


class Coordinador(Base):
    __tablename__ = "coordinadores"

    id = Column(Integer, primary_key=True, index=True)
    documento = Column(String, unique=True, index=True, nullable=False)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
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
    distrito = Column(String, nullable=True)
    provincia = Column(String, nullable=True)
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)

    # Relaciones
    medicos = relationship("Medico", back_populates="hospital")
    coordinadores = relationship("Coordinador", back_populates="hospital")


class Asignacion(Base):
    __tablename__ = "asignaciones"

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False)
    medico_id = Column(Integer, ForeignKey("medicos.id"), nullable=False)
    fecha_asignacion = Column(DateTime, default=datetime.utcnow, nullable=False)

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