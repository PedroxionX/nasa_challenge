# Quickstart: qué funciona hoy y cómo se validará

Contrato en [contracts/data-files.md](contracts/data-files.md); reglas en [data-model.md](data-model.md).

## A. Funciona hoy (comprobado el 2026-11-14)

**Globo** (rama `sync_main`):

```bash
cd web
npm ci
npm run dev        # http://localhost:5173
```

Resultado esperado: globo con 84 regiones; al elegir una se abre un panel con cuatro huecos **sin datos**. `npm run build` no se ejecutó en la revisión.

**Motor científico** (rama `practice/trendlens-lab`, sin cambiar de rama):

```bash
mkdir -p /tmp/lab && git archive practice/trendlens-lab practice-lab | tar -x -C /tmp/lab
cd /tmp/lab/practice-lab
uv run --no-project --python 3.12 --with-requirements requirements-dev.txt python -m pytest -q
uv run --no-project --python 3.12 --with-requirements requirements-dev.txt python scripts/reproduce_example.py fixture --code T2M
```

Resultado esperado: `120 passed, 9 skipped`; el ejemplo imprime Mexicali +0,46 °C por década (punto de cuadrícula, no estado).

**Acceso a la fuente** (sin cuenta):

```bash
curl -s "https://power.larc.nasa.gov/api/temporal/monthly/regional?latitude-min=28&latitude-max=33&longitude-min=-118&longitude-max=-112&parameters=T2M&community=AG&start=2020&end=2021&format=JSON" | head -c 600
```

Resultado esperado: `FeatureCollection` con 99 celdas, `"sources": ["MERRA2"]`, `"version": "v2.10.0"`.

## B. Previsto para el producto (aún no existe)

```bash
# 1. Datos
cd pipeline && python -m pytest -q          # motor + pesos + contrato
python build.py --variables T2M PRECTOTCORR # escribe web/public/data/trends/

# 2. Aplicación
cd ../web && npm run test && npm run build && npm run preview
```

Escenarios de validación:

| # | Escenario | Resultado esperado | Cubre |
|---|---|---|---|
| 1 | Abrir la aplicación, buscar «Baja California» | Gráfica anual, veredicto, cambio por década con intervalo, valor p, años | US1, SC-005 |
| 2 | Abrir «De dónde salen estos datos» | Fuente, producto, celdas promediadas, fecha, transformaciones | FR-010 |
| 3 | Fijar el periodo 2018–2025 | «Datos insuficientes», sin veredicto, botón para volver | US2 |
| 4 | Fijar 2000–2025 | Resultado recalculado y aviso de periodo elegido | US2, FR-019 |
| 5 | Cambiar a precipitación | Unidades en mm/año; definición indica que es acumulado a partir de una tasa | FR-001 |
| 6 | Recorrer 1 a 5 solo con teclado | Todo alcanzable, foco visible | SC-008 |
| 7 | Repetir 1 a 5 en un teléfono | Región visible fuera de la hoja; controles alcanzables | SC-008 |
| 8 | Desconectar la red y recargar la versión compilada | Todo sigue funcionando | FR-020 |
| 9 | Desactivar WebGL | Aviso y recorrido por buscador y tabla | FR-015 |
| 10 | Comparar una media anual regional con la referencia externa | Dentro de la tolerancia del plan | SC-007 |

Cifras de validación (se rellenan en T008 y T028): _pendiente_.
