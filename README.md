# 🏥 PINV20-292 - Sistema de Seguimiento de Pacientes COVID-19

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.0-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

> **Aplicación web y móvil para la detección, registro y seguimiento georreferenciado de pacientes portadores de enfermedades crónicas con riesgo de COVID-19**

Proyecto de investigación financiado por **CONACYT** y el **Fondo para la Excelencia de la Educación e Investigación (FEEI)**, desarrollado por la **Facultad Politécnica - Universidad Nacional de Asunción (FP-UNA)** en colaboración con el **Ministerio de Salud Pública y Bienestar Social (MSPyBS)** de Paraguay.

---

## 📋 Tabla de Contenidos

- [Descripción del Proyecto](#-descripción-del-proyecto)
- [Características Principales](#-características-principales)
- [Arquitectura del Sistema](#️-arquitectura-del-sistema)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Configuración](#️-instalación-y-configuración)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Guía de Desarrollo](#-guía-de-desarrollo)
- [Testing](#-testing)
- [Despliegue](#-despliegue)
- [Contribución](#-contribución)
- [Licencia](#-licencia)
- [Contacto](#-contacto)

---

## 🎯 Descripción del Proyecto

Este proyecto desarrolla una **solución tecnológica integral** para el seguimiento epidemiológico de pacientes con enfermedades crónicas en el contexto de la pandemia de COVID-19. El sistema facilita:

- 🗺️ **Georreferenciación** de pacientes crónicos en todo el territorio paraguayo
- 📱 **Comunicación bidireccional** entre pacientes y profesionales de salud
- 📋 **Formularios clínicos** digitales (base, síntomas, logística)
- 📊 **Reportes de gestión** para autoridades sanitarias
- 🔒 **Gestión segura** de datos médicos sensibles
- 🏥 **Coordinación** entre Unidades de Salud y pacientes

### 🎯 Objetivos

1. **Identificar y registrar** pacientes portadores de enfermedades crónicas
2. **Facilitar el contacto** entre profesionales del MSPyBS y pacientes vulnerables
3. **Permitir seguimiento continuo** del estado de salud mediante formularios
4. **Georreferenciar** para optimizar la asignación de recursos sanitarios
5. **Centralizar información** en una base de datos segura y accesible

---

## ✨ Características Principales

### 🗺️ Georreferenciación Avanzada
- **Selección interactiva** de ubicación mediante mapa (Leaflet + OpenStreetMap)
- **Detección GPS automática** desde el navegador
- **Geocodificación inversa** (coordenadas → dirección) usando Nominatim API
- **Visualización en mapa** de la ubicación de residencia del paciente
- **Integración con Google Maps** para verificación

### 👤 Sistema de Roles
- **Pacientes**: Registro, gestión de perfil, formularios de salud, mensajería
- **Médicos**: Gestión de pacientes asignados, revisión de formularios, comunicación
- **Coordinadores**: Administración de hospitales, asignación de médicos

### 🔐 Autenticación y Seguridad
- **JWT (JSON Web Tokens)** para autenticación stateless
- **Bcrypt** para hash de contraseñas
- **Control de acceso basado en roles** (RBAC)
- **Validación de datos** con Pydantic (backend) y Zod (frontend)

### 📋 Formularios Clínicos
- **Formulario Base**: Datos demográficos y antecedentes médicos
- **Formulario de Síntomas**: Evaluación de síntomas COVID-19
- **Formulario de Logística**: Necesidades de medicamentos y recursos

### 💬 Sistema de Mensajería
- Comunicación paciente-médico en tiempo real
- Notificaciones y alertas
- Historial de conversaciones

### 📊 Panel de Control
- **Dashboard interactivo** para cada tipo de usuario
- **Estadísticas y métricas** de salud pública
- **Reportes exportables** para autoridades

---

## 🏗️ Arquitectura del Sistema


--en proceso


### 🔄 Flujo de Datos


--en proceso


---

## 🛠️ Tecnologías Utilizadas

### Backend
- **🐍 Python 3.13** - Lenguaje de programación
- **⚡ FastAPI** - Framework web moderno y de alto rendimiento
- **🗄️ PostgreSQL** - Base de datos relacional
- **🔗 SQLAlchemy** - ORM (Object-Relational Mapping)
- **🔐 JWT** - JSON Web Tokens para autenticación
- **🔒 Bcrypt** - Hash de contraseñas
- **✅ Pydantic** - Validación de datos
- **🔄 Alembic** - Migraciones de base de datos

### Frontend Web
- **⚛️ Next.js 14** - Framework React con SSR/SSG
- **📘 TypeScript 5.3** - JavaScript tipado
- **🎨 Tailwind CSS** - Framework CSS utility-first
- **🗺️ Leaflet** - Mapas interactivos
- **📝 React Hook Form** - Gestión de formularios
- **✅ Zod** - Validación de esquemas
- **📦 Axios** - Cliente HTTP
- **🐻 Zustand** - State management ligero

### Mobile App
- **📱 React Native** - Framework para apps nativas
- **🔷 Expo** - Toolchain para React Native
- **📍 Expo Location** - Geolocalización nativa
- **🎨 Native Base** - Librería de componentes UI

### Monorepo & Build Tools
- **📦 TurboRepo** - Sistema de build para monorepos
- **📦 pnpm** - Gestor de paquetes rápido
- **🔧 TypeScript** - Configuración compartida

### DevOps & Deployment
- **🐳 Docker** - Containerización
- **🐳 Docker Compose** - Orquestación de contenedores
- **🔄 GitHub Actions** - CI/CD (próximamente)

---

## 📦 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

### Para el Backend
- **Python 3.13+** - [Descargar Python](https://www.python.org/downloads/)
- **PostgreSQL 14+** - [Descargar PostgreSQL](https://www.postgresql.org/download/)
- **pip** (incluido con Python)
- **virtualenv** (opcional pero recomendado)

### Para el Frontend
- **Node.js 20+** - [Descargar Node.js](https://nodejs.org/)
- **pnpm 8+** - Instalar con: `npm install -g pnpm`
- **Git** - [Descargar Git](https://git-scm.com/downloads)

### Para Desarrollo
- **IDE recomendado**: 
  - [VS Code](https://code.visualstudio.com/) o [IntelliJ IDEA](https://www.jetbrains.com/idea/)
  - Extensiones: Python, TypeScript, Prettier, ESLint

---

## ⚙️ Instalación y Configuración

### 1️⃣ Clonar el Repositorio

bash git clone [https://github.com/tu-usuario/chronic_covid19.git](https://github.com/tu-usuario/chronic_covid19.git) cd chronic_covid19


### 2️⃣ Configurar el Backend (FastAPI + PostgreSQL)


Navegar a la carpeta del backend
cd apps/backend
Crear entorno virtual
python -m venv .venv
Activar entorno virtual
En Windows:
.venv\Scripts\activate
En macOS/Linux:
source .venv/bin/activate
Instalar dependencias
pip install -r requirements.txt
Copiar archivo de configuración
cp .env.example .env
Editar .env con tus credenciales de PostgreSQL
DATABASE_URL=postgresql://usuario:contraseña@localhost/nombre_bd
SECRET_KEY=tu_clave_secreta_super_segura
Crear base de datos (PostgreSQL debe estar corriendo)
createdb nombre_bd
Ejecutar migraciones
alembic upgrade head
Iniciar el servidor de desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000



El backend estará disponible en: **http://localhost:8000**
- Documentación interactiva (Swagger): **http://localhost:8000/docs**
- Documentación alternativa (ReDoc): **http://localhost:8000/redoc**

### 3️⃣ Configurar el Frontend Web (Next.js)


Desde la raíz del proyecto
cd apps/web
Instalar dependencias
pnpm install
Copiar archivo de configuración
cp .env.example .env.local
Editar .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
Iniciar el servidor de desarrollo
pnpm dev


La aplicación web estará disponible en: **http://localhost:3000**

### 4️⃣ Configurar Packages Compartidos

Desde la raíz del proyecto
pnpm install
Compilar packages compartidos
pnpm --filter @chronic-covid19/shared-types build pnpm --filter @chronic-covid19/api-client build


### 5️⃣ Usando Docker (Opcional)

Desde la raíz del proyecto
docker-compose up -d
El backend estará en: http://localhost:8000
PostgreSQL en: localhost:5432


---

## 📂 Estructura del Proyecto

--en proceso


---

## 🔌 API Endpoints

### Autenticación (`/auth`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Iniciar sesión | ❌ |
| POST | `/auth/register` | Registrar paciente | ❌ |
| GET | `/auth/me` | Obtener usuario actual | ✅ |

### Pacientes (`/pacientes`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/pacientes/` | Listar todos los pacientes | ✅ |
| GET | `/pacientes/{id}` | Obtener paciente por ID | ✅ |
| PUT | `/pacientes/{id}` | Actualizar paciente | ✅ |
| DELETE | `/pacientes/{id}` | Eliminar paciente | ✅ |

### Médicos (`/medicos`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/medicos/` | Listar todos los médicos | ✅ |
| GET | `/medicos/{id}` | Obtener médico por ID | ✅ |
| POST | `/medicos/` | Crear médico | ✅ |
| PUT | `/medicos/{id}` | Actualizar médico | ✅ |
| DELETE | `/medicos/{id}` | Eliminar médico | ✅ |

### Hospitales (`/hospitales`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/hospitales/` | Listar hospitales | ✅ |
| GET | `/hospitales/{id}` | Obtener hospital | ✅ |
| POST | `/hospitales/` | Crear hospital | ✅ |
| PUT | `/hospitales/{id}` | Actualizar hospital | ✅ |

### Formularios (`/formularios`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/formularios/` | Enviar formulario | ✅ |
| GET | `/formularios/paciente/{id}` | Formularios de un paciente | ✅ |
| GET | `/formularios/{id}` | Obtener formulario | ✅ |

### Mensajes (`/mensajes`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/mensajes/` | Enviar mensaje | ✅ |
| GET | `/mensajes/conversacion/{paciente_id}` | Conversación con paciente | ✅ |
| GET | `/mensajes/paciente` | Mensajes del paciente actual | ✅ |

---

## 💻 Guía de Desarrollo

### Ejecutar Backend

bash cd apps/backend source .venv/bin/activate # Windows: .venv\Scripts\activate uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


### Ejecutar Frontend

bash cd apps/web pnpm dev


### Ejecutar Todo el Proyecto (Monorepo)



### Ejecutar Todo el Proyecto (Monorepo)

Desde la raíz
pnpm install pnpm dev # Ejecuta todos los workspaces en paralelo


### Crear una Nueva Migración (Backend)


### Crear una Nueva Migración (Backend)

bash cd apps/backend alembic revision --autogenerate -m "Descripción del cambio" alembic upgrade head


### Agregar una Nueva Dependencia


Backend
cd apps/backend pip install nombre-paquete pip freeze > requirements.txt
Frontend
cd apps/web pnpm add nombre-paquete
Package compartido
cd packages/shared-types pnpm add nombre-paquete


---

## 🧪 Testing

### Backend (pytest)

bash cd apps/backend pytest pytest --cov=app tests/ # Con cobertura


### Frontend (Jest - próximamente)



### Frontend (Jest - próximamente)


bash cd apps/web pnpm test pnpm test:watch