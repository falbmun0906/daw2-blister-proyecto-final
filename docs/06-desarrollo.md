# 06 - Desarrollo e implementación

El desarrollo de Blíster se estructura como una aplicación MERN escrita en TypeScript, con contratos compartidos mediante Zod y una separación clara entre interfaz, API, servicios de dominio, modelos de persistencia e integración MCP. Este capítulo describe cómo se ha construido la solución, qué decisiones técnicas la sostienen y cómo se relacionan las diferentes capas del sistema.

## Índice
1. [Visión general técnica](#1-visión-general-técnica)
   - 1.1 [Stack principal](#11-stack-principal)
   - 1.2 [Organización del repositorio](#12-organización-del-repositorio)
2. [Backend](#2-backend)
   - 2.1 [Estructura de capas](#21-estructura-de-capas)
   - 2.2 [Configuración de Express](#22-configuración-de-express)
   - 2.3 [Modelos de datos](#23-modelos-de-datos)
   - 2.4 [Autenticación y recuperación de contraseña](#24-autenticación-y-recuperación-de-contraseña)
   - 2.5 [Módulos de dominio](#25-módulos-de-dominio)
3. [Frontend](#3-frontend)
   - 3.1 [Arquitectura React](#31-arquitectura-react)
   - 3.2 [Rutas y protección de acceso](#32-rutas-y-protección-de-acceso)
   - 3.3 [Estado global](#33-estado-global)
   - 3.4 [Servicios HTTP](#34-servicios-http)
   - 3.5 [PWA y notificaciones](#35-pwa-y-notificaciones)
4. [Contratos compartidos](#4-contratos-compartidos)
   - 4.1 [Uso de Zod](#41-uso-de-zod)
   - 4.2 [Validación y tipado](#42-validación-y-tipado)
5. [Integraciones externas](#5-integraciones-externas)
   - 5.1 [CIMA/AEMPS](#51-cimaaemps)
   - 5.2 [Resend](#52-resend)
   - 5.3 [Web Push](#53-web-push)
   - 5.4 [Model Context Protocol](#54-model-context-protocol)
6. [API REST](#6-api-rest)
   - 6.1 [Convenciones de respuesta](#61-convenciones-de-respuesta)
   - 6.2 [Grupos de endpoints](#62-grupos-de-endpoints)
7. [Seguridad y privacidad](#7-seguridad-y-privacidad)
8. [Calidad de código y mantenimiento](#8-calidad-de-código-y-mantenimiento)

---

## 1. Visión general técnica

Blíster utiliza una arquitectura cliente-servidor con persistencia documental. El frontend consume una API REST, el backend concentra la lógica de negocio y MongoDB almacena datos de usuarios, blísteres, medicamentos, tratamientos, citas, registros de adherencia, notificaciones y tokens.

### 1.1 Stack principal

| Capa | Tecnología | Función |
| :--- | :--- | :--- |
| Frontend | React 18, Vite, TypeScript | Interfaz PWA y experiencia de usuario. |
| Estilos | Sass, ITCSS, BEM | Sistema visual modular. |
| Estado | Zustand | Sesión, contexto de blíster e interfaz. |
| Formularios | React Hook Form + Zod | Validación y gestión de formularios. |
| Backend | Node.js, Express 5, TypeScript | API REST, autenticación y lógica de dominio. |
| Persistencia | MongoDB + Mongoose | Modelos documentales e índices. |
| Validación | Zod | Contratos compartidos. |
| Tests | Jest, Supertest, mongodb-memory-server, Vitest, React Testing Library, Playwright | Tests backend, componentes frontend y E2E de navegador. |
| PWA | vite-plugin-pwa, Workbox | Instalación, caché y service worker. |
| IA externa | MCP SDK | Endpoint remoto para asistentes. |

### 1.2 Organización del repositorio

```text
backend/
├── src/
│   ├── config/
│   ├── constants/
│   ├── middleware/
│   ├── mcp/
│   ├── models/
│   ├── modules/
│   ├── types/
│   └── utils/
frontend/
├── public/
├── src/
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── pages/
│   ├── router/
│   ├── scss/
│   ├── services/
│   ├── stores/
│   └── types/
shared/
└── schemas/
```

El directorio `shared` es una pieza clave del desarrollo: evita que frontend y backend definan manualmente los mismos contratos.

## 2. Backend

El backend actúa como núcleo de la aplicación. Expone la API REST, valida entradas, aplica autenticación, gestiona reglas de negocio y publica el endpoint MCP integrado.

### 2.1 Estructura de capas

Cada módulo sigue el flujo:

```text
Router -> Controller -> Service -> Model
```

| Capa | Responsabilidad |
| :--- | :--- |
| Router | Define rutas, middlewares y schemas de validación. |
| Controller | Recibe la petición validada, llama al servicio y construye la respuesta HTTP. |
| Service | Contiene reglas de negocio y operaciones de dominio. |
| Model | Define persistencia Mongoose e índices. |

Esta separación facilita testear servicios sin HTTP y rutas con Supertest.

### 2.2 Configuración de Express

La aplicación se crea en `backend/src/app.ts`. La configuración global incluye:

* `helmet` para cabeceras de seguridad.
* `cors` con origen controlado por `CLIENT_ORIGIN`.
* Endpoint MCP antes de los parsers globales para permitir que el transporte consuma el stream.
* `express.json` y `express.urlencoded` con límites de tamaño.
* Sanitización con `mongo-sanitize`.
* Logging HTTP con Morgan fuera del entorno de test.
* Swagger en `/api/v1/docs`.
* Middleware global de 404 y errores.

El endpoint de salud se publica en:

```text
GET /api/v1/health
```

### 2.3 Modelos de datos

Los modelos principales son:

| Modelo | Función |
| :--- | :--- |
| `User` | Identidad, credenciales, settings, tokens de sesión y MCP. |
| `Blister` | Workspace sanitario, miembros, roles, invitaciones y soft delete. |
| `Medicine` | Medicamento local vinculado a CIMA mediante `nregist`. |
| `Treatment` | Pautas, paciente, fechas y medicamentos asociados. |
| `AdherenceLog` | Registro de tomas y autoría. |
| `Appointment` | Citas médicas y comentarios. |
| `Notification` | Bandeja de avisos por usuario y tipo. |
| `PushSubscription` | Suscripciones Web Push por usuario. |
| `OAuthToken` | Refresh tokens OAuth/MCP hasheados. |
| `PasswordResetToken` | Tokens de recuperación hasheados con TTL. |
| `CimaChangeLog` | Cambios oficiales detectados desde CIMA. |
| `SystemMeta` | Metadatos de procesos internos. |

Los datos operativos se vinculan a `blisterId`, lo que permite separar inventarios y tratamientos entre espacios compartidos.

### 2.4 Autenticación y recuperación de contraseña

La autenticación combina access token y refresh token. Las contraseñas se hashean con bcrypt y los refresh tokens se almacenan hasheados en base de datos.

El flujo principal incluye:

| Endpoint | Función |
| :--- | :--- |
| `POST /api/v1/auth/register` | Crea usuario, sesión y blíster inicial. |
| `POST /api/v1/auth/login` | Autentica por email o usuario. |
| `POST /api/v1/auth/refresh` | Rota credenciales de sesión. |
| `PATCH /api/v1/auth/profile` | Actualiza perfil y preferencias. |
| `DELETE /api/v1/auth/account` | Borra lógicamente la cuenta e invalida accesos web, MCP y OAuth. |
| `POST /api/v1/auth/forgot-password` | Genera token de recuperación y envía email si existe usuario. |
| `POST /api/v1/auth/reset-password` | Valida token, actualiza contraseña y consume el token. |

La recuperación de contraseña usa `PasswordResetToken`, que almacena:

* `tokenHash` calculado con SHA-256.
* `userId`.
* `expiresAt`, con caducidad de 30 minutos.

El token en claro solo viaja en el enlace enviado por email. Al restablecer la contraseña, el backend elimina el token y limpia el refresh token activo del usuario.

### 2.5 Módulos de dominio

El backend se organiza por módulos funcionales:

| Módulo | Responsabilidad |
| :--- | :--- |
| `auth` | Registro, login, perfil, recuperación y tokens MCP clásicos. |
| `blisters` | Workspaces, miembros, invitaciones, roles y restauración. |
| `medicines` | Inventario local y sincronización con CIMA. |
| `treatments` | Pautas de tratamiento y planificación. |
| `adherence` | Registro y deshacer tomas. |
| `appointments` | Citas médicas y comentarios. |
| `notifications` | Bandeja, push, recordatorios y avisos. |
| `external` | Consultas a CIMA/AEMPS. |
| `me` | Vistas agregadas del usuario. |
| `oauth` | Registro dinámico y autorización para clientes MCP modernos. |
| `cima-sync` | Procesamiento de cambios oficiales de CIMA. |
| `privacy` | Purga física de blísteres eliminados tras el periodo de gracia RGPD. |

## 3. Frontend

El frontend está construido con React, Vite y TypeScript. Su responsabilidad es presentar una PWA mobile-first, consumir la API y mantener un estado de interfaz coherente.

### 3.1 Arquitectura React

La estructura de frontend separa:

| Directorio | Contenido |
| :--- | :--- |
| `components/atoms` | Controles básicos como botones, inputs, modales o skeletons. |
| `components/molecules` | Combinaciones reutilizables: buscador, selectores, badges. |
| `components/organisms` | Bloques complejos: header, bottom nav, cards, sheets. |
| `components/layout` | Estructuras de página y marco de dispositivo. |
| `pages` | Pantallas conectadas a rutas. |
| `hooks` | Lógica de datos y efectos reutilizables. |
| `services` | Cliente HTTP y llamadas a API. |
| `stores` | Estado global con Zustand. |
| `scss` | Sistema de estilos ITCSS. |

### 3.2 Rutas y protección de acceso

`frontend/src/App.tsx` define rutas con React Router. Las rutas se protegen mediante:

| Componente | Función |
| :--- | :--- |
| `GuestRoute` | Evita que usuarios autenticados accedan a login/registro/reset. |
| `LoginRoute` | Redirige a onboarding si todavía no se ha visto. |
| `OnboardingRoute` | Controla acceso al onboarding. |
| `PrivateRoute` | Bloquea pantallas privadas sin sesión. |

Las rutas privadas se envuelven con `AppLayout`, que añade cabecera y navegación inferior.

### 3.3 Estado global

Zustand se usa para el estado transversal:

| Store | Responsabilidad |
| :--- | :--- |
| `auth.store` | Usuario y tokens de sesión. |
| `blister.store` | Blíster activo y contexto de navegación. |
| `ui.store` | Toasts, onboarding y paneles de interfaz. |

Los tokens web se guardan en `sessionStorage`, no en `localStorage`, para limitar la persistencia a la sesión del navegador. El store de interfaz solo persiste flags no sensibles en `sessionStorage`; toasts, paneles y estados efímeros permanecen en memoria.

Los datos de servidor no se duplican de forma innecesaria en stores. Las pantallas usan hooks y servicios para cargar colecciones y refrescar estados.

### 3.4 Servicios HTTP

El cliente HTTP se centraliza en `frontend/src/services/api.client.ts`. Sus responsabilidades son:

* Configurar `baseURL` desde `VITE_API_URL`.
* Adjuntar `Authorization: Bearer` cuando existe access token.
* Normalizar errores de API en `ApiError`.
* Gestionar refresh de sesión ante respuestas `401`.

Cada dominio tiene su propio servicio:

| Servicio | Endpoints consumidos |
| :--- | :--- |
| `auth.service` | Autenticación y perfil. |
| `blisters.service` | Blísteres, miembros e invitaciones. |
| `medicines.service` | Inventario. |
| `treatments.service` | Tratamientos. |
| `appointments.service` | Citas y comentarios. |
| `adherence.service` | Historial y tomas. |
| `notifications.service` | Bandeja y push. |
| `external.service` | CIMA/AEMPS. |
| `me.service` | Vistas agregadas. |
| `mcp.service` | Token MCP de perfil. |

### 3.5 PWA y notificaciones

La PWA se configura en `frontend/vite.config.ts` mediante `vite-plugin-pwa`. La configuración incluye:

* Manifest con nombre, iconos, color de tema y modo standalone.
* Registro automático de actualizaciones.
* Caché de imágenes CIMA con estrategia `CacheFirst`.
* Caché de datos CIMA con `StaleWhileRevalidate`.
* Importación de `public/push-sw.js` para eventos push.

Las notificaciones push requieren claves VAPID configuradas en backend y permiso del navegador en frontend.

## 4. Contratos compartidos

Los contratos compartidos son una de las decisiones técnicas más importantes del proyecto. Evitan divergencias entre lo que el frontend envía y lo que el backend acepta.

### 4.1 Uso de Zod

Los schemas viven en `shared/schemas`. Desde ellos se derivan:

* Validaciones de formularios.
* Validaciones de rutas.
* Tipos TypeScript mediante `z.infer`.
* Contratos MCP.
* Contratos de notificaciones.

Ejemplos de dominios cubiertos:

| Schema | Uso |
| :--- | :--- |
| `auth.schema` | Login, registro, refresh, perfil y recuperación. |
| `blister.schema` | Blísteres, invitaciones y roles. |
| `medicine.schema` | Alta, edición y filtros de medicamentos. |
| `treatment.schema` | Pautas y tratamientos. |
| `appointment.schema` | Citas y comentarios. |
| `notification.schema` | Tipos y preferencias. |
| `mcp.schema` | Parámetros de tools MCP. |

### 4.2 Validación y tipado

En backend, el middleware `validate` aplica schemas sobre `body`, `params` y `query`. En frontend, los formularios usan `react-hook-form` junto a `@hookform/resolvers/zod`.

Esta doble validación cumple dos objetivos:

1. Mejorar la experiencia de usuario con feedback inmediato.
2. Garantizar seguridad en servidor aunque el cliente sea manipulado.

## 5. Integraciones externas

Blíster se apoya en integraciones externas para aportar valor real: información oficial, correo, push e interoperabilidad con IA.

### 5.1 CIMA/AEMPS

La integración CIMA permite buscar medicamentos por nombre comercial y consultar información oficial por `nregist`.

El backend actúa como intermediario:

```text
Frontend -> Backend /api/v1/external -> CIMA/AEMPS
```

Esto permite:

* Centralizar validación de `nregist`.
* Normalizar errores externos.
* Proteger al frontend de cambios de la API.
* Reutilizar la integración desde REST, jobs y MCP.

### 5.2 Resend

Resend se utiliza para enviar correos de recuperación de contraseña desde `ayuda@miblister.es`. El email incluye:

* HTML con estilos inline.
* Logo y colores de Blíster.
* Botón CTA hacia `/reset-password?token=...`.
* Versión `text` como fallback.

Si el email no existe, el endpoint responde igual que si existiera, evitando revelar usuarios registrados.

### 5.3 Web Push

El backend gestiona suscripciones push y envío mediante `web-push`. El frontend registra la suscripción del navegador y la asocia al usuario autenticado.

Los endpoints principales son:

| Endpoint | Función |
| :--- | :--- |
| `GET /api/v1/notifications/push/config` | Devuelve configuración pública VAPID. |
| `GET /api/v1/notifications/push/subscriptions` | Lista suscripciones del usuario. |
| `POST /api/v1/notifications/push/subscriptions` | Registra una suscripción. |
| `DELETE /api/v1/notifications/push/subscriptions` | Elimina una suscripción por endpoint. |

### 5.4 Model Context Protocol

MCP permite que asistentes externos operen sobre Blíster de forma controlada. El backend registra tools para:

| Tool | Tipo | Función |
| :--- | :--- | :--- |
| `blister_list` | Lectura | Lista blísteres accesibles. |
| `blister_members` | Lectura | Lista miembros y roles. |
| `inventory_query` | Lectura | Consulta inventario. |
| `medicine_catalog_search` | Lectura | Busca medicamentos en CIMA. |
| `medicine_lookup` | Lectura | Busca medicamentos registrados. |
| `medicine_add` | Escritura | Añade medicamento desde `nregist`. |
| `adherence_logger` | Escritura | Registra una toma. |
| `stock_modifier` | Escritura | Ajusta stock. |
| `schedule_assistant` | Lectura | Calcula próximas dosis. |
| `appointment_manager` | Lectura | Consulta citas. |
| `appointment_comment_manager` | Escritura | Gestiona comentarios. |
| `official_source_linker` | Lectura | Devuelve enlaces oficiales AEMPS/CIMA. |

El endpoint remoto vive en `/mcp` y utiliza Bearer token. También existe flujo OAuth para clientes compatibles con autorización moderna.

## 6. API REST

La API REST se versiona bajo `/api/v1`. La documentación Swagger se expone en `/api/v1/docs` durante la ejecución del backend.

### 6.1 Convenciones de respuesta

Las respuestas correctas siguen una envoltura común:

```json
{
  "success": true,
  "data": {}
}
```

Las colecciones paginadas incluyen `meta`:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Los errores se normalizan con código, mensaje y detalles opcionales:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data.",
    "details": []
  }
}
```

### 6.2 Grupos de endpoints

| Grupo | Base | Responsabilidad |
| :--- | :--- | :--- |
| Auth | `/api/v1/auth` | Sesión, perfil, recuperación y token MCP. |
| Blísteres | `/api/v1/blisters` | Workspaces, miembros e invitaciones. |
| Medicamentos | `/api/v1/blisters/:blisterId/medicines` | Inventario. |
| Tratamientos | `/api/v1/blisters/:blisterId/treatments` | Pautas. |
| Adherencia | `/api/v1/blisters/:blisterId/logs` | Tomas e historial. |
| Citas | `/api/v1/blisters/:blisterId/appointments` | Calendario y comentarios. |
| External | `/api/v1/external` | CIMA/AEMPS. |
| Me | `/api/v1/me` | Vistas agregadas del usuario. |
| Notificaciones | `/api/v1/notifications` | Bandeja y push. |
| OAuth/MCP | `/oauth`, `/.well-known`, `/mcp` | Interoperabilidad con agentes. |

## 7. Seguridad y privacidad

Las medidas principales son:

* Contraseñas hasheadas con bcrypt.
* JWT firmados con secreto mínimo de 32 caracteres.
* Refresh token hasheado en base de datos.
* Tokens MCP hasheados o gestionados mediante OAuth según flujo.
* Recuperación de contraseña con hash SHA-256 y TTL.
* Helmet y CORS configurado por origen.
* Sanitización de `body` y `params` para mitigar inyección NoSQL.
* Validación Zod en entradas.
* Middleware `checkBlisterAccess` para pertenencia y `authorize([...roles])` para permisos de escritura.
* Soft delete de blísteres con ventana de restauración.
* Purga física automática de blísteres eliminados tras el periodo de gracia.
* Respuestas neutrales en recuperación de contraseña.

La multitenencia se basa en `blisterId` y membresía. Las rutas comprueban pertenencia antes del controlador y bloquean acciones de escritura por rol; los servicios mantienen validaciones de dominio para preservar integridad ante cualquier entrada alternativa.

## 8. Calidad de código y mantenimiento

El mantenimiento del proyecto se apoya en:

* TypeScript para reducir errores de contrato.
* Servicios de dominio testables.
* Schemas compartidos.
* Tests unitarios, integración y E2E backend.
* Tests Vitest/RTL de componentes y suite Playwright/axe separada.
* CI con lint, cobertura backend, tests frontend, build y E2E de navegador en PRs a `main`.
* Documentación por capítulos.
* Docker Compose para reproducir entorno completo.

El desarrollo de nuevas funcionalidades debe respetar el patrón existente: crear schema compartido, implementar servicio backend, exponer ruta, añadir servicio frontend, conectar hook o pantalla y cubrir el flujo con tests cuando afecte a reglas de negocio.
