# Feature Specification: Comparación de dos regiones para cualquier variable del catálogo

**Feature Branch**: `007-region-comparison`

**Created**: 2026-11-14

**Status**: Draft

**Input**: Pedido de quien lleva 005: «comparación de los valores de distintas ubicaciones», y que la comparación «pueda comparar datos de cualquier tipo», también los que 003 aún no ha publicado (aerosoles, NDVI…). Amplía el MVP de [../001-trend-explorer-mvp/spec.md](../001-trend-explorer-mvp/spec.md). Reutiliza el motor del laboratorio (`pipeline/trendlens/stats/`). Formato de los archivos nuevos en [contracts/compare-files.md](contracts/compare-files.md).

## Propiedad de archivos

Esta especificación es transversal por decisión de quien la lleva (2026-11-14): una sola persona hace toda la comparación, también los puntos de contacto en rutas ajenas. Esos puntos son los de la tabla y ninguno más; cada uno se avisa a su responsable y se revisa en la petición de fusión.

| Solo esta especificación edita | Puntos de contacto en rutas ajenas (cambio mínimo, avisado) |
|---|---|
| `specs/007-region-comparison/**` · `web/src/features/compare/**` · `pipeline/compare_build.py` · `pipeline/tests/test_compare_build.py` · `web/public/data/trends/compare/**` | **002**: `web/src/lib/data.ts`, `web/src/app/state.ts`, `web/src/app/Shell.tsx`, `specs/001-trend-explorer-mvp/contracts/data-files.md` · **004**: `web/src/features/query/VariablePicker.tsx`, `web/src/features/analysis/AnalysisPanel.tsx` · **005**: `web/src/features/globe/**` · **006**: `web/src/content/index.ts`, `web/src/features/guide/MethodsSheet.tsx`, `web/src/features/guide/WelcomeCard.tsx` |

No toca el código de 003: `compare_build.py` lee los archivos ya publicados y usa el motor como biblioteca. `web/src/features/compare/` importa solo de `app/`, `lib/` y `content/`.

## Clarifications

### Session 2026-11-14

- Q: ¿Cuántas regiones se comparan a la vez? → A: Dos.
- Q: ¿Cómo se encaja en la metodología? → A: Especificación 007 nueva, llevada entera por una persona.
- Q: ¿Precalcular la prueba formal de la diferencia es complicado? ¿O se cambia la especificación? → A: No es complicado: el motor ya existe y está probado. El límite es el tamaño, no la dificultad. Medido el 2026-11-14 con los datos publicados (2,9 ms por ventana): todas las ventanas de los 3 486 pares serían 81 MB solo en temperatura; las ventanas que terminan en el último año completo son 4,2 MB y 6 min en temperatura, y del orden de 10 a 13 MB y 15 min para las cuatro variables de hoy. Se precalculan estas últimas. No se enmienda la constitución: el navegador sigue sin calcular estadística.
- Q: ¿Qué variables se pueden comparar? → A: Cualquiera que esté en `catalog.json`, hoy o mañana, sin cambiar código de 007. Nada de 007 nombra una variable, una unidad ni un producto.
- Decisión propuesta, pendiente de visto bueno: en variables con `relative_change: true` la diferencia se prueba sobre las series en % de su propia media, no en la unidad anual (FR-K04). Es el mismo criterio que ya usa el mapa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comparar dos regiones (Priority: P1)

Con una región abierta, la persona elige una segunda con un control HTML y lee, en este orden: si hay evidencia de que las tendencias difieren, el resultado de cada región lado a lado, las dos series y la explicación en palabras.

**Independent Test**: solo con teclado, con Baja California abierta se elige Texas y aparece la comparación; se repite con cada variable del catálogo sin que cambie nada más que las cifras, las unidades y los nombres.

**Acceptance Scenarios**:

