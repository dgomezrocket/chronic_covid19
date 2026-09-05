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
- **Coordinador** → portal web: gestión del hospital, asignación médico–paciente, alta y edición individual de médicos de su hospital e importación masiva de médicos.
- **Administrador** → portal web: gestión e importación/exportación de hospitales, coordinadores, especialidades y otros administradores (con invitaciones por correo).

### 🔐 Autenticación y Seguridad
- **JWT (JSON Web Tokens)** para autenticación stateless (OAuth2 password flow).
- **Bcrypt** (passlib) para el hash de contraseñas.
- **Control de acceso basado en roles** aplicado en el backend.
- Recuperación de contraseña por correo con **token de un solo uso y expiración**.
- **Verificación de cuenta por correo** obligatoria para pacientes y médicos que se autoregistran.
- **Validación de datos** con Pydantic (backend) y Zod (frontend/mobile).

#### 🔑 Recuperación de contraseña (Web y Mobile)

Disponible para pacientes, médicos, coordinadores y administradores. Ambas plataformas
comparten los mismos endpoints y el **mismo token**:

| Método | Endpoint | Uso |
|--------|----------|-----|
| POST | `/auth/forgot-password` | Solicitar el código/enlace (recibe `email`) |
| POST | `/auth/reset-password` | Definir la nueva contraseña (recibe `token` y `new_password`) |

**Flujo web:**

```
/login  →  ¿Olvidaste tu contraseña?  →  /forgot-password  →  correo
        →  /reset-password?token=…    →  contraseña actualizada  →  /login
```

El correo incluye **un código y un enlace**. El enlace se arma con `FRONTEND_URL`
(`{FRONTEND_URL}/reset-password?token=…`), por lo que `/reset-password` detecta el token
automáticamente. Si se entra a `/reset-password` sin token en la URL, se puede pegar el
código a mano — el mismo que se usa en la app mobile (pantallas `recuperar` → `restablecer`).

> 🔒 La respuesta de `/auth/forgot-password` es **siempre genérica**, exista o no el email,
> para no revelar qué cuentas están registradas.

#### 🔐 Cambio de contraseña con sesión activa (Web y Mobile)

Flujo distinto al de recuperación: acá el usuario **ya está autenticado** y la petición viaja
con el token. Disponible para los cuatro roles a través de `POST /auth/me/cambiar-password`,
que resuelve la tabla del usuario a partir del rol del token (nunca de un id enviado por el
cliente). En el caso del médico, además limpia la marca `debe_cambiar_password` que dejan las
contraseñas temporales de la importación masiva.

| Plataforma | Dónde | Acceso |
|------------|-------|--------|
| Web | `/dashboard/cambiar-password` | Botón **Cambiar Contraseña** en `/dashboard/profile`, y el aviso de contraseña temporal del dashboard (solo médicos importados) |
| Mobile | Pestaña **Datos** → tarjeta *Seguridad* | Paciente |

`POST /medicos/me/cambiar-password` se mantiene como **alias de compatibilidad** para clientes
ya publicados; delega en el mismo handler y sigue restringido a médicos.

#### ✉️ Verificación de cuenta por correo.

Los **pacientes y médicos que se autoregistran** desde la web deben verificar su correo
electrónico **antes del primer acceso**. El registro crea la cuenta pero **no** devuelve
ningún token de sesión:

| Método | Endpoint | Uso |
|--------|----------|-----|
| POST | `/auth/verify-email` | Verificar la cuenta con el token del enlace (recibe `token`) |
| POST | `/auth/resend-verification` | Reenviar el correo de verificación (recibe `email`) |

**Flujo web:**

```
/register  →  /register/paciente ó /register/medico  →  cuenta pendiente
           →  correo de verificación  →  «Revisá tu correo»
           →  /verify-email?token=…   →  cuenta verificada  →  /login  →  dashboard
```

El correo incluye **solo un enlace**, armado con `FRONTEND_URL`
(`{FRONTEND_URL}/verify-email?token=…`). No se envían contraseñas. El enlace es de un solo
uso y vence según `EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS` (48 h por defecto); al reenviarlo
se invalidan los enlaces anteriores. Si se entra a `/verify-email` sin token —o el enlace
venció— la página ofrece el formulario de reenvío, igual que el enlace que aparece en
`/login` cuando falta verificar.

