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
