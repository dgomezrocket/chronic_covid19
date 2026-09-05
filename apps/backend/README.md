# Backend · Sistema de Monitoreo para Pacientes con COVID-19 Crónico

> 📖 Este README cubre **sólo el backend** (`apps/backend`). La documentación completa del
> monorepo —arquitectura, roles, funcionalidades, tablas de endpoints con sus permisos y
> despliegue— está en el [README de la raíz](../../README.md).

## Descripción General del Proyecto

Esta aplicación es un sistema de gestión sanitaria diseñado para monitorear pacientes con condiciones crónicas después de una infección por COVID-19. Proporciona una plataforma para:

- Registro y gestión de pacientes
- Asignación de médicos a pacientes
- Gestión de hospitales y de los médicos de cada hospital
- Cuestionarios de salud dinámicos, asignación con fecha de vencimiento y envío idempotente de respuestas
- Mensajería segura entre pacientes y personal médico
- Servicios basados en ubicación para pacientes y hospitales

## Tecnologías Utilizadas

- **FastAPI**: Framework moderno y de alto rendimiento para APIs en Python
- **SQLAlchemy**: ORM para interacción con la base de datos
- **Alembic**: Gestión de migraciones de base de datos
- **PostgreSQL**: Sistema de gestión de base de datos relacional
- **openpyxl**: Importación y exportación en Excel (médicos y hospitales)
- **WebSockets** (Starlette): Chat en tiempo real
- **JWT**: Para autenticación segura de usuarios
- **Pydantic**: Validación de datos y configuraciones
- **Pytest**: Framework para pruebas automatizadas

## Requisitos del Sistema

- Python 3.11 o superior
- PostgreSQL 15
- Redis 7 *(opcional: previsto en `docker-compose.yml` y en `REDIS_URL`, pero hoy ningún módulo lo usa)*

## Instalación

### Instalación Manual

1. Asegúrese de tener Python 3.11+ instalado.

2. Clone el repositorio:
   ```
   git clone <url-del-repositorio>
   cd chronic_covid19
   ```

3. Cree y active un entorno virtual:
   ```
   python -m venv venv
   # En Windows
   venv\Scripts\activate
   # En Linux/Mac
   source venv/bin/activate
   ```

4. Instale las dependencias:
   ```
   pip install -r requirements.txt
   ```

5. Configure PostgreSQL:
   - Cree una nueva base de datos
   - Asegúrese de tener un usuario con permisos adecuados

6. Cree un archivo `.env` basado en el archivo `.env.example` proporcionado:
   ```
   # Copie el archivo de ejemplo
   cp .env.example .env

   # Edite el archivo para ajustar la configuración según sea necesario
   # Para desarrollo local, use POSTGRES_SERVER=localhost
   ```

7. Ejecute las migraciones de la base de datos:
   ```
   alembic upgrade head
   ```

8. Cree el primer administrador (interactivo):
   ```
   python -m app.scripts.create_first_admin
   ```

9. Inicie la aplicación:
   ```
   uvicorn app.main:app --reload
   ```

10. La API estará disponible en http://localhost:8000

## Documentación de la API

Una vez que la aplicación esté en funcionamiento, puede acceder a la documentación interactiva de la API en:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Endpoints de la API

> ⚠️ **No hay prefijo `/api/v1`.** Los routers se montan directamente bajo su prefijo en
> `app/main.py`. La constante `API_V1_STR` existe en `app/core/config.py` pero **no se usa**
> para montar nada.

Prefijos montados actualmente:

| Prefijo | Router | Contenido |
|---------|--------|-----------|
| `/auth` | `auth.py` | Registro, login, recuperación de contraseña, verificación de email, cambio de contraseña |
| `/pacientes` | `pacientes.py` | Perfil del paciente y sus respuestas de formularios |
| `/medicos` | `medicos.py` | Listado y perfil de médicos |
| `/especialidades` | `especialidades.py` | Catálogo de especialidades (CRUD de admin) |
| `/hospitales` | `hospitales.py` | CRUD, cercanía geográfica, importación/exportación en Excel |
| `/formularios` | `formularios.py` | Formularios dinámicos, asignaciones, respuestas y listado consolidado |
| `/mensajes` | `mensajes.py` | Chat REST + WebSocket con ticket JWT |
| `/admins` | `admins.py` | CRUD de administradores e invitaciones por correo |
| `/coordinadores` | `coordinadores.py` | Perfil, dashboard del hospital y gestión de sus médicos |
| `/asignaciones` | `asignaciones.py` | Vínculos médico↔hospital, paciente↔hospital y médico↔paciente |
| `/importacion-medicos` | `importacion_medicos.py` | Plantilla, importación y exportación de médicos en `.xlsx` |

Más `GET /` (información de la API) y `GET /health` (health check).

