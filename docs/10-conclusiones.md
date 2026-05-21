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

El proyecto partió de la idea de una aplicación sencilla para recordar tomas de medicación y terminó cubriendo bastantes más áreas: multitenencia por blísteres compartidos, roles, integración con la API oficial CIMA/AEMPS, PWA con notificaciones push, recuperación de contraseña, política RGPD, servidor MCP y despliegue en VPS con dominio propio. El alcance se fue ampliando a medida que se añadían piezas que el dominio pedía de forma natural.

Blíster no se limita a recordar tomas: relaciona inventario, tratamiento, paciente, cita, stock, caducidad, autoría y permisos. Esa relación es la que vertebra la aplicación, porque la medicación en un hogar compartido no funciona como una lista plana de recordatorios.

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

El alcance final ha sido amplio para un proyecto individual y eso ha condicionado el ritmo de trabajo. Las funcionalidades giran alrededor de un mismo núcleo —la medicación doméstica—, lo que ha permitido que las piezas encajen entre sí, aunque no siempre fue evidente desde el principio cómo dimensionar cada módulo. En una segunda iteración mantendría el núcleo (botiquín, tratamientos, adherencia, citas, blísteres) y dejaría notificaciones push y MCP para una fase posterior, ya con el resto cubierto por pruebas de navegador.

La zona donde más capas se conectan es la integración entre inventario y adherencia. Registrar una toma no solo cambia una pantalla: crea historial, descuenta stock, puede generar notificaciones y mantiene autoría. La multitenencia por blísteres también atraviesa toda la aplicación, ya que cada endpoint y cada vista filtran por blíster activo y por rol del usuario.

Queda fuera del alcance ampliar la cobertura de pruebas de interfaz en navegador real. El backend y los contratos compartidos cuentan con una base de pruebas amplia, mientras que las pruebas E2E del frontend están centradas en flujos públicos y de accesibilidad. Ampliar la cobertura a formularios complejos y flujos autenticados queda como continuación natural del trabajo.

## 4. Aprendizajes técnicos

El proyecto ha reforzado competencias de desarrollo web profesional.

### 4.1 Full-stack y arquitectura

Se ha trabajado con separación entre rutas, controladores, servicios y modelos. Esta estructura facilita mantener reglas de negocio complejas sin convertir los controladores en bloques monolíticos.

Los esquemas Zod compartidos en `shared` permiten que un cambio en un contrato se refleje en frontend y backend desde un único punto, lo que reduce duplicación y desincronización de validaciones.

### 4.2 Seguridad aplicada

Blíster maneja datos sensibles relacionados con salud. Por ello se han aplicado medidas como tokens hasheados, recuperación con respuesta neutra, CORS controlado, sanitización, validación de ObjectId, permisos por rol y revocación de accesos externos.

La seguridad se aborda en cada flujo —login, recuperación, blísteres, MCP, OAuth y borrado— y no como una capa añadida al final.

### 4.3 Producto y experiencia de usuario

El diseño mobile-first obligó a priorizar información. En pantallas pequeñas no es viable mostrar todo, por lo que cada sección se centra en una tarea principal: tomar, consultar stock, crear tratamiento, revisar calendario o configurar perfil.

La interfaz también ha mostrado la importancia del feedback. En una aplicación de salud, un error de formulario o una acción silenciosa genera desconfianza. Por eso se incorporaron mensajes inline, toasts, estados vacíos y confirmaciones.

### 4.4 Despliegue real

El despliegue ha permitido comparar tres enfoques: Compose local, Render y VPS. Docker aportó reproducibilidad; Render permitió publicar rápido frontend y backend; la VPS dio control sobre el backend y resolvió la arquitectura final con dominio propio, Nginx y HTTPS.

## 5. Dificultades superadas

Las mayores dificultades del proyecto aparecieron en los puntos donde varias capas tenían que funcionar al mismo tiempo. No fueron problemas aislados de una pantalla o de un endpoint, sino integraciones que obligaron a revisar backend, frontend, seguridad, despliegue y documentación de forma conjunta.

