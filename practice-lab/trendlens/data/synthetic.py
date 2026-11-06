"""Generadores sintéticos DETERMINISTAS (semilla documentada) para practicar.

Todo lo que sale de aquí lleva `is_synthetic=True` y la interfaz lo marca con
"DATOS SINTÉTICOS — SOLO DEMOSTRACIÓN". Los sitios sintéticos NO tienen coordenadas reales,
para que nunca se confundan con lugares del mundo.

Modelo generador (mensual), con t en años decimales y t_mid el centro del período:

* Temperatura:  T = 20 + A·cos(2π(mes−7)/12) + β·(t − t_mid) + escalón + r_año + ε_mes
* Precipitación: tasa ~ Gamma(k=4, media = μ),  μ = max(0.05, r0·(1 + s·cos(2π(mes−1)/12))·(1 + r_año)
                 + β_tasa·(t − t_mid) + escalón)

donde r_año es ruido rojo AR(1) anual (φ, σ) y ε_mes ruido blanco. La pendiente "verdadera"
de la serie anual se conoce y se guarda en la procedencia para comparar con la estimación.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from ..config import Location, VariableSpec
from ..schema import Provenance, SeriesBundle, make_frame

SYNTH_START_YEAR = 1981
SYNTH_END_YEAR = 2025
VARIABLE_SEED_OFFSET = {"T2M": 0, "PRECTOTCORR": 50_000}
DAYS_PER_YEAR_MEAN = 365.2425

# Parámetros base por variable
_TEMP_BASE = dict(mean=20.0, seasonal_amp=8.0, month_sd=0.6, red_sd=0.35)
_PREC_BASE = dict(rate=2.5, seasonal_rel=0.5, gamma_shape=4.0, red_sd_rel=0.12)


@dataclass(frozen=True)
class SyntheticScenario:
    key: str
    name_es: str
    description_es: str
    temp_trend_per_decade: float  # °C por década (serie anual)
    precip_trend_per_decade: float  # mm/año por década (serie anual de totales)
    seed: int
    seasonal_scale: float = 1.0
    noise_scale: float = 1.0
    ar1_phi: float = 0.0
    red_noise_scale: float = 1.0
    missing_fraction: float = 0.0
    gap_block: tuple[float, int] | None = None  # (posición relativa 0–1, nº de meses consecutivos)
    step: tuple[float, float, float] | None = None  # (posición relativa, salto T °C, salto P mm/año)

    def true_trend_per_decade(self, code: str) -> float:
        return self.temp_trend_per_decade if code == "T2M" else self.precip_trend_per_decade


SCENARIOS: dict[str, SyntheticScenario] = {
    s.key: s
    for s in (
        SyntheticScenario(
            "creciente", "Tendencia creciente",
            "Pendiente positiva conocida más variabilidad interanual realista.",
            temp_trend_per_decade=0.30, precip_trend_per_decade=100.0, seed=1101,
        ),
        SyntheticScenario(
            "decreciente", "Tendencia decreciente",
            "Pendiente negativa conocida más variabilidad interanual realista.",
            temp_trend_per_decade=-0.30, precip_trend_per_decade=-100.0, seed=1102,
        ),
        SyntheticScenario(
            "sin_tendencia", "Sin tendencia",
            "Pendiente verdadera cero; cualquier pendiente estimada es ruido.",
            temp_trend_per_decade=0.0, precip_trend_per_decade=0.0, seed=1103,
        ),
        SyntheticScenario(
            "estacional", "Estacionalidad marcada, sin tendencia",
            "Ciclo anual del doble de amplitud y poco ruido; pendiente verdadera cero. "
            "Sirve para comprobar que el ciclo estacional no se confunde con tendencia.",
            temp_trend_per_decade=0.0, precip_trend_per_decade=0.0, seed=1104,
            seasonal_scale=2.0, noise_scale=0.5, red_noise_scale=0.5,
        ),
        SyntheticScenario(
            "faltantes", "Con valores faltantes",
            "Tendencia positiva con 2 % de meses faltantes al azar y un hueco de 14 meses seguidos. "
            "Los años incompletos se excluyen del análisis anual.",
            temp_trend_per_decade=0.20, precip_trend_per_decade=80.0, seed=1105,
            missing_fraction=0.02, gap_block=(0.4, 14),
        ),
        SyntheticScenario(
            "opuesta_pos", "Par opuesto: rama positiva",
            "Mitad positiva del par de signos contrarios (usar con 'Par opuesto: rama negativa').",
            temp_trend_per_decade=0.40, precip_trend_per_decade=120.0, seed=1106,
        ),
        SyntheticScenario(
            "opuesta_neg", "Par opuesto: rama negativa",
            "Mitad negativa del par de signos contrarios (usar con 'Par opuesto: rama positiva').",
            temp_trend_per_decade=-0.40, precip_trend_per_decade=-120.0, seed=1107,
        ),
        SyntheticScenario(
            "autocorrelada", "Autocorrelación temporal (sin tendencia)",
            "Pendiente verdadera cero pero ruido rojo AR(1) anual con φ = 0.75: los años vecinos se parecen. "
            "Las pruebas que suponen independencia tienden a exagerar la significancia.",
            temp_trend_per_decade=0.0, precip_trend_per_decade=0.0, seed=1108,
            ar1_phi=0.75, red_noise_scale=1.6,
        ),
        SyntheticScenario(
            "escalon", "Cambio abrupto (escalón), sin tendencia lineal",
            "Salto único a mitad del período y pendiente lineal verdadera cero. Una recta ajustada puede "
            "resultar 'significativa' aunque el proceso no sea una tendencia gradual.",
            temp_trend_per_decade=0.0, precip_trend_per_decade=0.0, seed=1109,
            step=(0.5, 1.0, 150.0),
        ),
    )
}

# Pares sugeridos para el Opposite Trends Explorer
SUGGESTED_PAIRS: dict[str, tuple[str, str]] = {
    "Signos opuestos": ("opuesta_pos", "opuesta_neg"),
    "Creciente vs. sin tendencia": ("creciente", "sin_tendencia"),
    "Autocorrelada vs. sin tendencia": ("autocorrelada", "sin_tendencia"),
}


def synthetic_location(slot: str) -> Location:
    """Los sitios sintéticos no tienen coordenadas: nunca representan un lugar real."""
    return Location(id=f"synthetic_{slot}", name=f"Sitio sintético {slot}", lat=float("nan"), lon=float("nan"),
                    context_es="Sitio ficticio generado por el laboratorio.")


def scenario_seed(scenario: SyntheticScenario, code: str) -> int:
    return scenario.seed + VARIABLE_SEED_OFFSET[code]


def _ar1(rng: np.random.Generator, n: int, phi: float, sd: float) -> np.ndarray:
    """AR(1) estacionario con desviación estándar marginal `sd`."""
    if sd == 0 or n == 0:
        return np.zeros(n)
    innov_sd = sd * np.sqrt(1.0 - phi**2)
    out = np.empty(n)
    out[0] = rng.normal(0.0, sd)
    for i in range(1, n):
        out[i] = phi * out[i - 1] + rng.normal(0.0, innov_sd)
    return out


def generate_monthly(
    scenario: SyntheticScenario,
    variable: VariableSpec,
    slot: str = "A",
    start_year: int = SYNTH_START_YEAR,
    end_year: int = SYNTH_END_YEAR,
) -> SeriesBundle:
    """Genera la serie mensual del escenario. Misma semilla + mismos argumentos ⇒ mismos datos."""
    if end_year < start_year:
        raise ValueError("end_year debe ser ≥ start_year")
    seed = scenario_seed(scenario, variable.code)
    rng = np.random.default_rng(seed)

    ts = pd.date_range(f"{start_year}-01-01", f"{end_year}-12-01", freq="MS")
    years = ts.year.to_numpy()
    months = ts.month.to_numpy()
    t = years + (months - 0.5) / 12.0
    t_mid = (start_year + end_year + 1) / 2.0
    n_years = end_year - start_year + 1
    year_idx = years - start_year

    step_series = np.zeros(len(ts))
    if scenario.step is not None:
        step_year = start_year + int(round(scenario.step[0] * n_years))
        step_series = (years >= step_year).astype(float)

    if variable.code == "T2M":
        p = _TEMP_BASE
        beta = scenario.temp_trend_per_decade / 10.0
        red = _ar1(rng, n_years, scenario.ar1_phi, p["red_sd"] * scenario.red_noise_scale)[year_idx]
        eps = rng.normal(0.0, p["month_sd"] * scenario.noise_scale, len(ts))
        seasonal = p["seasonal_amp"] * scenario.seasonal_scale * np.cos(2 * np.pi * (months - 7) / 12.0)
        step_size = scenario.step[1] if scenario.step else 0.0
        values = p["mean"] + seasonal + beta * (t - t_mid) + step_size * step_series + red + eps
        unit = variable.native_unit
    elif variable.code == "PRECTOTCORR":
        p = _PREC_BASE
        # Tendencia de la tasa (mm/día por año) equivalente a la tendencia anual pedida (mm/año por década)
        beta_rate = scenario.precip_trend_per_decade / 10.0 / DAYS_PER_YEAR_MEAN
        step_rate = (scenario.step[2] / DAYS_PER_YEAR_MEAN) if scenario.step else 0.0
        red = _ar1(rng, n_years, scenario.ar1_phi, p["red_sd_rel"] * scenario.red_noise_scale)[year_idx]
        seasonal = p["rate"] * (1.0 + p["seasonal_rel"] * min(scenario.seasonal_scale, 1.9)
                                * np.cos(2 * np.pi * (months - 1) / 12.0))
        mu = np.maximum(0.05, seasonal * (1.0 + red) + beta_rate * (t - t_mid) + step_rate * step_series)
        shape = p["gamma_shape"] / max(scenario.noise_scale, 1e-6) ** 2
        values = rng.gamma(shape, mu / shape)
        values = np.round(values, 2)  # misma precisión que publica NASA POWER
        unit = variable.native_unit
    else:
        raise ValueError(f"Variable no soportada en modo sintético: {variable.code}")

    if variable.code == "T2M":
        values = np.round(values, 2)

    flags = np.array(["ok"] * len(ts), dtype=object)
    if scenario.missing_fraction > 0:
        miss = rng.random(len(ts)) < scenario.missing_fraction
        values[miss] = np.nan
        flags[miss] = "missing"
    if scenario.gap_block is not None:
        start_i = int(scenario.gap_block[0] * len(ts))
        sl = slice(start_i, min(len(ts), start_i + scenario.gap_block[1]))
        values[sl] = np.nan
        flags[sl] = "missing"

    location = synthetic_location(slot)
    df = make_frame(
        ts, values, variable=variable, location=location, unit=unit,
        source="SINTÉTICO", product=f"synthetic:{scenario.key}",
        spatial_resolution="no aplica (sitio ficticio)", is_synthetic=True, quality_flags=flags,
    )
    prov = Provenance(
        source="Generador sintético de TrendLens Lab",
        product=f"Escenario «{scenario.name_es}»",
        is_synthetic=True,
        retrieved_at_utc=Provenance.now_utc(),
        seed=seed,
        origin="synthetic",
        notes=[
            "DATOS SINTÉTICOS — SOLO DEMOSTRACIÓN. No representan ningún lugar ni medición de NASA.",
            f"Generador: numpy.random.default_rng({seed}).",
        ],
        extra={
            "scenario": scenario.key,
            "true_trend_per_decade": scenario.true_trend_per_decade(variable.code),
            "true_trend_unit": f"{variable.annual_unit}/década",
            "ar1_phi": scenario.ar1_phi,
            "step": scenario.step,
        },
    )
    return SeriesBundle(data=df, variable=variable, location=location, provenance=prov)


class SyntheticSource:
    """Adaptador de la interfaz `DataSource` para escenarios sintéticos."""

    name = "synthetic"

    def __init__(self, scenario_key: str, slot: str = "A"):
        if scenario_key not in SCENARIOS:
            raise KeyError(f"Escenario desconocido: {scenario_key}")
        self.scenario = SCENARIOS[scenario_key]
        self.slot = slot

    def fetch(self, variable: VariableSpec, location: Location | None = None,
              start_year: int = SYNTH_START_YEAR, end_year: int = SYNTH_END_YEAR) -> SeriesBundle:
        return generate_monthly(self.scenario, variable, self.slot, start_year, end_year)
