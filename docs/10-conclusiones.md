# 10 - Conclusiones

El proyecto Blíster culmina en una aplicación web progresiva funcional para la gestión doméstica de medicamentos, tratamientos, citas y adherencia. Esta conclusión recoge el grado de cumplimiento de objetivos, los aprendizajes técnicos, las limitaciones detectadas y las posibles líneas de evolución del producto.

## Índice
1. [Balance general del proyecto](#1-balance-general-del-proyecto)
2. [Cumplimiento de objetivos](#2-cumplimiento-de-objetivos)
   - 2.1 [Objetivos funcionales](#21-objetivos-funcionales)
   - 2.2 [Objetivos técnicos](#22-objetivos-técnicos)
   - 2.3 [Objetivos de diseño y accesibilidad](#23-objetivos-de-diseño-y-accesibilidad)
3. [Aprendizajes obtenidos](#3-aprendizajes-obtenidos)
   - 3.1 [Aprendizaje full-stack](#31-aprendizaje-full-stack)
   - 3.2 [Aprendizaje de producto](#32-aprendizaje-de-producto)
   - 3.3 [Aprendizaje en integración con IA](#33-aprendizaje-en-integración-con-ia)
4. [Dificultades encontradas](#4-dificultades-encontradas)
5. [Limitaciones actuales](#5-limitaciones-actuales)
6. [Líneas futuras](#6-líneas-futuras)
7. [Valoración final](#7-valoración-final)

---

## 1. Balance general del proyecto

Blíster ha evolucionado desde una idea centrada en ordenar un botiquín doméstico hasta una plataforma PWA con multitenencia, roles, integración con datos oficiales, notificaciones y conexión con asistentes de IA. El resultado demuestra que una aplicación de salud cotidiana puede combinar sencillez de uso con una arquitectura técnica avanzada.

El proyecto no se limita a registrar medicamentos. Su valor reside en relacionar inventario, tratamientos, citas, stock, caducidad y responsabilidad familiar dentro de una misma experiencia. Además, la integración MCP abre la posibilidad de consultar y actualizar datos mediante asistentes externos, manteniendo el control de acceso en el backend.

## 2. Cumplimiento de objetivos

Los objetivos planteados en la introducción se han abordado desde tres planos: funcional, técnico y de diseño. El resultado final cubre el núcleo del producto y deja una base preparada para ampliaciones posteriores.

### 2.1 Objetivos funcionales

El proyecto cumple las funciones principales previstas:

| Objetivo | Resultado |
| :--- | :--- |
| Gestionar medicamentos | Implementado mediante botiquín por blíster, alta desde CIMA, stock, umbral y caducidad. |
| Gestionar tratamientos | Implementado con pautas, pacientes, fechas, medicamentos y detalle de progreso. |
| Registrar tomas | Implementado con logs de adherencia, autoría, decremento de stock y deshacer. |
| Gestionar citas | Implementado con calendario, formularios y comentarios. |
| Compartir blísteres | Implementado con miembros, invitaciones y roles. |
| Alertar de eventos relevantes | Implementado con notificaciones de stock, caducidad, adherencia, CIMA, dosis y citas. |
| Recuperar contraseña | Implementado con token hasheado, expiración y envío por Resend. |
| Conectar asistentes IA | Implementado mediante endpoint MCP y tools de lectura/escritura controladas. |

La aplicación permite cubrir el uso diario de una persona que necesita organizar medicación propia o de un familiar.

### 2.2 Objetivos técnicos

Desde el punto de vista técnico, se ha construido una solución completa:

* Backend Express con TypeScript.
* Persistencia MongoDB mediante Mongoose.
* Contratos Zod compartidos entre backend y frontend.
* Autenticación JWT con refresh token.
* Integración con CIMA/AEMPS.
* Envío de emails de recuperación con Resend.
* Notificaciones push mediante Web Push.
* PWA con Vite y Workbox.
* Endpoint MCP integrado en Express.
* OAuth para clientes MCP compatibles.
* Docker Compose para validación local.
* CI con GitHub Actions.
* Tests backend unitarios, integración y E2E.
* Tests frontend con Vitest/React Testing Library.
* Playwright con auditoría axe para navegador real en CI.

El uso de TypeScript en todas las capas ha permitido mantener mayor coherencia entre datos, servicios y UI.

### 2.3 Objetivos de diseño y accesibilidad

El proyecto también cumple una línea de diseño propia:

* Identidad visual basada en verdes teal y acento terracota.
* Experiencia mobile-first.
* Marco móvil en escritorio.
* Sistema de estilos con Sass, ITCSS y BEM.
* Tema oscuro.
* Ajustes de accesibilidad.
* Tipografía alternativa para dislexia.
* Componentes reutilizables.
* Estados de carga, vacío y error.

La interfaz evita una estética clínica fría y busca un equilibrio entre confianza, calma y claridad.

## 3. Aprendizajes obtenidos

El desarrollo de Blíster ha requerido integrar conocimientos de programación, diseño, seguridad, documentación y despliegue. La complejidad del proyecto ha permitido practicar decisiones propias de un entorno profesional.

### 3.1 Aprendizaje full-stack

El proyecto ha reforzado competencias en:

* Modelado de datos documentales con MongoDB.
* Diseño de API REST versionada.
* Validación compartida con Zod.
* Gestión de autenticación y permisos.
* Consumo de servicios externos.
* Arquitectura React con rutas protegidas.
* Estado global con Zustand.
* Estilos escalables con ITCSS.
* Testing automatizado backend.
* Dockerización y despliegue.

La principal lección técnica es la importancia de separar responsabilidades. Cuando las rutas, servicios, modelos y schemas están bien diferenciados, el sistema crece con menos fricción.

### 3.2 Aprendizaje de producto

Blíster ha demostrado que el diseño de producto no consiste solo en añadir funciones. En una aplicación de salud, cada funcionalidad debe responder a una necesidad clara y evitar aumentar la carga cognitiva.

Decisiones como agrupar administración en Perfil, mantener la navegación inferior simple o usar un marco móvil en escritorio ayudan a proteger la coherencia del producto. La experiencia final debe sentirse sencilla aunque el sistema interno sea complejo.

### 3.3 Aprendizaje en integración con IA

La implementación MCP ha sido uno de los aprendizajes más diferenciales. Integrar asistentes de IA externos obliga a pensar en:

* Autorización granular.
* Contratos de tools.
* Respuestas parseables.
* Seguridad de tokens.
* Separación entre lectura y escritura.
* Contexto multi-blíster.

La IA no se integra como elemento decorativo, sino como una capa de interoperabilidad que permite al usuario consultar y operar sobre sus datos desde otros entornos.

## 4. Dificultades encontradas

El proyecto ha presentado varias dificultades relevantes:

1. **Complejidad del dominio sanitario:** Medicamentos, tratamientos, tomas, citas y stock están relacionados. Un cambio en una entidad puede afectar a varias pantallas y servicios.
2. **Multitenencia y roles:** No basta con autenticar al usuario; cada operación debe comprobar su relación con el blíster y su rol.
3. **Sincronización con CIMA:** La API externa introduce errores, formatos y tiempos de respuesta que deben normalizarse.
4. **Notificaciones:** El sistema debe distinguir entre crear una notificación interna, enviarla por push y respetar preferencias.
5. **MCP:** La conexión con agentes externos requiere un contrato distinto al de una API REST tradicional.
6. **Diseño mobile-first:** Mantener una experiencia móvil rica sin saturar pantallas pequeñas exige priorizar constantemente.

Estas dificultades han ayudado a madurar la arquitectura y a tomar decisiones más cuidadosas.

## 5. Limitaciones actuales

Aunque el resultado es funcional, existen limitaciones identificadas:

| Limitación | Impacto |
| :--- | :--- |
| Cobertura frontend automatizada inicial | Existe base Vitest/RTL, pero aún faltan formularios y pantallas críticas. |
| E2E de navegador inicial | Playwright cubre entrada pública y accesibilidad crítica, pero no todos los flujos autenticados. |
| Dependencia de servicios externos | CIMA, Resend y Web Push pueden fallar o no estar configurados. |
| Experiencia offline parcial | La PWA cachea recursos y datos CIMA, pero no implementa sincronización completa de escrituras offline. |
| Escaneo de códigos no implementado | El alta se realiza por buscador, no mediante cámara. |
| Analítica sanitaria avanzada pendiente | El sistema no predice reposiciones futuras más allá de umbrales y recordatorios. |

Estas limitaciones no impiden el uso del MVP, pero marcan prioridades claras para futuras versiones.

## 6. Líneas futuras

Las líneas de evolución más relevantes son:

1. **Ampliación de tests frontend y E2E:** Extender React Testing Library, Playwright y auditorías automáticas con axe a login, inventario, calendario y toma de medicación.
2. **Escaneo EAN-13:** Añadir alta de medicamentos mediante cámara y código de barras.
3. **Modo offline avanzado:** Permitir registrar tomas sin conexión y sincronizar al recuperar red.
4. **Predicción de reposición:** Calcular cuándo se agotará un medicamento según ritmo real de consumo.
5. **Exportación de datos:** Generar informes de adherencia para compartir con profesionales sanitarios.
6. **Mejora de analítica familiar:** Mostrar métricas de adherencia por tratamiento, paciente y periodo.
7. **Mayor integración MCP:** Añadir prompts guiados, recursos MCP y flujos OAuth más completos para clientes compatibles.
8. **Internacionalización:** Preparar textos para varios idiomas si el proyecto crece fuera del contexto español.

Estas mejoras siguen la misma dirección del producto: reducir carga cognitiva y aumentar seguridad en la gestión doméstica de medicamentos.

## 7. Valoración final

Blíster cumple el objetivo de construir una aplicación web completa, útil y técnicamente ambiciosa. El proyecto integra frontend, backend, base de datos, diseño accesible, PWA, notificaciones, API externa, recuperación de contraseña, pruebas y despliegue.

Su mayor aportación es unir tres dimensiones que normalmente aparecen separadas: gestión doméstica de medicamentos, colaboración familiar e interoperabilidad con asistentes de IA. Esta combinación convierte a Blíster en una propuesta diferenciada dentro del ámbito de aplicaciones de salud personal.

Como trabajo final de Desarrollo de Aplicaciones Web, el proyecto demuestra capacidad para diseñar, implementar, documentar y desplegar una solución realista con criterios profesionales. Como producto, deja una base sólida para seguir evolucionando hacia una herramienta útil en el día a día de personas que conviven con tratamientos médicos propios o familiares.
