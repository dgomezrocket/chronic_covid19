from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.db import get_db
from app.models.models import Paciente, Medico, Coordinador
import os

# Configuración
SECRET_KEY = os.getenv("SECRET_KEY", "tu-clave-secreta-super-segura-cambiar-en-produccion")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 días

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica que una contraseña coincida con su hash"""
    # Truncar a 72 bytes para bcrypt
    password_bytes = plain_password.encode('utf-8')[:72]
    return pwd_context.verify(password_bytes, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera el hash de una contraseña"""
    # Truncar a 72 bytes para bcrypt
    password_bytes = password.encode('utf-8')[:72]
    return pwd_context.hash(password_bytes)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un token JWT con los datos proporcionados"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decodifica un token JWT y retorna su payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: Session = Depends(get_db)
) -> Union[Paciente, Medico, Coordinador]:
    """
    Obtiene el usuario actual desde el token JWT.
    Retorna el objeto usuario (Paciente, Medico o Coordinador).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    rol: str = payload.get("rol")

    if user_id is None or rol is None:
        raise credentials_exception

    # Buscar usuario según el rol
    user = None
    try:
        user_id_int = int(user_id)
        if rol == "paciente":
            user = db.query(Paciente).filter(Paciente.id == user_id_int).first()
        elif rol == "medico":
            user = db.query(Medico).filter(Medico.id == user_id_int).first()
        elif rol == "coordinador":
            user = db.query(Coordinador).filter(Coordinador.id == user_id_int).first()
    except (ValueError, TypeError):
        raise credentials_exception

    if user is None:
        raise credentials_exception

    return user


def get_current_active_user(
        current_user: Union[Paciente, Medico, Coordinador] = Depends(get_current_user)
) -> Union[Paciente, Medico, Coordinador]:
    """
    Obtiene el usuario actual y verifica que esté activo.
    Puedes agregar lógica adicional aquí si tienes un campo 'is_active'.
    """
    # Si tienes un campo 'is_active' en tus modelos, descomenta esto:
    # if not current_user.is_active:
    #     raise HTTPException(status_code=400, detail="Usuario inactivo")
    return current_user