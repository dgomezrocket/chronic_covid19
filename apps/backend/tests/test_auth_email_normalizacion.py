"""
Tests de las reglas de credenciales de `/auth`: el email no distingue mayúsculas y la
contraseña se guarda tal cual se tipea.

Corren sobre SQLite en memoria con `get_db` sobreescrito, así que no necesitan la base
de Postgres ni la configuración de `tests/conftest.py`.

Cubren las tres regresiones que hacían que un usuario no pudiera entrar:
- login con el email en distinto casing que el guardado devolvía 401,
- `/auth/forgot-password` respondía 200 sin generar token ni intentar el envío,
- una contraseña con espacios al borde quedaba inutilizable tras cambiarla.
"""
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import get_password_hash
from app.db.db import Base, get_db
from app.main import app
from app.models.models import Admin, GeneroEnum, Medico, Paciente, PasswordResetToken, RolEnum


@pytest.fixture()
def db_session():
    """Base SQLite en memoria, nueva por test. StaticPool para que todas las conexiones
    vean el mismo esquema."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)


def _crear_paciente(db, *, email: str, password: str = "secreta123") -> Paciente:
    paciente = Paciente(
        documento="1234567",
        nombre="Juana Paciente",
        fecha_nacimiento=date(1990, 1, 1),
        genero=GeneroEnum.femenino,
        email=email,
        hashed_password=get_password_hash(password),
        rol=RolEnum.paciente,
        email_verificado=True,
    )
    db.add(paciente)
    db.commit()
    db.refresh(paciente)
    return paciente


def _login(client, email: str, password: str):
    return client.post("/auth/login", data={"username": email, "password": password})


# ---------- login insensible a mayúsculas ----------

@pytest.mark.parametrize("tipeado", ["Juan@Gmail.com", "juan@gmail.com", "  JUAN@GMAIL.COM  "])
def test_login_ignora_el_casing_del_email(client, db_session, tipeado):
    """La cuenta quedó guardada con mayúsculas: antes solo entraba con ese casing exacto."""
    _crear_paciente(db_session, email="Juan@Gmail.com")

    respuesta = _login(client, tipeado, "secreta123")

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["access_token"]


def test_login_con_password_incorrecta_sigue_dando_401(client, db_session):
    _crear_paciente(db_session, email="juan@gmail.com")

    respuesta = _login(client, "juan@gmail.com", "otra-cosa")

    assert respuesta.status_code == 401
    assert respuesta.json()["detail"] == "Credenciales incorrectas"


def test_login_de_cuenta_sin_verificar_da_403_y_no_401(client, db_session):
    """El gate de F04 tiene que seguir siendo distinguible de una credencial inválida."""
    paciente = _crear_paciente(db_session, email="sinverificar@gmail.com")
    paciente.email_verificado = False
    db_session.commit()

    respuesta = _login(client, "sinverificar@gmail.com", "secreta123")

    assert respuesta.status_code == 403
    assert "verificar tu correo" in respuesta.json()["detail"]


def test_login_encuentra_al_medico_aunque_el_email_tenga_mayusculas(client, db_session):
    """La búsqueda recorre las 4 tablas; el casing no debe romper las que no son pacientes."""
    db_session.add(Medico(
        documento="7654321",
        nombre="Dr. Ejemplo",
        email="Doctor@Hospital.com",
        hashed_password=get_password_hash("secreta123"),
        rol=RolEnum.medico,
        email_verificado=True,
    ))
    db_session.commit()

    respuesta = _login(client, "doctor@hospital.com", "secreta123")

    assert respuesta.status_code == 200, respuesta.text


# ---------- forgot-password ----------

def test_forgot_password_genera_token_aunque_el_email_tenga_mayusculas(client, db_session):
    """
    Antes esto devolvía 200 sin crear ninguna fila: el endpoint pasaba el input a
    minúsculas y después lo comparaba de forma exacta contra el email guardado.
    """
    _crear_paciente(db_session, email="Juan@Gmail.com")

    respuesta = client.post("/auth/forgot-password", json={"email": "juan@gmail.com"})

    assert respuesta.status_code == 200
    tokens = db_session.query(PasswordResetToken).all()
    assert len(tokens) == 1
    assert tokens[0].email == "juan@gmail.com"
    assert tokens[0].rol == "paciente"


def test_forgot_password_de_email_inexistente_no_crea_token(client, db_session):
    respuesta = client.post("/auth/forgot-password", json={"email": "nadie@gmail.com"})

    assert respuesta.status_code == 200
    assert db_session.query(PasswordResetToken).count() == 0


# ---------- registro ----------

def test_el_registro_guarda_el_email_normalizado(client, db_session):
    respuesta = client.post("/auth/register", json={
        "documento": "9999999",
        "nombre": "Nuevo Paciente",
        "fecha_nacimiento": "1990-01-01",
        "genero": "masculino",
        "email": "Nuevo@Gmail.com",
        "password": "secreta123",
    })

    assert respuesta.status_code == 201, respuesta.text
    paciente = db_session.query(Paciente).filter(Paciente.documento == "9999999").one()
    assert paciente.email == "nuevo@gmail.com"


def test_el_registro_rechaza_un_email_ya_usado_con_otro_casing(client, db_session):
    _crear_paciente(db_session, email="juan@gmail.com")

    respuesta = client.post("/auth/register", json={
        "documento": "8888888",
        "nombre": "Otro Paciente",
        "fecha_nacimiento": "1990-01-01",
        "genero": "masculino",
        "email": "JUAN@gmail.com",
        "password": "secreta123",
    })

    assert respuesta.status_code == 400
    assert "ya está siendo utilizado" in respuesta.json()["detail"]


# ---------- contraseña ----------

def test_cambiar_password_conserva_los_espacios_del_borde(client, db_session):
    """
    `login` verifica la contraseña tal cual la tipea el usuario, así que el cambio no
    puede recortarla: si lo hacía, la contraseña recién fijada no servía para entrar.
    """
    _crear_paciente(db_session, email="juan@gmail.com")
    token = _login(client, "juan@gmail.com", "secreta123").json()["access_token"]
    nueva = "  con espacios  "

    cambio = client.post(
        "/auth/me/cambiar-password",
        json={"password": nueva},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cambio.status_code == 200, cambio.text

    assert _login(client, "juan@gmail.com", nueva).status_code == 200
    assert _login(client, "juan@gmail.com", nueva.strip()).status_code == 401


# ---------- diagnóstico SMTP ----------

def test_diagnostico_smtp_requiere_admin(client, db_session):
    """Expone configuración del servidor: un paciente autenticado no debe poder verla."""
    _crear_paciente(db_session, email="juan@gmail.com")
    token = _login(client, "juan@gmail.com", "secreta123").json()["access_token"]

    respuesta = client.get(
        "/auth/diagnostico-smtp", headers={"Authorization": f"Bearer {token}"}
    )

    assert respuesta.status_code == 403


def test_diagnostico_smtp_informa_que_no_hay_configuracion(client, db_session, monkeypatch):
    """Sin SMTP_HOST/SMTP_USER el diagnóstico lo dice explícitamente y no intenta conectar."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "SMTP_HOST", "")
    monkeypatch.setattr(settings, "SMTP_USER", "")

    admin = Admin(
        documento="5555555",
        nombre="Admin Ejemplo",
        email="admin@gmail.com",
        hashed_password=get_password_hash("secreta123"),
        rol=RolEnum.admin,
        activo=1,
    )
    db_session.add(admin)
    db_session.commit()
    token = _login(client, "admin@gmail.com", "secreta123").json()["access_token"]

    respuesta = client.get(
        "/auth/diagnostico-smtp", headers={"Authorization": f"Bearer {token}"}
    )

    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["ok"] is False
    assert cuerpo["configurado"] is False
    assert "SMTP no configurado" in cuerpo["error"]
    # La contraseña nunca se devuelve, solo si está definida.
    assert "password" not in cuerpo
    assert cuerpo["password_definida"] is False
