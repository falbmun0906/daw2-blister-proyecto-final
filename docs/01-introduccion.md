# 01 - Introducción

Blíster es el proyecto final de Desarrollo de Aplicaciones Web de Francisco Alba Muñoz. La aplicación propone una solución PWA para organizar medicación, tratamientos, citas médicas y adherencia en un contexto doméstico, con especial atención a familias que comparten responsabilidades de cuidado.

## Índice

1. [Identificación del proyecto](#1-identificación-del-proyecto)
2. [Origen y motivación](#2-origen-y-motivación)
3. [Problemática detectada](#3-problemática-detectada)
4. [Objetivos del proyecto](#4-objetivos-del-proyecto)
	- 4.1 [Objetivo general](#41-objetivo-general)
	- 4.2 [Objetivos funcionales](#42-objetivos-funcionales)
	- 4.3 [Objetivos técnicos](#43-objetivos-técnicos)
	- 4.4 [Objetivos de diseño y accesibilidad](#44-objetivos-de-diseño-y-accesibilidad)
5. [Antecedentes y aplicaciones similares](#5-antecedentes-y-aplicaciones-similares)
6. [Propuesta de valor](#6-propuesta-de-valor)
7. [Expectativas de éxito](#7-expectativas-de-éxito)

## 1. Identificación del proyecto

El proyecto recibe el nombre de **Blíster**. La denominación se eligió por su relación directa con el envase que organiza dosis de medicamentos y porque comunica de forma inmediata el dominio de la aplicación: ordenar, proteger y hacer más comprensible la medicación cotidiana.

Blíster se desarrolla como una aplicación web progresiva con arquitectura full-stack. El frontend está construido con React, Vite, TypeScript y Sass; el backend utiliza Node.js, Express, TypeScript y MongoDB mediante Mongoose; y el paquete `shared` contiene esquemas Zod comunes para evitar divergencias entre formularios, API y reglas de validación.

La solución no se plantea como una herramienta clínica profesional ni como sustituto del criterio médico. Su objetivo es cubrir el espacio doméstico que existe entre la receta o recomendación sanitaria y la organización real del día a día: saber qué hay en casa, cuándo toca tomarlo, quién lo ha registrado y qué información oficial puede consultarse.

## 2. Origen y motivación

La idea nace de la observación de situaciones reales en el entorno familiar. La medicación crónica, los tratamientos puntuales y los episodios de salud que requieren rapidez muestran un patrón común: la información suele estar repartida entre cajas físicas, notas, alarmas genéricas, conversaciones y memoria personal.

En un tratamiento crónico, el riesgo principal es olvidar una dosis, duplicarla o no detectar a tiempo que queda poco stock. En una medicación puntual, como la asociada a episodios de migraña u otros síntomas agudos, la rapidez y la claridad son determinantes. En ambos casos, las alarmas del teléfono o una nota en papel no ofrecen contexto suficiente sobre stock, caducidad, fuente oficial del medicamento o coordinación con cuidadores.

Esta motivación llevó a definir Blíster como una herramienta cotidiana, orientada a personas usuarias no técnicas, pero construida con criterios de seguridad, trazabilidad y mantenibilidad propios de un producto profesional.

## 3. Problemática detectada

La gestión doméstica de medicamentos presenta varios problemas recurrentes:

| Problema | Consecuencia |
| :--- | :--- |
| Inventario no actualizado | Se descubre que falta medicación en el momento de la toma o de preparar un tratamiento. |
| Caducidades sin controlar | Permanecen medicamentos vencidos en el botiquín sin que el usuario lo perciba. |
| Alarmas sin contexto | Una alarma recuerda una hora, pero no indica stock, medicamento asociado, tratamiento ni paciente. |
| Cuidado compartido informal | Varios familiares pueden actuar sobre la misma persona sin una confirmación común de quién registró una toma. |
| Información farmacológica dispersa | El usuario puede acabar consultando fuentes no oficiales cuando necesita el prospecto o ficha técnica. |

La falta de adherencia terapéutica es un problema ampliamente reconocido en pacientes crónicos. Blíster no pretende resolver por sí solo un problema sanitario complejo, pero sí reducir la carga cognitiva del usuario y ordenar los datos necesarios para una mejor supervisión doméstica.

## 4. Objetivos del proyecto

Los objetivos se agrupan en objetivos funcionales, técnicos, de diseño y de despliegue.

### 4.1 Objetivo general

Desarrollar una aplicación web progresiva para gestionar medicamentos, tratamientos, citas médicas y tomas dentro de espacios personales o compartidos llamados blísteres, incorporando roles, control de stock, información oficial CIMA/AEMPS, notificaciones y una capa de interoperabilidad MCP para asistentes externos autorizados.

### 4.2 Objetivos funcionales

| Objetivo | Alcance implementado |
| :--- | :--- |
| Gestionar inventario | Alta de medicamentos desde CIMA, stock, unidad, umbral, caducidad y alias local. |
| Organizar tratamientos | Pautas por paciente, fechas, medicamentos asociados, dosis, frecuencia por intervalo u horarios diarios. |
| Registrar adherencia | Logs de toma con autor, tratamiento, medicamento, cantidad, stock descontado y posibilidad de deshacer dentro de una ventana controlada. |
| Compartir cuidados | Blísteres con miembros y roles OWNER, CAREGIVER y OBSERVER. |
| Gestionar citas | Citas por paciente, lugar, descripción, relación opcional con tratamiento y comentarios. |
| Avisar de eventos | Notificaciones internas y soporte Web Push para stock, caducidad, dosis, citas, cambios CIMA y tomas forzadas. |
| Recuperar acceso | Recuperación de contraseña mediante token hasheado con caducidad y correo transaccional. |
| Conectar IA externa | Endpoint MCP con tools de consulta y escritura bajo token Bearer u OAuth. |

### 4.3 Objetivos técnicos

| Objetivo | Solución técnica |
| :--- | :--- |
| Stack full-stack moderno | React 18, Vite 6, TypeScript, Express 5, MongoDB y Mongoose. |
| Validación consistente | Esquemas Zod compartidos entre frontend y backend. |
| Seguridad base | JWT, bcrypt, refresh tokens hasheados, Helmet, CORS controlado, rate limiting y sanitización de entradas. |
| API REST documentada | Rutas versionadas bajo `/api/v1` y Swagger en `/api/v1/docs`. |
| PWA instalable | Manifest, service worker, caché de recursos y soporte de notificaciones push. |
| Portabilidad | Dockerfiles de backend y frontend, Compose local con MongoDB y Nginx. |
| Despliegue real | Frontend en Render y backend desplegado finalmente en VPS con Docker, Nginx y HTTPS. |

### 4.4 Objetivos de diseño y accesibilidad

La interfaz se diseña con enfoque mobile-first porque el uso más probable se produce desde el teléfono: confirmar una toma, revisar stock, añadir una cita o consultar un medicamento. En escritorio se mantiene una vista de dispositivo móvil para conservar la experiencia prevista.

La guía visual se apoya en Sass, ITCSS, BEM, variables CSS y componentes reutilizables. La aplicación incluye tema claro, tema oscuro, selector de tamaño de texto y fuente OpenDyslexic, además de labels visibles, mensajes de validación en español y áreas táctiles adecuadas para uso móvil.

## 5. Antecedentes y aplicaciones similares

Existen aplicaciones consolidadas de recordatorio de medicación, aplicaciones de calendario y soluciones públicas vinculadas a receta electrónica. El análisis comparativo permitió delimitar el espacio del proyecto.

| Solución | Fortalezas | Limitaciones frente a Blíster |
| :--- | :--- | :--- |
| Medisafe | Recordatorios maduros y experiencia móvil especializada. | Ecosistema cerrado, menor foco en inventario doméstico compartido y sin integración MCP propia. |
| MyTherapy | Seguimiento de medicación y hábitos de salud. | Orientada a app nativa y seguimiento personal, no a blísteres familiares con roles. |
| Google Calendar o alarmas | Simplicidad y disponibilidad inmediata. | No gestionan stock, caducidad, fichas oficiales ni trazabilidad de cuidadores. |
| Apps sanitarias públicas | Acceso a datos de receta o servicios médicos oficiales. | No suelen gestionar el consumo real ni el inventario físico del hogar. |

Blíster toma como referencia la claridad de las apps móviles de salud, pero centra el alcance en el hogar: inventario real, colaboración familiar, información oficial y API propia.

## 6. Propuesta de valor

La propuesta diferencial de Blíster se articula en cinco puntos:

1. **Organización por blísteres:** cada espacio agrupa medicamentos, tratamientos, citas y miembros, permitiendo separar un botiquín personal de uno familiar.
2. **Roles de cuidado:** OWNER, CAREGIVER y OBSERVER permiten adaptar permisos a responsabilidades reales.
3. **Fuente oficial:** la alta de medicamentos parte de CIMA/AEMPS y conserva el número de registro oficial `nregist`.
4. **Trazabilidad:** las tomas y comentarios guardan autor, fecha y contexto, lo que mejora la coordinación entre cuidadores.
5. **Interoperabilidad MCP:** un asistente externo autorizado puede consultar inventario, próximas dosis o registrar acciones respetando permisos.

## 7. Expectativas de éxito

El éxito del proyecto se evalúa desde una perspectiva académica, técnica y de producto.

| Área | Expectativa |
| :--- | :--- |
| Producto | Que una persona pueda registrarse, crear o unirse a un blíster, añadir medicamentos, crear tratamientos, registrar tomas y consultar alertas sin documentación externa. |
| Técnica | Que frontend, backend, base de datos, validación compartida, tests, Docker y despliegue funcionen como un sistema coherente. |
| Seguridad | Que las acciones sensibles estén protegidas por autenticación, pertenencia al blíster, rol y validación de entrada. |
| Accesibilidad | Que la interfaz sea legible, usable en móvil y configurable para diferentes necesidades visuales. |
| Evolución | Que el código y la documentación permitan ampliar el proyecto con E2E más completos, informes, escaneo EAN-13 y mejoras offline. |

Con estas expectativas, Blíster queda planteado como una aplicación realista para el alcance de un proyecto final: suficientemente completa para demostrar competencias full-stack y suficientemente acotada para mantener coherencia funcional.
