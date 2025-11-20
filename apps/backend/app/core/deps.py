from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.schemas.schemas import TokenData, RolEnum
from app.models.models import Coordinador, Medico, Paciente, Hospital

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Middleware/Dependency para obtener usuario actual y verificar rol
def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        rol: str = payload.get("rol")
        if user_id is None or rol is None:
            raise credentials_exception
        return TokenData(id=int(user_id), rol=RolEnum(rol))
    except JWTError:
        raise credentials_exception

def require_role(required_roles: list):
    def role_dependency(user: TokenData = Depends(get_current_user)):
        if user.rol not in required_roles:
            raise HTTPException(status_code=403, detail="No autorizado")
        return user
    return role_dependency

# Decoradores específicos por rol
def require_admin(user: TokenData = Depends(get_current_user)):
    """Requiere que el usuario sea admin"""
    if user.rol != RolEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )
    return user

def require_medico(user: TokenData = Depends(get_current_user)):
    """Requiere que el usuario sea médico o admin"""
    if user.rol not in [RolEnum.medico, RolEnum.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de médico"
        )
    return user

def require_coordinador(user: TokenData = Depends(get_current_user)):
    """Requiere que el usuario sea coordinador o admin"""
    if user.rol not in [RolEnum.coordinador, RolEnum.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de coordinador"
        )
    return user


# ========== 🆕 NUEVAS FUNCIONES DE VALIDACIÓN PARA COORDINADORES ==========

def get_coordinador_from_token(
    db: Session,
    user: TokenData = Depends(get_current_user)
) -> Coordinador:
    """
    Obtiene el objeto Coordinador completo desde el token.
    Solo funciona si el usuario es coordinador.
    
    Args:
        db: Sesión de base de datos
        user: Datos del token
    
    Returns:
        Coordinador completo
    
    Raises:
        HTTPException: Si no es coordinador o no se encuentra en BD
    """
    if user.rol != RolEnum.coordinador:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo coordinadores pueden usar esta función"
        )
    
    coordinador = db.query(Coordinador).filter(Coordinador.id == user.id).first()
    
    if not coordinador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinador no encontrado en la base de datos"
        )
    
    return coordinador


def verificar_permisos_hospital(
    hospital_id: int,
    db: Session,
    user: TokenData = Depends(get_current_user)
) -> bool:
    """
    Verifica que el usuario tenga permisos para operar en un hospital específico.
    
    - Admins: Tienen acceso a todos los hospitales
    - Coordinadores: Solo a su hospital asignado
    - Otros roles: No tienen acceso
    
    Args:
        hospital_id: ID del hospital
        db: Sesión de base de datos
        user: Datos del token
    
    Returns:
        True si tiene permisos
    
    Raises:
        HTTPException: Si no tiene permisos
    """
    # Admins tienen acceso a todo
    if user.rol == RolEnum.admin:
        return True
    
    # Coordinadores solo a su hospital
    if user.rol == RolEnum.coordinador:
        coordinador = db.query(Coordinador).filter(Coordinador.id == user.id).first()
        
        if not coordinador:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Coordinador no encontrado"
            )
        
        if coordinador.hospital_id != hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tienes permisos para operar en este hospital. Tu hospital asignado es: {coordinador.hospital.nombre if coordinador.hospital else 'Ninguno'}"
            )
        
        return True
    
    # Otros roles no tienen acceso
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No tienes permisos para gestionar hospitales"
    )


def verificar_medico_en_hospital(
    medico_id: int,
    hospital_id: int,
    db: Session
) -> bool:
    """
    Verifica que un médico esté asignado a un hospital específico.
    
    Args:
        medico_id: ID del médico
        hospital_id: ID del hospital
        db: Sesión de base de datos
    
    Returns:
        True si el médico trabaja en el hospital
    
    Raises:
        HTTPException: Si el médico no está asignado al hospital
    """
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
    
    # Verificar si el médico está en el hospital
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
    """
    Verifica que un paciente esté asignado a un hospital específico.
    
    Args:
        paciente_id: ID del paciente
        hospital_id: ID del hospital
        db: Sesión de base de datos
    
    Returns:
        True si el paciente está en el hospital
    
    Raises:
        HTTPException: Si el paciente no está asignado al hospital
    """
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )
    
    if paciente.hospital_id != hospital_id:
        hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
        hospital_nombre = hospital.nombre if hospital else f"ID {hospital_id}"
        
        paciente_hospital_nombre = "ningún hospital"
        if paciente.hospital_id:
            paciente_hospital = db.query(Hospital).filter(Hospital.id == paciente.hospital_id).first()
            paciente_hospital_nombre = paciente_hospital.nombre if paciente_hospital else f"ID {paciente.hospital_id}"
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El paciente '{paciente.nombre}' no está asignado al hospital '{hospital_nombre}'. Está asignado a: {paciente_hospital_nombre}"
        )
    
    return True


def require_admin_or_coordinador(user: TokenData = Depends(get_current_user)):
    """
    Requiere que el usuario sea admin O coordinador.
    Útil para endpoints que ambos roles pueden usar.
    """
    if user.rol not in [RolEnum.admin, RolEnum.coordinador]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador o coordinador"
        )
    return user


def require_coordinador_with_hospital(
    db: Session,
    user: TokenData = Depends(get_current_user)
) -> Coordinador:
    """
    Requiere que el usuario sea coordinador Y tenga un hospital asignado.
    
    Args:
        db: Sesión de base de datos
        user: Datos del token
    
    Returns:
        Coordinador con hospital asignado
    
    Raises:
        HTTPException: Si no es coordinador o no tiene hospital
    """
    if user.rol != RolEnum.coordinador:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo coordinadores pueden usar esta función"
        )
    
    coordinador = db.query(Coordinador).filter(Coordinador.id == user.id).first()
    
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
    """
    Valida que un hospital exista en la base de datos.
    
    Returns:
        Hospital si existe
    
    Raises:
        HTTPException: Si no existe
    """
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hospital con ID {hospital_id} no encontrado"
        )
    
    return hospital


def validar_medico_existe(medico_id: int, db: Session) -> Medico:
    """
    Valida que un médico exista en la base de datos.
    
    Returns:
        Medico si existe
    
    Raises:
        HTTPException: Si no existe
    """
    medico = db.query(Medico).filter(Medico.id == medico_id).first()
    
    if not medico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Médico con ID {medico_id} no encontrado"
        )
    
    return medico


def validar_paciente_existe(paciente_id: int, db: Session) -> Paciente:
    """
    Valida que un paciente exista en la base de datos.
    
    Returns:
        Paciente si existe
    
    Raises:
        HTTPException: Si no existe
    """
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paciente con ID {paciente_id} no encontrado"
        )
    
    return paciente