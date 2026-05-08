# Blíster

Blíster es una aplicación web progresiva para gestionar medicamentos, tratamientos, citas médicas y recordatorios de adherencia en el ámbito doméstico y familiar. El proyecto está desarrollado como trabajo final del ciclo de Desarrollo de Aplicaciones Web y combina frontend React, backend Express, MongoDB, integración con CIMA/AEMPS y un endpoint MCP para conectar asistentes de IA externos.

## Estructura del repositorio

| Directorio | Contenido |
| :--- | :--- |
| `frontend/` | PWA desarrollada con React, Vite y SCSS |
| `backend/` | API REST, autenticación, lógica de negocio y endpoint MCP |
| `shared/` | Esquemas Zod compartidos entre frontend y backend |
| `docs/` | Documentación académica y técnica del proyecto |

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
npm install
npm run dev
```

## Validación con Docker Compose

El repositorio incluye una configuración Docker para validar la aplicación por servicios antes de la entrega:

```bash
cp .env.example .env
docker compose up -d --build
curl http://localhost:8080/api/v1/health
```

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