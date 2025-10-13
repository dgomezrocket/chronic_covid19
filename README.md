# Sistema de Monitoreo para Pacientes con COVID-19 Crónico

## Descripción General del Proyecto

Esta aplicación es un sistema de gestión sanitaria diseñado para monitorear pacientes con condiciones crónicas después de una infección por COVID-19. Proporciona una plataforma para:

- Registro y gestión de pacientes
- Asignación de médicos a pacientes
- Gestión de hospitales
- Cuestionarios de salud dinámicos y envío de formularios
- Mensajería segura entre pacientes y personal médico
- Servicios basados en ubicación para pacientes y hospitales

## Tecnologías Utilizadas

- **FastAPI**: Framework moderno y de alto rendimiento para APIs en Python
- **SQLAlchemy**: ORM para interacción con la base de datos
- **Alembic**: Gestión de migraciones de base de datos
- **PostgreSQL**: Sistema de gestión de base de datos relacional
- **Redis**: Para almacenamiento en caché y gestión de sesiones
- **JWT**: Para autenticación segura de usuarios
- **Pydantic**: Validación de datos y configuraciones
- **Pytest**: Framework para pruebas automatizadas

## Requisitos del Sistema

- Python 3.11 o superior
- PostgreSQL 15
- Redis 7

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

6. Configure Redis:
   - Asegúrese de que el servidor Redis esté en funcionamiento

7. Cree un archivo `.env` basado en el archivo `.env.example` proporcionado:
   ```
   # Copie el archivo de ejemplo
   cp .env.example .env

   # Edite el archivo para ajustar la configuración según sea necesario
   # Para desarrollo local, use POSTGRES_SERVER=localhost y REDIS_URL=redis://localhost:6379/0
   ```

