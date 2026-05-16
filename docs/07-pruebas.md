# 07 - Pruebas y validación

La estrategia de pruebas de Blíster combina tests automatizados, validaciones de build, linting, pruebas de navegador y comprobaciones manuales. El objetivo es proteger las reglas críticas de salud doméstica: autenticación, permisos, stock, adherencia, citas, notificaciones, CIMA y MCP.

## Índice

1. [Enfoque de pruebas](#1-enfoque-de-pruebas)
2. [Herramientas utilizadas](#2-herramientas-utilizadas)
3. [Pruebas del backend](#3-pruebas-del-backend)
	- 3.1 [Tests de modelos](#31-tests-de-modelos)
	- 3.2 [Tests de servicios](#32-tests-de-servicios)
	- 3.3 [Tests de rutas](#33-tests-de-rutas)
4. [Pruebas del frontend](#4-pruebas-del-frontend)
	- 4.1 [Lint y build](#41-lint-y-build)
	- 4.2 [Tests unitarios](#42-tests-unitarios)
	- 4.3 [Playwright y accesibilidad](#43-playwright-y-accesibilidad)
5. [Pruebas del paquete shared](#5-pruebas-del-paquete-shared)
6. [Pruebas E2E e integración externa](#6-pruebas-e2e-e-integración-externa)
7. [Integración continua](#7-integración-continua)
8. [Comandos de validación](#8-comandos-de-validación)
	- 8.1 [Backend](#81-backend)
	- 8.2 [Frontend](#82-frontend)
	- 8.3 [Docker Compose](#83-docker-compose)
9. [Cobertura funcional alcanzada](#9-cobertura-funcional-alcanzada)
10. [Riesgos y pruebas pendientes](#10-riesgos-y-pruebas-pendientes)

## 1. Enfoque de pruebas

El proyecto no sigue TDD estricto en todas las funcionalidades, pero sí una estrategia incremental: implementar reglas de dominio, cubrirlas con tests de servicio o ruta, y validar el comportamiento de la interfaz con lint, build, Vitest y Playwright cuando corresponde.

La prioridad de prueba se define por riesgo:

| Riesgo | Tipo de prueba aplicado |
| :--- | :--- |
| Autenticación y recuperación | Tests de servicio, rutas y E2E REST. |
| Permisos por blíster | Tests de rutas y servicios con roles. |
| Stock y adherencia | Tests de servicio, rutas y E2E de notificaciones. |
| Integración CIMA | Tests de servicio con mocks y E2E de sincronización. |
| MCP/OAuth | Tests de rutas, servidor MCP y autorización. |
| UI crítica | Lint, build, componentes y Playwright/axe. |

La estrategia combina tres niveles. El primer nivel comprueba funciones y servicios de dominio; el segundo valida rutas HTTP completas con base de datos efímera; el tercero comprueba la aplicación desde navegador y desde comandos de despliegue. Esta combinación evita depender de un único tipo de prueba.

| Nivel | Objetivo | Ejemplo en Blíster |
| :--- | :--- | :--- |
| Unitario | Validar una regla pequeña de forma aislada. | Esquemas Zod, resolver de formularios y modelos. |
| Integración | Verificar colaboración entre módulos. | Servicios con modelos Mongoose y mocks externos. |
| E2E REST | Probar API completa con autenticación y datos reales de test. | Registro, blíster, medicamento, toma y notificación. |
| E2E navegador | Comprobar experiencia en navegador real. | Entrada pública, accesibilidad y rutas visibles. |
| Manual | Revisar flujos que dependen de permisos, dispositivos o credenciales. | Push, correo, instalación PWA y demo final. |

## 2. Herramientas utilizadas

| Herramienta | Uso |
| :--- | :--- |
| Jest | Tests backend. |
| ts-jest | Soporte TypeScript en Jest. |
| Supertest | Pruebas HTTP sobre Express. |
| mongodb-memory-server | MongoDB efímero en tests. |
| Vitest | Tests unitarios frontend. |
| React Testing Library | Renderizado de componentes desde la perspectiva del usuario. |
| Playwright | Pruebas de navegador real. |
| @axe-core/playwright | Auditoría automática de accesibilidad. |
| ESLint | Calidad frontend. |
| TypeScript | Validación estática de backend y frontend. |
| GitHub Actions | CI en pushes y pull requests. |

Las herramientas se eligieron para cubrir el ciclo completo de una aplicación full-stack. Jest y Supertest protegen el servidor; Vitest y React Testing Library permiten comprobar componentes sin abrir navegador completo; Playwright valida la aplicación construida; y Docker Compose confirma que el sistema puede arrancar como producto integrado.

El criterio de aceptación de una funcionalidad no es solo que compile. Debe cumplir validación de entrada, permisos, respuesta de error esperada, estado de interfaz y documentación suficiente para reproducir el comportamiento.

## 3. Pruebas del backend

El backend concentra la mayoría de pruebas automatizadas porque contiene reglas de negocio y acceso a datos.

Los tests utilizan una base MongoDB efímera para aislar cada ejecución. Esto permite validar índices, hooks, TTL, relaciones por `ObjectId` y consultas sin depender de una base local compartida. Las integraciones externas se sustituyen por mocks cuando sería inestable o inseguro llamar a servicios reales en CI.

### 3.1 Tests de modelos

Los modelos bajo `backend/src/models/_tests_` validan defaults, índices, enums, TTL y restricciones de esquema.

| Modelo | Aspectos validados |
| :--- | :--- |
| `User` | Credenciales, settings, email, tokens y borrado lógico. |
| `Blister` | Miembros, invitación, roles y `deletedAt`. |
| `Medicine` | CIMA, stock, unidad, umbral y caducidad. |
| `Treatment` | Paciente, medicamentos y pautas. |
| `AdherenceLog` | Autoría, estado, cantidad y timestamps. |
| `Appointment` | Paciente, tratamiento opcional y comentarios. |
| `Notification` | Tipo, severidad, lectura y descarte. |
| `PushSubscription` | Endpoint y claves push. |
| `PasswordResetToken` | Hash e índice TTL. |
| `EmailVerificationToken` | Hash, email e índice TTL. |
| `OAuthToken` | Refresh token y expiración. |
| `CimaChangeLog` | Tipo de cambio y registro oficial. |
| `SystemMeta` | Metadatos clave-valor. |

### 3.2 Tests de servicios

Los tests de servicio cubren reglas de negocio sin depender de HTTP.

| Suite | Reglas principales |
| :--- | :--- |
| `auth.service.test.ts` | Registro, login, perfil, recuperación, email y MCP token. |
| `blisters.service.test.ts` | Creación, límite, invitaciones, roles, borrado y restauración. |
| `medicines.service.test.ts` | Alta desde CIMA, edición, permisos y errores externos. |
| `treatments.service.test.ts` | Medicamentos asociados, paciente y validación de pautas. |
| `adherence.service.test.ts` | Stock, toma forzada, logs y deshacer. |
| `appointments.service.test.ts` | CRUD, comentarios y autoría. |
| `notifications.service.test.ts` | Stock, caducidad, push, recordatorios y deduplicación. |
| `external.service.test.ts` | Adaptación de CIMA y errores. |
| `me.service.test.ts` | Próximas dosis y calendario agregado. |
| `cima-sync.service.test.ts` | Sincronización de cambios oficiales. |

### 3.3 Tests de rutas

Las rutas se prueban con Supertest para validar códigos HTTP, envoltorios JSON, autenticación, permisos y validación de entrada.

| Módulo | Suite |
| :--- | :--- |
| Auth | `auth.routes.test.ts` |
| Blísteres | `blisters.routes.test.ts` |
| Medicamentos | `medicines.routes.test.ts` |
| Tratamientos | `treatments.routes.test.ts` |
| Adherencia | `adherence.routes.test.ts` |
| Citas | `appointments.routes.test.ts` |
| External | `external.routes.test.ts` |
| Notificaciones | `notifications.routes.test.ts` |
| OAuth | `oauth.routes.test.ts` |

Las rutas se prueban tanto en casos positivos como negativos. Los casos negativos son especialmente importantes: usuario sin sesión, usuario autenticado pero sin pertenencia al blíster, rol insuficiente, identificador inválido, body mal formado y recurso inexistente.

| Tipo de caso | Ejemplo esperado |
| :--- | :--- |
| Sin autenticación | `401 Unauthorized`. |
| Sin rol suficiente | `403 Forbidden`. |
| Parámetro inválido | `400 Bad Request` o `422` según validación. |
| Recurso inexistente | `404 Not Found`. |
| Operación correcta | `200`, `201` o `204` según método. |

## 4. Pruebas del frontend

El frontend se valida con herramientas estáticas y pruebas unitarias de componentes o utilidades.

### 4.1 Lint y build

```bash
cd frontend
npm run lint
npm run build
```

`npm run build` ejecuta `tsc -b && vite build`, por lo que valida tipado, imports, rutas y generación de la PWA.

### 4.2 Tests unitarios

Suites actuales:

| Archivo | Cobertura |
| :--- | :--- |
| `components/atoms/EmptyState.test.tsx` | Renderizado de título, descripción y CTA. |
| `lib/zod-form-resolver.test.ts` | Mensajes de validación y errores del resolver Zod. |

Comando:

```bash
cd frontend
npm test -- --run
```

La cobertura actual de frontend es intencionadamente más pequeña que la del backend. El motivo es que el proyecto concentró primero la protección de reglas críticas de datos y permisos. La ruta de mejora más directa es añadir tests a formularios críticos, porque son el punto donde el usuario introduce información sensible.

| Prioridad | Pantalla o componente | Motivo |
| :--- | :--- | :--- |
| Alta | Login y recuperación | Evitar regresiones de feedback y sesión. |
| Alta | Formularios de medicamento y tratamiento | Validan datos sanitarios y reglas complejas. |
| Media | Cards de medicamento/cita | Contienen estados, menús y acciones. |
| Media | Perfil y accesibilidad | Cambian preferencias globales. |
| Media | Notificaciones | Mezclan lectura, push y filtros. |

### 4.3 Playwright y accesibilidad

La suite `frontend/e2e/public-entry.spec.ts` abre la entrada pública y ejecuta una auditoría con axe. Playwright se ejecuta sobre `vite preview` en el puerto `4173`.

```bash
cd frontend
npm run build
npm run test:e2e
```

## 5. Pruebas del paquete shared

Los esquemas compartidos también tienen tests. Esto es importante porque un cambio en `shared` afecta a backend y frontend.

| Suite | Cobertura |
| :--- | :--- |
| `auth.schema.test.ts` | Login, registro, recuperación y mensajes de validación. |
| `blister-settings.schema.test.ts` | Blísteres, roles, invitaciones y preferencias. |
| `medicine.schema.test.ts` | Medicamentos, stock, unidad y CIMA. |
| `notification.schema.test.ts` | Notificaciones y push. |
| `treatment-appointment-adherence.schema.test.ts` | Tratamientos, citas y logs. |

Estas pruebas se ejecutan desde el backend porque Jest tiene configurado acceso al monorepo.

## 6. Pruebas E2E e integración externa

El backend incluye E2E bajo `backend/tests/e2e`.

| Suite | Flujo cubierto |
| :--- | :--- |
| `rest/auth.rest.spec.ts` | Registro, login y sesión. |
| `rest/blisters.rest.spec.ts` | Blísteres, miembros e invitaciones. |
| `rest/medicines.rest.spec.ts` | Inventario y alta de medicamentos. |
| `rest/adherence-notifications.rest.spec.ts` | Tomas, stock y notificaciones. |
| `mcp/mcp.spec.ts` | Conexión MCP y ejecución de tools. |
| `cima-sync/cima-sync.spec.ts` | Sincronización de cambios CIMA. |

Las integraciones externas se prueban con mocks cuando existe dependencia de red o credenciales. En pruebas manuales se validan búsquedas reales en CIMA, generación de tokens MCP y flujos de correo si `RESEND_API_KEY` está configurada.

Para la defensa se recomienda ejecutar una prueba manual guiada con datos controlados. El siguiente guion cubre el recorrido principal:

| Paso | Resultado esperado |
| :--- | :--- |
| Registrar usuario nuevo | Cuenta creada y blíster inicial disponible. |
| Añadir medicamento desde CIMA | Medicamento guardado con `nregist` y stock inicial. |
| Crear tratamiento | Pauta asociada al paciente y medicamento. |
| Registrar toma | Log creado, stock descontado y feedback visible. |
| Forzar toma sin stock | Confirmación explícita y notificación correspondiente. |
| Crear cita | Evento visible en calendario con comentarios. |
| Cambiar rol de miembro | Permisos actualizados en acciones visibles. |
| Generar token MCP | Token revocable y endpoint usable desde cliente compatible. |

## 7. Integración continua

El workflow `.github/workflows/ci.yml` se ejecuta en pushes y pull requests a `main` y `dev`.

| Job | Pasos |
| :--- | :--- |
| Backend | Checkout, Node 22, `npm ci`, lint, coverage, artefacto de cobertura y build. |
| Frontend | Checkout, Node 22, `npm ci`, lint, Vitest y build. |
| Frontend E2E | Solo en PR a `main`: Chromium, build y Playwright. |

La cobertura backend se publica como artefacto del workflow. El porcentaje exacto debe consultarse en el informe generado por el último run de `npm run test:coverage`, evitando fijar en la documentación una cifra que puede quedar obsoleta tras nuevos commits.

Para dejar evidencia final se debe guardar o capturar el último resultado de CI antes de la entrega. La tabla siguiente indica qué dato conviene adjuntar en la defensa o en anexos:

| Evidencia | Dónde obtenerla |
| :--- | :--- |
| Estado del workflow | Pestaña Actions del repositorio. |
| Cobertura backend | Artefacto generado por `npm run test:coverage`. |
| Build frontend | Log del job Frontend o ejecución local. |
| Playwright | Reporte HTML o salida de consola. |
| Docker Compose | `docker compose ps` y healthcheck. |

## 8. Comandos de validación

### 8.1 Backend

```bash
cd backend
npm run lint
npm test
npm run test:coverage
npm run test:e2e
npm run build
```

### 8.2 Frontend

```bash
cd frontend
npm run lint
npm test -- --run
npm run build
npm run test:e2e
```

### 8.3 Docker Compose

```bash
docker compose up -d --build
curl http://localhost:8080/api/v1/health
docker compose down
```

## 9. Cobertura funcional alcanzada

La cobertura automatizada es especialmente sólida en backend y shared. La cobertura frontend existe como base, aunque debe ampliarse para pantallas complejas.

| Área | Estado de cobertura |
| :--- | :--- |
| Auth | Registro, login, refresh, recuperación, confirmación y MCP token. |
| RBAC | Acceso por blíster, roles y operaciones no permitidas. |
| Inventario | Alta, edición, stock, CIMA y errores. |
| Tratamientos | Pautas, pacientes y medicamentos asociados. |
| Adherencia | Toma normal, toma forzada y deshacer. |
| Citas | CRUD y comentarios. |
| Notificaciones | Bandeja, push, stock, caducidad, dosis y citas. |
| MCP/OAuth | Tools principales, tokens y flujos de autorización. |
| CIMA sync | Registro de cambios oficiales. |
| Shared | Validación de esquemas de dominios principales. |
| Frontend | Componentes base, resolver de formularios, build y entrada pública con axe. |

Esta cobertura funcional permite defender que las reglas de servidor están protegidas. Para aspirar a la máxima calificación, la parte que más debe crecer es la evidencia de navegador: flujos autenticados, capturas de Playwright y auditorías axe en pantallas privadas.

| Área pendiente de evidenciar | Acción recomendada |
| :--- | :--- |
| Registro completo en navegador | Playwright con usuario temporal y limpieza posterior. |
| Alta de medicamento | Mock o fixture de CIMA para evitar dependencia externa. |
| Tratamiento y toma | Validar creación, registro y cambio de stock. |
| Accesibilidad privada | Ejecutar axe tras login en botiquín, calendario y perfil. |
| Responsive | Capturas móviles y de escritorio con marco de dispositivo. |

## 10. Riesgos y pruebas pendientes

| Riesgo | Situación actual | Mejora propuesta |
| :--- | :--- | :--- |
| Cobertura frontend limitada | Hay tests base de componente y utilidad. | Añadir login, recuperación, cards, formularios y permisos. |
| E2E autenticado | Playwright cubre entrada pública. | Añadir registro, alta de medicamento, tratamiento y toma con fixtures. |
| Accesibilidad en pantallas privadas | Axe se ejecuta en entrada pública. | Ampliar a login, botiquín, calendario y perfil. |
| Push real | Backend cubierto, depende de navegador y permisos. | Probar en Chrome/Android y escritorio compatible. |
| Correo real | Servicio preparado y mockeado. | Verificar con credenciales Resend de producción. |
| Rendimiento en producción | Healthcheck y despliegue validados. | Medir latencia tras cold start y carga ligera. |

La estrategia actual protege el núcleo de negocio y deja una ruta clara para ampliar pruebas visuales y de navegador en futuras iteraciones.
