<div style="margin: 0 0 32px; padding: 48px 36px; background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%); color: #3b3b3b; font-family: Nunito, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-shadow: 0 12px 32px rgba(15, 56, 53, 0.10);">
	<div style="max-width: 820px;">
		<h1 style="margin: 0; font-family: Overpass, Nunito, system-ui, sans-serif; font-size: clamp(2.25rem, 5vw, 4.75rem); font-weight: 500; line-height: 1; color: #3b3b3b;">
			<span style="color: #d97757;">Blíster</span> | Gestión de medicamentos en el hogar.
		</h1>
	</div>
</div>

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