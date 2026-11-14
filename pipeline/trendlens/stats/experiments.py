"""Experimentos Monte Carlo para conocer el comportamiento REAL de las pruebas.

Pregunta: si la pendiente verdadera es cero y los años vecinos se parecen (ruido AR(1) con φ),
¿con qué frecuencia cada prueba declara una tendencia "significativa"? Una prueba bien calibrada
debería hacerlo en ≈ α (5 %) de los casos.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .mann_kendall import hamed_rao, mann_kendall, mk_ar1_corrected
from .ols import ols_trend

EXPERIMENT_SEED = 20261114


def ar1_series(rng: np.random.Generator, n: int, phi: float) -> np.ndarray:
    x = np.empty(n)
    x[0] = rng.normal(0, 1)
    innov = np.sqrt(1 - phi**2)
    for i in range(1, n):
        x[i] = phi * x[i - 1] + rng.normal(0, innov)
    return x


def rejection_rates(phi: float, n_years: int = 45, n_sims: int = 500, alpha: float = 0.05,
                    trend_per_year_sd: float = 0.0, seed: int = EXPERIMENT_SEED) -> pd.DataFrame:
    """Fracción de simulaciones con p < α para cada prueba.

    `trend_per_year_sd` = pendiente verdadera en unidades de desviación estándar del ruido por año.
    Con 0 se mide la tasa de FALSOS POSITIVOS; con > 0, la POTENCIA (detecciones correctas).
    """
    rng = np.random.default_rng([seed, int(round(phi * 1000)), n_years])
    t = np.arange(n_years, dtype=float)
    hits = {"MCO (supone independencia)": 0, "MCO ajustado (Santer)": 0,
            "Mann-Kendall original": 0, "Mann-Kendall Hamed-Rao (3 lags)": 0,
            "Mann-Kendall corrección AR(1) (principal)": 0}
    for _ in range(n_sims):
        y = ar1_series(rng, n_years, phi) + trend_per_year_sd * t
        o = ols_trend(t, y, alpha)
        hits["MCO (supone independencia)"] += o.p_value < alpha
        hits["MCO ajustado (Santer)"] += (o.adj_p_value if o.adj_valid else 1.0) < alpha
        hits["Mann-Kendall original"] += mann_kendall(y, alpha).p_value < alpha
        hr = hamed_rao(y, t, alpha)
        hits["Mann-Kendall Hamed-Rao (3 lags)"] += (hr.p_value if hr.valid else 1.0) < alpha
        hits["Mann-Kendall corrección AR(1) (principal)"] += mk_ar1_corrected(y, t, alpha).p_value < alpha
    return pd.DataFrame({"prueba": list(hits), "tasa_rechazo": [v / n_sims for v in hits.values()],
                         "phi": phi, "n_anios": n_years, "simulaciones": n_sims, "alpha": alpha})
