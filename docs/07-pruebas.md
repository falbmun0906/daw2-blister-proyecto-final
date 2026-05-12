# 07 - Pruebas y validación

La estrategia de pruebas de Blíster responde a la naturaleza del proyecto: una aplicación de salud doméstica donde un error de autenticación, stock, adherencia o permisos puede afectar directamente a la seguridad del usuario. Este capítulo describe los niveles de prueba implementados, las herramientas utilizadas, los comandos de ejecución y los criterios de validación aplicados durante el desarrollo.

## Índice
1. [Enfoque general](#1-enfoque-general)
   - 1.1 [Objetivo de las pruebas](#11-objetivo-de-las-pruebas)
   - 1.2 [Pirámide de pruebas del proyecto](#12-pirámide-de-pruebas-del-proyecto)
2. [Herramientas utilizadas](#2-herramientas-utilizadas)
3. [Pruebas del backend](#3-pruebas-del-backend)
   - 3.1 [Tests de modelos](#31-tests-de-modelos)
   - 3.2 [Tests de servicios](#32-tests-de-servicios)
   - 3.3 [Tests de rutas](#33-tests-de-rutas)
   - 3.4 [Tests E2E backend](#34-tests-e2e-backend)
4. [Pruebas del frontend](#4-pruebas-del-frontend)
   - 4.1 [Linting](#41-linting)
   - 4.2 [Build de producción](#42-build-de-producción)
   - 4.3 [Tests unitarios de componentes](#43-tests-unitarios-de-componentes)
   - 4.4 [E2E de navegador y accesibilidad](#44-e2e-de-navegador-y-accesibilidad)
   - 4.5 [Validación manual de interfaz](#45-validación-manual-de-interfaz)
5. [Pruebas de integración externa](#5-pruebas-de-integración-externa)
   - 5.1 [CIMA/AEMPS](#51-cimaaemps)
   - 5.2 [MCP](#52-mcp)
   - 5.3 [Correo y recuperación de contraseña](#53-correo-y-recuperación-de-contraseña)
   - 5.4 [Notificaciones push](#54-notificaciones-push)
6. [Integración continua](#6-integración-continua)
7. [Comandos de validación](#7-comandos-de-validación)
8. [Cobertura funcional alcanzada](#8-cobertura-funcional-alcanzada)
9. [Riesgos y pruebas pendientes](#9-riesgos-y-pruebas-pendientes)

---

## 1. Enfoque general

Las pruebas de Blíster se centran en validar reglas de negocio, contratos HTTP, persistencia y flujos críticos. No se persigue únicamente un porcentaje de cobertura, sino asegurar que las operaciones que modifican datos de salud se comportan de forma fiable.

### 1.1 Objetivo de las pruebas

Los objetivos principales son:

* Verificar que los modelos Mongoose aplican defaults, validaciones e índices.
* Comprobar que los servicios respetan reglas de permisos, stock, caducidad y adherencia.
* Validar que la API responde con códigos y estructuras correctas.
* Asegurar que la autenticación y la recuperación de contraseña no filtran información sensible.
* Confirmar que MCP respeta el contexto del usuario y sus blísteres accesibles.
* Detectar regresiones antes del despliegue mediante CI.

### 1.2 Pirámide de pruebas del proyecto

La pirámide se organiza así:

| Nivel | Herramienta | Alcance |
| :--- | :--- | :--- |
| Unitario backend | Jest | Funciones puras, utilidades y servicios aislados. |
| Modelos | Jest + Mongoose | Schemas, defaults, índices y validaciones. |
| Integración API | Jest + Supertest | Rutas Express en memoria. |
| E2E backend | Jest + Supertest + MCP SDK | Flujos completos REST, MCP y sincronización. |
| Frontend estático | ESLint + TypeScript + Vite build | Calidad sintáctica, tipado y compilación. |
| Componentes frontend | Vitest + React Testing Library | Renderizado y comportamiento visible de componentes. |
| Navegador real | Playwright + axe-core | Entrada pública, accesibilidad y regresiones en browser. |
| Manual funcional | Navegador | Flujos críticos de usuario. |

## 2. Herramientas utilizadas

| Herramienta | Uso |
| :--- | :--- |
| Jest | Ejecución de tests backend. |
| ts-jest | Soporte TypeScript en Jest. |
| Supertest | Peticiones HTTP sobre Express sin servidor externo. |
| mongodb-memory-server | MongoDB efímero para tests. |
| Vitest | Tests unitarios de frontend con entorno `jsdom`. |
| React Testing Library | Tests de componentes desde la perspectiva del usuario. |
| Playwright | Tests de navegador real. |
| @axe-core/playwright | Auditoría automatizada de accesibilidad. |
| ESLint | Linting frontend. |
| Vite build | Validación de producción frontend. |
| GitHub Actions | Integración continua. |

La configuración backend se divide en `jest.config.ts` para tests bajo `src` y `jest.e2e.config.ts` para tests bajo `backend/tests/e2e`. El frontend separa `vitest.config.ts` para unitarios y `playwright.config.ts` para navegador real.

## 3. Pruebas del backend

El backend concentra la mayor parte de pruebas automatizadas, ya que contiene las reglas de negocio y la persistencia.

### 3.1 Tests de modelos

Los tests de modelos validan que los schemas de Mongoose reflejan el dominio:

| Archivo | Entidad validada |
| :--- | :--- |
| `user.model.test.ts` | Usuario, settings, credenciales y soft delete. |
| `blister.model.test.ts` | Miembros, roles, invitaciones y `deletedAt`. |
| `medicine.model.test.ts` | Medicamentos, stock, caducidad y vínculo CIMA. |
| `treatment.model.test.ts` | Pautas, pacientes y medicamentos asociados. |
| `adherenceLog.model.test.ts` | Registros de toma y autoría. |
| `appointment.model.test.ts` | Citas y comentarios. |
| `notification.model.test.ts` | Tipos, severidad y lectura. |
| `pushSubscription.model.test.ts` | Endpoint push y claves. |
| `oauthToken.model.test.ts` | Tokens OAuth con expiración. |
| `passwordResetToken.model.test.ts` | Hash de token e índice TTL. |
| `cimaChangeLog.model.test.ts` | Cambios oficiales CIMA. |
| `systemMeta.model.test.ts` | Metadatos de sincronización. |

Estos tests ayudan a detectar cambios accidentales en defaults o índices antes de que afecten a servicios.

### 3.2 Tests de servicios

Los servicios se prueban para validar reglas de negocio sin depender de HTTP:

| Servicio | Reglas cubiertas |
| :--- | :--- |
| Auth | Registro, login, bcrypt, refresh token, MCP token y recuperación. |
| Blisters | Creación, invitación, límite de blísteres, roles y restore. |
| Medicines | Alta desde CIMA, edición, borrado y duplicados permitidos. |
| Treatments | Validación de medicamentos, paciente y actualización. |
| Adherence | Registro de toma, stock, toma forzada y deshacer. |
| Appointments | CRUD, comentarios, autoría y permisos. |
| Notifications | Stock, caducidad, adherencia forzada, CIMA, citas y dosis. |
| External | Adaptación de respuestas CIMA y errores externos. |
| CIMA sync | Procesamiento de registro de cambios. |

La lógica crítica de stock se prueba especialmente porque afecta al inventario y a las notificaciones.

### 3.3 Tests de rutas

Los tests de rutas verifican contratos HTTP:

* Códigos de respuesta.
* Envoltorio JSON.
* Rechazo sin token.
* Rechazo por rol insuficiente.
* Validación de body, params y query.
* Respuestas de error normalizadas.

Ejemplos de rutas cubiertas:

| Módulo | Archivo |
| :--- | :--- |
| Auth | `auth.routes.test.ts` |
| Blisters | `blisters.routes.test.ts` |
| Medicines | `medicines.routes.test.ts` |
| Treatments | `treatments.routes.test.ts` |
| Adherence | `adherence.routes.test.ts` |
| Appointments | `appointments.routes.test.ts` |
| External | `external.routes.test.ts` |
| Notifications | `notifications.routes.test.ts` |
| OAuth | `oauth.routes.test.ts` |

### 3.4 Tests E2E backend

Los tests E2E backend viven en `backend/tests/e2e`. Cubren flujos completos con servidor, base de datos en memoria y peticiones reales al stack Express.

| Suite | Flujo cubierto |
| :--- | :--- |
| `rest/auth.rest.spec.ts` | Registro, login y sesión. |
| `rest/blisters.rest.spec.ts` | Blísteres, miembros e invitaciones. |
| `rest/medicines.rest.spec.ts` | Inventario y alta de medicamentos. |
| `rest/adherence-notifications.rest.spec.ts` | Tomas, stock y notificaciones. |
| `mcp/mcp.spec.ts` | Conexión MCP y ejecución de tools. |
| `cima-sync/cima-sync.spec.ts` | Sincronización de cambios CIMA. |

Estos tests validan que las piezas funcionan juntas y no solo como unidades aisladas.

## 4. Pruebas del frontend

El frontend se valida mediante linting, tipado, build de producción, tests unitarios con Vitest/React Testing Library, una suite Playwright con auditoría axe y pruebas manuales de flujos críticos. Esta combinación evita que los estilos, rutas o componentes básicos se rompan sin detectar la regresión.

### 4.1 Linting

El comando principal es:

```bash
cd frontend
npm run lint
```

ESLint revisa reglas de TypeScript, React Hooks y React Refresh. Esta validación detecta problemas habituales como dependencias incorrectas en hooks o código no compatible con el entorno de Vite.

### 4.2 Build de producción

El build valida TypeScript y genera la PWA:

```bash
cd frontend
npm run build
```

El script ejecuta:

```text
tsc -b && vite build
```

Esto comprueba que las rutas, imports, servicios y componentes compilan correctamente para producción.

### 4.3 Tests unitarios de componentes

Vitest se configura en `frontend/vitest.config.ts` con entorno `jsdom`, alias del proyecto y exclusión explícita de `frontend/e2e/**`. Los tests de componentes viven junto al código fuente bajo `frontend/src` y usan React Testing Library.

El primer test automatizado cubre `EmptyState`, comprobando que el componente renderiza título, descripción y CTA visibles. Esta base permite extender la cobertura hacia formularios, cards y navegación sin mezclarla con pruebas de navegador real.

### 4.4 E2E de navegador y accesibilidad

Playwright se configura en `frontend/playwright.config.ts`. La suite vive en `frontend/e2e` y arranca la aplicación construida mediante `vite preview`. El test público inicial abre la entrada principal y ejecuta una auditoría `@axe-core/playwright`, fallando solo ante violaciones críticas.

Esta suite está separada de Vitest para que los tests unitarios sigan siendo rápidos y para que CI pueda ejecutar navegador real únicamente cuando corresponde.

### 4.5 Validación manual de interfaz

Los flujos manuales principales son:

1. Entrar en landing y onboarding.
2. Registrarse y comprobar creación de blíster inicial.
3. Iniciar sesión y cerrar sesión.
4. Solicitar recuperación de contraseña.
5. Abrir `/reset-password?token=...` y verificar estados de error.
6. Crear un blíster.
7. Invitar o unirse a un blíster.
8. Añadir medicamento desde CIMA.
9. Editar stock y umbral.
10. Crear tratamiento.
11. Registrar toma.
12. Deshacer toma dentro de la ventana permitida.
13. Crear cita y añadir comentario.
14. Modificar preferencias de notificación.
15. Generar y revocar token MCP.
16. Cambiar tema, fuente y tamaño de texto.

Esta validación se realiza en viewport móvil y en escritorio dentro del marco de dispositivo.

## 5. Pruebas de integración externa

Las integraciones externas requieren un enfoque distinto porque dependen de servicios fuera del repositorio.

### 5.1 CIMA/AEMPS

La integración con CIMA se valida con:

* Tests de servicio usando respuestas controladas.
* Tests de rutas para comprobar normalización de errores.
* Pruebas manuales desde el buscador de medicamentos.
* Comprobación de enlaces de prospecto y ficha técnica.

Los errores externos se traducen a respuestas controladas para que el frontend no dependa de detalles internos de la API oficial.

### 5.2 MCP

MCP se prueba en dos niveles:

* Tests unitarios de tools.
* E2E de servidor MCP.

Las comprobaciones principales son:

* El token identifica al usuario correcto.
* Las tools solo devuelven blísteres accesibles.
* Las operaciones de escritura respetan roles.
* Los parámetros se validan con schemas compartidos.
* Las respuestas devuelven texto JSON parseable para clientes MCP.

### 5.3 Correo y recuperación de contraseña

La recuperación se valida comprobando:

* Respuesta neutra para emails existentes y no existentes.
* Creación de `PasswordResetToken` con hash.
* Envío de email mediante servicio aislado.
* Caducidad del token.
* Consumo del token tras uso.
* Rechazo de token reutilizado.
* Rechazo de contraseña inválida.

En tests, el envío real se sustituye por mock del servicio de email.

### 5.4 Notificaciones push

Las notificaciones push se validan mediante:

* Tests de configuración pública VAPID.
* Registro y eliminación de suscripciones.
* Envío de notificaciones desde servicios.
* Limpieza de suscripciones inválidas.
* Preferencias de usuario por tipo de aviso.

Cuando las claves VAPID no están configuradas, el backend responde de forma controlada y evita fallos no capturados.

## 6. Integración continua

El workflow `.github/workflows/ci.yml` se ejecuta en pushes y pull requests a `main` y `dev`.

Los jobs actuales son:

| Job | Pasos |
| :--- | :--- |
| Backend | `npm ci`, `npm run lint`, `npm run test:coverage`, subida de cobertura y `npm run build`. |
| Frontend | `npm ci`, `npm run lint`, `npm test -- --run`, `npm run build`. |
| Frontend E2E | En PRs a `main`: `npm ci`, instalación de Chromium, `npm run build`, `npm run test:e2e`. |

El backend se ejecuta con `NODE_ENV=test`, `MONGODB_URI` de test y `JWT_SECRET` válido para CI. El frontend se construye con `VITE_API_URL` y `VITE_MCP_URL` apuntando al backend local de referencia.

## 7. Comandos de validación

Los comandos principales son:

### Backend

```bash
cd backend
npm test
npm run test:coverage
npm run test:e2e
npm run build
```

### Frontend

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
npm test -- --run
npm run coverage
npm run test:e2e
```

### Docker Compose

```bash
docker compose up -d --build
curl http://localhost:8080/api/v1/health
docker compose down
```

## 8. Cobertura funcional alcanzada

La cobertura funcional automatizada es especialmente sólida en backend. Los flujos críticos cubiertos incluyen:

| Área | Cobertura |
| :--- | :--- |
| Auth | Registro, login, refresh, recuperación y MCP token. |
| RBAC | Roles en servicios y rutas principales. |
| Multitenencia | Acceso por blíster y pertenencia. |
| Inventario | Stock, umbrales y caducidad. |
| Adherencia | Toma normal, toma forzada y deshacer. |
| Citas | CRUD y comentarios. |
| Notificaciones | Tipos principales, push y deduplicación. |
| MCP | Tools de lectura y escritura. |
| CIMA | Consulta externa y sincronización de cambios. |
| Frontend básico | Renderizado de componentes reutilizables y entrada pública con auditoría crítica de accesibilidad. |

## 9. Riesgos y pruebas pendientes

El estado actual deja identificadas varias líneas de mejora:

| Riesgo | Situación | Próxima validación |
| :--- | :--- | :--- |
| Componentes frontend con cobertura inicial | Existe suite Vitest/RTL, pero todavía no cubre formularios complejos ni navegación crítica. | Añadir tests a login, recuperación, cards de medicamento y flujos de permisos. |
| Accesibilidad automatizada inicial | Playwright/axe cubre la entrada pública crítica, pero no todas las pantallas privadas. | Ampliar auditoría a login, inventario, calendario y perfil. |
| Navegador real E2E inicial | Playwright está integrado, pero aún no cubre registro, inventario y toma completa con datos. | Añadir fixtures y flujos completos autenticados. |
| Push en navegadores reales | La lógica backend está cubierta, pero depende de permisos del navegador. | Probar Chrome/Android y navegador de escritorio compatible. |
| Cold start en Render | Puede afectar primeras peticiones en tier gratuito. | Registrar tiempos tras despliegue y documentar comportamiento. |

Esta estrategia permite entregar una base robusta en backend y una ruta clara de ampliación para pruebas visuales y de navegador real.