8. Ejecute las migraciones de la base de datos:
   ```
   alembic upgrade head
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

#### Autenticación

- **POST** `/api/v1/auth/register` - Registrar un nuevo usuario
  - Parámetros: email, password, nombre, apellido, tipo_usuario
  - Respuesta: datos del usuario y token de acceso

- **POST** `/api/v1/auth/login` - Iniciar sesión
  - Parámetros: email, password
  - Respuesta: token de acceso y token de actualización

- **POST** `/api/v1/auth/refresh` - Actualizar token
  - Parámetros: refresh_token
  - Respuesta: nuevo token de acceso

- **POST** `/api/v1/auth/logout` - Cerrar sesión
  - Parámetros: token
  - Respuesta: confirmación de cierre de sesión

- **POST** `/api/v1/auth/reset-password` - Solicitar restablecimiento de contraseña
  - Parámetros: email
  - Respuesta: confirmación de envío de correo

- **POST** `/api/v1/auth/reset-password/{token}` - Establecer nueva contraseña
  - Parámetros: token, new_password
  - Respuesta: confirmación de cambio de contraseña

#### Pacientes

- **GET** `/api/v1/pacientes` - Listar todos los pacientes (admin/médico)
  - Parámetros query: skip, limit, nombre, apellido, estado
  - Respuesta: lista de pacientes paginada

- **POST** `/api/v1/pacientes` - Crear un nuevo paciente (admin)
  - Parámetros: datos completos del paciente
  - Respuesta: datos del paciente creado

- **GET** `/api/v1/pacientes/{id}` - Obtener detalles de un paciente
  - Respuesta: datos completos del paciente

- **PUT** `/api/v1/pacientes/{id}` - Actualizar información de un paciente
  - Parámetros: campos a actualizar
  - Respuesta: datos actualizados del paciente

- **DELETE** `/api/v1/pacientes/{id}` - Eliminar un paciente (admin)
  - Respuesta: confirmación de eliminación

- **GET** `/api/v1/pacientes/{id}/historial-medico` - Obtener historial médico
  - Respuesta: historial médico completo del paciente

- **GET** `/api/v1/pacientes/{id}/formularios` - Listar formularios del paciente
  - Parámetros query: skip, limit, fecha_inicio, fecha_fin
  - Respuesta: lista de formularios completados

- **POST** `/api/v1/pacientes/{id}/formularios` - Enviar respuesta a formulario
  - Parámetros: id_formulario, respuestas
  - Respuesta: confirmación de envío

- **GET** `/api/v1/pacientes/{id}/medicos` - Listar médicos asignados
  - Respuesta: lista de médicos asignados al paciente

- **GET** `/api/v1/pacientes/cercanos` - Buscar pacientes por ubicación
  - Parámetros query: latitud, longitud, distancia_km
  - Respuesta: lista de pacientes cercanos

#### Médicos

- **GET** `/api/v1/medicos` - Listar todos los médicos
  - Parámetros query: skip, limit, especialidad, hospital
  - Respuesta: lista de médicos paginada

- **POST** `/api/v1/medicos` - Registrar un nuevo médico (admin)
  - Parámetros: datos completos del médico
  - Respuesta: datos del médico creado

- **GET** `/api/v1/medicos/{id}` - Obtener detalles de un médico
  - Respuesta: datos completos del médico

- **PUT** `/api/v1/medicos/{id}` - Actualizar información de un médico
  - Parámetros: campos a actualizar
  - Respuesta: datos actualizados del médico

- **DELETE** `/api/v1/medicos/{id}` - Eliminar un médico (admin)
  - Respuesta: confirmación de eliminación

- **GET** `/api/v1/medicos/{id}/pacientes` - Listar pacientes asignados
  - Parámetros query: skip, limit, estado
  - Respuesta: lista de pacientes asignados al médico

- **POST** `/api/v1/medicos/{id}/pacientes` - Asignar paciente a médico
  - Parámetros: id_paciente
  - Respuesta: confirmación de asignación

- **DELETE** `/api/v1/medicos/{id}/pacientes/{id_paciente}` - Desasignar paciente
  - Respuesta: confirmación de desasignación

- **GET** `/api/v1/medicos/especialidades` - Listar todas las especialidades
  - Respuesta: lista de especialidades médicas disponibles

- **GET** `/api/v1/medicos/cercanos` - Buscar médicos por ubicación
  - Parámetros query: latitud, longitud, distancia_km, especialidad
  - Respuesta: lista de médicos cercanos

#### Hospitales

- **GET** `/api/v1/hospitales` - Listar todos los hospitales
  - Parámetros query: skip, limit, nombre, ciudad, servicios
  - Respuesta: lista de hospitales paginada

- **POST** `/api/v1/hospitales` - Registrar un nuevo hospital (admin)
  - Parámetros: datos completos del hospital
  - Respuesta: datos del hospital creado

- **GET** `/api/v1/hospitales/{id}` - Obtener detalles de un hospital
  - Respuesta: datos completos del hospital

- **PUT** `/api/v1/hospitales/{id}` - Actualizar información de un hospital
  - Parámetros: campos a actualizar
  - Respuesta: datos actualizados del hospital

- **DELETE** `/api/v1/hospitales/{id}` - Eliminar un hospital (admin)
  - Respuesta: confirmación de eliminación

- **GET** `/api/v1/hospitales/{id}/medicos` - Listar médicos de un hospital
  - Parámetros query: skip, limit, especialidad
  - Respuesta: lista de médicos del hospital

- **GET** `/api/v1/hospitales/cercanos` - Buscar hospitales por ubicación
  - Parámetros query: latitud, longitud, distancia_km
  - Respuesta: lista de hospitales cercanos

- **GET** `/api/v1/hospitales/servicios` - Listar todos los servicios disponibles
  - Respuesta: lista de servicios hospitalarios disponibles

#### Formularios

- **GET** `/api/v1/formularios` - Listar todos los formularios
  - Parámetros query: skip, limit, categoria, activo
  - Respuesta: lista de formularios paginada

- **POST** `/api/v1/formularios` - Crear un nuevo formulario (admin/médico)
  - Parámetros: título, descripción, preguntas, categoría
  - Respuesta: datos del formulario creado

- **GET** `/api/v1/formularios/{id}` - Obtener detalles de un formulario
  - Respuesta: datos completos del formulario

- **PUT** `/api/v1/formularios/{id}` - Actualizar un formulario
  - Parámetros: campos a actualizar
  - Respuesta: datos actualizados del formulario

- **DELETE** `/api/v1/formularios/{id}` - Eliminar un formulario (admin)
  - Respuesta: confirmación de eliminación

- **GET** `/api/v1/formularios/{id}/respuestas` - Listar respuestas a un formulario
  - Parámetros query: skip, limit, fecha_inicio, fecha_fin
  - Respuesta: lista de respuestas al formulario

- **GET** `/api/v1/formularios/categorias` - Listar categorías de formularios
  - Respuesta: lista de categorías disponibles

- **POST** `/api/v1/formularios/asignar` - Asignar formulario a paciente(s)
  - Parámetros: id_formulario, id_pacientes, fecha_limite, recordatorio
  - Respuesta: confirmación de asignación

#### Mensajería

- **GET** `/api/v1/mensajes` - Obtener mensajes del usuario autenticado
  - Parámetros query: skip, limit, leido, remitente
  - Respuesta: lista de mensajes paginada

- **POST** `/api/v1/mensajes` - Enviar un nuevo mensaje
  - Parámetros: destinatario_id, asunto, contenido, archivos_adjuntos
  - Respuesta: confirmación de envío y datos del mensaje

- **GET** `/api/v1/mensajes/{id}` - Obtener detalles de un mensaje
  - Respuesta: datos completos del mensaje

- **PUT** `/api/v1/mensajes/{id}/leer` - Marcar mensaje como leído
  - Respuesta: estado actualizado del mensaje

- **DELETE** `/api/v1/mensajes/{id}` - Eliminar un mensaje
  - Respuesta: confirmación de eliminación

- **GET** `/api/v1/mensajes/conversacion/{id_usuario}` - Obtener conversación
  - Parámetros query: skip, limit
  - Respuesta: historial de mensajes con el usuario especificado

#### Estadísticas y Reportes

- **GET** `/api/v1/estadisticas/pacientes` - Estadísticas generales de pacientes
  - Parámetros query: periodo
  - Respuesta: datos estadísticos (total, nuevos, activos, etc.)

- **GET** `/api/v1/estadisticas/formularios` - Estadísticas de formularios
  - Parámetros query: id_formulario, periodo
  - Respuesta: datos estadísticos de formularios completados

- **GET** `/api/v1/estadisticas/medicos` - Estadísticas de médicos
  - Respuesta: datos estadísticos de actividad de médicos

- **GET** `/api/v1/reportes/pacientes` - Generar reporte de pacientes
  - Parámetros query: formato, filtros
  - Respuesta: archivo de reporte en formato solicitado

- **GET** `/api/v1/reportes/actividad-medica` - Reporte de actividad médica
  - Parámetros query: id_medico, fecha_inicio, fecha_fin, formato
  - Respuesta: archivo de reporte en formato solicitado

#### Notificaciones

- **GET** `/api/v1/notificaciones` - Obtener notificaciones del usuario
  - Parámetros query: skip, limit, leido
  - Respuesta: lista de notificaciones paginada

- **PUT** `/api/v1/notificaciones/{id}/leer` - Marcar notificación como leída
  - Respuesta: estado actualizado de la notificación

- **DELETE** `/api/v1/notificaciones/{id}` - Eliminar una notificación
  - Respuesta: confirmación de eliminación

- **GET** `/api/v1/notificaciones/configuracion` - Obtener config. de notificaciones
  - Respuesta: preferencias de notificaciones del usuario

- **PUT** `/api/v1/notificaciones/configuracion` - Actualizar config. de notificaciones
  - Parámetros: preferencias de notificaciones
  - Respuesta: preferencias actualizadas

#### Administración del Sistema

- **GET** `/api/v1/admin/usuarios` - Listar todos los usuarios (admin)
  - Parámetros query: skip, limit, tipo, activo
  - Respuesta: lista de usuarios paginada

- **PUT** `/api/v1/admin/usuarios/{id}/activar` - Activar/desactivar usuario
  - Parámetros: estado
  - Respuesta: estado actualizado del usuario

- **GET** `/api/v1/admin/actividad` - Registro de actividad del sistema
  - Parámetros query: skip, limit, tipo, usuario, fecha
  - Respuesta: registro de actividades paginado

- **GET** `/api/v1/admin/estadisticas-sistema` - Estadísticas del sistema
  - Respuesta: métricas generales del sistema

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

### Ejecución de Pruebas

Ejecute el conjunto de pruebas con:

```
pytest
```

## Estructura del Proyecto

```
chronic_covid19/
├── alembic/              # Configuración y migraciones de la base de datos
├── app/
│   ├── core/             # Configuraciones centrales y utilidades
│   ├── crud/             # Operaciones CRUD para modelos
│   ├── db/               # Configuración de la base de datos
│   ├── models/           # Modelos SQLAlchemy
│   ├── routers/          # Endpoints de la API organizados por función
│   ├── schemas/          # Esquemas Pydantic para validación
│   └── services/         # Lógica de negocio
├── tests/                # Pruebas unitarias e integradas
├── .env                  # Variables de entorno (no incluir en git)
├── .env.example          # Ejemplo de variables de entorno
├── main.py               # Punto de entrada de la aplicación
└── requirements.txt      # Dependencias del proyecto

