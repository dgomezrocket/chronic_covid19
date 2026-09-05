"""
Tests de F21: gestión individual de médicos por el coordinador.

Cubren `POST/GET/PUT /coordinadores/me/medicos[/{id}]`: alta con contraseña temporal,
asociación automática al hospital del coordinador, edición con validación de
duplicados, y el aislamiento entre hospitales (un coordinador no puede leer ni editar
médicos de otro hospital).

Corren sobre SQLite en memoria con `get_db` sobreescrito, así que no necesitan la base
de Postgres ni la configuración de `tests/conftest.py`.

El envío de correo se sustituye siempre con monkeypatch: así el resultado no depende de
si la máquina tiene SMTP configurado en su `.env`.
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
    Coordinador,
    Especialidad,
    GeneroEnum,
    Hospital,
    Medico,
    Paciente,
    RolEnum,
)
from app.services import email_service

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


@pytest.fixture(autouse=True)
def smtp_apagado(monkeypatch):
    """
    Por defecto el envío falla como si no hubiera SMTP configurado.

    Es el caso realista en desarrollo y además fija el comportamiento que importa: el
    médico se crea igual. Los tests que necesitan el envío exitoso lo sobreescriben.
    """
    def _falla(**_kwargs):
        raise email_service.EmailNoConfiguradoError("SMTP no configurado")

    monkeypatch.setattr(email_service, "enviar_bienvenida_medico", _falla)


# ---------- helpers ----------

def _crear_hospital(db, nombre: str) -> Hospital:
    hospital = Hospital(nombre=nombre)
    db.add(hospital)
    db.commit()
    db.refresh(hospital)
    return hospital


def _crear_coordinador(db, *, email: str, documento: str, hospital_id=None) -> Coordinador:
    coordinador = Coordinador(
        documento=documento,
        nombre=f"Coord {documento}",
        email=email,
        telefono="0981000000",
        hashed_password=get_password_hash(PASSWORD),
        hospital_id=hospital_id,
        rol=RolEnum.coordinador,
    )
    db.add(coordinador)
    db.commit()
    db.refresh(coordinador)
    return coordinador


def _crear_medico(db, *, email: str, documento: str, hospitales=(), especialidades=()) -> Medico:
    medico = Medico(
        documento=documento,
        nombre=f"Dr {documento}",
        email=email,
        hashed_password=get_password_hash(PASSWORD),
        rol=RolEnum.medico,
        email_verificado=True,
    )
    db.add(medico)
    db.flush()
    medico.hospitales = list(hospitales)
    medico.especialidades = list(especialidades)
    db.commit()
    db.refresh(medico)
    return medico


def _crear_especialidad(db, nombre: str, activa: int = 1) -> Especialidad:
    especialidad = Especialidad(nombre=nombre, activa=activa)
    db.add(especialidad)
    db.commit()
    db.refresh(especialidad)
    return especialidad


def _crear_paciente(db, *, email: str, documento: str) -> Paciente:
    paciente = Paciente(
        documento=documento,
        nombre="Juana Paciente",
        fecha_nacimiento=date(1990, 1, 1),
        genero=GeneroEnum.femenino,
        email=email,
        hashed_password=get_password_hash(PASSWORD),
        rol=RolEnum.paciente,
        email_verificado=True,
    )
    db.add(paciente)
    db.commit()
    db.refresh(paciente)
    return paciente


def _auth(client, email: str, password: str = PASSWORD) -> dict:
    respuesta = client.post("/auth/login", data={"username": email, "password": password})
    assert respuesta.status_code == 200, respuesta.text
    return {"Authorization": f"Bearer {respuesta.json()['access_token']}"}


class _Escenario:
    """Dos hospitales con un coordinador cada uno, más un coordinador sin hospital."""

    def __init__(self, db):
        self.hospital_a = _crear_hospital(db, "Hospital A")
        self.hospital_b = _crear_hospital(db, "Hospital B")
        self.coord_a = _crear_coordinador(db, email="coord.a@hospital.com",
                                         documento="1000001", hospital_id=self.hospital_a.id)
        self.coord_b = _crear_coordinador(db, email="coord.b@hospital.com",
                                          documento="1000002", hospital_id=self.hospital_b.id)
        self.coord_sin_hospital = _crear_coordinador(db, email="coord.sin@hospital.com",
                                                     documento="1000003", hospital_id=None)
        self.cardio = _crear_especialidad(db, "Cardiología")
        self.pediatria = _crear_especialidad(db, "Pediatría")
        self.inactiva = _crear_especialidad(db, "Especialidad Vieja", activa=0)
        self.medico_en_a = _crear_medico(db, email="med.a@hospital.com", documento="2000001",
                                         hospitales=[self.hospital_a], especialidades=[self.cardio])
        self.medico_en_b = _crear_medico(db, email="med.b@hospital.com", documento="2000002",
                                         hospitales=[self.hospital_b])
        self.medico_sin_hospital = _crear_medico(db, email="med.libre@hospital.com",
                                                 documento="2000003")


@pytest.fixture()
def esc(db_session):
    return _Escenario(db_session)


def _payload_alta(**overrides) -> dict:
    payload = {
        "documento": "3000001",
        "nombre": "Dra. Nueva",
        "email": "nueva@hospital.com",
        "telefono": "0981123456",
        "especialidad_ids": [],
    }
    payload.update(overrides)
    return payload


# ============================================================
# ALTA
# ============================================================

def test_coordinador_crea_medico_y_se_asocia_a_su_hospital(client, db_session, esc):
    """El alta no recibe hospital: se deriva del coordinador y se asocia sola."""
    respuesta = client.post(
        "/coordinadores/me/medicos",
        json=_payload_alta(especialidad_ids=[esc.cardio.id, esc.pediatria.id]),
        headers=_auth(client, esc.coord_a.email),
    )

    assert respuesta.status_code == 201, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["medico"]["rol"] == "medico"
    assert {e["id"] for e in cuerpo["medico"]["especialidades"]} == {esc.cardio.id, esc.pediatria.id}

    creado = db_session.query(Medico).filter(Medico.email == "nueva@hospital.com").first()
    assert creado is not None
    assert creado.debe_cambiar_password is True, "debe cambiar la contraseña temporal al ingresar"
    assert creado.email_verificado is True, "las altas administrativas quedan verificadas"
    assert creado.rol == RolEnum.medico
    assert [h.id for h in creado.hospitales] == [esc.hospital_a.id]


def test_el_medico_creado_aparece_en_la_lista_del_coordinador(client, esc):
    headers_a = _auth(client, esc.coord_a.email)
    client.post("/coordinadores/me/medicos", json=_payload_alta(), headers=headers_a)

    lista_a = client.get("/coordinadores/me/medicos", headers=headers_a)
    lista_b = client.get("/coordinadores/me/medicos",
                         headers=_auth(client, esc.coord_b.email))

    assert lista_a.status_code == 200, lista_a.text
    emails_a = {m["email"] for m in lista_a.json()}
    emails_b = {m["email"] for m in lista_b.json()}
    assert "nueva@hospital.com" in emails_a
    assert "nueva@hospital.com" not in emails_b


def test_el_alta_normaliza_el_email(client, db_session, esc):
    respuesta = client.post(
        "/coordinadores/me/medicos",
        json=_payload_alta(email="  Nueva@Hospital.COM  "),
        headers=_auth(client, esc.coord_a.email),
    )

    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json()["medico"]["email"] == "nueva@hospital.com"


def test_el_hospital_y_la_password_no_se_toman_del_request(client, db_session, esc):
    """
    Anti-IDOR / anti mass-assignment: aunque el cliente mande hospital_ids, password o
    rol, el schema no los declara y se descartan.
    """
    payload = _payload_alta()
    payload.update({
        "hospital_ids": [esc.hospital_b.id],
        "password": "hackeada",
        "rol": "admin",
        "debe_cambiar_password": False,
    })

    respuesta = client.post("/coordinadores/me/medicos", json=payload,
                            headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 201, respuesta.text
    creado = db_session.query(Medico).filter(Medico.email == "nueva@hospital.com").first()
    assert [h.id for h in creado.hospitales] == [esc.hospital_a.id], "no se cuela el hospital ajeno"
    assert creado.rol == RolEnum.medico
    assert creado.debe_cambiar_password is True
    # La contraseña inyectada no sirve: la real es la temporal generada.
    login = client.post("/auth/login",
                        data={"username": "nueva@hospital.com", "password": "hackeada"})
    assert login.status_code == 401


def test_alta_sin_smtp_avisa_pero_no_pierde_al_medico(client, db_session, esc):
    """Si solo falla el envío, el médico ya está creado y se informa la advertencia."""
    respuesta = client.post("/coordinadores/me/medicos", json=_payload_alta(),
                            headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 201, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["correo_enviado"] is False
    assert "correo" in cuerpo["advertencia"].lower()
    assert db_session.query(Medico).filter(Medico.email == "nueva@hospital.com").first() is not None


def test_alta_envia_bienvenida_con_una_password_que_funciona(client, monkeypatch, esc):
    """El correo lleva la contraseña temporal real: con ella el médico puede entrar."""
    enviados = []
    monkeypatch.setattr(email_service, "enviar_bienvenida_medico",
                        lambda **kwargs: enviados.append(kwargs))

    respuesta = client.post("/coordinadores/me/medicos", json=_payload_alta(),
                            headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json()["correo_enviado"] is True
    assert respuesta.json()["advertencia"] is None

    assert len(enviados) == 1
    enviado = enviados[0]
    assert enviado["email"] == "nueva@hospital.com"
    assert enviado["hospital_nombre"] == esc.hospital_a.nombre
    assert len(enviado["password_temporal"]) == 8 and enviado["password_temporal"].isdigit()

    login = client.post("/auth/login", data={"username": "nueva@hospital.com",
                                             "password": enviado["password_temporal"]})
    assert login.status_code == 200, login.text


def test_alta_rechaza_email_de_otro_medico(client, esc):
    respuesta = client.post("/coordinadores/me/medicos",
                            json=_payload_alta(email=esc.medico_en_a.email),
                            headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 400, respuesta.text
    assert respuesta.json()["detail"] == "El email ya está registrado"


def test_alta_rechaza_email_de_un_paciente(client, db_session, esc):
    """`email_en_uso` también mira la tabla de pacientes: el email es la credencial."""
    _crear_paciente(db_session, email="ocupado@hospital.com", documento="9000001")

    respuesta = client.post("/coordinadores/me/medicos",
                            json=_payload_alta(email="ocupado@hospital.com"),
                            headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 400, respuesta.text
    assert respuesta.json()["detail"] == "El email ya está registrado"


def test_alta_rechaza_documento_duplicado(client, esc):
    respuesta = client.post("/coordinadores/me/medicos",
                            json=_payload_alta(documento=esc.medico_en_a.documento),
                            headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 400, respuesta.text
    assert respuesta.json()["detail"] == "El documento de identidad ya está registrado"


@pytest.mark.parametrize("caso", ["inexistente", "inactiva"])
def test_alta_rechaza_especialidad_invalida_sin_crear_nada(client, db_session, esc, caso):
    esp_id = 999999 if caso == "inexistente" else esc.inactiva.id
    antes = db_session.query(Medico).count()

    respuesta = client.post("/coordinadores/me/medicos",
                            json=_payload_alta(especialidad_ids=[esp_id]),
                            headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 400, respuesta.text
    assert "no encontrada o inactiva" in respuesta.json()["detail"]
    assert db_session.query(Medico).count() == antes, "no debe quedar un médico a medio crear"


def test_alta_rechaza_nombre_vacio(client, esc):
    respuesta = client.post("/coordinadores/me/medicos", json=_payload_alta(nombre="   "),
                            headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 400, respuesta.text
    assert respuesta.json()["detail"] == "El nombre es obligatorio"


# ============================================================
# EDICIÓN
# ============================================================

def test_coordinador_edita_medico_de_su_hospital(client, db_session, esc):
    respuesta = client.put(
        f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
        json={
            "nombre": "Dra. Editada",
            "documento": "2000999",
            "email": "Editada@Hospital.COM",
            "telefono": "0982777777",
        },
        headers=_auth(client, esc.coord_a.email),
    )

    assert respuesta.status_code == 200, respuesta.text
    db_session.expire_all()
    editado = db_session.query(Medico).filter(Medico.id == esc.medico_en_a.id).first()
    assert editado.nombre == "Dra. Editada"
    assert editado.documento == "2000999"
    assert editado.email == "editada@hospital.com", "el email se guarda normalizado"
    assert editado.telefono == "0982777777"


def test_la_edicion_reemplaza_las_especialidades(client, db_session, esc):
    respuesta = client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                           json={"especialidad_ids": [esc.pediatria.id]},
                           headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 200, respuesta.text
    assert [e["id"] for e in respuesta.json()["especialidades"]] == [esc.pediatria.id]


def test_la_edicion_puede_limpiar_las_especialidades(client, esc):
    respuesta = client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                           json={"especialidad_ids": []},
                           headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["especialidades"] == []


@pytest.mark.parametrize("email_tipeado", ["med.a@hospital.com", "MED.A@Hospital.com"])
def test_la_edicion_permite_conservar_el_propio_email(client, esc, email_tipeado):
    """Regresión de `excluir_medico_id`: el médico no colisiona consigo mismo."""
    respuesta = client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                           json={"email": email_tipeado, "nombre": "Sigue Igual"},
                           headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 200, respuesta.text


def test_la_edicion_permite_conservar_el_propio_documento(client, esc):
    respuesta = client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                           json={"documento": esc.medico_en_a.documento},
                           headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 200, respuesta.text


def test_la_edicion_rechaza_el_email_de_otro_medico(client, esc):
    respuesta = client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                           json={"email": esc.medico_en_b.email},
                           headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 400, respuesta.text
    assert respuesta.json()["detail"] == "El email ya está registrado"


def test_la_edicion_rechaza_el_email_de_un_paciente(client, db_session, esc):
    _crear_paciente(db_session, email="ocupado@hospital.com", documento="9000002")

    respuesta = client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                           json={"email": "ocupado@hospital.com"},
                           headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 400, respuesta.text


def test_la_edicion_rechaza_el_documento_de_otro_medico(client, esc):
    respuesta = client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                           json={"documento": esc.medico_en_b.documento},
                           headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 400, respuesta.text
    assert respuesta.json()["detail"] == "El documento de identidad ya está registrado"


def test_la_edicion_permite_borrar_el_telefono(client, db_session, esc):
    """Un teléfono vaciado en el formulario queda NULL, no como cadena vacía."""
    esc.medico_en_a.telefono = "0981123456"
    db_session.commit()

    respuesta = client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                           json={"telefono": "   "},
                           headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 200, respuesta.text
    db_session.expire_all()
    editado = db_session.query(Medico).filter(Medico.id == esc.medico_en_a.id).first()
    assert editado.telefono is None


@pytest.mark.parametrize("campo,valor", [("nombre", "  "), ("documento", "  ")])
def test_la_edicion_rechaza_campos_obligatorios_vacios(client, esc, campo, valor):
    respuesta = client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                           json={campo: valor},
                           headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 400, respuesta.text


def test_la_edicion_no_puede_cambiar_rol_password_ni_hospital(client, db_session, esc):
    respuesta = client.put(
        f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
        json={
            "nombre": "Dra. Editada",
            "rol": "admin",
            "password": "hackeada",
            "hashed_password": "x",
            "debe_cambiar_password": True,
            "hospital_ids": [esc.hospital_b.id],
        },
        headers=_auth(client, esc.coord_a.email),
    )

    assert respuesta.status_code == 200, respuesta.text
    db_session.expire_all()
    editado = db_session.query(Medico).filter(Medico.id == esc.medico_en_a.id).first()
    assert editado.nombre == "Dra. Editada", "el campo permitido sí se aplica"
    assert editado.rol == RolEnum.medico
    assert editado.debe_cambiar_password is False
    assert [h.id for h in editado.hospitales] == [esc.hospital_a.id]
    # La contraseña original sigue siendo la válida.
    assert client.post("/auth/login",
                       data={"username": editado.email, "password": PASSWORD}).status_code == 200


# ============================================================
# AISLAMIENTO ENTRE HOSPITALES (anti-IDOR)
# ============================================================

def test_coordinador_no_puede_leer_medico_de_otro_hospital(client, esc):
    respuesta = client.get(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                           headers=_auth(client, esc.coord_b.email))

    assert respuesta.status_code == 403, respuesta.text
    assert respuesta.json()["detail"] == "Este médico no pertenece a tu hospital"


def test_coordinador_no_puede_editar_medico_de_otro_hospital(client, db_session, esc):
    nombre_original = esc.medico_en_a.nombre

    respuesta = client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                           json={"nombre": "Intruso"},
                           headers=_auth(client, esc.coord_b.email))

    assert respuesta.status_code == 403, respuesta.text
    db_session.expire_all()
    sin_tocar = db_session.query(Medico).filter(Medico.id == esc.medico_en_a.id).first()
    assert sin_tocar.nombre == nombre_original, "no debe haber escritura parcial antes del guard"


def test_medico_sin_hospital_no_es_visible_ni_editable(client, esc):
    headers = _auth(client, esc.coord_a.email)

    assert client.get(f"/coordinadores/me/medicos/{esc.medico_sin_hospital.id}",
                      headers=headers).status_code == 403
    assert client.put(f"/coordinadores/me/medicos/{esc.medico_sin_hospital.id}",
                      json={"nombre": "X"}, headers=headers).status_code == 403


def test_medico_inexistente_da_404(client, esc):
    respuesta = client.get("/coordinadores/me/medicos/999999",
                           headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 404, respuesta.text
    assert respuesta.json()["detail"] == "Médico no encontrado"


# ============================================================
# AUTORIZACIÓN
# ============================================================

def test_un_medico_no_puede_usar_los_endpoints_del_coordinador(client, esc):
    headers = _auth(client, esc.medico_en_a.email)

    assert client.post("/coordinadores/me/medicos", json=_payload_alta(),
                       headers=headers).status_code == 403
    assert client.get(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                      headers=headers).status_code == 403
    assert client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}", json={"nombre": "X"},
                      headers=headers).status_code == 403


def test_sin_token_da_401(client, esc):
    assert client.post("/coordinadores/me/medicos", json=_payload_alta()).status_code == 401
    assert client.get(f"/coordinadores/me/medicos/{esc.medico_en_a.id}").status_code == 401
    assert client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                      json={"nombre": "X"}).status_code == 401


def test_coordinador_sin_hospital_recibe_400(client, esc):
    headers = _auth(client, esc.coord_sin_hospital.email)

    for respuesta in (
        client.post("/coordinadores/me/medicos", json=_payload_alta(), headers=headers),
        client.get(f"/coordinadores/me/medicos/{esc.medico_en_a.id}", headers=headers),
        client.put(f"/coordinadores/me/medicos/{esc.medico_en_a.id}",
                   json={"nombre": "X"}, headers=headers),
    ):
        assert respuesta.status_code == 400, respuesta.text
        assert respuesta.json()["detail"] == "No tienes un hospital asignado. Contacta al administrador."


# ============================================================
# NO-REGRESIÓN DE LO EXISTENTE
# ============================================================

def test_el_medico_sigue_editando_su_propio_perfil(client, db_session, esc):
    """El autoservicio (`PUT /medicos/{id}`) no se tocó: sigue funcionando."""
    respuesta = client.put(
        f"/medicos/{esc.medico_en_a.id}",
        json={"nombre": "Auto Editado", "telefono": "0983111111",
              "especialidad_ids": [esc.pediatria.id]},
        headers=_auth(client, esc.medico_en_a.email),
    )

    assert respuesta.status_code == 200, respuesta.text
    db_session.expire_all()
    editado = db_session.query(Medico).filter(Medico.id == esc.medico_en_a.id).first()
    assert editado.nombre == "Auto Editado"


def test_get_coordinadores_me_devuelve_el_perfil(client, esc):
    """
    Regresión del orden de rutas: `/coordinadores/me` caía en `/{coordinador_id}` y
    devolvía 422 al intentar parsear "me" como int.
    """
    respuesta = client.get("/coordinadores/me", headers=_auth(client, esc.coord_a.email))

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["email"] == esc.coord_a.email


def test_asignar_y_remover_medico_del_hospital_siguen_funcionando(client, db_session, esc):
    """Asignar/remover siguen siendo el camino para vincular un médico que ya existe."""
    headers = _auth(client, esc.coord_a.email)

    asignar = client.post("/asignaciones/medico-hospital",
                          json={"medico_id": esc.medico_sin_hospital.id,
                                "hospital_id": esc.hospital_a.id},
                          headers=headers)
    assert asignar.status_code in (200, 201), asignar.text

    remover = client.request("DELETE", "/asignaciones/medico-hospital",
                             json={"medico_id": esc.medico_sin_hospital.id,
                                   "hospital_id": esc.hospital_a.id},
                             headers=headers)
    assert remover.status_code == 200, remover.text

    db_session.expire_all()
    medico = db_session.query(Medico).filter(Medico.id == esc.medico_sin_hospital.id).first()
    assert medico is not None, "remover desasocia, no elimina la cuenta"
    assert medico.hospitales == []


def test_la_importacion_masiva_sigue_exigiendo_hospital(client, esc):
    """
    Regresión del refactor: `importacion_medicos` ahora usa el helper compartido
    `obtener_coordinador_con_hospital` y debe conservar el mismo mensaje.
    """
    plantilla = client.get("/importacion-medicos/plantilla",
                           headers=_auth(client, esc.coord_a.email))
    assert plantilla.status_code == 200, plantilla.text

    respuesta = client.post(
        "/importacion-medicos/importar",
        files={"file": ("medicos.xlsx", b"no-importa", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=_auth(client, esc.coord_sin_hospital.email),
    )
    assert respuesta.status_code == 400, respuesta.text
    assert respuesta.json()["detail"] == "No tienes un hospital asignado. Contacta al administrador."
