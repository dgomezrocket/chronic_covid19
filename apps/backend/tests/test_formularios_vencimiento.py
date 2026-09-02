"""
Tests del vencimiento de las asignaciones de formularios.

Antes de esto el backend no miraba `fecha_expiracion` en ningún momento: `/mis-asignaciones`
devolvía "pendiente" para siempre y `POST .../responder` aceptaba respuestas de formularios
vencidos y respuestas repetidas. El bloqueo existía solo en la interfaz, así que se
salteaba llamando la API directo.

El corte es al terminar el día de vencimiento: "vence hoy" todavía se puede responder.

Corren sobre SQLite en memoria con `get_db` sobreescrito, así que no necesitan la base de
Postgres ni la configuración de `tests/conftest.py`.
"""
from datetime import date, datetime, time, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import get_password_hash
from app.db.db import Base, get_db
from app.main import app
from app.models.models import (
    Formulario,
    FormularioAsignacion,
    GeneroEnum,
    Medico,
    Paciente,
    RespuestaFormulario,
    RolEnum,
)

PASSWORD = "secreta123"

PREGUNTAS = [
    {"id": "q1", "type": "select", "label": "¿Cómo se ha sentido?", "required": True,
     "options": ["Mejor", "Igual", "Peor"]},
]


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
def entorno(client, db_session):
    """Un paciente logueado, un médico y un formulario listo para asignar."""
    paciente = Paciente(
        documento="1234567",
        nombre="Juana Paciente",
        fecha_nacimiento=date(1990, 1, 1),
        genero=GeneroEnum.femenino,
        email="juana@example.com",
        hashed_password=get_password_hash(PASSWORD),
        rol=RolEnum.paciente,
        email_verificado=True,
    )
    medico = Medico(
        documento="7654321",
        nombre="Dr. Ejemplo",
        email="doctor@example.com",
        hashed_password=get_password_hash(PASSWORD),
        rol=RolEnum.medico,
    )
    db_session.add_all([paciente, medico])
    db_session.commit()

    formulario = Formulario(
        tipo="seguimiento",
        titulo="Seguimiento de síntomas del paciente",
        preguntas=PREGUNTAS,
        creador_id=medico.id,
    )
    db_session.add(formulario)
    db_session.commit()

    login = client.post("/auth/login", data={"username": paciente.email, "password": PASSWORD})
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    return {
        "paciente": paciente,
        "medico": medico,
        "formulario": formulario,
        "headers": headers,
        "db": db_session,
    }


def _asignar(entorno, *, fecha_expiracion=None, estado="pendiente") -> FormularioAsignacion:
    db = entorno["db"]
    asignacion = FormularioAsignacion(
        formulario_id=entorno["formulario"].id,
        paciente_id=entorno["paciente"].id,
        asignado_por=entorno["medico"].id,
        fecha_expiracion=fecha_expiracion,
        estado=estado,
    )
    db.add(asignacion)
    db.commit()
    db.refresh(asignacion)
    return asignacion


def _medianoche(dias: int) -> datetime:
    """Las 00:00 de hoy desplazadas `dias` (negativo = pasado)."""
    return datetime.combine(date.today() + timedelta(days=dias), time.min)


# ---------- estado derivado en /mis-asignaciones ----------

def test_asignacion_vencida_se_reporta_como_expirado(entorno, client):
    """El caso reportado: una pendiente con fecha límite pasada salía "pendiente"."""
    _asignar(entorno, fecha_expiracion=_medianoche(-1))

    respuesta = client.get("/formularios/mis-asignaciones", headers=entorno["headers"])

    assert respuesta.status_code == 200, respuesta.text
    assert [a["estado"] for a in respuesta.json()] == ["expirado"]


def test_la_que_vence_hoy_sigue_pendiente(entorno, client):
    """El corte es al terminar el día: quien recibe el formulario el día del vencimiento
    tiene que poder responderlo."""
    _asignar(entorno, fecha_expiracion=_medianoche(0))

    respuesta = client.get("/formularios/mis-asignaciones", headers=entorno["headers"])

    assert [a["estado"] for a in respuesta.json()] == ["pendiente"]


def test_sin_fecha_limite_nunca_vence(entorno, client):
    _asignar(entorno, fecha_expiracion=None)

    respuesta = client.get("/formularios/mis-asignaciones", headers=entorno["headers"])

    assert [a["estado"] for a in respuesta.json()] == ["pendiente"]


def test_una_completada_no_pasa_a_expirado_por_el_paso_del_tiempo(entorno, client):
    """Se respondió dentro del plazo; que hoy la fecha esté vencida no la cambia."""
    _asignar(entorno, fecha_expiracion=_medianoche(-5), estado="completado")

    respuesta = client.get("/formularios/mis-asignaciones", headers=entorno["headers"])

    assert [a["estado"] for a in respuesta.json()] == ["completado"]


