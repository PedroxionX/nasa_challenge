"""Configuración central: catálogo de variables, ubicaciones de ejemplo y constantes científicas.

Todo lo que es una *decisión metodológica* vive aquí para que sea fácil de auditar.
"""

from __future__ import annotations

import datetime as _dt
from dataclasses import dataclass

# --------------------------------------------------------------------------------------
# Constantes estadísticas (ver SCIENTIFIC_METHOD.md)
# --------------------------------------------------------------------------------------
ALPHA_DEFAULT = 0.05
ALPHA_CHOICES = (0.01, 0.05, 0.10)
MIN_YEARS_FOR_TEST = 10  # por debajo de esto la aproximación normal de Mann-Kendall es poco fiable
RECOMMENDED_MIN_YEARS = 30  # referencia habitual de la OMM para "normales" climatológicas
MIN_MONTHS_PER_YEAR = 12  # un año solo se usa si tiene los 12 meses válidos
DEFAULT_REFERENCE_PERIOD = (1991, 2020)  # normal climatológica OMM vigente
MIN_REFERENCE_YEARS = 10  # años completos mínimos dentro del período de referencia para anomalías
SENSITIVITY_MIN_WINDOW = 15  # ventana mínima (años) en el análisis de sensibilidad al año inicial

# --------------------------------------------------------------------------------------
# NASA POWER (verificado contra la API el 2026-11-06)
# --------------------------------------------------------------------------------------
POWER_MONTHLY_POINT_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
POWER_COMMUNITY = "AG"  # no altera las unidades de T2M ni de PRECTOTCORR (verificado)
POWER_FIRST_YEAR = 1981  # la API devuelve HTTP 422 si start < 1981 (verificado)
POWER_FILL_VALUE = -999.0  # header.fill_value (verificado)
POWER_GRID_DESCRIPTION = "½° lat × ⅝° lon (resolución nativa de MERRA-2)"
POWER_TIMEOUT_S = (10, 60)
POWER_CACHE_TTL_DAYS = 7
USER_AGENT = "TrendLensLab/0.1 (prototipo educativo; Space Apps practice)"


def last_complete_year(today: _dt.date | None = None) -> int:
    """Último año calendario que puede estar completo (el año en curso nunca lo está)."""
    today = today or _dt.date.today()
    return today.year - 1


# --------------------------------------------------------------------------------------
# Catálogo de variables
# --------------------------------------------------------------------------------------
@dataclass(frozen=True)
class VariableSpec:
    code: str  # código de NASA POWER
    name_es: str
    short_es: str
    description_es: str
    power_unit_label: str  # etiqueta EXACTA que devuelve la API (se valida)
    native_unit: str  # unidad mensual tal como llega, en notación legible
    monthly_unit: str  # unidad de la serie mensual usada en gráficas/Seasonal MK
    annual_unit: str  # unidad de la serie anual analizada
    aggregation: str  # "mean" (promedio ponderado por días) | "sum_from_rate" (tasa × días)
    physical_min: float
    physical_max: float
    product: str


VARIABLES: dict[str, VariableSpec] = {
    "T2M": VariableSpec(
        code="T2M",
        name_es="Temperatura del aire a 2 metros",
        short_es="Temperatura (T2M)",
        description_es=(
            "Temperatura media del aire a 2 m sobre la superficie. En NASA POWER proviene del "
            "reanálisis MERRA-2 (modelo + asimilación de observaciones), no de una estación local."
        ),
        power_unit_label="C",
        native_unit="°C",
        monthly_unit="°C",
        annual_unit="°C",
        aggregation="mean",
        physical_min=-90.0,
        physical_max=60.0,
        product="MERRA-2 (vía NASA POWER)",
    ),
    "PRECTOTCORR": VariableSpec(
        code="PRECTOTCORR",
        name_es="Precipitación corregida",
        short_es="Precipitación (PRECTOTCORR)",
        description_es=(
            "Precipitación total corregida con observaciones (MERRA-2). La API mensual la entrega como "
            "TASA media en mm/día; el laboratorio la convierte a acumulados (mm/mes, mm/año) "
            "multiplicando por los días de cada mes, incluidos los años bisiestos."
        ),
        power_unit_label="mm/day",
        native_unit="mm/día",
        monthly_unit="mm/mes",
        annual_unit="mm/año",
        aggregation="sum_from_rate",
        physical_min=0.0,
        physical_max=200.0,
        product="MERRA-2 PRECTOTCORR (vía NASA POWER)",
    ),
}


# --------------------------------------------------------------------------------------
# Ubicaciones de ejemplo (solo coordenadas; NO se afirma ningún resultado sobre ellas)
# --------------------------------------------------------------------------------------
@dataclass(frozen=True)
class Location:
    id: str
    name: str
    lat: float
    lon: float
    context_es: str = ""

    @property
    def label(self) -> str:
        return f"{self.name} ({self.lat:.2f}, {self.lon:.2f})"


PRESET_LOCATIONS: tuple[Location, ...] = (
    Location("mexicali", "Mexicali, B.C., México", 32.62, -115.45, "Desierto de Sonora, clima árido cálido."),
    Location("ensenada", "Ensenada, B.C., México", 31.87, -116.60, "Costa del Pacífico, clima mediterráneo seco."),
    Location("tijuana", "Tijuana, B.C., México", 32.53, -117.02, "Frontera costera, influencia marina."),
    Location("cdmx", "Ciudad de México", 19.43, -99.13, "Altiplano a ~2240 m; celda de modelo vs. relieve complejo."),
    Location("merida", "Mérida, Yucatán, México", 20.97, -89.62, "Trópico húmedo-seco, planicie kárstica."),
    Location("manaus", "Manaus, Brasil", -3.12, -60.02, "Amazonía central, ecuatorial húmedo."),
    Location("niamey", "Niamey, Níger (Sahel)", 13.51, 2.11, "Sahel: alta variabilidad interanual de lluvia."),
    Location("longyearbyen", "Longyearbyen, Svalbard", 78.22, 15.65, "Ártico alto."),
    Location("ushuaia", "Ushuaia, Argentina", -54.80, -68.30, "Subantártico, Tierra del Fuego."),
    Location("madrid", "Madrid, España", 40.42, -3.70, "Meseta ibérica, mediterráneo continental."),
    Location("mumbai", "Mumbai, India", 19.08, 72.88, "Monzón del sur de Asia."),
    Location("sydney", "Sídney, Australia", -33.87, 151.21, "Costa templada del hemisferio sur."),
)

PRESETS_BY_ID = {loc.id: loc for loc in PRESET_LOCATIONS}
