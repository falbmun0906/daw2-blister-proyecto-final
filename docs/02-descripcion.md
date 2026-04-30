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

Blíster utiliza un modelo de **multitenencia lógica**. Esto significa que la aplicación diferencia entre el "Usuario" (la identidad que hace login) y su "Rol" (el permiso que tiene dentro de un blíster o espacio de trabajo específico). Un usuario es Propietario en su propio blíster y, simultáneamente, es Observador en el de sus familiares.

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

*   **Propiedad de los datos:** Los Medicamentos, Tratamientos y Citas Médicas están vinculados a un `Blister_ID`. Si un usuario abandona un Blíster, los datos **no se borran**, ya que pertenecen al espacio de trabajo común donde permanecen el resto de miembros.
*   **Independencia de inventario:** Un mismo fármaco (ej. Naproxeno) existe en diferentes Blísters con existencias y fechas de caducidad independientes entre sí.
*   **Multitenencia lógica:** Un único usuario posee su propio "Blíster Personal" (como Propietario) y pertenece simultáneamente a otros espacios (ej. "Blíster de la Abuela") con roles de Cuidador u Observador.
*   **Identidad visual:** Cada blíster cuenta con un campo `avatarKey` que el Propietario elige de un catálogo cerrado (`briefcase`, `home`, `family`, `heart`, `pill`, `cross`, `leaf`, `sun`). El frontend lo utiliza como icono representativo en listas, header y vistas multi-blíster.
*   **Paciente vinculado:** Los Tratamientos y las Citas almacenan `patientUserId`, que debe corresponder a un miembro vigente del blíster. Esto permite distinguir las pautas de cada paciente cuando un mismo blíster cubre a varias personas.
*   **Capacidad máxima:** Un mismo usuario puede pertenecer a un máximo de **3 blísteres simultáneamente** (constante `MAX_BLISTERS_PER_USER`). Esta cota se valida al crear, unirse o restaurar un blíster, devolviendo el código `BLISTER_LIMIT_REACHED` cuando se supera.

### 3.3 Flujo de visualización y filtrado

Para gestionar la complejidad multi-inquilino, la interfaz aplica las siguientes reglas de visualización:

1.  **Vista unificada (Home):** En la pantalla de Inicio, el usuario visualiza de forma agregada las próximas dosis de **todos** sus Blísters activos. Esto garantiza que no se pase por alto ninguna toma, independientemente del blíster al que pertenezca el medicamento. El backend resuelve esta vista mediante el endpoint `GET /api/v1/me/upcoming-doses`, que recorre los blísters del usuario, expande las pautas activas y devuelve un listado plano ordenado por fecha.
2.  **Filtrado por contexto:** En las secciones de Blíster, Tratamientos y Calendario, un selector superior permite:
    *   **Mostrar todo (por defecto):** Proporciona una visión global de toda la responsabilidad sanitaria del usuario.
    *   **Filtrar por Blíster específico:** Permite centrarse exclusivamente en la gestión de un inventario o paciente concreto.
3.  **Calendario unificado:** El endpoint `GET /api/v1/me/calendar?from=&to=&blisterId?&kinds?` agrega citas y tomas previstas en un único payload, permitiendo al frontend renderizar el calendario sin necesidad de llamadas por blíster.
4.  **Persistencia del filtro:** La aplicación recuerda el último Blíster seleccionado durante la sesión para facilitar una navegación fluida y coherente entre las diferentes secciones.

## 4. Especificación de bloques funcionales

### 4.1 Bloque 1: Acceso y registro (Onboarding y Auth)
*Pantallas: 00 a 04*

*   **00 - 00.3 (Onboarding):** Flujo de presentación que introduce los valores de la marca. Es ligero y permite "Saltar" la secuencia directamente a la pantalla de Acceso (01). La última pantalla (00.3) habilita la entrada al sistema.
*   **01 - Pantalla de acceso:** Actúa como distribuidor principal. El usuario elige entre iniciar sesión (02) o crear una cuenta nueva (03).
*   **03 - Registro de usuario:** 
    *   **Campos:** Recopila nombre completo, nombre de usuario, email y contraseña con doble validación.
    *   **Lógica de invitación:** Incluye el campo opcional "¿Tienes un código de invitación?". Si el usuario introduce un código válido, el servidor lo vincula tras el registro al Blíster correspondiente con el rol de **Cuidador** (Caregiver).
    *   **Botiquín inicial:** Para registros sin código, el sistema genera automáticamente un Blíster denominado "Mi blíster" donde el usuario figura como **Owner**.
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
    *   Cada tratamiento se asocia a un único paciente del blíster (`patientUserId`) y la frecuencia de cada fármaco se expresa de forma explícita en horas mediante el campo `frequencyHours` de la pauta.
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

*   **Periodo de gracia:** Al eliminar un Blíster, este se marca como `deletedAt` con la fecha de borrado. Los datos dejan de ser visibles en la interfaz, pero permanecen bloqueados en la base de datos.
*   **Recuperación:** La información se conserva durante **15 días naturales** (constante `BLISTER_RESTORE_WINDOW_MS`). Durante ese periodo, el Propietario puede invocar `POST /api/v1/blisters/:id/restore` para reactivar el blíster, siempre que siga por debajo de la cota `MAX_BLISTERS_PER_USER`.
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
