# 🏥 PINV20-292 · Sistema de Seguimiento de Pacientes COVID-19

[![License: MIT](https://img.shields.io/badge/License-MIT%20%2B%20Atribución-yellow.svg)](#-licencia)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.118-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB.svg)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg)](https://www.postgresql.org/)

> **Plataforma web y móvil para la detección, registro y seguimiento georreferenciado de pacientes portadores de enfermedades crónicas con riesgo de COVID-19.**

🌐 **Demo en producción (web):** [www.saludenmapa.com](https://www.saludenmapa.com)

Proyecto de investigación financiado por **CONACYT** y el **Fondo para la Excelencia de la Educación e Investigación (FEEI)**, desarrollado por la **Facultad Politécnica – Universidad Nacional de Asunción (FP-UNA)** en colaboración con el **Ministerio de Salud Pública y Bienestar Social (MSPyBS)** de Paraguay.

Es un **monorepo** que agrupa tres aplicaciones que comparten código:

| Capa | Carpeta | Stack | Para quién                                                    |
|------|---------|-------|---------------------------------------------------------------|
| 🔧 **Backend** | [`apps/backend`](apps/backend) | FastAPI · PostgreSQL | API REST + WebSocket para todo el sistema                     |
| 🌐 **Web** | [`apps/web`](apps/web) | Next.js 14 · TypeScript | Portal de administradores, coordinadores, médicos y pacientes |
| 📱 **Mobile** | [`apps/mobile`](apps/mobile) | Expo · React Native | App para pacientes ("COVID-19 Monitor")                       |

---

## 📋 Tabla de Contenidos

- [Descripción del Proyecto](#-descripción-del-proyecto)
- [Características Principales](#-características-principales)
- [Arquitectura del Sistema](#️-arquitectura-del-sistema)
- [Tecnologías Utilizadas](#️-tecnologías-utilizadas)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Configuración](#️-instalación-y-configuración)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Guía de Desarrollo](#-guía-de-desarrollo)
- [Despliegue](#-despliegue)
- [Contribución](#-contribución)
- [Licencia](#-licencia)
- [Autor y Contacto](#-autor-y-contacto)

---

## 🎯 Descripción del Proyecto

Este proyecto desarrolla una **solución tecnológica integral** para el seguimiento epidemiológico de pacientes con enfermedades crónicas en el contexto de la pandemia de COVID-19. El sistema facilita:

- 🗺️ **Georreferenciación** de pacientes crónicos en todo el territorio paraguayo
- 💬 **Comunicación bidireccional en tiempo real** entre pacientes y profesionales de salud
- 📋 **Formularios clínicos** digitales y dinámicos (definidos por los médicos)
- 🏥 **Coordinación** entre Unidades de Salud, médicos y pacientes
- 🔒 **Gestión segura** de datos médicos sensibles

### Objetivos

1. **Identificar y registrar** pacientes portadores de enfermedades crónicas.
2. **Facilitar el contacto** entre profesionales del MSPyBS y pacientes vulnerables.
3. **Permitir el seguimiento continuo** del estado de salud mediante formularios asignados.
4. **Georreferenciar** para optimizar la asignación de recursos sanitarios.
5. **Centralizar la información** en una base de datos segura y accesible.

---

## ✨ Características Principales

### 🗺️ Georreferenciación
- Selección interactiva de ubicación mediante mapa (**Leaflet + OpenStreetMap** en web, **react-native-maps** en mobile).
- Detección de ubicación automática (GPS del navegador / `expo-location`).
- Geocodificación inversa (coordenadas → dirección) mediante **Nominatim**.
- Búsqueda de **hospitales cercanos** al paciente, ordenados por distancia (fórmula de Haversine).

### 👥 Sistema de Roles (RBAC)
- **Paciente** → app mobile/portal web: perfil, formularios asignados, hospitales cercanos y chat con su médico.
- **Médico** → portal web: pacientes asignados, creación/asignación de formularios, revisión de respuestas y chat.
- **Coordinador** → portal web: gestión del hospital, asignación médico–paciente e importación masiva de médicos.
- **Administrador** → portal web: gestión e importación/exportación de hospitales, coordinadores, especialidades y otros administradores (con invitaciones por correo).

### 🔐 Autenticación y Seguridad
- **JWT (JSON Web Tokens)** para autenticación stateless (OAuth2 password flow).
- **Bcrypt** (passlib) para el hash de contraseñas.
- **Control de acceso basado en roles** aplicado en el backend.
- Recuperación de contraseña por correo con **token de un solo uso y expiración**.
- **Validación de datos** con Pydantic (backend) y Zod (frontend/mobile).

### 🛡️ Gestión de Administradores
- Alta de administradores por **invitación por correo**: nadie necesita compartir contraseñas ni cargarlas a mano.
- Flujo completo:
  1. Un administrador invita por email desde `/dashboard/admin/administradores`.
  2. El sistema envía un enlace a `FRONTEND_URL/aceptar-invitacion-admin?token=…`.
  3. El invitado abre el enlace (con su email precargado en solo lectura) y define documento, nombre, teléfono y contraseña.
  4. La cuenta queda creada con rol `admin` y el invitado ingresa por `/login`.
- Token de **un solo uso** con expiración configurable (`ADMIN_INVITATION_TOKEN_EXPIRE_HOURS`, 48 h por defecto); el reenvío invalida la invitación anterior.
- En la base sólo se guarda el **hash SHA-256** del token (tabla `admin_invitations`), nunca el valor en claro.
- CRUD completo desde el portal: listado con búsqueda por nombre/email/documento, alta directa, edición, baja lógica y reactivación.
- El **primer administrador** se crea por consola con `python -m app.scripts.create_first_admin`; desde ahí en adelante se usan las invitaciones.

### 📋 Formularios Clínicos Dinámicos
- Los médicos crean formularios con preguntas de tipo texto, número, selección o fecha.
- Se **asignan a pacientes** (con fecha de expiración e instancias repetibles).
- Los pacientes los completan desde la app; los médicos consultan las respuestas en solo lectura.

### 💬 Mensajería en Tiempo Real
- Chat paciente ↔ médico sobre **WebSocket**, autenticado con un **ticket JWT de corta duración**.
- Lista de conversaciones, contador de no leídos y marcado de leídos.
- Fallback REST para el envío de mensajes.

### 📥 Importación Masiva de Médicos
- Los coordinadores importan médicos desde un archivo **Excel (.xlsx)**.
- Generación de contraseñas temporales y envío de correos de bienvenida (SMTP).
- Plantilla descargable y exportación del padrón de médicos del hospital.

### 🏥 Gestión e Importación/Exportación de Hospitales
Desde `/dashboard/admin/hospitales` el **administrador** puede:

- **Gestionar hospitales individualmente**: crear, consultar (con filtros por nombre,
  departamento y ciudad), editar y eliminar.
- **Importar hospitales masivamente** desde un archivo **Excel (.xlsx)**.
- **Descargar una plantilla Excel** (`plantilla_hospitales.xlsx`) con los encabezados
  esperados, una fila de ejemplo y una hoja de *Instrucciones*.
- **Exportar todos los hospitales** a `hospitales.xlsx` (se consulta la base completa,
  sin la paginación del listado).

`.xlsx` es el **formato principal de intercambio**; `POST /hospitales/import` mantiene el
soporte de `.csv` del comportamiento anterior.

**Formato del Excel** — una fila por hospital, **todos los campos obligatorios**:

| Nombre | Código | Departamento | Ciudad | Barrio | Dirección | Teléfono | Latitud | Longitud |
|--------|--------|--------------|--------|--------|-----------|----------|---------|----------|
| Hospital General de Luque | HGL-001 | Central | Luque | Centro | Av. Humaitá 123 | 021123456 | -25.2678 | -57.4872 |

**Validaciones de la importación:**
- Todos los campos son obligatorios; una cadena vacía no es un valor válido y los espacios
  al inicio/final se limpian.
- El `Código` debe ser único (en el sistema y dentro del archivo). **No hay actualización
  automática (*upsert*)**: si el código ya existe, la fila se reporta y el proceso continúa.
- `Latitud` debe ser numérica entre `-90` y `90`; `Longitud` entre `-180` y `180`.
- Las filas completamente vacías se ignoran y **una fila con error no impide procesar las
  demás**.
- El resultado informa `procesados`, `importados`, `con_error` y el detalle de errores
  (fila, hospital y motivo), p. ej. `Fila 5 — Hospital Regional X — Faltan campos
  obligatorios: Teléfono, Latitud`.

> Los mismos campos son obligatorios en la **creación manual** (formulario web + API). La
> latitud/longitud provienen del Excel o del selector de ubicación en el mapa (Leaflet); no
> se usa geocodificación automática para completarlas. Los registros históricos con campos
> vacíos no se modifican, pero al **editar** un hospital debe quedar con todos los datos
> obligatorios completos.

---

## 🏗️ Arquitectura del Sistema

```
                ┌──────────────────────┐        ┌──────────────────────┐
                │  📱 Mobile (Expo/RN)  │        │  🌐 Web (Next.js 14)  │
                │      Pacientes        │        │  Admin/Coord/Méd/Pac   │
                └───────────┬──────────┘        └──────────┬───────────┘
                            │                               │
                            │   @chronic-covid19/api-client │
                            │   @chronic-covid19/shared-types│
                            └───────────────┬───────────────┘
                                            │  REST + WebSocket (JWT)
                                            ▼
                              ┌──────────────────────────────┐
                              │     🔧 Backend (FastAPI)       │
                              │  Auth · Routers · Services     │
                              │  SQLAlchemy + Alembic          │
                              └───────────────┬───────────────┘
                                              ▼
                                   ┌──────────────────────┐
                                   │   🗄️ PostgreSQL 15    │
                                   └──────────────────────┘
```

### Flujo de datos

- La **web** y la **app mobile** nunca hablan directamente con la base de datos: consumen el **backend** a través del paquete compartido **`@chronic-covid19/api-client`** (cliente Axios), usando los tipos de **`@chronic-covid19/shared-types`**.
- Toda petición autenticada viaja con `Authorization: Bearer <token>`.
- El **chat** usa WebSocket: el cliente pide un ticket JWT (`POST /mensajes/ws-token`) y abre la conexión a `/mensajes/ws/{paciente_id}/{medico_id}`.
- Despliegue: la **web** se publica en **Vercel** ([saludenmapa.com](https://www.saludenmapa.com)) y el **backend** en **Railway**; la app mobile se compila con **EAS Build**.

---

## 🛠️ Tecnologías Utilizadas

### 🔧 Backend (`apps/backend`)
- **Python 3.11** — Lenguaje de programación
- **FastAPI ~0.118** — Framework web asíncrono de alto rendimiento
- **Uvicorn** — Servidor ASGI
- **PostgreSQL 15** — Base de datos relacional
- **SQLAlchemy 2.0** — ORM
- **Alembic** — Migraciones de base de datos
- **Pydantic 2** — Validación de datos y configuración
- **python-jose / PyJWT** — Autenticación con JWT
- **passlib + bcrypt** — Hash de contraseñas
- **WebSockets** (nativos de Starlette) — Chat en tiempo real
- **openpyxl** — Importación/exportación de médicos y hospitales en Excel
- **SMTP (stdlib)** — Envío de correos (recuperación de contraseña, alta de médicos)

### 🌐 Frontend Web (`apps/web`)
- **Next.js 14** (App Router) — Framework React con SSR/SSG
- **React 18** + **TypeScript 5.3**
- **Tailwind CSS 3.4** (+ `@tailwindcss/forms`, `@tailwindcss/typography`) — Estilos
- **Zustand** — State management (sesión persistida)
- **SWR** + **Axios** — Data fetching
- **React Hook Form** + **Zod** — Formularios y validación
- **Leaflet** + **React-Leaflet** — Mapas interactivos
- **Recharts** — Gráficos y métricas

### 📱 App Mobile (`apps/mobile`)
- **Expo SDK 54** + **Expo Router 6** — Toolchain y navegación por archivos
- **React Native 0.81** + **React 19**
- **React Native Paper** — Componentes UI (Material Design)
- **Zustand** — State management
- **React Hook Form** + **Zod** — Formularios y validación
- **expo-secure-store** — Almacenamiento seguro del token JWT
- **react-native-maps** + **expo-location** — Mapas y geolocalización nativa
- **WebSocket** (nativo) — Chat en tiempo real

### 📦 Packages compartidos (`packages/`)
- **`@chronic-covid19/shared-types`** — Tipos e interfaces TypeScript del dominio (enums, DTOs).
- **`@chronic-covid19/api-client`** — Cliente Axios del backend + esquemas de validación Zod. Consumido por la web y la mobile.

### 🧰 Monorepo & DevOps
- **pnpm 8** (workspaces) — Gestor de paquetes
- **Turborepo** — Orquestación de builds/scripts del monorepo
- **Docker / Docker Compose** — Contenedores del backend + PostgreSQL
- **Vercel** (web) y **Railway** (backend) — Despliegue
- **EAS Build** — Compilación de la app mobile (APK/AAB)

---

## 📦 Requisitos Previos

### Para el Backend 🔧
- **Python 3.11+** — [Descargar Python](https://www.python.org/downloads/)
- **PostgreSQL 15+** — [Descargar PostgreSQL](https://www.postgresql.org/download/)
- **pip** y **virtualenv** (incluidos con Python)

### Para la Web y los Packages 🌐📦
- **Node.js 18+** (recomendado **20 LTS**) — [Descargar Node.js](https://nodejs.org/)
- **pnpm 8** — `npm install -g pnpm@8` o vía `corepack enable`
- **Git** — [Descargar Git](https://git-scm.com/downloads)

### Para la App Mobile 📱
- **Expo CLI / EAS CLI** — `pnpm dlx expo` / `npm install -g eas-cli`
- **Android Studio** (emulador) — [Descargar](https://developer.android.com/studio) o la app **Expo Go** ([Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) · [App Store](https://apps.apple.com/app/expo-go/id982107779)) para probar en un dispositivo físico

### Entorno de desarrollo recomendado
- **JetBrains PyCharm / WebStorm** — [Descargar](https://www.jetbrains.com/) (el proyecto se desarrolla en PyCharm) o **[VS Code](https://code.visualstudio.com/)**.
- Extensiones recomendadas para **VS Code**:
  - [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) + [Pylance](https://marketplace.visualstudio.com/items?itemName=ms-python.vscode-pylance) (backend)
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) y [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) (TypeScript)
  - [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) (web)
- En **JetBrains**, PyCharm Professional cubre el backend Python y el frontend TS/React; para trabajar solo el frontend puede usarse WebStorm.

---

## ⚙️ Instalación y Configuración

### 0️⃣ Clonar el repositorio

```bash
git clone https://github.com/dgomezrocket/chronic_covid19.git
cd chronic_covid19
```

### 1️⃣ Instalar dependencias del monorepo (JS/TS)

```bash
# Desde la raíz del proyecto (instala web, mobile y packages)
pnpm install
```

### 2️⃣ Backend 🔧 (FastAPI + PostgreSQL)

```bash
cd apps/backend

# Crear y activar el entorno virtual
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales (ver variables abajo)

# Ejecutar migraciones
alembic upgrade head

# Crear el primer administrador (interactivo)
python -m app.scripts.create_first_admin

# Iniciar el servidor de desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Variables principales de `apps/backend/.env`:**

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=chronic_covid19
POSTGRES_SERVER=localhost          # 'db' si se usa Docker
SECRET_KEY=cambia-esto-por-una-clave-larga-y-aleatoria
PROJECT_NAME=Chronic COVID-19 Monitoring System
FRONTEND_URL=http://localhost:3000 # usado en los enlaces de los correos

# SMTP (opcional: si está vacío, el envío de correos se omite sin romper nada)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=Salud en Mapa
SMTP_STARTTLS=true

PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=30
ADMIN_INVITATION_TOKEN_EXPIRE_HOURS=48   # validez del enlace de invitación de admin
```

> 💡 Si el bloque SMTP queda vacío, las **invitaciones de administrador se crean igual pero el correo no se
> envía** (el envío se omite sin cortar la operación). En desarrollo, tomá el enlace de los logs del backend.

El backend quedará disponible en **http://localhost:8000**:
- 📘 Swagger UI: **http://localhost:8000/docs**
- 📗 ReDoc: **http://localhost:8000/redoc**

### 3️⃣ Web 🌐 (Next.js)

```bash
cd apps/web

# Configurar el entorno (nota: el archivo se llama env.local)
# NEXT_PUBLIC_API_URL apunta al backend
#   NEXT_PUBLIC_API_URL=http://localhost:8000

# Iniciar el servidor de desarrollo
pnpm dev
```

La web estará disponible en **http://localhost:3000**.

### 4️⃣ Mobile 📱 (Expo / React Native)

```bash
cd apps/mobile

# Configurar el entorno
cp .env.example .env
# Editar EXPO_PUBLIC_API_URL según dónde corras el backend:
#   Emulador Android:            http://10.0.2.2:8000
#   Dispositivo físico (Expo Go): http://192.168.x.x:8000  (misma red; backend con --host 0.0.0.0)

# Iniciar Expo
pnpm start
# o directamente en Android:
pnpm android
```

> Si cambiás el `.env`, reiniciá Expo con la caché limpia: `npx expo start -c`.

### 5️⃣ Docker (opcional, backend + PostgreSQL + Redis)

```bash
cd apps/backend
docker-compose up -d
# Backend:    http://localhost:8000
# PostgreSQL: localhost:5432
# Redis:      localhost:6379
```

---

## 📂 Estructura del Proyecto

```
chronic_covid19/
├── apps/
│   ├── backend/                 # 🔧 API FastAPI (REST + WebSocket)
│   │   ├── app/
│   │   │   ├── core/            # Configuración, seguridad (JWT), dependencias y guards de rol
│   │   │   ├── db/              # Engine, sesión y Base de SQLAlchemy
│   │   │   ├── models/          # Modelos SQLAlchemy (pacientes, médicos, hospitales, ...)
│   │   │   ├── schemas/         # Esquemas Pydantic
│   │   │   ├── routers/         # Endpoints por dominio (auth, pacientes, mensajes, ...)
│   │   │   ├── services/        # Lógica de negocio (coordinador, médico, email)
│   │   │   ├── scripts/         # Utilidades (create_first_admin)
│   │   │   └── main.py          # App FastAPI + montaje de routers + CORS
│   │   ├── alembic/             # Migraciones de base de datos
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── requirements.txt
│   │
│   ├── web/                     # 🌐 Portal Next.js 14 (staff + vistas de paciente)
│   │   └── src/
│   │       ├── app/             # App Router: login, register, aceptar-invitacion-admin, dashboard/{admin,coordinador,medico,paciente}
│   │       ├── components/      # Chat, LocationPicker, mapas (Leaflet), etc.
│   │       └── store/           # Estado de sesión (Zustand)
│   │
│   └── mobile/                  # 📱 App Expo / React Native (pacientes)
│       ├── app/                 # Expo Router: (auth) y (tabs): datos, formularios, respuestas, hospitales, mensajes
│       ├── src/                 # components, hooks, lib (api/auth), store, theme
│       ├── app.json             # Config Expo (com.covid19monitor.app)
│       ├── app.config.js        # Inyecta la Google Maps API key desde el entorno
│       └── eas.json             # Perfiles de build EAS
│
├── packages/
│   ├── shared-types/            # 📦 @chronic-covid19/shared-types (tipos/enums TS)
│   └── api-client/              # 📦 @chronic-covid19/api-client (Axios + Zod)
│
├── package.json                 # Scripts del monorepo (Turborepo)
├── pnpm-workspace.yaml          # Workspaces: apps/* y packages/*
├── turbo.json                   # Pipeline de Turborepo
└── vercel.json                  # Build de la web en Vercel
```

---

## 🔌 API Endpoints

API REST + WebSocket servida por FastAPI. **No hay prefijo `/api/v1`**: los routers se montan directamente bajo su prefijo. La autenticación es **JWT Bearer**. Para el detalle interactivo y los esquemas, ver **`/docs`** (Swagger).

### 🔑 Autenticación — `/auth`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Registrar paciente (alias de `/register/paciente`) | ❌ |
| POST | `/auth/register/paciente` | Registrar paciente | ❌ |
| POST | `/auth/register/medico` | Registrar médico | ❌ |
| POST | `/auth/register/coordinador` | Registrar coordinador | ❌ |
| POST | `/auth/login` | Iniciar sesión (OAuth2 form) | ❌ |
| GET | `/auth/me` | Usuario autenticado actual | ✅ |
| POST | `/auth/forgot-password` | Solicitar recuperación de contraseña | ❌ |
| POST | `/auth/reset-password` | Restablecer contraseña con token | ❌ |

### 🧑 Pacientes — `/pacientes`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/pacientes/{id}` | Obtener paciente | ✅ |
| PUT | `/pacientes/{id}` | Actualizar paciente | ✅ |
| GET | `/pacientes/{id}/formularios` | Respuestas de formularios del paciente | ✅ |
| POST | `/pacientes/{id}/formularios` | Enviar respuesta de formulario | ✅ |

### 🩺 Médicos — `/medicos`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/medicos/` | Listar médicos | ✅ |
| GET | `/medicos/me` | Perfil del médico autenticado | 🩺 Médico |
| POST | `/medicos/me/cambiar-password` | Cambiar la propia contraseña | 🩺 Médico |
| GET | `/medicos/{id}` | Obtener médico | ✅ |
| PUT | `/medicos/{id}` | Actualizar médico | 🩺 Propio / Admin |
| DELETE | `/medicos/{id}` | Eliminar médico | 🛡️ Admin |

### 🏷️ Especialidades — `/especialidades`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/especialidades/` | Listar especialidades | ❌ |
| GET | `/especialidades/{id}` | Obtener especialidad | ❌ |
| POST | `/especialidades/` | Crear especialidad | 🛡️ Admin |
| PUT | `/especialidades/{id}` | Actualizar especialidad | 🛡️ Admin |
| DELETE | `/especialidades/{id}` | Desactivar especialidad | 🛡️ Admin |
| POST | `/especialidades/{id}/reactivar` | Reactivar especialidad | 🛡️ Admin |
| GET | `/especialidades/{id}/medicos` | Médicos por especialidad | 🛡️ Admin |

### 🏥 Hospitales — `/hospitales`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/hospitales/` | Listar hospitales (filtros: nombre, departamento, ciudad) | ❌ |
| GET | `/hospitales/{id}` | Obtener hospital | ❌ |
| GET | `/hospitales/nearby` | Hospitales cercanos a `lat,lon,radio` | ❌ |
| GET | `/hospitales/mis-cercanos` | Hospitales cercanos al paciente autenticado | 🧑 Paciente |
| POST | `/hospitales/` | Crear hospital | 🛡️ Admin |
| PUT | `/hospitales/{id}` | Actualizar hospital | 🛡️ Admin |
| DELETE | `/hospitales/{id}` | Eliminar hospital | 🛡️ Admin |
| POST | `/hospitales/import` | Importar hospitales desde Excel | 🛡️ Admin |
| GET | `/hospitales/plantilla` | Descargar plantilla Excel | 🛡️ Admin |
| GET | `/hospitales/exportar` | Exportar hospitales a Excel | 🛡️ Admin |

> `POST /hospitales/import` acepta `.xlsx` (formato principal) y conserva el soporte de
> `.csv` del comportamiento anterior. `/hospitales/plantilla` y `/hospitales/exportar` se
> declaran antes de `/hospitales/{id}` para que FastAPI no interprete `plantilla`/`exportar`
> como un `hospital_id`.

### 📋 Formularios — `/formularios`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/formularios/` | Listar formularios (médico: los suyos / admin: todos) | ✅ |
| POST | `/formularios/` | Crear formulario | 🩺 Médico |
| GET | `/formularios/{id}` | Obtener formulario | ✅ |
| PUT | `/formularios/{id}` | Actualizar formulario | 🩺 Creador / Admin |
| DELETE | `/formularios/{id}` | Desactivar formulario | 🩺 Creador / Admin |
| POST | `/formularios/{id}/asignaciones` | Asignar formulario a un paciente | 🩺 Médico |
| GET | `/formularios/{id}/asignaciones` | Listar asignaciones de un formulario | ✅ |
| GET | `/formularios/mis-asignaciones` | Formularios asignados al paciente | 🧑 Paciente |
| GET | `/formularios/mis-asignaciones/{id}/mi-respuesta` | Mi respuesta (solo lectura) | 🧑 Paciente |
| POST | `/formularios/asignaciones/{id}/responder` | Responder un formulario asignado | 🧑 Paciente |
| GET | `/formularios/{id}/respuestas` | Respuestas de un formulario | 🩺 Creador |
| GET | `/formularios/asignaciones/{id}/respuesta` | Respuesta de una asignación | 🩺 Médico |
| GET | `/formularios/paciente/{id}/formularios-completados` | Formularios de un paciente | 🩺 Médico |
| GET | `/formularios/respuestas` | Listado consolidado de respuestas (paginado, filtros) | 🩺 Médico / Admin |
| GET | `/formularios/respuestas/{id}` | Detalle de respuesta (solo lectura) | 🩺 Médico / Admin |

### 💬 Mensajes / Chat — `/mensajes`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/mensajes/conversaciones` | Conversaciones del usuario (con no leídos) | ✅ |
| GET | `/mensajes/chat/{paciente_id}/{medico_id}` | Mensajes de un chat | ✅ Participante |
| POST | `/mensajes/enviar` | Enviar mensaje (alternativa REST al WS) | ✅ Participante |
| PUT | `/mensajes/marcar-leidos/{paciente_id}/{medico_id}` | Marcar mensajes como leídos | ✅ Participante |
| GET | `/mensajes/no-leidos/count` | Conteo total de no leídos | ✅ |
| POST | `/mensajes/ws-token` | Emitir ticket JWT (60s) para el WebSocket | ✅ Participante |
| **WS** | `/mensajes/ws/{paciente_id}/{medico_id}?token=<ticket>` | **Chat en tiempo real** (WebSocket) | 🎫 Ticket JWT |

### 🛡️ Admins — `/admins`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/admins/invitaciones` | Crear y enviar una invitación por correo | 🛡️ Admin |
| GET | `/admins/invitaciones/validar?token=` | Validar el token y obtener el email invitado | ❌ |
| POST | `/admins/invitaciones/aceptar` | Aceptar la invitación y crear la cuenta | ❌ |
| POST | `/admins/invitaciones/{id}/reenviar` | Reenviar la invitación (invalida la anterior) | 🛡️ Admin |
| GET | `/admins/` | Listar administradores | 🛡️ Admin |
| GET | `/admins/{id}` | Obtener administrador | 🛡️ Admin / Propio |
| POST | `/admins/` | Crear administrador | 🛡️ Admin |
| PUT | `/admins/{id}` | Actualizar administrador | 🛡️ Admin / Propio |
| DELETE | `/admins/{id}` | Desactivar administrador | 🛡️ Admin |
| POST | `/admins/{id}/reactivar` | Reactivar administrador | 🛡️ Admin |

> 📝 Las rutas de invitación se declaran **antes** de `/{admin_id}` para que FastAPI no interprete
> `invitaciones` como el path param numérico. `DELETE /admins/{id}` es una **baja lógica** (`activo = 0`) que
> además impide auto-desactivarse y desactivar al último administrador activo. `POST /admins/invitaciones/{id}/reenviar`
> ya está disponible en la API y en el `api-client`, pero todavía no tiene UI en el portal.

### 🧭 Coordinadores — `/coordinadores`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/coordinadores/` | Crear coordinador | 🛡️ Admin |
| GET | `/coordinadores/` | Listar coordinadores | 🛡️ Admin |
| GET | `/coordinadores/{id}` | Obtener coordinador | 🛡️ Admin / Propio |
| PUT | `/coordinadores/{id}` | Actualizar coordinador | 🛡️ Admin / Propio |
| PUT | `/coordinadores/{id}/hospital` | Asignar hospital a coordinador | 🛡️ Admin |
| DELETE | `/coordinadores/{id}` | Eliminar coordinador | 🛡️ Admin |
| GET | `/coordinadores/me` | Perfil del coordinador autenticado | 🧭 Coordinador |
| GET | `/coordinadores/me/dashboard` | Estadísticas del hospital | 🧭 Coordinador |
| GET | `/coordinadores/me/hospital` | Detalle de su hospital | 🧭 Coordinador |
| GET | `/coordinadores/me/medicos` | Médicos de su hospital | 🧭 Coordinador |
| GET | `/coordinadores/me/pacientes` | Pacientes de su hospital | 🧭 Coordinador |

### 🔗 Asignaciones — `/asignaciones`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/asignaciones/medico-hospital` | Asignar médico a hospital | 🧭 Coordinador |
| DELETE | `/asignaciones/medico-hospital` | Quitar médico de hospital | 🧭 Coordinador |
| POST | `/asignaciones/paciente-hospital` | Asignar paciente a hospital | 🧭 Coordinador |
| POST | `/asignaciones/medico-paciente` | Asignar médico a paciente | 🧭 Coordinador |
| GET | `/asignaciones/paciente/{id}` | Asignación activa de un paciente | 🧭 Coordinador |
| DELETE | `/asignaciones/medico-paciente/{id}` | Desactivar asignación médico-paciente | 🧭 Coordinador |
| GET | `/asignaciones/buscar-paciente` | Buscar pacientes (`q`, `solo_sin_hospital`) | 🧭 Coordinador |
| GET | `/asignaciones/mis-pacientes` | Pacientes del médico autenticado | 🩺 Médico |
| GET | `/asignaciones/pacientes-sin-hospital` | Pacientes sin hospital + cercanos | 🧭 Coordinador |
| GET | `/asignaciones/medicos-disponibles` | Médicos disponibles de un hospital | 🧭 Coordinador |
| GET | `/asignaciones/` | Listar asignaciones (filtros + paginación) | 🧭 Coordinador |

### 📥 Importación de Médicos — `/importacion-medicos`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/importacion-medicos/plantilla` | Descargar plantilla `.xlsx` | 🧭 Coordinador |
| POST | `/importacion-medicos/importar` | Importar médicos desde `.xlsx` | 🧭 Coordinador |
| GET | `/importacion-medicos/exportar` | Exportar médicos del hospital a `.xlsx` | 🧭 Coordinador |

### ⚙️ Sistema
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/` | Información de la API | ❌ |
| GET | `/health` | Health check | ❌ |

---

## 💻 Guía de Desarrollo

### Comandos del monorepo (desde la raíz)

```bash
pnpm dev          # Ejecuta las apps en paralelo (Turborepo)
pnpm build        # Compila todas las apps y packages
pnpm lint         # Lint de todos los workspaces
pnpm format       # Formatea con Prettier

pnpm web:dev      # Solo la web (turbo run dev --filter=web)
pnpm mobile:dev   # Solo la mobile (turbo run dev --filter=mobile)
pnpm backend:dev  # Solo el backend (uvicorn --reload)
```

### Ejecutar cada app por separado

```bash
# 🔧 Backend
cd apps/backend && source .venv/bin/activate   # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 🌐 Web
cd apps/web && pnpm dev

# 📱 Mobile
cd apps/mobile && pnpm start
```

### 📦 Packages compartidos

Los packages se compilan con `tsc`. Turborepo los construye automáticamente antes de las apps (`^build`); para compilarlos manualmente:

```bash
pnpm --filter @chronic-covid19/shared-types build
pnpm --filter @chronic-covid19/api-client build
```

### 🗄️ Migraciones de base de datos (Alembic)

```bash
cd apps/backend
alembic revision --autogenerate -m "Descripción del cambio"
alembic upgrade head
```

### 📱 Compilar el APK con EAS

La app mobile se compila en la nube con **EAS Build** (no hay aún un enlace público de descarga en tiendas). Perfiles definidos en `apps/mobile/eas.json`:

| Perfil | Uso | API |
|--------|-----|-----|
| `development` | Dev client, distribución interna | local |
| `preview` | APK de prueba, distribución interna | producción (Railway) |
| `production` | Build de tienda (auto-increment) | producción (Railway) |

```bash
cd apps/mobile
npm install -g eas-cli
eas login
eas build -p android --profile preview   # genera un APK instalable
```

> ⚠️ **Requisito previo: Google Maps API key.** Las pantallas de hospitales y el selector de
> ubicación usan `react-native-maps`, que en Android necesita una key propia (Expo Go usa la de
> Expo, pero un APK sin key aborta con `IllegalStateException: API key not found.`).
>
> 1. En Google Cloud Console: habilitar facturación y la API **Maps SDK for Android**, crear una
>    API key y restringirla a *Android apps* con el package `com.covid19monitor.app` + la huella
>    SHA-1 del keystore (`eas credentials`), y a la API *Maps SDK for Android*.
> 2. Para desarrollo local: `GOOGLE_MAPS_ANDROID_API_KEY` en `apps/mobile/.env`
>    (ver [`.env.example`](apps/mobile/.env.example)).
> 3. Para builds de EAS, registrarla como Environment Variable del proyecto:
>    ```bash
>    eas env:create --name GOOGLE_MAPS_ANDROID_API_KEY --value "AIza..." \
>      --environment development --environment preview --environment production \
>      --visibility sensitive
>    ```
>
> `apps/mobile/app.config.js` la inyecta en `android.config.googleMaps.apiKey`, y el prebuild de
> Expo la escribe como `com.google.android.geo.API_KEY` en el `AndroidManifest.xml` generado.

### ➕ Agregar dependencias

```bash
# 🔧 Backend
cd apps/backend && pip install <paquete> && pip freeze > requirements.txt

# 🌐 Web / 📱 Mobile / 📦 Packages
pnpm --filter web add <paquete>
pnpm --filter mobile add <paquete>
pnpm --filter @chronic-covid19/api-client add <paquete>
```

---

## 🚀 Despliegue

### 🌐 Web → Vercel
El archivo [`vercel.json`](vercel.json) compila los packages compartidos y luego la web:
`shared-types` → `api-client` → `web`. Dominio de producción: **[www.saludenmapa.com](https://www.saludenmapa.com)**.
Variable requerida: `NEXT_PUBLIC_API_URL` (URL pública del backend).

### 🔧 Backend → Railway (Docker)
El [`Dockerfile`](apps/backend/Dockerfile) usa `python:3.11-slim`, ejecuta `alembic upgrade head` y arranca Uvicorn en el puerto `${PORT}`.
Variables requeridas: `DATABASE_URL` (o `POSTGRES_*`), `SECRET_KEY` y `FRONTEND_URL` — esta última debe apuntar al
dominio público de la web, porque construye los enlaces de **invitación de administrador** y de **reset de contraseña**.
El bloque SMTP es opcional, pero sin él esos correos no salen.

### 📱 Mobile → EAS Build
`eas build -p android --profile production`. La app usa `EXPO_PUBLIC_API_URL` apuntando al backend de producción (Railway).
Requiere además `GOOGLE_MAPS_ANDROID_API_KEY` como Environment Variable del proyecto en EAS (ver la nota de la
sección de compilación del APK).

---

## 🤝 Contribución

1. Haz un **fork** del repositorio.
2. Crea una rama para tu funcionalidad: `git checkout -b feat/mi-funcionalidad`.
3. Realiza tus cambios siguiendo el estilo del proyecto.
4. Abre un **Pull Request** describiendo los cambios.

---

## 📄 Licencia

Este proyecto está licenciado bajo la **Licencia MIT con requisito de atribución**.

Copyright © 2026 **Derlis Gómez**.

Se concede permiso para usar, copiar, modificar y distribuir el software sin restricciones, **siempre que**:

- Se incluya el aviso de copyright anterior en todas las copias o partes sustanciales del Software.
- Cualquier proyecto, producto o servicio que utilice este código incluya una **atribución visible** al autor original, **Derlis Gómez**, mencionando el nombre del proyecto original *"Sistema de Monitoreo para Pacientes con COVID-19 Crónico"*.

El software se proporciona "TAL CUAL", sin garantía de ningún tipo.

---

## 👤 Autor y Contacto

**Derlis Gómez** — Desarrollador Full-Stack del proyecto (🔧 backend FastAPI, 🌐 web Next.js y 📱 app mobile Expo/React Native).

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Derlis%20Gómez-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/derlisgomez/)
[![GitHub](https://img.shields.io/badge/GitHub-dgomezrocket-181717?logo=github&logoColor=white)](https://github.com/dgomezrocket)
[![Email](https://img.shields.io/badge/Email-derlisrgomez@gmail.com-EA4335?logo=gmail&logoColor=white)](mailto:derlisrgomez@gmail.com)

- 💼 **LinkedIn:** [linkedin.com/in/derlisgomez](https://www.linkedin.com/in/derlisgomez/)
- 🐙 **GitHub:** [github.com/dgomezrocket](https://github.com/dgomezrocket)
- 📧 **Email:** derlisrgomez@gmail.com

Desarrollado en el marco del proyecto **PINV20-292** — FP-UNA · CONACYT/FEEI · MSPyBS (Paraguay).