```


## Seguridad

- La API utiliza tokens JWT para autenticación
- Las contraseñas son cifradas de forma segura
- Se implementa control de acceso basado en roles

## Contribuciones

Si desea contribuir a este proyecto, por favor:
1. Haga un fork del repositorio
2. Cree una rama para su nueva función
3. Añada sus cambios y pruebas
4. Envíe un pull request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT con requisito de atribución.

Copyright (c) 2024 Derlis Gómez

Se concede permiso, de forma gratuita, a cualquier persona que obtenga una copia de este software y los archivos de documentación asociados, para utilizar el Software sin restricciones, incluyendo, sin limitación, los derechos de uso, copia, modificación, fusión, publicación, distribución, sublicencia y/o venta de copias del Software, y para permitir a las personas a las que se les proporcione el Software que lo hagan, sujeto a las siguientes condiciones:

El aviso de copyright anterior y este aviso de permiso se incluirán en todas las copias o partes sustanciales del Software.

Además, cualquier proyecto, producto o servicio que utilice este código debe incluir una atribución visible al autor original, Derlis Gómez, mencionando el nombre del proyecto original "Sistema de Monitoreo para Pacientes con COVID-19 Crónico".

EL SOFTWARE SE PROPORCIONA "TAL CUAL", SIN GARANTÍA DE NINGÚN TIPO, EXPRESA O IMPLÍCITA, INCLUYENDO PERO NO LIMITADO A GARANTÍAS DE COMERCIALIZACIÓN, IDONEIDAD PARA UN PROPÓSITO PARTICULAR Y NO INFRACCIÓN. EN NINGÚN CASO LOS AUTORES O TITULARES DEL COPYRIGHT SERÁN RESPONSABLES DE NINGUNA RECLAMACIÓN, DAÑOS U OTRAS RESPONSABILIDADES, YA SEA EN UNA ACCIÓN DE CONTRATO, AGRAVIO O CUALQUIER OTRO MOTIVO, QUE SURJA DE O EN CONEXIÓN CON EL SOFTWARE O EL USO U OTRO TIPO DE ACCIONES EN EL SOFTWARE.

## Contacto

Para preguntas o soporte, contacte a derlisrgomez@gmail.com