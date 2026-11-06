# Método científico de TrendLens Lab

> Material de entrenamiento. Cada decisión de abajo tiene una prueba automatizada asociada (en `tests/`).

## 1. Pregunta y unidad de análisis

Pregunta: *¿cambió la variable X en el lugar Y durante el período P y, en tal caso, cuánto y con qué certeza?*

- **Unidad de análisis:** la serie **anual** de años **completos** (12 meses válidos). Promediar o sumar el
  año completo elimina el ciclo estacional sin suponer ningún modelo estacional.
- **Tiempo:** se usan los **años reales** como abscisa (no índices 1..n). Si falta un año intermedio, las
  pendientes siguen en unidades físicas por año. `pymannkendall` calcula la pendiente por índice, lo cual
  la sesga cuando hay huecos (`tests/test_mann_kendall.py::test_pymannkendall_slope_ignores_gaps_but_ours_does_not`).

## 2. Procesamiento previo (`trendlens/processing.py`)

| Paso | Regla | Prueba |
|---|---|---|
| Orden | Se ordena por fecha de forma estable | `test_unsorted_input_is_sorted` |
| Duplicados | Idénticos ⇒ se eliminan y se registra. Con valores distintos ⇒ **error** (requiere decisión humana) | `test_identical_duplicates_dropped_conflicting_raise` |
| Relleno | −999, −9999, −99 ⇒ faltante (`quality_flag = fill_value`) | `test_fill_values_become_missing_and_years_excluded` |
| Calendario | Se completa el calendario mensual: los meses ausentes pasan a ser faltantes explícitos | `test_missing_calendar_months_are_made_explicit` |
| Unidades | La unidad debe coincidir con la esperada. Si no, **error**: no se convierte a ciegas | `test_unit_mismatch_is_rejected` |
| Rango físico | T2M ∈ [−90, 60] °C; precipitación ∈ [0, 200] mm/día; fuera de rango ⇒ inválido | `test_out_of_range_values_flagged` |
| Precipitación | `PRECTOTCORR` llega como **tasa** (mm/día) ⇒ × días reales del mes (28/29/30/31) = mm/mes; Σ 12 meses = mm/año | `test_precip_rate_to_totals_uses_real_days_including_leap_years` |
| Temperatura | Promedio anual **ponderado por días**: Σ(T·días)/Σ días | `test_temperature_annual_mean_is_day_weighted` |
| Años incompletos | Se **excluyen**; no se rellenan ni se interpolan. Se listan en las advertencias | `test_missing_data_handled_explicitly` |

**Verificación contra la fuente:** el valor anual que publica NASA POWER (el "mes 13") coincide con nuestro
promedio ponderado por días con diferencia ≤ 0.005 en los 45 años de Mexicali, en T2M y en PRECTOTCORR.
Esa diferencia es el redondeo a 2 decimales de la API (`test_our_annual_aggregation_matches_power_annual_values`).

## 3. Estimación de la magnitud

### Theil-Sen (estimador principal de la pendiente)
- β̂ = mediana de (yⱼ − yᵢ)/(tⱼ − tᵢ) para todos los pares i < j.
- IC (Sen, 1968): con N pendientes ordenadas y C = z₁₋α/₂·√Var(S), los límites son las pendientes de rango
  (N − C)/2 y (N + C)/2. Se usa el **mismo redondeo que `scipy.stats.theilslopes`**, y en series sin
  autocorrelación el resultado es idéntico (`test_sen_slope_and_ci_match_scipy`).
- **Coherencia con la autocorrelación:** el IC se calcula con la **Var\*(S) corregida** de la prueba principal.
  También se reporta el IC que supone independencia.
- Se informa por **década** (×10) y como **cambio neto** = β̂ × (último año − primer año).
- Para precipitación también se da la tendencia **relativa** (% por década respecto a la media). En °C no:
  un porcentaje de una escala de intervalo no tiene sentido físico.

### Mínimos cuadrados ordinarios (referencia)
- `scipy.stats.linregress`. IC con t de Student (n − 2 gl) (`test_ols_matches_closed_form_and_t_interval`).
- **Ajuste de Santer et al. (2000):** r₁ = autocorrelación lag 1 de los residuos;
  n_eff = n(1 − r₁)/(1 + r₁) (solo si r₁ > 0); SE_adj = SE·√((n − 2)/(n_eff − 2)); gl = n_eff − 2.
