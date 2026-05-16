# 03 - Instalación y preparación del entorno

Este capítulo describe cómo preparar Blíster en local, qué dependencias necesita, qué variables de entorno utiliza y cómo validar el arranque con Node.js o con Docker Compose. Las instrucciones están pensadas para que el proyecto pueda reproducirse desde una copia limpia del repositorio.

## Índice

1. [Modalidades de ejecución](#1-modalidades-de-ejecución)
2. [Requisitos previos](#2-requisitos-previos)
3. [Estructura del repositorio](#3-estructura-del-repositorio)
4. [Variables de entorno](#4-variables-de-entorno)
  - 4.1 [Backend](#41-backend)
  - 4.2 [Frontend](#42-frontend)
  - 4.3 [Compose](#43-compose)
5. [Instalación local](#5-instalación-local)
  - 5.1 [Backend](#51-backend)
  - 5.2 [Frontend](#52-frontend)
  - 5.3 [Shared](#53-shared)
6. [Arranque de servicios](#6-arranque-de-servicios)
  - 6.1 [Base de datos](#61-base-de-datos)
  - 6.2 [Backend](#62-backend)
  - 6.3 [Frontend](#63-frontend)
7. [Validación con Docker Compose](#7-validación-con-docker-compose)
  - 7.1 [Arranque](#71-arranque)
  - 7.2 [Comprobaciones](#72-comprobaciones)
  - 7.3 [Parada](#73-parada)
8. [Comandos de mantenimiento](#8-comandos-de-mantenimiento)
9. [Problemas habituales](#9-problemas-habituales)

## 1. Modalidades de ejecución

Blíster puede ejecutarse de dos formas principales: localmente con Node.js y MongoDB, o de forma dockerizada con Compose. Ambas modalidades usan el mismo código y las mismas capas de aplicación.

| Modalidad | Uso recomendado | Servicios implicados |
| :--- | :--- | :--- |
| Desarrollo local | Programar, depurar, ejecutar tests y trabajar con recarga en caliente. | MongoDB local o Atlas, backend en `3000`, frontend en `5173`. |
| Docker Compose | Validar la portabilidad de la aplicación completa. | MongoDB 7, backend Node, frontend estático con Nginx en `8080`. |

El backend expone la API bajo `/api/v1`, la documentación Swagger en `/api/v1/docs` y el endpoint MCP en `/mcp` cuando `MCP_SERVER_ENABLED=true`.

## 2. Requisitos previos

La instalación requiere herramientas comunes de desarrollo web moderno.

| Herramienta | Versión recomendada | Motivo |
| :--- | :--- | :--- |
| Node.js | 22.x | Misma versión usada en CI y Dockerfiles. |
| npm | Incluido con Node | Instalación de dependencias. |
| MongoDB | 7.x o MongoDB Atlas | Persistencia de datos. |
| Docker Desktop | Versión estable reciente | Ejecución con Compose. |
| Git | Versión estable reciente | Clonado y control de versiones. |

Los servicios externos opcionales son Resend para correo transaccional y Web Push VAPID para notificaciones push. CIMA/AEMPS es una API pública y no requiere clave.

## 3. Estructura del repositorio

La raíz del repositorio separa las capas de la aplicación y la documentación.

```text
daw2-blister-proyecto-final/
├── backend/       API REST, modelos, servicios, seguridad y MCP
├── frontend/      PWA React, rutas, stores, servicios y SCSS
├── shared/        Esquemas Zod compartidos
├── docs/          Documentación académica y técnica
├── compose.yaml   Orquestación local con MongoDB, backend y frontend
└── README.md      Resumen y arranque rápido
```

No existe un `package.json` raíz para instalar todo el monorepo. Cada paquete gestiona sus dependencias.

## 4. Variables de entorno

Las variables de entorno se cargan en el backend desde `.env` y se validan con Zod al arrancar. Si falta una configuración crítica, el proceso falla de forma explícita.

### 4.1 Backend

Crear el archivo local:

```bash
cd backend
cp .env.example .env
```

Variables principales:

| Variable | Obligatoria | Descripción |
| :--- | :---: | :--- |
| `NODE_ENV` | Sí | `development`, `test` o `production`. |
| `PORT` | Sí | Puerto interno del backend; por defecto `3000`. |
| `BACKEND_URL` | Sí | URL pública del backend para enlaces absolutos. |
| `MONGODB_URI` | Sí | Cadena de conexión MongoDB local o Atlas. |
| `CLIENT_ORIGIN` | Sí | Origen principal permitido por CORS. |
| `CLIENT_ORIGINS` | No | Lista separada por comas de orígenes adicionales. |
| `EMAIL_ASSET_ORIGIN` | Sí | Origen para recursos usados en emails. |
| `CIMA_BASE_URL` | Sí | Base de la API CIMA, normalmente `https://cima.aemps.es/cima/rest`. |
| `JWT_SECRET` | Sí | Secreto privado de al menos 32 caracteres. |
| `JWT_ACCESS_EXPIRES_IN` | Sí | Duración del access token; valor habitual `15m`. |
| `JWT_REFRESH_EXPIRES_IN` | Sí | Duración del refresh token; valor habitual `7d`. |
| `MCP_TOKEN_TTL_DAYS` | Sí | Duración máxima de tokens MCP clásicos. |
| `MCP_SERVER_ENABLED` | Sí | Activa o desactiva `/mcp`. |
| `MCP_PORT` | No | Puerto usado por el script MCP independiente de desarrollo. |
| `WEB_PUSH_VAPID_PUBLIC_KEY` | No | Clave pública VAPID. |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | No | Clave privada VAPID. |
| `WEB_PUSH_VAPID_SUBJECT` | Sí | Contacto del emisor Web Push. |
| `PUSH_REMINDER_SCAN_INTERVAL_MS` | Sí | Intervalo de escaneo de recordatorios. |
| `RESEND_API_KEY` | No | Clave de Resend para email transaccional. |

### 4.2 Frontend

El frontend utiliza variables de Vite. En desarrollo se crea `frontend/.env` con:

```text
VITE_API_URL=http://localhost:3000
VITE_MCP_URL=http://localhost:3000
```

El cliente añade internamente las rutas necesarias para API y MCP. En producción se indica el origen público del backend, no `/api/v1` ni `/mcp` como ruta completa.

### 4.3 Compose

El `compose.yaml` usa `backend/.env` como base y sobrescribe valores necesarios para la red interna:

```text
MONGODB_URI=mongodb://mongo:27017/blister
CLIENT_ORIGIN=http://localhost:8080
BACKEND_URL=http://localhost:8080
```

El frontend se construye con argumentos:

```text
VITE_API_URL=http://localhost:8080
VITE_MCP_URL=http://localhost:8080
```

## 5. Instalación local

La instalación se realiza por paquete.

### 5.1 Backend

```bash
cd backend
npm install
npm run build
```

Scripts relevantes:

| Script | Función |
| :--- | :--- |
| `npm run dev` | Arranca `src/index.ts` con nodemon y ts-node. |
| `npm run lint` | Ejecuta TypeScript sin emitir archivos. |
| `npm test` | Ejecuta Jest en modo secuencial. |
| `npm run test:coverage` | Genera informe de cobertura backend. |
| `npm run test:e2e` | Ejecuta suites E2E backend. |
| `npm run build` | Compila TypeScript a `dist`. |
| `npm start` | Ejecuta `dist/backend/src/index.js`. |
| `npm run cima:sync` | Lanza sincronización de cambios CIMA. |
| `npm run mcp:start` | Arranca servidor MCP independiente para desarrollo. |

### 5.2 Frontend

```bash
cd frontend
npm install
npm run build
```

Scripts relevantes:

| Script | Función |
| :--- | :--- |
| `npm run dev` | Arranca Vite en `5173`. |
| `npm run typecheck` | Ejecuta `tsc -b`. |
| `npm run lint` | Ejecuta ESLint. |
| `npm test -- --run` | Ejecuta Vitest una vez. |
| `npm run coverage` | Genera cobertura Vitest. |
| `npm run build` | Compila TypeScript y genera `dist`. |
| `npm run preview` | Sirve el build de producción. |
| `npm run test:e2e` | Ejecuta Playwright. |

### 5.3 Shared

El paquete `shared` contiene los esquemas Zod y no se ejecuta como servicio. Backend y frontend lo importan desde el monorepo. Cuando cambian los contratos, ambos lados consumen la misma definición.

## 6. Arranque de servicios

Para desarrollo local se usan terminales separadas.

### 6.1 Base de datos

Puede usarse MongoDB local:

```bash
mongod
```

O una cadena Atlas en `MONGODB_URI`.

### 6.2 Backend

```bash
cd backend
npm run dev
```

Comprobación:

```bash
curl http://localhost:3000/api/v1/health
```

Respuesta esperada:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

### 6.3 Frontend

```bash
cd frontend
npm run dev
```

La aplicación queda disponible en:

```text
http://localhost:5173
```

## 7. Validación con Docker Compose

Docker Compose levanta una versión integrada con una única entrada pública en `http://localhost:8080`.

### 7.1 Arranque

Desde la raíz:

```bash
docker compose up -d --build
```

Servicios definidos:

| Servicio | Imagen/base | Función |
| :--- | :--- | :--- |
| `mongo` | `mongo:7` | Base de datos con volumen persistente. |
| `backend` | `backend/Dockerfile` | API REST y endpoint MCP. |
| `frontend` | `frontend/Dockerfile` y Nginx | PWA estática, SPA fallback y proxy. |

### 7.2 Comprobaciones

```bash
docker compose ps
curl http://localhost:8080/api/v1/health
curl -I http://localhost:8080/
```

La ruta MCP debe responder a través del proxy. Sin credenciales Bearer válidas, el rechazo de autenticación confirma que la petición llega al backend:

```bash
curl -i http://localhost:8080/mcp
```

### 7.3 Parada

```bash
docker compose down
```

Para eliminar también los datos de la base local:

```bash
docker compose down -v
```

## 8. Comandos de mantenimiento

Comandos habituales durante el desarrollo:

| Acción | Comando |
| :--- | :--- |
| Ver logs Compose | `docker compose logs backend` |
| Reconstruir imágenes | `docker compose build --no-cache` |
| Validar backend | `cd backend && npm run lint && npm test && npm run build` |
| Validar frontend | `cd frontend && npm run lint && npm test -- --run && npm run build` |
| Ejecutar E2E backend | `cd backend && npm run test:e2e` |
| Ejecutar E2E frontend | `cd frontend && npm run test:e2e` |

## 9. Problemas habituales

| Problema | Causa probable | Solución |
| :--- | :--- | :--- |
| Backend no arranca | `MONGODB_URI` ausente o MongoDB no disponible. | Revisar `.env` y conexión a base de datos. |
| Error de configuración JWT | `JWT_SECRET` tiene menos de 32 caracteres. | Usar un secreto largo y privado. |
| Error CORS | `CLIENT_ORIGIN` no coincide con el frontend real. | Ajustar origen y reiniciar backend. |
| Frontend no conecta con API | `VITE_API_URL` incorrecta. | Revisar `frontend/.env` y reiniciar Vite. |
| No llegan correos | Falta `RESEND_API_KEY`. | Configurar Resend o validar el flujo con mocks en test. |
| Push no disponible | Faltan claves VAPID o permiso del navegador. | Generar claves y revisar permisos. |
| Recarga de ruta privada da 404 en producción | Servidor estático sin fallback SPA. | Usar Nginx con `try_files` o configuración equivalente. |
| Mixed Content en despliegue | Frontend HTTPS consume backend HTTP. | Publicar backend con HTTPS mediante proxy y certificado. |

Checklist final de instalación:

| Comprobación | Resultado esperado |
| :--- | :--- |
| `backend/.env` existe | Variables obligatorias configuradas. |
| `frontend/.env` existe | URLs públicas o locales correctas. |
| MongoDB responde | Backend conecta sin errores de arranque. |
| `npm run build` backend | TypeScript compila a `dist`. |
| `npm run build` frontend | Vite genera `dist` y assets PWA. |
| Healthcheck | `/api/v1/health` devuelve `status: ok`. |
| Swagger | `/api/v1/docs` abre documentación API. |
| Compose | `localhost:8080` sirve frontend y proxy API. |

Si alguna comprobación falla, se recomienda resolverla antes de continuar con pruebas funcionales. Muchos errores de interfaz tienen origen en variables de entorno o en una API no disponible.

Con estas instrucciones queda cubierto el arranque local, la validación dockerizada y la preparación de variables necesarias para entornos de desarrollo o producción.
