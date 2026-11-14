"""Catálogo de variables del contrato (ids neutrales) y su definición según la fuente (FR-D05, T020).

Cada variable tiene un id estable (`air_temperature`, `precipitation`) y una definición por fuente:
`gesdisc` (MERRA-2 / IMERG, la de producción) y `power` (alternativa elegida a mano con --source power).

`spec` es la definición que usa el procesamiento del laboratorio (trendlens.processing): unidad mensual
nativa **después** de la conversión del adaptador, agregación anual y rango físico.
"""

from __future__ import annotations

from dataclasses import dataclass, replace

from trendlens.config import VARIABLES as POWER_SPECS, VariableSpec
from weights import IMERG_GRID, MERRA2_GRID, GridSpec

MAP_LABELS = ["Baja mucho", "Baja", "Casi sin cambio", "Sube", "Sube mucho"]


@dataclass(frozen=True)
class VarDef:
    id: str
    source: str  # "gesdisc" | "power"
    label: str
    definition: str
    kind: str  # "reanalysis" | "observation"
    unit_annual: str
    aggregation: str  # "mean_day_weighted" | "sum_from_rate"
    relative_change: bool
    map_unit: str
    breaks: list  # provisionales: se fijan al ver la distribución real (contrato, «map»)
    spec: VariableSpec
    grid: GridSpec
    first_request_year: int  # primer año que vale la pena pedir (el primero completo del producto)
    parameter: str  # nombre de la variable en el archivo o parámetro de la API
    conversion: str  # transformación de unidades que aplica el adaptador, para provenance

    @property
    def catalog_fields(self) -> dict:
        return {"label": self.label, "definition": self.definition, "kind": self.kind,
                "unit_annual": self.unit_annual, "aggregation": self.aggregation,
                "relative_change": self.relative_change}


_T_DEF = ("Temperatura media del aire a 2 m sobre la superficie, del reanálisis MERRA-2 (modelo con asimilación de "
          "observaciones). No es la temperatura de una estación ni la del suelo.")
_P_DEF_IMERG = ("Precipitación total de GPM IMERG Final (combinación de satélites calibrada con pluviómetros). La tasa "
                "mensual (mm/h) se convierte a acumulado con las horas reales de cada mes y se suma por año.")
_P_DEF_POWER = ("Precipitación total corregida con observaciones, del reanálisis MERRA-2 vía NASA POWER. La tasa "
                "mensual (mm/día) se convierte a acumulado con los días reales de cada mes y se suma por año.")

_T_SPEC = VariableSpec(
    code="air_temperature", name_es="Temperatura del aire a 2 metros", short_es="Temperatura del aire",
    description_es=_T_DEF, power_unit_label="K", native_unit="°C", monthly_unit="°C", annual_unit="°C",
    aggregation="mean", physical_min=-90.0, physical_max=60.0, product="MERRA-2 M2TMNXSLV v5.12.4")
# El adaptador de IMERG entrega mm/día (mm/h × 24); el procesamiento multiplica por los días del mes,
# así que el acumulado mensual es mm/h × horas reales del mes.
_P_SPEC = VariableSpec(
    code="precipitation", name_es="Precipitación", short_es="Precipitación",
    description_es=_P_DEF_IMERG, power_unit_label="mm/hr", native_unit="mm/día", monthly_unit="mm/mes",
    annual_unit="mm", aggregation="sum_from_rate", physical_min=0.0, physical_max=200.0,
    product="GPM IMERG Final GPM_3IMERGM v07")

VARS: dict[tuple[str, str], VarDef] = {
    ("air_temperature", "gesdisc"): VarDef(
        "air_temperature", "gesdisc", "Temperatura del aire", _T_DEF, "reanalysis", "°C", "mean_day_weighted",
        False, "°C/década", [-0.4, -0.1, 0.1, 0.4], _T_SPEC, MERRA2_GRID, 1980, "T2M",
        "K → °C (− 273,15)"),
    ("precipitation", "gesdisc"): VarDef(
        "precipitation", "gesdisc", "Precipitación", _P_DEF_IMERG, "observation", "mm", "sum_from_rate",
        True, "%/década", [-10.0, -3.0, 3.0, 10.0], _P_SPEC, IMERG_GRID, 2001, "precipitation",
        "mm/h × 24 → mm/día; × días reales del mes → mm/mes (= mm/h × horas del mes); suma de 12 meses → mm"),
    ("air_temperature", "power"): VarDef(
        "air_temperature", "power", "Temperatura del aire", _T_DEF, "reanalysis", "°C", "mean_day_weighted",
        False, "°C/década", [-0.4, -0.1, 0.1, 0.4], POWER_SPECS["T2M"], MERRA2_GRID, 1981, "T2M",
        "unidad declarada C (sin conversión)"),
    ("precipitation", "power"): VarDef(
        "precipitation", "power", "Precipitación", _P_DEF_POWER, "reanalysis", "mm", "sum_from_rate",
        True, "%/década", [-10.0, -3.0, 3.0, 10.0], replace(POWER_SPECS["PRECTOTCORR"], annual_unit="mm"),
        MERRA2_GRID, 1981, "PRECTOTCORR",
        "tasa mm/día × días reales del mes → mm/mes; suma de 12 meses → mm"),
}

VARIABLE_IDS = ("air_temperature", "precipitation")


def get(var_id: str, source: str) -> VarDef:
    try:
        return VARS[(var_id, source)]
    except KeyError:
        raise KeyError(f"Variable desconocida: {var_id!r} con la fuente {source!r}. "
                       f"Variables: {', '.join(VARIABLE_IDS)}; fuentes: gesdisc, power.") from None
