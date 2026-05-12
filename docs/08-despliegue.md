# 08 - Despliegue

El despliegue de Blíster combina publicación en Render, validación local con Docker Compose e integración continua con GitHub Actions. Este capítulo recoge la arquitectura de servicios, la configuración necesaria y el proceso de verificación para que la aplicación pueda ejecutarse fuera del entorno de desarrollo.

## Índice
1. [Visión general del despliegue](#1-visión-general-del-despliegue)
	- 1.1 [Objetivo del despliegue](#11-objetivo-del-despliegue)
	- 1.2 [Servicios implicados](#12-servicios-implicados)
	- 1.3 [Esquema de arquitectura](#13-esquema-de-arquitectura)
2. [Entorno de despliegue utilizado](#2-entorno-de-despliegue-utilizado)
	- 2.1 [Render como entorno de producción](#21-render-como-entorno-de-producción)
	- 2.2 [Justificación frente a Docker en producción](#22-justificación-frente-a-docker-en-producción)
	- 2.3 [Uso de Docker como fase previa de validación](#23-uso-de-docker-como-fase-previa-de-validación)
3. [Arquitectura de servicios](#3-arquitectura-de-servicios)
	- 3.1 [Frontend web / PWA](#31-frontend-web--pwa)
	- 3.2 [Backend de aplicación](#32-backend-de-aplicación)
	- 3.3 [Base de datos MongoDB](#33-base-de-datos-mongodb)
	- 3.4 [Endpoint MCP integrado](#34-endpoint-mcp-integrado)
4. [Implementación Docker y Compose](#4-implementación-docker-y-compose)
	- 4.1 [Ficheros incluidos](#41-ficheros-incluidos)
	- 4.2 [Variables de entorno](#42-variables-de-entorno)
	- 4.3 [Arranque local dockerizado](#43-arranque-local-dockerizado)
	- 4.4 [Comprobaciones de funcionamiento](#44-comprobaciones-de-funcionamiento)
5. [Servidor web y reverse proxy](#5-servidor-web-y-reverse-proxy)
	- 5.1 [Nginx como punto de entrada local](#51-nginx-como-punto-de-entrada-local)
	- 5.2 [Rutas publicadas](#52-rutas-publicadas)
	- 5.3 [HTTPS en producción](#53-https-en-producción)
6. [Servidor de aplicaciones](#6-servidor-de-aplicaciones)
	- 6.1 [Configuración del backend](#61-configuración-del-backend)
	- 6.2 [Pruebas de API](#62-pruebas-de-api)
	- 6.3 [Prueba ligera de rendimiento](#63-prueba-ligera-de-rendimiento)
7. [CI/CD y control de versiones](#7-cicd-y-control-de-versiones)
	- 7.1 [Estrategia de ramas y commits](#71-estrategia-de-ramas-y-commits)
	- 7.2 [Integración continua con GitHub Actions](#72-integración-continua-con-github-actions)
	- 7.3 [Despliegue continuo en Render](#73-despliegue-continuo-en-render)
8. [Proceso de despliegue documentado](#8-proceso-de-despliegue-documentado)
	- 8.1 [Preparación del repositorio](#81-preparación-del-repositorio)
	- 8.2 [Configuración del backend en Render](#82-configuración-del-backend-en-render)
	- 8.3 [Configuración del frontend en Render](#83-configuración-del-frontend-en-render)
	- 8.4 [Verificación posterior al despliegue](#84-verificación-posterior-al-despliegue)
9. [URL de producción y evidencias](#9-url-de-producción-y-evidencias)
	- 9.1 [URLs públicas](#91-urls-públicas)
	- 9.2 [Evidencias recomendadas](#92-evidencias-recomendadas)
10. [Mantenimiento y resolución de problemas](#10-mantenimiento-y-resolución-de-problemas)

---

## 1. Visión general del despliegue

El despliegue de Blíster se ha planteado con una idea principal: que la aplicación pueda utilizarse desde un navegador real, con backend, frontend, base de datos y conexión MCP disponibles sin depender del entorno de desarrollo del programador. Para ello se combinan dos enfoques complementarios: Render como plataforma final de publicación y Docker Compose como entorno local reproducible de validación.

### 1.1 Objetivo del despliegue

El objetivo es publicar una PWA funcional donde el usuario pueda registrarse, gestionar medicamentos y tratamientos, recibir avisos y conectar asistentes de IA mediante MCP. El despliegue debe ser mantenible, fácil de repetir y suficientemente claro para que otra persona pueda levantar el proyecto desde cero siguiendo esta documentación.

La aplicación se divide en servicios independientes, pero relacionados entre sí. El frontend se encarga de la experiencia de usuario, el backend concentra la lógica de negocio y la API, MongoDB almacena los datos y el endpoint MCP permite la interoperabilidad con agentes externos.

### 1.2 Servicios implicados

Los servicios principales son los siguientes:

| Servicio | Tecnología | Responsabilidad |
| :--- | :--- | :--- |
| Frontend | React, Vite, PWA | Interfaz web instalable, navegación y consumo de API |
| Backend | Node.js, Express, TypeScript | API REST, autenticación, reglas de negocio, notificaciones y MCP |
| Base de datos | MongoDB | Persistencia de usuarios, blísters, medicamentos, tratamientos, citas y registros |
| Reverse proxy local | Nginx | Entrada única en Docker Compose, estáticos y proxy hacia `/api/v1` y `/mcp` |
| CI/CD | GitHub Actions + Render | Validación automática y redespliegue tras cambios en la rama configurada |

### 1.3 Esquema de arquitectura

El siguiente esquema resume la arquitectura usada en el despliegue. En producción, Render actúa como capa pública de entrada y aplica HTTPS automáticamente. En la validación local dockerizada, Nginx cumple el papel de servidor web y proxy.

```text
Usuario / Navegador / PWA
			 |
			 | HTTPS en Render / HTTP local en Compose
			 v
Frontend web ------------------------------+
			 |                                |
			 | /api/v1                        | /mcp
			 v                                v
Backend Express + MCP integrado ------------
			 |
			 | Driver Mongoose
			 v
MongoDB
```

El punto importante de la arquitectura actual es que MCP ya no se publica como un proceso externo en otro puerto. El endpoint `/mcp` está integrado en el mismo servidor Express del backend. Esta decisión es necesaria para producción porque Render solo expone un puerto por servicio web.

## 2. Entorno de despliegue utilizado

El entorno elegido para la publicación final ha sido Render. La decisión se tomó teniendo en cuenta el contexto académico del proyecto, el coste, la facilidad de mantenimiento y la integración directa con GitHub.

### 2.1 Render como entorno de producción

Render permite crear servicios web a partir de un repositorio de GitHub. En Blíster se utiliza para publicar el frontend y el backend sin tener que administrar manualmente una VPS, instalar Nginx en un servidor propio o mantener certificados TLS a mano.

Las ventajas principales para este proyecto son:

* Integración directa con GitHub: cada push a la rama configurada puede lanzar un nuevo despliegue.
* Tier gratuito accesible para un proyecto académico.
* Gestión automática de HTTPS.
* Logs centralizados desde el panel de Render.
* Variables de entorno configurables desde la interfaz web sin subir secretos al repositorio.
* Separación clara entre frontend, backend y base de datos.

### 2.2 Justificación frente a Docker en producción

La rúbrica de despliegue valora Docker porque aporta portabilidad, reproducibilidad y aislamiento. En este proyecto se ha tenido en cuenta esa ventaja, pero para la publicación final se ha elegido Render porque reduce la carga operativa de infraestructura y permite centrar el esfuerzo en el producto y en la calidad de la aplicación.

La decisión no se ha tomado por desconocimiento de Docker, sino por adecuación al contexto. Render ofrece una ruta de despliegue directa desde el repositorio, con despliegue automático y HTTPS, suficiente para una aplicación de tamaño académico y más accesible económicamente para un estudiante.

Como contrapartida, Render abstrae parte de la infraestructura. Por ese motivo se ha incorporado una fase Docker local para demostrar que la aplicación también se puede levantar de forma reproducible por servicios: frontend, backend y base de datos.

### 2.3 Uso de Docker como fase previa de validación

Docker se utiliza como entorno de validación previo a la entrega. No sustituye al delivery final en Render, pero permite comprobar que la aplicación funciona fuera del entorno local de Node instalado en la máquina del desarrollador.

Esta fase sirve para:

* Verificar que backend y frontend pueden construirse desde cero.
* Ejecutar MongoDB con volumen persistente sin depender de una instalación local.
* Probar el reverse proxy con rutas reales hacia `/api/v1` y `/mcp`.
* Documentar comandos reproducibles para levantar, inspeccionar logs y comprobar el estado del sistema.

## 3. Arquitectura de servicios

Blíster separa responsabilidades en servicios concretos. Esta separación facilita el mantenimiento y permite razonar mejor sobre los errores: si falla la interfaz, se revisa el frontend; si falla una consulta, se revisa el backend o MongoDB; si falla una conexión de agente IA, se revisa el endpoint MCP.

### 3.1 Frontend web / PWA

El frontend está desarrollado con React y Vite. Se compila como una aplicación estática y se sirve como PWA. Sus responsabilidades son:

* Mostrar la interfaz responsive y accesible.
* Consumir la API REST del backend bajo `/api/v1`.
* Mostrar la URL MCP al usuario en la pantalla de vinculación de asistente.
* Registrar el Service Worker de la PWA y preparar la instalación en dispositivos móviles.

En producción se despliega como servicio web/static site en Render. En Docker Compose se sirve con Nginx desde el contenedor `frontend`.

### 3.2 Backend de aplicación

El backend está desarrollado con Node.js, Express y TypeScript. Expone la API REST, valida los datos con Zod, aplica autenticación JWT y contiene la lógica principal del dominio.

Sus responsabilidades principales son:

* Registro, login y refresco de sesión.
* Gestión de blísters, miembros y roles.
* Gestión de medicamentos, tratamientos, citas y adherencia.
* Conexión con la API externa de CIMA/AEMPS.
* Generación y revocación de tokens MCP.
* Exposición del endpoint `/mcp` en el mismo puerto que la API.

### 3.3 Base de datos MongoDB

MongoDB almacena la información persistente de la aplicación. En producción se recomienda usar una instancia gestionada, como MongoDB Atlas, para no administrar backups ni disponibilidad de forma manual.

En Docker Compose se usa el servicio `mongo` con la imagen oficial `mongo:7` y un volumen llamado `mongo-data`. Este volumen permite que los datos sobrevivan aunque se reinicien los contenedores.

### 3.4 Endpoint MCP integrado

El protocolo MCP se integra dentro del backend Express. La ruta pública es `/mcp` y acepta los métodos `GET`, `POST` y `DELETE`, tal como requiere el transporte Streamable HTTP del SDK.

Esta integración evita el problema de exponer un segundo puerto. En local antes podía ejecutarse un proceso MCP independiente en `PORT + 1`, pero en Render ese puerto no sería accesible desde fuera. Con la integración actual, el endpoint queda disponible en el mismo servicio web que la API.

## 4. Implementación Docker y Compose

Aunque el despliegue final se realiza en Render, el proyecto incluye una configuración Docker para comprobar la portabilidad del sistema. Esta parte cubre una fase previa al delivery y permite demostrar que los servicios se pueden levantar juntos con una única orden.

### 4.1 Ficheros incluidos

Los ficheros relacionados con Docker son:

| Fichero | Función |
| :--- | :--- |
| `compose.yaml` | Orquesta MongoDB, backend y frontend/proxy |
| `backend/Dockerfile` | Construye el backend TypeScript y ejecuta Node en producción |
| `frontend/Dockerfile` | Compila la PWA y la sirve con Nginx |
| `frontend/nginx/default.conf` | Configura estáticos, SPA fallback y proxy a `/api/v1` y `/mcp` |
| `.env.example` | Plantilla raíz de variables de producción/Compose |
| `backend/.env.example` | Plantilla específica de variables del backend |
| `.dockerignore` | Reduce el contexto de build y evita copiar dependencias locales |

La red interna `blister-internal` permite que `frontend`, `backend` y `mongo` se comuniquen por nombre de servicio. Solo se publica al host el puerto `8080` del frontend. MongoDB y backend quedan en la red interna, lo que evita exponer puertos innecesarios.

### 4.2 Variables de entorno

Antes de levantar Compose se preparan las variables del backend:

```bash
cp backend/.env.example backend/.env
```

También debe existir un archivo `frontend/.env` con los orígenes usados por Vite:

```text
VITE_API_URL=http://localhost:8080
VITE_MCP_URL=http://localhost:8080
```

Las variables más importantes del backend son:

| Variable | Uso |
| :--- | :--- |
| `BACKEND_URL` | Origen público del backend para generar enlaces absolutos |
| `MONGODB_URI` | Cadena de conexión de MongoDB |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `CLIENT_ORIGIN` | Origen permitido por CORS |
| `CIMA_BASE_URL` | URL base de la API CIMA/AEMPS |
| `MCP_SERVER_ENABLED` | Activa o desactiva el endpoint `/mcp` |
| `WEB_PUSH_VAPID_PUBLIC_KEY` | Clave pública de notificaciones push |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | Clave privada de notificaciones push |
| `RESEND_API_KEY` | Clave de Resend para correos de recuperación de contraseña |

En producción, estas variables se configuran en el panel de Render. Los secretos no deben subirse al repositorio.

### 4.3 Arranque local dockerizado

El arranque completo se realiza desde la raíz del repositorio:

```bash
docker compose up -d --build
```

Si se desea esperar a que el backend esté listo antes de lanzar comprobaciones, Compose permite usar:

```bash
docker compose up -d --build --wait
```

Después se comprueba el estado de los servicios:

```bash
docker compose ps
```

El resultado esperado es ver los tres servicios activos:

```text
NAME                 STATUS          PORTS
blister-mongo-1      Up              27017/tcp
blister-backend-1    Up              3000/tcp
blister-frontend-1   Up              0.0.0.0:8080->80/tcp
```

Para consultar logs de arranque:

```bash
docker compose logs backend
docker compose logs frontend
docker compose logs mongo
```

### 4.4 Comprobaciones de funcionamiento

La primera comprobación es el endpoint de salud del backend a través del proxy:

```bash
curl http://localhost:8080/api/v1/health
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

La segunda comprobación es que el frontend responde como SPA:

```bash
curl -I http://localhost:8080/
```

Respuesta esperada:

```text
HTTP/1.1 200 OK
Content-Type: text/html
```

Para MCP, la ruta `/mcp` requiere token y una petición válida del protocolo. Una prueba simple sin token debe devolver error de autenticación, lo cual confirma que la ruta llega al backend:

```bash
curl -i http://localhost:8080/mcp
```

Respuesta esperada:

```text
HTTP/1.1 401 Unauthorized
```

## 5. Servidor web y reverse proxy

El servidor web local se resuelve con Nginx dentro del contenedor del frontend. Su función no es solo servir archivos estáticos, sino actuar como entrada única para toda la aplicación.

### 5.1 Nginx como punto de entrada local

Nginx sirve los archivos generados por `vite build` desde `/usr/share/nginx/html`. Además, tiene una regla `try_files` para que rutas internas de React Router funcionen al recargar la página.

Esto evita errores 404 en rutas como `/profile`, `/calendar` o `/mcp-token`, ya que cualquier ruta no encontrada se redirige a `index.html` y la navegación la resuelve React.

### 5.2 Rutas publicadas

La configuración del proxy define tres comportamientos:

| Ruta | Destino | Finalidad |
| :--- | :--- | :--- |
| `/` | Archivos estáticos del frontend | Interfaz PWA |
| `/api/v1/` | `backend:3000/api/v1/` | API REST |
| `/mcp` | `backend:3000/mcp` | Transporte MCP Streamable HTTP |

Para MCP se desactiva el buffering y se amplían los timeouts porque el protocolo puede mantener sesiones HTTP más largas que una petición REST normal.

### 5.3 HTTPS en producción

En producción no se configura HTTPS manualmente en el repositorio porque Render lo proporciona automáticamente en sus servicios públicos. Esto evita gestionar certificados, renovaciones o configuración TLS a mano.

En el entorno Docker local se usa HTTP porque está pensado para validación en máquina de desarrollo. Si se quisiera publicar el Compose en una VPS, habría que añadir un proxy externo con TLS, por ejemplo Nginx con Certbot, Caddy o Traefik.

## 6. Servidor de aplicaciones

El servidor de aplicaciones es el backend Express. Escucha en el puerto definido por `PORT` y concentra tanto la API REST como el endpoint MCP.

### 6.1 Configuración del backend

La configuración principal se obtiene de variables de entorno validadas al arrancar. Si falta una variable crítica, como `MONGODB_URI` o un `JWT_SECRET` suficientemente largo, el proceso falla al inicio en lugar de arrancar en un estado inseguro.

Las rutas principales son:

| Ruta | Descripción |
| :--- | :--- |
| `GET /api/v1/health` | Comprobación de salud |
| `/api/v1/auth` | Registro, login, refresh, perfil, borrado de cuenta y tokens MCP |
| `/api/v1/blisters` | Gestión de blísters, medicamentos, tratamientos, citas y adherencia |
| `/api/v1/me` | Vistas agregadas del usuario |
| `/api/v1/notifications` | Notificaciones del usuario |
| `/mcp` | Endpoint MCP integrado en Express |

El backend aplica CORS con el valor de `CLIENT_ORIGIN`, utiliza Helmet para cabeceras de seguridad y registra logs HTTP con Morgan fuera del entorno de test.

### 6.2 Pruebas de API

Una prueba mínima del backend desplegado es:

```bash
curl https://blister-app.onrender.com/api/v1/health
```

En el despliegue con frontend y backend separados, se sustituye el dominio por el del servicio backend de Render:

```bash
curl https://<backend-render-url>/api/v1/health
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

Para comprobar CIMA/AEMPS desde el backend se puede realizar una búsqueda real desde la interfaz o desde el endpoint correspondiente del módulo externo una vez autenticado.

### 6.3 Prueba ligera de rendimiento

Para una prueba ligera de carga se puede lanzar un conjunto de peticiones al endpoint de salud. No sustituye a una prueba profesional, pero permite comprobar que el servidor responde de forma estable después del despliegue.

Ejemplo con `autocannon`:

```bash
npx autocannon -d 20 -c 10 https://<backend-render-url>/api/v1/health
```

La interpretación básica es:

* Si no hay errores HTTP, el backend está aceptando concurrencia ligera.
* Si la latencia sube mucho en el tier gratuito, puede deberse al cold start de Render.
* Si aparecen timeouts, se revisan logs del backend, conexión con MongoDB y variables de entorno.

## 7. CI/CD y control de versiones

El proyecto se trabaja con Git y un historial de commits descriptivos. La integración continua se define en GitHub Actions y el despliegue continuo se delega en Render.

### 7.1 Estrategia de ramas y commits

La estrategia recomendada es mantener `main` como rama estable y usar `dev` o ramas de feature para el desarrollo diario. Los commits se redactan en inglés y de forma descriptiva, por ejemplo:

```text
feat: add appointment comments
fix: harden MCP schemas and token page
fix: integrate MCP route into Express server
docs: document deployment process
```

Esta práctica facilita revisar el avance del proyecto y localizar cambios concretos cuando aparece un error.

### 7.2 Integración continua con GitHub Actions

El workflow `.github/workflows/ci.yml` ejecuta los jobs principales de validación:

| Job | Comandos |
| :--- | :--- |
| Backend | `npm ci`, `npm run lint`, `npm run test:coverage`, subida de cobertura y `npm run build` |
| Frontend | `npm ci`, `npm run lint`, `npm test -- --run`, `npm run build` |
| Frontend E2E | En PRs a `main`: instalación de Chromium, build y `npm run test:e2e` |

El workflow se ejecuta en pushes y pull requests hacia `main` y `dev`. Las pruebas E2E de navegador se limitan a pull requests contra `main` para mantener los pushes de desarrollo más ligeros. Las variables sensibles se deben configurar como secrets o variables del repositorio si en el futuro se añaden pasos de despliegue con credenciales.

La evidencia esperada para la entrega es una captura del run en verde, donde se vean los jobs completados correctamente y el artefacto de cobertura backend publicado.

### 7.3 Despliegue continuo en Render

Render se conecta al repositorio de GitHub. Cada servicio apunta a una rama concreta y ejecuta los comandos configurados en su panel.

Para el backend:

```text
Root Directory: backend
Build Command: npm ci && npm run build
Start Command: node dist/backend/src/index.js
```

Para el frontend:

```text
Root Directory: frontend
Build Command: npm ci && npm run build
Publish Directory: dist
```

Cuando se hace push a la rama configurada, Render descarga el repositorio, instala dependencias, construye el proyecto y reinicia el servicio si el build termina correctamente.

## 8. Proceso de despliegue documentado

Este apartado resume los pasos necesarios para desplegar Blíster desde cero en Render. La idea es que el proceso sea repetible y no dependa de conocimiento informal del desarrollador.

### 8.1 Preparación del repositorio

Antes de desplegar se comprueba en local:

```bash
cd backend
npm ci
npm test
npm run build
```

```bash
cd frontend
npm ci
npm run lint
npm run build
```

También se puede validar con Docker Compose:

```bash
cp backend/.env.example backend/.env
docker compose up -d --build
curl http://localhost:8080/api/v1/health
```

### 8.2 Configuración del backend en Render

En Render se crea un Web Service para el backend. La configuración básica es:

| Campo | Valor |
| :--- | :--- |
| Runtime | Node |
| Root Directory | `backend` |
| Build Command | `npm ci && npm run build` |
| Start Command | `node dist/backend/src/index.js` |
| Branch | Rama estable del proyecto |

Variables de entorno necesarias:

```text
NODE_ENV=production
PORT=<asignado por Render>
MONGODB_URI=<cadena de MongoDB Atlas>
BACKEND_URL=https://<backend-render-url>
CLIENT_ORIGIN=https://blister-app.onrender.com
CIMA_BASE_URL=https://cima.aemps.es/cima/rest
JWT_SECRET=<secreto largo y privado>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MCP_TOKEN_TTL_DAYS=90
MCP_SERVER_ENABLED=true
WEB_PUSH_VAPID_PUBLIC_KEY=<clave pública VAPID>
WEB_PUSH_VAPID_PRIVATE_KEY=<clave privada VAPID>
WEB_PUSH_VAPID_SUBJECT=mailto:<correo-contacto>
PUSH_REMINDER_SCAN_INTERVAL_MS=60000
RESEND_API_KEY=<clave privada de Resend>
```

Render asigna `PORT` automáticamente. La aplicación lo lee desde `process.env.PORT`, por lo que no hay que fijar un puerto público manual.

### 8.3 Configuración del frontend en Render

El frontend se crea como Static Site o Web Service estático, apuntando al directorio `frontend`.

| Campo | Valor |
| :--- | :--- |
| Runtime | Static Site / Node build |
| Root Directory | `frontend` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |

Variables de build necesarias:

```text
VITE_API_URL=https://<backend-render-url>
VITE_MCP_URL=https://<backend-render-url>
```

El frontend añade automáticamente `/api/v1` a `VITE_API_URL` y `/mcp` a `VITE_MCP_URL`. Por tanto, se indica el origen del backend, no la ruta completa.

### 8.4 Verificación posterior al despliegue

Después del despliegue se realizan estas comprobaciones:

1. Abrir la URL pública del frontend.
2. Registrar un usuario nuevo o iniciar sesión con una cuenta de prueba.
3. Crear un blíster y añadir un medicamento desde CIMA.
4. Crear un tratamiento y registrar una toma.
5. Consultar `GET /api/v1/health` en el backend.
6. Generar un token MCP desde la pantalla de perfil.
7. Configurar un cliente MCP con la URL `https://<backend-render-url>/mcp` y el token Bearer.
8. Probar una consulta como `inventory_query` desde el agente conectado.

Estas pruebas cubren frontend, backend, base de datos, API externa y MCP.

## 9. URL de producción y evidencias

La URL pública principal de la aplicación es la entrada que se entrega para evaluación. Además, conviene conservar evidencias de logs, builds y comprobaciones para justificar el despliegue.

### 9.1 URLs públicas

| Recurso | URL |
| :--- | :--- |
| Aplicación web | `https://blister-app.onrender.com/` |
| API de salud | `https://<backend-render-url>/api/v1/health` |
| Endpoint MCP | `https://<backend-render-url>/mcp` |

En el momento de documentar el despliegue, la URL pública confirmada de la aplicación es `https://blister-app.onrender.com/`. La URL exacta del backend depende del nombre asignado al servicio en Render y se configura en `VITE_API_URL` y `VITE_MCP_URL` durante el build del frontend.

### 9.2 Evidencias recomendadas

Para acompañar esta documentación se recomienda guardar capturas o salidas de terminal de:

* `docker compose up -d --build` completado.
* `docker compose ps` con los tres servicios activos.
* `curl http://localhost:8080/api/v1/health` con respuesta correcta.
* Logs de backend indicando `Blister backend listening on port ...`.
* Logs de Nginx mostrando peticiones a `/` y `/api/v1/health`.
* Workflow de GitHub Actions en verde.
* Deploy de Render completado correctamente.
* Navegación real por la aplicación en producción.
* Prueba de conexión MCP con token generado desde la app.

## 10. Mantenimiento y resolución de problemas

El mantenimiento del despliegue se basa en revisar primero los síntomas y después el servicio responsable. Esta tabla resume problemas habituales:

| Problema | Causa probable | Revisión |
| :--- | :--- | :--- |
| El frontend carga pero no hace login | `VITE_API_URL` incorrecta o CORS | Revisar variable del frontend y `CLIENT_ORIGIN` del backend |
| Error 502 en Render | Backend no arranca | Revisar logs, `MONGODB_URI` y `JWT_SECRET` |
| MCP no conecta | URL antigua con puerto separado o token inválido | Usar `https://<backend-render-url>/mcp` y regenerar token |
| No llegan notificaciones push | VAPID sin configurar | Revisar claves `WEB_PUSH_VAPID_*` |
| CIMA no responde | API externa caída o timeout | Revisar logs del módulo externo y repetir más tarde |
| Docker no levanta MongoDB | Volumen corrupto o puerto ocupado | Revisar `docker compose logs mongo` y recrear volumen si procede |

Para apagar el entorno Docker local:

```bash
docker compose down
```

Para borrar también la base de datos local de pruebas:

```bash
docker compose down -v
```

Con esta documentación, el despliegue queda cubierto desde tres perspectivas: publicación real en Render, validación reproducible con Docker Compose y mantenimiento básico posterior a la entrega.
