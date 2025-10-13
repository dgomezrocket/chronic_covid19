from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from jwt import PyJWTError

# Configuración para JWT
SECRET_KEY = "tu_clave_secreta_muy_segura"  # Idealmente, usa una variable de entorno
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def verify_password(plain_password, hashed_password):
    """
    Verifica si una contraseña en texto plano coincide con el hash almacenado.
    Limita la contraseña a 72 bytes para cumplir con las restricciones de bcrypt.
    """
    # Limitar la longitud a 72 bytes para bcrypt
    if isinstance(plain_password, str):
        plain_password = plain_password[:72].encode('utf-8')
    elif isinstance(plain_password, bytes):
        plain_password = plain_password[:72]

    # Si el hash está en formato string, convertirlo a bytes
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')

    # Verificar la contraseña
    try:
        return bcrypt.checkpw(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password):
    """
    Genera un hash seguro para la contraseña.
    Limita la contraseña a 72 bytes para cumplir con las restricciones de bcrypt.
    """
    # Limitar la longitud a 72 bytes para bcrypt
    if isinstance(password, str):
        password = password[:72].encode('utf-8')
    elif isinstance(password, bytes):
        password = password[:72]

    # Generar el salt y el hash
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password, salt)
    return hashed_password.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Crea un token JWT de acceso con los datos proporcionados.

    Args:
        data: Diccionario con la información a codificar en el token
        expires_delta: Tiempo de expiración opcional

    Returns:
        Token JWT codificado
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt