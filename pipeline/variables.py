"""Catálogo de variables del contrato (ids neutrales) y su definición según la fuente (FR-D05, T020).

Cada variable tiene un id estable (`air_temperature`, `precipitation`) y una definición por fuente:
`gesdisc` (MERRA-2 / IMERG, la de producción) y `power` (alternativa elegida a mano con --source power).

`spec` es la definición que usa el procesamiento del laboratorio (trendlens.processing): unidad mensual
nativa **después** de la conversión del adaptador, agregación anual y rango físico.
"""

from __future__ import annotations

from dataclasses import dataclass, replace

from trendlens.config import VARIABLES as POWER_SPECS, VariableSpec
from weights import GLDAS_GRID, IMERG_GRID, MERRA2_GRID, GridSpec

MAP_LABELS = ["Baja mucho", "Baja", "Casi sin cambio", "Sube", "Sube mucho"]
# Cortes de temperatura fijados el 2026-11-14 al ver la distribución real (1980–2025, 84 regiones: p25 0,30,
# mediana 0,35, p75 0,40 °C/década): separan el periodo completo en 3 · 35 · 46 regiones (Casi sin cambio · Sube ·
# Sube mucho). Los de precipitación (−10, −3, 3, 10 %/década) reparten 3 · 20 · 50 · 11 · 0 en 2001–2024.
T_BREAKS = [-0.35, -0.15, 0.15, 0.35]
# GLDAS (2026-11-14, 2000–2025): humedad del suelo mediana −1,4 %/década (−7,3…4,1); evapotranspiración
# mediana +2,8 (−11,6…13,7). Con −6, −2, 2, 6 el periodo completo reparte 3·29·51·1·0 y 2·7·26·35·14.
GLDAS_BREAKS = [-6.0, -2.0, 2.0, 6.0]
# Cortes fijados el 2026-11-15 al ver la distribución real del periodo completo (84 regiones), para que el mapa use al
# menos 3 clases. Humedad del aire (1980–2025, −0,2…3,3 %/década) reparte 0·0·21·60·3 y vapor de agua (0,1…3,2)
# 0·0·25·57·2; ozono (−0,7…0,3 %/década) 12·37·30·5·0; nieve (2000–2025, −5,9…0,0 mm/década) 7·16·56·0·0, con 5
# regiones sin nieve y sin dato. Con los cortes genéricos anteriores salían 2, 2, 1 y 2 clases.
HUMIDITY_BREAKS = [-3.0, -1.0, 1.0, 3.0]
OZONE_BREAKS = [-0.5, -0.2, 0.2, 0.5]
SWE_BREAKS = [-2.0, -0.5, 0.5, 2.0]


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
    breaks: list  # 4 cortes simétricos de la magnitud del cambio por década (no de la evidencia)
    spec: VariableSpec
    grid: GridSpec
    first_request_year: int  # primer año que vale la pena pedir (el primero completo del producto)
    parameter: str  # nombre de la variable en el archivo o parámetro de la API
    conversion: str  # transformación de unidades que aplica el adaptador, para provenance
    # Variables solo de tierra (GLDAS, NDVI): media de las celdas con dato si cubren al menos esta fracción del
    # peso de la región; None = regla de siempre (el mes es faltante si falta cualquier celda).
    min_valid_fraction: float | None = None

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
        False, "°C/década", T_BREAKS, _T_SPEC, MERRA2_GRID, 1980, "T2M",
        "K → °C (− 273,15)"),
    ("precipitation", "gesdisc"): VarDef(
        "precipitation", "gesdisc", "Precipitación", _P_DEF_IMERG, "observation", "mm", "sum_from_rate",
        True, "%/década", [-10.0, -3.0, 3.0, 10.0], _P_SPEC, IMERG_GRID, 2001, "precipitation",
        "mm/h × 24 → mm/día; × días reales del mes → mm/mes (= mm/h × horas del mes); suma de 12 meses → mm"),
    ("air_temperature", "power"): VarDef(
        "air_temperature", "power", "Temperatura del aire", _T_DEF, "reanalysis", "°C", "mean_day_weighted",
        False, "°C/década", T_BREAKS, POWER_SPECS["T2M"], MERRA2_GRID, 1981, "T2M",
        "unidad declarada C (sin conversión)"),
    ("precipitation", "power"): VarDef(
        "precipitation", "power", "Precipitación", _P_DEF_POWER, "reanalysis", "mm", "sum_from_rate",
        True, "%/década", [-10.0, -3.0, 3.0, 10.0], replace(POWER_SPECS["PRECTOTCORR"], annual_unit="mm"),
        MERRA2_GRID, 1981, "PRECTOTCORR",
        "tasa mm/día × días reales del mes → mm/mes; suma de 12 meses → mm"),
}

