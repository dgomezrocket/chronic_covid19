"""
Smoke tests de la app: los endpoints de sistema y el camino público completo de un
paciente (registro → verificación → login → perfil), más la búsqueda de hospitales.

Este archivo quedó obsoleto durante varias versiones y no llegaba ni a importarse, así
que el `ImportError` interrumpía la colección y `pytest` no corría NINGUNA suite. Lo que
asumía ya no es cierto:

- importaba `apps.backend.app...` y sacaba `Base`/`engine` de `app.db` (el paquete), que
  no los exporta: viven en `app.db.db`;
- pegaba a rutas `/api/v1/...`, un prefijo que la app nunca montó (`API_V1_STR` existe en
  la config pero no se usa);
- daba por hecho que `/auth/register` devuelve un `access_token`, cosa que dejó de pasar
  cuando se hizo obligatoria la verificación de email;
- adivinaba `paciente_id = 1` en lugar de leer el id real;
- necesitaba una base PostgreSQL levantada.

Ahora sigue el patrón de las demás suites: SQLite en memoria con `get_db` sobreescrito,
así que no necesita Postgres ni la configuración de `tests/conftest.py`.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.db import Base, get_db
from app.main import app
from app.models.models import Hospital

PASSWORD = "secreta123"


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


@pytest.fixture()
def tokens_enviados(monkeypatch):
    """Intercepta el correo de verificación para quedarse con el token en claro.

    En la base sólo se guarda el hash SHA-256, así que este es el único punto donde el
    token es legible — igual que para el usuario real, que lo recibe por email.
    """
    capturados = []

    def _fake_envio(email: str, nombre: str, token: str) -> None:
        capturados.append({"email": email, "nombre": nombre, "token": token})

    monkeypatch.setattr("app.routers.auth._enviar_verificacion_seguro", _fake_envio)
    return capturados


def _registrar_paciente(client, *, email: str = "juan@example.com", documento: str = "12345678"):
    return client.post("/auth/register", json={
        "documento": documento,
        "nombre": "Juan Perez",
        "fecha_nacimiento": "1990-01-01",
        "genero": "masculino",
        "direccion": "Calle Falsa 123",
        "email": email,
        "telefono": "999999999",
        "latitud": -25.30,
        "longitud": -57.63,
        "password": PASSWORD,
    })


def _login(client, email: str, password: str = PASSWORD):
    return client.post("/auth/login", data={"username": email, "password": password})


# ---------- endpoints de sistema ----------

def test_root_describe_la_api(client):
    respuesta = client.get("/")

    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["status"] == "running"
    assert cuerpo["version"]


def test_health_check(client):
    respuesta = client.get("/health")

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json() == {"status": "healthy"}


def test_no_existe_el_prefijo_api_v1(client):
    """`API_V1_STR` sigue en la config pero no monta nada: documentarlo con un test evita
    que alguien vuelva a escribir rutas contra un prefijo inexistente."""
    assert client.get("/api/v1/hospitales/nearby?lat=0&lon=0&radio=5").status_code == 404


# ---------- registro, verificación y login ----------

def test_registro_no_devuelve_token_y_deja_la_cuenta_pendiente(client, tokens_enviados):
    """El autoregistro crea la cuenta pero NO abre sesión: primero hay que verificar."""
    respuesta = _registrar_paciente(client)

    assert respuesta.status_code == 201, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["requires_verification"] is True
    assert "access_token" not in cuerpo
    assert len(tokens_enviados) == 1


def test_login_sin_verificar_devuelve_403(client, tokens_enviados):
    _registrar_paciente(client)

    respuesta = _login(client, "juan@example.com")

    assert respuesta.status_code == 403, respuesta.text
    assert "verificar" in respuesta.json()["detail"].lower()


def test_camino_completo_registro_verificacion_login_y_perfil(client, tokens_enviados):
    """El recorrido público de punta a punta, que es lo que este archivo debía cubrir."""
    assert _registrar_paciente(client).status_code == 201

    verificacion = client.post(
        "/auth/verify-email",
        json={"token": tokens_enviados[0]["token"]},
    )
    assert verificacion.status_code == 200, verificacion.text

    login = _login(client, "juan@example.com")
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    cabeceras = {"Authorization": f"Bearer {token}"}

    # El id sale de /auth/me, no de suponer que el primer paciente es el 1.
    yo = client.get("/auth/me", headers=cabeceras)
    assert yo.status_code == 200, yo.text
    paciente_id = yo.json()["id"]

    perfil = client.get(f"/pacientes/{paciente_id}", headers=cabeceras)
    assert perfil.status_code == 200, perfil.text
    assert perfil.json()["email"] == "juan@example.com"
    assert perfil.json()["documento"] == "12345678"


def test_pacientes_requiere_autenticacion(client, tokens_enviados):
    """La ficha del paciente no se sirve sin token.

    La matriz completa por rol vive en `tests/test_pacientes_acceso.py`; acá sólo se
    comprueba, a nivel humo, que el endpoint no queda abierto.
    """
    _registrar_paciente(client)

    assert client.get("/pacientes/1").status_code == 401


# ---------- hospitales cercanos ----------

def test_hospitales_nearby_sin_datos_devuelve_lista_vacia(client):
    """Es público y no debe fallar cuando todavía no hay hospitales cargados."""
    respuesta = client.get("/hospitales/nearby?lat=-25.30&lon=-57.63&radio=5.0")

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json() == []


def test_hospitales_nearby_filtra_por_radio(client, db_session):
    db_session.add_all([
        Hospital(
            nombre="Hospital Cercano", codigo="HC-001", departamento="Central",
            ciudad="Luque", barrio="Centro", direccion="Av. Humaitá 123",
            telefono="021123456", latitud=-25.31, longitud=-57.64,
        ),
        Hospital(
            nombre="Hospital Lejano", codigo="HL-002", departamento="Itapúa",
            ciudad="Encarnación", barrio="Centro", direccion="Av. Irrazábal 456",
            telefono="071123456", latitud=-27.33, longitud=-55.87,
        ),
    ])
    db_session.commit()

    respuesta = client.get("/hospitales/nearby?lat=-25.30&lon=-57.63&radio=1.0")

    assert respuesta.status_code == 200, respuesta.text
    nombres = [h["nombre"] for h in respuesta.json()]
    assert nombres == ["Hospital Cercano"]
