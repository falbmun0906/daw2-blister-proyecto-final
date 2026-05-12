# 09 - Manual de usuario

Este manual describe el uso funcional de Blíster desde la perspectiva de una persona usuaria final. Incluye el acceso inicial, la gestión de blísteres, medicamentos, tratamientos, citas, notificaciones, accesibilidad y conexión con asistentes de IA mediante MCP.

## Índice
1. [Acceso a la aplicación](#1-acceso-a-la-aplicación)
   - 1.1 [Pantalla de entrada](#11-pantalla-de-entrada)
   - 1.2 [Onboarding](#12-onboarding)
   - 1.3 [Registro](#13-registro)
   - 1.4 [Inicio de sesión](#14-inicio-de-sesión)
   - 1.5 [Recuperación de contraseña](#15-recuperación-de-contraseña)
2. [Navegación general](#2-navegación-general)
   - 2.1 [Cabecera](#21-cabecera)
   - 2.2 [Navegación inferior](#22-navegación-inferior)
   - 2.3 [Uso en escritorio](#23-uso-en-escritorio)
3. [Gestión de blísteres](#3-gestión-de-blísteres)
   - 3.1 [Crear un blíster](#31-crear-un-blíster)
   - 3.2 [Unirse a un blíster](#32-unirse-a-un-blíster)
   - 3.3 [Gestionar miembros](#33-gestionar-miembros)
   - 3.4 [Roles y permisos](#34-roles-y-permisos)
4. [Botiquín e inventario](#4-botiquín-e-inventario)
   - 4.1 [Consultar medicamentos](#41-consultar-medicamentos)
   - 4.2 [Añadir medicamento](#42-añadir-medicamento)
   - 4.3 [Editar medicamento](#43-editar-medicamento)
   - 4.4 [Consultar ficha oficial](#44-consultar-ficha-oficial)
5. [Tratamientos y tomas](#5-tratamientos-y-tomas)
   - 5.1 [Crear tratamiento](#51-crear-tratamiento)
   - 5.2 [Consultar tratamiento](#52-consultar-tratamiento)
   - 5.3 [Registrar toma](#53-registrar-toma)
   - 5.4 [Deshacer toma](#54-deshacer-toma)
6. [Calendario y citas médicas](#6-calendario-y-citas-médicas)
   - 6.1 [Vista de calendario](#61-vista-de-calendario)
   - 6.2 [Crear cita](#62-crear-cita)
   - 6.3 [Comentarios de citas](#63-comentarios-de-citas)
7. [Notificaciones](#7-notificaciones)
   - 7.1 [Bandeja de notificaciones](#71-bandeja-de-notificaciones)
   - 7.2 [Preferencias](#72-preferencias)
   - 7.3 [Notificaciones push](#73-notificaciones-push)
8. [Perfil y accesibilidad](#8-perfil-y-accesibilidad)
   - 8.1 [Datos personales](#81-datos-personales)
   - 8.2 [Contraseña](#82-contraseña)
   - 8.3 [Avatar](#83-avatar)
   - 8.4 [Accesibilidad](#84-accesibilidad)
9. [Vinculación con asistentes de IA](#9-vinculación-con-asistentes-de-ia)
   - 9.1 [Generar token MCP](#91-generar-token-mcp)
   - 9.2 [Configurar cliente externo](#92-configurar-cliente-externo)
   - 9.3 [Revocar acceso](#93-revocar-acceso)
10. [Buenas prácticas de uso](#10-buenas-prácticas-de-uso)

---

## 1. Acceso a la aplicación

El acceso a Blíster comienza en la pantalla pública. Desde ella se puede conocer la aplicación, completar el onboarding, registrarse, iniciar sesión o recuperar una contraseña.

### 1.1 Pantalla de entrada

Al abrir la aplicación, el usuario accede a la landing pública. Esta pantalla presenta la identidad de Blíster y permite iniciar el flujo de uso.

Las acciones principales son:

* Continuar hacia el onboarding.
* Iniciar sesión si ya existe una cuenta.
* Crear una cuenta nueva.

En escritorio, la aplicación muestra una indicación de que Blíster se usa mejor en dispositivo móvil. El usuario puede continuar desde ordenador y la experiencia se mostrará dentro de un marco de móvil.

### 1.2 Onboarding

El onboarding introduce los valores principales de la aplicación:

1. Organización del botiquín.
2. Información oficial de medicamentos.
3. Uso compartido con familiares o cuidadores.
4. Conexión con asistentes de IA.

El usuario puede avanzar entre pantallas o saltar el onboarding. Una vez completado, la aplicación recuerda esa decisión.

### 1.3 Registro

Para crear una cuenta, el usuario debe completar el formulario de registro con:

* Nombre.
* Nombre de usuario.
* Email.
* Contraseña.
* Confirmación de contraseña.
* Aceptación de condiciones requeridas.

Tras registrarse correctamente, Blíster crea automáticamente un blíster inicial personal. Este espacio permite empezar a añadir medicamentos sin configurar nada más.

Si el usuario dispone de un código de invitación, puede usarlo para incorporarse a un blíster existente. En ese caso, el sistema mantiene también la identidad personal del usuario y aplica el rol definido por la invitación.

### 1.4 Inicio de sesión

El login permite acceder mediante email o nombre de usuario y contraseña. Si las credenciales son correctas, la aplicación redirige a Inicio.

Si las credenciales son incorrectas, se muestra un mensaje de error sin revelar si el problema corresponde al email, al usuario o a la contraseña.

### 1.5 Recuperación de contraseña

El enlace "He olvidado mi contraseña" abre la pantalla de recuperación. El usuario introduce su email y recibe una respuesta neutra. Por seguridad, la aplicación muestra el mismo mensaje aunque el email no esté registrado.

Si el email corresponde a una cuenta activa, Blíster envía un correo con un enlace:

```text
/reset-password?token=...
```

Desde esa pantalla se define una nueva contraseña. El enlace tiene caducidad y solo puede utilizarse una vez.

## 2. Navegación general

La navegación de Blíster está pensada para uso móvil. Las acciones frecuentes se encuentran en la parte inferior y las opciones administrativas se agrupan en Perfil.

### 2.1 Cabecera

La cabecera superior permite:

* Ver la identidad del contexto actual.
* Acceder al perfil.
* Abrir notificaciones.
* Volver a pantallas anteriores cuando corresponde.

En pantallas de detalle, la cabecera muestra navegación contextual para volver al listado relacionado.

### 2.2 Navegación inferior

La navegación inferior tiene cuatro secciones:

| Sección | Uso |
| :--- | :--- |
| Inicio | Ver próximas dosis, alertas y resumen diario. |
| Botiquín | Consultar y gestionar medicamentos. |
| Tratamientos | Crear y revisar pautas médicas. |
| Calendario | Consultar tomas previstas y citas médicas. |

Cuando no hay un blíster activo, las secciones que dependen de él redirigen a la gestión de blísteres.

### 2.3 Uso en escritorio

En ordenador, Blíster mantiene una visualización móvil. El contenido aparece dentro de un marco que simula un dispositivo. Este diseño permite usar la aplicación desde escritorio sin alterar la experiencia principal.

## 3. Gestión de blísteres

Un blíster es un espacio de trabajo sanitario. Puede representar el botiquín personal de una persona, el tratamiento de un familiar o un contexto compartido entre cuidadores.

### 3.1 Crear un blíster

Desde Perfil, el usuario accede a "Mis blísteres" y puede crear uno nuevo. El formulario solicita:

* Nombre del blíster.
* Avatar o icono identificativo.

El usuario que crea el blíster queda como Propietario.

### 3.2 Unirse a un blíster

Para unirse a un blíster existente, el usuario introduce un código de invitación. El código lo genera un Propietario desde la pantalla de miembros.

Si el código es válido:

* El usuario se incorpora al blíster.
* Se aplica el rol definido en la invitación.
* El nuevo blíster aparece en sus espacios disponibles.

Si el código ha caducado o no existe, la aplicación muestra un error.

### 3.3 Gestionar miembros

El Propietario puede abrir la pantalla de miembros para:

* Ver quién pertenece al blíster.
* Generar invitaciones.
* Cambiar roles.
* Eliminar miembros.

La aplicación protege el blíster para evitar que quede sin propietario.

### 3.4 Roles y permisos

| Acción | Propietario | Cuidador | Observador |
| :--- | :---: | :---: | :---: |
| Ver medicamentos | Sí | Sí | Sí |
| Añadir medicamento | Sí | Sí | No |
| Editar stock | Sí | Sí | No |
| Eliminar medicamento | Sí | No | No |
| Crear tratamiento | Sí | Sí | No |
| Registrar toma | Sí | Sí | No |
| Ver calendario | Sí | Sí | Sí |
| Crear cita | Sí | Sí | No |
| Gestionar miembros | Sí | No | No |
| Eliminar blíster | Sí | No | No |

Los Observadores pueden supervisar, pero no modificar datos.

## 4. Botiquín e inventario

El botiquín permite consultar los medicamentos almacenados en un blíster y controlar stock, caducidad y datos oficiales.

### 4.1 Consultar medicamentos

La pantalla de Botiquín muestra una lista de medicamentos. Cada tarjeta incluye:

* Nombre o alias.
* Laboratorio.
* Stock actual.
* Unidad de stock.
* Fecha de caducidad.
* Estado de alerta si corresponde.

Al pulsar sobre un medicamento se abre su detalle.

### 4.2 Añadir medicamento

El alta de medicamento comienza con una búsqueda en CIMA/AEMPS. El usuario escribe el nombre comercial y selecciona un resultado oficial.

Después completa los datos locales:

* Stock inicial.
* Unidad.
* Umbral de aviso.
* Fecha de caducidad.
* Alias opcional.

Al guardar, el medicamento queda vinculado al blíster activo.

### 4.3 Editar medicamento

Desde el detalle se puede editar:

* Alias.
* Stock.
* Umbral.
* Fecha de caducidad.

Los datos oficiales procedentes de CIMA no se editan manualmente. Si un medicamento cambia oficialmente, el sistema lo gestiona mediante la integración con AEMPS.

### 4.4 Consultar ficha oficial

La ficha CIMA muestra información oficial:

* Nombre.
* Laboratorio.
* Principios activos.
* Presentación.
* Fotos disponibles.
* Enlace al prospecto.
* Enlace a ficha técnica.

Esta pantalla sirve como acceso rápido a documentación regulada.

## 5. Tratamientos y tomas

Los tratamientos organizan la pauta de uso de uno o varios medicamentos. Permiten calcular próximas dosis y registrar adherencia.

### 5.1 Crear tratamiento

Desde Tratamientos se pulsa "Nuevo tratamiento". El formulario solicita:

* Paciente del blíster.
* Descripción o nombre del tratamiento.
* Fecha de inicio.
* Fecha de fin, si aplica.
* Medicamentos asociados.
* Dosis y horarios.

Cada medicamento puede tener su pauta. Al guardar, el tratamiento aparece en el listado.

### 5.2 Consultar tratamiento

El detalle del tratamiento muestra:

* Estado activo o finalizado.
* Progreso temporal.
* Medicamentos vinculados.
* Dosis configuradas.
* Citas relacionadas.
* Historial o acciones disponibles.

Desde esta pantalla se puede navegar al medicamento o crear una cita asociada.

### 5.3 Registrar toma

Una toma puede registrarse desde Inicio, Calendario o pantallas relacionadas. Al marcarla como tomada:

1. Se crea un registro de adherencia.
2. Se guarda quién realizó la acción.
3. Se descuenta el stock correspondiente.
4. Se generan avisos si el stock queda bajo o agotado.

Si no hay stock suficiente, la aplicación puede solicitar confirmación de toma forzada. Esta acción deja constancia mediante notificación.

### 5.4 Deshacer toma

Tras registrar una toma aparece una opción de deshacer. Si se usa dentro de la ventana permitida:

* Se elimina el registro.
* Se restaura el stock.
* La interfaz vuelve al estado anterior.

Si la ventana expira, el backend rechaza el deshacer para proteger la integridad del historial.

## 6. Calendario y citas médicas

El calendario permite ver la planificación sanitaria combinando tomas y citas.

### 6.1 Vista de calendario

La vista agrupa información por fecha. Puede mostrar:

* Tomas previstas.
* Tomas registradas.
* Citas médicas.
* Indicadores visuales de actividad diaria.

El usuario puede alternar entre vista de pastillero y citas según el contexto.

### 6.2 Crear cita

Para crear una cita se indica:

* Paciente.
* Fecha.
* Hora.
* Lugar.
* Descripción.
* Tratamiento vinculado, si procede.

Las citas ayudan a mantener en el mismo entorno la agenda médica y los tratamientos relacionados.

### 6.3 Comentarios de citas

Los comentarios permiten coordinar información entre miembros del blíster. Un comentario conserva:

* Texto.
* Autor.
* Fecha de creación.
* Fecha de edición, si se modifica.

El autor puede editar o eliminar su comentario según las reglas de permisos.

## 7. Notificaciones

Blíster genera notificaciones para avisar de eventos relevantes de salud y sistema.

### 7.1 Bandeja de notificaciones

La bandeja muestra avisos como:

* Stock bajo.
* Stock agotado.
* Caducidad próxima.
* Toma forzada.
* Cambios CIMA.
* Recordatorios de dosis.
* Recordatorios de citas.

El usuario puede marcar notificaciones como leídas o eliminarlas de su bandeja.

### 7.2 Preferencias

Desde Perfil > Notificaciones se pueden configurar preferencias. Las categorías principales son:

* Stock.
* Caducidad.
* Cambios CIMA.
* Adherencia.
* Dosis.
* Citas.
* Push.

El sistema respeta estas preferencias al decidir si envía avisos push.

### 7.3 Notificaciones push

Para recibir push, el usuario debe:

1. Activar notificaciones en la aplicación.
2. Conceder permiso en el navegador.
3. Mantener una suscripción válida.

Si el navegador no soporta push o el usuario deniega permisos, la aplicación conserva las notificaciones dentro de la bandeja.

## 8. Perfil y accesibilidad

Perfil agrupa la configuración personal, visual y administrativa.

### 8.1 Datos personales

El usuario puede actualizar:

* Nombre.
* Nombre de usuario.
* Email.
* Preferencias visuales.

Los cambios se guardan en la cuenta y se aplican al volver a cargar la aplicación.

### 8.2 Contraseña

La pantalla de cambio de contraseña solicita contraseña actual y nueva contraseña. Este flujo se usa cuando el usuario ya está autenticado.

La recuperación por email se utiliza cuando el usuario no recuerda su contraseña y no puede iniciar sesión.

### 8.3 Avatar

El avatar permite identificar visualmente el perfil. También existen avatares o iconos para blísteres, útiles cuando el usuario pertenece a varios espacios.

### 8.4 Accesibilidad

La pantalla de accesibilidad permite modificar:

* Tema claro, oscuro o sistema.
* Fuente estándar u OpenDyslexic.
* Tamaño de texto.

Estos ajustes se aplican a la interfaz completa.

## 9. Vinculación con asistentes de IA

Blíster permite conectar asistentes externos mediante MCP. Esta función está pensada para consultar o registrar información mediante lenguaje natural desde clientes compatibles.

### 9.1 Generar token MCP

Desde Perfil > Vincular Asistente de IA, el usuario puede generar un token. La pantalla muestra:

* Estado del token.
* Fecha de creación.
* Fecha de caducidad.
* URL MCP.
* Bloque de configuración para el cliente.

El token debe tratarse como una credencial privada.

### 9.2 Configurar cliente externo

La configuración utiliza:

```text
URL: https://<backend>/mcp
Authorization: Bearer <token>
```

Una vez conectado, el asistente puede ejecutar herramientas autorizadas como consultar inventario, ver próximas dosis o registrar una toma, siempre dentro de los permisos del usuario.

### 9.3 Revocar acceso

Si el usuario sospecha que el token se ha expuesto o ya no necesita la conexión, puede revocarlo desde la pantalla correspondiente. La revocación invalida el token y corta el acceso de clientes externos.

## 10. Buenas prácticas de uso

Para utilizar Blíster de forma segura:

* Mantener actualizado el stock después de comprar medicamentos.
* Revisar caducidades periódicamente.
* Usar blísteres separados para contextos familiares distintos.
* Asignar rol Observador a quien solo deba supervisar.
* No compartir tokens MCP por canales inseguros.
* Revocar tokens no utilizados.
* Consultar siempre los enlaces oficiales de CIMA ante dudas farmacológicas.
* No sustituir indicaciones médicas por decisiones tomadas dentro de la aplicación.

Blíster ayuda a organizar la información sanitaria del hogar, pero no reemplaza el criterio de profesionales sanitarios ni modifica tratamientos prescritos.