_SM_DEF = ("Humedad del suelo en los primeros 10 cm, de GLDAS Noah: modelo de superficie terrestre alimentado con "
           "observaciones (no es una medición directa). Media anual ponderada por los días de cada mes.")
_ET_DEF = ("Evapotranspiración (agua que pasa del suelo y las plantas a la atmósfera), de GLDAS Noah: modelo de superficie "
           "terrestre alimentado con observaciones (no es una medición directa). Suma de 12 meses.")
_SM_SPEC = VariableSpec(
    code="soil_moisture", name_es="Humedad del suelo (0–10 cm)", short_es="Humedad del suelo", description_es=_SM_DEF,
    power_unit_label="kg m-2", native_unit="kg/m²", monthly_unit="kg/m²", annual_unit="kg/m²", aggregation="mean",
    physical_min=0.0, physical_max=100.0, product="GLDAS_NOAH025_M v2.1 SoilMoi0_10cm_inst")
# El adaptador entrega mm/día (kg m⁻² s⁻¹ × 86 400); el procesamiento multiplica por los días del mes.
_ET_SPEC = VariableSpec(
    code="evapotranspiration", name_es="Evapotranspiración", short_es="Evapotranspiración", description_es=_ET_DEF,
    power_unit_label="kg m-2 s-1", native_unit="mm/día", monthly_unit="mm/mes", annual_unit="mm",
    aggregation="sum_from_rate", physical_min=0.0, physical_max=30.0, product="GLDAS_NOAH025_M v2.1 Evap_tavg")

VARS[("soil_moisture", "gesdisc")] = VarDef(
    "soil_moisture", "gesdisc", "Humedad del suelo", _SM_DEF, "reanalysis", "kg/m²", "mean_day_weighted",
    True, "%/década", GLDAS_BREAKS, _SM_SPEC, GLDAS_GRID, 2000, "SoilMoi0_10cm_inst",
    "relleno −9999 (mar) → faltante; kg m⁻² sin conversión", min_valid_fraction=0.5)
VARS[("evapotranspiration", "gesdisc")] = VarDef(
    "evapotranspiration", "gesdisc", "Evapotranspiración", _ET_DEF, "reanalysis", "mm", "sum_from_rate",
    True, "%/década", GLDAS_BREAKS, _ET_SPEC, GLDAS_GRID, 2000, "Evap_tavg",
    "relleno −9999 (mar) → faltante; kg m⁻² s⁻¹ × 86 400 → mm/día; × días reales del mes → mm/mes; suma de 12 meses → mm",
    min_valid_fraction=0.5)

_QV_DEF = ("Humedad específica del aire a 2 m sobre la superficie, de MERRA-2. Masa de vapor de agua por kilogramo de aire húmedo.")
_TQV_DEF = ("Vapor de agua precipitable total integrado en la columna atmosférica, de MERRA-2. Altura de agua líquida si todo el vapor precipitara.")
_TO3_DEF = ("Ozono total en la columna atmosférica, de MERRA-2 (con asimilación de sensores satelitales). Puede presentar saltos en 2004 por transición de sensores.")
_RO_DEF = ("Escorrentía total (superficial y subsuperficial), de GLDAS Noah: modelo de superficie terrestre alimentado con observaciones. Suma de 12 meses.")
_SWE_DEF = ("Equivalente en agua de la nieve acumulada (SWE), de GLDAS Noah: masa de nieve por unidad de área convertida a altura de agua.")
_ST_DEF = ("Temperatura superficial de la piel del suelo, de GLDAS Noah: modelo de superficie terrestre alimentado con observaciones.")

