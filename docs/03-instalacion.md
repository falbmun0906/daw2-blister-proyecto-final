# 03 - Instalación y configuración del entorno

La instalación de Blíster se ha documentado para que el proyecto pueda ejecutarse de forma reproducible tanto en un entorno de desarrollo tradicional como en un entorno dockerizado. El objetivo de este capítulo es describir los requisitos, la configuración de variables, los comandos de arranque y las comprobaciones necesarias para validar que frontend, backend, base de datos, PWA y endpoint MCP funcionan correctamente.

## Índice
1. [Visión general de la instalación](#1-visión-general-de-la-instalación)
   - 1.1 [Modalidades de ejecución](#11-modalidades-de-ejecución)
   - 1.2 [Estructura del repositorio](#12-estructura-del-repositorio)
2. [Requisitos previos](#2-requisitos-previos)
   - 2.1 [Software necesario](#21-software-necesario)
   - 2.2 [Servicios externos](#22-servicios-externos)
3. [Configuración de variables de entorno](#3-configuración-de-variables-de-entorno)
   - 3.1 [Variables del backend](#31-variables-del-backend)
   - 3.2 [Variables del frontend](#32-variables-del-frontend)
   - 3.3 [Variables para Docker Compose](#33-variables-para-docker-compose)
4. [Instalación en entorno local](#4-instalación-en-entorno-local)
   - 4.1 [Instalación del backend](#41-instalación-del-backend)
   - 4.2 [Instalación del frontend](#42-instalación-del-frontend)
   - 4.3 [Paquete shared](#43-paquete-shared)
5. [Arranque de la aplicación](#5-arranque-de-la-aplicación)
   - 5.1 [Arranque del backend](#51-arranque-del-backend)
   - 5.2 [Arranque del frontend](#52-arranque-del-frontend)
   - 5.3 [Comprobaciones iniciales](#53-comprobaciones-iniciales)
6. [Instalación con Docker Compose](#6-instalación-con-docker-compose)
   - 6.1 [Construcción de servicios](#61-construcción-de-servicios)
   - 6.2 [Validación del entorno dockerizado](#62-validación-del-entorno-dockerizado)
   - 6.3 [Parada y limpieza](#63-parada-y-limpieza)
7. [Problemas habituales de instalación](#7-problemas-habituales-de-instalación)

---

## 1. Visión general de la instalación

Blíster se organiza como un proyecto MERN con tres paquetes principales: frontend, backend y shared. La instalación local permite desarrollar y depurar cada capa por separado, mientras que Docker Compose ofrece una validación integrada con MongoDB, backend y frontend servidos como servicios independientes.

### 1.1 Modalidades de ejecución

El proyecto admite dos formas principales de ejecución:

1. **Modo desarrollo local:** cada paquete se instala con `npm` y se ejecuta desde su directorio correspondiente. Es el modo más cómodo para desarrollar nuevas funcionalidades, depurar TypeScript y trabajar con recarga en caliente.
2. **Modo dockerizado:** Docker Compose construye los contenedores de backend y frontend, levanta MongoDB y expone la aplicación completa en `http://localhost:8080`. Es el modo adecuado para validar que el proyecto no depende de una configuración particular de la máquina.

En ambos casos, el backend expone la API REST bajo `/api/v1` y el endpoint MCP bajo `/mcp` cuando `MCP_SERVER_ENABLED=true`.

### 1.2 Estructura del repositorio

La estructura raíz del repositorio separa claramente código, documentación y configuración:

```text
daw2-blister-proyecto-final/
├── backend/       API REST, lógica de negocio, modelos MongoDB y MCP
├── frontend/      PWA React, rutas, stores, servicios y SCSS
├── shared/        Esquemas Zod reutilizados por backend y frontend
├── docs/          Documentación académica y técnica de la entrega
├── compose.yaml   Orquestación local con MongoDB, backend y frontend
└── README.md      Guía rápida del proyecto
```

Esta división evita duplicar reglas de validación y permite que el backend y el frontend compartan contratos mediante `shared/schemas`.

## 2. Requisitos previos

Antes de iniciar la instalación es necesario disponer de una versión moderna de Node.js y de una base de datos MongoDB accesible. Para la validación completa con contenedores también se requiere Docker.

### 2.1 Software necesario

| Herramienta | Versión recomendada | Uso dentro del proyecto |
| :--- | :--- | :--- |
| Node.js | 22.x | Ejecución de backend, frontend, tests y builds |
| npm | Incluido con Node | Instalación de dependencias |
| MongoDB | 7.x o Atlas | Persistencia de datos en desarrollo y producción |
| Docker Desktop | Versión estable reciente | Validación con Compose |
| Git | Versión estable reciente | Control de versiones y despliegue desde repositorio |

La versión 22 de Node se utiliza también en el workflow de GitHub Actions y en los Dockerfiles, por lo que mantener esa versión en local reduce diferencias entre entornos.

### 2.2 Servicios externos

Blíster puede arrancar sin todos los servicios externos configurados, pero algunas funcionalidades requieren credenciales específicas:

| Servicio | Variable asociada | Funcionalidad |
| :--- | :--- | :--- |
| MongoDB Atlas o instancia local | `MONGODB_URI` | Base de datos principal |
| AEMPS/CIMA | `CIMA_BASE_URL` | Búsqueda e información oficial de medicamentos |
| Resend | `RESEND_API_KEY` | Envío de correo de recuperación de contraseña |
| Web Push VAPID | `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY` | Notificaciones push |

La API de CIMA es pública y no requiere clave de acceso. Las claves de Resend y Web Push sí deben mantenerse fuera del repositorio.

## 3. Configuración de variables de entorno

Las variables de entorno definen cómo se conectan los servicios entre sí y qué capacidades están activas. El backend valida su configuración en el arranque mediante Zod; si falta una variable crítica, el proceso falla de forma explícita.

### 3.1 Variables del backend

El backend incluye una plantilla en `backend/.env.example`. Para preparar el entorno local:

```bash
cd backend
cp .env.example .env
```

Las variables principales son:

| Variable | Obligatoria | Descripción |
| :--- | :---: | :--- |
| `NODE_ENV` | Sí | Entorno de ejecución: `development`, `test` o `production`. |
| `PORT` | Sí | Puerto HTTP del backend. En desarrollo se usa `3000`. |
| `BACKEND_URL` | No | Origen público del backend para generar enlaces absolutos. En producción debe configurarse explícitamente. |
| `MONGODB_URI` | Sí | Cadena de conexión de MongoDB. |
| `CLIENT_ORIGIN` | Sí | Origen permitido por CORS. En desarrollo suele ser `http://localhost:5173`. |
| `CIMA_BASE_URL` | Sí | URL base de la API CIMA/AEMPS. |
| `JWT_SECRET` | Sí | Secreto de al menos 32 caracteres para firmar JWT. |
| `JWT_ACCESS_EXPIRES_IN` | Sí | Duración del access token. Valor por defecto: `15m`. |
| `JWT_REFRESH_EXPIRES_IN` | Sí | Duración del refresh token. Valor por defecto: `7d`. |
| `MCP_TOKEN_TTL_DAYS` | Sí | Duración máxima de los tokens MCP emitidos desde perfil. |
| `MCP_SERVER_ENABLED` | Sí | Activa el endpoint `/mcp` integrado en Express. |
| `WEB_PUSH_VAPID_PUBLIC_KEY` | No | Clave pública VAPID para suscripciones push. |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | No | Clave privada VAPID para envío push. |
| `WEB_PUSH_VAPID_SUBJECT` | Sí | Contacto del emisor Web Push. |
| `PUSH_REMINDER_SCAN_INTERVAL_MS` | Sí | Intervalo del escáner de recordatorios. |
| `RESEND_API_KEY` | No | Clave de Resend para recuperación de contraseña. |

En desarrollo, si no se configuran VAPID o Resend, la aplicación sigue arrancando, pero las funcionalidades asociadas quedan limitadas.

### 3.2 Variables del frontend

El frontend usa variables de Vite, por lo que deben comenzar por `VITE_`.

```bash
cd frontend
```

El archivo `.env` local debe contener:

```text
VITE_API_URL=http://localhost:3000
VITE_MCP_URL=http://localhost:3000
```

El cliente normaliza estos orígenes internamente. `VITE_API_URL` se utiliza como base para la API REST y `VITE_MCP_URL` para mostrar al usuario la URL de conexión MCP. En producción, ambos valores apuntan al origen público del backend.

### 3.3 Variables para Docker Compose

El `compose.yaml` utiliza `backend/.env` para el backend y construye el frontend con argumentos de build:

```text
VITE_API_URL=http://localhost:8080
VITE_MCP_URL=http://localhost:8080
```

La base de datos dentro de Compose se resuelve por nombre de servicio:

```text
MONGODB_URI=mongodb://mongo:27017/blister
```

Esto permite que el backend se conecte a MongoDB sin exponer la base de datos al host.

## 4. Instalación en entorno local

La instalación local se realiza por paquetes. No existe un único `package.json` raíz que instale todo el monorepo, por lo que cada directorio mantiene sus dependencias.

### 4.1 Instalación del backend

Desde la raíz del repositorio:

```bash
cd backend
npm install
```

En entornos de integración o despliegue se utiliza `npm ci`, ya que instala exactamente las versiones fijadas en `package-lock.json`:

```bash
npm ci
```

Después de instalar dependencias, se valida que TypeScript compila:

```bash
npm run build
```

### 4.2 Instalación del frontend

La instalación del frontend se realiza de forma equivalente:

```bash
cd frontend
npm install
```

Para validar la interfaz:

```bash
npm run lint
npm run build
```

El build genera la carpeta `frontend/dist`, que contiene los archivos estáticos de la PWA.

### 4.3 Paquete shared

El paquete `shared` contiene los esquemas Zod que definen contratos comunes de autenticación, medicamentos, tratamientos, citas, notificaciones y MCP. No se ejecuta como servicio independiente.

El backend y el frontend lo importan directamente desde el repositorio:

```text
shared/schemas/
```

Esta estructura evita redefinir tipos entre cliente y servidor. Cuando un esquema cambia, ambos lados consumen la misma fuente de verdad.

## 5. Arranque de la aplicación

Una vez configuradas las variables y dependencias, se arrancan backend y frontend en terminales separadas. MongoDB debe estar disponible antes de iniciar el backend.

### 5.1 Arranque del backend

```bash
cd backend
npm run dev
```

El script utiliza `nodemon` y `ts-node` para ejecutar `src/index.ts`. El arranque correcto muestra que el backend escucha en el puerto configurado y que se ha establecido conexión con MongoDB.

La URL base en desarrollo es:

```text
http://localhost:3000
```

El endpoint de salud queda disponible en:

```text
http://localhost:3000/api/v1/health
```

### 5.2 Arranque del frontend

En otra terminal:

```bash
cd frontend
npm run dev
```

Vite sirve la aplicación en:

```text
http://localhost:5173
```

Al abrir esa URL, el usuario llega a la pantalla pública de entrada. En escritorio, la aplicación se presenta dentro de un marco visual de dispositivo móvil para mantener la experiencia mobile-first.

### 5.3 Comprobaciones iniciales

Las comprobaciones mínimas son:

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

Después se valida desde navegador:

1. Abrir `http://localhost:5173`.
2. Completar onboarding o acceder al login.
3. Registrar un usuario.
4. Comprobar que se crea el blíster inicial.
5. Acceder a Perfil y revisar que las secciones principales cargan.

## 6. Instalación con Docker Compose

Docker Compose permite levantar una versión integrada sin depender de MongoDB local ni de procesos manuales separados. La entrada pública queda en `http://localhost:8080`.

### 6.1 Construcción de servicios

Desde la raíz del repositorio:

```bash
docker compose up -d --build
```

Los servicios definidos son:

| Servicio | Imagen/base | Función |
| :--- | :--- | :--- |
| `mongo` | `mongo:7` | Base de datos con volumen persistente. |
| `backend` | `backend/Dockerfile` | API REST y endpoint MCP. |
| `frontend` | `frontend/Dockerfile` + Nginx | PWA estática y reverse proxy local. |

El backend no se expone directamente al host. Nginx publica el puerto `8080` y reenvía `/api/v1` y `/mcp` al backend.

### 6.2 Validación del entorno dockerizado

El estado de los contenedores se comprueba con:

```bash
docker compose ps
```

La API debe responder a través del proxy:

```bash
curl http://localhost:8080/api/v1/health
```

La interfaz debe cargar en:

```text
http://localhost:8080
```

La ruta MCP también pasa por el proxy:

```text
http://localhost:8080/mcp
```

Sin token Bearer válido, la ruta debe rechazar la petición. Ese rechazo confirma que el tráfico llega al backend y que la protección de acceso está activa.

### 6.3 Parada y limpieza

Para detener los contenedores:

```bash
docker compose down
```

Para detenerlos y eliminar también la base de datos local:

```bash
docker compose down -v
```

La segunda opción borra el volumen `mongo-data`, por lo que elimina usuarios, blísteres y datos creados durante la prueba.

## 7. Problemas habituales de instalación

Esta tabla resume los errores más comunes durante la instalación y la forma de resolverlos:

| Problema | Causa probable | Solución |
| :--- | :--- | :--- |
| El backend no arranca | `MONGODB_URI` ausente o MongoDB apagado | Revisar `.env` y arrancar MongoDB. |
| Error de JWT al iniciar | `JWT_SECRET` demasiado corto | Usar un secreto de al menos 32 caracteres. |
| El frontend no conecta con la API | `VITE_API_URL` apunta a un origen incorrecto | Ajustar `frontend/.env` y reiniciar Vite. |
| Error CORS en login | `CLIENT_ORIGIN` no coincide con el origen real del frontend | Configurar `CLIENT_ORIGIN=http://localhost:5173` en desarrollo. |
| No se envía correo de recuperación | Falta `RESEND_API_KEY` | Configurar la clave de Resend en backend. |
| No aparecen notificaciones push | Faltan claves VAPID | Generar y configurar `WEB_PUSH_VAPID_PUBLIC_KEY` y `WEB_PUSH_VAPID_PRIVATE_KEY`. |
| Docker no reconstruye cambios | Imagen cacheada | Ejecutar `docker compose build --no-cache`. |
| La ruta `/reset-password` devuelve la pantalla pública inicial | El usuario está en escritorio y no ha aceptado el marco móvil | Pulsar "Usar aquí" o probar en viewport móvil. |

Con estas comprobaciones, Blíster queda instalado y preparado para desarrollo local, validación dockerizada o despliegue posterior.
