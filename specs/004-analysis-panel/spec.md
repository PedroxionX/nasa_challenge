# Feature Specification: Búsqueda, variable, periodo y panel de análisis

**Feature Branch**: `004-analysis-panel`

**Created**: 2026-11-14

**Status**: Draft

**Input**: Parte del MVP definido en [../001-trend-explorer-mvp/spec.md](../001-trend-explorer-mvp/spec.md): historias US1 y US2. Diseño en [../001-trend-explorer-mvp/ux.md](../001-trend-explorer-mvp/ux.md) §5 a §7.

## Propiedad de archivos

| Solo esta especificación edita | Nunca edita |
|---|---|
| `web/src/features/analysis/**` · `web/src/features/query/**` (componentes, estilos y pruebas dentro de esas carpetas) | `web/src/App.tsx`, `web/src/app/**`, `web/src/lib/**`, `web/src/styles/**`, `web/src/features/globe/**`, `web/src/features/guide/**`, `web/src/content/**`, `web/package.json` |

Consume: `useAppState`, `loadCatalog`, `loadSeries`, `pickWindow` (de 002) y `explainTrend`, `VARIABLE_COPY`, `UI_COPY` (de 006; hasta que lleguen, el esbozo devuelve texto de relleno). Importa solo desde `app/`, `lib/` y `content/`.

Si hay una persona más, `web/src/features/query/**` puede separarse como especificación propia sin conflicto.

## Clarifications

### Session 2026-11-14

- Q: ¿Cómo debe calificar el panel la fuerza de la evidencia a partir del valor p? → A: Sin niveles («fuerte», «moderada»…): el panel dice «Hay evidencia de tendencia» o «Sin evidencia suficiente» según `status`, junto al valor p redondeado y α.
- Q: ¿Qué tipo de control debe usar la persona para elegir el año inicial y el año final? → A: Dos listas desplegables nativas («Desde» y «Hasta») que solo ofrecen años válidos, más el botón «Usar todo el periodo»; sin slider.
- Q: ¿Qué debe mostrar la vista de cómo varía la pendiente según el año inicial? → A: Mini gráfica desplegable de pendiente por década con su intervalo contra cada año inicial posible, con el año final fijo en el elegido; marca el año inicial actual y ofrece «Ver como tabla».
- Q: ¿Qué separador decimal deben usar todas las cifras del panel? → A: Punto decimal con formato `es-MX` («+0.46 °C por década», «p = 0.002»), signo explícito en las pendientes y menos tipográfico (−).
- Q: Para la precipitación, ¿el panel muestra el cambio solo en mm/año por década o también en porcentaje? → A: Ambos (mm/año y % por década). El % depende de columnas nuevas del pipeline, pedidas a 002 (contrato) y 003; mientras no lleguen, solo se muestra mm/año.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir región y variable sin el globo (Priority: P1)

Buscador por nombre agrupado por país y selector de dos variables con su definición.

**Independent Test**: con teclado solamente se elige «Sonora» y se cambia a precipitación.

### User Story 2 - Leer el resultado (Priority: P1)

Gráfica anual con recta, banda e hitos; veredicto, cambio por década, intervalo, valor p y años; explicación; detalles técnicos y procedencia desplegables.

**Independent Test**: con el archivo de ejemplo, cada uno de los cinco estados se muestra con su texto y sin cifras inventadas.

**Acceptance Scenarios**:

1. **Given** una región con datos, **When** se abre, **Then** aparecen método, periodo, n, unidades, α y procedencia.
2. **Given** `pickWindow` devuelve `null`, **When** se muestra el panel, **Then** dice «datos insuficientes» y ofrece volver al periodo completo.
3. **Given** un error de carga, **When** se reintenta, **Then** se recupera sin recargar la página.
4. **Given** una región con `n_cells: 0` en el catálogo, **When** se elige, **Then** el panel dice «sin datos» sin pedir su archivo y sin presentarlo como error.
5. **Given** un archivo con `provenance.is_synthetic: true`, **When** se muestra el resultado, **Then** un aviso visible encima del resultado indica que son datos de ejemplo sintéticos.

### User Story 3 - Cambiar el periodo (Priority: P1)

Dos listas desplegables nativas, «Desde» y «Hasta», y el botón «Usar todo el periodo»; aviso cuando el periodo no es el completo y vista de cómo varía la pendiente con el año inicial.

**Independent Test**: nunca se produce un periodo invertido; las cifras de la vista salen de la tabla de ventanas.

## Requirements *(mandatory)*