**La fuente de verdad del detalle** —métodos, parámetros, esquemas y permisos por rol— es
Swagger en `/docs`. El [README de la raíz](../../README.md#-api-endpoints) mantiene además
tablas de todos los endpoints con la autorización requerida de cada uno.

## Desarrollo

### Migraciones de Base de Datos

El proyecto utiliza Alembic para las migraciones de base de datos:

1. Crear una nueva migración:
   ```
   alembic revision --autogenerate -m "Descripción de los cambios"
   ```

2. Aplicar migraciones:
   ```
   alembic upgrade head
   ```

El *head* actual es `c2d3e4f5a6b7` (constraint única de idempotencia en
`respuestas_formularios`). Hay una sola cabeza: si `alembic heads` devuelve más de una,
alguien creó una revisión sin encadenarla.

> ⚠️ El `Dockerfile` ejecuta `alembic upgrade head` **al arrancar el contenedor**. Una
> migración que falla en producción no se limita a no aplicarse: deja el servicio de Railway
> en *crash-loop*. Por eso las migraciones de datos de este proyecto son idempotentes y, si
> detectan un estado que no pueden resolver solas, abortan sin escribir nada en lugar de
> romper a mitad de camino.

### Ejecución de Pruebas

```
cd apps/backend
pytest
```

Son 102 tests repartidos en cinco suites:

| Suite | Tests | Qué cubre |
|-------|-------|-----------|
| `tests/test_coordinador_medicos.py` | 36 | Alta y edición de médicos por el coordinador: duplicados de email/documento, permisos y aislamiento entre hospitales |
| `tests/test_formularios_vencimiento.py` | 22 | Estado derivado `expirado`, guardas al responder (ajena, vencida, ya respondida) e idempotencia |
| `tests/test_auth_email_normalizacion.py` | 13 | Registro, login y recuperación de contraseña sin distinguir mayúsculas |
| `tests/test_pacientes_acceso.py` | 22 | Alcance de `/pacientes` por rol: propio, médico tratante, coordinador del hospital y admin |
| `tests/test_main.py` | 9 | Smoke: `/` y `/health`, y el camino público completo registro → verificación → login → perfil |

Todas corren sobre **SQLite en memoria** sobreescribiendo `get_db`, así que no hace falta
tener PostgreSQL levantado. `tests/conftest.py` construye igualmente la `DATABASE_URL` desde
el `.env` (saneando el BOM si lo hubiera) para los casos que sí la necesiten.

## Estructura del Proyecto

```
apps/backend/
├── alembic/              # Configuración y migraciones de la base de datos
├── app/
│   ├── core/             # Configuración, seguridad (JWT) y dependencias/guards de rol
│   ├── db/               # Engine y sesión de SQLAlchemy (pool_pre_ping + pool_recycle)
│   ├── models/           # Modelos SQLAlchemy
│   ├── routers/          # Endpoints de la API organizados por dominio
│   ├── schemas/          # Esquemas Pydantic para validación
│   ├── services/         # Lógica de negocio (coordinador, médico, email)
│   ├── utils/            # Reglas compartidas (vencimiento de asignaciones)
│   ├── scripts/          # Utilidades de consola (create_first_admin)
│   └── main.py           # Punto de entrada: app FastAPI, routers y CORS
├── tests/                # Pruebas con Pytest
├── .env                  # Variables de entorno (no incluir en git)
├── .env.example          # Ejemplo de variables de entorno
├── Dockerfile            # Imagen de producción (corre las migraciones al arrancar)
├── docker-compose.yml    # Backend + PostgreSQL + Redis para desarrollo
└── requirements.txt      # Dependencias del proyecto
```

## Seguridad

- La API utiliza tokens JWT para autenticación (OAuth2 password flow); el chat WebSocket usa
  un ticket JWT de corta duración emitido por `POST /mensajes/ws-token`.
- Las contraseñas se almacenan con hash **bcrypt** (passlib).
- Se implementa control de acceso basado en roles, aplicado en el backend y no sólo en la UI.
- Los tokens de recuperación de contraseña, verificación de email e invitación de
  administrador se guardan **sólo hasheados** (SHA-256), son de un solo uso y expiran.
- Los identificadores de alcance (hospital del coordinador, pacientes del médico) se derivan
  **siempre del token**, nunca de parámetros del cliente, para evitar IDOR.
- Los logs no registran nunca el contenido de las respuestas de formularios: son datos
  médicos del paciente.

## Contribuciones

Si desea contribuir a este proyecto, por favor:
1. Haga un fork del repositorio
2. Cree una rama para su nueva función
3. Añada sus cambios y pruebas
4. Envíe un pull request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT con requisito de atribución.

Copyright (c) 2026 Derlis Gómez

Se concede permiso, de forma gratuita, a cualquier persona que obtenga una copia de este software y los archivos de documentación asociados, para utilizar el Software sin restricciones, incluyendo, sin limitación, los derechos de uso, copia, modificación, fusión, publicación, distribución, sublicencia y/o venta de copias del Software, y para permitir a las personas a las que se les proporcione el Software que lo hagan, sujeto a las siguientes condiciones:

El aviso de copyright anterior y este aviso de permiso se incluirán en todas las copias o partes sustanciales del Software.

Además, cualquier proyecto, producto o servicio que utilice este código debe incluir una atribución visible al autor original, Derlis Gómez, mencionando el nombre del proyecto original "Sistema de Monitoreo para Pacientes con COVID-19 Crónico".

EL SOFTWARE SE PROPORCIONA "TAL CUAL", SIN GARANTÍA DE NINGÚN TIPO, EXPRESA O IMPLÍCITA, INCLUYENDO PERO NO LIMITADO A GARANTÍAS DE COMERCIALIZACIÓN, IDONEIDAD PARA UN PROPÓSITO PARTICULAR Y NO INFRACCIÓN. EN NINGÚN CASO LOS AUTORES O TITULARES DEL COPYRIGHT SERÁN RESPONSABLES DE NINGUNA RECLAMACIÓN, DAÑOS U OTRAS RESPONSABILIDADES, YA SEA EN UNA ACCIÓN DE CONTRATO, AGRAVIO O CUALQUIER OTRO MOTIVO, QUE SURJA DE O EN CONEXIÓN CON EL SOFTWARE O EL USO U OTRO TIPO DE ACCIONES EN EL SOFTWARE.

## Contacto

Para preguntas o soporte, contacte a derlisrgomez@gmail.com
