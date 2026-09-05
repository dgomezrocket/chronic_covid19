
"""
Dependencias de autenticación y autorización para FastAPI.
Este módulo contiene las funciones de inyección de dependencias para:
- Obtener el usuario actual desde el token JWT
- Verificar roles de usuario
- Verificar permisos sobre hospitales
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.db import get_db
from app.models.models import Admin, Asignacion, Hospital, Medico, Paciente, Coordinador

# Configuración - Usar settings centralizado
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ✅ Devolver DICCIONARIO (igual que security.py) para compatibilidad
def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Obtiene el usuario actual desde el token JWT.
    Devuelve un DICCIONARIO con la información del usuario.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id: str = payload.get("sub")
        rol: str = payload.get("rol")
        email: str = payload.get("email")
        nombre: str = payload.get("nombre")

        if user_id is None or rol is None:
            raise credentials_exception

        # ✅ Devolver diccionario para compatibilidad con coordinador_service.py
        return {
            "id": int(user_id),
            "rol": rol,
            "email": email,
            "nombre": nombre
        }
    except JWTError:
        raise credentials_exception
    except Exception:
        raise credentials_exception


def require_role(required_roles: list):
    """Crea una dependencia que verifica roles."""
    def role_dependency(user: dict = Depends(get_current_user)):
        if user["rol"] not in required_roles:
            raise HTTPException(status_code=403, detail="No autorizado")
        return user
    return role_dependency


def require_admin(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Requiere que el usuario sea admin Y que la cuenta siga activa en la BD.

    Revalida `activo` contra la base de datos para que un admin desactivado no
    pueda seguir operando solo porque conserva un JWT emitido antes de la baja.
    Solo afecta a rutas protegidas con require_admin (no toca a pacientes,
    médicos ni coordinadores).
    """
    if user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )

    admin = db.query(Admin).filter(Admin.id == user["id"]).first()
    if not admin or admin.activo != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta de administrador desactivada."
        )

    return user


def require_medico(user: dict = Depends(get_current_user)) -> dict:
    """Requiere que el usuario sea médico o admin"""
    if user["rol"] not in ["medico", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de médico"
        )
    return user


def require_coordinador(user: dict = Depends(get_current_user)) -> dict:
    """Requiere que el usuario sea coordinador o admin"""
    if user["rol"] not in ["coordinador", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de coordinador"
        )
    return user


# ========== FUNCIONES DE VALIDACIÓN PARA COORDINADORES ==========

def get_coordinador_from_token(
    db: Session,
    user: dict = Depends(get_current_user)
) -> Coordinador:
    """
    Obtiene el objeto Coordinador completo desde el token.
    """
    if user["rol"] != "coordinador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo coordinadores pueden usar esta función"
        )

    coordinador = db.query(Coordinador).filter(Coordinador.id == user["id"]).first()

    if not coordinador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinador no encontrado en la base de datos"
        )

    return coordinador


def verificar_permisos_hospital(
    hospital_id: int,
    db: Session,
    user: dict = Depends(get_current_user)
) -> bool:
    """
    Verifica que el usuario tenga permisos para operar en un hospital específico.
    """
    # Admins tienen acceso a todo
    if user["rol"] == "admin":
        return True

    # Coordinadores solo a su hospital
    if user["rol"] == "coordinador":
        coordinador = db.query(Coordinador).filter(Coordinador.id == user["id"]).first()

        if not coordinador:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Coordinador no encontrado"
            )

        if coordinador.hospital_id != hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tienes permisos para operar en este hospital"
            )

        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No tienes permisos para gestionar hospitales"
    )


def verificar_medico_en_hospital(
    medico_id: int,
    hospital_id: int,
    db: Session
) -> bool:
    """Verifica que un médico esté asignado a un hospital específico."""
    medico = db.query(Medico).filter(Medico.id == medico_id).first()

    if not medico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Médico no encontrado"
        )

    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()

    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital no encontrado"
        )

    if hospital not in medico.hospitales:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El médico '{medico.nombre}' no trabaja en el hospital '{hospital.nombre}'"
        )

    return True


