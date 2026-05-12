# 04 - Guía de estilos

La guía de estilos de Blíster define las decisiones visuales y de implementación CSS que sostienen la identidad del producto. Su finalidad es garantizar que cada pantalla mantenga coherencia de marca, accesibilidad y consistencia técnica, especialmente en una aplicación de salud donde la claridad visual tiene impacto directo sobre la seguridad de uso.

## Índice
1. [Identidad visual](#1-identidad-visual)
   - 1.1 [Personalidad de marca](#11-personalidad-de-marca)
   - 1.2 [Uso del nombre y tono visual](#12-uso-del-nombre-y-tono-visual)
2. [Paleta cromática](#2-paleta-cromática)
   - 2.1 [Colores principales](#21-colores-principales)
   - 2.2 [Colores semánticos](#22-colores-semánticos)
   - 2.3 [Tokens de dominio sanitario](#23-tokens-de-dominio-sanitario)
   - 2.4 [Tema oscuro](#24-tema-oscuro)
3. [Tipografía](#3-tipografía)
   - 3.1 [Familias tipográficas](#31-familias-tipográficas)
   - 3.2 [Escala de texto](#32-escala-de-texto)
   - 3.3 [Legibilidad y dislexia](#33-legibilidad-y-dislexia)
4. [Espaciado, radios y elevación](#4-espaciado-radios-y-elevación)
   - 4.1 [Sistema de espaciado](#41-sistema-de-espaciado)
   - 4.2 [Bordes y radios](#42-bordes-y-radios)
   - 4.3 [Sombras y profundidad](#43-sombras-y-profundidad)
5. [Arquitectura CSS](#5-arquitectura-css)
   - 5.1 [ITCSS](#51-itcss)
   - 5.2 [BEM](#52-bem)
   - 5.3 [Variables CSS](#53-variables-css)
6. [Componentes visuales](#6-componentes-visuales)
   - 6.1 [Botones](#61-botones)
   - 6.2 [Campos de formulario](#62-campos-de-formulario)
   - 6.3 [Cards y filas](#63-cards-y-filas)
   - 6.4 [Navegación](#64-navegación)
   - 6.5 [Estados de sistema](#65-estados-de-sistema)
7. [Accesibilidad visual](#7-accesibilidad-visual)
   - 7.1 [Contraste](#71-contraste)
   - 7.2 [Áreas táctiles](#72-áreas-táctiles)
   - 7.3 [Iconografía y ARIA](#73-iconografía-y-aria)

---

## 1. Identidad visual

Blíster se presenta como una herramienta sanitaria doméstica: cercana, clara y fiable. La identidad visual evita el exceso decorativo y prioriza que el usuario pueda reconocer rápidamente qué tiene que hacer, qué información es urgente y qué acciones modifican datos de salud.

### 1.1 Personalidad de marca

La marca se apoya en tres atributos:

* **Cuidado:** La interfaz transmite acompañamiento sin infantilizar al usuario.
* **Rigor:** Los datos farmacológicos se vinculan a fuentes oficiales, por lo que la presentación debe reforzar confianza.
* **Calma:** Los colores, el espaciado y las transiciones evitan generar sensación de alarma salvo en estados realmente críticos.

Esta personalidad se traduce en una interfaz móvil limpia, con jerarquías claras y una paleta contenida. La aplicación no utiliza efectos visuales que compitan con la información médica.

### 1.2 Uso del nombre y tono visual

El nombre **Blíster** se escribe siempre con tilde y con mayúscula inicial cuando se refiere al producto. Cuando se utiliza como concepto funcional dentro de la aplicación, puede aparecer en minúscula como nombre común: "crear un blíster", "cambiar de blíster" o "mi blíster familiar".

El tono visual refuerza el carácter práctico del producto:

* Los títulos son directos y orientados a la tarea.
* Los textos de ayuda explican consecuencias, no adornos.
* Las alertas diferencian información, advertencia y error.
* Las acciones destructivas requieren confirmación o aparecen claramente diferenciadas.

## 2. Paleta cromática

La paleta se define mediante variables CSS en `frontend/src/scss/00-settings/_colors.scss`. El sistema usa colores con roles semánticos, no valores arbitrarios en componentes.

### 2.1 Colores principales

| Token | Valor claro | Uso principal |
| :--- | :--- | :--- |
| `--color-primary` | Verde teal profundo | Botones principales, enlaces activos e interacción principal. |
| `--color-primary-mid` | Verde Blíster medio | Indicadores, elementos activos, barras de progreso y acentos funcionales. |
| `--color-primary-subtle` | Verde suave | Avatares, chips y fondos secundarios de marca. |
| `--color-accent` | Terracota | Palabras destacadas, detalles emocionales, llamadas secundarias y avisos no críticos. |
| `--color-bg` | Gris claro | Fondo general de aplicación. |
| `--color-surface` | Blanco | Cards, formularios y superficies elevadas. |

El verde actúa como color de confianza y acción. El terracota se reserva para destacar palabras clave o estados que requieren atención sin alcanzar gravedad clínica.

### 2.2 Colores semánticos

Los estados semánticos se definen con tokens específicos:

| Token | Significado | Ejemplos de uso |
| :--- | :--- | :--- |
| `--color-success` | Acción completada o estado correcto | Toma registrada, stock suficiente. |
| `--color-warning` | Atención requerida | Stock bajo, toma forzada, aviso preventivo. |
| `--color-error` | Error o estado crítico | Sin stock, caducado, fallo de validación. |
| `--color-info` | Información neutral | Citas médicas, mensajes de sistema. |

Cada color semántico tiene variantes `subtle`, `hover` y `border` para permitir fondos, estados interactivos y contornos accesibles.

### 2.3 Tokens de dominio sanitario

Además de los colores semánticos generales, Blíster define tokens vinculados al dominio:

| Token | Uso |
| :--- | :--- |
| `--color-dose-taken` | Dosis tomada. |
| `--color-dose-pending` | Dosis pendiente. |
| `--color-dose-skipped` | Dosis omitida o forzada. |
| `--color-stock-ok` | Stock correcto. |
| `--color-stock-low` | Stock bajo. |
| `--color-stock-critical` | Stock agotado o crítico. |
| `--color-expired` | Medicamento caducado. |
| `--color-treatment-active` | Tratamiento activo. |
| `--color-appointment` | Cita médica. |

Esta capa permite cambiar la representación visual de un concepto sanitario sin modificar todos los componentes que lo usan.

### 2.4 Tema oscuro

El tema oscuro se activa mediante el atributo `data-theme="dark"` en el elemento `<html>`. No se delega en `prefers-color-scheme` dentro de componentes, ya que la preferencia se gestiona desde el panel de accesibilidad del usuario.

En modo oscuro:

* Las superficies pasan a grises oscuros neutros con matiz verde.
* El verde de marca se mantiene como color principal.
* El terracota conserva su papel de acento.
* Las sombras aumentan opacidad para mantener separación entre capas.

## 3. Tipografía

La tipografía combina una familia de cuerpo legible con una familia display para reforzar la personalidad de marca en títulos principales.

### 3.1 Familias tipográficas

| Token | Familia | Uso |
| :--- | :--- | :--- |
| `--font-body` | Nunito | Texto general, formularios, navegación y cards. |
| `--font-display` | Overpass | Títulos principales y pantallas de marca. |
| `--font-dyslexia` | OpenDyslexic | Modo de lectura accesible. |

El cuerpo de texto usa Nunito por su tono amable y buena legibilidad en interfaces móviles. Overpass se reserva para titulares, evitando sobrecargar pantallas densas.

### 3.2 Escala de texto

La escala tipográfica se define mediante tokens:

| Token | Uso |
| :--- | :--- |
| `--text-xs` | Metadatos, etiquetas auxiliares. |
| `--text-sm` | Ayudas, badges, textos secundarios. |
| `--text-base` | Texto de lectura y formularios. |
| `--text-lg` | Subtítulos y bloques destacados. |
| `--text-xl` | Encabezados de sección. |
| `--text-2xl` y superiores | Pantallas de marca y títulos de alto impacto. |

El diseño evita usar tamaños excesivos dentro de cards o paneles compactos. Las pantallas operativas necesitan densidad controlada para que el usuario pueda comparar información de medicamentos, tomas y citas.

### 3.3 Legibilidad y dislexia

La aplicación permite cambiar la fuente a OpenDyslexic desde el panel de accesibilidad. Este cambio se aplica globalmente mediante `data-font="dyslexic"` y afecta al token `--font-body`.

El sistema también permite ajustar el tamaño base del texto mediante `data-text-size`, con opciones normal, grande y extra grande. Esta decisión evita implementar variantes manuales por componente y garantiza una respuesta homogénea en toda la interfaz.

## 4. Espaciado, radios y elevación

El sistema de layout se apoya en tokens para reducir inconsistencias entre pantallas. Las medidas se expresan en `rem` siempre que forman parte del diseño.

### 4.1 Sistema de espaciado

La escala base se define en `frontend/src/scss/00-settings/_spacing.scss` con múltiplos de 0.25rem:

| Token | Equivalencia | Uso |
| :--- | :--- | :--- |
| `--space-1` | 0.25rem | Separaciones mínimas. |
| `--space-2` | 0.5rem | Elementos compactos. |
| `--space-3` | 0.75rem | Listas y pequeños grupos. |
| `--space-4` | 1rem | Separación estándar. |
| `--space-6` | 1.5rem | Bloques internos. |
| `--space-8` | 2rem | Separación entre secciones. |
| `--space-touch-min` | 2.75rem | Área táctil mínima. |

La aplicación se diseña mobile-first, por lo que el espaciado debe permitir lectura cómoda sin desperdiciar superficie útil.

### 4.2 Bordes y radios

Los radios se centralizan en `frontend/src/scss/00-settings/_css-variables.scss`:

| Token | Uso |
| :--- | :--- |
| `--radius-sm` | Inputs, badges y tooltips. |
| `--radius-md` | Cards y paneles estándar. |
| `--radius-lg` | Cards de medicamento y bottom sheets. |
| `--radius-xl` | Modales de mayor tamaño. |
| `--radius-full` | Avatares, chips, toggles y botones circulares. |

La interfaz utiliza esquinas suaves pero no excesivamente decorativas. En una herramienta de salud, la forma debe facilitar agrupación y lectura, no convertirse en el elemento protagonista.

### 4.3 Sombras y profundidad

Las sombras se definen con tres niveles:

| Token | Uso |
| :--- | :--- |
| `--shadow-sm` | Separación sutil en listas. |
| `--shadow-md` | Modales, dropdowns y bottom sheets. |
| `--shadow-lg` | Toasts, elementos flotantes y superficies de máxima prioridad. |

Cuando una pantalla necesita una elevación específica, se crea un token semántico en `00-settings/_css-variables.scss`, por ejemplo `--shadow-card-soft`, `--shadow-bottom-sheet`, `--shadow-sticky-cta`, `--shadow-dialog`, `--shadow-toast` o `--shadow-device`. Los componentes consumen esos tokens en lugar de valores `rgba(...)` literales.

La elevación se usa para indicar jerarquía interactiva. Las cards de información repetida no deben parecer modales ni competir con acciones principales.

## 5. Arquitectura CSS

La arquitectura de estilos sigue ITCSS y BEM. Esta combinación ordena la cascada desde lo más genérico hasta lo más específico y reduce conflictos entre componentes.

### 5.1 ITCSS

El punto de entrada principal es `frontend/src/scss/main.scss`, que importa las capas en este orden:

```scss
@use '00-settings' as settings;
@use '01-tools'    as tools;
@use '02-generic'  as generic;
@use '03-elements' as elements;
@use '04-objects'  as objects;
@use '05-components' as components;
@use '06-utilities'  as utilities;
```

| Capa | Responsabilidad |
| :--- | :--- |
| `00-settings` | Tokens de color, tipografía, espaciado, breakpoints y variables globales. |
| `01-tools` | Mixins, funciones y helpers SCSS sin salida CSS directa. |
| `02-generic` | Reset, normalización y reglas globales de base. |
| `03-elements` | Estilos de etiquetas HTML. |
| `04-objects` | Patrones de layout sin apariencia de marca. |
| `05-components` | Componentes concretos de interfaz. |
| `06-utilities` | Utilidades controladas y excepciones transversales. |

Los estilos de páginas también se integran en `05-components` como parciales SCSS y se re-exportan desde `frontend/src/scss/05-components/_index.scss`. De esta forma React solo carga `src/scss/main.scss` como entrada global y se evita que cada página importe hojas de estilo directas fuera de la arquitectura ITCSS.

### 5.2 BEM

Las clases CSS siguen nomenclatura BEM:

```scss
.c-medicine-card { }
.c-medicine-card__title { }
.c-medicine-card--expired { }
```

Los prefijos principales son:

| Prefijo | Uso |
| :--- | :--- |
| `.c-` | Componentes visuales. |
| `.o-` | Objetos de layout. |
| `.u-` | Utilidades transversales. |

Esta convención permite identificar rápidamente si una clase pertenece a un componente, a un patrón estructural o a una utilidad.

### 5.3 Variables CSS

Blíster utiliza variables CSS nativas en lugar de variables SCSS para los tokens que pueden cambiar en tiempo de ejecución. Esto permite alternar tema, fuente y tamaño de texto sin recompilar estilos.

Ejemplo de uso correcto:

```scss
.c-btn--primary {
  background-color: var(--color-primary);
  color: var(--color-text-on-primary);
}
```

Los componentes no deben depender de valores hexadecimales directos. Cuando aparece una necesidad visual nueva, se crea un token específico sin eliminar ni renombrar los existentes.

## 6. Componentes visuales

Los componentes de Blíster se diseñan para flujos de uso repetido: registrar tomas, revisar stock, consultar tratamientos y navegar entre blísteres. Por ello, los controles deben ser reconocibles y consistentes.

### 6.1 Botones

Los botones se organizan por intención:

| Variante | Uso |
| :--- | :--- |
| Primario | Acción principal de la pantalla. |
| Secundario o outline | Acción alternativa no destructiva. |
| Ghost | Navegación, cancelación o acción de baja prioridad. |
| Destructivo | Eliminación, revocación o acciones irreversibles. |

Cada botón debe mantener área táctil suficiente, estado `disabled`, foco visible y texto claro. Los botones con icono sin texto visible requieren `aria-label`.

### 6.2 Campos de formulario

Los formularios usan labels visibles y mensajes de error próximos al campo afectado. El error no se expresa solo por color; también aparece texto explicativo para lectores de pantalla y usuarios con daltonismo.

Los campos críticos son:

* Email, usuario y contraseña en autenticación.
* Stock, umbral y caducidad en medicamentos.
* Pauta, frecuencia y paciente en tratamientos.
* Fecha, hora y descripción en citas médicas.

### 6.3 Cards y filas

Las cards representan entidades persistentes: medicamentos, tratamientos, citas, notificaciones o miembros. Su estructura debe permitir escaneo rápido:

1. Identificador principal: nombre del medicamento, tratamiento o cita.
2. Información secundaria: stock, fecha, paciente o estado.
3. Acción o navegación: editar, ver detalle, registrar toma.

Las filas compactas se reservan para listados densos, como historial de adherencia o comentarios.

### 6.4 Navegación

La navegación principal se sitúa en la parte inferior mediante `BottomNav`, siguiendo el patrón móvil:

| Sección | Función |
| :--- | :--- |
| Inicio | Vista diaria y alertas. |
| Botiquín | Inventario de medicamentos. |
| Tratamientos | Pautas activas y detalle. |
| Calendario | Tomas y citas. |

La cabecera superior concentra perfil, selector de contexto y notificaciones. En escritorio, el contenido se envuelve dentro del marco de dispositivo móvil para conservar la experiencia de uso prevista.

### 6.5 Estados de sistema

La interfaz define estados consistentes:

| Estado | Representación |
| :--- | :--- |
| Loading | Skeleton o estructura de carga equivalente. |
| Empty | Mensaje contextual y CTA. |
| Error | Mensaje claro y acción de reintento cuando procede. |
| Success | Toast o confirmación breve. |
| Warning | Banner o texto destacado cuando existe riesgo operativo. |

Estos estados evitan que una pantalla parezca rota cuando todavía no hay datos o cuando una llamada a la API falla.

## 7. Accesibilidad visual

La accesibilidad forma parte del diseño base, no de una fase posterior. Blíster maneja datos de salud y debe poder utilizarse por personas mayores, cuidadores y usuarios con diferentes capacidades visuales o motoras.

### 7.1 Contraste

Los textos deben cumplir los umbrales WCAG 2.2 AA:

* 4.5:1 para texto normal.
* 3:1 para texto grande o elementos gráficos esenciales.

Los colores semánticos se acompañan de texto, iconografía o estado para que la información no dependa exclusivamente del color.

### 7.2 Áreas táctiles

Los elementos pulsables deben respetar un área mínima de `44x44px` CSS, expresada en el sistema mediante `--space-touch-min`. Esta regla se aplica especialmente a:

* Botones de navegación inferior.
* Toggles de toma.
* Botones de editar o eliminar.
* Cierre de modales.
* Controles de calendario.

### 7.3 Iconografía y ARIA

La iconografía procede de `react-icons`. Los iconos decorativos se marcan con `aria-hidden="true"`; los iconos que actúan como acción sin texto visible deben incluir `aria-label`.

Los componentes interactivos comunican su estado mediante atributos nativos o ARIA:

* `disabled` para acciones no permitidas.
* `aria-busy` para listados en carga.
* `aria-live` para mensajes dinámicos.
* `role="dialog"` y `aria-modal="true"` para modales.

Con esta guía, la interfaz mantiene coherencia visual, accesibilidad y una base técnica escalable para futuras pantallas.