| Dificultad | Solución |
| :--- | :--- |
| Modelar cuidado familiar | Blísteres compartidos con roles y membresía. |
| Evitar accesos cruzados | Middleware `checkBlisterAccess` y filtros por `blisterId`. |
| Gestionar stock al registrar tomas | Regla de stock, toma forzada y restauración al deshacer. |
| Formularios con Zod 4 | Resolver propio para React Hook Form. |
| Implementar el servidor MCP | Endpoint `/mcp` dentro de Express, tools autorizadas, OAuth y control de permisos. |
| Integrar notificaciones push | Claves VAPID, service worker, permisos del navegador y requisitos HTTPS. |
| Coordinar notificaciones internas | Bandeja, preferencias, recordatorios, stock bajo y eventos de tratamiento. |
| Ajustar la arquitectura frente al Figma inicial | Adaptación del prototipo a datos reales, permisos, estados dinámicos y navegación final. |
| Evitar Mixed Content | Backend en `https://api.miblister.es` con Nginx y Certbot. |
| Privacidad de datos sensibles | Política RGPD, borrado lógico y purga programada. |
| Consistencia CSS | ITCSS, BEM y tokens centralizados. |

El servidor MCP requirió definir qué acciones podía ejecutar un cliente externo, cómo autorizarlo, cómo aislarlo por usuario y blíster, cómo revocar tokens y cómo encajar el flujo OAuth con el resto del sistema.

Las notificaciones también generaron una dificultad doble. Por un lado, la aplicación necesitaba notificaciones internas coherentes con citas, tratamientos, stock y preferencias. Por otro, las notificaciones push dependían del navegador, del service worker, de permisos explícitos, de claves VAPID y de un despliegue HTTPS correcto. Esta combinación hizo que el comportamiento tuviera que validarse tanto desde código como desde el entorno real.

Otra dificultad relevante fue la distancia entre la idea inicial definida en Figma y la arquitectura que necesitó la aplicación final. El prototipo ayudó a fijar identidad visual y flujo general, pero al incorporar roles, multitenencia, estados de carga, errores, permisos, MCP, privacidad y notificaciones, algunas pantallas tuvieron que evolucionar para responder a condiciones reales que no estaban representadas 1:1 en el mockup inicial.

## 6. Limitaciones actuales

El proyecto es funcional, pero existen límites propios de una primera versión completa.

| Limitación | Impacto |
| :--- | :--- |
| E2E frontend limitado | Falta cubrir registro, inventario, tratamiento y toma completa en navegador real. |
| Offline parcial | La PWA cachea recursos y datos CIMA, pero no sincroniza escrituras offline. |
| Push dependiente del navegador | Requiere permisos y soporte del dispositivo. |
| Sin escaneo de códigos | El alta se realiza mediante buscador CIMA, no por cámara. |
| Sin informes avanzados | No genera todavía informes de adherencia exportables. |
| Analítica predictiva no implementada | No calcula reposición futura por consumo histórico. |
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

Líneas de evolución ordenadas por impacto:

| Impacto | Mejora | Motivo |
| :--- | :--- | :--- |
| Alta | E2E autenticado completo | Aumenta confianza en flujos críticos y mejora evidencia de calidad. |
| Alta | Documentación visual completa | Refuerza la trazabilidad entre prototipo, guía de estilos e interfaz implementada. |
| Media | Informes exportables | Aporta valor al seguimiento familiar o médico. |
| Media | Offline avanzado | Mejora uso en situaciones sin conexión, pero requiere resolución de conflictos. |
| Baja | Internacionalización | Útil si el producto crece fuera del contexto español. |

## 8. Valoración final

La valoración final se centra en el proceso de aprendizaje y desarrollo. Blíster ha permitido trabajar de forma integrada competencias de segundo curso de Desarrollo de Aplicaciones Web: análisis de requisitos, diseño de interfaz, desarrollo frontend, desarrollo backend, modelado de datos, validación, pruebas, documentación y despliegue.

El desarrollo ha exigido tomar decisiones que no aparecen de forma aislada en ejercicios más pequeños. La gestión de medicamentos afecta al modelo de datos, a los permisos, al diseño visual, a la accesibilidad, a la experiencia de formularios y al despliegue. Esa relación entre capas ha sido una de las partes más formativas del proyecto.

La principal conclusión personal es que una aplicación completa no depende solo de añadir funcionalidades. También requiere ordenar el alcance, documentar decisiones, proteger datos, cuidar los estados de error, pensar en accesibilidad y preparar un entorno donde el sistema pueda ejecutarse fuera del equipo de desarrollo. Los mayores inconvenientes surgieron precisamente en las integraciones transversales: MCP, notificaciones, push, despliegue HTTPS y adaptación del diseño inicial a una arquitectura funcional con datos y permisos reales.

Blíster queda como cierre de una etapa formativa y como base de evolución. El proyecto reúne las partes esenciales de una aplicación web moderna y deja identificados los siguientes pasos naturales: ampliar pruebas de navegador, reforzar evidencias visuales, mejorar informes, estudiar sincronización offline y continuar puliendo la experiencia de usuario.