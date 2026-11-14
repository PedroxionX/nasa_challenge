# Archivos de ejemplo de 004 — SINTÉTICOS

Solo para pruebas de `features/analysis/`. **No son datos de la NASA** y llevan `is_synthetic: true`.

`extras.json` imita una serie de precipitación con las columnas opcionales que 004 pidió al contrato:
`line_mid` (FR-A10) y `slope_decade_pct`, `ci_low_pct`, `ci_high_pct` (FR-A09). Las cifras están escritas a mano
para comprobar que el panel las **lee** y las muestra sin calcular nada; no salen de ningún motor.