Intentar iniciar sesión sin verificar devuelve **403** con el mensaje
«Debés verificar tu correo electrónico antes de iniciar sesión.» (nunca «Credenciales
incorrectas»). La cuenta de paciente es la misma en web y mobile: quien se registra desde
la app verifica con el enlace de la web y después puede entrar desde cualquiera de las dos.

> ⚠️ **Solo aplica al autoregistro público.** Administradores, coordinadores, las cuentas
> que ya existían y los **médicos creados por la importación masiva** siguen entrando como
> siempre: el campo `email_verificado` nace en `true` y únicamente el autoregistro lo pone
> en `false`. La migración deja todas las filas existentes como verificadas.

> 🔒 La respuesta de `/auth/resend-verification` es **siempre genérica** (exista o no el
> email, y esté o no ya verificado) para no revelar qué cuentas están registradas. El token
> se guarda **solo hasheado** (SHA-256), igual que el de recuperación de contraseña, pero en
> una tabla aparte: verificar el correo y restablecer la contraseña son operaciones distintas.

> 💡 Con SMTP sin configurar, el autoregistro **crea la cuenta pero el correo no sale**, así
> que la cuenta no podrá iniciar sesión. En desarrollo, tomá el enlace de los logs del
> backend o configurá SMTP; `/auth/resend-verification` es la vía de rescate.

#### 🔤 Normalización de datos guardados

Dos migraciones de datos corrigen valores que ya estaban en la base y que el código actual
ya maneja bien, pero que rompían comparaciones o se veían mal en pantalla.

**Emails en minúsculas** (`a1b2c3d4e5f7`). El email es la credencial de login. Hasta ahora
el alta lo guardaba tal cual se tipeaba y `/auth/login` lo comparaba de forma exacta: una
cuenta creada como `Juan@Gmail.com` devolvía **401** al escribirla en minúsculas, y
`/auth/forgot-password` —que sí normalizaba antes de comparar— nunca la encontraba, así que
respondía 200 sin generar token ni enviar nada. La migración normaliza las cuatro tablas de
usuarios y las de tokens.

> ⚠️ La migración **aborta sin tocar nada** si detecta colisiones (dos cuentas que sólo se
> diferencian por mayúsculas), porque las cuatro tablas tienen `email` único y `/auth/login`
> las recorre en orden quedándose con la primera coincidencia. En ese caso hay que resolver
> los duplicados a mano y volver a correrla.

**Textos de formularios** (`b7c8d9e0f1a2`). Algunos formularios quedaron guardados con los
escapes Unicode como caracteres literales, así que el paciente leía
`\u00bfC\u00f3mo se ha sentido?` en lugar de `¿Cómo se ha sentido?`. El alcance es
deliberadamente acotado a la tabla `formularios` (`titulo`, `descripcion` y los textos
dentro del JSON `preguntas`): **no** toca `respuestas_formularios` ni los nombres de
pacientes, que son datos escritos por usuarios. Es idempotente —sólo actualiza las filas que
efectivamente cambian—, así que correrla de nuevo no hace nada.

`normalizarTextoVisible` (`apps/web/src/lib/text.ts` y su par en mobile) sigue existiendo
como red de seguridad al renderizar, para los datos que la migración no reescribe.

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


#### 🧱 Constructor de formularios compartido

`apps/web/src/components/FormularioBuilder.tsx` es la **única** definición de la interfaz de
armado de preguntas: la consumen tanto `/dashboard/medico/formularios/crear` como
`/dashboard/medico/formularios/[id]/editar`, junto con los helpers que exporta
(`validarFormulario`, `limpiarPreguntas`, `generarIdPregunta`). Antes la pantalla de edición
era una copia divergente de la de creación, así que las validaciones y los tipos de pregunta
soportados no coincidían entre una y otra.

#### ⏳ Vencimiento de las asignaciones

