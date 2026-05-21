# 01 - Introducción

<<<<<<< HEAD
## Índice
1. [Identificación del proyecto](#1-identificación-del-proyecto)
   - 1.1 [Denominación y marca](#11-denominación-y-marca)
   - 1.2 [Resumen ejecutivo](#12-resumen-ejecutivo)
2. [Origen y motivación](#2-origen-y-motivación)
   - 2.1 [Contexto y experiencia personal](#21-contexto-y-experiencia-personal)
   - 2.2 [Problemática detectada](#22-problemática-detectada)
   - 2.3 [Justificación sanitaria y social](#23-justificación-sanitaria-y-social)
3. [Objetivos del proyecto](#3-objetivos-del-proyecto)
   - 3.1 [Objetivo general](#31-objetivo-general)
   - 3.2 [Objetivos específicos técnicos](#32-objetivos-específicos-técnicos)
   - 3.3 [Objetivos específicos funcionales](#33-objetivos-específicos-funcionales)
   - 3.4 [Objetivos de diseño y accesibilidad](#34-objetivos-de-diseño-y-accesibilidad)
4. [Antecedentes y análisis de mercado](#4-antecedentes-y-análisis-de-mercado)
   - 4.1 [Análisis de soluciones existentes](#41-análisis-de-soluciones-existentes)
   - 4.2 [Propuesta de valor diferencial](#42-propuesta-de-valor-diferencial)
5. [Expectativas de éxito](#5-expectativas-de-éxito)

Aquí tienes el desarrollo del primer bloque del documento, redactado de forma profesional y ajustada a la normativa ortográfica del español.

---

## 1. Identificación del proyecto

Este proyecto surge como el trabajo final del ciclo de Grado Superior de Desarrollo de Aplicaciones Web (DAW). Ha sido diseñado y desarrollado por **Francisco Alba Muñoz**, con el objetivo de integrar las competencias técnicas adquiridas durante la formación académica en una solución tecnológica con impacto real en la salud y el bienestar cotidiano.

La motivación principal detrás de este desarrollo no es solo cumplir con un requisito académico, sino proponer una herramienta capaz de digitalizar procesos que, a día de hoy, siguen realizándose de forma arcaica en la mayoría de los hogares, aprovechando para ello las últimas innovaciones en el ámbito de la inteligencia artificial y la interoperabilidad de datos.

### 1.1 Denominación y marca

El proyecto recibe el nombre comercial de **Blíster**. 

La elección de este nombre responde a la voluntad de utilizar un término universalmente reconocido en el ámbito farmacéutico. El "blíster" es el envase primario que protege y organiza la medicación en dosis individuales; del mismo modo, la aplicación actúa como ese contenedor seguro, pero en el plano digital.

Desde el punto de vista de la identidad de marca, Blíster busca transmitir:
*   **Rigor:** Mediante la conexión con fuentes oficiales.
*   **Sencillez:** Con una interfaz limpia que no abrume al usuario.
*   **Modernidad:** A través de la integración de protocolos de IA de vanguardia.

El logotipo y la guía de estilos (que se detallarán en el apartado 04) utilizan tonos verde-azulados (*teal*), asociados tradicionalmente a la higiene, la salud y la calma, garantizando a su vez un alto contraste para cumplir con las necesidades de accesibilidad del proyecto.

Desarrollamos el bloque 2, que es el que otorga la carga emocional y la justificación real al proyecto. Este apartado es fundamental para que el tribunal entienda que no has elegido la temática al azar, sino para resolver un problema de seguridad sanitaria.

## 2. Origen y motivación

### 2.1 Contexto y experiencia personal

La idea de Blíster nace de la observación directa y la gestión cotidiana de la salud en el ámbito familiar. En concreto, el proyecto se inspira en dos escenarios reales con necesidades radicalmente distintas pero complementarias:

1.  **Medicación crónica:** La gestión del tratamiento de un paciente cardíaco (mi padre), que requiere la toma de múltiples fármacos a horas estrictas. En este escenario, el riesgo principal es el olvido de dosis críticas o la confusión entre envases similares.
2.  **Medicación puntual de alta precisión:** Mi propia experiencia gestionando episodios de migraña con aura. En este caso, la eficacia del fármaco (triptanes) depende totalmente de la rapidez de la toma tras los primeros síntomas. 

En ambos casos, se detectó que las herramientas utilizadas (notas físicas, memoria o alarmas genéricas del móvil) eran insuficientes, carecían de contexto sobre el medicamento y no ofrecían un control real sobre el inventario disponible en casa.

### 2.2 Problemática detectada

A través del análisis de estos escenarios y conversaciones con otras personas en situaciones similares, se identificaron los siguientes puntos críticos:

*   **Falta de sistematización:** La gestión del botiquín suele ser reactiva (se descubre que no queda medicación cuando se va a realizar la toma).
*   **Riesgos de seguridad:** Acumulación de fármacos caducados y falta de acceso rápido a los prospectos oficiales ante dudas sobre efectos secundarios o contraindicaciones.
*   **Desconexión entre cuidadores:** En familias donde varios miembros cuidan de una persona dependiente, no existe un registro compartido que confirme si una dosis ya ha sido administrada, lo que puede derivar en duplicidades peligrosas.
*   **Brecha tecnológica:** Las aplicaciones de salud actuales suelen estar orientadas a entornos clínicos profesionales (muy complejas) o son demasiado simples (simples recordatorios sin gestión de stock).

### 2.3 Justificación sanitaria y social

El incumplimiento de los tratamientos es un problema de salud pública de primer orden. Según datos de la **Sociedad Española de Farmacia Clínica, Familiar y Comunitaria (SEFAC)**, entre el 30% y el 50% de los pacientes con enfermedades crónicas en España no cumplen correctamente su tratamiento, siendo el olvido el factor más común.

Por otro lado, la **Fundación Española del Corazón** advierte que la falta de adherencia terapéutica es una de las principales causas de hospitalización evitable y de fracaso en el control de enfermedades cardiovasculares. 

Blíster busca mitigar esta problemática proporcionando una herramienta que no solo recuerde la toma, sino que asegure que el medicamento esté disponible, vigente y correctamente supervisado por el entorno familiar, reduciendo así la carga cognitiva del paciente y el riesgo de errores médicos en el hogar.

Este apartado es fundamental para que el tribunal identifique qué competencias del ciclo de DAW estás aplicando. He redactado los objetivos de forma que destaquen tanto la parte técnica (programación y despliegue) como la parte de diseño e innovación.

## 3. Objetivos del proyecto

### 3.1 Objetivo general

El objetivo principal de Blíster es desarrollar una aplicación web progresiva (PWA) que centralice la gestión de medicamentos y tratamientos médicos en el ámbito doméstico. La herramienta busca mejorar la adherencia terapéutica de los usuarios mediante un control riguroso del inventario, la automatización de recordatorios y la integración de fuentes de datos oficiales y tecnologías de inteligencia artificial.

### 3.2 Objetivos específicos técnicos

Para garantizar un desarrollo de alta calidad alineado con las exigencias del ciclo superior, se establecen los siguientes objetivos técnicos:

*   **Implementación del stack MERN:** Utilizar MongoDB, Express, React y Node.js para construir una arquitectura robusta, escalable y basada íntegramente en JavaScript/TypeScript.
*   **Desarrollo de una PWA:** Configurar *Service Workers* y manifiestos para permitir la instalación de la aplicación en dispositivos móviles, el uso de notificaciones push y la capacidad de consulta en entornos de baja conectividad.
*   **Integración de la capa MCP (Model Context Protocol):** Implementar un servidor MCP remoto que permita a agentes de inteligencia artificial externos (como Claude o ChatGPT) interactuar con la base de datos del usuario de forma segura y estandarizada.
*   **Consumo de API externa:** Integrar el sistema con la API pública del Centro de Información online de Medicamentos (CIMA) de la Agencia Española de Medicamentos y Productos Sanitarios (AEMPS).
*   **Contenerización y despliegue:** Utilizar Docker y Docker Compose para asegurar la portabilidad del proyecto y automatizar el despliegue en entornos de producción (Render/Vercel).

### 3.3 Objetivos específicos funcionales

Desde la perspectiva del usuario, la aplicación debe cumplir con las siguientes metas:

*   **Gestión multi-inquilino (Workspaces):** Permitir la creación de diferentes "blísters" o espacios de trabajo (ej. personal, familiar, trabajo) para organizar la medicación de forma independiente.
*   **Sistema de roles y permisos:** Implementar un control de acceso granular con tres perfiles diferenciados: Propietario (*Owner*), Cuidador (*Caregiver*) y Observador (*Observer*).
*   **Sincronización de stock y caducidad:** Automatizar la resta de unidades del inventario tras cada toma y emitir alertas preventivas antes de que la medicación se agote o caduque.
*   **Calendario de citas médicas:** Centralizar el registro de visitas a especialistas y vincularlas, de ser necesario, a los tratamientos activos.

### 3.4 Objetivos de diseño y accesibilidad

El diseño de la interfaz no es solo estético, sino funcional, con los siguientes objetivos:

*   **Arquitectura CSS profesional:** Utilizar la metodología ITCSS para la organización de estilos y BEM para la nomenclatura de clases, garantizando un código CSS mantenible y sin efectos colaterales.
*   **Cumplimiento del estándar WCAG 2.2 AA:** Asegurar que la aplicación sea usable por personas con diversidad funcional mediante el uso de altos contrastes, tipografías para dislexia y tamaños de fuente ajustables.
*   **Diseño responsive:** Garantizar una experiencia de usuario óptima en cualquier tamaño de pantalla bajo una filosofía de diseño *Mobile-first*.

Este apartado permite situar a Blíster dentro del ecosistema actual de aplicaciones de salud (*mHealth*), identificando qué necesidades quedan cubiertas por las soluciones existentes y dónde reside la oportunidad de innovación de este proyecto.

## 4. Antecedentes y análisis de mercado

### 4.1 Análisis de soluciones existentes

En la actualidad, existen diversas herramientas destinadas a la gestión de la salud y la adherencia terapéutica. Sin embargo, tras un análisis detallado, se observa que la mayoría presentan barreras de entrada o carencias de integración técnica:

*   **Medisafe y MyTherapy:** Son las aplicaciones líderes en el mercado móvil. Ofrecen recordatorios de tomas muy robustos y diarios de salud complejos. No obstante, son aplicaciones exclusivamente nativas (requieren descarga e instalación desde tiendas oficiales), lo que puede ser una barrera para usuarios que buscan rapidez. Además, son ecosistemas cerrados: los datos viven dentro de la app y no ofrecen una forma sencilla de que el usuario los explote mediante otras herramientas.
*   **Gestores genéricos (Google Calendar, Alarmas):** Muchos usuarios recurren a crear eventos en sus calendarios o alarmas en el móvil. Aunque son fáciles de usar, carecen totalmente de contexto médico: no gestionan el stock del botiquín, no avisan de caducidades y no permiten un registro histórico fiable que pueda ser consultado por un cuidador.
*   **Sistemas de salud públicos:** Algunas aplicaciones de servicios autonómicos de salud permiten consultar la receta electrónica, pero no gestionan el consumo real del paciente ni el inventario de medicamentos que este tiene almacenado físicamente en su hogar.

### 4.2 Propuesta de valor diferencial

Blíster no busca replicar la complejidad de una aplicación clínica, sino ofrecer una herramienta de gestión doméstica inteligente basada en dos pilares que no se encuentran de forma combinada en el mercado actual:

1.  **Integración con la fuente oficial (AEMPS):** A diferencia de otras apps que utilizan bases de datos genéricas o internacionales, Blíster consume la API de la **Agencia Española de Medicamentos y Productos Sanitarios**. Esto garantiza que la información (nombres, principios activos y prospectos) sea la oficial vigente en España, aportando una capa de seguridad y rigor fundamental para el usuario.
2.  **Interoperabilidad mediante MCP (Model Context Protocol):** Blíster es pionero en la implementación de este protocolo. Mientras que otras apps intentan retener al usuario en su interfaz, Blíster permite que sus datos sean accesibles (bajo estricta autorización) por los agentes de inteligencia artificial personales del usuario (Claude, ChatGPT, etc.). Esto permite consultas de lenguaje natural como *"¿Me queda Ibuprofeno?"* o *"Anota que me he tomado la pastilla del desayuno"*, integrando la salud en el flujo de trabajo digital moderno.
3.  **Accesibilidad web universal (PWA):** Al ser una aplicación web progresiva, Blíster ofrece la potencia de una app nativa (notificaciones, instalación en móvil, uso offline) con la inmediatez de la web, funcionando en cualquier dispositivo con un navegador sin necesidad de pasar por intermediarios.

Para concluir el primer documento de la memoria, este apartado define qué se considera un resultado exitoso para el proyecto, tanto desde la perspectiva de utilidad para el usuario como desde el crecimiento profesional y técnico del desarrollador.

## 5. Expectativas de éxito

El éxito de Blíster no se medirá únicamente por el cumplimiento de los requisitos académicos, sino por la capacidad de la aplicación para constituir una herramienta viable, segura e innovadora. Las expectativas se dividen en tres áreas fundamentales:

### 5.1 Impacto en la gestión de la salud
Se espera que la aplicación resuelva de forma efectiva el problema de la fragmentación de la información médica en el hogar. El éxito en este ámbito se definirá por:
*   La reducción de la carga cognitiva del usuario al delegar el control de stock y caducidad en el sistema.
*   La mejora en la comunicación familiar, evitando duplicidades en las tomas de personas dependientes gracias al sistema de roles y registros en tiempo real.
*   La centralización de la información oficial de la AEMPS, facilitando que el usuario consulte prospectos fiables en lugar de realizar búsquedas genéricas en internet.

### 5.2 Hitos técnicos y profesionales
Desde el punto de vista del desarrollo, las expectativas se centran en alcanzar un producto con acabado profesional:
*   **Robustez del stack MERN:** Lograr una integración fluida entre la persistencia de datos en MongoDB y una interfaz reactiva en el cliente.
*   **Adopción de tecnologías de vanguardia:** El éxito técnico reside en la implementación correcta del protocolo MCP, posicionando el proyecto como una solución pionera en el uso de IA agéntica para la salud doméstica.
*   **Calidad del código:** Mantener un desarrollo disciplinado bajo ITCSS y BEM que permita la escalabilidad del proyecto sin generar deuda técnica.

### 5.3 Escalabilidad y líneas de futuro
Blíster se ha diseñado con una arquitectura abierta que permite, en fases posteriores al MVP, expandir sus capacidades. Las expectativas de crecimiento incluyen:
*   **Integración con parafarmacia:** Incluir productos que no requieren receta médica y suplementos nutricionales.
*   **Escaneo de códigos de barras (EAN-13):** Implementar el uso de la cámara del dispositivo para dar de alta medicamentos de forma instantánea consultando la API de CIMA.
*   **Análisis predictivo:** Utilizar los datos de consumo para predecir con mayor exactitud cuándo el usuario necesitará solicitar una nueva receta a su médico de cabecera.
=======
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
>>>>>>> origin/dev
