import hashlib
import logging
import secrets
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.db import get_db
from app.models.models import (
    Paciente, Medico, Coordinador, Hospital, Admin, RolEnum, Especialidad,
    PasswordResetToken, EmailVerificationToken,
)  # Agregar Hospital aquí
from app.schemas.schemas import (
    PacienteCreate, MedicoCreate, CoordinadorCreate,
    Token, UserInfo,
    ForgotPasswordRequest, ResetPasswordRequest, CambiarPasswordRequest, MessageResponse,
    RegistrationPendingVerificationResponse, VerifyEmailRequest, ResendVerificationRequest,
)
from app.core.security import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from app.core.config import settings
from app.core.deps import require_admin
from app.services import email_service
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

router = APIRouter()

# Orden de búsqueda de cuentas por email (los usuarios viven en varias tablas).
_MODELOS_POR_ROL = [
    ("paciente", Paciente),
    ("medico", Medico),
    ("coordinador", Coordinador),
    ("admin", Admin),
]

# Mensajes de email duplicado en el alta. Son los que ve el usuario final, así que
# nombran el problema concreto en vez de un genérico "El email ya está registrado".
_MENSAJE_EMAIL_EN_USO = (
    "El correo electrónico ya está siendo utilizado por un usuario del sistema."
)
_MENSAJE_EMAIL_EN_USO_SIN_VERIFICAR = (
    "El correo electrónico ya está siendo utilizado por un usuario del sistema y todavía "
    "no fue verificado. Revisá tu bandeja de entrada o pedí un nuevo enlace de verificación."
)


def _normalizar_email(email: str) -> str:
    """
    Forma canónica del email: sin espacios y en minúsculas.

    El email es la credencial de login, así que TODA alta debe guardarlo normalizado y
    toda búsqueda debe compararlo normalizado. Sin esto, quien se registra como
    'Juan@Gmail.com' no puede iniciar sesión escribiendo 'juan@gmail.com' ni recuperar
    su contraseña.
    """
    return str(email).strip().lower()


def _buscar_cuenta_por_email(db: Session, email: str):
    """
    Busca una cuenta por email en las 4 tablas de usuarios, SIN distinguir
    mayúsculas/minúsculas. Devuelve (rol, user) o (None, None).

    La comparación es insensible a propósito: las cuentas creadas antes de que el alta
    normalizara el email quedaron guardadas tal cual se tipearon, y son las mismas que
    el usuario escribe en minúsculas al iniciar sesión.
    """
    objetivo = _normalizar_email(email)
    for rol, modelo in _MODELOS_POR_ROL:
        user = db.query(modelo).filter(func.lower(modelo.email) == objetivo).first()
        if user:
            return rol, user
    return None, None


def _validar_email_disponible(db: Session, email: str) -> None:
    """
    Rechaza el alta si el email ya pertenece a CUALQUIER cuenta del sistema.

    Busca en las 4 tablas de usuarios y sin distinguir mayúsculas, porque el email es la
    credencial de login y `/auth/login` las recorre todas: si el mismo correo existiera en
    dos tablas, el login quedaría ambiguo. Antes cada endpoint miraba solo la tabla del rol
    que estaba creando, así que un paciente podía registrarse con el email de un médico.

    Si la cuenta existente sigue pendiente de verificar, el mensaje lo aclara para que el
    usuario sepa que puede reenviarse el enlace en vez de probar con otro correo.
    """
    _, user = _buscar_cuenta_por_email(db, email)
    if not user:
        return

    detail = (
        _MENSAJE_EMAIL_EN_USO
        if getattr(user, "email_verificado", True)
        else _MENSAJE_EMAIL_EN_USO_SIN_VERIFICAR
    )
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


# ========== REGISTRO DE USUARIOS ==========