`expirado` es un **estado derivado, nunca persistido**: sale de comparar `fecha_expiracion`
con las **00:00 de hoy**, de modo que un formulario que *vence hoy* todavía se puede
responder. La comparación es por fecha y no por instante a propósito: `fecha_expiracion` se
guarda como `DateTime` sin zona, escrito desde la hora local del médico, mientras el resto
del backend usa `datetime.utcnow()`; comparar la hora exacta lo vencía 3-4 horas antes de lo
que muestra la pantalla.

La regla vive **espejada en las tres capas** — si se cambia una, hay que cambiar las tres:

| Capa | Archivo | Funciones |
|------|---------|-----------|
| 🔧 Backend | `apps/backend/app/utils/formularios.py` | `inicio_de_hoy`, `esta_vencida`, `estado_visible` |
| 🌐 Web | `apps/web/src/lib/formularios.ts` | `estaVencida`, `asignacionVencida` |
| 📱 Mobile | `apps/mobile/src/lib/formularios.ts` | `estaVencida` |

Además, responder una asignación **vencida, ajena, ya respondida o cancelada** ahora se
rechaza en el backend. Antes el bloqueo existía sólo en la interfaz y se salteaba llamando
la API directamente.

#### 🔁 Envío idempotente y reconciliación

El problema que se resolvió no es de red sino de **epistemología**: un `POST` que no devuelve
respuesta **no significa que el servidor no lo haya procesado**, significa que no sabemos si
lo procesó. Entre el teléfono y el proceso FastAPI hay un pool de conexiones de OkHttp y dos
saltos del proxy de Railway (edge → origen), y cualquiera de ellos puede perder la
*respuesta* de un POST que ya commiteó. Tratar ese caso como un fallo es lo que hacía que un
paciente viera «no se pudo enviar» para un formulario que sí se había guardado.

**En el backend** (`POST /formularios/asignaciones/{id}/responder`):

- Acepta un `idempotency_key` opcional (se recorta a 64 caracteres) y devuelve
  `duplicado: true|false`. Reenviar el **mismo** intento responde `200`, no un `400` engañoso.
- La comprobación de idempotencia va **antes** de las guardas de estado y vencimiento: el
  envío original fue válido, así que rechazarlo ahora le mostraría un error al paciente por
  un dato que sí quedó guardado.
- `with_for_update()` serializa dos envíos concurrentes de la misma asignación (el doble tap).
- La constraint `uq_respuestas_asignacion_idempotency` es la última línea de defensa: si el
  lock no alcanzara, el `IntegrityError` se traduce a la misma respuesta idempotente en lugar
  de duplicar la respuesta del paciente.
- Trazas `[FORM_SUBMIT][START|COMMIT_OK|RESPONSE|RECHAZADO|ERROR]` con asignación, clave y
  `duration_ms`. **Nunca** se loguea el contenido de `respuestas`: son datos médicos.

**En el cliente** (`packages/api-client/src/envio-formulario.ts`):

`enviarRespuestaFormulario` y `verificarEnvioFormulario` devuelven **tres** estados, no dos:

| Estado | Significado | Qué hace la UI |
|--------|-------------|----------------|
| `guardado` | El servidor tiene la respuesta (`duplicado` dice si la creó esta llamada) | Confirma y vuelve |
| `no-guardado` | El servidor confirma que no hay nada guardado (`rechazado` por regla de negocio, o `red`) | Muestra el motivo; reintentar es seguro |
| `indeterminado` | Se perdió la respuesta y tampoco se pudo verificar | **No afirma nada**: avisa que puede haberse guardado y ofrece *Verificar* |

La reconciliación es **siempre una LECTURA** contra
`GET /formularios/mis-asignaciones/{id}/mi-respuesta`, que es la única fuente de verdad:
nunca reintenta la escritura por su cuenta. Los códigos `401/403/404/422` se dan por
rechazados sin gastar una consulta; el `400` y los `5xx` quedan fuera de esa lista
justamente porque son ambiguos.