_QV_SPEC = VariableSpec(
    code="specific_humidity", name_es="Humedad específica a 2 metros", short_es="Humedad del aire", description_es=_QV_DEF,
    power_unit_label="kg kg-1", native_unit="g/kg", monthly_unit="g/kg", annual_unit="g/kg", aggregation="mean",
    physical_min=0.0, physical_max=50.0, product="MERRA-2 M2TMNXSLV v5.12.4 QV2M")
_TQV_SPEC = VariableSpec(
    code="total_precipitable_water", name_es="Vapor de agua total en columna", short_es="Vapor de agua", description_es=_TQV_DEF,
    power_unit_label="kg m-2", native_unit="mm", monthly_unit="mm", annual_unit="mm", aggregation="mean",
    physical_min=0.0, physical_max=150.0, product="MERRA-2 M2TMNXSLV v5.12.4 TQV")
_TO3_SPEC = VariableSpec(
    code="total_ozone", name_es="Ozono total en columna", short_es="Ozono total", description_es=_TO3_DEF,
    power_unit_label="Dobsons", native_unit="DU", monthly_unit="DU", annual_unit="DU", aggregation="mean",
    physical_min=100.0, physical_max=600.0, product="MERRA-2 M2TMNXSLV v5.12.4 TO3")
_RO_SPEC = VariableSpec(
    code="runoff", name_es="Escorrentía total", short_es="Escorrentía", description_es=_RO_DEF,
    power_unit_label="kg m-2", native_unit="mm/día", monthly_unit="mm/mes", annual_unit="mm",
    aggregation="sum_from_rate", physical_min=0.0, physical_max=5000.0, product="GLDAS_NOAH025_M v2.1 Qs_acc+Qsb_acc")
_SWE_SPEC = VariableSpec(
    code="snow_water_equivalent", name_es="Nieve acumulada (equivalente en agua)", short_es="Nieve acumulada", description_es=_SWE_DEF,
    power_unit_label="kg m-2", native_unit="mm", monthly_unit="mm", annual_unit="mm", aggregation="mean",
    physical_min=0.0, physical_max=100000.0, product="GLDAS_NOAH025_M v2.1 SWE_inst")
_ST_SPEC = VariableSpec(
    code="soil_temperature", name_es="Temperatura del suelo (superficial)", short_es="Temperatura del suelo", description_es=_ST_DEF,
    power_unit_label="K", native_unit="°C", monthly_unit="°C", annual_unit="°C", aggregation="mean",
    physical_min=-70.0, physical_max=70.0, product="GLDAS_NOAH025_M v2.1 AvgSurfT_inst")

VARS[("specific_humidity", "gesdisc")] = VarDef(
    "specific_humidity", "gesdisc", "Humedad del aire", _QV_DEF, "reanalysis", "g/kg", "mean_day_weighted",
    True, "%/década", HUMIDITY_BREAKS, _QV_SPEC, MERRA2_GRID, 1980, "QV2M",
    "kg kg⁻¹ × 1000 → g/kg")
VARS[("total_precipitable_water", "gesdisc")] = VarDef(
    "total_precipitable_water", "gesdisc", "Vapor de agua total", _TQV_DEF, "reanalysis", "mm", "mean_day_weighted",
    True, "%/década", HUMIDITY_BREAKS, _TQV_SPEC, MERRA2_GRID, 1980, "TQV",
    "kg m⁻² → mm (1:1)")
VARS[("total_ozone", "gesdisc")] = VarDef(
    "total_ozone", "gesdisc", "Ozono total", _TO3_DEF, "reanalysis", "DU", "mean_day_weighted",
    True, "%/década", OZONE_BREAKS, _TO3_SPEC, MERRA2_GRID, 1980, "TO3",
    "sin conversión (Dobsons)")
VARS[("runoff", "gesdisc")] = VarDef(
    "runoff", "gesdisc", "Escorrentía", _RO_DEF, "reanalysis", "mm", "sum_from_rate",
    True, "%/década", [-10.0, -3.0, 3.0, 10.0], _RO_SPEC, GLDAS_GRID, 2000, "runoff",
    "relleno −9999 (mar) → faltante; (Qs_acc + Qsb_acc) × 8 → mm/día; × días reales del mes → mm/mes; suma de 12 meses → mm",
    min_valid_fraction=0.5)