@router.post(
    "/register/paciente",
    response_model=RegistrationPendingVerificationResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_paciente(
    paciente: PacienteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Registra un nuevo paciente por auto-registro público.

    F04: la cuenta se crea PENDIENTE de verificar el email y NO se emite ningún
    access_token. El paciente recibe un correo con un enlace de verificación y solo
    puede iniciar sesión después de usarlo.
    """
    # Verificar si el email ya existe (en cualquier tabla de usuarios)
    _validar_email_disponible(db, str(paciente.email))

    # Verificar si el documento ya existe
    existing_doc = db.query(Paciente).filter(Paciente.documento == paciente.documento).first()
    if existing_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El documento de identidad ya está registrado"
        )

    # Crear nuevo paciente
    hashed_password = get_password_hash(paciente.password)
    nuevo_paciente = Paciente(
        documento=paciente.documento,
        nombre=paciente.nombre,
        fecha_nacimiento=paciente.fecha_nacimiento,
        genero=paciente.genero,
        direccion=paciente.direccion,
        email=_normalizar_email(paciente.email),
        telefono=paciente.telefono,
        latitud=paciente.latitud,
        longitud=paciente.longitud,
        hashed_password=hashed_password,
        rol=RolEnum.paciente,
        email_verificado=False,  # F04: auto-registro público -> pendiente de verificar
    )
    db.add(nuevo_paciente)
    # flush necesario para obtener el id y porque la sesión usa autoflush=False.
    db.flush()

    token = _crear_token_verificacion(
        db, rol="paciente", usuario_id=nuevo_paciente.id, email=nuevo_paciente.email
    )
    # Un solo commit: el paciente y su token de verificación viajan en la misma transacción.
    db.commit()
    db.refresh(nuevo_paciente)

    # El envío va como BackgroundTask (después de la respuesta): un SMTP lento no debe
    # agotar el timeout del cliente sobre una cuenta que YA fue creada.
    background_tasks.add_task(
        _enviar_verificacion_seguro,
        nuevo_paciente.email,
        nuevo_paciente.nombre,
        token,
    )

    return {
        "message": "Te enviamos un correo para verificar tu cuenta. Revisá tu bandeja de entrada.",
        "email": nuevo_paciente.email,
        "requires_verification": True,
    }


@router.post(
    "/register/medico",
    response_model=RegistrationPendingVerificationResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_medico(
    medico: MedicoCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Registra un nuevo médico por auto-registro público.

    F04: igual que el paciente, la cuenta queda PENDIENTE de verificar el email y no se
    emite access_token. Los médicos creados por la importación masiva del coordinador NO
    pasan por acá y siguen quedando verificados (ver `crear_medico`).
    """
    from app.services.medico_service import crear_medico, MedicoValidationError

    # Email duplicado primero: es el error más frecuente y `crear_medico` solo mira las
    # tablas de médicos y pacientes, con un mensaje genérico.
    _validar_email_disponible(db, str(medico.email))

    # Verificar que las especialidades existan (por ID, solo activas)
    especialidades = []
    if medico.especialidad_ids:
        for esp_id in medico.especialidad_ids:
            especialidad = db.query(Especialidad).filter(
                Especialidad.id == esp_id,
                Especialidad.activa == 1
            ).first()
            if not especialidad:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Especialidad con ID {esp_id} no encontrada o inactiva"
                )
            especialidades.append(especialidad)

    # Verificar que los hospitales existan (por ID)
    hospitales = []
    if medico.hospital_ids:
        for hospital_id in medico.hospital_ids:
            hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
            if not hospital:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Hospital con ID {hospital_id} no encontrado"
                )
            hospitales.append(hospital)

    # Crear el médico reutilizando la lógica compartida (valida email/documento, hashea, asocia M2M)
    try:
        nuevo_medico = crear_medico(
            db,
            documento=medico.documento,
            nombre=medico.nombre,
            email=medico.email,
            telefono=medico.telefono,
            password=medico.password,
            especialidades=especialidades,
            hospitales=hospitales,
            email_verificado=False,  # F04: auto-registro público -> pendiente de verificar
            commit=False,            # el commit lo hacemos junto con el token de verificación
        )
    except MedicoValidationError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # `crear_medico` ya hizo flush, así que el id está disponible.
    token = _crear_token_verificacion(
        db, rol="medico", usuario_id=nuevo_medico.id, email=nuevo_medico.email
    )
    # Un solo commit: el médico y su token de verificación viajan en la misma transacción.
    db.commit()
    db.refresh(nuevo_medico)

    background_tasks.add_task(
        _enviar_verificacion_seguro,
        nuevo_medico.email,
        nuevo_medico.nombre,
        token,
    )

    return {
        "message": "Te enviamos un correo para verificar tu cuenta. Revisá tu bandeja de entrada.",
        "email": nuevo_medico.email,
        "requires_verification": True,
    }