- Supuestos: linealidad, residuos independientes, homocedásticos y aproximadamente normales.
- Si la serie es constante, la pendiente es 0 y el valor p queda **indefinido** (no se inventa)
  (`test_ols_constant_series_does_not_crash`).

## 4. Evidencia: prueba principal

### Mann-Kendall (Mann 1945; Kendall 1975)
S = Σᵢ<ⱼ sgn(xⱼ − xᵢ); Var(S) = [n(n−1)(2n+5) − Σ tₚ(tₚ−1)(2tₚ+5)]/18 (empates);
Z con corrección por continuidad; p = 2(1 − Φ(|Z|)). Verificado a mano (`test_mk_hand_computed_*`) y contra
`pymannkendall.original_test`, con y sin empates (`test_original_mk_matches_pymannkendall`).

### Corrección AR(1) por tamaño efectivo de muestra (prueba PRINCIPAL)
1. Se elimina la tendencia con la pendiente de Sen sobre el tiempo real.
2. r₁ = autocorrelación lag 1 de la serie sin tendencia.
3. Si r₁ > 0: Var\*(S) = Var(S)·(1 + r₁)/(1 − r₁). Si r₁ ≤ 0 no se corrige (criterio conservador).

Es la misma lógica de Santer para MCO y el caso AR(1) del enfoque de tamaño efectivo de Yue y Wang (2004).

### ¿Por qué esta corrección y no Hamed-Rao? Experimento Monte Carlo reproducible
`trendlens/stats/experiments.py`, semilla 20261114, 500 series **sin tendencia** con ruido AR(1) por celda.
Porcentaje de veces que cada prueba declara una tendencia con α = 5 % (lo ideal es ≈ 5 %):

| Prueba | n=30, φ=0 | n=30, φ=0.5 | n=30, φ=0.75 | n=45, φ=0 | n=45, φ=0.5 | n=45, φ=0.75 |
|---|---|---|---|---|---|---|
| MCO (supone independencia) | 4.4 | 28.2 | 45.4 | 4.8 | 25.2 | 45.8 |
| MCO ajustado (Santer) | 3.6 | 9.8 | 10.8 | 3.4 | 6.6 | 10.0 |
| Mann-Kendall original | 4.2 | 25.0 | 41.8 | 3.6 | 24.2 | 41.6 |
| Mann-Kendall Hamed-Rao (3 lags) | 7.4 | 18.4 | 23.4 | 5.2 | 12.6 | 18.6 |
| **MK corrección AR(1) (principal)** | 3.8 | 9.8 | 11.0 | 2.6 | 7.0 | 9.0 |

Precio a pagar: menor **potencia**. Con n = 45, φ = 0.5 y una tendencia real de 0.05 σ/año, detecta el 69 %
de los casos, frente al 82 % de Hamed-Rao y el 91 % del MK original. Preferimos equivocarnos menos al
afirmar una tendencia. **Ninguna** prueba queda bien calibrada con persistencia fuerte en series cortas
(≈ 9–11 % en lugar de 5 %). Por eso el laboratorio advierte de la autocorrelación cuando es significativa.
Reproducir: `python scripts/reproduce_example.py experiment --phi 0.75 --sims 500`.

### Veredicto
| Condición | Veredicto |
|---|---|
| n < 10 años completos | **Datos insuficientes** (no se emite veredicto) |
| p (principal) < α y Z > 0 | **Creciente** |
| p (principal) < α y Z < 0 | **Decreciente** |
| p ≥ α | **No concluyente**. Nunca "no hay tendencia" |

Escala verbal de la evidencia (descriptiva): p < 0.01 fuerte; p < α moderada; p < 0.10 débil o sugerente; si no, insuficiente.
**Significancia ≠ magnitud:** la interfaz muestra ambas por separado.

## 5. Diagnósticos (no cambian el veredicto, lo matizan)

- **Hamed-Rao (1998)**, con los lags 1–3 de los rangos: validado contra `pymannkendall.hamed_rao_modification_test(lag=3)`.
- **Seasonal Mann-Kendall (Hirsch, Slack y Smith 1982)** sobre la serie mensual: compara cada mes solo consigo
  mismo. La pendiente es la Sen estacional (mediana de las pendientes dentro de cada mes). Validado contra
  `pymannkendall.seasonal_test`. Supone independencia **entre** meses (Hirsch y Slack 1984 proponen una
  corrección, no implementada). Por eso es diagnóstico y no prueba principal.
