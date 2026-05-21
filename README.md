<div style="margin: 0 0 32px; padding: 48px 36px; background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%); color: #3b3b3b; font-family: Nunito, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-shadow: 0 12px 32px rgba(15, 56, 53, 0.10);">
	<div style="max-width: 820px;">
		<h1 style="margin: 0; font-family: Overpass, Nunito, system-ui, sans-serif; font-size: clamp(2.25rem, 5vw, 4.75rem); font-weight: 500; line-height: 1; color: #3b3b3b;">
			<span style="color: #d97757;">Blíster</span> | Gestión de medicamentos en el hogar.
		</h1>
	</div>
</div>

Blíster es una aplicación web progresiva para gestionar medicamentos, tratamientos, citas médicas y recordatorios de adherencia en el ámbito doméstico y familiar. El proyecto está desarrollado como trabajo final del ciclo de Desarrollo de Aplicaciones Web y combina frontend React, backend Express, MongoDB, integración con CIMA/AEMPS y un endpoint MCP para conectar asistentes de IA externos.

## Tabla de contenidos

- [Características principales](#características-principales)
- [Stack técnico](#stack-técnico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Requisitos previos](#requisitos-previos)
- [Configuración](#configuración)
- [Arranque rápido en desarrollo](#arranque-rápido-en-desarrollo)
- [Pruebas](#pruebas)
- [Build de producción](#build-de-producción)
- [Validación con Docker Compose](#validación-con-docker-compose)
- [Despliegue](#despliegue)
- [URLs públicas](#urls-públicas)
- [Documentación](#documentación)
- [Contexto académico](#contexto-académico)
- [Licencia](#licencia)

## Características principales

- Botiquín digital con alta de medicamentos desde la API oficial CIMA/AEMPS, control de stock, umbral de aviso y caducidad.
- Tratamientos con paciente asociado, dosis, frecuencias, fechas y seguimiento de progreso.
- Registro de adherencia con autoría, descuento de stock automático, toma forzada y deshacer.
- Calendario de citas médicas con tratamiento opcional y comentarios.
- Multitenencia por blísteres compartidos: invitación de miembros, roles y aislamiento de datos.
- Notificaciones internas y push (Web Push + VAPID) con preferencias por tipo de evento.
- Recuperación de contraseña con tokens hasheados, TTL y correo transaccional (Resend).
- Endpoint MCP (`/mcp`) con OAuth para conectar asistentes de IA y operar sobre datos del usuario.
- PWA instalable con service worker, caché y soporte offline parcial.
- Política RGPD propia, borrado lógico y purga programada.
- Accesibilidad: tema claro/oscuro, tamaño de texto, fuente OpenDyslexic, contraste y navegación por teclado.

## Stack técnico

| Capa | Tecnologías |
| :--- | :--- |
| Frontend | React 18, Vite 6, React Router 6, Zustand, React Hook Form, Sass (ITCSS + BEM), DOMPurify, PWA + Web Push |
| Backend | Node.js 22, Express 5, Mongoose 9, TypeScript estricto, Zod 4, JWT, bcrypt, Helmet, CORS, mongo-sanitize, swagger-jsdoc, MCP SDK |
| Compartido | Esquemas Zod en `shared/` consumidos desde frontend y backend |
| Base de datos | MongoDB 7 (local Docker) / MongoDB Atlas (producción) |
| Pruebas | Jest + Supertest + mongodb-memory-server (backend), Vitest + React Testing Library (frontend), Playwright + axe (E2E y accesibilidad) |
| Infraestructura | Docker, Docker Compose, Nginx, Certbot, GitHub Actions |
| Servicios externos | CIMA/AEMPS, Resend (correo), Web Push |

## Estructura del repositorio

| Directorio | Contenido |
| :--- | :--- |
| `frontend/` | PWA desarrollada con React, Vite y SCSS |
| `backend/` | API REST, autenticación, lógica de negocio y endpoint MCP |
| `shared/` | Esquemas Zod compartidos entre frontend y backend |
| `docs/` | Documentación académica y técnica del proyecto |
| `compose.yaml` | Compose raíz para validación local de la pila completa |
| `docker-compose.backend.yml` | Compose específico del backend para producción en VPS |
| `.github/workflows/` | Pipelines de integración continua y despliegue automático |

## Requisitos previos

| Requisito | Versión recomendada | Uso |
| :--- | :--- | :--- |
| Node.js | 22 LTS | Backend, frontend, scripts de desarrollo y pruebas |
| npm | 10+ | Gestor de paquetes del monorepo |
| MongoDB | 7+ (local) o Atlas | Persistencia de datos |
| Docker Engine | 24+ | Validación reproducible y producción |
| Docker Compose | v2 | Orquestación local y de backend |

Para el endpoint MCP y las notificaciones push se requieren claves adicionales (VAPID, OAuth, Resend) descritas en los archivos `.env.example` de cada servicio.

## Configuración

Cada servicio tiene su propio `.env.example` documentado:

- `backend/.env.example`: conexión MongoDB, JWT, CORS, claves VAPID, Resend, MCP, CIMA y URLs públicas.
- `frontend/.env.example` (variables `VITE_*`): URL de la API y URL del endpoint MCP.
- `.env` raíz: variables consumidas por `compose.yaml` para la validación local conjunta.

Para el detalle completo de cada variable y su propósito, véase [docs/03-instalacion.md](docs/03-instalacion.md).

## Arranque rápido en desarrollo

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

El backend se publica por defecto en `http://localhost:3000` y el frontend en `http://localhost:5173`. La PWA consume la API mediante la variable `VITE_API_URL`.

## Pruebas

Backend (Jest + Supertest + mongodb-memory-server):

```bash
cd backend
npm test                # suites unitarias e integración
npm run test:e2e        # E2E backend con MongoDB en memoria
npm run test:coverage   # informe de cobertura
```

Frontend (Vitest + React Testing Library):

```bash
cd frontend
npm test
```

End-to-end y accesibilidad (Playwright + axe):

```bash
cd frontend
npm run test:e2e
```

La estrategia de pruebas y la cobertura actual se detallan en [docs/07-pruebas.md](docs/07-pruebas.md).

## Build de producción

Backend (compila TypeScript a `dist/`):

```bash
cd backend
npm run build
node dist/backend/src/index.js
```

Frontend (genera estáticos en `frontend/dist/`):

```bash
cd frontend
npm run build
npm run preview        # opcional: servidor estático local
```

## Validación con Docker Compose

El repositorio incluye una configuración Docker para levantar frontend, backend y MongoDB como servicios coordinados:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up -d --build
curl http://localhost:8080/api/v1/health
```

Compose utiliza el `.env` de raíz para la configuración general y carga también `backend/.env` y `frontend/.env` mediante `env_file`, por lo que los tres archivos deben existir antes del arranque.

Tras el arranque, la PWA queda accesible en `http://localhost:8080`, la API en `http://localhost:8080/api/v1`, Swagger en `http://localhost:8080/api/v1/docs` y el endpoint MCP en `http://localhost:8080/mcp`.

## Despliegue

La aplicación está desplegada como arquitectura cliente-servidor con base de datos gestionada:

| Servicio | Plataforma |
| :--- | :--- |
| Frontend (PWA) | Render (sitio estático) |
| Backend (API + MCP) | VPS Ionos Ubuntu 24.04 con Docker, Nginx y Certbot |
| Base de datos | MongoDB Atlas |
| CI/CD | GitHub Actions (lint, tests, build y deploy SSH a VPS) |

El proceso completo —desde la dockerización local hasta la publicación con HTTPS y reverse proxy— está documentado en [docs/08-despliegue.md](docs/08-despliegue.md). Las evidencias específicas de evaluación (artefactos y verificación de red) se recogen en [docs/08-despliegue-eval.md](docs/08-despliegue-eval.md).

## URLs públicas

| Recurso | URL |
| :--- | :--- |
| Frontend | <https://miblister.es> |
| Backend | <https://api.miblister.es> |
| Healthcheck | <https://api.miblister.es/api/v1/health> |
| Swagger (API REST) | <https://api.miblister.es/api/v1/docs> |
| Endpoint MCP | <https://api.miblister.es/mcp> |

## Documentación

La documentación completa está organizada por capítulos:

1. [Introducción](docs/01-introduccion.md)
2. [Descripción funcional](docs/02-descripcion.md)
3. [Instalación](docs/03-instalacion.md)
4. [Guía de estilos](docs/04-guia-estilos.md)
5. [Diseño](docs/05-diseno.md)
6. [Desarrollo](docs/06-desarrollo.md)
7. [Pruebas](docs/07-pruebas.md)
8. [Despliegue](docs/08-despliegue.md)
9. [Manual de usuario](docs/09-manual-usuario.md)
10. [Conclusiones](docs/10-conclusiones.md)

La API REST se documenta desde el backend mediante Swagger en `/api/v1/docs` cuando el servidor está en ejecución. El endpoint MCP se publica en `/mcp` dentro del mismo servidor Express.

## Contexto académico

Proyecto final del ciclo formativo de grado superior **Desarrollo de Aplicaciones Web (DAW2)**. Integra los módulos de Desarrollo Web en Entorno Cliente (DWEC), Desarrollo Web en Entorno Servidor (DWES), Diseño de Interfaces Web (DIW), Despliegue de Aplicaciones Web y Proyecto Intermodular.

## Licencia

Trabajo académico de uso educativo. Todos los derechos reservados al autor salvo indicación expresa en archivos concretos.