**La clave de idempotencia** (`apps/mobile/src/lib/idempotencia.ts`) se persiste **por
asignación** en `AsyncStorage` y no en un `useRef`: un `useRef` muere con el montaje de la
pantalla, así que un reintento después de navegar o de reabrir la app mandaría una clave
nueva, el backend lo vería como un segundo envío sobre una asignación ya completada y
respondería 400. Se borra únicamente cuando el envío queda **confirmado**.

> 📝 Migraciones: `a1b2c3d4e5f6` agrega la columna y `c2d3e4f5a6b7` la constraint única
> `(asignacion_id, idempotency_key)`. Deliberadamente **no** se agregó `UNIQUE(asignacion_id)`:
> si en producción quedó alguna asignación con dos respuestas anteriores a la guarda «no se
> puede responder dos veces», crear esa constraint haría fallar `alembic upgrade head` y
> dejaría el contenedor de Railway en crash-loop.

#### 📊 Consulta consolidada de respuestas

`/dashboard/formularios/respuestas` reúne en una sola vista las asignaciones de formularios
—respondidas y pendientes— para **médicos y administradores**:

- Tabla compacta con una fila por asignación, paginada, con filtros por paciente
  (nombre o documento) y estado. El administrador puede además filtrar por médico tratante y
  por hospital.
- Modal de detalle con navegación **anterior / siguiente** (botones y flechas `←` `→`) que
  recorre sólo las filas con respuesta consultable, sin volver al listado.
- **El alcance por rol se refuerza en el backend**: el médico ve únicamente asignaciones de
  sus pacientes activos y los parámetros `medico_id` / `hospital_id` se **ignoran** para él
  (no amplían el alcance). Paciente y coordinador reciben `403`.
- El filtro `expirado` se traduce a SQL en lugar de aplicarse sobre la página ya paginada,
  para que el `total` y los ítems devueltos coincidan.
### 💬 Mensajería en Tiempo Real
- Chat paciente ↔ médico sobre **WebSocket**, autenticado con un **ticket JWT de corta duración**.
- Lista de conversaciones, contador de no leídos y marcado de leídos.
- Fallback REST para el envío de mensajes.

### 📥 Importación Masiva de Médicos
- Los coordinadores importan médicos desde un archivo **Excel (.xlsx)**.
- Generación de contraseñas temporales y envío de correos de bienvenida (SMTP).
- Plantilla descargable y exportación del padrón de médicos del hospital.

### 🩺 Gestión de Médicos por el Coordinador

Además de la importación masiva, el coordinador da de alta y edita médicos **de a uno**
desde `/dashboard/coordinador/medicos` (botón **Nuevo médico** → `/medicos/nuevo`, y
**Editar** → `/medicos/[id]/editar`).

- **El hospital nunca viaja en el request**: se deriva del coordinador autenticado. Por eso
  un coordinador no puede crear ni tocar médicos de otro hospital, ni aunque manipule el
  cuerpo de la petición o el `id` de la URL (un médico ajeno devuelve `403`).
- **El alta no define contraseña**: se genera una temporal, se envía por correo y el médico
  queda con `debe_cambiar_password = true`, exactamente igual que en la importación masiva.
- Un **fallo de SMTP no deshace el alta**. La respuesta trae `correo_enviado` y `advertencia`
  para que el portal pueda avisarlo sin perder el médico ya creado.
- La **edición** cubre nombre, documento, email, teléfono y especialidades. No toca el rol,
  la contraseña ni los hospitales: el vínculo médico↔hospital se sigue gestionando sólo por
  `/asignaciones`, y el esquema de actualización directamente no declara esos campos, así que
  no pueden llegar en el body.
- **Validaciones**: el email se normaliza y se compara sin distinguir mayúsculas (conservar
  el propio con otro casing no es un duplicado), el documento no puede repetirse, un teléfono
  vacío se guarda como `NULL` en vez de `""`, y las especialidades se **reemplazan** (una
  lista vacía las limpia).

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

### Robustez de la conexión

Dos detalles que no se ven en el diagrama pero explican fallas que parecían de red:

