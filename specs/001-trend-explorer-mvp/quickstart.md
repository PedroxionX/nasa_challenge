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

**Acceso a la alternativa NASA POWER** (sin cuenta). La fuente principal es GES DISC con earthaccess, que exige Earthdata Login en la máquina del pipeline ([research.md](research.md) D2 y D5):

```bash
curl -s "https://power.larc.nasa.gov/api/temporal/monthly/regional?latitude-min=28&latitude-max=33&longitude-min=-118&longitude-max=-112&parameters=T2M&community=AG&start=2020&end=2021&format=JSON" | head -c 600
```

Resultado esperado: `FeatureCollection` con 99 celdas, `"sources": ["MERRA2"]`, `"version": "v2.10.0"`.

## B. Previsto para el producto (aún no existe)

```bash
# 1. Datos
cd pipeline && python -m pytest -q          # motor + pesos + contrato
python build.py --variables air_temperature precipitation  # earthaccess; credenciales solo en ~/.netrc

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
| 5 | Cambiar a precipitación | Periodo 2001–2025; unidades en mm/año y % por década; definición indica que es una observación de satélite (IMERG) acumulada a partir de una tasa | FR-001 |
| 6 | Recorrer 1 a 5 solo con teclado | Todo alcanzable, foco visible | SC-008 |
| 7 | Repetir 1 a 5 en un teléfono | Región visible fuera de la hoja; controles alcanzables | SC-008 |
| 8 | Desconectar la red y recargar la versión compilada | Todo sigue funcionando | FR-020 |
| 9 | Desactivar WebGL | Aviso y recorrido por buscador y tabla | FR-015 |
| 10 | Comparar una media anual regional con la referencia externa | Dentro de la tolerancia del plan | SC-007 |

## C. Validación externa con Giovanni (T008 de 003, 2026-11-14)

Texas (`US-TX`), temperatura del aire a 2 m de MERRA-2 (`M2TMNXSLV_5_12_4_T2M`), 1981–2025. Giovanni: «Time Series, Area-Averaged» con la forma `tl_2014_us_state/shp_25`. Nuestro valor: pipeline con NASA POWER (mismo MERRA-2) y nuestra regla espacial. Evidencia y URL para reproducir: `pipeline/validation/t008_giovanni_us-tx.json` en `origin/003-data-pipeline`.

| Comprobación | Resultado |
|---|---|
| Medias anuales: diferencia media (nuestra − Giovanni) | −0,098 °C |
| Medias anuales: diferencia máxima | 0,123 °C (27 de 45 años dentro de 0,1 °C) |
| Pendiente Theil-Sen | 0,389 °C/década en ambos |
| Misma fuente (una sola celda, POWER frente a Giovanni) | diferencia media 0,000 °C, máx. 0,016 °C |
| Con la regla de Giovanni («centro dentro», cos(lat)) | diferencia media 0,010 °C, máx. 0,051 °C |

**Lectura**: los datos son los mismos; el desfase de ~0,1 °C viene de la regla espacial. Giovanni promedia solo las celdas cuyo centro cae dentro de la forma; nosotros ponderamos por fracción cubierta ([research.md](research.md) D4), que mantenemos. La tendencia no cambia. Con la tolerancia de 0,1 °C del plan, el contraste queda como **pendiente documentado** con la causa identificada. Se repite para US-TX y US-CA con las fuentes nuevas (MERRA-2 e IMERG por earthaccess), reportando ambas reglas (pedido a 003).

Cifras de la prueba con usuarios (T028): _pendiente_.