- **Escalón vs. recta (BIC):** se compara una recta (k = 3) con el mejor escalón de dos medias (k = 4; segmentos ≥ 5 años).
  Si ΔBIC > 6 ("fuerte", Kass y Raftery 1995), se advierte que un salto describe mejor los datos.
  *La prueba de Pettitt se descartó para este fin:* en nuestras pruebas era significativa también con tendencias
  graduales, así que su advertencia engañaba (`test_step_check_distinguishes_step_from_ramp`).
- **Sensibilidad al año inicial:** pendiente e IC para todos los inicios con ventana ≥ 15 años. Hace visible el cherry-picking.
- **Detectabilidad (Weatherhead et al. 1998), adaptada a datos anuales:**
  n\* = [3.3·√12·σ/|β| · √((1+φ)/(1−φ))]^(2/3), con σ = DE de los residuos, β = pendiente/año y
  φ ∈ [0, 0.95]. Son los años necesarios para detectar β con ≈ 90 % de probabilidad (α = 0.05).
  Sirve para explicar que **"no significativo" no significa "no existe"**.

## 6. Comparación de dos ubicaciones (Opposite Trends Explorer)

1. **Comparabilidad** (si falla, no se compara): misma variable, mismas unidades, mismo tipo (sintético/real),
   misma fuente, **celdas MERRA-2 distintas** (si ambos puntos caen en la misma celda, los datos serían idénticos)
   y ≥ 10 años completos **comunes**.
2. Se reanalizan ambas series **solo en los años comunes**.
3. **Prueba formal sobre la serie de diferencias Dₜ = Aₜ − Bₜ:**
   - En MCO, la pendiente de D es **exactamente** β_A − β_B (`test_difference_ols_slope_is_exact_difference`),
     y su error estándar ya incorpora la correlación entre sitios. Esa correlación suele ser positiva si
     los sitios están cerca, y hace que una prueba z "independiente" sea incorrecta.
   - MK con corrección AR(1) y Sen sobre D: ¿divergen (o convergen) las series de forma monótona?
   - Nota: la Sen de D no es igual a Sen_A − Sen_B (la mediana no es lineal).
4. **Patrón** (descriptivo + evidencia): signos opuestos con evidencia en ambas / signos opuestos solo
   descriptivos / mismo signo con evidencia en ambas / mismo signo descriptivo / pendiente cero / insuficiente / no comparable.
5. Garantía probada: el texto **nunca** dice "difieren" si p(D) ≥ α, ni "con evidencia" si alguna de las dos
   series es no concluyente (`test_never_claims_difference_without_support`, 25 pares aleatorios).
6. **Correlación ≠ causalidad:** toda comparación termina con esa advertencia.

## 7. Explicaciones

`trendlens/explain.py` usa plantillas **deterministas**: solo insertan cifras del resultado. No hay IA
generativa. Las pruebas comprueban que los números del texto son los calculados, que un resultado no
concluyente nunca se redacta como "no hay tendencia" y que siempre se incluye el descargo causal.

## Referencias

- Hamed, K. H., y Rao, A. R. (1998). A modified Mann-Kendall trend test for autocorrelated data. *J. Hydrology*, 204, 182–196.
- Hirsch, R. M., Slack, J. R., y Smith, R. A. (1982). Techniques of trend analysis for monthly water quality data. *Water Resources Research*, 18(1).
- Hirsch, R. M., y Slack, J. R. (1984). A nonparametric trend test for seasonal data with serial dependence. *WRR*, 20(6).
- Kass, R. E., y Raftery, A. E. (1995). Bayes factors. *JASA*, 90(430).
- Kendall, M. G. (1975). *Rank Correlation Methods*. Griffin. — Mann, H. B. (1945). Nonparametric tests against trend. *Econometrica*, 13.
- Santer, B. D., et al. (2000). Statistical significance of trends and trend differences in layer-average atmospheric temperature time series. *JGR*, 105(D6).
- Sen, P. K. (1968). Estimates of the regression coefficient based on Kendall's tau. *JASA*, 63(324).
- Weatherhead, E. C., et al. (1998). Factors affecting the detection of trends. *JGR*, 103(D14).
- Yue, S., y Wang, C. Y. (2004). The Mann-Kendall test modified by effective sample size to detect trend in serially correlated hydrological series. *Water Resources Management*, 18.

*(Referencias citadas de memoria bibliográfica estándar; verificar páginas y volúmenes antes de citarlas en una entrega.)*
