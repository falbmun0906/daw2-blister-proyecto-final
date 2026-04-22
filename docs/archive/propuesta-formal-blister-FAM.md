# Blíster — Gestión Inteligente de tu Botiquín Personal

- **Autor:** Francisco Alba Muñoz
- **Ciclo:** 2.º DAW — Proyecto Final de Ciclo
- **Fecha:** 6 de marzo de 2026

---

## Índice

1. [Identificación de necesidades](#1-identificación-de-necesidades)
2. [Oportunidades de negocio](#2-oportunidades-de-negocio)
3. [Tipo de proyecto](#3-tipo-de-proyecto)
4. [Características específicas](#4-características-específicas)
5. [Obligaciones legales y prevención](#5-obligaciones-legales-y-prevención)
6. [Ayudas y subvenciones](#6-ayudas-y-subvenciones)
7. [Guión de trabajo](#7-guión-de-trabajo)
8. [Referencias](#referencias)

---

## 1. Identificación de necesidades

### 1.1 El problema

La gestión de medicamentos en el hogar es una tarea cotidiana que la mayoría de personas realiza de forma manual y desorganizada: pastilleros físicos, notas en papel o, en el mejor caso, alarmas genéricas en el móvil. Esta falta de sistematización provoca errores frecuentes como olvidar tomar una dosis, duplicar tomas, no conocer las interacciones entre medicamentos o acumular fármacos caducados en casa sin saberlo.

### 1.2 Cómo se detectó la necesidad

La necesidad surgió de la experiencia personal directa en el hogar. Mi padre es paciente cardíaco con tratamiento crónico (varios medicamentos diarios a distintas horas), y yo mismo gestiono episodios de migraña con aura que requieren medicación específica según la fase del ataque. En ambos casos, el sistema de seguimiento se reducía a recordar de memoria, dejar notas en papel o confiar en alarmas genéricas del móvil sin ningún contexto sobre qué medicamento, qué dosis o si ya se había tomado.

Esta situación es representativa de un problema extendido: según la Sociedad Española de Farmacia Clínica, Familiar y Comunitaria (SEFAC), el incumplimiento terapéutico afecta a entre el 30% y el 50% de los pacientes con enfermedades crónicas en España, siendo el olvido el factor más citado. En el caso concreto de enfermedades cardiovasculares, la Fundación Española del Corazón advierte que no seguir correctamente la medicación es una de las principales causas de hospitalización evitable.

- **Experiencia propia y familiar** - Gestión real de un botiquín con medicación crónica (cardiología) y medicación puntual de alta precisión temporal (triptanes para migraña con aura, donde el momento de la toma es crítico para su eficacia).
- **Conversaciones con personas del entorno** Familiares y conocidos que gestionan tratamientos crónicos (hipertensión, hipotiroidismo, diabetes) confirmaron no disponer de ningún sistema estructurado de seguimiento de tomas.
- **Análisis del mercado de apps de salud**, donde se observó una brecha clara entre herramientas médicas profesionales (complejas y orientadas a clínicos) y la ausencia de soluciones simples orientadas al usuario doméstico.

### 1.3 Usuarios objetivo

| Perfil | Descripción | Necesidad principal |
|---|---|---|
| Paciente crónico adulto | Persona con tratamiento continuado (hipertensión, diabetes, etc.) | Registro y recordatorio de tomas diarias |
| Familiar cuidador | Persona que gestiona la medicación de un familiar dependiente | Visión global del botiquín familiar, alertas de stock |
| Joven ocasional | Persona sana que toma medicación de forma puntual | Saber qué tiene en casa y si ha caducado |
| Usuario agéntico | Persona que usa asistentes de IA personales (Claude, ChatGPT, etc.) | Consultar su botiquín desde el agente que ya usa |

---

## 2. Oportunidades de negocio

### 2.1 Análisis de competidores

| Solución | Tipo | Fortalezas | Debilidades |
|---|---|---|---|
| **Medisafe** | App móvil nativa (iOS/Android) | Recordatorios avanzados, interacciones | Sin acceso API, sin integración agéntica, no es web |
| **MyTherapy** | App móvil | Diario de salud completo | Orientada a enfermedades crónicas, interfaz compleja |
| **Google Calendar / Alarmas** | Genérico | Fácil de usar | Sin contexto de medicación, sin registro de tomas |
| **Farmacias online (p. ej. Promofarma)** | E-commerce | Gestión de pedidos | No gestionan el consumo ni el stock del usuario |
| **Blíster** | **Aplicación web** | **API REST + capa MCP, accesible desde cualquier dispositivo, integrable con agentes IA externos** | Proyecto nuevo, base de usuarios por construir |

### 2.2 Propuesta de valor diferencial

Blíster no es solo un recordatorio de tomas; se posiciona como un puente entre el rigor farmacéutico y la vida digital del usuario. Su valor diferencial se asienta en tres pilares:

1.  **Integración con la Fuente Oficial (AEMPS - CIMA):** A diferencia de la mayoría de apps que dependen de que el usuario escriba a mano el nombre del fármaco (con el riesgo de error que conlleva), Blíster se conecta a la API del **Centro de Información online de Medicamentos (CIMA)**. Esto garantiza:
    *   **Veracidad:** Información oficial y actualizada sobre principios activos y formatos.
    *   **Seguridad:** Acceso directo al prospecto oficial en PDF para evitar consultas en fuentes no fiables.
    *   **Automatización:** El usuario solo necesita empezar a escribir para que la app sugiera el medicamento exacto registrado en España.

2.  **Ecosistema Agéntico (Capa MCP):** Es la primera aplicación doméstica en España que implementa el **Model Context Protocol**. Esto permite que Blíster no sea una "isla" de datos. El usuario puede delegar la gestión en su IA de preferencia (Claude, ChatGPT). No es el usuario quien se adapta a la app, es la app la que se integra en el flujo de trabajo digital del usuario.

3.  **Accesibilidad Universal (PWA):** Mediante tecnología *Progressive Web App*, se eliminan las barreras de las tiendas de aplicaciones (App Store/Play Store). Se garantiza un acceso ligero, multiplataforma y con capacidad de funcionamiento offline y notificaciones push, esencial para un entorno crítico como es la salud.

### 2.3 Potencial y escalabilidad

El proyecto presenta un alto potencial de crecimiento basado en las siguientes líneas:

*   **Crecimiento del mercado mHealth:** El sector de la salud digital en España está en plena expansión, con un enfoque creciente en la autonomía del paciente crónico. Con más de 20 millones de personas con patologías crónicas, el mercado potencial es masivo.
*   **Escalabilidad B2B2C:** Aunque nace como herramienta personal, la arquitectura está preparada para evolucionar hacia un modelo donde **cuidadores profesionales o farmacias** puedan supervisar (bajo permiso) el stock y la adherencia del paciente, reduciendo el gasto sanitario por tomas incorrectas.
*   **Monetización y Datos:** Cumpliendo estrictamente el RGPD, la agregación de datos anónimos sobre adherencia terapéutica tiene un alto valor para estudios de salud pública y mejora de procesos asistenciales.

---

## 3. Tipo de proyecto

### 3.1 Definición del tipo de aplicación

Blíster se concibe como una solución moderna y desacoplada, utilizando un stack basado en JavaScript/TypeScript de extremo a extremo. Se define como una **Progressive Web App (PWA)** de arquitectura **SPA (Single Page Application)** sustentada por un backend de microservicios lógicos.

La elección de esta arquitectura se fundamenta en:

*   **PWA (Progressive Web App):** Combina lo mejor de la web y las apps nativas. Permite la instalación en la pantalla de inicio del móvil y el envío de **notificaciones push** (críticas para los recordatorios de tomas) sin los costes de publicación y mantenimiento de las tiendas de Apple o Google. Además, garantiza el funcionamiento en condiciones de baja conectividad mediante el uso de *Service Workers*.
*   **SPA (Single Page Application):** Al utilizar React, la navegación es instantánea. En una aplicación de gestión diaria, la fricción de recarga de página penaliza la experiencia del usuario. La SPA permite un flujo de trabajo fluido, similar al de una aplicación nativa.
*   **API REST + MCP (Decoupled Architecture):** El backend no solo sirve al frontend oficial, sino que actúa como un **Hub de Datos de Salud**. La API REST sigue el estándar OpenAPI para interoperabilidad, mientras que el servidor MCP (Model Context Protocol) abre la puerta a la nueva era de la "IA Agéntica", permitiendo que la lógica de negocio sea consumida por modelos de lenguaje externos de forma segura.

### 3.2 Arquitectura propuesta

El siguiente diagrama detalla el flujo de información entre el cliente, el servidor, la persistencia de datos y las integraciones externas (IA y Organismos Oficiales):

```text
┌───────────────────────────────────────────────────────────┐
│                    USUARIO / CLIENTE                      │
│        [ React 18 SPA + Service Worker (PWA) ]            │
└──────────────┬────────────────────────────────────────────┘
               │
               │ HTTPS / REST (JSON)
               │
┌──────────────▼────────────────────────────────────────────┐
│                  BACKEND (Node.js / Express)              │
│                                                           │
│  ┌────────────────────┐          ┌─────────────────────┐  │
│  │     API REST       │          │ Servidor MCP Remote │  │
│  │   (Endpoints)      │          │     (SSE/HTTP)      │  │
│  └─────────┬──────────┘          └──────────┬──────────┘  │
│            │                                │             │
│  ┌─────────▼────────────────────────────────▼──────────┐  │
│  │         AUTENTICACIÓN Y AUTORIZACIÓN (JWT)          │  │
│  └─────────────────────────┬───────────────────────────┘  │
│                            │                              │
│  ┌─────────────────────────▼───────────────────────────┐  │
│  │                 LÓGICA DE NEGOCIO                   │  │
│  └─────────────┬───────────────────────────┬───────────┘  │
└────────────────┼───────────────────────────┼──────────────┘
                 │                           │
┌────────────────▼───────┐      ┌────────────▼──────────────┐
│     BASE DE DATOS      │      │       APIS EXTERNAS       │
│  (PostgreSQL / Neon)   │      │  (AEMPS / CIMA - Oficial) │
└────────────────────────┘      └───────────────────────────┘
                 ▲
                 │ (MCP Protocol - Streamable HTTP)
┌────────────────┴──────────────────────────────────────────┐
│                 AGENTES DE IA EXTERNOS                    │
│        (Claude Desktop, ChatGPT, Copilot, etc.)           │
└───────────────────────────────────────────────────────────┘
```

**Flujo de la arquitectura:**
1.  **Frontend (PWA):** El usuario interactúa con la aplicación web instalable, que consume la **API REST** para la gestión diaria del botiquín.
2.  **Agentes de IA:** Los asistentes externos se conectan al **Servidor MCP Remoto** para consultar o registrar datos mediante lenguaje natural, actuando en nombre del usuario.
3.  **Seguridad:** Ambas vías de entrada pasan por un middleware de **Autenticación (JWT/OAuth2)** antes de tocar la lógica de negocio.
4.  **Datos:** La lógica de negocio persiste los datos en **PostgreSQL** y enriquece la información consultando en tiempo real la **API de la AEMPS** para garantizar el rigor de la información farmacéutica.

### 3.3 Justificación técnica del Stack

| Componente | Elección | Motivo Técnico |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | Máximo rendimiento en el build y un ecosistema de librerías para PWA (Vite PWA Plugin) muy maduro. |
| **Backend** | Node.js + Express | Manejo asíncrono eficiente para múltiples peticiones simultáneas de la API y el streaming del protocolo MCP. |
| **Base de Datos** | PostgreSQL | Robustez y consistencia de datos (ACID), fundamental cuando gestionamos inventarios de salud. |
| **Protocolo IA** | MCP (Model Context Protocol) | Estándar emergente (noviembre 2024) que permite que Blíster sea "AI-Ready" desde el primer día. |
| **Datos Médicos** | API CIMA | Fuente de verdad de la Agencia Española de Medicamentos para evitar errores de introducción de datos. |

---

## 4. Características específicas

### 4.1 MVP — Funcionalidades obligatorias (Core)

El Producto Mínimo Viable se define para cubrir el ciclo completo de gestión: desde la base de datos oficial hasta la supervisión compartida en el hogar.

1.  **Gestión de Identidad y Roles:** Registro/Login con JWT. El sistema permitirá perfiles de "Paciente" y "Cuidador", sentando las bases para el acceso compartido.
2.  **Búsqueda Inteligente (Integración AEMPS):** Buscador conectado a la API de CIMA. Autocompletado oficial de nombres, principios activos y acceso directo al prospecto oficial.
3.  **Gestión del Botiquín Compartido (Multi-usuario):** 
    *   Creación de un "Botiquín Familiar" donde varios usuarios pueden ver y editar el stock.
    *   Control de inventario con umbrales de aviso para reposición.
4.  **Calendario y Planificador de Tomas:**
    *   **Vista de Calendario:** Interfaz visual (diaria/semanal) donde se muestran las tomas programadas y su estado (completada, pendiente, omitida).
    *   **Configuración de Pautas:** Posibilidad de definir tomas recurrentes (ej: "cada 8 horas", "una al desayuno").
5.  **Registro de Tomas y Adherencia:** Acción rápida para marcar tomas. El sistema descuenta stock y genera una métrica de cumplimiento terapéutico.
6.  **Sistema de Notificaciones Push (PWA):** Recordatorios automáticos en el móvil cuando llega la hora de una toma según el calendario programado.
7.  **Servidor MCP Remoto (AI Ready):** 
    *   `get_medicine_cabinet`: Lista el inventario del botiquín familiar.
    *   `log_dose_taken`: Registro de tomas por voz/texto a través de IA.
    *   `get_schedule`: Permite a la IA informar al usuario sobre su próxima toma: *"¿Qué me toca tomar ahora?"*.
8.  **Historial Detallado:** Registro auditable de quién registró cada toma (especialmente útil en botiquines compartidos).
9.  **Experiencia PWA:** Aplicación instalable, accesible offline y diseñada bajo principios *Mobile-first*.

### 4.2 Funcionalidades opcionales (Post-MVP)

1.  **Escaneo de Código de Barras (EAN-13):** Uso de la cámara para identificar el medicamento y volcar los datos desde la AEMPS sin teclear.
2.  **Exportación de Informes de Adherencia:** Generación de PDF profesional con el historial de tomas para entregar al médico de cabecera o especialista.
3.  **Integración con Calendarios Externos:** Sincronización bidireccional con Google Calendar o iCal para centralizar los avisos de salud con la agenda personal.
4.  **Gestión de Citas Médicas:** Pequeño módulo para anotar próximas consultas y asociarlas a los medicamentos actuales.

### 4.3 Requisitos técnicos detallados

*   **Modelo de Datos Relacional:** La base de datos (PostgreSQL) implementará una estructura de relaciones N:M para usuarios y botiquines, permitiendo que un usuario pertenezca a varios botiquines (ej: el propio y el de sus padres).
*   **Lógica de Programación de Tomas:** Implementación de algoritmos para el cálculo de recurrencias (librerías tipo `date-fns` o `luxon`) que aseguren la precisión horaria en distintos husos.
*   **Interoperabilidad MCP:** Uso del protocolo de transporte **SSE (Server-Sent Events)** para comunicación remota. Autenticación mediante **OAuth 2.0 con scopes definidos** (lectura/escritura).
*   **Documentación y Estándares:** API documentada íntegramente con **Swagger/OpenAPI 3.1**. Validación estricta de datos en el servidor con **Zod**.
*   **Accesibilidad (WCAG 2.2 AA):** Especial énfasis en la legibilidad del calendario y botones de acción rápida, garantizando que personas con visión reducida o destreza motora limitada puedan registrar sus tomas.
*   **Rendimiento:** Carga inicial optimizada y respuesta de la API inferior a 300ms para acciones de registro de tomas.

---

## 5. Obligaciones legales y prevención

### 5.1 Normativa aplicable

| Normativa | Aplicabilidad al proyecto |
|---|---|
| **RGPD (UE 2016/679)** | Gestión de **datos de salud** (Categoría Especial, Art. 9). Se requiere consentimiento explícito y Registro de Actividades de Tratamiento (RAT). |
| **LOPDGDD (LO 3/2018)** | Regula el derecho a la desconexión digital y el testamento digital, además de adaptar el RGPD al marco español. |
| **LSSI-CE (Ley 34/2002)** | Obliga a la transparencia en el titular del servicio, política de cookies (aunque sean técnicas) y condiciones de contratación/uso. |
| **Ley de Medicamentos (Ley 29/2006)** | Blíster actúa como herramienta de gestión informativa. Se incluirá un *Disclaimer* (descargo de responsabilidad) indicando que **no sustituye el consejo de un profesional sanitario**. |
| **Ley de Startups (Ley 28/2022)** | En caso de comercialización, se estudiarán los beneficios fiscales por el carácter innovador del protocolo MCP. |

### 5.2 Medidas de seguridad y protección de datos

*   **Cifrado y Comunicaciones:** Uso de **TLS 1.3** para todas las conexiones. Las claves de API y secrets del servidor se gestionarán mediante variables de entorno protegidas.
*   **Gestión de Consentimiento Familiar:** Para habilitar el "Botiquín Compartido", se implementará un sistema de **doble opt-in**: el usuario administrador invita y el invitado debe aceptar explícitamente la compartición de sus datos de toma.
*   **Seguridad en la Capa MCP:** Las conexiones desde agentes de IA externos (Claude/ChatGPT) solo tendrán acceso a los datos mediante **tokens de acceso OAuth 2.0 con caducidad**. Ningún dato de salud será utilizado para entrenar modelos públicos; solo se exponen como contexto en tiempo de ejecución.
*   **Minimización y Anonimización:** Se aplicará el principio de "privacidad desde el diseño". Las contraseñas se hashearán con **Argon2** o **bcrypt** (coste 12). Se implementará un sistema de purga automática de logs cada 30 días.
*   **Derecho al Olvido y Portabilidad:** Botón de exportación de datos en formato JSON/CSV y opción de borrado completo de la base de datos (eliminación de cuenta).

### 5.3 Accesibilidad web (WCAG 2.2 nivel AA)

Dado que los usuarios con medicación crónica suelen ser personas de edad avanzada o con visión reducida, la accesibilidad es un pilar funcional de Blíster:

*   **Perceptible:** Uso de **HTML semántico** para que los lectores de pantalla (Screen Readers) identifiquen correctamente los calendarios y las dosis. Contraste de color validado (ratio > 4.5:1).
*   **Operable:** 
    *   **Touch Targets:** Elementos interactivos (botones de "Toma registrada") con un tamaño mínimo de **44x44 px** para facilitar el uso en móviles por personas con temblores o baja destreza motora.
    *   Navegación completa mediante teclado (Tab e indicación visual de *focus*).
*   **Comprensible:** Mensajes de error claros y ayuda contextual en el buscador de la AEMPS.
*   **Robusto:** Compatibilidad garantizada entre navegadores modernos y soporte para las funciones PWA en iOS y Android.
---

## 6. Ayudas y subvenciones

### 6.1 Kit Digital (Fondos NextGenerationEU)

El programa **Kit Digital** es una iniciativa del Gobierno de España para promover la digitalización de pymes y autónomos. Aunque Blíster nace en un entorno académico, su evolución como producto comercial (SaaS) permitiría acceder a bonos de hasta **3.000€ (Segmento III)**.

*   **Categoría de solución:** "Gestión de procesos". Blíster encaja aquí al automatizar la gestión de inventarios y flujos de salud, sustituyendo procesos manuales.
*   **Relevancia:** Permitiría financiar la migración de los servicios *free tier* a infraestructura escalable y costear auditorías de ciberseguridad.
*   **Referencia:** [Acelera Pyme - Kit Digital](https://www.acelerapyme.gob.es/kit-digital)

### 6.2 ENISA y Ley de Startups

Dada la naturaleza innovadora del proyecto (uso de **MCP** y arquitectura desacoplada), Blíster podría optar a la **Certificación de Startup** otorgada por ENISA bajo la **Ley 28/2022**.

*   **Línea Jóvenes Emprendedores:** Préstamos participativos desde 25.000€ sin necesidad de avales personales, enfocados a proyectos liderados por jóvenes (menores de 40 años) con un modelo de negocio innovador.
*   **Beneficios Fiscales:** La certificación permitiría reducir el Impuesto de Sociedades del 25% al 15% en los primeros ejercicios y ampliar la exención de impuestos por stock options, facilitando la atracción de talento técnico.
*   **Referencia:** [ENISA - Jóvenes Emprendedores](https://www.enisa.es/es/financia-tu-empresa/lineas-de-financiacion/jovenes-emprendedores)

### 6.3 Ayudas Neotec (CDTI)

Si el proyecto escala integrando modelos de IA propios o análisis predictivo de datos de salud, podría optar a las subvenciones **Neotec** del CDTI. Estas ayudas están destinadas a proyectos donde la estrategia de negocio se base en el desarrollo tecnológico (I+D).

*   **Cuantía:** Subvenciones de hasta el 70% del presupuesto del proyecto.
*   **Referencia:** [CDTI - Neotec](https://www.cdti.es)

### 6.4 Recursos "Zero Cost" para el desarrollo del MVP

Para garantizar la viabilidad económica del proyecto durante la fase de desarrollo y defensa, se utilizará un stack de servicios gratuitos con el objetivo de **coste de infraestructura = 0€**.

| Recurso | Uso y Capacidad | Proveedor |
| :--- | :--- | :--- |
| **Neon** | Base de datos PostgreSQL con ramificación de datos (branching). 512MB storage. | [neon.tech](https://neon.tech) |
| **Vercel** | Hosting del Frontend React con CI/CD automático y SSL gratuito. | [vercel.com](https://vercel.com) |
| **Railway** | Hosting del Backend (Node.js) y servidor MCP. 5€ de crédito gratuito mensual. | [railway.app](https://railway.app) |
| **Cloudinary** | Almacenamiento optimizado de imágenes de medicamentos (fotos de cajas). | [cloudinary.com](https://cloudinary.com) |
| **Postman / Insomnia** | Testing de la API REST y documentación técnica interna. | Open Source / Free |
| **AEMPS CIMA** | Base de datos oficial de medicamentos en España. Acceso mediante Open Data. | [aemps.es](https://cima.aemps.es) |
| **GitHub Actions** | Automatización de tests (Unit/Integration) y despliegue continuo. | [github.com](https://github.com) |

---

## 7. Guion de trabajo

### 7.1 Metodología de desarrollo

Se aplicará una metodología **Agile basada en Kanban**, ideal para proyectos individuales de ciclo corto. El flujo de trabajo se estructurará de la siguiente manera:

*   **Gestión de Tareas:** Uso de **GitHub Projects** con un tablero automatizado. Cada funcionalidad se desglosará en *Issues* con etiquetas de prioridad y esfuerzo.
*   **Control de Versiones:** Estrategia **GitHub Flow**. Se trabajará en ramas de funcionalidad (*feature-branch*) que se integrarán en la rama principal mediante *Pull Requests* tras pasar los tests de CI.
*   **Calidad de Código:** Uso de **Conventional Commits** para mantener un historial de cambios legible y facilitar la generación de *changelogs*.
*   **Documentación Continua:** El repositorio contendrá un **Diario de Desarrollo (ADR - Architecture Decision Records)** donde se justificarán las decisiones técnicas tomadas en cada fase.

### 7.2 Fases del proyecto e Hitos

#### Fase 0 — Análisis, Diseño y Setup (Semanas 1-2)
*   Diseño del modelo de datos relacional (PostgreSQL) incluyendo la lógica de botiquines compartidos.
*   Prototipado en Figma de las vistas clave: Calendario de tomas y Dashboard del botiquín.
*   Configuración del monorepo con TypeScript y pipelines iniciales de GitHub Actions (Linter y Prettier).
*   **Hito 1:** Esquema de base de datos aprobado y prototipo de alta fidelidad validado.

#### Fase 1 — Backend & Integración de Datos (Semanas 3-5)
*   Desarrollo de la API REST: Autenticación JWT y gestión de roles (paciente/cuidador).
*   **Conexión con AEMPS (CIMA):** Implementación del buscador de medicamentos oficial.
*   Lógica de negocio: CRUD de medicamentos y registro histórico de tomas.
*   **Hito 2:** API funcional con documentación Swagger y buscador de medicamentos activo.

#### Fase 2 — Frontend & Experiencia de Usuario (Semanas 6-8)
*   Desarrollo de la interfaz en React: Dashboard, Inventario y **Vista de Calendario**.
*   Implementación de la lógica de programación de tomas (recurrencias).
*   Configuración de la **PWA**: Service Worker para modo offline y manifiesto para instalación.
*   **Hito 3:** MVP web funcional e instalable en dispositivos móviles con conexión a la API.

#### Fase 3 — Ecosistema IA: Servidor MCP (Semanas 9-10)
*   Desarrollo del servidor MCP remoto utilizando el transporte SSE.
*   Exposición de herramientas para IA: `get_medicine_cabinet`, `log_dose_taken` y el nuevo `get_schedule`.
*   Pruebas de integración con **Claude Desktop** y validación de seguridad OAuth 2.0.
*   **Hito 4:** Sistema integrado con IA capaz de registrar tomas y consultar el calendario por lenguaje natural.

#### Fase 4 — Calidad, Accesibilidad y Cierre (Semanas 11-12)
*   Auditoría de accesibilidad **WCAG 2.2 AA** (Lighthouse + axe-core).
*   Implementación de notificaciones Push reales para los recordatorios de tomas.
*   Despliegue final en producción (Vercel/Railway).
*   Redacción de la memoria técnica y preparación de la defensa.
*   **Hito 5:** Proyecto desplegado y documentación entregada.

### 7.3 Cronograma visual (Gantt)

```
Semana:    01  02  03  04  05  06  07  08  09  10  11  12
           |---|---|---|---|---|---|---|---|---|---|---|---|
Fase 0:    ████████ [H1]
Fase 1:            ████████████ [H2]
Fase 2:                        ████████████ [H3]
Fase 3:                                    ████████ [H4]
Fase 4:                                            ████████ [H5]

Leyenda de Hitos:
[H1]: Diseño y Setup finalizado. Prototipo Figma listo.
[H2]: API REST + Integración AEMPS funcional y documentada.
[H3]: Frontend PWA + Calendario integrado con el Backend.
[H4]: Servidor MCP operativo y testeado con Claude/IA.
[H5]: Despliegue final, auditoría de accesibilidad y entrega.
```

### 7.4 Herramientas de gestión

| Herramienta | Función |
| :--- | :--- |
| **GitHub Projects** | Tablero Kanban y seguimiento de hitos. |
| **GitHub Issues** | Definición de requisitos y reporte de bugs. |
| **Figma** | Diseño de UI/UX y flujos de usuario. |
| **Postman** | Testing y documentación de la API REST. |
| **Lighthouse / axe** | Herramientas de auditoría de accesibilidad y rendimiento. |
| **Markdown** | Redacción de la memoria y diario de desarrollo. |

---

## Referencias

- Agencia Española de Medicamentos y Productos Sanitarios (AEMPS). *CIMA — Centro de Información online de Medicamentos*. https://cima.aemps.es
- Anthropic / MCP Community. *Model Context Protocol — Specification 2025-11-25*. https://modelcontextprotocol.io/specification/2025-11-25
- Anthropic / MCP Community. *Model Context Protocol — Architecture*. https://modelcontextprotocol.io/specification/2025-06-18/architecture
- Red.es. *Kit Digital — Programa de digitalización de pymes*. https://www.red.es/es/iniciativas/proyectos/kit-digital
- ENISA. *Startups y pymes — Líneas de financiación*. https://www.enisa.es/es/financia-tu-empresa/lineas-de-financiacion/d/startups-y-pymes
- ENISA. *Cifras ENISA 2025*. https://www.enisa.es/es/sala-de-prensa/notas-prensa/cifras-enisa-2025-683
- ILUNION Accesibilidad. *Pautas de accesibilidad para el Contenido Web (WCAG 2.2)*. https://www.ilunion.com/es/blog-puntoilunion/wcag-accesibilidad
- Agencia Española de Protección de Datos (AEPD). *Guía para el cumplimiento del RGPD*. https://www.aepd.es
- W3C. *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/
- Boletín Oficial del Estado. *Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD)*. https://www.boe.es/eli/es/lo/2018/12/05/3
- Boletín Oficial del Estado. *Ley 34/2002, de 11 de julio, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE)*. https://www.boe.es/eli/es/l/2002/07/11/34/con
