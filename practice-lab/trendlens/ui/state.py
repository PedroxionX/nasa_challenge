"""Configuración del laboratorio, acceso a datos con caché y contexto compartido entre pantallas."""

from __future__ import annotations

import datetime as _dt
import hashlib
from dataclasses import dataclass, field

import streamlit as st

from ..config import PRESETS_BY_ID, VARIABLES, Location
from ..data.base import DataSourceError
from ..data.csv_source import CsvFormat, load_monthly_csv
from ..data.nasa_power import NasaPowerSource
from ..data.synthetic import SCENARIOS, generate_monthly
from ..processing import DataQualityError
from ..schema import SeriesBundle
from ..stats.compare import ComparisonResult, compare_results
from ..stats.engine import TrendResult, analyze_bundle


@dataclass(frozen=True)
class CsvSpec:
    """Un archivo CSV subido + cómo interpretarlo + la procedencia que declara el usuario."""

    content: bytes = field(repr=False)
    filename: str
    date_column: str
    value_column: str
    fmt: CsvFormat
    source_name: str
    product: str
    spatial_resolution: str
    declared_synthetic: bool

    @property
    def digest(self) -> str:
        return hashlib.sha256(self.content).hexdigest()[:12]


@dataclass(frozen=True)
class SiteSpec:
    slot: str
    kind: str  # "synthetic" | "power" | "csv"
    scenario: str | None = None
    loc_id: str | None = None
    name: str | None = None
    lat: float | None = None
    lon: float | None = None
    csv: CsvSpec | None = None
    pending: str | None = None  # qué falta para poder cargar (solo CSV)

    def location(self) -> Location:
        if self.kind == "power":
            preset = PRESETS_BY_ID.get(self.loc_id or "")
            if preset is not None:
                return preset
            return Location(self.loc_id or f"custom_{self.slot}", self.name or f"Punto {self.slot}",
                            float(self.lat), float(self.lon), "Coordenadas introducidas por el usuario.")
        if self.kind == "csv":
            lat = float("nan") if self.lat is None else float(self.lat)
            lon = float("nan") if self.lon is None else float(self.lon)
            return Location(f"csv_{self.slot}", self.name or f"Sitio {self.slot} (CSV)", lat, lon,
                            "Serie cargada desde CSV por el usuario.")
        return Location(f"synthetic_{self.slot}", f"Sitio sintético {self.slot}", float("nan"), float("nan"))

    @property
    def label(self) -> str:
        if self.kind == "synthetic":
            return f"Sitio sintético {self.slot} · «{SCENARIOS[self.scenario].name_es}»"
        return self.location().name


@dataclass(frozen=True)
class LabConfig:
    mode: str  # "synthetic" | "power" | "csv"
    code: str
    site_a: SiteSpec
    site_b: SiteSpec
    start: int
    end: int
    alpha: float
    reference: tuple[int, int]
    nonce: int = 0
    csv_declared_synthetic: bool = False

    @property
    def variable(self):
        return VARIABLES[self.code]

    @property
    def synthetic(self) -> bool:
        """¿Es el modo de escenarios sintéticos del laboratorio?"""
        return self.mode == "synthetic"

    @property
    def data_is_synthetic(self) -> bool:
        """¿Los datos son sintéticos (escenarios del laboratorio o CSV declarado sintético)?"""
        return self.mode == "synthetic" or (self.mode == "csv" and self.csv_declared_synthetic)

    def question(self) -> str:
        var = self.variable.name_es.lower()
        if self.synthetic:
            return (f"¿Qué tendencia de {var} muestran el sitio sintético A («{SCENARIOS[self.site_a.scenario].name_es}») "
                    f"y el B («{SCENARIOS[self.site_b.scenario].name_es}») entre {self.start} y {self.end}, "
                    "y coincide con la verdad conocida del escenario?")
        tail = " (series cargadas desde CSV)" if self.mode == "csv" else ""
        return (f"¿Cambió la {var} en {self.site_a.label} y en {self.site_b.label} entre {self.start} y {self.end}{tail}? "
                "¿En el mismo sentido o en sentidos opuestos?")


@dataclass
class AnalysisContext:
    cfg: LabConfig
    results: dict[str, TrendResult] = field(default_factory=dict)
    errors: dict[str, str] = field(default_factory=dict)
    error_details: dict[str, str] = field(default_factory=dict)
    pending: dict[str, str] = field(default_factory=dict)  # falta información del usuario (no es un error)
    comparison: ComparisonResult | None = None

    @property
    def ok(self) -> bool:
        return len(self.results) == 2


# ------------------------------------------------------------------------------------------
@st.cache_data(show_spinner=False, max_entries=64)
def _synthetic_bundle(scenario: str, code: str, slot: str) -> SeriesBundle:
    return generate_monthly(SCENARIOS[scenario], VARIABLES[code], slot)


@st.cache_data(show_spinner=False, ttl=6 * 3600, max_entries=64)
def _power_bundle(code: str, spec: SiteSpec, nonce: int) -> SeriesBundle:
    return NasaPowerSource().fetch(VARIABLES[code], spec.location(), 1981, _dt.date.today().year,
                                   force_refresh=nonce > 0)


def csv_bundle(code: str, spec: SiteSpec) -> SeriesBundle:
    c = spec.csv
    var = VARIABLES[code]
    return load_monthly_csv(c.content, var, spec.location(), unit=var.native_unit, source_name=c.source_name,
                            product=c.product, date_column=c.date_column, value_column=c.value_column, fmt=c.fmt,
                            is_synthetic=c.declared_synthetic, spatial_resolution=c.spatial_resolution,
                            filename=c.filename)


@st.cache_data(show_spinner=False, max_entries=256)
def _analysis(code: str, spec: SiteSpec, start: int, end: int, alpha: float, nonce: int) -> TrendResult:
    if spec.kind == "synthetic":
        bundle = _synthetic_bundle(spec.scenario, code, spec.slot)
    elif spec.kind == "power":
        bundle = _power_bundle(code, spec, nonce)
    else:
        bundle = csv_bundle(code, spec)
    return analyze_bundle(bundle, start, end, alpha)


def compute(cfg: LabConfig) -> AnalysisContext:
    ctx = AnalysisContext(cfg)
    for spec in (cfg.site_a, cfg.site_b):
        if spec.pending:
            ctx.pending[spec.slot] = spec.pending
            continue
        try:
            ctx.results[spec.slot] = _analysis(cfg.code, spec, cfg.start, cfg.end, cfg.alpha, cfg.nonce)
        except DataSourceError as exc:
            ctx.errors[spec.slot] = exc.user_message
            ctx.error_details[spec.slot] = exc.details or ""
        except DataQualityError as exc:
            ctx.errors[spec.slot] = f"Problema de calidad de datos: {exc}"
    if ctx.ok:
        ctx.comparison = compare_results(ctx.results["A"], ctx.results["B"])
    return ctx


def get_ctx() -> AnalysisContext:
    return st.session_state["ctx"]