- **`pool_pre_ping=True` + `pool_recycle=1800`** en `apps/backend/app/db/db.py`. Sin esto,
  una conexión rancia del pool —el PostgreSQL gestionado cierra las ociosas— dejaba el
  request colgado hasta el timeout TCP del sistema operativo, muy por encima de los 30 s del
  cliente: el usuario veía «no se pudo conectar» aunque el servidor terminara procesando el
  pedido. `pool_pre_ping` descarta las conexiones muertas antes de usarlas y `pool_recycle`
  las renueva antes de que el otro extremo las cierre.
- El **chat WebSocket** persiste los mensajes vía `run_in_threadpool`, para que el I/O
  sincrónico de SQLAlchemy no bloquee el event loop mientras hay conexiones abiertas.

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
- **SMTP (stdlib)** — Envío de correos (recuperación de contraseña, verificación de cuenta, invitaciones de administrador, alta individual y masiva de médicos)

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
FRONTEND_URL=http://localhost:3000 # solo para desarrollo; ver nota abajo

# SMTP (opcional: si está vacío, el envío de correos se omite sin romper nada)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=Salud en Mapa
SMTP_STARTTLS=true

PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=30
ADMIN_INVITATION_TOKEN_EXPIRE_HOURS=48    # validez del enlace de invitación de admin
EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS=48  # validez del enlace de verificación de cuenta

LOG_LEVEL=INFO                            # nivel de logging de la app (DEBUG para más detalle)
```

> 💡 Si el bloque SMTP queda vacío, las **invitaciones de administrador se crean igual pero el correo no se
> envía** (el envío se omite sin cortar la operación). En desarrollo, tomá el enlace de los logs del backend.
> Lo mismo aplica a la recuperación de contraseña: la respuesta sigue siendo genérica aunque el correo no salga.

### Diagnosticar el envío de correos

Como todos los envíos capturan sus errores para no romper la operación en curso, un `200 OK` de
`/auth/forgot-password` no dice si el correo salió. Para saberlo hay dos vías:

- **`GET /auth/diagnostico-smtp`** (requiere token de administrador): informa la configuración SMTP
  efectiva —host, puerto, usuario, remitente, STARTTLS, si hay contraseña definida; nunca la
  contraseña— y el resultado real de conectar y autenticar contra el servidor. No envía ningún correo.
- **Los logs del backend**, que ahora distinguen los tres casos:
  `forgot-password: no hay ninguna cuenta con el email ...` (no se intentó enviar),
  `SMTP no configurado: ...` (faltan variables de entorno),
  `SMTP falló al enviar a ...` (el proveedor rechazó) y
  `Correo enviado a ... — asunto: ...` (salió correctamente).

> ⚠️ **SMTP es necesario para el autoregistro.** Los pacientes y médicos que se registran solos
> quedan pendientes de verificar su correo, así que sin SMTP configurado la cuenta se crea pero **no puede
> iniciar sesión**. Configurá SMTP o usá `/auth/resend-verification` una vez configurado.

> ⚠️ **`FRONTEND_URL` en producción** debe ser el dominio público de la web
> (`https://www.saludenmapa.com`), porque de ahí salen los enlaces de recuperación de contraseña,
> de invitación de administradores y de verificación de cuenta. El valor por defecto en el código ya
> es ese dominio (`app/core/config.py`); `http://localhost:3000` es únicamente para desarrollo local.

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
│   │   │   ├── db/              # Engine (pool_pre_ping), sesión y Base de SQLAlchemy
│   │   │   ├── models/          # Modelos SQLAlchemy (pacientes, médicos, hospitales, ...)
│   │   │   ├── schemas/         # Esquemas Pydantic
│   │   │   ├── routers/         # Endpoints por dominio (auth, pacientes, mensajes, ...)
│   │   │   ├── services/        # Lógica de negocio (coordinador, médico, email)
│   │   │   ├── utils/           # Reglas compartidas (vencimiento de asignaciones)
│   │   │   ├── scripts/         # Utilidades (create_first_admin)
│   │   │   └── main.py          # App FastAPI + montaje de routers + CORS
│   │   ├── alembic/             # Migraciones de base de datos
│   │   ├── tests/               # Pytest (conftest + suites por dominio)
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── requirements.txt
│   │
│   ├── web/                     # 🌐 Portal Next.js 14 (staff + vistas de paciente)
│   │   └── src/
│   │       ├── app/             # App Router: login, register, aceptar-invitacion-admin, dashboard/{admin,coordinador,medico,paciente}
│   │       ├── components/      # Chat, LocationPicker, mapas (Leaflet), FormularioBuilder, etc.
│   │       ├── lib/             # Reglas de vencimiento (formularios.ts) y normalización de texto (text.ts)
│   │       └── store/           # Estado de sesión (Zustand)
│   │
│   └── mobile/                  # 📱 App Expo / React Native (pacientes)
│       ├── app/                 # Expo Router: (auth) y (tabs): datos, formularios, respuestas, hospitales, mensajes
│       ├── src/                 # components, hooks, lib (api/auth/idempotencia), store, theme
│       ├── app.json             # Config Expo (com.covid19monitor.app)
│       ├── app.config.js        # Inyecta la Google Maps API key desde el entorno
│       └── eas.json             # Perfiles de build EAS
│
├── packages/
│   ├── shared-types/            # 📦 @chronic-covid19/shared-types (tipos/enums TS)
│   └── api-client/              # 📦 @chronic-covid19/api-client (Axios + Zod)
│       └── src/envio-formulario.ts  # Envío con reconciliación + su suite de Vitest
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
| POST | `/auth/register` | Registrar paciente (alias de `/register/paciente`); **no devuelve token**, requiere verificar el email | ❌ |
| POST | `/auth/register/paciente` | Registrar paciente; **no devuelve token**, requiere verificar el email | ❌ |
| POST | `/auth/register/medico` | Registrar médico; **no devuelve token**, requiere verificar el email | ❌ |
| POST | `/auth/register/coordinador` | Registrar coordinador (devuelve token, sin verificación) | ❌ |
| POST | `/auth/login` | Iniciar sesión (OAuth2 form) | ❌ |
| GET | `/auth/me` | Usuario autenticado actual | ✅ |
| POST | `/auth/me/cambiar-password` | Cambiar la propia contraseña (cualquier rol; el usuario sale del token) | ✅ |
| POST | `/auth/forgot-password` | Solicitar recuperación de contraseña | ❌ |
| POST | `/auth/reset-password` | Restablecer contraseña con token | ❌ |
| POST | `/auth/verify-email` | Verificar la cuenta con el token del correo | ❌ |
| POST | `/auth/resend-verification` | Reenviar el correo de verificación | ❌ |