# ---------- filtro por estado ----------

def test_filtro_pendiente_excluye_las_vencidas(entorno, client):
    _asignar(entorno, fecha_expiracion=_medianoche(-1))   # vencida
    _asignar(entorno, fecha_expiracion=_medianoche(+3))    # abierta

    respuesta = client.get(
        "/formularios/mis-asignaciones?estado=pendiente", headers=entorno["headers"]
    )

    assert [a["estado"] for a in respuesta.json()] == ["pendiente"]


def test_filtro_expirado_encuentra_las_vencidas(entorno, client):
    vencida = _asignar(entorno, fecha_expiracion=_medianoche(-1))
    _asignar(entorno, fecha_expiracion=_medianoche(+3))

    respuesta = client.get(
        "/formularios/mis-asignaciones?estado=expirado", headers=entorno["headers"]
    )

    items = respuesta.json()
    assert [a["id"] for a in items] == [vencida.id]
    assert items[0]["estado"] == "expirado"


# ---------- POST .../responder ----------

def test_no_se_puede_responder_una_vencida(entorno, client, db_session):
    asignacion = _asignar(entorno, fecha_expiracion=_medianoche(-1))

    respuesta = client.post(
        f"/formularios/asignaciones/{asignacion.id}/responder",
        json={"respuestas": {"q1": "Mejor"}},
        headers=entorno["headers"],
    )

    assert respuesta.status_code == 400, respuesta.text
    assert "venció" in respuesta.json()["detail"]
    # No quedó nada guardado ni cambió el estado.
    assert db_session.query(RespuestaFormulario).count() == 0
    db_session.refresh(asignacion)
    assert asignacion.estado == "pendiente"


def test_se_puede_responder_la_que_vence_hoy(entorno, client, db_session):
    asignacion = _asignar(entorno, fecha_expiracion=_medianoche(0))

    respuesta = client.post(
        f"/formularios/asignaciones/{asignacion.id}/responder",
        json={"respuestas": {"q1": "Mejor"}},
        headers=entorno["headers"],
    )

    assert respuesta.status_code == 200, respuesta.text
    db_session.refresh(asignacion)
    assert asignacion.estado == "completado"
    assert db_session.query(RespuestaFormulario).count() == 1


def test_no_se_puede_responder_dos_veces(entorno, client, db_session):
    """Antes esto insertaba una segunda respuesta y los lectores usan `.first()` sin orden,
    así que cuál ganaba quedaba indefinido."""
    asignacion = _asignar(entorno, fecha_expiracion=_medianoche(+3))
    url = f"/formularios/asignaciones/{asignacion.id}/responder"

    primera = client.post(url, json={"respuestas": {"q1": "Mejor"}}, headers=entorno["headers"])
    assert primera.status_code == 200, primera.text

    segunda = client.post(url, json={"respuestas": {"q1": "Peor"}}, headers=entorno["headers"])

    assert segunda.status_code == 400, segunda.text
    assert segunda.json()["detail"] == "Ya respondiste este formulario."
    assert db_session.query(RespuestaFormulario).count() == 1


def test_no_se_puede_responder_una_cancelada(entorno, client, db_session):
    asignacion = _asignar(entorno, estado="cancelado")

    respuesta = client.post(
        f"/formularios/asignaciones/{asignacion.id}/responder",
        json={"respuestas": {"q1": "Mejor"}},
        headers=entorno["headers"],
    )

    assert respuesta.status_code == 400, respuesta.text
    assert db_session.query(RespuestaFormulario).count() == 0


def test_responder_sin_fecha_limite_sigue_funcionando(entorno, client, db_session):
    """El camino feliz no se rompe con las validaciones nuevas."""
    asignacion = _asignar(entorno, fecha_expiracion=None)

    respuesta = client.post(
        f"/formularios/asignaciones/{asignacion.id}/responder",
        json={"respuestas": {"q1": "Igual"}},
        headers=entorno["headers"],
    )

    assert respuesta.status_code == 200, respuesta.text
    guardada = db_session.query(RespuestaFormulario).one()
    assert guardada.respuestas == {"q1": "Igual"}
    assert guardada.asignacion_id == asignacion.id


def test_un_medico_no_puede_responder_por_el_paciente(entorno, client):
    """El endpoint no validaba rol: alcanzaba con que el id coincidiera con paciente_id."""
    asignacion = _asignar(entorno)
    login = client.post(
        "/auth/login",
        data={"username": entorno["medico"].email, "password": PASSWORD},
    )
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    respuesta = client.post(
        f"/formularios/asignaciones/{asignacion.id}/responder",
        json={"respuestas": {"q1": "Mejor"}},
        headers=headers,
    )

    assert respuesta.status_code == 403, respuesta.text