VARS[("snow_water_equivalent", "gesdisc")] = VarDef(
    "snow_water_equivalent", "gesdisc", "Nieve acumulada", _SWE_DEF, "reanalysis", "mm", "mean_day_weighted",
    False, "mm/década", SWE_BREAKS, _SWE_SPEC, GLDAS_GRID, 2000, "SWE_inst",
    "relleno −9999 (mar) → faltante; kg m⁻² → mm (1:1)", min_valid_fraction=0.5)
VARS[("soil_temperature", "gesdisc")] = VarDef(
    "soil_temperature", "gesdisc", "Temperatura del suelo", _ST_DEF, "reanalysis", "°C", "mean_day_weighted",
    False, "°C/década", T_BREAKS, _ST_SPEC, GLDAS_GRID, 2000, "AvgSurfT_inst",
    "relleno −9999 (mar) → faltante; K → °C (− 273,15)", min_valid_fraction=0.5)

# Aerosoles (M2TMNXAER) y temperatura máxima y mínima (M2SMNXSLV), añadidas el 2026-11-15.
_AOD_DEF = ("Espesor óptico de aerosoles a 550 nm, de MERRA-2: cuánto atenúan la luz del sol las partículas del aire "
            "(polvo, humo, sulfatos, sal marina) en toda la columna. No tiene unidad y no es la contaminación que se "
            "respira a nivel del suelo. Reanálisis que asimila observaciones de satélite; no es una medición directa. "
            "Se publica desde 2003: antes el reanálisis contaba con menos satélites y las erupciones de El Chichón "
            "(1982) y Pinatubo (1991) elevan los primeros años.")
_DUST_DEF = ("Parte del espesor óptico de aerosoles a 550 nm que se debe al polvo mineral, de MERRA-2. No tiene unidad. "
             "En regiones con muy poco polvo el valor es casi cero y el cambio en % puede ser grande sin ser relevante. "
             "Se publica desde 2003: en 2000 la serie da un salto al empezar a asimilarse nuevos satélites, y con él "
             "la tendencia desde 1980 sería un artefacto.")
# Los aerosoles empiezan en 2003 (decisión del 2026-11-15, con los datos de 1980–2025 a la vista): el polvo salta en
# 2000 en las 84 regiones (Texas: 0,013 en 1999 y 0,018 en 2000; 80 de 84 con el aviso «step») y los aerosoles totales
# tienen los picos de El Chichón y Pinatubo (Texas: 0,27 en 1982 y 0,29 en 1991 frente a ~0,16). Desde 2003 MERRA-2
# asimila MODIS de Terra y de Aqua todo el periodo.
AEROSOL_FIRST_YEAR = 2003
_TMAX_DEF = ("Temperatura máxima del aire a 2 m, de MERRA-2 (statM_2d_slv_Nx): promedio mensual de la máxima de cada "
             "día. Reanálisis; no es la temperatura de una estación.")
_TMIN_DEF = ("Temperatura mínima del aire a 2 m, de MERRA-2 (statM_2d_slv_Nx): promedio mensual de la mínima de cada "
             "día. Reanálisis; no es la temperatura de una estación.")
_AOD_SPEC = VariableSpec(
    code="aerosol_optical_depth", name_es="Espesor óptico de aerosoles (550 nm)", short_es="Aerosoles",
    description_es=_AOD_DEF, power_unit_label="1", native_unit="adimensional", monthly_unit="adimensional",
    annual_unit="adimensional", aggregation="mean", physical_min=0.0, physical_max=5.0,
    product="MERRA-2 M2TMNXAER v5.12.4 TOTEXTTAU")
_DUST_SPEC = VariableSpec(
    code="dust_optical_depth", name_es="Espesor óptico del polvo (550 nm)", short_es="Polvo en el aire",
    description_es=_DUST_DEF, power_unit_label="1", native_unit="adimensional", monthly_unit="adimensional",
    annual_unit="adimensional", aggregation="mean", physical_min=0.0, physical_max=5.0,
    product="MERRA-2 M2TMNXAER v5.12.4 DUEXTTAU")
