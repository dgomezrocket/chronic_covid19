# Chronic COVID-19 Monitoring System

## Project Overview

This application is a healthcare management system designed to monitor patients with chronic conditions after COVID-19 infection. It provides a platform for:

- Patient registration and management
- Doctor-patient assignments
- Hospital management
- Dynamic health questionnaires and form submissions
- Secure messaging between patients and medical staff
- Location-based services for patients and hospitals

## System Requirements

- Python 3.11 or higher
- PostgreSQL 15
- Redis 7

## Installation

### Using Docker (Recommended)

1. Make sure you have Docker and Docker Compose installed on your system.

2. Clone the repository:
   ```
   git clone <repository-url>
   cd chronic_covid19
   ```

3. Create a `.env` file in the root directory based on the provided `.env.example`:
   ```
   # Copy the example file
   cp .env.example .env

   # Edit the file to adjust settings as needed
   # For Docker, use POSTGRES_SERVER=db and REDIS_URL=redis://redis:6379/0
   ```

4. Start the application:
   ```
   docker-compose up -d
   ```

5. The API will be available at http://localhost:8000

### Manual Installation

1. Make sure you have Python 3.11+ installed.

2. Clone the repository:
   ```
   git clone <repository-url>
   cd chronic_covid19
   ```

3. Create and activate a virtual environment:
   ```
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On Linux/Mac
   source venv/bin/activate
   ```

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Set up PostgreSQL and Redis services.

6. Create a `.env` file based on the provided `.env.example`:
   ```
   # Copy the example file
   cp .env.example .env

   # Edit the file to adjust settings as needed
   # For local development, use POSTGRES_SERVER=localhost and REDIS_URL=redis://localhost:6379/0
   ```

7. Run database migrations:
   ```
   alembic upgrade head
   ```

8. Start the application:
   ```
   uvicorn app.main:app --reload
   ```

9. The API will be available at http://localhost:8000

## API Documentation

Once the application is running, you can access the interactive API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Main API Endpoints

- **Authentication**
  - POST `/api/v1/auth/register` - Register a new patient
  - POST `/api/v1/auth/login` - Login and get access token

- **Patients**
  - GET `/api/v1/pacientes/{id}` - Get patient details
  - PUT `/api/v1/pacientes/{id}` - Update patient information
  - GET `/api/v1/pacientes/{id}/formularios` - Get patient's form responses
  - POST `/api/v1/pacientes/{id}/formularios` - Submit a form response

- **Doctors**
  - Various endpoints for doctor management

- **Hospitals**
  - Various endpoints for hospital management

- **Forms**
  - Various endpoints for form management

- **Messages**
  - Various endpoints for messaging between users

## Development

### Database Migrations

The project uses Alembic for database migrations:

1. Create a new migration:
   ```
   alembic revision --autogenerate -m "Description of changes"
   ```

2. Apply migrations:
   ```
   alembic upgrade head
   ```

### Running Tests

Run the test suite with:
```
pytest
```

## Security

- The API uses JWT tokens for authentication
- Passwords are securely hashed
- Role-based access control is implemented

## License

[Specify the license here]

## Instrucciones en Español

### Descripción del Proyecto

Este sistema es una aplicación de gestión sanitaria diseñada para monitorear pacientes con condiciones crónicas después de una infección por COVID-19. La plataforma permite:

- Registro y gestión de pacientes
- Asignación de médicos a pacientes
- Gestión de hospitales
- Cuestionarios de salud dinámicos
- Mensajería segura entre pacientes y personal médico
- Servicios basados en ubicación para pacientes y hospitales

### Instalación con Docker (Recomendado)

1. Asegúrese de tener Docker y Docker Compose instalados en su sistema.

2. Clone el repositorio:
   ```
   git clone <url-del-repositorio>
   cd chronic_covid19
   ```

3. Cree un archivo `.env` basado en el archivo `.env.example` proporcionado:
   ```
   # Copie el archivo de ejemplo
   cp .env.example .env

   # Edite el archivo para ajustar la configuración según sea necesario
   # Para Docker, use POSTGRES_SERVER=db y REDIS_URL=redis://redis:6379/0
   ```

4. Inicie la aplicación:
   ```
   docker-compose up -d
   ```

5. La API estará disponible en http://localhost:8000

### Documentación de la API

Una vez que la aplicación esté en funcionamiento, puede acceder a la documentación interactiva de la API en:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
