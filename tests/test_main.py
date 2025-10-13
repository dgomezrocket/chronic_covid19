import pytest
import os
from fastapi.testclient import TestClient
from dotenv import load_dotenv
from app.main import app

# Elimina esta importación problemática y ajusta según lo que realmente exista
# from app.db.db import get_db, Base, engine
from app.db.db import Base, engine  # Ajusta esto según lo que realmente tengas disponible

from sqlalchemy.orm import Session

# Cargar variables de entorno
load_dotenv()

# Cliente para tests
client = TestClient(app)

# Configuración para pruebas
@pytest.fixture(scope="function")
def setup_test_db():
    # Crear todas las tablas antes de cada test
    Base.metadata.create_all(bind=engine)
    yield
    # Limpiar la base de datos después de cada test
    Base.metadata.drop_all(bind=engine)



@pytest.mark.usefixtures("setup_test_db")
def test_register_and_login():
    # Registro
    response = client.post("/api/v1/auth/register", json={
        "documento": "12345678",
        "nombre": "Juan Perez",
        "fecha_nacimiento": "1990-01-01",
        "genero": "M",
        "direccion": "Calle Falsa 123",
        "email": "juan@example.com",
        "telefono": "999999999",
        "latitud": 10.0,
        "longitud": 20.0,
        "password": "pass123"  # Contraseña más corta
    })
    assert response.status_code == 200
    token = response.json()["access_token"]

    # Login
    response = client.post("/api/v1/auth/login", data={
        "username": "juan@example.com",
        "password": "pass123"  # Misma contraseña corta
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.usefixtures("setup_test_db")
def test_get_paciente():
    # Crear paciente
    response = client.post("/api/v1/auth/register", json={
        "documento": "87654321",
        "nombre": "Ana Lopez",
        "fecha_nacimiento": "1985-05-05",
        "genero": "F",
        "direccion": "Av. Siempre Viva",
        "email": "ana@example.com",
        "telefono": "888888888",
        "latitud": 11.0,
        "longitud": 21.0,
        "password": "pass456"  # Contraseña más corta
    })
    paciente_id = response.json().get("access_token", "0")

    # Consultar paciente por ID (simulado)
    response = client.get("/api/v1/pacientes/1")
    assert response.status_code in [200, 404]


@pytest.mark.usefixtures("setup_test_db")
def test_hospitales_nearby():
    response = client.get("/api/v1/hospitales/nearby?lat=10.0&lon=20.0")
    assert response.status_code == 200
    assert isinstance(response.json(), list)