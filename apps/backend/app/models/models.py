import enum
from sqlalchemy import Column, Integer, String, Date, Float, Enum, ForeignKey, DateTime, JSON, Text, Table, Boolean, UniqueConstraint, text
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
    # Verificación del email (F04). El default es True A PROPÓSITO: las cuentas que ya
    # existían y las creadas por vías administrativas quedan verificadas. SOLO el
    # auto-registro público (`POST /auth/register/paciente`) pasa explícitamente False.
    email_verificado = Column(Boolean, default=True, nullable=False, server_default=text("true"))

    hospital_id = Column(Integer, ForeignKey("hospitales.id"), nullable=True)


    # Relaciones
    formularios = relationship("RespuestaFormulario", back_populates="paciente")
    mensajes = relationship("Mensaje", back_populates="paciente")
    asignaciones = relationship("Asignacion", back_populates="paciente")

    hospital = relationship("Hospital", back_populates="pacientes")


class PasswordResetToken(Base):
    """
    Token de recuperación de contraseña.

    Se guarda SOLO el hash SHA-256 del token (nunca el token en claro). El token
    en claro se envía por email y se valida hasheándolo de nuevo. Es de un solo
    uso (`used`) y con expiración (`expires_at`). Como los usuarios viven en
    varias tablas, se guarda `rol` + `usuario_id` para resolver la cuenta.
    """
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    rol = Column(String, nullable=False)
    usuario_id = Column(Integer, nullable=False)
    email = Column(String, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False, server_default=text("false"))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class EmailVerificationToken(Base):
    """
    Token de verificación de email del auto-registro (F04).

    Sigue exactamente el mismo patrón que PasswordResetToken: se guarda SOLO el
    hash SHA-256 del token (nunca el token en claro). El token en claro se envía
    por email y se valida hasheándolo de nuevo. Es de un solo uso (`used`) y con
    expiración (`expires_at`). Como los usuarios viven en varias tablas, se guarda
    `rol` + `usuario_id` para resolver la cuenta.

    Es un modelo aparte de PasswordResetToken a propósito: demostrar que se controla
    el correo y restablecer la contraseña son operaciones distintas.
    """
    __tablename__ = "email_verification_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    rol = Column(String, nullable=False)
    usuario_id = Column(Integer, nullable=False)
    email = Column(String, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False, server_default=text("false"))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class AdminInvitation(Base):
    """
    Invitación para registrar un nuevo administrador.

    Sigue el mismo patrón que PasswordResetToken: se guarda SOLO el hash SHA-256
    del token (nunca el token en claro). El token en claro se envía por email y se
    valida hasheándolo de nuevo. Es de un solo uso (`accepted_at`) y con expiración
    (`expires_at`). Enviar la invitación NO crea la cuenta Admin: ésta se crea
    únicamente cuando la persona completa el registro.
    """
    __tablename__ = "admin_invitations"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    invited_by_admin_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)


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
    # Indica si el médico debe cambiar su contraseña en el próximo inicio de sesión
    # (se activa en el alta masiva, donde la contraseña se genera automáticamente).
    debe_cambiar_password = Column(Boolean, default=False, nullable=False, server_default=text("false"))
    # Verificación del email (F04). El default es True A PROPÓSITO: las cuentas que ya
    # existían y las creadas por vías administrativas (importación masiva del coordinador)
    # quedan verificadas. SOLO el auto-registro público (`POST /auth/register/medico`)
    # pasa explícitamente False.
    email_verificado = Column(Boolean, default=True, nullable=False, server_default=text("true"))

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
    titulo = Column(String(255), nullable=True)
    descripcion = Column(Text, nullable=True)
    preguntas = Column(JSON, nullable=False)
    creador_id = Column(Integer, ForeignKey("medicos.id"), nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    activo = Column(Boolean, default=True, nullable=False)
    meta = Column(JSON, nullable=True, default=dict)

    # Relaciones
    creador = relationship("Medico", back_populates="formularios_creados")
    respuestas = relationship("RespuestaFormulario", back_populates="formulario")
    asignaciones = relationship("FormularioAsignacion", back_populates="formulario", cascade="all, delete-orphan")  # 🆕 NUEVO

class FormularioAsignacion(Base):
    __tablename__ = "formulario_asignaciones"

    id = Column(Integer, primary_key=True, index=True)
    formulario_id = Column(Integer, ForeignKey("formularios.id"), nullable=False, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False, index=True)
    asignado_por = Column(Integer, ForeignKey("medicos.id"), nullable=False)
    fecha_asignacion = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_expiracion = Column(DateTime, nullable=True)
    fecha_completado = Column(DateTime, nullable=True)
    numero_instancia = Column(Integer, default=1, nullable=False)  # Permite múltiples instancias
    estado = Column(String(50), default="pendiente", nullable=False)  # pendiente, completado, expirado, cancelado
    datos_extra = Column(JSON, nullable=True, default=dict)  # ✅ RENOMBRADO de 'metadata' a 'datos_extra'

    # Relaciones
    formulario = relationship("Formulario", back_populates="asignaciones")
    paciente = relationship("Paciente", backref="formulario_asignaciones")
    medico_asignador = relationship("Medico", foreign_keys=[asignado_por], backref="formularios_asignados")
    respuestas = relationship("RespuestaFormulario", back_populates="asignacion")


class RespuestaFormulario(Base):
    __tablename__ = "respuestas_formularios"
    __table_args__ = (
        # Una fila como mucho por INTENTO de envio. Es la ultima linea de defensa contra
        # los reenvios del transporte: aunque dos POST concurrentes esquivaran el
        # `with_for_update()` del endpoint, la base rechaza el segundo INSERT y el router
        # lo convierte en la respuesta idempotente en vez de duplicar la respuesta.
        # Postgres trata los NULL como distintos, asi que las filas historicas
        # (`idempotency_key IS NULL`) no chocan entre si.
        UniqueConstraint(
            "asignacion_id",
            "idempotency_key",
            name="uq_respuestas_asignacion_idempotency",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False)
    formulario_id = Column(Integer, ForeignKey("formularios.id"), nullable=False)
    asignacion_id = Column(Integer, ForeignKey("formulario_asignaciones.id"), nullable=True)
    respuestas = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    # Identifica el INTENTO de envío, no la respuesta. Si la red reintenta el POST
    # (OkHttp reenvía cuando muere una conexión keep-alive), el segundo pedido trae la
    # misma clave y el endpoint responde OK en vez de un 400 "ya respondiste".
    idempotency_key = Column(String(64), nullable=True, index=True)

    # Relaciones
    paciente = relationship("Paciente", back_populates="formularios")
    formulario = relationship("Formulario", back_populates="respuestas")
    asignacion = relationship("FormularioAsignacion", back_populates="respuestas")


class Mensaje(Base):
    __tablename__ = "mensajes"

    id = Column(Integer, primary_key=True, index=True)
    contenido = Column(Text, nullable=False)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False)
    medico_id = Column(Integer, ForeignKey("medicos.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    leido = Column(Integer, default=0, nullable=False)  # 0 = no leído, 1 = leído

    remitente_rol = Column(Enum(RolEnum), nullable=False, default=RolEnum.paciente)

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