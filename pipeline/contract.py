"""Validador del contrato de archivos (specs/001-trend-explorer-mvp/contracts/data-files.md), sin dependencias.

Cada función devuelve la lista de problemas encontrados; `assert_valid` la convierte en `ContractError`.
El pipeline valida cada archivo antes de escribir nada (FR-D05).
"""

from __future__ import annotations

import math
from typing import Any

SCHEMA_VERSION = 1
MIN_WINDOW = 10
STATUSES = {"increasing", "decreasing", "inconclusive", "insufficient", "invalid"}
FLAGS = {"autocorr", "step", "short", "ties", "small_region"}
WINDOW_COLUMNS = ["start", "end", "n", "slope_decade", "ci_low", "ci_high", "p", "p_uncorrected",
                  "r1", "ols_slope_decade", "ols_p", "status", "flags"]
# Columnas opcionales al final (pedido de 004, 2026-11-14): cambio relativo en % por década, base = media de los
# valores anuales de la ventana × 100. null en variables sin relative_change o si la media es ≤ 0.
PCT_COLUMNS = ["slope_decade_pct", "ci_low_pct", "ci_high_pct"]
WINDOW_COLUMNS_PCT = WINDOW_COLUMNS + PCT_COLUMNS
PROVENANCE_FIELDS = ["source", "product", "api_version", "parameter", "unit_declared", "grid", "spatial_method",
                     "n_cells", "retrieved_at_utc", "requests", "transformations", "is_synthetic"]
FORBIDDEN_KEY_FRAGMENTS = ("detect",)  # «años para detectar» no se publica (constitución, metodología §7)


class ContractError(ValueError):
    def __init__(self, name: str, problems: list[str]):
        self.problems = problems
        super().__init__(f"{name} no cumple el contrato: " + "; ".join(problems[:10])
                         + (f" (y {len(problems) - 10} más)" if len(problems) > 10 else ""))


