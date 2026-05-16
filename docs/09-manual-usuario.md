# 09 - Manual de usuario

Este manual explica cómo utilizar Blíster desde la perspectiva de una persona usuaria final. Incluye acceso, navegación, blísteres, botiquín, tratamientos, calendario, notificaciones, accesibilidad, privacidad y conexión MCP.

## Índice

1. [Primer acceso](#1-primer-acceso)
2. [Registro e inicio de sesión](#2-registro-e-inicio-de-sesión)
	- 2.1 [Crear una cuenta](#21-crear-una-cuenta)
	- 2.2 [Iniciar sesión](#22-iniciar-sesión)
	- 2.3 [Recuperar contraseña](#23-recuperar-contraseña)
3. [Navegación general](#3-navegación-general)
4. [Gestión de blísteres](#4-gestión-de-blísteres)
	- 4.1 [Crear un blíster](#41-crear-un-blíster)
	- 4.2 [Unirse a un blíster](#42-unirse-a-un-blíster)
	- 4.3 [Gestionar miembros](#43-gestionar-miembros)
5. [Botiquín y medicamentos](#5-botiquín-y-medicamentos)
	- 5.1 [Consultar medicamentos](#51-consultar-medicamentos)
	- 5.2 [Añadir medicamento](#52-añadir-medicamento)
	- 5.3 [Editar medicamento](#53-editar-medicamento)
	- 5.4 [Consultar ficha oficial](#54-consultar-ficha-oficial)
6. [Tratamientos y tomas](#6-tratamientos-y-tomas)
	- 6.1 [Crear tratamiento](#61-crear-tratamiento)
	- 6.2 [Consultar tratamiento](#62-consultar-tratamiento)
	- 6.3 [Registrar toma](#63-registrar-toma)
	- 6.4 [Deshacer toma](#64-deshacer-toma)
7. [Calendario y citas](#7-calendario-y-citas)
	- 7.1 [Crear una cita](#71-crear-una-cita)
	- 7.2 [Comentarios de citas](#72-comentarios-de-citas)
8. [Notificaciones](#8-notificaciones)
9. [Perfil, privacidad y accesibilidad](#9-perfil-privacidad-y-accesibilidad)
	- 9.1 [Datos personales](#91-datos-personales)
	- 9.2 [Privacidad](#92-privacidad)
	- 9.3 [Accesibilidad](#93-accesibilidad)
10. [Vinculación con asistentes de IA](#10-vinculación-con-asistentes-de-ia)
	- 10.1 [Generar token](#101-generar-token)
	- 10.2 [Configurar cliente externo](#102-configurar-cliente-externo)
	- 10.3 [Revocar acceso](#103-revocar-acceso)
11. [Preguntas frecuentes](#11-preguntas-frecuentes)
12. [Buenas prácticas](#12-buenas-prácticas)

## 1. Primer acceso

Al abrir Blíster se muestra la entrada pública y, en escritorio, una pantalla informativa que indica que la aplicación se usa mejor en dispositivo móvil. Se puede continuar desde ordenador, donde la aplicación aparecerá dentro de un marco móvil.


Acciones disponibles:

| Acción | Resultado |
| :--- | :--- |
| Continuar onboarding | Presenta las ideas principales de la aplicación. |
| Iniciar sesión | Lleva al formulario de acceso. |
| Crear cuenta | Abre el formulario de registro. |
| Consultar privacidad | Muestra la política de privacidad pública. |

En escritorio, la primera pantalla explica que Blíster se usa mejor en móvil y permite continuar igualmente. Esta decisión no bloquea el acceso desde ordenador; solo preserva la experiencia de navegación diseñada para teléfono.

| Situación | Qué debe hacer el usuario |
| :--- | :--- |
| Quiere probar desde ordenador | Pulsar `Usar aquí` y continuar dentro del marco móvil. |
| Quiere instalar en móvil | Abrir la URL desde el navegador del teléfono y usar la opción de instalación del navegador si aparece. |
| Quiere consultar privacidad antes de registrarse | Abrir la página pública `/privacy`. |

## 2. Registro e inicio de sesión

La cuenta permite guardar blísteres, medicamentos, tratamientos y preferencias de forma segura.

### 2.1 Crear una cuenta

Pasos:

1. Entrar en `Crear cuenta`.
2. Completar nombre, usuario, email y contraseña.
3. Aceptar los consentimientos requeridos.
4. Introducir un código de invitación si se dispone de uno.
5. Enviar el formulario.

Si no se introduce invitación, el sistema crea un blíster personal inicial. Si se usa un código válido, la cuenta se incorpora al blíster compartido con el rol definido por el propietario.

El formulario muestra errores junto al campo afectado. Si falta un dato obligatorio, si el email no tiene formato válido o si la contraseña no cumple la longitud mínima, el usuario recibe feedback en español sin abandonar la pantalla.

### 2.2 Iniciar sesión

Pasos:

1. Entrar en `Iniciar sesión`.
2. Escribir email o nombre de usuario.
3. Introducir contraseña.
4. Pulsar el botón de acceso.

Si las credenciales son incorrectas se muestra un mensaje sin indicar si el problema es el email, el usuario o la contraseña.

Después de iniciar sesión correctamente, la aplicación carga los datos de usuario y el blíster activo. Si la sesión caduca, la aplicación intenta renovarla; si no es posible, vuelve al acceso para proteger la información privada.

### 2.3 Recuperar contraseña

Pasos:

1. Pulsar `He olvidado mi contraseña`.
2. Introducir el correo de la cuenta.
3. Revisar el email recibido.
4. Abrir el enlace `/reset-password?token=...`.
5. Definir una nueva contraseña.

El enlace caduca y solo puede utilizarse una vez.

Si el enlace ya ha caducado, debe solicitarse uno nuevo desde la pantalla de recuperación. Por seguridad, la aplicación no confirma públicamente si un correo existe o no en la base de datos.

## 3. Navegación general

La navegación se organiza como una aplicación móvil.

| Zona | Función |
| :--- | :--- |
| Cabecera | Perfil, contexto, notificaciones y navegación de vuelta. |
| Menú inferior | Inicio, Botiquín, Tratamientos y Calendario. |
| Perfil | Cuenta, seguridad, blísteres, notificaciones, accesibilidad, privacidad y MCP. |
| Selector de blíster | Permite cambiar el contexto de trabajo cuando hay varios espacios. |

En las secciones operativas se muestran solo las acciones permitidas por el rol del usuario.

La navegación está pensada para tareas frecuentes:

| Necesidad | Sección recomendada |
| :--- | :--- |
| Ver qué toca próximamente | Inicio. |
| Revisar stock o caducidad | Botiquín. |
| Crear o modificar pautas | Tratamientos. |
| Consultar citas y calendario | Calendario. |
| Cambiar contraseña o accesibilidad | Perfil. |
| Leer avisos | Notificaciones. |

## 4. Gestión de blísteres

Un blíster es un espacio de trabajo sanitario. Puede representar un botiquín personal, el cuidado de un familiar o un contexto compartido entre varias personas.

### 4.1 Crear un blíster

1. Entrar en Perfil.
2. Abrir `Mis blísteres`.
3. Pulsar crear.
4. Indicar nombre y avatar.
5. Guardar.

La persona que lo crea queda como OWNER.

Un usuario puede tener varios blísteres. Antes de añadir medicamentos o tratamientos conviene comprobar el blíster activo para no registrar datos en el espacio equivocado.

### 4.2 Unirse a un blíster

1. Entrar en Perfil > Mis blísteres.
2. Seleccionar la opción de unirse.
3. Introducir el código recibido.
4. Confirmar.

Si el código es válido y no ha caducado, el blíster aparecerá en la cuenta.

Los códigos de invitación deben compartirse por un canal seguro. Quien recibe el código obtiene acceso al espacio de salud según el rol definido, por lo que no debe publicarse en conversaciones abiertas.

### 4.3 Gestionar miembros

Solo OWNER puede invitar, expulsar o cambiar roles. La aplicación evita dejar el blíster sin propietario.

| Rol | Uso recomendado |
| :--- | :--- |
| OWNER | Persona responsable de administrar el blíster. |
| CAREGIVER | Familiar o cuidador que registra tomas y gestiona datos. |
| OBSERVER | Persona que solo necesita supervisar. |

Ejemplo de uso familiar:

| Persona | Rol recomendado | Motivo |
| :--- | :--- | :--- |
| Paciente autónomo | OWNER | Controla su propio blíster. |
| Familiar que administra medicación | CAREGIVER | Necesita crear tratamientos y registrar tomas. |
| Familiar que solo revisa evolución | OBSERVER | No debe modificar inventario ni pautas. |

## 5. Botiquín y medicamentos

El botiquín muestra los medicamentos asociados al blíster activo.

### 5.1 Consultar medicamentos

Cada card de medicamento muestra nombre o alias, laboratorio, stock, unidad, caducidad y estado visual. Al abrir el detalle se pueden consultar los datos locales y acceder a la ficha oficial.

Los estados ayudan a priorizar:

| Estado | Significado |
| :--- | :--- |
| Stock correcto | Hay unidades suficientes según el umbral definido. |
| Stock bajo | Conviene reponer antes de que falte medicación. |
| Stock agotado | La siguiente toma puede requerir confirmación forzada. |
| Caducidad próxima | El medicamento debe revisarse. |
| Caducado | No debe utilizarse sin consultar a un profesional sanitario. |

### 5.2 Añadir medicamento

1. Entrar en Botiquín.
2. Pulsar añadir medicamento.
3. Buscar por nombre en CIMA/AEMPS.
4. Seleccionar el resultado oficial.
5. Completar stock, unidad, umbral, caducidad y alias opcional.
6. Guardar.

Los datos oficiales no se escriben manualmente. La aplicación los obtiene a partir del registro CIMA.

Si la búsqueda no devuelve resultados, se recomienda probar con una parte del nombre comercial o revisar la escritura. Blíster no inventa medicamentos: si no puede localizar información oficial, no se debe crear una ficha oficial falsa.

### 5.3 Editar medicamento

OWNER y CAREGIVER pueden editar datos locales como alias, stock, umbral y caducidad. OWNER puede eliminar medicamentos del blíster.

El stock debe actualizarse cuando se compra una caja nueva, se retira medicación caducada o se corrige un recuento manual. Esta información alimenta avisos y decisiones de toma.

### 5.4 Consultar ficha oficial

La ficha CIMA muestra información disponible del medicamento: nombre, laboratorio, principios activos, presentación, imágenes y enlaces a documentos oficiales.

## 6. Tratamientos y tomas

Los tratamientos organizan una pauta y permiten calcular próximas dosis.

### 6.1 Crear tratamiento

1. Entrar en Tratamientos.
2. Pulsar nuevo tratamiento.
3. Seleccionar paciente dentro del blíster.
4. Indicar título, descripción, fecha de inicio y fecha de fin si existe.
5. Añadir medicamentos del botiquín.
6. Definir dosis, primera toma y frecuencia por intervalo u horarios diarios.
7. Guardar.

### 6.2 Consultar tratamiento

El detalle muestra estado, progreso, medicamentos, dosis y citas relacionadas. Desde ahí puede editarse el tratamiento si el rol lo permite.

Antes de modificar una pauta activa, conviene confirmar que el cambio procede de una indicación médica o de una corrección de registro. Blíster no decide tratamientos; solo organiza la información introducida por el usuario.

### 6.3 Registrar toma

Una toma puede registrarse desde Inicio, Calendario o Historial. Al confirmar:

1. Se crea un registro de adherencia.
2. Se guarda quién realizó la acción.
3. Se descuenta el stock.
4. Se generan avisos si el stock queda bajo o agotado.

Si no hay stock suficiente, la aplicación solicita confirmación de toma forzada.

La toma forzada existe para reflejar situaciones reales, por ejemplo cuando el stock físico no estaba actualizado. Debe usarse con cuidado porque deja constancia de que el sistema no tenía unidades suficientes registradas.

### 6.4 Deshacer toma

Tras registrar una toma puede aparecer la opción de deshacer. Si se pulsa dentro de la ventana permitida, se restaura el stock y se elimina el registro.

Deshacer está pensado para errores inmediatos, como pulsar la toma equivocada. Si el error se detecta más tarde, debe revisarse el historial y corregirse siguiendo las acciones permitidas por la aplicación.

## 7. Calendario y citas

El calendario reúne tomas previstas y citas médicas.
### 7.1 Crear una cita

1. Entrar en Calendario.
2. Pulsar crear cita.
3. Seleccionar paciente.
4. Indicar título, fecha, hora, lugar y descripción.
5. Vincular un tratamiento si corresponde.
6. Guardar.

### 7.2 Comentarios de citas

Los comentarios ayudan a coordinar información entre cuidadores. Cada comentario guarda autor, fecha de creación y fecha de edición.

Ejemplos de comentarios útiles:

| Situación | Comentario recomendado |
| :--- | :--- |
| Cambio de hora | `La cita se retrasa a las 12:30.` |
| Documentación | `Llevar informe de la última analítica.` |
| Seguimiento | `Preguntar por ajuste de dosis.` |

## 8. Notificaciones

La bandeja de notificaciones muestra eventos relevantes.

| Tipo | Ejemplo |
| :--- | :--- |
| Stock | Medicamento con pocas unidades o agotado. |
| Caducidad | Medicamento próximo a caducar. |
| Adherencia | Toma forzada o recordatorio. |
| CIMA | Cambio oficial detectado. |
| Citas | Recordatorio de cita médica. |
| Sistema | Mensajes administrativos. |

Desde Perfil > Notificaciones se configuran categorías y push. Para recibir Web Push el navegador debe permitir notificaciones.

Las notificaciones pueden aparecer dentro de la bandeja aunque el navegador no permita push. La bandeja forma parte de la aplicación; Web Push depende del dispositivo, permisos y claves de servidor.

| Acción | Resultado |
| :--- | :--- |
| Marcar como leída | La notificación deja de aparecer como pendiente. |
| Eliminar | Se retira de la bandeja. |
| Cambiar preferencias | Activa o desactiva categorías de aviso. |
| Activar push | Solicita permiso al navegador compatible. |

## 9. Perfil, privacidad y accesibilidad

Perfil agrupa ajustes personales y administrativos.

### 9.1 Datos personales

Se pueden editar nombre, usuario, email, avatar y contraseña. Algunas acciones pueden requerir confirmación o verificación.

Al cambiar contraseña se recomienda cerrar sesiones en dispositivos no usados y utilizar una clave única. Si se modifica el email, el sistema puede requerir verificación para confirmar la nueva dirección.

### 9.2 Privacidad

La política de privacidad está disponible en `/privacy` y desde la navegación de perfil.

La política explica responsable de contacto, datos tratados, bases jurídicas, blísteres compartidos, servicios externos, conservación, medidas de seguridad y derechos RGPD.

### 9.3 Accesibilidad

La pantalla de accesibilidad permite cambiar:

| Ajuste | Opciones |
| :--- | :--- |
| Tema | Claro, oscuro o sistema. |
| Fuente | Estándar u OpenDyslexic. |
| Tamaño | Normal, grande o extra grande. |

Los cambios se aplican a toda la interfaz.

Si se usa Blíster para una persona mayor o con dificultad visual, se recomienda aumentar el tamaño de texto y probar el tema con mejor contraste en su dispositivo real.

## 10. Vinculación con asistentes de IA

Blíster puede conectarse con clientes compatibles con MCP.

### 10.1 Generar token

1. Entrar en Perfil > Vincular asistente de IA.
2. Generar token MCP.
3. Copiar la URL y el token en el cliente externo.

La pantalla muestra estado, creación y caducidad del token. El token debe tratarse como una credencial privada.

### 10.2 Configurar cliente externo

Configuración general:

```text
URL: https://api.miblister.es/mcp
Authorization: Bearer <token>
```

El asistente podrá consultar o modificar datos según los permisos reales del usuario.

El token MCP no debe pegarse en capturas, repositorios ni mensajes públicos. Permite actuar como el usuario dentro de los límites del sistema, por lo que debe protegerse igual que una contraseña.

### 10.3 Revocar acceso

Desde Perfil > MCP se puede revocar el token. La revocación invalida el acceso de clientes externos.

## 11. Preguntas frecuentes

| Pregunta | Respuesta |
| :--- | :--- |
| ¿Blíster sustituye a un médico? | No. Organiza información doméstica, pero no diagnostica ni modifica tratamientos prescritos. |
| ¿Puedo estar en varios blísteres? | Sí, dentro del límite definido por el sistema. |
| ¿Un observador puede registrar tomas? | No. OBSERVER solo consulta datos. |
| ¿Qué ocurre si no hay stock? | La app puede pedir confirmación de toma forzada y deja constancia. |
| ¿Los datos oficiales se editan? | No. Los datos oficiales proceden de CIMA/AEMPS; se editan solo datos locales. |
| ¿Puedo usar la app en ordenador? | Sí, se muestra en un marco móvil para conservar la experiencia principal. |
| ¿Qué pasa si revoco MCP? | El cliente externo deja de acceder con ese token. |
| No recibo el email de recuperación, ¿qué hago? | Revisar spam y solicitar un nuevo enlace; si no llega, comprobar que el correo introducido es correcto. |
| La búsqueda CIMA no devuelve resultados, ¿qué hago? | Probar otra parte del nombre y verificar que existe ficha oficial del medicamento. |
| No veo un botón de editar, ¿por qué? | Es probable que el rol actual no tenga permiso para esa acción. |
| No llegan notificaciones push, ¿qué reviso? | Permisos del navegador, configuración de notificaciones y compatibilidad del dispositivo. |
| Me equivoqué al registrar una toma, ¿qué hago? | Usar deshacer si sigue disponible; si no, revisar el historial y corregir según acciones permitidas. |

## 12. Buenas prácticas

| Recomendación | Motivo |
| :--- | :--- |
| Mantener stock actualizado | Evita avisos incorrectos y tomas forzadas innecesarias. |
| Revisar caducidades | Reduce el riesgo de conservar medicamentos vencidos. |
| Usar roles adecuados | Limita cambios a personas responsables. |
| No compartir códigos en canales inseguros | Protege datos de salud del blíster. |
| Revocar tokens MCP no usados | Reduce exposición de credenciales. |
| Consultar enlaces oficiales | Evita depender de fuentes no verificadas. |
| Validar cambios con profesionales sanitarios | La app no sustituye indicaciones médicas. |

Casos típicos de uso:

| Caso | Flujo recomendado |
| :--- | :--- |
| Persona que vive sola | Crear blíster personal, añadir medicación habitual y activar avisos de stock/caducidad. |
| Cuidado de familiar | Crear blíster compartido, invitar cuidadores y repartir roles. |
| Tratamiento temporal | Añadir medicamento, crear pauta con fecha de fin y registrar tomas hasta completar. |
| Revisión médica | Crear cita, añadir comentarios y consultar historial antes de acudir. |
| Uso con asistente IA | Generar token MCP, vincular cliente externo y revocar cuando no se necesite. |

En entornos de prueba, un blíster con un medicamento, un tratamiento activo y una cita permite recorrer las secciones principales sin introducir datos personales reales.

| Dato de prueba | Recomendación |
| :--- | :--- |
| Usuario | Cuenta temporal sin datos sensibles. |
| Medicamento | Resultado oficial CIMA fácil de localizar. |
| Stock | Valor bajo para mostrar avisos. |
| Tratamiento | Pauta simple con próxima toma cercana. |
| Cita | Fecha próxima con comentario de ejemplo. |
| MCP | Token generado y revocado al terminar. |