# python
import pytest
import os
from pathlib import Path
from dotenv import load_dotenv

# 1. Configurar variables de entorno ANTES de cargar .env
os.environ["PGCLIENTENCODING"] = "UTF8"
os.environ["PGSYSCONFDIR"] = ""
os.environ["PGSERVICEFILE"] = ""
os.environ["PGPASSFILE"] = ""

# 2. Cargar .env
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=ROOT / ".env")

# 3. Inicializar el engine ANTES de importar app.main
from apps.backend.app.db import db

db.init_engine(force=True)  # force=True para asegurar que se ejecute

# 4. Ahora sí importar la app
from fastapi.testclient import TestClient
from apps.backend.app.main import app
from apps.backend.app.db import Base, engine

# 5. Crear cliente de tests
client = TestClient(app)


@pytest.fixture(scope="function")
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.mark.usefixtures("setup_test_db")
def test_register_and_login():
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
        "password": "pass123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.usefixtures("setup_test_db")
def test_get_paciente():
    # Primero registrar
    register_response = client.post("/api/v1/auth/register", json={
        "documento": "87654321",
        "nombre": "Maria Lopez",
        "fecha_nacimiento": "1985-05-15",
        "genero": "F",
        "direccion": "Av Principal 456",
        "email": "maria@example.com",
        "telefono": "888888888",
        "latitud": 15.0,
        "longitud": 25.0,
        "password": "pass456"
    })
    # Capturar el ID del paciente creado desde el token
    assert register_response.status_code == 200

    # Login para obtener token
    login_response = client.post("/api/v1/auth/login", data={
        "username": "maria@example.com",
        "password": "pass456"
    })
    token = login_response.json()["access_token"]
    
    # Decodificar el ID del token (el token contiene el ID en el campo 'sub')
    # O simplemente asumir que el primer paciente tiene ID=1 en tests
    # Para simplificar, asumimos que es el primer registro, por lo tanto ID=1
    paciente_id = 1

    # Obtener perfil usando el ID, no el documento
    response = client.get(f"/api/v1/pacientes/{paciente_id}", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "maria@example.com"
    assert data["documento"] == "87654321"


@pytest.mark.usefixtures("setup_test_db")
def test_hospitales_nearby():
    # Corregir los nombres de los parámetros: lat, lon, radio (no latitud, longitud, radio_km)
    response = client.get("/api/v1/hospitales/nearby?lat=-12.0&lon=-77.0&radio=5.0")
    assert response.status_code == 200
    # Debería devolver una lista vacía si no hay hospitales, pero no debe fallar
    data = response.json()
    assert isinstance(data, list)
