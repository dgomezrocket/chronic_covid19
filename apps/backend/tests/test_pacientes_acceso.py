"""
Tests del alcance de `/pacientes`: quién puede ver y modificar la ficha de un paciente.

Los cuatro endpoints de este router no pedían ningún token: declaraban sólo
`Depends(get_db)`, así que el alcance quedaba enteramente en manos de quien llamara. Ahora
se deriva del token con `verificar_acceso_a_paciente`, como en el resto del sistema.

Estos tests fijan la matriz completa para que un refactor no la afloje sin que se note, y
además comprueban que lo que la web y la app YA hacían (el paciente leyendo y editando su
propia ficha) sigue funcionando igual.

Corren sobre SQLite en memoria con `get_db` sobreescrito: no necesitan Postgres.
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
from app.models.models import (
    Admin,
    Asignacion,
    Coordinador,
    GeneroEnum,
    Hospital,
    Medico,
    Paciente,
    RolEnum,
)

PASSWORD = "secreta123"


@pytest.fixture()
def db_session():
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
def escenario(db_session):
    """Dos hospitales, dos pacientes, dos médicos, dos coordinadores y un admin.

    El paciente 1 está en el hospital A y asignado al médico A; el paciente 2 está en el
    hospital B. Así cada test puede probar tanto el caso permitido como el ajeno.
    """
    hospital_a = Hospital(
        nombre="Hospital A", codigo="HA-001", departamento="Central", ciudad="Luque",
        barrio="Centro", direccion="Av. A 1", telefono="021111111",
        latitud=-25.30, longitud=-57.63,
    )
    hospital_b = Hospital(
        nombre="Hospital B", codigo="HB-002", departamento="Central", ciudad="Areguá",
        barrio="Centro", direccion="Av. B 2", telefono="021222222",
        latitud=-25.31, longitud=-57.40,
    )
    db_session.add_all([hospital_a, hospital_b])
    db_session.flush()

    def _paciente(documento, email, hospital):
        return Paciente(
            documento=documento, nombre=f"Paciente {documento}",
            fecha_nacimiento=date(1990, 1, 1), genero=GeneroEnum.femenino,
            email=email, hashed_password=get_password_hash(PASSWORD),
            rol=RolEnum.paciente, email_verificado=True, hospital_id=hospital.id,
        )

    def _medico(documento, email):
        return Medico(
            documento=documento, nombre=f"Medico {documento}", email=email,
            hashed_password=get_password_hash(PASSWORD), rol=RolEnum.medico,
            email_verificado=True,
        )

    def _coordinador(documento, email, hospital):
        return Coordinador(
            documento=documento, nombre=f"Coord {documento}", email=email,
            hashed_password=get_password_hash(PASSWORD), rol=RolEnum.coordinador,
            hospital_id=hospital.id,
        )

    paciente_a = _paciente("1000001", "paciente.a@example.com", hospital_a)
    paciente_b = _paciente("1000002", "paciente.b@example.com", hospital_b)
    medico_a = _medico("2000001", "medico.a@example.com")
    medico_b = _medico("2000002", "medico.b@example.com")
    coord_a = _coordinador("3000001", "coord.a@example.com", hospital_a)
    coord_b = _coordinador("3000002", "coord.b@example.com", hospital_b)
    admin = Admin(
        documento="4000001", nombre="Admin", email="admin@example.com",
        hashed_password=get_password_hash(PASSWORD), rol=RolEnum.admin, activo=1,
    )
    db_session.add_all([paciente_a, paciente_b, medico_a, medico_b, coord_a, coord_b, admin])
    db_session.flush()

    db_session.add(Asignacion(paciente_id=paciente_a.id, medico_id=medico_a.id, activo=True))
    db_session.commit()

    return {
        "paciente_a": paciente_a, "paciente_b": paciente_b,
        "medico_a": medico_a, "medico_b": medico_b,
        "coord_a": coord_a, "coord_b": coord_b, "admin": admin,
    }


def _auth(client, email: str) -> dict:
    respuesta = client.post("/auth/login", data={"username": email, "password": PASSWORD})
    assert respuesta.status_code == 200, respuesta.text
    return {"Authorization": f"Bearer {respuesta.json()['access_token']}"}


# ---------- sin token ----------

@pytest.mark.parametrize("metodo,ruta", [
    ("get", "/pacientes/{id}"),
    ("put", "/pacientes/{id}"),
    ("get", "/pacientes/{id}/formularios"),
    ("post", "/pacientes/{id}/formularios"),
])
def test_sin_token_devuelve_401(client, escenario, metodo, ruta):
    """Antes los cuatro respondían 200 sin ninguna credencial."""
    url = ruta.format(id=escenario["paciente_a"].id)
    # GET no lleva cuerpo; PUT/POST sí, aunque acá da igual: la credencial se valida antes.
    extra = {} if metodo == "get" else {"json": {}}

    respuesta = getattr(client, metodo)(url, **extra)

    assert respuesta.status_code == 401, respuesta.text


# ---------- lectura ----------

def test_paciente_ve_su_propia_ficha(client, escenario):
    """Lo que ya hacían la web (`/dashboard/profile`) y la app (pestaña Datos)."""
    cabeceras = _auth(client, "paciente.a@example.com")

    respuesta = client.get(f"/pacientes/{escenario['paciente_a'].id}", headers=cabeceras)

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["email"] == "paciente.a@example.com"


def test_paciente_no_ve_la_ficha_de_otro(client, escenario):
    cabeceras = _auth(client, "paciente.a@example.com")

    respuesta = client.get(f"/pacientes/{escenario['paciente_b'].id}", headers=cabeceras)

    assert respuesta.status_code == 404, respuesta.text


def test_medico_ve_a_su_paciente_asignado(client, escenario):
    cabeceras = _auth(client, "medico.a@example.com")

    respuesta = client.get(f"/pacientes/{escenario['paciente_a'].id}", headers=cabeceras)

    assert respuesta.status_code == 200, respuesta.text


def test_medico_no_ve_a_un_paciente_ajeno(client, escenario):
    cabeceras = _auth(client, "medico.b@example.com")

    respuesta = client.get(f"/pacientes/{escenario['paciente_a'].id}", headers=cabeceras)

    assert respuesta.status_code == 404, respuesta.text


def test_medico_pierde_el_acceso_si_la_asignacion_se_desactiva(client, escenario, db_session):
    """El alcance es la asignación ACTIVA, igual que en `/asignaciones/mis-pacientes`."""
    asignacion = db_session.query(Asignacion).first()
    asignacion.activo = False
    db_session.commit()

    cabeceras = _auth(client, "medico.a@example.com")
    respuesta = client.get(f"/pacientes/{escenario['paciente_a'].id}", headers=cabeceras)

    assert respuesta.status_code == 404, respuesta.text


def test_coordinador_ve_a_los_pacientes_de_su_hospital(client, escenario):
    cabeceras = _auth(client, "coord.a@example.com")

    respuesta = client.get(f"/pacientes/{escenario['paciente_a'].id}", headers=cabeceras)

    assert respuesta.status_code == 200, respuesta.text


def test_coordinador_no_ve_pacientes_de_otro_hospital(client, escenario):
    cabeceras = _auth(client, "coord.b@example.com")

    respuesta = client.get(f"/pacientes/{escenario['paciente_a'].id}", headers=cabeceras)

    assert respuesta.status_code == 404, respuesta.text


def test_admin_ve_cualquier_ficha(client, escenario):
    cabeceras = _auth(client, "admin@example.com")

    for clave in ("paciente_a", "paciente_b"):
        respuesta = client.get(f"/pacientes/{escenario[clave].id}", headers=cabeceras)
        assert respuesta.status_code == 200, respuesta.text


def test_paciente_inexistente_devuelve_404(client, escenario):
    cabeceras = _auth(client, "admin@example.com")

    assert client.get("/pacientes/99999", headers=cabeceras).status_code == 404


# ---------- escritura ----------

def test_paciente_edita_su_propia_ficha(client, escenario):
    """El flujo real de `/dashboard/profile/edit` y de la pestaña Datos del móvil."""
    cabeceras = _auth(client, "paciente.a@example.com")

    respuesta = client.put(
        f"/pacientes/{escenario['paciente_a'].id}",
        json={"nombre": "Nombre Nuevo", "telefono": "0981123456"},
        headers=cabeceras,
    )

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["nombre"] == "Nombre Nuevo"


def test_paciente_no_edita_la_ficha_de_otro(client, escenario):
    cabeceras = _auth(client, "paciente.a@example.com")

    respuesta = client.put(
        f"/pacientes/{escenario['paciente_b'].id}",
        json={"nombre": "Hackeado"},
        headers=cabeceras,
    )

    assert respuesta.status_code == 404, respuesta.text


def test_medico_y_coordinador_no_editan_la_ficha(client, escenario):
    """Pueden consultarla, no modificarla: para eso están los endpoints de asignación."""
    for email in ("medico.a@example.com", "coord.a@example.com"):
        cabeceras = _auth(client, email)
        respuesta = client.put(
            f"/pacientes/{escenario['paciente_a'].id}",
            json={"nombre": "Cambiado por otro"},
            headers=cabeceras,
        )
        assert respuesta.status_code == 403, f"{email}: {respuesta.text}"


def test_paciente_no_puede_cambiarse_de_hospital(client, escenario):
    """`hospital_id` decide qué coordinador y qué médicos lo ven: se gestiona por
    `/asignaciones/paciente-hospital`, no desde el propio perfil."""
    cabeceras = _auth(client, "paciente.a@example.com")

    respuesta = client.put(
        f"/pacientes/{escenario['paciente_a'].id}",
        json={"hospital_id": escenario["paciente_b"].hospital_id},
        headers=cabeceras,
    )

    assert respuesta.status_code == 403, respuesta.text


def test_admin_si_puede_cambiar_el_hospital(client, escenario, db_session):
    cabeceras = _auth(client, "admin@example.com")
    destino = escenario["paciente_b"].hospital_id

    respuesta = client.put(
        f"/pacientes/{escenario['paciente_a'].id}",
        json={"hospital_id": destino},
        headers=cabeceras,
    )

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["hospital_id"] == destino


def test_la_validacion_de_email_duplicado_sigue_vigente(client, escenario):
    """El guard nuevo no debe haberse comido las validaciones que ya existían."""
    cabeceras = _auth(client, "paciente.a@example.com")

    respuesta = client.put(
        f"/pacientes/{escenario['paciente_a'].id}",
        json={"email": "paciente.b@example.com"},
        headers=cabeceras,
    )

    assert respuesta.status_code == 400, respuesta.text
    assert "email" in respuesta.json()["detail"].lower()


def test_la_validacion_de_documento_duplicado_sigue_vigente(client, escenario):
    cabeceras = _auth(client, "paciente.a@example.com")

    respuesta = client.put(
        f"/pacientes/{escenario['paciente_a'].id}",
        json={"documento": escenario["paciente_b"].documento},
        headers=cabeceras,
    )

    assert respuesta.status_code == 400, respuesta.text
    assert "documento" in respuesta.json()["detail"].lower()


# ---------- respuestas de formularios ----------

def test_respuestas_solo_para_quien_tiene_alcance(client, escenario):
    permitidos = ("paciente.a@example.com", "medico.a@example.com",
                  "coord.a@example.com", "admin@example.com")
    for email in permitidos:
        cabeceras = _auth(client, email)
        respuesta = client.get(
            f"/pacientes/{escenario['paciente_a'].id}/formularios", headers=cabeceras
        )
        assert respuesta.status_code == 200, f"{email}: {respuesta.text}"

    for email in ("paciente.b@example.com", "medico.b@example.com", "coord.b@example.com"):
        cabeceras = _auth(client, email)
        respuesta = client.get(
            f"/pacientes/{escenario['paciente_a'].id}/formularios", headers=cabeceras
        )
        assert respuesta.status_code == 404, f"{email}: {respuesta.text}"


def test_nadie_puede_registrar_respuestas_en_nombre_de_otro(client, escenario):
    """Ni siquiera el médico tratante: la respuesta clínica la firma el paciente."""
    for email in ("medico.a@example.com", "coord.a@example.com", "admin@example.com",
                  "paciente.b@example.com"):
        cabeceras = _auth(client, email)
        respuesta = client.post(
            f"/pacientes/{escenario['paciente_a'].id}/formularios",
            json={"formulario_id": 1, "respuestas": {"q1": "si"}},
            headers=cabeceras,
        )
        assert respuesta.status_code == 403, f"{email}: {respuesta.text}"