1. **Given** dos regiones con datos y un periodo publicado, **When** se abre la comparación, **Then** aparecen la diferencia por década con su intervalo, valor p, α, años comunes, unidades, método y procedencia de ambas series.
2. **Given** una diferencia `inconclusive`, **When** se muestra, **Then** el texto dice que no hay evidencia suficiente de que difieran y que eso no demuestra que cambien igual.
3. **Given** pendientes de signo opuesto y diferencia `inconclusive`, **When** se muestra, **Then** el texto dice que el signo opuesto por sí solo no demuestra que las tendencias difieran.
4. **Given** una región sin datos, un par `not_comparable` o un error de carga, **When** se muestra, **Then** cada caso tiene su texto y el error se reintenta sin recargar.
5. **Given** un periodo que no termina en el año publicado, **When** se abre la comparación, **Then** se ven los dos resultados individuales, un aviso de que la prueba de la diferencia no se publica para ese periodo y un botón que lleva al periodo publicado más cercano.

### User Story 2 - Variables nuevas sin tocar el código (Priority: P1)

Cuando 003 publica una variable nueva, aparece en el selector y se puede comparar. Cubre también la conciliación con el PR #13 de 003 (humedad del suelo y evapotranspiración), que hoy publica datos que la interfaz no enseña.

**Independent Test**: con un catálogo de prueba que añade una variable inventada y marcada como sintética, el selector la ofrece, el panel la muestra y la comparación funciona, sin editar ningún archivo de `web/src/` ni de `pipeline/`.

**Acceptance Scenarios**:

1. **Given** una variable en el catálogo sin textos propios de 006, **When** se elige, **Then** se usan `label` y `definition` del catálogo.
2. **Given** una variable sin archivos en `compare/`, **When** se comparan dos regiones, **Then** se ven los resultados individuales y un aviso de que la prueba de la diferencia aún no se publica para esa variable; nunca un error.

### User Story 3 - Las dos regiones en el globo (Priority: P2)

El globo y la tabla de regiones marcan las dos regiones y permiten elegir la segunda.

**Independent Test**: las dos regiones se distinguen entre sí y del resto sin depender del color (rótulos «A» y «B» con el nombre); con WebGL desactivado la tabla ofrece lo mismo.

## Requirements *(mandatory)*

### Comparación

- **FR-K01**: La segunda región se elige con un control HTML estándar (lista de regiones agrupada por país) operable con teclado y tacto. Queda en la URL como `vs=`; un valor inexistente o igual a `region` se descarta con aviso. Quitar la región principal quita también la comparación. Escape sale de la comparación antes que del panel.
- **FR-K02**: La prueba de la diferencia se lee de `compare/{variable}/{región}.json`; el navegador no calcula ninguna cifra. El par se guarda una sola vez, en el archivo de la región cuyo id va antes en orden alfabético, y la diferencia se presenta en ese orden nombrando las dos regiones («Baja California − Texas»).
- **FR-K03**: Método, en el pipeline y con el motor existente (`trend_core`): sobre la serie de diferencias de los años completos comunes, pendiente de Theil-Sen por década, intervalo de Sen y Mann-Kendall corregido por autocorrelación, con el α del catálogo. Estado: `differ` (p < α), `inconclusive`, `insufficient` (menos de `min_window_years` años comunes) o `invalid` (diferencia constante o cifras no finitas). Un par es `not_comparable` si las dos series no comparten unidad, producto y versión, o mezclan datos sintéticos y reales, o son idénticas.
- **FR-K04**: La base de la diferencia sale de `relative_change` y de nada más: `false` → diferencia en `unit_annual` por década; `true` → cada serie se expresa en % de su media en los años comunes de la ventana y la diferencia va en puntos porcentuales por década; si una media es ≤ 0 el estado es `invalid`. La base y la unidad se escriben en el archivo y la interfaz las muestra.
- **FR-K05**: Se publican las ventanas que terminan en el último año completo de la variable, con cada año inicial que deja al menos `min_window_years` años. En modo comparación el periodo se elige con un `<select>` «Desde» que solo ofrece esos años.
- **FR-K06**: Los resultados individuales de cada región se leen de su serie con `pickWindow`, como en el panel de 004. El patrón descriptivo (mismo signo u opuesto; con evidencia en ambas o no) se deduce de los dos `status`, sin cifras nuevas.
- **FR-K07**: Las dos series se dibujan en dos gráficas apiladas con el eje de años compartido y cada una con su escala, de modo que sirva para cualquier unidad y nivel; recta de Sen solo con `line_mid`; alternativa «Ver como tabla». El navegador no centra, normaliza ni promedia series.
- **FR-K08**: Textos (función `explainComparison` en `content/`, con pruebas): `inconclusive` nunca se redacta como «cambian igual» ni «no hay diferencia»; ninguna frase ordena las regiones como mejor o peor, ni atribuye causa, ni pronostica; con signos opuestos sin `differ` se dice que el signo no basta. Incluye el aviso de que, con tantos pares posibles, algunos diferirán por azar. Se heredan los avisos de región pequeña y de datos sintéticos si aplican a cualquiera de las dos.
- **FR-K09**: Cifras con el formato de 004 (FR-A08): punto decimal, signo explícito, menos tipográfico, «p < 0.001».
- **FR-K10**: Carga con esqueleto, error con reintento, región sin datos, par no comparable y periodo sin prueba publicada son estados con texto propio. Si falta `compare/index.json` o la variable no figura en él, la comparación sigue funcionando sin la prueba de la diferencia.

