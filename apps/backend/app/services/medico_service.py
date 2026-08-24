"""
Lógica de negocio reutilizable para el alta de médicos.

Usado tanto por el alta individual (`POST /auth/register/medico`) como por la
importación masiva (`POST /importacion-medicos/importar`), para no duplicar las
reglas de validación ni el mecanismo de creación/hash de contraseñas.
"""

import secrets
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.models import Medico, Paciente, Especialidad, Hospital, RolEnum


class MedicoValidationError(ValueError):
    """Error de validación de negocio al crear un médico (email/documento duplicado, etc.)."""
    pass


def generar_password_temporal() -> str:
    """Genera una contraseña temporal numérica de 8 dígitos."""
    return "".join(str(secrets.randbelow(10)) for _ in range(8))


def email_en_uso(db: Session, email: str) -> bool:
    """True si el email ya está usado por un médico o un paciente (igual que el alta individual)."""
    if db.query(Medico).filter(Medico.email == email).first():
        return True
    if db.query(Paciente).filter(Paciente.email == email).first():
        return True
    return False


def documento_en_uso(db: Session, documento: str) -> bool:
    """True si el documento ya está usado por un médico."""
    return db.query(Medico).filter(Medico.documento == documento).first() is not None


def resolver_especialidades_por_id(db: Session, especialidad_ids: List[int]) -> List[Especialidad]:
    """Resuelve especialidades por ID (solo activas). Lanza MedicoValidationError si alguna no existe."""
    especialidades: List[Especialidad] = []
    for esp_id in especialidad_ids or []:
        esp = db.query(Especialidad).filter(
            Especialidad.id == esp_id,
            Especialidad.activa == 1,
        ).first()
        if not esp:
            raise MedicoValidationError(f"Especialidad con ID {esp_id} no encontrada o inactiva")
        especialidades.append(esp)
    return especialidades


def buscar_especialidades_por_nombre(db: Session, nombres: List[str]) -> List[Especialidad]:
    """
    Resuelve especialidades por nombre (solo activas). Coincidencia case-insensitive.
    Lanza MedicoValidationError con el nombre concreto si alguna no existe.
    """
    especialidades: List[Especialidad] = []
    for nombre in nombres or []:
        nombre_limpio = (nombre or "").strip()
        if not nombre_limpio:
            continue
        esp = db.query(Especialidad).filter(
            Especialidad.nombre.ilike(nombre_limpio),
            Especialidad.activa == 1,
        ).first()
        if not esp:
            raise MedicoValidationError(f"Especialidad no encontrada: '{nombre_limpio}'")
        especialidades.append(esp)
    return especialidades


def crear_medico(
    db: Session,
    *,
    documento: str,
    nombre: str,
    email: str,
    password: str,
    telefono: Optional[str] = None,
    especialidades: Optional[List[Especialidad]] = None,
    hospitales: Optional[List[Hospital]] = None,
    debe_cambiar_password: bool = False,
    email_verificado: bool = True,
    commit: bool = True,
) -> Medico:
    """
    Crea un médico aplicando las mismas validaciones que el alta individual.

    - Valida unicidad de email (médicos + pacientes) y documento (médicos).
    - Hashea la contraseña con el mecanismo actual (`get_password_hash`).
    - Asocia especialidades y hospitales (relaciones many-to-many) ya resueltos.
    - Si `commit=False`, hace `flush` pero deja el commit al caller (útil para importación).
    - `email_verificado=False` SOLO en el auto-registro público (F04); el default `True`
      mantiene el flujo de la importación masiva y de cualquier alta administrativa.

    Lanza `MedicoValidationError` ante datos inválidos/duplicados.
    """
    if not nombre or not nombre.strip():
        raise MedicoValidationError("El nombre es obligatorio")
    if not documento or not str(documento).strip():
        raise MedicoValidationError("El documento es obligatorio")
    if not email or not email.strip():
        raise MedicoValidationError("El email es obligatorio")

    if email_en_uso(db, email):
        raise MedicoValidationError("El email ya está registrado")
    if documento_en_uso(db, documento):
        raise MedicoValidationError("El documento de identidad ya está registrado")

    nuevo_medico = Medico(
        documento=documento,
        nombre=nombre,
        email=email,
        telefono=telefono,
        hashed_password=get_password_hash(password),
        rol=RolEnum.medico,
        debe_cambiar_password=debe_cambiar_password,
        email_verificado=email_verificado,
    )

    db.add(nuevo_medico)
    db.flush()  # obtener el ID antes de asociar relaciones M2M

    if especialidades:
        nuevo_medico.especialidades = especialidades
    if hospitales:
        nuevo_medico.hospitales = hospitales

    if commit:
        db.commit()
        db.refresh(nuevo_medico)

    return nuevo_medico