def verificar_paciente_en_hospital(
    paciente_id: int,
    hospital_id: int,
    db: Session
) -> bool:
    """Verifica que un paciente esté asignado a un hospital específico."""
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()

    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )

    if paciente.hospital_id != hospital_id:
        hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
        hospital_nombre = hospital.nombre if hospital else f"ID {hospital_id}"

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El paciente no está asignado al hospital '{hospital_nombre}'"
        )

    return True


# ========== ALCANCE SOBRE LA FICHA DE UN PACIENTE ==========

def verificar_acceso_a_paciente(
    paciente_id: int,
    db: Session,
    user: dict,
    *,
    escritura: bool = False,
) -> Paciente:
    """
    Resuelve si `user` puede ver (o modificar) la ficha de un paciente.

    El alcance sale SIEMPRE del token, nunca de un parámetro del cliente, igual que en
    `/coordinadores/me/medicos` y en `/formularios/respuestas`:

    - **paciente**: sólo su propia ficha.
    - **médico**: sólo pacientes con una asignación ACTIVA con él (misma regla que usa
      `/asignaciones/mis-pacientes`), y sólo lectura.
    - **coordinador**: sólo pacientes de su hospital, y sólo lectura.
    - **admin**: todo.

    Devuelve el `Paciente` para que quien llama no repita la consulta.

    Se responde 404 —y no 403— cuando el paciente existe pero está fuera del alcance: un
    403 confirmaría que ese id corresponde a un paciente real, que es justamente lo que no
    queremos revelar a quien no debería verlo.
    """
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    if not paciente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado")

    rol = user.get("rol")
    fuera_de_alcance = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado"
    )

    if rol == "admin":
        return paciente

    if rol == "paciente":
        if user.get("id") != paciente.id:
            raise fuera_de_alcance
        return paciente

    # A partir de acá sólo queda personal de salud: puede consultar, no editar la ficha.
    if escritura:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sólo el propio paciente o un administrador pueden modificar estos datos",
        )

    if rol == "medico":
        asignado = db.query(Asignacion).filter(
            Asignacion.medico_id == user.get("id"),
            Asignacion.paciente_id == paciente.id,
            Asignacion.activo == True,  # noqa: E712 - comparación de columna, no de Python
        ).first()
        if not asignado:
            raise fuera_de_alcance
        return paciente

    if rol == "coordinador":
        coordinador = db.query(Coordinador).filter(Coordinador.id == user.get("id")).first()
        if not coordinador or not coordinador.hospital_id:
            raise fuera_de_alcance
        if paciente.hospital_id != coordinador.hospital_id:
            raise fuera_de_alcance
        return paciente

    raise fuera_de_alcance


def require_admin_or_coordinador(user: dict = Depends(get_current_user)) -> dict:
    """Requiere que el usuario sea admin O coordinador."""
    if user["rol"] not in ["admin", "coordinador"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador o coordinador"
        )
    return user


def require_coordinador_with_hospital(
    db: Session,
    user: dict = Depends(get_current_user)
) -> Coordinador:
    """Requiere que el usuario sea coordinador Y tenga un hospital asignado."""
    if user["rol"] != "coordinador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo coordinadores pueden usar esta función"
        )

    coordinador = db.query(Coordinador).filter(Coordinador.id == user["id"]).first()

    if not coordinador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinador no encontrado"
        )

    if not coordinador.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes un hospital asignado. Contacta al administrador."
        )

    return coordinador


# ========== FUNCIONES DE VALIDACIÓN REUTILIZABLES ==========

def validar_hospital_existe(hospital_id: int, db: Session) -> Hospital:
    """Valida que un hospital exista en la base de datos."""
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()

    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hospital con ID {hospital_id} no encontrado"
        )

    return hospital


def validar_medico_existe(medico_id: int, db: Session) -> Medico:
    """Valida que un médico exista en la base de datos."""
    medico = db.query(Medico).filter(Medico.id == medico_id).first()

    if not medico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Médico con ID {medico_id} no encontrado"
        )

    return medico


def validar_paciente_existe(paciente_id: int, db: Session) -> Paciente:
    """Valida que un paciente exista en la base de datos."""
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()

    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paciente con ID {paciente_id} no encontrado"
        )

    return paciente