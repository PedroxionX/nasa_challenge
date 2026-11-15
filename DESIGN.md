---
name: Trend Detective
description: Tendencias del clima por estado sobre un globo 3D, con veredictos estadísticos honestos.
colors:
  bg: "#16121f"
  panel: "#1f1a2e"
  panel-raised: "#2a2340"
  line: "#3a3150"
  text: "#e8edf4"
  text-muted: "#a9b4c2"
  accent: "#d9d2ff"
  on-accent: "#16121f"
  danger: "#ff8a80"
  trend-down-strong: "#3b2a7a"
  trend-down-weak: "#8e86d6"
  trend-neutral: "#e3ded6"
  trend-up-weak: "#f2b84b"
  trend-up-strong: "#b45309"
  no-data: "#8a93a0"
  selection: "#ffffff"
  verdict-up: "#f2b84b"
  verdict-down: "#8e86d6"
  verdict-insufficient: "#c4b08a"
  verdict-invalid: "#8a93a0"
typography:
  headline:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.25
  body:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "3rem"
components:
  button:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 12px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    size: "44px"
  link-button:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    height: "44px"
  verdict:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  notice:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "12px"
  dialog:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
---

# Trend Detective · sistema de diseño

Registrado con `/impeccable document` (modo scan) al terminar la pasada de unificación 008. La fuente de verdad de los valores es `web/src/styles/tokens.css`; las piezas compartidas viven en `web/src/styles/components.css` y `web/src/lib/ui/`. La paleta y la tipografía se decidieron en `docs/paleta.md`.

## Overview

**El observatorio.** El globo es el escenario y lo único con color intenso; todo lo demás es instrumento: superficies opacas y sobrias de violeta muy oscuro, una sola familia tipográfica y cifras tabulares. La interfaz no decora: ordena. Su gesto propio es que el veredicto (icono + palabra), la frase y la gráfica cuentan lo mismo con las mismas cifras, y el mapa se tiñe con esa misma magnitud.

Registro: **Operate** para controles y análisis (familiar, denso, sin sorpresa) y **Read** para las explicaciones (medida de 65 caracteres, interlineado 1,5–1,6). Tema oscuro por la escena de uso: un globo sobre el espacio.

## Colors

Paleta «Ocaso». Tres familias con papeles que no se mezclan:

- **Datos** (`trend-*`, `no-data`, `selection`): violeta = baja, ámbar = sube, crema = casi sin cambio. Solo colorean el mapa, su leyenda y los iconos de veredicto. «Sin datos» es una trama diagonal, nunca un color plano.
- **Veredictos** (`verdict-*`): tiñen únicamente el icono del veredicto. La palabra va siempre en `text`.
- **Interfaz** (`bg`, `panel`, `panel-raised`, `line`, `text`, `text-muted`, `accent`): el acento es un lila casi neutro, a propósito lejos del violeta y del ámbar de los datos. Se usa para foco, enlaces de acción y los puntos de las gráficas.

Contraste mínimo 4,5:1 en todo par de texto; lo mide `web/src/styles/tokens.test.ts`, que además falla si un CSS usa una variable que `tokens.css` no define.

## Typography

Inter autoalojada (subconjunto latino, 400/500/700). Escala fija en `rem`, sin tipografía fluida: `xs` 0,75 · `sm` 0,875 · `base` 1 · `lg` 1,125 · `xl` 1,5. Tres pesos y ninguno más: 400 texto, 500 énfasis y títulos de sección, 700 nombre del estado y palabra del veredicto. `font-variant-numeric: tabular-nums` en toda cifra. El texto de las gráficas usa `xs` y se traza al ancho real (nunca se escala con el `viewBox`).

Cifras: punto decimal, sin separador de miles, signo explícito en pendientes y menos tipográfico (U+2212). Un solo formateador: `web/src/lib/format.ts`.

## Layout

- **Escritorio (≥ 900 px)**: cabecera arriba; el globo ocupa todo el escenario; panel opaco a la derecha (`clamp(340px, 32vw, 440px)`); leyenda arriba a la izquierda; bienvenida en tarjeta abajo a la izquierda.
- **Móvil y tableta (< 900 px)**: cabecera en dos filas; leyenda en franja con tres botones de icono; el análisis es una hoja inferior con tres alturas (asomada: estado + veredicto · media · completa) y la bienvenida va acoplada abajo igual que la hoja. El globo recibe la zona tapada en `--panel-inset-*` y centra la región en lo que queda libre.
- Espaciado de `tokens.css` (`--space-1…7`). Dentro de un panel: 24 px entre secciones, 8–12 px dentro de cada una. Las secciones se separan con espacio y, como mucho, una línea; no con cajas.
- Nada desborda en horizontal: toda rejilla usa `minmax(0, 1fr)`.

## Elevation & Depth

Plano por capas tonales: `bg` → `panel` → `panel-raised`, con bordes de 1 px en `line`. Solo flota (y solo eso lleva sombra, `--shadow-pop`) lo que se abre sobre otra cosa: la lista del buscador, la definición de variable, el tooltip del globo y los diálogos. Sin vidrio, sin desenfoque y sin degradados decorativos.

## Shapes

Radios: 6 px (marcas, muestras), 10 px (controles, bloques), 14 px (diálogos, hoja, tarjeta de bienvenida). Bordes de 1 px. Iconos dibujados en SVG con un único trazo (`currentColor`, 1,8 px, extremos redondos) en `web/src/lib/ui/icons.tsx`; nunca emoji ni glifos Unicode.

## Components

Cada patrón existe una vez:

- **Cerrar**: `CloseButton` (icono ✕, 44 px, con el nombre de lo que cierra) en análisis, comparación, diálogos y avisos.
- **Elegir estado**: `RegionCombobox` (campo con lista filtrable agrupada por país) en la cabecera y en la comparación. Dentro del panel la lista se abre en el flujo.
- **Veredicto** (`.verdict`): icono dibujado + palabra + cifra + intervalo, p y α con su definición. El color acompaña; nunca informa solo. Con «Not enough evidence» la cifra se rotula «Estimate» y pierde peso.
- **Periodo** (`.period`): «From [año] to [año]», pegado a la gráfica que modifica.
- **Gráficas** (`.chart-*`): puntos lila = valor anual · línea fina = unión de años · recta clara gruesa = tendencia · banda = intervalo · zona oscura = fuera del periodo · trama = año excluido. Siempre con «View as table».
- **Aviso** (`.notice`), **lista de cifras** (`.facts`), **desplegable** (`.disclosure`), **tabla** (`.data-table`), **diálogo** (`.dialog` con barra de título y cierre), **definición de término** (`Term`).
- Estados: todo control tiene reposo, hover, foco visible (2 px en `accent`), activo y deshabilitado; la carga usa esqueletos con la forma del contenido; los errores dicen qué pasó y ofrecen «Retry».

## Do's and Don'ts

- **Sí**: un dato, un lugar. Objetivos táctiles de 44 px. `prefers-reduced-motion` respetado. Transiciones de 150–250 ms que comunican un cambio de estado.
- **Sí**: componer con las piezas de `components.css`; el CSS de cada zona solo las coloca.
- **No**: franjas laterales de color en tarjetas o avisos; tarjetas dentro de tarjetas; rótulos en mayúsculas sobre un título.
- **No**: usar un color de dato (violeta, ámbar) para algo de la interfaz, ni el acento para un dato.
- **No**: colores, tamaños o pesos escritos a mano fuera de `tokens.css`; un segundo formateador de cifras; un segundo botón de cerrar.
- **No**: tapar el globo más de lo necesario ni añadir animación continua.