### Cualquier variable

- **FR-K11**: Ningún archivo propio de 007 (`features/compare/**`, `compare_build.py`) contiene un id de variable, una unidad ni un nombre de producto. Etiqueta, definición, unidad, periodo y `relative_change` salen del catálogo; producto y versión, de la procedencia de cada serie. Una prueba recorre esos archivos y falla si aparece un id del catálogo.
- **FR-K12**: `compare_build.py` recorre las variables de `catalog.json`, sin lista propia. Acepta `--variables` para recalcular solo algunas y deja intactas las demás. Escribe todo o nada por variable y valida cada archivo contra su contrato antes de escribir.
- **FR-K13**: `compare/index.json` guarda, por variable, el año final, los años iniciales, la base, la unidad, el número de pares y una huella de las series de las que salió. `compare_build.py --check` falla si la huella no coincide con las series publicadas, para que una republicación de 003 no deje cifras desfasadas.
- **FR-K14**: (Conciliación con 003) Las variables válidas de la interfaz son las del catálogo: selector, estado en la URL, periodos, panel, globo y hoja de métodos dejan de depender de la lista fija `VARIABLE_IDS`. Antes de cargar el catálogo, `var=` se acepta por formato y se vuelve a validar al cargarlo. Los textos de 006 para una variable son opcionales; sin ellos se usan los del catálogo. Con más de tres variables el selector sigue siendo utilizable a 360 px.

### Globo

- **FR-K15**: La región principal y la de comparación se distinguen por rótulo («A · nombre», «B · nombre») además del contorno; la tabla de regiones marca ambas con texto. El mapa de colores no cambia.

## Success Criteria *(mandatory)*

- **SC-K01**: Añadir una variable al catálogo y ejecutar `compare_build.py` basta para compararla: cero cambios de código, comprobado con la variable inventada de la prueba.
- **SC-K02**: El 100 % de las comparaciones mostradas incluye método, periodo, años comunes, unidades, base de la diferencia, α y procedencia de las dos series.
- **SC-K03**: Para una muestra de pares, la fila de diferencia coincide con un cálculo independiente (`pymannkendall`, `scipy`) dentro de las tolerancias de las pruebas del motor; en variables sin `relative_change`, la pendiente por mínimos cuadrados de la diferencia es igual a la resta de las dos pendientes.
- **SC-K04**: Tiempo de cómputo y tamaño de `compare/` medidos y anotados en `tasks.md`. Objetivo, no cifra afirmada: 15 MB y 20 min o menos con las cuatro variables de hoy, y ningún archivo de más de 250 kB.
- **SC-K05**: US1 y US2 se completan solo con teclado y en 390×844, sin red una vez cargado el sitio.

## Fuera de alcance

- Comparar variables distintas entre sí (temperatura de una región contra precipitación de otra) y más de dos regiones.
- La prueba de la diferencia para periodos que no terminan en el último año completo.
- Exportar la comparación.

## Assumptions

- Las dos series de un par son de la misma variable y del mismo producto, así que comparten malla y periodo; los años comunes solo difieren si una región tiene años excluidos.
- El PR #13 de 003 se fusiona en `sync_main` tal como está; esta rama ya lo contiene.
- Si quien lleva 002 entrega antes en `sync_main` la lectura de variables desde el catálogo (FR-K14), aquí se adopta la suya y la fase correspondiente se reduce a adaptarse.
