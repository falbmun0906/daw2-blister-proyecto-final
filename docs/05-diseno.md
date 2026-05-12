# 05 - Diseño de la solución

El diseño de Blíster combina decisiones de experiencia de usuario, arquitectura de información y diseño visual aplicadas a un producto de salud. La solución se concibe como una PWA mobile-first, accesible y orientada a tareas críticas: consultar medicación, registrar tomas, revisar stock, gestionar tratamientos y coordinar la responsabilidad familiar.

## Índice
1. [Principios de diseño](#1-principios-de-diseño)
   - 1.1 [Claridad operativa](#11-claridad-operativa)
   - 1.2 [Mobile-first y escritorio en marco móvil](#12-mobile-first-y-escritorio-en-marco-móvil)
   - 1.3 [Accesibilidad como requisito funcional](#13-accesibilidad-como-requisito-funcional)
2. [Arquitectura de experiencia](#2-arquitectura-de-experiencia)
   - 2.1 [Modelo de navegación](#21-modelo-de-navegación)
   - 2.2 [Rutas públicas](#22-rutas-públicas)
   - 2.3 [Rutas privadas](#23-rutas-privadas)
3. [Diseño de pantallas principales](#3-diseño-de-pantallas-principales)
   - 3.1 [Landing y onboarding](#31-landing-y-onboarding)
   - 3.2 [Autenticación y recuperación de contraseña](#32-autenticación-y-recuperación-de-contraseña)
   - 3.3 [Inicio](#33-inicio)
   - 3.4 [Botiquín](#34-botiquín)
   - 3.5 [Tratamientos](#35-tratamientos)
   - 3.6 [Calendario y citas](#36-calendario-y-citas)
   - 3.7 [Perfil y administración](#37-perfil-y-administración)
4. [Diseño responsive](#4-diseño-responsive)
   - 4.1 [Base móvil](#41-base-móvil)
   - 4.2 [Comportamiento en escritorio](#42-comportamiento-en-escritorio)
5. [Diseño de interacción](#5-diseño-de-interacción)
   - 5.1 [Feedback inmediato](#51-feedback-inmediato)
   - 5.2 [Prevención de errores](#52-prevención-de-errores)
   - 5.3 [Estados de carga, vacío y error](#53-estados-de-carga-vacío-y-error)
6. [Diseño de datos y confianza](#6-diseño-de-datos-y-confianza)
   - 6.1 [Fuente oficial CIMA/AEMPS](#61-fuente-oficial-cimaaemps)
   - 6.2 [Trazabilidad de acciones](#62-trazabilidad-de-acciones)
   - 6.3 [Notificaciones y alertas](#63-notificaciones-y-alertas)
7. [Accesibilidad e inclusión](#7-accesibilidad-e-inclusión)

---

## 1. Principios de diseño

El diseño de Blíster parte de un principio central: una aplicación de salud debe reducir incertidumbre. Cada decisión visual y de interacción se evalúa según su capacidad para ayudar al usuario a entender qué medicamento tiene, cuándo debe tomarlo, qué stock queda y quién ha registrado una acción.

### 1.1 Claridad operativa

La interfaz prioriza la información accionable sobre la ornamentación. En las pantallas de uso diario, el usuario debe identificar en pocos segundos:

* La próxima toma relevante.
* El medicamento afectado.
* El blíster o paciente al que pertenece.
* El estado de stock o caducidad.
* La acción disponible según su rol.

Esta claridad se consigue mediante jerarquía tipográfica, cards compactas, colores semánticos y mensajes breves. Los textos evitan ambigüedad: una acción destructiva se expresa como "Eliminar", "Revocar" o "Deshacer", no con términos genéricos.

### 1.2 Mobile-first y escritorio en marco móvil

Blíster se diseña primero para móvil porque el contexto de uso principal es cotidiano: revisar una toma, escanear visualmente el botiquín o confirmar una dosis desde el teléfono. La experiencia de escritorio no se convierte en un dashboard amplio; se presenta dentro de un marco de dispositivo móvil para mantener proporciones, ritmos y patrones de navegación.

Este comportamiento permite:

* Mantener una única experiencia coherente.
* Evitar duplicar layouts para escritorio.
* Probar la experiencia móvil desde ordenador.
* Conservar la navegación inferior como patrón principal.

### 1.3 Accesibilidad como requisito funcional

La accesibilidad no se plantea como una mejora estética, sino como una necesidad del dominio. Personas mayores, cuidadores y usuarios con dificultades visuales o motoras deben poder utilizar la aplicación sin depender de precisión extrema ni de memoria a corto plazo.

Por ello, el diseño incluye:

* Contrastes compatibles con WCAG 2.2 AA.
* Tamaños táctiles mínimos.
* Tema oscuro.
* Ajuste de tamaño de texto.
* Fuente OpenDyslexic.
* HTML semántico y atributos ARIA en controles relevantes.

## 2. Arquitectura de experiencia

La experiencia se divide en rutas públicas, rutas de invitado y rutas privadas. Esta separación evita que un usuario autenticado vuelva a pantallas de login y protege los datos de salud tras autenticación.

### 2.1 Modelo de navegación

La navegación se organiza en tres capas:

| Capa | Componente | Función |
| :--- | :--- | :--- |
| Entrada pública | Landing, onboarding, login y registro | Presentar producto y acceder a la cuenta. |
| Shell privado | `AppLayout` | Envolver pantallas autenticadas con cabecera y navegación inferior. |
| Contexto móvil | `DesktopDeviceShell` | Mantener la experiencia dentro de marco móvil en escritorio. |

El usuario autenticado se mueve principalmente desde la navegación inferior. Las rutas administrativas se agrupan en Perfil para no saturar el uso diario.

### 2.2 Rutas públicas

| Ruta | Pantalla | Propósito |
| :--- | :--- | :--- |
| `/landing` | Landing | Entrada visual al producto. |
| `/onboarding` | Onboarding | Presentación de valores y uso recomendado. |
| `/login` | Login | Inicio de sesión. |
| `/register` | Registro | Alta de usuario y creación de blíster inicial. |
| `/forgot-password` | Recuperar contraseña | Solicitud de correo de recuperación. |
| `/reset-password?token=...` | Nueva contraseña | Restablecimiento mediante token recibido por email. |

Las rutas de recuperación se diseñan con la misma referencia visual que login para que el usuario perciba continuidad durante un momento sensible.

### 2.3 Rutas privadas

| Ruta | Pantalla | Propósito |
| :--- | :--- | :--- |
| `/home` | Inicio | Vista diaria agregada. |
| `/blisters` | Mis blísteres | Gestión de espacios y miembros. |
| `/blisters/:blisterId/medicines` | Botiquín | Inventario por blíster. |
| `/blisters/:blisterId/medicines/add` | Añadir medicamento | Alta desde CIMA. |
| `/blisters/:blisterId/medicines/:medicineId` | Detalle de medicamento | Stock, caducidad y enlace oficial. |
| `/medicines/cima/:nregist` | Ficha CIMA | Información oficial del medicamento. |
| `/blisters/:blisterId/treatments` | Tratamientos | Listado de pautas. |
| `/blisters/:blisterId/treatments/new` | Nuevo tratamiento | Creación de pauta. |
| `/blisters/:blisterId/treatments/:treatmentId` | Detalle de tratamiento | Progreso, medicamentos y citas. |
| `/blisters/:blisterId/appointments` | Calendario | Citas y dosis previstas. |
| `/profile` | Perfil | Acceso a configuración y administración. |
| `/profile/notifications` | Notificaciones | Preferencias de avisos. |
| `/profile/accessibility` | Accesibilidad | Tema, fuente y tamaño de texto. |
| `/profile/mcp` | Vincular IA | Token y configuración MCP. |

## 3. Diseño de pantallas principales

Las pantallas se diseñan alrededor de tareas. Cada una tiene un objetivo dominante y evita mezclar acciones de administración avanzada con flujos de uso diario.

### 3.1 Landing y onboarding

La landing funciona como primera impresión de marca. Presenta Blíster como producto, no como documentación técnica. El onboarding introduce el valor de la aplicación con un lenguaje visual más expresivo, apoyado en palabras destacadas en color terracota y el uso del verde de marca.

El onboarding cumple tres funciones:

1. Explicar que la app organiza medicamentos y tratamientos.
2. Mostrar que se apoya en información oficial.
3. Introducir la colaboración familiar y la conexión con asistentes de IA.

En escritorio, antes de entrar a la experiencia móvil, la aplicación muestra una pantalla que indica que Blíster se usa mejor en dispositivo móvil y permite continuar en el marco de simulación.

### 3.2 Autenticación y recuperación de contraseña

Las pantallas de acceso mantienen una composición limpia, centrada en formularios cortos y mensajes de ayuda. La palabra clave del título se resalta en terracota para reforzar continuidad con onboarding.

El flujo de recuperación de contraseña se divide en dos pantallas:

* **He olvidado mi contraseña:** solicita email y responde siempre con un mensaje neutro, exista o no la cuenta, para evitar enumeración de usuarios.
* **Nueva contraseña:** recibe el token por query string y permite guardar una contraseña válida. Si el token ha expirado o ya fue usado, la pantalla informa del error y guía al usuario a solicitar uno nuevo.

El email de recuperación utiliza HTML con estilos inline, logo de Blíster, colores de marca y botón CTA. También incluye versión en texto plano como fallback.

### 3.3 Inicio

Inicio actúa como panel de mando diario. No replica todas las secciones de la aplicación; selecciona los datos que requieren atención inmediata:

* Próximas dosis.
* Alertas de stock bajo o agotado.
* Caducidades próximas.
* Notificaciones relevantes.

Las dosis aparecen ordenadas por hora y muestran el medicamento, el tratamiento, el paciente y el blíster. Cuando el usuario tiene permisos, puede registrar la toma desde esta pantalla. El feedback se muestra mediante toast con posibilidad de deshacer dentro de la ventana permitida por el backend.

### 3.4 Botiquín

Botiquín muestra el inventario de un blíster concreto. La card de medicamento prioriza:

* Nombre visible o alias.
* Stock actual y unidad.
* Estado de caducidad.
* Indicadores de alerta farmacológica si CIMA informa cambios.

El alta de medicamento parte de una búsqueda en CIMA/AEMPS. El usuario selecciona el medicamento oficial y después completa datos locales: stock, umbral, fecha de caducidad y alias opcional. Esta separación evita que el usuario introduzca manualmente información farmacológica sensible.

### 3.5 Tratamientos

La sección de tratamientos organiza pautas activas o históricas. Cada tratamiento agrupa medicamentos, paciente, descripción y fechas. El diseño utiliza barras de progreso para indicar avance temporal y badges para distinguir estado activo.

El formulario de tratamiento permite definir pautas con:

* Medicamento asociado.
* Dosis y unidad.
* Horarios diarios o frecuencia.
* Paciente dentro del blíster.
* Fechas de inicio y fin.

El detalle de tratamiento integra información de medicamentos y citas relacionadas para que el usuario pueda consultar contexto completo sin saltar entre pantallas.

### 3.6 Calendario y citas

El calendario combina citas médicas y tomas previstas. Esta decisión evita que el usuario gestione dos agendas separadas para salud.

La interfaz distingue:

* Dosis previstas.
* Dosis registradas.
* Citas médicas.
* Comentarios asociados a una cita.

Las citas pueden vincularse a tratamientos y permiten comentarios. Cada comentario conserva autoría y marcas temporales de creación/edición, lo que facilita coordinación entre cuidadores.

### 3.7 Perfil y administración

Perfil concentra funciones que no pertenecen al uso diario:

* Datos personales.
* Cambio de contraseña.
* Avatar.
* Notificaciones.
* Accesibilidad.
* Gestión de blísteres.
* Vinculación MCP.
* Privacidad.

La pantalla MCP muestra URL, estado del token, caducidad y bloque de configuración para clientes externos. La revocación se separa en una pantalla específica para reforzar que es una acción de seguridad.

## 4. Diseño responsive

El diseño responsive de Blíster no busca convertir la aplicación en una interfaz de escritorio compleja. La prioridad es que la experiencia móvil sea sólida y que el escritorio sirva como contenedor cómodo para probar o utilizar la app.

### 4.1 Base móvil

La base móvil se diseña alrededor de anchuras cercanas a 375-430px. Los patrones clave son:

* Cabecera fija.
* Contenido vertical desplazable.
* Navegación inferior.
* Botones de ancho completo en formularios.
* Cards de lectura rápida.
* Bottom sheets o modales para confirmaciones.

Los inputs y botones mantienen área táctil suficiente. Las pantallas con formularios largos agrupan campos mediante secciones para evitar fatiga visual.

### 4.2 Comportamiento en escritorio

En escritorio se aplica `DesktopDeviceShell`, que envuelve la aplicación en un marco de móvil. Este marco conserva la proporción visual del diseño y evita que las pantallas se estiren horizontalmente.

El comportamiento esperado es:

1. El usuario ve una pantalla introductoria de uso recomendado en móvil.
2. Puede continuar desde escritorio.
3. La app aparece dentro del dispositivo simulado.
4. Las rutas privadas y públicas mantienen la misma composición móvil.

Este enfoque permite entregar una PWA mobile-first sin generar dos productos visuales distintos.

## 5. Diseño de interacción

Las interacciones están pensadas para reducir errores. El usuario opera sobre datos de salud, por lo que el sistema debe confirmar cambios, bloquear acciones no permitidas y diferenciar fallos de validación de fallos técnicos.

### 5.1 Feedback inmediato

Cada acción relevante ofrece respuesta:

| Acción | Feedback |
| :--- | :--- |
| Login o registro correcto | Redirección a Inicio. |
| Alta de medicamento | Toast de confirmación y vuelta al botiquín. |
| Registro de toma | Toast con opción de deshacer. |
| Cambio de stock | Actualización visual inmediata. |
| Error de formulario | Mensaje bajo el campo. |
| Token MCP generado | Visualización del token y configuración. |

El feedback usa mensajes cortos y evita información técnica interna.

### 5.2 Prevención de errores

El diseño previene errores mediante:

* Validación Zod compartida entre frontend y backend.
* Botones deshabilitados durante envío.
* Confirmación en acciones destructivas.
* Roles que bloquean acciones no permitidas.
* Mensajes neutrales en recuperación de contraseña.
* Consumo de token de reset tras usarlo.

En adherencia, el backend no permite stock negativo salvo toma forzada. Si se fuerza una toma, se genera notificación para dejar constancia de la inconsistencia.

### 5.3 Estados de carga, vacío y error

Cada pantalla de datos contempla tres estados:

* **Carga:** se muestra skeleton o indicador contextual.
* **Vacío:** se explica qué falta y se ofrece CTA.
* **Error:** se muestra mensaje claro y acción de reintento cuando procede.

Ejemplos:

| Pantalla | Empty state |
| :--- | :--- |
| Botiquín | Añadir primer medicamento. |
| Tratamientos | Crear tratamiento. |
| Citas | Añadir cita médica. |
| Blísteres | Crear o unirse a un blíster. |
| Notificaciones | Confirmar que no hay avisos pendientes. |

## 6. Diseño de datos y confianza

La confianza en Blíster no depende únicamente de la apariencia. También se construye mostrando el origen de la información, registrando autoría y evitando respuestas ambiguas ante acciones críticas.

### 6.1 Fuente oficial CIMA/AEMPS

El diseño diferencia datos oficiales y datos locales:

* Datos oficiales: nombre comercial, laboratorio, principios activos, fotos y enlaces de prospecto/ficha técnica.
* Datos locales: alias, stock, umbral, caducidad y notas.

Esta separación reduce el riesgo de que el usuario confunda información regulada con información introducida por la familia.

### 6.2 Trazabilidad de acciones

Las tomas registradas y los comentarios de citas guardan autoría. En la interfaz se utiliza esa información para indicar quién realizó la acción, especialmente en contextos compartidos.

Esta trazabilidad es importante porque varios cuidadores pueden actuar sobre el mismo blíster. El diseño evita que una dosis aparezca simplemente como "tomada" sin contexto cuando la autoría aporta seguridad.

### 6.3 Notificaciones y alertas

Las notificaciones se agrupan por severidad y tipo:

| Tipo | Función |
| :--- | :--- |
| `stock_low` | Avisar de reposición próxima. |
| `stock_depleted` | Alertar de stock agotado. |
| `expiration_warning` | Avisar de caducidad a 30, 15 o 7 días. |
| `adherence_forced` | Registrar toma forzada con stock insuficiente. |
| `cima_change` | Informar cambios oficiales de seguridad o suministro. |
| `dose_reminder` | Recordar dosis próxima o pendiente. |
| `appointment_reminder` | Avisar de cita médica. |
| `system` | Mensajes técnicos o administrativos. |

La interfaz no trata todas las notificaciones como equivalentes. Un aviso de stock agotado requiere mayor prioridad visual que una información general de sistema.

## 7. Accesibilidad e inclusión

Blíster se diseña para usuarios con diferentes niveles de familiaridad tecnológica. La aplicación debe poder utilizarse sin leer documentación externa y sin depender de patrones ocultos.

Las decisiones principales son:

* Navegación inferior con icono y texto.
* Formularios con labels visibles.
* Contraste suficiente entre texto y fondo.
* Soporte para tema oscuro.
* Tipografía alternativa para dislexia.
* Tamaño de texto configurable.
* Estados ARIA en controles dinámicos.
* Mensajes de error comprensibles.

La accesibilidad se refuerza también desde el contenido: los textos evitan tecnicismos innecesarios y expresan las consecuencias de una acción. En una aplicación de salud, comprender una acción es tan importante como poder pulsarla.
