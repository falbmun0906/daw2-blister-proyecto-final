# 10 - Conclusiones

Blíster concluye como una aplicación web progresiva funcional para gestionar medicación doméstica, tratamientos, citas, adherencia, notificaciones y colaboración familiar. Este capítulo evalúa el cumplimiento de objetivos, los aprendizajes obtenidos, las limitaciones actuales y las líneas de mejora.

## Índice

1. [Balance general](#1-balance-general)
2. [Cumplimiento de objetivos](#2-cumplimiento-de-objetivos)
	- 2.1 [Objetivos funcionales](#21-objetivos-funcionales)
	- 2.2 [Objetivos técnicos](#22-objetivos-técnicos)
	- 2.3 [Objetivos de diseño](#23-objetivos-de-diseño)
3. [Evaluación crítica del alcance](#3-evaluación-crítica-del-alcance)
4. [Aprendizajes técnicos](#4-aprendizajes-técnicos)
	- 4.1 [Full-stack y arquitectura](#41-full-stack-y-arquitectura)
	- 4.2 [Seguridad aplicada](#42-seguridad-aplicada)
	- 4.3 [Producto y experiencia de usuario](#43-producto-y-experiencia-de-usuario)
	- 4.4 [Despliegue real](#44-despliegue-real)
5. [Dificultades superadas](#5-dificultades-superadas)
6. [Limitaciones actuales](#6-limitaciones-actuales)
7. [Mejoras futuras](#7-mejoras-futuras)
8. [Valoración final](#8-valoración-final)

## 1. Balance general

El proyecto ha evolucionado desde una idea de organización del botiquín hasta una plataforma full-stack con multitenencia, roles, integración oficial CIMA/AEMPS, PWA, notificaciones, recuperación de contraseña, privacidad RGPD, MCP y despliegue real.

El resultado no se limita a recordar tomas. Blíster relaciona inventario, tratamiento, paciente, cita, stock, caducidad, autoría y permisos. Esa relación es la parte más valiosa del proyecto, porque refleja cómo se organiza realmente la medicación en un hogar compartido.

## 2. Cumplimiento de objetivos

Los objetivos iniciales se han cubierto en tres planos: funcional, técnico y de diseño.

### 2.1 Objetivos funcionales

| Objetivo | Resultado |
| :--- | :--- |
| Gestionar medicamentos | Implementado con botiquín por blíster, alta desde CIMA, stock, umbral y caducidad. |
| Gestionar tratamientos | Implementado con paciente, medicamentos, dosis, frecuencias, fechas y progreso. |
| Registrar adherencia | Implementado con logs, autoría, descuento de stock, toma forzada y deshacer. |
| Gestionar citas | Implementado con calendario, formulario, tratamiento opcional y comentarios. |
| Compartir cuidados | Implementado con blísteres, miembros, invitaciones y roles. |
| Notificar eventos | Implementado con bandeja, preferencias y soporte Web Push. |
| Recuperar contraseña | Implementado con tokens hasheados, TTL y email transaccional. |
| Conectar asistentes IA | Implementado con MCP, OAuth y tools autorizadas. |
| Proteger privacidad | Implementado con política propia, borrado lógico y purga programada. |

### 2.2 Objetivos técnicos

| Objetivo | Resultado |
| :--- | :--- |
| Arquitectura full-stack | React, Vite, Express, MongoDB, Mongoose y TypeScript. |
| Contratos compartidos | Esquemas Zod en `shared`. |
| Seguridad | JWT, bcrypt, Helmet, CORS, rate limit, sanitización, roles y tokens hasheados. |
| Documentación API | Swagger en `/api/v1/docs` y tablas de endpoints en documentación. |
| PWA | Manifest, service worker, cache y push. |
| Testing | Jest, Supertest, mongodb-memory-server, Vitest, Playwright y axe. |
| CI | GitHub Actions con jobs backend, frontend y E2E en PR a `main`. |
| Despliegue | Docker Compose, Render, MongoDB Atlas y backend final en VPS con Nginx/HTTPS. |

### 2.3 Objetivos de diseño

| Objetivo | Resultado |
| :--- | :--- |
| Mobile-first | Interfaz móvil como experiencia principal y marco en escritorio. |
| Coherencia visual | Sass, ITCSS, BEM y tokens CSS. |
| Accesibilidad | Tema, tamaño de texto, OpenDyslexic, labels, errores inline y contraste. |
| Prototipado | Prototipo Figma documentado y guía de estilos actualizada. |
| Usabilidad | Navegación inferior, feedback inmediato y estados de carga/vacío/error. |

## 3. Evaluación crítica del alcance

El alcance final es ambicioso para un proyecto individual, pero mantiene coherencia porque las funcionalidades giran alrededor de un mismo núcleo: la medicación doméstica. Las piezas no se añaden como módulos aislados, sino que se conectan entre sí.

El punto más logrado es la integración entre inventario y adherencia. Registrar una toma no solo cambia una pantalla: crea historial, descuenta stock, puede generar notificaciones y mantiene autoría. También destaca la multitenencia por blísteres, que permite modelar casos familiares reales con permisos distintos.

El punto que requiere más evolución es la cobertura de interfaz en navegador real. El backend y los contratos compartidos tienen una base de pruebas amplia, mientras que el frontend automatizado todavía debe crecer en formularios complejos y flujos autenticados.

## 4. Aprendizajes técnicos

El proyecto ha reforzado competencias de desarrollo web profesional.

### 4.1 Full-stack y arquitectura

Se ha trabajado con separación entre rutas, controladores, servicios y modelos. Esta estructura facilita mantener reglas de negocio complejas sin convertir los controladores en bloques monolíticos.

La decisión de usar Zod en `shared` ha sido especialmente útil. Permite que un cambio en un contrato se refleje en frontend y backend y reduce errores por duplicación de validaciones.

### 4.2 Seguridad aplicada

Blíster maneja datos sensibles relacionados con salud. Por ello se han aplicado medidas como tokens hasheados, recuperación con respuesta neutra, CORS controlado, sanitización, validación de ObjectId, permisos por rol y revocación de accesos externos.

La seguridad no se ha tratado como una capa final, sino como una condición de cada flujo: login, recuperación, blísteres, MCP, OAuth y borrado.

### 4.3 Producto y experiencia de usuario

El diseño mobile-first obligó a priorizar información. En pantallas pequeñas no es viable mostrar todo, por lo que cada sección se centra en una tarea principal: tomar, consultar stock, crear tratamiento, revisar calendario o configurar perfil.

La interfaz también ha mostrado la importancia del feedback. En una aplicación de salud, un error de formulario o una acción silenciosa genera desconfianza. Por eso se incorporaron mensajes inline, toasts, estados vacíos y confirmaciones.

### 4.4 Despliegue real

El despliegue ha permitido comparar tres enfoques: Compose local, Render y VPS. Docker aportó reproducibilidad; Render permitió publicar rápido frontend y backend; la VPS dio control sobre el backend y resolvió la arquitectura final con dominio propio, Nginx y HTTPS.

## 5. Dificultades superadas

| Dificultad | Solución |
| :--- | :--- |
| Modelar cuidado familiar | Blísteres compartidos con roles y membresía. |
| Evitar accesos cruzados | Middleware `checkBlisterAccess` y filtros por `blisterId`. |
| Gestionar stock al registrar tomas | Regla de stock, toma forzada y restauración al deshacer. |
| Formularios con Zod 4 | Resolver propio para React Hook Form. |
| Integrar MCP en producción | Endpoint `/mcp` dentro de Express. |
| Evitar Mixed Content | Backend en `https://api.miblister.es` con Nginx y Certbot. |
| Privacidad de datos sensibles | Política RGPD, borrado lógico y purga programada. |
| Consistencia CSS | ITCSS, BEM y tokens centralizados. |

## 6. Limitaciones actuales

El proyecto es funcional, pero existen límites propios de un MVP académico.

| Limitación | Impacto |
| :--- | :--- |
| E2E frontend limitado | Falta cubrir registro, inventario, tratamiento y toma completa en navegador real. |
| Offline parcial | La PWA cachea recursos y datos CIMA, pero no sincroniza escrituras offline. |
| Push dependiente del navegador | Requiere permisos y soporte del dispositivo. |
| Sin escaneo de códigos | El alta se realiza mediante buscador CIMA, no por cámara. |
| Sin informes avanzados | No genera todavía informes de adherencia exportables. |
| Analítica predictiva pendiente | No calcula reposición futura por consumo histórico. |
| MCP ampliable | Tools implementadas, pero pueden añadirse recursos, prompts y flujos guiados. |

Estas limitaciones no impiden el uso del núcleo de Blíster, pero marcan una ruta clara de evolución.

## 7. Mejoras futuras

Las mejoras propuestas siguen la dirección del producto: reducir carga cognitiva y aumentar seguridad en la gestión doméstica.

1. **E2E autenticado completo:** cubrir registro, creación de blíster, alta de medicamento, tratamiento y toma con Playwright.
2. **Mayor cobertura de componentes:** añadir tests para login, formularios, cards, modales y navegación inferior.
3. **Escaneo EAN-13:** permitir alta mediante cámara y código de barras si CIMA o una fuente compatible permite resolver el medicamento.
4. **Modo offline avanzado:** registrar tomas sin conexión y sincronizar al recuperar red con resolución de conflictos.
5. **Informes exportables:** generar PDF o CSV de adherencia por tratamiento, paciente y periodo.
6. **Predicción de reposición:** estimar fecha de agotamiento según ritmo real de consumo.
7. **Mejoras MCP:** añadir recursos, prompts guiados y auditoría visible de acciones externas.
8. **Internacionalización:** preparar textos para otros idiomas si el proyecto crece fuera del contexto español.
9. **Monitorización de producción:** centralizar logs, métricas de latencia y alertas de disponibilidad.
10. **Backups y recuperación:** documentar una estrategia de backup Atlas y restauración ante incidente.

Prioridad recomendada:

| Prioridad | Mejora | Motivo |
| :--- | :--- | :--- |
| Alta | E2E autenticado completo | Aumenta confianza en flujos críticos y mejora evidencia de calidad. |
| Alta | Capturas reales y evidencias Figma | Refuerza directamente la evaluación de diseño. |
| Media | Informes exportables | Aporta valor al seguimiento familiar o médico. |
| Media | Offline avanzado | Mejora uso en situaciones sin conexión, pero requiere resolución de conflictos. |
| Baja | Internacionalización | Útil si el producto crece fuera del contexto español. |

## 8. Valoración final

Blíster cumple el objetivo de construir una aplicación web completa, útil y técnicamente sólida. Integra frontend, backend, base de datos, validación compartida, seguridad, diseño accesible, documentación, pruebas, Docker y despliegue real.

Su aportación principal es unir gestión doméstica de medicamentos, colaboración familiar e interoperabilidad con asistentes externos. Esta combinación convierte el proyecto en algo más que un CRUD académico: es una solución con un dominio coherente, problemas reales y decisiones técnicas justificables.

Como trabajo final de Desarrollo de Aplicaciones Web, Blíster demuestra capacidad para analizar una necesidad, diseñar una arquitectura, implementar funcionalidades conectadas, validar el sistema y desplegarlo en producción. Como producto, deja una base clara para seguir evolucionando hacia una herramienta útil en el día a día de personas que conviven con medicación propia o familiar.
