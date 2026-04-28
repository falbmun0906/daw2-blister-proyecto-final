# 01 - Introducción

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