@router.post("/register/coordinador", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_coordinador(coordinador: CoordinadorCreate, db: Session = Depends(get_db)):
    """Registra un nuevo coordinador en el sistema (solo admin)"""
    # Verificar si el email ya existe (en cualquier tabla de usuarios, sin distinguir
    # mayúsculas): el login recorre las 4 tablas, así que un duplicado lo volvería ambiguo.
    _validar_email_disponible(db, str(coordinador.email))

    # Verificar si el documento ya existe
    existing_doc = db.query(Coordinador).filter(Coordinador.documento == coordinador.documento).first()
    if existing_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El documento de identidad ya está registrado"
        )

    # Crear nuevo coordinador
    hashed_password = get_password_hash(coordinador.password)
    nuevo_coordinador = Coordinador(
        documento=coordinador.documento,
        nombre=coordinador.nombre,
        email=_normalizar_email(coordinador.email),
        hashed_password=hashed_password,
        hospital_id=coordinador.hospital_id,
        rol=RolEnum.coordinador
    )
    db.add(nuevo_coordinador)
    db.commit()
    db.refresh(nuevo_coordinador)

    # Crear token con nombre y email incluidos
    access_token = create_access_token(
        data={
            "sub": str(nuevo_coordinador.id),
            "rol": nuevo_coordinador.rol.value,
            "email": nuevo_coordinador.email,
            "nombre": nuevo_coordinador.nombre
        }
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ========== LOGIN UNIVERSAL ==========


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Login universal para pacientes, médicos, coordinadores y administradores.

    La cuenta se busca con `_buscar_cuenta_por_email`, que recorre las 4 tablas SIN
    distinguir mayúsculas/minúsculas. Antes la comparación era exacta y, como el alta
    guardaba el email tal cual se tipeaba, quien se registraba como 'Juan@Gmail.com'
    recibía un 401 "Credenciales incorrectas" al escribirlo en minúsculas.
    """
    user_type, user = _buscar_cuenta_por_email(db, form_data.username)

    # Verificar que el admin esté activo (los demás roles no tienen esta marca).
    if user is not None and user_type == "admin" and user.activo == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta de administrador desactivada. Contacta al sistema.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificar contraseña
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # F04: verificación de email antes de emitir el JWT.
    # Va DESPUÉS de validar la contraseña para no revelar qué cuentas existen.
    # `getattr(..., True)` deja intactos coordinadores y admins (no tienen el campo), y
    # las cuentas previas / altas administrativas tienen email_verificado = True.
    if not getattr(user, "email_verificado", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debés verificar tu correo electrónico antes de iniciar sesión.",
        )

    # Crear token con nombre y email incluidos
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "rol": user.rol.value,
            "email": user.email,
            "nombre": user.nombre
        }
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ========== INFORMACIÓN DEL USUARIO ACTUAL ==========

@router.get("/me", response_model=UserInfo)
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtiene la información del usuario autenticado"""
    user_id = current_user["id"]
    user_rol = current_user["rol"]

    # Buscar según el rol
    if user_rol == "paciente":
        user = db.query(Paciente).filter(Paciente.id == user_id).first()
    elif user_rol == "medico":
        user = db.query(Medico).filter(Medico.id == user_id).first()
    elif user_rol == "coordinador":
        user = db.query(Coordinador).filter(Coordinador.id == user_id).first()
    elif user_rol == "admin":
        user = db.query(Admin).filter(Admin.id == user_id).first()
    else:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Retornar información básica del usuario
    return {
        "id": user.id,
        "email": user.email,
        "nombre": user.nombre,
        "rol": user.rol.value,
        "documento": user.documento if hasattr(user, 'documento') else None,
        "telefono": user.telefono if hasattr(user, 'telefono') else None,
        "debe_cambiar_password": bool(getattr(user, "debe_cambiar_password", False)),
    }


# ========== ALIAS PARA COMPATIBILIDAD ==========

@router.post(
    "/register",
    response_model=RegistrationPendingVerificationResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_default(
    paciente: PacienteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Alias de /register/paciente para compatibilidad.

    Es el endpoint que realmente usan la web y la app mobile (`registerPaciente()`), así
    que aplica exactamente el mismo flujo F04: no hay forma de saltarse la verificación
    usando este alias.
    """
    return register_paciente(paciente, background_tasks, db)


# ========== RECUPERACIÓN DE CONTRASEÑA ==========

def _hash_token(token: str) -> str:
    """Hash SHA-256 (hex) del token; nunca se guarda el token en claro."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _modelo_por_rol(rol: str):
    for r, modelo in _MODELOS_POR_ROL:
        if r == rol:
            return modelo
    return None


def _enviar_recuperacion_seguro(email: str, nombre: str, token: str, expira_minutos: int) -> None:
    """
    Envía el correo de recuperación. Un fallo se loguea y NUNCA rompe la respuesta: el
    token ya quedó guardado y el usuario puede volver a pedir el enlace.

    Se ejecuta como BackgroundTask, así que recibe solo strings: cuando corre, la sesión
    de base de datos ya fue cerrada por `get_db`. Correrlo fuera del request también
    evita que el timeout de SMTP (15 s) agote el del cliente HTTP.
    """
    try:
        email_service.enviar_recuperacion_password(
            email=email,
            nombre=nombre,
            token=token,
            expira_minutos=expira_minutos,
        )
    except email_service.EmailNoConfiguradoError:
        logger.warning("SMTP no configurado: no se envió el correo de recuperación a %s.", email)
    except Exception as e:  # noqa: BLE001
        logger.error("Falló el envío del correo de recuperación a %s: %s", email, e)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Solicita la recuperación de contraseña. Por seguridad, la respuesta es SIEMPRE
    genérica: no revela si el email está o no registrado.

    Justamente porque la respuesta no distingue los casos, el "no existe la cuenta" se
    loguea: sin esa línea era imposible saber si un correo que no llegaba se había
    intentado enviar y falló, o si nunca se intentó.
    """
    mensaje_generico = {
        "message": "Si el email está registrado, te enviamos instrucciones para restablecer la contraseña."
    }

    email = _normalizar_email(body.email)
    rol, user = _buscar_cuenta_por_email(db, email)
    if not user:
        logger.info("forgot-password: no hay ninguna cuenta con el email %s.", email)
        return mensaje_generico

    # Invalidar tokens anteriores no usados de esta cuenta. La comparación es insensible
    # a mayúsculas porque los tokens emitidos antes de normalizar guardaron el email
    # tal cual venía.
    db.query(PasswordResetToken).filter(
        func.lower(PasswordResetToken.email) == email,
        PasswordResetToken.used == False,  # noqa: E712
    ).update({PasswordResetToken.used: True})

    token = secrets.token_urlsafe(32)
    expira_minutos = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    reset = PasswordResetToken(
        token_hash=_hash_token(token),
        rol=rol,
        usuario_id=user.id,
        email=email,
        expires_at=datetime.utcnow() + timedelta(minutes=expira_minutos),
        used=False,
    )
    db.add(reset)
    db.commit()

    # El correo se manda al email GUARDADO de la cuenta, no al que se tipeó en el pedido.
    background_tasks.add_task(
        _enviar_recuperacion_seguro,
        user.email,
        getattr(user, "nombre", ""),
        token,
        expira_minutos,
    )

    return mensaje_generico


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Restablece la contraseña usando el token recibido por email. El token es de un
    solo uso y con expiración.
    """
    error_invalido = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="El código de recuperación es inválido o expiró.",
    )

    if not body.new_password or len(body.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 6 caracteres.",
        )

    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == _hash_token(body.token),
        PasswordResetToken.used == False,  # noqa: E712
    ).first()
    if not reset or reset.expires_at < datetime.utcnow():
        raise error_invalido

    modelo = _modelo_por_rol(reset.rol)
    user = db.query(modelo).filter(modelo.id == reset.usuario_id).first() if modelo else None
    if not user:
        raise error_invalido

    user.hashed_password = get_password_hash(body.new_password)
    reset.used = True
    db.commit()

    return {"message": "Tu contraseña fue actualizada correctamente. Ya podés iniciar sesión."}


# ========== CAMBIO DE CONTRASEÑA (SESIÓN ACTIVA) ==========

# Longitud mínima. Es el mismo valor que valida el frontend (`cambiarPasswordSchema`)
# y que exige `reset_password`, así que el mensaje de error también es el mismo.
PASSWORD_MIN_LENGTH = 6


def cambiar_password_usuario_actual(
    payload: CambiarPasswordRequest,
    db: Session,
    current_user: dict,
) -> dict:
    """
    Cambia la contraseña del usuario autenticado, sea cual sea su rol.

    El usuario se deriva SIEMPRE del token (`current_user`), nunca de un id enviado
    por el cliente. La tabla se resuelve con `_modelo_por_rol`, el mismo helper que
    usa `reset_password`, así que los cuatro roles (paciente, médico, coordinador y
    admin) comparten una única implementación.
    """
    # OJO: la contraseña NO se recorta. `login` la verifica tal cual la tipea el usuario
    # y `reset_password` la hashea tal cual, así que un `.strip()` acá dejaría inutilizable
    # cualquier contraseña con un espacio al principio o al final.
    nueva = payload.password or ""
    if len(nueva) < PASSWORD_MIN_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La contraseña debe tener al menos {PASSWORD_MIN_LENGTH} caracteres.",
        )

    modelo = _modelo_por_rol(current_user["rol"])
    user = db.query(modelo).filter(modelo.id == current_user["id"]).first() if modelo else None
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    user.hashed_password = get_password_hash(nueva)

    # `debe_cambiar_password` solo existe en Medico (contraseñas temporales de la
    # importación masiva); los demás modelos no tienen la columna.
    if hasattr(user, "debe_cambiar_password"):
        user.debe_cambiar_password = False

    db.commit()

    return {"message": "Contraseña actualizada correctamente"}


