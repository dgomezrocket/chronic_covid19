from sqlalchemy import Column, Integer, String, Date, ForeignKey, Float, Text, DateTime, JSON, Enum, Table
from sqlalchemy.orm import relationship
from app.db.db import Base
import enum

class RolEnum(enum.Enum):
    paciente = "paciente"
    medico = "medico"
    coordinador = "coordinador"
    admin = "admin"

class Paciente(Base):
    __tablename__ = "pacientes"
    id = Column(Integer, primary_key=True, index=True)
    documento = Column(String, unique=True, index=True, nullable=False)
    nombre = Column(String, nullable=False)
    fecha_nacimiento = Column(Date, nullable=False)
    genero = Column(String, nullable=False)
    direccion = Column(String)
    email = Column(String, unique=True, index=True, nullable=False)
    telefono = Column(String)
    latitud = Column(Float)
    longitud = Column(Float)
    hashed_password = Column(String, nullable=False)
    rol = Column(Enum(RolEnum), default=RolEnum.paciente)
    formularios = relationship("RespuestaFormulario", back_populates="paciente")
    hospitales = relationship("PacienteHospital", back_populates="paciente")
    mensajes = relationship("Mensaje", back_populates="paciente")

class Medico(Base):
    __tablename__ = "medicos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    especialidad = Column(String)
    email = Column(String, unique=True, index=True, nullable=False)
    telefono = Column(String)
    rol = Column(Enum(RolEnum), default=RolEnum.medico)
    pacientes = relationship("Asignacion", back_populates="medico")
    mensajes = relationship("Mensaje", back_populates="medico")

class Coordinador(Base):
    __tablename__ = "coordinadores"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    region = Column(String)
    rol = Column(Enum(RolEnum), default=RolEnum.coordinador)

class Hospital(Base):
    __tablename__ = "hospitales"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    codigo = Column(String, unique=True, index=True)
    distrito = Column(String)
    provincia = Column(String)
    latitud = Column(Float)
    longitud = Column(Float)
    pacientes = relationship("PacienteHospital", back_populates="hospital")

class Formulario(Base):
    __tablename__ = "formularios"
    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String, nullable=False)
    preguntas = Column(JSON, nullable=False)  # Dinámico
    creador_id = Column(Integer, ForeignKey("medicos.id"))
    creador = relationship("Medico")
    respuestas = relationship("RespuestaFormulario", back_populates="formulario")

class RespuestaFormulario(Base):
    __tablename__ = "respuestas_formulario"
    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"))
    formulario_id = Column(Integer, ForeignKey("formularios.id"))
    respuestas = Column(JSON, nullable=False)
    timestamp = Column(DateTime)
    paciente = relationship("Paciente", back_populates="formularios")
    formulario = relationship("Formulario", back_populates="respuestas")

class Asignacion(Base):
    __tablename__ = "asignaciones"
    id = Column(Integer, primary_key=True, index=True)
    medico_id = Column(Integer, ForeignKey("medicos.id"))
    paciente_id = Column(Integer, ForeignKey("pacientes.id"))
    fecha_asignacion = Column(DateTime)
    medico = relationship("Medico", back_populates="pacientes")
    paciente = relationship("Paciente")

class PacienteHospital(Base):
    __tablename__ = "paciente_hospital"
    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"))
    hospital_id = Column(Integer, ForeignKey("hospitales.id"))
    paciente = relationship("Paciente", back_populates="hospitales")
    hospital = relationship("Hospital", back_populates="pacientes")

class Mensaje(Base):
    __tablename__ = "mensajes"
    id = Column(Integer, primary_key=True, index=True)
    remitente_id = Column(Integer)
    remitente_rol = Column(Enum(RolEnum))
    destinatario_id = Column(Integer)
    destinatario_rol = Column(Enum(RolEnum))
    contenido = Column(Text, nullable=False)
    timestamp = Column(DateTime)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=True)
    medico_id = Column(Integer, ForeignKey("medicos.id"), nullable=True)
    paciente = relationship("Paciente", back_populates="mensajes")
    medico = relationship("Medico", back_populates="mensajes")