### 🧑 Pacientes — `/pacientes`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/pacientes/{id}` | Obtener paciente | ✅ Alcance por rol |
| PUT | `/pacientes/{id}` | Actualizar paciente | 🧑 Propio / 🛡️ Admin |
| GET | `/pacientes/{id}/formularios` | Respuestas de formularios del paciente | ✅ Alcance por rol |
| POST | `/pacientes/{id}/formularios` | Registrar una respuesta | 🧑 Propio |

> 🔒 **Alcance por rol.** Como en el resto del sistema, sobre qué paciente se puede operar
> se deriva del token y nunca de un parámetro del cliente
> (`verificar_acceso_a_paciente` en `app/core/deps.py`):
>
> | Rol | Alcance |
> |-----|---------|
> | 🧑 Paciente | Únicamente su propia ficha |
> | 🩺 Médico | Sus pacientes con asignación **activa** (misma regla que `/asignaciones/mis-pacientes`); sólo lectura |
> | 🧭 Coordinador | Pacientes de su hospital; sólo lectura |
> | 🛡️ Admin | Todos |
>
> Un paciente fuera de alcance responde `404`, igual que uno inexistente, para no confirmar
> qué ids existen. `hospital_id` sólo lo modifica un administrador: el vínculo
> paciente↔hospital se gestiona por `/asignaciones/paciente-hospital`.

> 📝 `POST /pacientes/{id}/formularios` es un alta directa que **no** valida asignación,
> vencimiento ni idempotencia. La web y la app no lo usan: envían por
> `POST /formularios/asignaciones/{id}/responder`, que sí aplica esas reglas. Se mantiene
> sólo por compatibilidad.