Cubre de 001: FR-001, FR-002 (búsqueda), FR-004, FR-005, FR-006 a FR-010 (presentación), FR-012, FR-014, FR-015 (carga, error, sin datos, insuficientes), FR-016, FR-019 (aviso de periodo).

- **FR-A01**: No existe ningún elemento «años para ser significativo».
- **FR-A02**: El panel se cierra con Escape (cerrar = deseleccionar la región) y devuelve el foco al buscador; los cambios de resultado se anuncian a lectores de pantalla.
- **FR-A03**: Gráfica con alternativa en tabla y legible a 360 px de ancho.
- **FR-A04**: Objetivos táctiles de al menos 44 px en todo lo que posee.
- **FR-A05**: La evidencia se muestra solo en dos formas, derivadas de `status`: «Hay evidencia de tendencia» (`increasing`/`decreasing`) o «Sin evidencia suficiente» (`inconclusive`), siempre con el valor p del archivo y α (p. ej. «p = 0.002; α = 0.05»). El panel NO usa calificativos de fuerza («fuerte», «clara», «moderada») ni umbrales de p distintos de α; si `p` es `null`, se muestra «p no evaluable». Con `insufficient` o `invalid` el panel muestra el veredicto, su explicación y las banderas, pero ninguna cifra de tendencia (pendiente, intervalo ni p).
- **FR-A06**: El periodo se elige con dos `<select>` nativos etiquetados «Desde» y «Hasta» (sin slider). «Desde» ofrece solo años de `first_year` a `Hasta − (min_window_years − 1)`; «Hasta» solo de `Desde + (min_window_years − 1)` a `last_complete_year`, con los límites del periodo propio de la variable activa (`variablePeriod`, contrato revisado 2026-11-14). Así un periodo invertido o más corto que el mínimo no se puede elegir desde el control. «Usar todo el periodo» restablece los límites del catálogo y solo está activo cuando el periodo no es el completo.
- **FR-A07**: Cuando el periodo no es el completo, el aviso de periodo ofrece un desplegable «Ver cómo cambia según el año inicial» con una mini gráfica: eje X = cada año inicial con fila en `windows` para el año final elegido; eje Y = `slope_decade` con su banda `ci_low`–`ci_high`; el año inicial actual queda marcado y los años sin fila no se dibujan. Tiene la misma alternativa «Ver como tabla» que la gráfica principal (año inicial, pendiente, intervalo, veredicto). Todas las cifras salen de las filas de `windows`; el navegador no calcula ninguna.
- **FR-A08**: Toda cifra que muestra 004 (panel, gráficas, tablas, ejes) se formatea con un único formateador `Intl.NumberFormat('es-MX')` dentro de `features/analysis/`: punto decimal, pendientes e intervalos con signo explícito («+0.46», «−0.12», con el menos tipográfico U+2212), años sin separador de miles («1981»). Los valores p menores que 0.001 se muestran como «p < 0.001». Formatear no cambia el valor: redondear para mostrar es la única transformación permitida.
- **FR-A09**: En variables con `relative_change: true` (precipitación), el panel muestra el cambio en `unit_annual` por década y, al lado, en % por década con su intervalo, leídos de las columnas `slope_decade_pct`, `ci_low_pct` y `ci_high_pct` de `windows`. El navegador NUNCA calcula el porcentaje (ni dividiendo entre la media). Si esas columnas no existen en el archivo o son `null`, se muestra solo `unit_annual` por década, sin hueco ni aviso de error. **Contrato**: columnas opcionales aceptadas por 002 el 2026-11-14 (`OPTIONAL_WINDOW_COLUMNS` y `TrendRow` en `lib/data.ts`); 003 las publica.
- **FR-A10**: La recta de Sen y su banda se dibujan a partir de la columna `line_mid` de `windows`: valor de la recta de Sen en el año central `(start + end) / 2`, en `unit_annual`. El navegador solo traza: recta = `line_mid + slope_decade / 10 · (año − centro)`; banda = las rectas con `ci_low` y `ci_high` por el mismo punto. NUNCA estima la ordenada (ni medianas ni promedios de los datos). Sin `line_mid`, la gráfica muestra los puntos sin recta ni banda y la leyenda lo dice. **Contrato**: `line_mid` aceptada por 002 el 2026-11-14; se lee de `TrendRow` (vía `pickWindow`).

## Success Criteria *(mandatory)*

- **SC-A01**: El 100 % de los resultados mostrados incluye método, periodo, n, unidades, α y procedencia (SC-005 de 001).
- **SC-A02**: US1 a US3 se completan solo con teclado y en 390×844.

## Assumptions

- La posición y el tamaño del panel los decide el armazón (002); aquí solo se diseña su interior.
