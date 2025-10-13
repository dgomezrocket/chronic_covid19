from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings
from app.schemas.schemas import TokenData, RolEnum

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