### 🩺 Médicos — `/medicos`
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/medicos/` | Listar médicos | ✅ |
| GET | `/medicos/me` | Perfil del médico autenticado | 🩺 Médico |
| POST | `/medicos/me/cambiar-password` | Alias de compatibilidad de `/auth/me/cambiar-password` | 🩺 Médico |
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
| POST | `/formularios/asignaciones/{id}/responder` | Responder un formulario asignado (idempotente vía `idempotency_key`) | 🧑 Paciente |
| GET | `/formularios/{id}/respuestas` | Respuestas de un formulario | 🩺 Creador |
| GET | `/formularios/asignaciones/{id}/respuesta` | Respuesta de una asignación | 🩺 Médico |
| GET | `/formularios/paciente/{id}/formularios-completados` | Formularios de un paciente | 🩺 Médico |
| GET | `/formularios/respuestas` | Listado consolidado de respuestas (paginado, filtros) | 🩺 Médico / Admin |
| GET | `/formularios/respuestas/{id}` | Detalle de respuesta (solo lectura) | 🩺 Médico / Admin |

> 🔁 `POST /formularios/asignaciones/{id}/responder` acepta un `idempotency_key` opcional en el
> cuerpo y devuelve `duplicado: true|false`; reenviar el mismo intento responde `200` en vez de
> «ya respondiste este formulario». `GET /formularios/respuestas` acepta `paciente`, `estado`
> (`pendiente` · `completado` · `expirado` · `cancelado`), `skip`, `limit` y —sólo para admin—
> `medico_id` y `hospital_id`. Ver [Envío idempotente y reconciliación](#-envío-idempotente-y-reconciliación).

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
| GET | `/coordinadores/me/medicos` | Médicos de su hospital (filtro `especialidad_id`) | 🧭 Coordinador |
| POST | `/coordinadores/me/medicos` | Alta de un médico en su hospital (contraseña temporal por correo) | 🧭 Coordinador |
| GET | `/coordinadores/me/medicos/{medico_id}` | Obtener un médico de su hospital | 🧭 Coordinador |
| PUT | `/coordinadores/me/medicos/{medico_id}` | Actualizar un médico de su hospital | 🧭 Coordinador |
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
pnpm test         # Corre los tests de los workspaces (turbo run test)
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

### 🧪 Pruebas

```bash
# Todo el monorepo (JS/TS)
pnpm test

# 🔧 Backend — 102 tests
cd apps/backend && pytest

# 📦 api-client — 19 tests (Vitest)
pnpm --filter @chronic-covid19/api-client test
```

| Suite | Tests | Qué cubre |
|-------|-------|-----------|
| `apps/backend/tests/test_coordinador_medicos.py` | 36 | Alta y edición de médicos por el coordinador: duplicados de email/documento, permisos y aislamiento entre hospitales |
| `apps/backend/tests/test_formularios_vencimiento.py` | 22 | Estado derivado `expirado`, guardas al responder (ajena, vencida, ya respondida) e idempotencia |
| `apps/backend/tests/test_auth_email_normalizacion.py` | 13 | Registro, login y recuperación de contraseña sin distinguir mayúsculas |
| `apps/backend/tests/test_pacientes_acceso.py` | 22 | Alcance de `/pacientes` por rol: propio, médico tratante, coordinador del hospital y admin |
| `apps/backend/tests/test_main.py` | 9 | Smoke: `/` y `/health`, y el camino público completo registro → verificación → login → perfil |
| `packages/api-client/src/envio-formulario.test.ts` | 19 | Los tres estados de la reconciliación del envío, sin red ni React Native |

Las cinco suites del backend corren sobre **SQLite en memoria** con `get_db` sobreescrito,
así que no necesitan una base PostgreSQL levantada. `tests/conftest.py` arma igualmente la
`DATABASE_URL` a partir del `.env` (saneando el BOM si lo hubiera) para los casos que sí la
requieran.

`envio-formulario.ts` pide sus dependencias como interfaz (`DependenciasEnvioFormulario`) y
recibe la espera como parámetro inyectable, justamente para poder probar la lógica de
decisión aislada y sin `sleep`.

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