_TMAX_SPEC = VariableSpec(
    code="max_air_temperature", name_es="Temperatura máxima del aire a 2 metros", short_es="Temperatura máxima",
    description_es=_TMAX_DEF, power_unit_label="K", native_unit="°C", monthly_unit="°C", annual_unit="°C",
    aggregation="mean", physical_min=-90.0, physical_max=70.0, product="MERRA-2 M2SMNXSLV v5.12.4 T2MMAX")
_TMIN_SPEC = VariableSpec(
    code="min_air_temperature", name_es="Temperatura mínima del aire a 2 metros", short_es="Temperatura mínima",
    description_es=_TMIN_DEF, power_unit_label="K", native_unit="°C", monthly_unit="°C", annual_unit="°C",
    aggregation="mean", physical_min=-90.0, physical_max=70.0, product="MERRA-2 M2SMNXSLV v5.12.4 T2MMIN")

# Cortes fijados el 2026-11-15 con la distribución real de 2003–2025 (84 regiones): aerosoles, mediana −5,4 %/década
# (−14,4…11,9), reparten 20·43·13·4·4; polvo, mediana −11,5 (−17,8…1,8), reparte 56·18·10·0·0. Temperatura máxima y
# mínima usan los cortes de la temperatura media para que los tres mapas se comparen: 0·0·3·34·47 y 0·0·1·43·40.
AOD_BREAKS = [-8.0, -3.0, 3.0, 8.0]
DUST_BREAKS = [-10.0, -4.0, 4.0, 10.0]
VARS[("aerosol_optical_depth", "gesdisc")] = VarDef(
    "aerosol_optical_depth", "gesdisc", "Aerosoles", _AOD_DEF, "reanalysis", "adimensional", "mean_day_weighted",
    True, "%/década", AOD_BREAKS, _AOD_SPEC, MERRA2_GRID, AEROSOL_FIRST_YEAR, "TOTEXTTAU",
    "sin conversión (espesor óptico, sin unidad)")
VARS[("dust_optical_depth", "gesdisc")] = VarDef(
    "dust_optical_depth", "gesdisc", "Polvo en el aire", _DUST_DEF, "reanalysis", "adimensional", "mean_day_weighted",
    True, "%/década", DUST_BREAKS, _DUST_SPEC, MERRA2_GRID, AEROSOL_FIRST_YEAR, "DUEXTTAU",
    "sin conversión (espesor óptico, sin unidad)")
VARS[("max_air_temperature", "gesdisc")] = VarDef(
    "max_air_temperature", "gesdisc", "Temperatura máxima", _TMAX_DEF, "reanalysis", "°C", "mean_day_weighted",
    False, "°C/década", T_BREAKS, _TMAX_SPEC, MERRA2_GRID, 1980, "T2MMAX",
    "K → °C (− 273,15)")
VARS[("min_air_temperature", "gesdisc")] = VarDef(
    "min_air_temperature", "gesdisc", "Temperatura mínima", _TMIN_DEF, "reanalysis", "°C", "mean_day_weighted",
    False, "°C/década", T_BREAKS, _TMIN_SPEC, MERRA2_GRID, 1980, "T2MMIN",
    "K → °C (− 273,15)")

VARIABLE_IDS = (
    "air_temperature",
    "precipitation",
    "soil_moisture",
    "evapotranspiration",
    "specific_humidity",
    "total_precipitable_water",
    "total_ozone",
    "runoff",
    "snow_water_equivalent",
    "soil_temperature",
    "aerosol_optical_depth",
    "dust_optical_depth",
    "max_air_temperature",
    "min_air_temperature",
)


def get(var_id: str, source: str) -> VarDef:
    try:
        return VARS[(var_id, source)]
    except KeyError:
        raise KeyError(f"Variable desconocida: {var_id!r} con la fuente {source!r}. "
                       f"Variables: {', '.join(VARIABLE_IDS)}; fuentes: gesdisc, power.") from None
