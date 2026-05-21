<<<<<<< HEAD
# 02. Descripción funcional y experiencia de usuario

## Índice
1. [Visión general de la solución](#1-visión-general-de-la-solución)
2. [Usuarios y sistema de permisos (RBAC)](#2-usuarios-y-sistema-de-permisos-rbac)
   - 2.1 [Definición de roles](#21-definición-de-roles)
   - 2.2 [Matriz de permisos](#22-matriz-de-permisos)
3. [Arquitectura de la información](#3-arquitectura-de-la-información)
   - 3.1 [Estructura de navegación](#31-estructura-de-navegación)
   - 3.2 [El concepto de "Blíster" (Workspace)](#32-el-concepto-de-blíster-workspace)
4. [Especificación de bloques funcionales](#4-especificación-de-bloques-funcionales)
   - 4.1 [Bloque 1: Acceso y registro (Onboarding y Auth)](#41-bloque-1-acceso-y-registro-onboarding-y-auth)
   - 4.2 [Bloque 2: Gestión de salud (Uso diario)](#42-bloque-2-gestión-de-salud-uso-diario)
   - 4.3 [Bloque 3: Gestión administrativa (Multitenencia)](#43-bloque-3-gestión-administrativa-multitenencia)
   - 4.4 [Bloque 4: Configuración y accesibilidad](#44-bloque-4-configuración-y-accesibilidad)
5. [Lógica de negocio transversal](#5-lógica-de-negocio-transversal)
   - 5.1 [Integración con la API de la AEMPS (CIMA)](#51-integración-con-la-api-de-la-aemps-cima)
   - 5.2 [Algoritmo de control de stock y caducidad](#52-algoritmo-de-control-de-stock-y-caducidad)
   - 5.3 [Capa Model Context Protocol (MCP) e IA](#53-capa-model-context-protocol-mcp-e-ia)
6. [Interacción y experiencia de usuario (UI/UX)](#6-interacción-y-experiencia-de-usuario-uiux)
   - 6.1 [Estados de la interfaz (Loading, Empty, Error)](#61-estados-de-la-interfaz-loading-empty-error)
   - 6.2 [Feedback y notificaciones](#62-feedback-y-notificaciones)

---

## 1. Visión general de la solución

Blíster es una solución tecnológica diseñada para resolver la desorganización en la gestión de medicamentos domésticos. El sistema nace para cubrir dos necesidades críticas detectadas en el entorno real: el seguimiento riguroso de tratamientos crónicos y la administración inmediata de fármacos en episodios de salud puntuales de alta precisión temporal.

El flujo de usuario comienza con un proceso de Onboarding que introduce los pilares de la app (AEMPS, Familia e Interoperabilidad con IA). Tras el registro, el sistema genera automáticamente un espacio de trabajo personal (Blíster), permitiendo al usuario operar de forma inmediata.

La aplicación permite la convivencia de múltiples espacios de trabajo o 'blísteres' compartidos. En la pantalla principal (Home), el usuario dispone de una vista unificada de toda su responsabilidad sanitaria, mientras que en el resto de secciones puede filtrar la información por contextos específicos. La integración con la fuente oficial de la AEMPS y la capacidad de conectar asistentes de IA externos mediante el protocolo MCP posicionan a Blíster como un núcleo de datos de salud seguro e interoperable.

## 2. Usuarios y sistema de permisos (RBAC)

Blíster utiliza un modelo de **multitenencia lógica**. Esto significa que la aplicación diferencia entre el "Usuario" (la identidad que hace login) y su "Rol" (el permiso que tiene dentro de un botiquín o espacio de trabajo específico). Un usuario es Propietario en su propio botiquín y, simultáneamente, es Observador en el de sus familiares.

### 2.1 Definición de roles

Se definen tres niveles de acceso jerárquicos que garantizan la seguridad del paciente y la trazabilidad de las acciones:

1.  **Propietario (Owner):**
    *   Actúa como el administrador principal del Blíster. 
    *   Generalmente coincide con el paciente o el responsable legal de la salud en el hogar.
    *   Ejerce control total sobre la configuración del espacio, la gestión de miembros y la integridad de los datos históricos.
2.  **Cuidador (Caregiver):**
    *   Es un perfil activo destinado a familiares o acompañantes que intervienen en el cuidado diario.
    *   Su función principal es asegurar la adherencia terapéutica y mantener el inventario actualizado.
    *   Realiza registros de consumo y gestiona el stock, pero no posee permisos para alterar la estructura de la comunidad o eliminar el espacio de trabajo.
3.  **Observador (Observer):**
    *   Es un perfil pasivo destinado a familiares que requieren supervisión sin intervención directa.
    *   Su acceso es de **solo lectura**. Visualiza el estado de las tomas y el stock, pero tiene bloqueada cualquier interacción que altere la base de datos.

### 2.2 Matriz de permisos

La siguiente tabla detalla las capacidades técnicas de cada rol sobre las entidades del sistema (Medicamentos, Tratamientos, Citas y Miembros):

| Acción / Funcionalidad | Propietario | Cuidador | Observador |
| :--- | :---: | :---: | :---: |
| **Gestión de Blíster** | | | |
| Crear nuevo Blíster | Sí | Sí | Sí |
| Eliminar Blíster (Soft Delete) | Sí | No | No |
| Cambiar nombre del Blíster | Sí | No | No |
| **Gestión de Miembros** | | | |
| Generar código de invitación | Sí | No | No |
| Revocar acceso a un miembro | Sí | No | No |
| Cambiar rol de un miembro | Sí | No | No |
| **Gestión de Medicamentos** | | | |
| Añadir nuevo medicamento (AEMPS) | Sí | Sí | No |
| Editar stock manualmente | Sí | Sí | No |
| Editar información/alias/caducidad | Sí | Sí | No |
| Eliminar medicamento del botiquín | Sí | No | No |
| **Adherencia (Uso diario)** | | | |
| Marcar toma como realizada (Toggle) | Sí | Sí | No (1) |
| Deshacer registro de toma | Sí | Sí (2) | No |
| Ver historial de tomas y registros | Sí | Sí | Sí |
| **Tratamientos y Citas** | | | |
| Crear/Editar/Eliminar tratamiento | Sí | Sí | No |
| Crear/Editar/Eliminar cita médica | Sí | Sí | No |

**(1)** El botón de "Marcar como tomado" en las pantallas 05 y 07 aparece visualmente deshabilitado para este rol.
**(2)** La capacidad de deshacer una toma está limitada por un tiempo de cortesía (10 minutos) para evitar la manipulación de registros históricos.

### 2.3 Registro de auditoría (Trazabilidad)

Para evitar confusiones en el entorno familiar, el sistema no solo registra el consumo del fármaco, sino también la identidad del usuario que realiza la acción. 

*   Cada entrada en la colección de registros de adherencia guarda el identificador único del autor (`User_ID`).
*   En la interfaz de detalle de tratamiento (Pantalla 08.1), se muestra el nombre del usuario que confirmó la toma: *"Registrado por: Juan Pérez"*.

## 3. Arquitectura de la información

La arquitectura de Blíster se aleja de las aplicaciones de salud tradicionales "monolíticas" y adopta un modelo de **Espacios de Trabajo (Workspaces)**. El sistema está diseñado para que la información fluya desde lo global (todas las responsabilidades del usuario) a lo específico (un botiquín concreto).

### 3.1 Estructura de navegación

La navegación se divide en tres niveles de interacción claramente diferenciados que evitan la carga cognitiva y separan las acciones diarias de la administración:

1.  **Navegación principal (Bottom Nav):** Es el eje de las acciones de salud diarias. Permanece siempre visible y da acceso a las cuatro secciones clave:
    *   **Inicio (05):** Cuadro de mando con las dosis más próximas y alertas de stock urgentes.
    *   **Botiquín (06):** Inventario de medicamentos.
    *   **Tratamientos (08):** Gestión de pautas médicas y progreso.
    *   **Calendario (07):** Vista temporal de tomas y citas médicas.
2.  **Cabecera de identidad (Header):** Situada en la parte superior, gestiona el contexto global del usuario:
    *   **Perfil:** Acceso directo a la configuración personal y administrativa.
    *   **Notificaciones:** Avisos de sistema, confirmaciones de otros miembros y alertas de stock/caducidad.
    *   **Marca (Logo):** Refuerza la identidad visual del proyecto.
3.  **Centro administrativo (Perfil - 20):** Actúa como el "back-office" de la aplicación. Desde aquí se gestionan los Blísters (crear/unirse), los tokens de IA (MCP) y los ajustes de accesibilidad. La separación de estas funciones permite que la navegación inferior se centre exclusivamente en el uso operativo diario.

### 3.2 El concepto de "Blíster" (Workspace)

El "Blíster" constituye la entidad mínima de organización en la base de datos. Se define como un **contenedor compartido** con las siguientes propiedades:

*   **Propiedad de los datos:** Los Medicamentos, Tratamientos y Citas Médicas están vinculados a un `Blíster_ID`. Si un usuario abandona un Blíster, los datos **no se borran**, ya que pertenecen al espacio de trabajo común donde permanecen el resto de miembros.
*   **Independencia de inventario:** Un mismo fármaco (ej. Naproxeno) existe en diferentes Blísters con existencias y fechas de caducidad independientes entre sí.
*   **Multitenencia lógica:** Un único usuario posee su propio "Blíster Personal" (como Propietario) y pertenece simultáneamente a otros espacios (ej. "Botiquín de la Abuela") con roles de Cuidador u Observador.

### 3.3 Flujo de visualización y filtrado

Para gestionar la complejidad multi-inquilino, la interfaz aplica las siguientes reglas de visualización:

1.  **Vista unificada (Home):** En la pantalla de Inicio, el usuario visualiza de forma agregada las próximas dosis de **todos** sus Blísters activos. Esto garantiza que no se pase por alto ninguna toma, independientemente del botiquín al que pertenezca el medicamento.
2.  **Filtrado por contexto:** En las secciones de Botiquín, Tratamientos y Calendario, un selector superior permite:
    *   **Mostrar todo (por defecto):** Proporciona una visión global de toda la responsabilidad sanitaria del usuario.
    *   **Filtrar por Blíster específico:** Permite centrarse exclusivamente en la gestión de un inventario o paciente concreto.
3.  **Persistencia del filtro:** La aplicación recuerda el último Blíster seleccionado durante la sesión para facilitar una navegación fluida y coherente entre las diferentes secciones.

## 4. Especificación de bloques funcionales

### 4.1 Bloque 1: Acceso y registro (Onboarding y Auth)
*Pantallas: 00 a 04*

*   **00 - 00.3 (Onboarding):** Flujo de presentación que introduce los valores de la marca. Es ligero y permite "Saltar" la secuencia directamente a la pantalla de Acceso (01). La última pantalla (00.3) habilita la entrada al sistema.
*   **01 - Pantalla de acceso:** Actúa como distribuidor principal. El usuario elige entre iniciar sesión (02) o crear una cuenta nueva (03).
*   **03 - Registro de usuario:** 
    *   **Campos:** Recopila nombre completo, nombre de usuario, email y contraseña con doble validación.
    *   **Lógica de invitación:** Incluye el campo opcional "¿Tienes un código de invitación?". Si el usuario introduce un código válido, el servidor lo vincula tras el registro al Blíster correspondiente con el rol de **Cuidador** (Caregiver).
    *   **Botiquín inicial:** Para registros sin código, el sistema genera automáticamente un Blíster denominado "Mi botiquín" donde el usuario figura como **Owner**.
*   **04 - Recuperar contraseña:** Gestiona el envío de correos electrónicos de recuperación y ofrece feedback visual mediante un mensaje de confirmación tras el envío exitoso.

### 4.2 Bloque 2: Gestión de salud (Uso diario)
*Pantallas: 05 a 09*

*   **05 - Home / Dashboard:** 
    *   **Alertas:** Muestra avisos de stock bajo (según umbral configurable) y caducidades próximas de forma destacada.
    *   **Próximas dosis:** Presenta una lista cronológica de tomas pendientes que integra todos los Blísters activos del usuario. 
    *   **Interacción:** Dispone de un botón de "Tomado" que descuenta automáticamente una unidad del stock y registra el log de actividad.
*   **06 - Inventario / Botiquín:** Listado de fármacos con un selector superior para filtrar por Blíster específico o visualizar la opción "Mostrar todo".
*   **06.1 - 06.2 (Búsqueda AEMPS):** 
    *   Buscador con *debounce* (500ms) que realiza consultas en tiempo real a la API de CIMA.
    *   Muestra los resultados con el nombre comercial y el laboratorio oficial.
*   **06.3 - Añadir medicamento:** 
    *   El usuario define el alias (opcional), fecha de caducidad, stock inicial, umbral de alerta y el tratamiento al que pertenece.
    *   **Vínculo oficial:** El sistema almacena el `nregist` de la AEMPS para garantizar el acceso permanente a la ficha técnica.
*   **07 - Calendario / Pastillero:** Vista diaria de tomas. Para perfiles con rol de **Observador**, los controles (*toggles*) aparecen bloqueados.
*   **08 - 08.1 (Tratamientos):**
    *   Listado de tratamientos activos con una barra de progreso visual que indica el avance temporal (Día X de Y).
    *   El detalle incluye la descripción del tratamiento, medicamentos vinculados y las citas médicas asociadas.
*   **09 - Ficha técnica AEMPS:** Pantalla de consulta en tiempo real de la API CIMA. Muestra la fotografía oficial del envase y la pastilla, principios activos, excipientes, dosis y el enlace directo al **PDF del prospecto oficial**.

### 4.3 Bloque 3: Gestión administrativa (Multitenencia)
*Pantallas: 05.1 a 15.6*

*   **15 - Gestión de Blísters:** Listado administrativo de todos los espacios de salud del usuario, con indicación explícita de su rol en cada uno.
*   **15.1 - Miembros:** Vista expandida que muestra la lista de usuarios con acceso al Blíster seleccionado.
*   **15.3 - Editar persona (Roles):** Permite al **Owner** modificar el rol de un miembro (Propietario, Cuidador u Observador) a través de un modal de selección rápida.
*   **15.5 - Invitar persona:** Genera códigos alfanuméricos únicos. El Owner selecciona el rol que tendrá el invitado y el sistema establece una caducidad automática de 48 horas para el código.
*   **15.6 - Crear o Unirse:** Interfaz dual que permite crear un nuevo espacio desde cero o introducir un código recibido para incorporarse a un Blíster existente.

### 4.4 Bloque 4: Configuración y accesibilidad
*Pantallas: 20 a 23*

*   **20 - Perfil principal:** HUB central que proporciona acceso a la edición de datos personales, seguridad, gestión administrativa de Blísters (15) y configuración de IA.
*   **21 - Vincular Asistente de IA (MCP):** 
    *   Expone la **URL del servidor MCP** y permite la generación y visualización del **Token de Acceso**.
    *   Proporciona las instrucciones técnicas para la configuración en clientes como Claude Desktop o ChatGPT.
*   **21.1 - Revocar IA:** Ejecuta la acción de seguridad que invalida el token actual y desconecta inmediatamente todos los agentes externos.
*   **23 - Accesibilidad:** 
    *   **Vista:** Permite el cambio de tema (Claro/Oscuro/Sistema) y activa el modo de Alto Contraste.
    *   **Tipografía:** Ofrece un selector de tamaño de texto (A-/A+) y un interruptor para habilitar la tipografía diseñada para facilitar la lectura en casos de **Dislexia**.
    *   *Nota técnica:* Los cambios son persistentes (almacenados en BD o LocalStorage) y se aplican mediante variables CSS reactivas.

## 5. Lógica de negocio transversal

### 5.1 Integración con la API de la AEMPS (CIMA) y seguridad

La aplicación utiliza la base de datos oficial del **Centro de Información online de Medicamentos (CIMA)** de la Agencia Española de Medicamentos y Productos Sanitarios como fuente de verdad única.

*   **Rigor informativo:** Para garantizar la seguridad del paciente, tanto la interfaz de la PWA como la capa de integración MCP para asistentes externos priorizan el acceso al **prospecto oficial en PDF**. De esta forma, el sistema facilita que el usuario acceda siempre al documento legal vigente, evitando riesgos derivados de interpretaciones erróneas o alucinaciones de modelos de lenguaje en información crítica de salud.
*   **Sincronización mínima:** Por eficiencia, Blíster no duplica la base de datos oficial. Al añadir un medicamento, solo se almacenan en MongoDB el `nregist` (ID oficial), el nombre comercial, el laboratorio y la miniatura de la imagen. El resto de la información técnica se consulta en tiempo real mediante peticiones a la API de CIMA.

### 5.2 Algoritmo de control de stock y caducidad

El control de inventario es reactivo y automatizado según la interacción del usuario:

1.  **Decremento automático:** Cada registro de toma confirmado resta automáticamente las unidades definidas en la pauta del tratamiento del stock actual del medicamento.
2.  **Gestión de inventario crítico:** El sistema prohíbe el stock negativo por defecto. No obstante, permite el **"forzado de toma"** bajo aviso de inconsistencia para no interrumpir el registro de adherencia, emitiendo una alerta para que el usuario regularice el inventario posteriormente.
3.  **Alertas de stock bajo:** Cada medicamento posee un umbral (*threshold*) configurable. Cuando las existencias alcanzan este valor, se dispara una notificación de "Reposición necesaria" para los miembros con rol de Propietario o Cuidador.
4.  **Gestión de caducidad:** El sistema realiza comprobaciones diarias y emite alertas preventivas con una antelación de **30, 15 y 7 días**. Estas notificaciones de caducidad se envían a todos los miembros del Blíster, incluyendo a los Observadores.

### 5.3 Capa Model Context Protocol (MCP) e interoperabilidad

Blíster implementa un servidor MCP que expone las capacidades de la aplicación a **asistentes de IA externos** (como Claude Desktop). La aplicación actúa como un proveedor de contexto mediante las siguientes herramientas (*Tools*):

1.  **`inventory_query`**: Permite al asistente consultar el inventario completo, niveles de stock y fechas de caducidad.
2.  **`adherence_logger`**: Facilita el registro de tomas en la base de datos mediante comandos de voz o texto en lenguaje natural.
3.  **`stock_modifier`**: Permite actualizar las cantidades de un fármaco (ej. tras una nueva compra).
4.  **`schedule_assistant`**: Informa sobre las próximas dosis programadas basándose en los tratamientos activos.
5.  **`appointment_manager`**: Permite consultar las citas médicas vinculadas al calendario.
6.  **`prospectus_provider`**: Facilita el enlace directo al PDF oficial de la AEMPS del medicamento solicitado para resolver dudas sobre seguridad.

El acceso se realiza mediante un **token Bearer** único generado en el perfil del usuario, utilizando el transporte **SSE (Server-Sent Events)** para permitir conexiones remotas.

### 5.4 Política de borrado lógico (Soft Delete)

Para proteger la integridad de los datos de salud ante errores accidentales, el sistema aplica una política de borrado en dos fases:

*   **Periodo de gracia:** Al eliminar un Blíster, este se marca como `deleted: true`. Los datos dejan de ser visibles en la interfaz, pero permanecen bloqueados en la base de datos.
*   **Recuperación:** La información se conserva durante **15 días naturales**, permitiendo al Propietario solicitar la restauración del espacio si fuera necesario.
*   **Purga definitiva:** Tras el periodo de gracia, un proceso automático del servidor elimina físicamente el Blíster y todos sus registros asociados para cumplir con el derecho al olvido.

## 6. Interacción y experiencia de usuario (UI/UX)

La experiencia de usuario en Blíster se rige por el principio de **"Fricción mínima"**. Dado que es una herramienta de salud, la interfaz está optimizada para que las tareas críticas —como el registro de una toma— se realicen con la menor carga cognitiva posible, garantizando una navegación fluida y predictiva.

### 6.1 Estados de la interfaz

La aplicación gestiona de forma proactiva la incertidumbre del usuario durante los procesos asíncronos y las posibles interrupciones de red:

*   **Estados de carga (Loading):** El sistema utiliza *Skeletons* (estructuras de alambre animadas) que replican la arquitectura de los datos reales. Esto se aplica especialmente en el listado del Botiquín (06) y la Ficha Técnica (09), mejorando la percepción de velocidad frente a los indicadores de carga tradicionales.
*   **Estados vacíos (Empty States):** Las pantallas sin datos (como un botiquín recién creado) incluyen ilustraciones minimalistas y un Botón de Acción Principal (CTA) claro que guía al usuario hacia su siguiente paso (ej. "Añadir tu primer medicamento").
*   **Gestión de errores y offline:** Al ser una PWA, la aplicación monitoriza el estado de la conexión. En caso de pérdida de red, se muestra un indicador de "Modo Offline" y el sistema permite la consulta de los datos almacenados en caché, notificando que los cambios se sincronizarán al recuperar la conexión.

### 6.2 Feedback y notificaciones

El sistema proporciona retroalimentación inmediata para cada acción relevante, reforzando la sensación de control y seguridad:

*   **Confirmaciones (Snackbars):** Tras acciones exitosas (como marcar una toma o añadir un fármaco), la aplicación despliega un mensaje informativo en la zona inferior. Para el registro de tomas, este mensaje incluye una ventana de **10 segundos para "Deshacer"** la acción, evitando errores accidentales.
*   **Notificaciones Push:** La aplicación emite recordatorios inteligentes basados en las pautas de tratamiento. Estas notificaciones son interactivas, permitiendo al usuario registrar la toma directamente desde el aviso sin necesidad de abrir la aplicación completa.
*   **Alertas Críticas:** El sistema resalta visualmente mediante el uso de colores semánticos (rojo para "Sin stock" o "Caducado", naranja para "Stock bajo") las situaciones que requieren atención inmediata del usuario.

### 6.3 Accesibilidad y diseño inclusivo (WCAG 2.2 AA)

Blíster cumple con los estándares de accesibilidad para garantizar su uso por personas mayores o con diversidad funcional:

*   **Interacción táctil:** Todos los elementos interactivos cuentan con un área de pulsación mínima de **44x44 píxeles CSS**, lo que facilita la navegación a usuarios con baja destreza motora o temblores.
*   **Personalización visual:** A través del panel de accesibilidad (23), el usuario puede activar el modo de **Alto Contraste**, escalar el **Tamaño del Texto** de toda la interfaz o habilitar la fuente **OpenDyslexic**.
*   **Compatibilidad con lectores de pantalla:** El código utiliza HTML semántico y etiquetas ARIA para que herramientas como VoiceOver o TalkBack anuncien correctamente no solo el texto, sino el estado de los elementos (ej. "Botón, Marcar como tomado, Deshabilitado").

### 6.4 Microinteracciones y navegación

La aplicación utiliza transiciones fluidas que imitan el comportamiento de una app nativa:

*   **Transiciones de página:** Se emplean desplazamientos laterales (*slides*) entre los bloques del Onboarding y cambios de opacidad (*fades*) entre las secciones principales del menú inferior para mantener la continuidad espacial.
*   **Respuesta visual (Toggles):** Los interruptores de registro de toma en el Calendario (07) presentan una animación de rebote y un cambio cromático instantáneo, proporcionando una confirmación física visual de la acción de usuario.
*   **Barra de progreso de tratamientos:** En la pantalla 08, la barra de progreso se anima dinámicamente al cargar, permitiendo al usuario percibir de forma inmediata cuánto camino ha recorrido en su tratamiento actual.
=======
# 02 - Descripción funcional y experiencia de usuario

Blíster es una aplicación orientada a la gestión doméstica de medicamentos. Este capítulo describe sus usuarios, permisos, navegación, funcionalidades principales, experiencia de uso y casos de uso que justifican las decisiones de producto.

## Índice

1. [Visión general](#1-visión-general)
2. [Usuarios objetivo](#2-usuarios-objetivo)
3. [Modelo de blísteres y roles](#3-modelo-de-blísteres-y-roles)
	- 3.1 [Roles disponibles](#31-roles-disponibles)
	- 3.2 [Matriz funcional de permisos](#32-matriz-funcional-de-permisos)
4. [Arquitectura de información](#4-arquitectura-de-información)
	- 4.1 [Navegación pública](#41-navegación-pública)
	- 4.2 [Navegación privada](#42-navegación-privada)
5. [Funcionalidades principales](#5-funcionalidades-principales)
	- 5.1 [Acceso y cuenta](#51-acceso-y-cuenta)
	- 5.2 [Blísteres y miembros](#52-blísteres-y-miembros)
	- 5.3 [Botiquín e inventario](#53-botiquín-e-inventario)
	- 5.4 [Tratamientos y pautas](#54-tratamientos-y-pautas)
	- 5.5 [Adherencia](#55-adherencia)
	- 5.6 [Calendario y citas](#56-calendario-y-citas)
	- 5.7 [Notificaciones](#57-notificaciones)
	- 5.8 [MCP e integración con asistentes](#58-mcp-e-integración-con-asistentes)
6. [Lógica transversal](#6-lógica-transversal)
	- 6.1 [Fuente oficial CIMA/AEMPS](#61-fuente-oficial-cimaaemps)
	- 6.2 [Multitenencia lógica](#62-multitenencia-lógica)
	- 6.3 [Validación en español](#63-validación-en-español)
	- 6.4 [Privacidad y borrado](#64-privacidad-y-borrado)
7. [Interfaz y experiencia de usuario](#7-interfaz-y-experiencia-de-usuario)
	- 7.1 [Principios de interfaz](#71-principios-de-interfaz)
	- 7.2 [Estados de interfaz](#72-estados-de-interfaz)
	- 7.3 [Uso en escritorio](#73-uso-en-escritorio)
8. [Casos de uso principales](#8-casos-de-uso-principales)

## 1. Visión general

Blíster permite registrar medicamentos de un botiquín, crear tratamientos, planificar citas médicas, registrar tomas y recibir avisos relacionados con stock, caducidad, dosis, citas y cambios oficiales de medicamentos. La aplicación trabaja con espacios llamados blísteres, que actúan como unidades de organización compartida.

El flujo básico de uso es el siguiente:

1. La persona usuaria accede al onboarding o al login.
2. Se registra o inicia sesión.
3. El sistema crea un blíster personal si no llega mediante invitación.
4. Desde el botiquín añade medicamentos usando CIMA/AEMPS.
5. Crea tratamientos con dosis y horarios.
6. Registra tomas desde Inicio, Calendario o el historial.
7. Consulta notificaciones, citas, stock y fichas oficiales.

La aplicación se concibe como PWA mobile-first. En escritorio conserva una vista móvil simulada para mantener los mismos patrones de navegación que en teléfono.

## 2. Usuarios objetivo

Blíster se dirige a perfiles que necesitan ordenar medicación en el ámbito familiar, sin requerir conocimientos técnicos ni sanitarios avanzados.

| Usuario | Necesidad principal | Respuesta de Blíster |
| :--- | :--- | :--- |
| Paciente con medicación crónica | Recordar tomas y controlar reposición. | Tratamientos, próximas dosis, stock y alertas. |
| Persona con medicación puntual | Registrar consumos y consultar información oficial rápido. | Botiquín con CIMA y registro de tomas. |
| Cuidador familiar | Saber si otra persona ya ha administrado una dosis. | Blíster compartido, roles y autoría de logs. |
| Familiar observador | Supervisar sin modificar datos. | Rol OBSERVER con acceso de lectura. |
| Usuario avanzado | Consultar datos desde un asistente externo. | Endpoint MCP con token revocable y permisos del usuario. |

## 3. Modelo de blísteres y roles

Un blíster es un espacio de trabajo sanitario. Contiene miembros, medicamentos, tratamientos, citas, registros de adherencia y notificaciones asociadas. Un usuario puede pertenecer a varios blísteres con roles distintos.

### 3.1 Roles disponibles

| Rol | Descripción | Capacidades principales |
| :--- | :--- | :--- |
| OWNER | Propietario del blíster. | Gestiona miembros, invitaciones, datos de salud y borrado/restauración. |
| CAREGIVER | Cuidador activo. | Gestiona medicamentos, tratamientos, citas y tomas, sin administrar miembros ni eliminar medicamentos. |
| OBSERVER | Observador de solo lectura. | Consulta información, pero no realiza cambios sobre datos del blíster. |

### 3.2 Matriz funcional de permisos

| Acción | OWNER | CAREGIVER | OBSERVER |
| :--- | :---: | :---: | :---: |
| Ver medicamentos, tratamientos y citas | Sí | Sí | Sí |
| Crear blíster propio | Sí | Sí | Sí |
| Renombrar o eliminar un blíster | Sí | No | No |
| Restaurar un blíster eliminado | Sí | No | No |
| Generar invitación | Sí | No | No |
| Cambiar rol o expulsar miembros | Sí | No | No |
| Añadir o editar medicamento | Sí | Sí | No |
| Eliminar medicamento | Sí | No | No |
| Crear, editar o eliminar tratamiento | Sí | Sí | No |
| Crear, editar o eliminar cita | Sí | Sí | No |
| Añadir o editar comentarios de cita | Sí | Sí | No |
| Registrar o deshacer una toma | Sí | Sí | No |

El backend aplica estas reglas mediante los middlewares `authenticate`, `checkBlisterAccess` y `authorize`, y los servicios vuelven a validar reglas críticas de dominio.

## 4. Arquitectura de información

La navegación está pensada para separar el uso diario de la administración. Las acciones frecuentes permanecen en el menú inferior y la configuración se concentra en Perfil.

### 4.1 Navegación pública

| Ruta | Pantalla | Función |
| :--- | :--- | :--- |
| `/landing` | Landing | Entrada visual del producto. |
| `/onboarding` | Onboarding | Presentación inicial y puerta de experiencia móvil. |
| `/login` | Inicio de sesión | Acceso con email o usuario. |
| `/register` | Registro | Alta de cuenta y consentimiento requerido. |
| `/forgot-password` | Recuperación | Solicitud de enlace de restablecimiento. |
| `/reset-password` | Nueva contraseña | Cambio mediante token de email. |
| `/confirm-email` | Confirmación de email | Validación de correo pendiente. |
| `/privacy` | Política de privacidad | Información RGPD y tratamiento de datos. |

### 4.2 Navegación privada

| Sección | Rutas principales | Función |
| :--- | :--- | :--- |
| Inicio | `/home` | Próximas dosis, alertas y acciones rápidas. |
| Blísteres | `/blisters`, `/blisters/new`, `/blisters/join`, `/blisters/:id/members` | Administración de espacios y miembros. |
| Botiquín | `/blisters/:id/medicines` | Inventario y stock. |
| Medicamentos | `/blisters/:id/medicines/add`, `/blisters/:id/medicines/:medicineId`, `/medicines/cima/:nregist` | Alta, detalle local y ficha oficial. |
| Tratamientos | `/blisters/:id/treatments`, `/new`, `/:treatmentId` | Pautas, progreso y edición. |
| Calendario | `/blisters/:id/appointments` | Citas y tomas por fecha. |
| Historial | `/blisters/:id/logs` | Registros de adherencia. |
| Perfil | `/profile`, `/profile/edit`, `/profile/password`, `/profile/accessibility`, `/profile/notifications` | Cuenta, seguridad, accesibilidad y avisos. |
| MCP | `/profile/mcp`, `/profile/mcp/revoke` | Token, configuración y revocación. |

## 5. Funcionalidades principales

Las funcionalidades se agrupan según los bloques de uso que aparecen en la interfaz.

### 5.1 Acceso y cuenta

El sistema permite registro, login, logout, refresco de sesión, recuperación de contraseña, confirmación de email y actualización de perfil. La validación de formularios se realiza con Zod y React Hook Form mediante un resolver propio compatible con Zod 4.

La recuperación de contraseña responde con un mensaje neutro para evitar enumeración de cuentas. Los tokens de recuperación y verificación se almacenan hasheados y tienen caducidad.

### 5.2 Blísteres y miembros

La persona usuaria puede crear blísteres, unirse con un código de invitación, listar miembros y administrar roles si es propietaria. Los blísteres eliminados usan borrado lógico con una ventana de restauración antes de la purga definitiva.

El sistema evita dejar un blíster sin propietario y limita el número de blísteres por usuario según la constante de dominio definida en backend.

### 5.3 Botiquín e inventario

El alta de medicamentos parte de una búsqueda en CIMA/AEMPS. El usuario selecciona un medicamento oficial y añade información local: alias, stock, unidad, umbral y fecha de caducidad. Los datos oficiales no se editan manualmente.

Cada medicamento conserva `nregist`, nombre, principios activos, forma, dosis oficial, estado CIMA, stock y caducidad. La interfaz marca estados como stock bajo, stock crítico o caducidad próxima.

### 5.4 Tratamientos y pautas

Los tratamientos agrupan uno o varios medicamentos, un paciente del blíster, título, descripción, fecha de inicio y fecha de fin opcional. Cada medicamento del tratamiento puede definirse con dosis, primera toma, pauta por intervalo o por horarios diarios, recurrencia y nota.

El backend calcula próximas dosis para las vistas agregadas de Inicio y Calendario, evitando que el frontend duplique reglas de planificación.

### 5.5 Adherencia

Registrar una toma crea un `AdherenceLog`, descuenta stock y guarda autoría. Si el stock no es suficiente, la aplicación puede solicitar confirmación de toma forzada; esa acción queda registrada como inconsistencia para revisar el inventario.

El deshacer de una toma restaura el stock y elimina el registro si se solicita dentro de la ventana permitida. Pasado ese plazo, el backend rechaza la operación para proteger el historial.

### 5.6 Calendario y citas

El calendario combina citas médicas y dosis previstas. Las citas incluyen paciente, título, fecha, lugar, descripción, tratamiento relacionado y comentarios con autoría.

Esta combinación permite consultar la planificación sanitaria desde una única vista, sin separar artificialmente la agenda médica de la medicación.

### 5.7 Notificaciones

Blíster genera notificaciones internas para eventos de stock, caducidad, adherencia, cambios CIMA, recordatorios de dosis y citas. Las preferencias se configuran desde Perfil y pueden activar o desactivar categorías concretas.

Cuando el navegador lo permite y existen claves VAPID, el usuario puede registrar una suscripción Web Push. Si no hay soporte o permiso, la bandeja interna sigue funcionando.

### 5.8 MCP e integración con asistentes

La pantalla MCP permite generar, consultar y revocar un token de acceso. El endpoint `/mcp` expone herramientas para listar blísteres, consultar inventario, buscar medicamentos oficiales, registrar tomas, modificar stock, consultar citas y devolver enlaces oficiales.

Las operaciones MCP respetan los mismos permisos que la API REST. Un token no concede más acceso que el usuario propietario del token.

## 6. Lógica transversal

La aplicación comparte reglas que afectan a varias pantallas y módulos.

### 6.1 Fuente oficial CIMA/AEMPS

CIMA se utiliza como fuente oficial para buscar medicamentos y consultar fichas. Blíster almacena la información mínima necesaria para el uso cotidiano y mantiene enlaces o identificadores oficiales para ampliar información cuando el usuario lo necesita.

### 6.2 Multitenencia lógica

La separación por `blisterId` evita mezclar inventarios. Un mismo medicamento puede aparecer en varios blísteres con stock, caducidad y alias distintos. Las rutas del backend validan que el usuario pertenece al blíster antes de acceder a sus datos.

### 6.3 Validación en español

Los formularios muestran errores junto al campo correspondiente y las validaciones compartidas devuelven mensajes en español. Esto afecta a login, registro, recuperación, perfil, blísteres, medicamentos, tratamientos, citas, comentarios y preferencias.

### 6.4 Privacidad y borrado

La política de privacidad está disponible en `/privacy`. Los borrados sensibles se tratan con prudencia: el borrado de blíster aplica una ventana de recuperación y la eliminación de cuenta invalida credenciales web, tokens MCP y tokens OAuth asociados.

## 7. Interfaz y experiencia de usuario

La experiencia de usuario se basa en claridad, navegación móvil y feedback inmediato.

### 7.1 Principios de interfaz

| Principio | Aplicación en Blíster |
| :--- | :--- |
| Mobile-first | Pantallas optimizadas para 375-430 px y navegación inferior. |
| Claridad operativa | Cards compactas con nombre, estado y acción principal. |
| Feedback visible | Toasts, mensajes inline, estados de carga, vacíos y errores. |
| Prevención de errores | Confirmaciones en acciones destructivas y permisos por rol. |
| Accesibilidad | Tema oscuro, tamaño de texto, OpenDyslexic, labels y ARIA. |

### 7.2 Estados de interfaz

| Estado | Representación |
| :--- | :--- |
| Cargando | Skeletons o indicadores contextuales. |
| Vacío | Mensaje breve y llamada a la acción cuando procede. |
| Error de formulario | Texto bajo el campo afectado en español. |
| Error técnico | Estado de error con posibilidad de reintento. |
| Éxito | Toast o navegación al siguiente paso. |
| Acción reversible | Toast con deshacer cuando la operación lo permite. |

### 7.3 Uso en escritorio

En pantallas de escritorio la aplicación muestra una puerta informativa: "Blíster se usa mejor en tu dispositivo móvil". Al continuar, se renderiza dentro de un marco de móvil simulado. Esta decisión evita duplicar layouts y mantiene la coherencia visual del producto.

## 8. Casos de uso principales

Los casos de uso resumen los flujos que una persona usuaria puede realizar con la aplicación.

| Caso de uso | Actor principal | Resultado esperado |
| :--- | :--- | :--- |
| Registrarse | Usuario nuevo | Cuenta creada y blíster inicial disponible. |
| Unirse a un blíster | Usuario invitado | Acceso al blíster con el rol definido por el propietario. |
| Añadir medicamento | OWNER o CAREGIVER | Medicamento guardado con datos oficiales y stock local. |
| Crear tratamiento | OWNER o CAREGIVER | Pauta disponible para próximas dosis. |
| Registrar toma | OWNER o CAREGIVER | Log creado, stock descontado y autoría registrada. |
| Consultar como observador | OBSERVER | Datos visibles sin posibilidad de modificación. |
| Crear cita | OWNER o CAREGIVER | Cita añadida al calendario del blíster. |
| Configurar notificaciones | Usuario autenticado | Preferencias guardadas en su cuenta. |
| Conectar MCP | Usuario autenticado | Token generado y cliente externo autorizado. |
| Revocar acceso MCP | Usuario autenticado | Token invalidado y acceso externo cortado. |

Actores principales:

| Actor | Descripción | Interés en el sistema |
| :--- | :--- | :--- |
| Usuario paciente | Persona que gestiona su propia medicación. | Recordar tomas, controlar stock y consultar información oficial. |
| Familiar cuidador | Persona que ayuda en el seguimiento. | Registrar acciones, preparar citas y coordinarse con otros miembros. |
| Observador | Persona que solo necesita supervisar. | Consultar información sin modificar datos. |
| Cliente MCP | Asistente externo autorizado por el usuario. | Consultar o ejecutar acciones permitidas mediante tools. |
| Sistema CIMA/AEMPS | Fuente externa oficial. | Proporcionar datos fiables de medicamentos. |

Los escenarios se han definido para que cada actor tenga permisos coherentes con su responsabilidad. Un observador, por ejemplo, aporta tranquilidad a la familia sin poder alterar tratamientos o stock.

Estos casos de uso cubren el núcleo funcional del producto y sirven como referencia para las pruebas manuales y automatizadas.
>>>>>>> origin/dev