@router.post("/me/cambiar-password", response_model=MessageResponse)
def cambiar_mi_password(
    payload: CambiarPasswordRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Permite a cualquier usuario autenticado cambiar su propia contraseña."""
    return cambiar_password_usuario_actual(payload, db, current_user)


# ========== VERIFICACIÓN DE EMAIL (F04) ==========
# Estos helpers se definen al final del archivo aunque los registros de más arriba los
# usen: Python resuelve los nombres de módulo en tiempo de llamada, no de definición.

# Solo estos roles pueden quedar pendientes de verificación (los otros viven en tablas
# sin la columna `email_verificado`).
_ROLES_CON_VERIFICACION = ("paciente", "medico")


def _crear_token_verificacion(db: Session, *, rol: str, usuario_id: int, email: str) -> str:
    """
    Invalida los tokens de verificación anteriores no usados de esa cuenta y crea uno
    nuevo. Devuelve el token EN CLARO (en la base solo queda su hash SHA-256).

    NO hace commit a propósito: el caller decide la transacción, porque el token debe
    guardarse junto con el alta de la cuenta (o junto al reenvío).
    """
    email = _normalizar_email(email)
    db.query(EmailVerificationToken).filter(
        func.lower(EmailVerificationToken.email) == email,
        EmailVerificationToken.used == False,  # noqa: E712
    ).update({EmailVerificationToken.used: True})

    token = secrets.token_urlsafe(32)
    db.add(EmailVerificationToken(
        token_hash=_hash_token(token),
        rol=rol,
        usuario_id=usuario_id,
        email=email,
        expires_at=datetime.utcnow() + timedelta(
            hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
        ),
        used=False,
    ))
    return token


def _enviar_verificacion_seguro(email: str, nombre: str, token: str) -> None:
    """
    Envía el correo de verificación. Un fallo se loguea y NUNCA rompe la respuesta: la
    cuenta ya está creada y el reenvío (`/auth/resend-verification`) es la vía de rescate.

    Se ejecuta como BackgroundTask, así que recibe solo strings: cuando corre, la sesión
    de base de datos ya fue cerrada por `get_db`.
    """
    try:
        email_service.enviar_verificacion_email(
            email=email,
            nombre=nombre,
            token=token,
            expira_horas=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS,
        )
    except email_service.EmailNoConfiguradoError:
        logger.warning("SMTP no configurado: no se envió la verificación a %s.", email)
    except Exception as e:  # noqa: BLE001
        logger.error("Falló el envío de la verificación a %s: %s", email, e)


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    """
    Verifica el email de una cuenta con el token recibido por correo.

    NO inicia sesión: al terminar, el usuario debe ingresar por /login con su email y
    contraseña.

    Es IDEMPOTENTE: si la cuenta ya está verificada devuelve éxito, porque el enlace se
    puede abrir más de una vez (recarga, doble render de React en desarrollo, dos
    dispositivos). Verificar no otorga ninguna sesión, así que repetirlo no da acceso
    extra. En cambio, un token ya usado sobre una cuenta que sigue SIN verificar (caso
    típico: fue invalidado por un reenvío) se rechaza.
    """
    error_invalido = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="El enlace de verificación es inválido o expiró. Pedí uno nuevo.",
    )

    registro = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == _hash_token(body.token),
    ).first()
    if not registro:
        raise error_invalido

    modelo = _modelo_por_rol(registro.rol)
    user = db.query(modelo).filter(modelo.id == registro.usuario_id).first() if modelo else None
    if not user:
        raise error_invalido

    if getattr(user, "email_verificado", True):
        return {"message": "Tu cuenta ya estaba verificada. Ya podés iniciar sesión."}

    if registro.used or registro.expires_at < datetime.utcnow():
        raise error_invalido

    user.email_verificado = True
    registro.used = True
    db.commit()

    return {"message": "Tu correo fue verificado correctamente. Ya podés iniciar sesión."}


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(
    body: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Reenvía el correo de verificación. Por seguridad la respuesta es SIEMPRE la misma:
    no revela si el email existe, ni su rol, ni si la cuenta ya estaba verificada.

    Al generar un token nuevo se invalidan los anteriores pendientes de esa cuenta.
    """
    mensaje_generico = {
        "message": (
            "Si existe una cuenta pendiente de verificación para ese correo, "
            "enviamos un nuevo enlace."
        )
    }

    rol, user = _buscar_cuenta_por_email(db, str(body.email))
    if not user or rol not in _ROLES_CON_VERIFICACION:
        return mensaje_generico
    if getattr(user, "email_verificado", True):
        return mensaje_generico

    # Se usa `user.email` (el guardado), nunca el tipeado por quien llama al endpoint.
    token = _crear_token_verificacion(db, rol=rol, usuario_id=user.id, email=user.email)
    db.commit()

    background_tasks.add_task(
        _enviar_verificacion_seguro,
        user.email,
        getattr(user, "nombre", ""),
        token,
    )

    return mensaje_generico


# ========== DIAGNÓSTICO ==========

@router.get("/diagnostico-smtp")
def diagnostico_smtp(_admin: dict = Depends(require_admin)):
    """
    Informa la configuración SMTP efectiva y si el servidor acepta la conexión y las
    credenciales. NO envía ningún correo y nunca devuelve la contraseña.

    Es la contrapartida de que todos los envíos capturen sus errores: sin esto, un
    "200 OK" de /auth/forgot-password no dice si el correo salió, si el proveedor lo
    rechazó o si SMTP ni siquiera está configurado en el entorno.
    """
    return email_service.diagnosticar_smtp()