def _walk(obj: Any, path: str = "$"):
    yield path, obj
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _walk(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from _walk(v, f"{path}[{i}]")


def _common(doc: Any) -> list[str]:
    errs = []
    if not isinstance(doc, dict):
        return ["el documento no es un objeto JSON"]
    if doc.get("schema_version") != SCHEMA_VERSION:
        errs.append(f"schema_version debe ser {SCHEMA_VERSION}")
    for path, v in _walk(doc):
        if isinstance(v, float) and not math.isfinite(v):
            errs.append(f"{path}: NaN o infinito (usar null)")
        if isinstance(v, dict):
            for k in v:
                if any(f in k.lower() for f in FORBIDDEN_KEY_FRAGMENTS):
                    errs.append(f"{path}.{k}: campo prohibido (años para detectar)")
    return errs


def _num(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def window_keys(first_year: int, last_year: int) -> list[tuple[int, int]]:
    return [(s, e) for s in range(first_year, last_year + 1) for e in range(s, last_year + 1) if e - s + 1 >= MIN_WINDOW]


def validate_series(doc: Any, first_year: int | None = None, last_year: int | None = None) -> list[str]:
    errs = _common(doc)
    if not isinstance(doc, dict):
        return errs
    for k in ("region", "variable", "unit"):
        if not isinstance(doc.get(k), str) or not doc.get(k):
            errs.append(f"falta '{k}'")
    years, values = doc.get("years"), doc.get("values")
    if not isinstance(years, list) or not isinstance(values, list) or len(years) != len(values):
        errs.append("'years' y 'values' deben ser listas paralelas")
    elif years != sorted(set(years)):
        errs.append("'years' debe ser creciente y sin repetidos")
    if not isinstance(doc.get("excluded_years"), list):
        errs.append("falta 'excluded_years'")
    pv = doc.get("provenance")
    if not isinstance(pv, dict):
        errs.append("falta 'provenance'")
    else:
        for f in PROVENANCE_FIELDS:
            if f not in pv:
                errs.append(f"provenance.{f} falta")
        if not isinstance(pv.get("is_synthetic"), bool):
            errs.append("provenance.is_synthetic debe ser booleano")
        if not isinstance(pv.get("transformations"), list):
            errs.append("provenance.transformations debe ser una lista")
    diag = doc.get("diagnostics")
    if not isinstance(diag, dict) or "step_year" not in diag or "autocorr_significant" not in diag:
        errs.append("falta 'diagnostics' con step_year y autocorr_significant")
    win = doc.get("windows")
    if (not isinstance(win, dict) or win.get("columns") not in (WINDOW_COLUMNS, WINDOW_COLUMNS_PCT)
            or not isinstance(win.get("rows"), list)):
        errs.append("'windows' debe tener las columnas del contrato (más, opcionalmente, las de %) y una lista 'rows'")
        return errs
    columns = win["columns"]
    seen = []
    for i, row in enumerate(win["rows"]):
        if not isinstance(row, list) or len(row) != len(columns):
            errs.append(f"fila {i}: longitud distinta de las columnas")
            continue
        r = dict(zip(columns, row))
        if columns == WINDOW_COLUMNS_PCT:
            pct = [r[c] for c in PCT_COLUMNS]
            if any(v is not None and not _num(v) for v in pct):
                errs.append(f"fila {i}: columnas de % deben ser número o null")
            elif all(_num(v) for v in pct) and not (r["ci_low_pct"] <= r["slope_decade_pct"] <= r["ci_high_pct"]):
                errs.append(f"fila {i}: no se cumple ci_low_pct ≤ slope_decade_pct ≤ ci_high_pct")
            elif any(v is None for v in pct) and any(v is not None for v in pct):
                errs.append(f"fila {i}: las columnas de % van todas con valor o todas en null")
            if all(_num(v) for v in pct) and not _num(r["slope_decade"]):
                errs.append(f"fila {i}: hay % sin slope_decade")
        tag = f"fila {i} ({r['start']}-{r['end']})"
        seen.append((r["start"], r["end"]))
        if not (isinstance(r["start"], int) and isinstance(r["end"], int)) or r["end"] - r["start"] + 1 < MIN_WINDOW:
            errs.append(f"{tag}: ventana de menos de {MIN_WINDOW} años no debe tener fila")
        if r["status"] not in STATUSES:
            errs.append(f"{tag}: status '{r['status']}' no permitido")
        if not isinstance(r["n"], int) or r["n"] < 0:
            errs.append(f"{tag}: n debe ser entero ≥ 0")
        elif r["n"] < MIN_WINDOW and r["status"] != "insufficient":
            errs.append(f"{tag}: n = {r['n']} < {MIN_WINDOW} exige status 'insufficient'")
        if r["status"] in ("increasing", "decreasing", "inconclusive"):
            for c in ("slope_decade", "ci_low", "ci_high", "p"):
                if not _num(r[c]):
                    errs.append(f"{tag}: {c} es obligatorio con status '{r['status']}'")
        if all(_num(r[c]) for c in ("slope_decade", "ci_low", "ci_high")) and not (r["ci_low"] <= r["slope_decade"] <= r["ci_high"]):
            errs.append(f"{tag}: no se cumple ci_low ≤ slope_decade ≤ ci_high")
        for c in ("p", "p_uncorrected", "ols_p"):
            if r[c] is not None and not (_num(r[c]) and 0 <= r[c] <= 1):
                errs.append(f"{tag}: {c} debe estar en [0, 1] o ser null")
        if r["status"] == "increasing" and _num(r["slope_decade"]) and r["slope_decade"] <= 0:
            errs.append(f"{tag}: 'increasing' con pendiente ≤ 0")
        if r["status"] == "decreasing" and _num(r["slope_decade"]) and r["slope_decade"] >= 0:
            errs.append(f"{tag}: 'decreasing' con pendiente ≥ 0")
        if not isinstance(r["flags"], list) or set(r["flags"]) - FLAGS:
            errs.append(f"{tag}: flags no permitidos {r['flags']}")
    if first_year is not None and last_year is not None and sorted(seen) != window_keys(first_year, last_year):
        errs.append(f"las filas no son exactamente las ventanas de al menos {MIN_WINDOW} años entre {first_year} y {last_year}")
    return errs


def validate_map(doc: Any, series_by_region: dict[str, dict] | None = None) -> list[str]:
    errs = _common(doc)
    if not isinstance(doc, dict):
        return errs
    regions, windows = doc.get("regions"), doc.get("windows")
    if not isinstance(regions, list) or not isinstance(windows, dict):
        return errs + ["faltan 'regions' o 'windows'"]
    for key, vals in windows.items():
        if not isinstance(vals, list) or len(vals) != len(regions):
            errs.append(f"windows['{key}'] debe tener un valor por región")
        elif any(v is not None and not _num(v) for v in vals):
            errs.append(f"windows['{key}']: valores deben ser número o null")
    cls = doc.get("classes")
    if not isinstance(cls, dict) or len(cls.get("labels", [])) != len(cls.get("breaks", [])) + 1:
        errs.append("classes: debe haber una etiqueta más que cortes")
    if series_by_region is not None:
        for rid in regions:
            s = series_by_region.get(rid)
            if s is None:
                continue
            keys = {f"{r[0]}-{r[1]}" for r in s["windows"]["rows"]}
            if keys != set(windows):
                errs.append(f"las llaves del mapa no coinciden con las ventanas de {rid}")
                break
    return errs


def validate_catalog(doc: Any) -> list[str]:
    errs = _common(doc)
    if not isinstance(doc, dict):
        return errs
    for k in ("built_at_utc", "alpha", "period", "method", "variables", "regions"):
        if k not in doc:
            errs.append(f"falta '{k}'")
    for r in doc.get("regions", []):
        if not {"id", "name", "country", "n_cells", "small_region"} <= set(r):
            errs.append(f"región incompleta: {r.get('id')}")
    for v in doc.get("variables", []):
        if not {"id", "label", "definition", "kind", "unit_annual", "aggregation", "relative_change"} <= set(v):
            errs.append(f"variable incompleta: {v.get('id')}")
    return errs


def assert_valid(name: str, problems: list[str]) -> None:
    if problems:
        raise ContractError(name, problems)
