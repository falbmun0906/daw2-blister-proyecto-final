# 06 - Desarrollo e implementación

El desarrollo de Blíster se ha realizado como una aplicación full-stack TypeScript con frontend React, backend Express, persistencia MongoDB, contratos compartidos con Zod, PWA y un endpoint MCP integrado. Este capítulo resume la secuencia de construcción, las decisiones técnicas, las dificultades encontradas, el control de versiones y fragmentos representativos del código.

## Índice

1. [Secuencia de desarrollo](#1-secuencia-de-desarrollo)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Backend](#3-backend)
  - 3.1 [Estructura de módulos](#31-estructura-de-módulos)
  - 3.2 [Configuración de Express](#32-configuración-de-express)
  - 3.3 [Modelos principales](#33-modelos-principales)
  - 3.4 [Módulos de dominio](#34-módulos-de-dominio)
4. [Frontend](#4-frontend)
  - 4.1 [Estructura principal](#41-estructura-principal)
  - 4.2 [Rutas y layouts](#42-rutas-y-layouts)
  - 4.3 [Estado global](#43-estado-global)
  - 4.4 [Servicios HTTP](#44-servicios-http)
  - 4.5 [PWA](#45-pwa)
5. [Contratos compartidos](#5-contratos-compartidos)
6. [Integraciones externas](#6-integraciones-externas)
7. [Seguridad y privacidad](#7-seguridad-y-privacidad)
8. [Control de versiones y CI](#8-control-de-versiones-y-ci)
9. [Dificultades y soluciones](#9-dificultades-y-soluciones)
10. [Fragmentos de código relevantes](#10-fragmentos-de-código-relevantes)
  - 10.1 [Registro de MCP antes del body parser](#101-registro-de-mcp-antes-del-body-parser)
  - 10.2 [Validación de ruta con pertenencia y rol](#102-validación-de-ruta-con-pertenencia-y-rol)
  - 10.3 [Esquema de pauta de tratamiento](#103-esquema-de-pauta-de-tratamiento)
  - 10.4 [Resolver Zod para formularios](#104-resolver-zod-para-formularios)

## 1. Secuencia de desarrollo

La implementación se realizó de forma incremental, empezando por una base técnica sencilla y ampliando el dominio conforme se estabilizaban las reglas principales.

| Fase | Trabajo realizado | Resultado |
| :--- | :--- | :--- |
| Base del monorepo | Creación de `frontend`, `backend`, `shared` y documentación. | Separación clara de capas. |
| Backend inicial | Express, conexión MongoDB, modelos y API REST base. | API versionada bajo `/api/v1`. |
| Autenticación | Registro, login, refresh token, perfil y recuperación de contraseña. | Sesión segura con JWT y bcrypt. |
| Multitenencia | Blísteres, miembros, roles e invitaciones. | Aislamiento por `blisterId`. |
| Dominio sanitario | Medicamentos, tratamientos, citas y logs de adherencia. | Flujo funcional de botiquín y tomas. |
| Notificaciones | Bandeja, preferencias, push y recordatorios. | Avisos internos y soporte Web Push. |
| CIMA/AEMPS | Búsqueda y consulta oficial de medicamentos. | Alta de medicamentos con fuente oficial. |
| MCP/OAuth | Endpoint `/mcp`, tools y flujo OAuth. | Interoperabilidad con asistentes externos. |
| Frontend PWA | Rutas, layouts, stores, servicios y SCSS. | Experiencia mobile-first instalable. |
| Seguridad, validación y docs | Auditoría, hardening, mensajes en español y documentación. | Proyecto estabilizado y documentado. |

La secuencia no fue estrictamente lineal. Algunas funcionalidades volvieron a revisarse cuando aparecieron requisitos transversales, especialmente roles, validación compartida, privacidad y MCP. Por ejemplo, la recuperación de contraseña obligó a reforzar tokens, rate limit y emails; MCP obligó a revisar permisos fuera de la interfaz tradicional; y la localización de errores obligó a comprobar todos los formularios, no solo el login.

| Bloque de trabajo | Evidencia en el proyecto | Motivo de prioridad |
| :--- | :--- | :--- |
| Contratos compartidos | `shared/schemas` | Evitar duplicar reglas entre formularios y API. |
| Autorización por rol | `authenticate`, `authorize`, `checkBlisterAccess` | Proteger datos sensibles por blíster. |
| Formularios críticos | Login, registro, perfil, medicamentos, tratamientos y citas | Garantizar feedback visible y coherente. |
| Integraciones | CIMA, Resend, Web Push y MCP | Añadir valor real sin mezclar responsabilidades. |
| Documentación | `docs/01` a `docs/10` | Centralizar decisiones, procesos y evidencias del sistema. |

La evolución del proyecto puede resumirse también por entregables:

| Entregable | Estado alcanzado |
| :--- | :--- |
| API REST | Rutas versionadas, Swagger, validación y roles. |
| Base de datos | Modelos Mongoose con relaciones lógicas e índices. |
| Interfaz PWA | Navegación móvil, rutas protegidas y estados de UI. |
| Seguridad | Autenticación, tokens hasheados, sanitización y rate limit. |
| Automatización | Tests, lint, build y CI por jobs. |
| Producción | Frontend Render, backend VPS y MongoDB Atlas. |

Esta lectura por entregables relaciona cada parte del alcance con una correspondencia técnica concreta dentro del repositorio.

## 2. Stack tecnológico

El stack combina tecnologías conocidas del entorno MERN con TypeScript en todas las capas.

| Capa | Tecnología | Uso |
| :--- | :--- | :--- |
| Frontend | React 18, Vite 6, TypeScript | Interfaz PWA. |
| Rutas | React Router 6 | Rutas públicas, privadas y de invitado. |
| Estado | Zustand | Sesión, blíster activo y UI. |
| Formularios | React Hook Form + Zod 4 | Validación y errores inline. |
| Estilos | Sass, ITCSS, BEM | Sistema visual escalable. |
| Backend | Node.js, Express 5, TypeScript | API REST y MCP. |
| Persistencia | MongoDB, Mongoose 9 | Modelos documentales e índices. |
| Seguridad | bcrypt, JWT, Helmet, CORS, rate limit, mongo-sanitize | Protección de credenciales y entradas. |
| Email | Resend | Recuperación y verificación de email. |
| Push | web-push | Suscripciones y recordatorios. |
| API externa | CIMA/AEMPS | Medicamentos oficiales. |
| Tests | Jest, Supertest, mongodb-memory-server, Vitest, Playwright | Validación automatizada. |
| Despliegue | Docker, Nginx, Render, VPS | Portabilidad y publicación. |

La elección del stack se apoya en tres criterios: mantener TypeScript de extremo a extremo, separar el dominio sanitario de los detalles de interfaz y facilitar el despliegue en contenedores. Express y Mongoose aportan flexibilidad para una API modular; React y Zustand permiten construir una PWA ligera; y Zod actúa como punto común de validación.

No se añadió un framework full-stack único porque el proyecto separa con claridad cliente, servidor, modelo de datos, API REST y despliegue. La organización por paquetes hace visible esa arquitectura y facilita auditar cada capa de forma independiente.

## 3. Backend

El backend concentra la lógica de negocio y las integraciones. La aplicación Express se crea en `backend/src/app.ts` y registra middlewares globales, rutas REST, Swagger, OAuth y MCP.

### 3.1 Estructura de módulos

```text
backend/src/
├── config/        Variables, base de datos y Swagger
├── constants/     Constantes de dominio, HTTP y seguridad
├── middleware/    Auth, autorización, validación, sanitización y errores
├── mcp/           Servidor MCP, contexto, registry y tools
├── models/        Modelos Mongoose
├── modules/       Auth, blisters, medicines, treatments, appointments, logs, etc.
├── types/         Tipos TypeScript de dominio
└── utils/         Utilidades transversales
```

Cada módulo principal sigue el patrón:

```text
routes -> controller -> service -> model
```

Esta separación permite que las rutas declaren la superficie pública, los controladores traduzcan HTTP a llamadas de dominio, los servicios acumulen reglas de negocio y los modelos representen persistencia. Las validaciones Zod y permisos se colocan antes del controlador siempre que es posible, para que la lógica interna reciba datos ya normalizados.

| Pieza | Qué debe contener | Qué evita |
| :--- | :--- | :--- |
| Ruta | Método, path y cadena de middlewares. | Mezclar transporte con reglas de negocio. |
| Controlador | Lectura de `req`, llamada al servicio y respuesta. | Consultas directas a MongoDB desde HTTP. |
| Servicio | Reglas de dominio y coordinación entre modelos. | Duplicar comportamiento entre rutas. |
| Modelo | Esquema, índices y hooks de Mongoose. | Validaciones de negocio dependientes del transporte. |

### 3.2 Configuración de Express

La configuración global incluye:

| Elemento | Implementación |
| :--- | :--- |
| Seguridad de cabeceras | `helmet` y `app.disable('x-powered-by')`. |
| CORS | Lista de orígenes desde `CLIENT_ORIGIN` y `CLIENT_ORIGINS`. |
| MCP | `/mcp` se registra antes de los parsers para permitir stream HTTP. |
| Parsers | `express.json` y `express.urlencoded` con límite de tamaño. |
| Sanitización | Middleware propio basado en `mongo-sanitize`. |
| Logs | Morgan fuera de entorno de test. |
| Swagger | `/api/v1/docs`. |
| Errores | 404 y middleware global de error. |

### 3.3 Modelos principales

| Modelo | Función destacada |
| :--- | :--- |
| `UserModel` | Credenciales, email, settings, refresh token, MCP token y `deletedAt`. |
| `BlisterModel` | Miembros, roles, invitación y borrado lógico. |
| `MedicineModel` | Datos oficiales CIMA y datos locales de stock/caducidad. |
| `TreatmentModel` | Pautas por paciente, medicamentos y horarios. |
| `AdherenceLogModel` | Trazabilidad de tomas y stock. |
| `AppointmentModel` | Citas y comentarios con autoría. |
| `NotificationModel` | Bandeja por usuario y severidad. |
| `PushSubscriptionModel` | Endpoints Web Push. |
| `PasswordResetTokenModel` | Recuperación con hash y TTL. |
| `EmailVerificationTokenModel` | Confirmación de correo con hash y TTL. |
| `OAuthTokenModel` | Tokens OAuth con expiración. |
| `CimaChangeLogModel` | Cambios oficiales detectados. |
| `SystemMetaModel` | Estado de procesos internos. |

### 3.4 Módulos de dominio

| Módulo | Responsabilidad |
| :--- | :--- |
| `auth` | Registro, login, refresh, perfil, contraseña, email y MCP token clásico. |
| `blisters` | CRUD de blísteres, miembros, invitaciones, roles y restore. |
| `medicines` | Inventario y alta desde CIMA. |
| `treatments` | Tratamientos, pautas, paciente y medicamentos. |
| `adherence` | Registro, toma forzada y deshacer. |
| `appointments` | Citas y comentarios. |
| `notifications` | Bandeja, preferencias, stock, caducidad, push y recordatorios. |
| `external` | Proxy controlado hacia CIMA/AEMPS. |
| `me` | Vistas agregadas de próximas dosis y calendario. |
| `oauth` | Registro dinámico, autorización y token para clientes modernos. |
| `cima-sync` | Procesamiento de cambios oficiales. |
| `privacy` | Purga física de blísteres borrados tras la ventana de restauración. |

Los módulos con más carga de negocio son `blisters`, `medicines`, `treatments`, `adherence` y `notifications`, porque interactúan entre sí. Registrar una toma, por ejemplo, no solo crea un log: puede modificar stock, generar aviso de stock bajo, marcar una toma forzada y dejar trazabilidad del usuario que realizó la acción.

## 4. Frontend

El frontend implementa una PWA mobile-first con rutas públicas, privadas y de perfil.

### 4.1 Estructura principal

```text
frontend/src/
├── components/    Atoms, molecules, organisms y layouts
├── constants/     Rutas y constantes de interfaz
├── hooks/         Lógica reutilizable de datos y efectos
├── lib/           Utilidades, como resolver Zod para formularios
├── pages/         Pantallas conectadas a rutas
├── router/        Guards de rutas
├── scss/          ITCSS, tokens y componentes visuales
├── services/      Cliente Axios y servicios por dominio
├── stores/        Zustand
└── types/         Tipos de frontend
```

### 4.2 Rutas y layouts

`App.tsx` define las rutas con React Router. Las rutas se protegen mediante:

| Componente | Función |
| :--- | :--- |
| `GuestRoute` | Evita que usuarios autenticados vuelvan a registro o recuperación. |
| `LoginRoute` | Controla el acceso al login según onboarding. |
| `OnboardingRoute` | Gestiona primera entrada. |
| `PrivateRoute` | Bloquea pantallas privadas sin sesión. |
| `AppLayout` | Cabecera, navegación inferior y contenido privado. |
| `DesktopDeviceShell` | Puerta de uso móvil y marco de dispositivo en escritorio. |
| `PublicPageLayout` | Páginas públicas como privacidad. |

### 4.3 Estado global

Zustand se usa de forma acotada:

| Store | Responsabilidad |
| :--- | :--- |
| `auth.store` | Usuario autenticado, access token y refresh token. |
| `blister.store` | Contexto del blíster activo. |
| `ui.store` | Toasts, onboarding y estado de interfaz. |

Los tokens de sesión se guardan en `sessionStorage` para limitar su persistencia al ciclo del navegador.

La sesión no se resuelve únicamente en el store. El cliente Axios añade el token a cada petición, intenta refrescar cuando el servidor responde `401` y, si no puede recuperar sesión, limpia el estado para devolver al usuario a una ruta segura. Esto evita que la interfaz mantenga datos privados visibles tras caducar una credencial.

### 4.4 Servicios HTTP

El cliente HTTP se centraliza en `api.client.ts`. Añade Bearer token, normaliza errores, refresca sesión ante `401` y delega llamadas en servicios por dominio: `auth`, `blisters`, `medicines`, `treatments`, `appointments`, `adherence`, `notifications`, `external`, `me` y `mcp`.

Los servicios de frontend no construyen URLs dispersas en las pantallas. Cada página invoca funciones de dominio y recibe datos ya tipados, lo que reduce acoplamiento entre componentes visuales y rutas REST. Esta decisión también facilita cambiar un endpoint sin reescribir la interfaz completa.

### 4.5 PWA

Vite PWA configura manifest, registro automático, caché de assets y estrategias específicas para recursos CIMA. El service worker de push vive en `frontend/public/push-sw.js`.

## 5. Contratos compartidos

Los esquemas Zod de `shared/schemas` son la fuente común de validación para API y frontend.

| Schema | Uso |
| :--- | :--- |
| `auth.schema` | Login, registro, perfil, recuperación y cambio de contraseña. |
| `blister.schema` | Blísteres, miembros, invitaciones y ajustes. |
| `medicine.schema` | Alta, edición, listado y CIMA. |
| `treatment.schema` | Tratamientos y pautas. |
| `appointment.schema` | Citas y comentarios. |
| `adherence.schema` | Logs de toma. |
| `notification.schema` | Notificaciones y push. |
| `me.schema` | Próximas dosis y calendario. |
| `mcp.schema` | Parámetros de tools MCP. |

La interfaz usa un resolver propio, `createZodFormResolver`, porque la combinación de Zod 4 con el resolver externo usado inicialmente provocaba errores no capturados en formularios.

En la última iteración se añadió al contrato MCP el input de creación de citas. La tool `appointment_create` reutiliza el servicio existente de citas, por lo que hereda las mismas reglas que la API REST: rol OWNER o CAREGIVER, paciente miembro del blíster, tratamiento opcional perteneciente al mismo blíster y fecha futura.

La decisión de centralizar esquemas tiene una consecuencia importante: si se cambia una regla de negocio, como la longitud mínima de una contraseña o el formato de una hora de toma, el cambio debe hacerse en un único lugar. Frontend y backend pueden evolucionar coordinados y los tests de `shared` detectan regresiones en los contratos.

## 6. Integraciones externas

Blíster integra servicios externos para aportar valor funcional sin duplicar responsabilidades.

| Integración | Uso | Tratamiento de errores |
| :--- | :--- | :--- |
| CIMA/AEMPS | Búsqueda y ficha oficial de medicamentos. | El backend normaliza errores y evita exponer detalles internos. |
| Resend | Emails de recuperación y verificación. | En desarrollo puede omitirse la clave; en test se mockea el servicio. |
| Web Push | Recordatorios y avisos del navegador. | Si faltan claves VAPID, el backend responde de forma controlada. |
| MCP SDK | Tools para asistentes externos. | Valida token, usuario, permisos y parámetros. |

El registro de tools MCP queda centralizado en `backend/src/mcp/tool-registry.ts`. Las tools de escritura no implementan reglas paralelas: llaman a servicios de dominio ya probados para mantener una única fuente de permisos y validaciones.

## 7. Seguridad y privacidad

Las medidas aplicadas combinan seguridad de aplicación, control de acceso y privacidad desde el diseño.

| Medida | Implementación |
| :--- | :--- |
| Contraseñas | Hash bcrypt. |
| JWT | Access token y refresh token con rotación. |
| Refresh token | Hash en base de datos y expiración. |
| Recuperación y verificación | Tokens SHA-256 con TTL. |
| Rate limit | Registro, login y recuperación. |
| Entrada de datos | Zod, sanitización y límites de body. |
| Cabeceras | Helmet y CORS por origen. |
| Multitenencia | `checkBlisterAccess` antes de acceder a datos por blíster. |
| Autorización | Roles OWNER, CAREGIVER y OBSERVER. |
| MCP/OAuth | Tokens revocables y scopes controlados. |
| Privacidad | Borrado lógico, ventana de recuperación y purga programada. |

La auditoría de seguridad se centró en evitar accesos indirectos. No bastaba con comprobar que una ruta estuviera autenticada: era necesario validar que el recurso perteneciera a un blíster accesible por el usuario y que el rol tuviera permiso para modificarlo. Esta regla se repite en medicamentos, tratamientos, citas y adherencia.

## 8. Control de versiones y CI

El desarrollo usa Git con commits descriptivos en inglés y agrupados por intención: `feat`, `fix`, `docs`, `test` o `chore`.

La organización de commits busca que la revisión del histórico sea comprensible. Un cambio de validación, un ajuste visual y una modificación documental se separan cuando afectan a áreas distintas. Esta disciplina facilita defender la evolución del proyecto y revertir cambios concretos si fuera necesario.

La planificación se apoya en tareas por bloques funcionales: autenticación, blísteres, botiquín, tratamientos, calendario, notificaciones, integraciones, despliegue, pruebas y documentación. El seguimiento del proyecto se representa mediante sprint, estado, prioridad, estimación y categoría, de acuerdo con la metodología indicada en el enunciado.

<img width="2556" height="1240" alt="image" src="https://github.com/user-attachments/assets/cea07518-4f52-4f7f-aa39-94d6e9e9e656" />

<img width="2557" height="220" alt="image" src="https://github.com/user-attachments/assets/ed9e0d4a-d731-4bc4-8822-b938cb5486af" />

La integración continua se define en `.github/workflows/ci.yml` con tres jobs:

| Job | Validaciones |
| :--- | :--- |
| Backend | `npm ci`, `npm run lint`, `npm run test:coverage`, artefacto de cobertura y `npm run build`. |
| Frontend | `npm ci`, `npm run lint`, `npm test -- --run` y `npm run build`. |
| Frontend E2E | En pull requests a `main`: instalación de Chromium, build y Playwright. |

Los jobs de CI no sustituyen a la validación manual de producto, pero sí protegen los puntos técnicos más sensibles: compilación, lint, contratos compartidos, cobertura backend y pruebas de navegador configuradas. El objetivo es que un pull request no llegue a `main` con errores básicos de build o regresiones obvias.

## 9. Dificultades y soluciones

| Dificultad | Solución aplicada |
| :--- | :--- |
| Multitenencia con roles | Middleware de pertenencia y autorización por rol antes de controladores. |
| Zod 4 en formularios | Resolver propio basado en `safeParse` y errores anidados. |
| Evitar stock negativo | Regla de negocio con toma forzada explícita y notificación. |
| MCP en despliegue | Integración en el mismo Express para publicar un único puerto. |
| CORS en varios entornos | `CLIENT_ORIGIN` y `CLIENT_ORIGINS` normalizados. |
| Recuperación de contraseña segura | Respuesta neutra, token hasheado, TTL y consumo de token. |
| Privacidad RGPD | Borrado lógico, purga programada y política pública propia. |
| UX de escritorio | `DesktopDeviceShell` para mantener el diseño móvil sin duplicar layouts. |

Las dificultades más relevantes no fueron errores aislados, sino decisiones de frontera. Blíster debía ser lo bastante completo para representar un caso real, pero sin convertirse en una aplicación clínica profesional. Por eso se documenta que la app organiza información doméstica y enlaza fuentes oficiales, pero no diagnostica ni sustituye indicaciones médicas.

| Decisión | Alternativa descartada | Justificación |
| :--- | :--- | :--- |
| MongoDB documental | Base relacional clásica | El dominio requiere documentos con subestructuras, invitaciones, settings y comentarios embebidos. |
| Roles por blíster | Rol global de usuario | Una persona puede ser propietaria en un blíster y observadora en otro. |
| CIMA como fuente oficial | Alta manual completa | Reduce errores de transcripción y aporta `nregist`. |
| PWA mobile-first | Layout desktop primero | La toma de medicación ocurre principalmente desde móvil. |
| MCP con permisos reales | Endpoint externo separado sin contexto | Las tools deben respetar la misma autorización que la API. |

Otra dificultad fue mantener el alcance. Varias mejoras posibles, como escaneo EAN-13, informes PDF o sincronización offline de escrituras, se situaron como evolución posterior porque habrían añadido riesgo sobre el núcleo funcional: inventario, pautas, adherencia, permisos, API y despliegue.

La última fase se centró en pulido: mensajes de validación en español, revisión de accesibilidad básica, política de privacidad, coherencia visual y documentación. Ese trabajo no añade tantas pantallas nuevas, pero aumenta mucho la calidad percibida y la defendibilidad del proyecto.

## 10. Fragmentos de código relevantes

Estos fragmentos muestran decisiones representativas del desarrollo.

| Fragmento | Qué demuestra |
| :--- | :--- |
| Registro de MCP antes del parser | Orden correcto de middlewares en Express. |
| Ruta de medicamentos | Encadenado de validación, pertenencia y rol. |
| Esquema de tratamiento | Modelado de pautas sanitarias flexibles. |
| Resolver Zod | Adaptación técnica para UX de formularios fiable. |

### 10.1 Registro de MCP antes del body parser

```ts
if (mcpServerEnabled) {
  app.get('/mcp', handleMcpExpressRequest);
  app.post('/mcp', handleMcpExpressRequest);
  app.delete('/mcp', handleMcpExpressRequest);
}

app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(requestSanitizerMiddleware);
```

El transporte MCP necesita acceder al stream HTTP antes de que los parsers globales consuman el cuerpo de la petición. Por eso se registra antes de `express.json`.

### 10.2 Validación de ruta con pertenencia y rol

```ts
medicinesRouter.post(
  '/:blisterId/medicines',
  validate({ params: blisterMedicineParamsSchema, body: createMedicineSchema }),
  checkBlisterAccess,
  authorize(['OWNER', 'CAREGIVER']),
  medicinesCreateController,
);
```

La ruta exige autenticación global, valida parámetros y body, comprueba pertenencia al blíster y finalmente autoriza por rol antes de crear el medicamento.

### 10.3 Esquema de pauta de tratamiento

```ts
const treatmentMedicineSchema = new Schema({
  medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
  amount: { type: Number, required: true, min: 0.5 },
  firstDoseAt: { type: Date, required: true },
  scheduleType: { type: String, enum: ['interval', 'daily_times'], required: true },
  frequencyHours: { type: Number, min: 1, default: null },
  dailyDoseTimes: { type: [String], default: [] },
  isRecurring: { type: Boolean, required: true },
});
```

El modelo permite pautas por intervalo de horas o por horarios diarios concretos, cubriendo tratamientos recurrentes y puntuales.

### 10.4 Resolver Zod para formularios

```ts
export function createZodFormResolver<TFieldValues extends FieldValues>(
  schema: SafeParseSchema<TFieldValues>,
): Resolver<TFieldValues> {
  return async (values, _context, options) => {
    const parsed = schema.safeParse(values);

    if (parsed.success) {
      return {
        values: parsed.data,
        errors: {},
      };
    }

    const errors: Record<string, unknown> = {};
    const collectAll = options.criteriaMode === 'all';

    parsed.error.issues.forEach((issue, index) => {
      const message = getZodIssueMessage(issue);
      const type = issue.code || 'validation';
      const fieldError: FieldError = {
        type,
        message,
        types: collectAll ? { [`${type}-${index}`]: message } : undefined,
      };

      setNestedError(errors, issue.path.map(String), fieldError, collectAll);
    });

    return {
      values: {},
      errors: errors as FieldErrors<TFieldValues>,
    };
  };
}
```

El resolver evita que un `ZodError` llegue sin capturar a la interfaz y garantiza mensajes visibles junto al input afectado.

En conjunto, estas decisiones permiten que Blíster mantenga una base técnica coherente, segura y ampliable.
