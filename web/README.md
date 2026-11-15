# Trend Detective · aplicación web

Interfaz del reto *Earth System Trend Detective* (NASA Space Apps 2026): tendencias de 14 variables del clima por estado de México y de Estados Unidos, sobre un globo 3D. Responde tres preguntas: ¿sube, baja o no se puede decir?, ¿cuánto por década? y ¿qué tan fuerte es la evidencia?

Producción: https://nasachallenge-nine.vercel.app · La interfaz está en inglés; la documentación, en español.

## Correr

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run lint     # oxlint
npm run build    # tsc + versión de producción en dist/
```

## Qué hace

- **Elegir**: un estado (tocándolo en el globo, con el buscador o en la tabla), una variable y un periodo.
- **Leer el resultado**: veredicto con icono y palabra, cambio por década, intervalo, valor p, una frase en lenguaje llano, la serie anual con su recta de tendencia y la tabla de valores.
- **Reproducir la serie anual** del estado seleccionado en 9 segundos: Play/Pause, Replay, reinicio y barra para explorar un año con su valor y unidad. Funciona con todas las variables y el periodo elegido; los años sin datos mantienen su hueco. Cambiar la consulta detiene y reinicia la reproducción. La recta y el intervalo siguen describiendo el periodo completo.
- Durante la reproducción, **solo el estado seleccionado tiene relleno**: cambia con su valor anual, usando una escala fija del mínimo al máximo del periodo. La leyenda muestra año, valor y unidad; los años sin dato se identifican en gris. Pausar conserva el fotograma y «Show trend map» restaura el mapa de cambios por década. Este estado temporal no modifica el enlace.
- En móvil, Play reduce la hoja al resumen para dejar visible el globo. La leyenda permite pausar, continuar o salir sin volver a abrir el análisis.
- **Comparar** dos estados: prueba de la diferencia entre sus tendencias.
- **Comprobar**: método, supuestos y procedencia de cada serie (producto, versión, DOI, fecha de consulta), y la hoja «Methods and sources».
- Todo el estado está en la URL (`var`, `from`, `to`, `region`, `vs`): un enlace reproduce la vista. Ejemplo: `?var=precipitation&from=2005&to=2024&region=MX-SON&vs=MX-CHH`.
- Sin WebGL sigue funcionando con el buscador y la tabla.

El navegador **no calcula estadística**: lee los archivos de `public/data/trends/` que genera `pipeline/` y solo elige filas y da formato.

## Cómo está organizado

```
src/
  app/        Armazón (Shell), estado en la URL (state.ts), límites de error
  content/    Todos los textos y las explicaciones (reglas científicas en index.ts)
  features/
    query/    Buscador de estado y selector de variable (cabecera)
    globe/    Globo (react-globe.gl + three.js), leyenda, tabla de estados y vista sin WebGL
    analysis/ Panel de análisis: veredicto, gráfica, periodo, método y procedencia
    compare/  Comparación de dos estados
    guide/    Bienvenida y hoja de métodos
  lib/
    data.ts   Carga y validación de los archivos de datos (contrato en specs/001…/contracts/)
    format.ts El único formateador de cifras (punto decimal, menos tipográfico)
    ui/       Piezas compartidas: CloseButton, RegionCombobox, Term, iconos, useWidth
  styles/     tokens.css (variables de diseño), base.css, components.css (piezas compartidas)
```

Reglas del código:

- Las carpetas de `features/` no se importan entre sí. Lo compartido va en `lib/`, `content/` o `styles/`.
- Colores, tamaños, pesos y espaciado salen de `styles/tokens.css` (paleta «Ocaso», `docs/paleta.md`). `tokens.test.ts` mide el contraste (mínimo 4,5:1) y falla si un CSS usa una variable sin definir.
- El globo lee `--color-trend-*`, `--color-no-data` y `--color-selection` con `getComputedStyle` (`features/globe/mapColors.ts`): si se renombra un token, se renombra en los dos sitios.
- Los textos científicos no afirman más que el archivo: nunca «no hay cambio» para evidencia insuficiente, nunca causa ni pronóstico (`content/index.ts`).
- `lib/assets.ts`: `asset('ruta')` da la URL de un archivo de `public/` aunque el sitio se publique bajo una subruta. No usar rutas absolutas como `/data/...`.
- Sistema de diseño: [`DESIGN.md`](../DESIGN.md). Contexto de producto: [`PRODUCT.md`](../PRODUCT.md).

## Archivos públicos

- `public/data/trends/`: catálogo, series, mapas y comparaciones (los genera `pipeline/`; no se editan a mano).
- `public/data/*.geojson`: estados de México y EE. UU. con `{id, name}` (`id` en ISO 3166-2) y países de Natural Earth 110m. Ojo: se quitaron anillos degenerados (área cero) en Virginia, Maryland y Corea del Norte; con ellos el globo pinta el polígono sobre toda la esfera.
- `public/textures/`: texturas locales, para que la demo funcione sin internet.
- `public/favicon.svg`, `apple-touch-icon.png`, `og.jpg`: icono e imagen para compartir el enlace.

Los nombres de los estados de EE. UU., las unidades y las clases del mapa vienen de los archivos en español y se renombran al mostrarlos (`content/names.ts`, `localizeUnit`, `localizeClassLabel`), sin tocar los datos.
