"""Polígono de un estado → pesos por celda de la cuadrícula MERRA-2 de NASA POWER (FR-D02).

Peso de una celda = cos(latitud del centro) × fracción de la celda cubierta por el polígono.
La fracción se mide en grados² (la celda es un rectángulo en lat/lon); el cos(latitud) corrige que
las celdas se encogen hacia los polos. Es el criterio que documenta Giovanni para promediar por formas.

Antes de calcular, toda geometría se recorta a longitudes en [−180°, 180°]: POWER no acepta otras.
En Alaska esto excluye las Aleutianas al oeste de 180° y se declara como transformación.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import shapely
from shapely.geometry import box, shape
from shapely.geometry.base import BaseGeometry

from regions import GEOJSON_FILES, NAMES_ES

CELL_DLAT = 0.5
CELL_DLON = 0.625
SMALL_REGION_MAX_CELLS = 2
_MIN_FRACTION = 1e-9  # por debajo es ruido numérico del recorte, no cobertura real
WORLD = box(-180.0, -90.0, 180.0, 90.0)
ANTIMERIDIAN_NOTE_AK = "Aleutianas al oeste de 180° excluidas"
ANTIMERIDIAN_NOTE = "Geometría al oeste de 180° excluida"


@dataclass
class Region:
    id: str
    name: str
    country: str
    geometry: BaseGeometry
    transformations: list[str] = field(default_factory=list)

    @property
    def bbox(self) -> tuple[float, float, float, float]:
        """(oeste, sur, este, norte) de la geometría ya recortada."""
        return tuple(float(v) for v in self.geometry.bounds)  # type: ignore[return-value]


@dataclass
class CellWeights:
    """Celdas con peso > 0 de una región, alineadas con los centros de la cuadrícula."""

    lats: np.ndarray
    lons: np.ndarray
    fractions: np.ndarray
    weights: np.ndarray

    @property
    def n_cells(self) -> int:
        return int(len(self.weights))

    @property
    def small_region(self) -> bool:
        return self.n_cells <= SMALL_REGION_MAX_CELLS


def clip_to_valid_longitudes(region_id: str, geom: BaseGeometry) -> tuple[BaseGeometry, list[str]]:
    """Recorta a [−180°, 180°]; si se pierde superficie, devuelve la transformación que lo declara."""
    minx, _, maxx, _ = geom.bounds
    if minx >= -180.0 and maxx <= 180.0:
        return geom, []
    clipped = shapely.make_valid(geom).intersection(WORLD)
    note = ANTIMERIDIAN_NOTE_AK if region_id == "US-AK" else ANTIMERIDIAN_NOTE
    return clipped, [note]


def load_regions(ids: list[str] | None = None, files: dict[str, Path] = GEOJSON_FILES) -> list[Region]:
    """Lee los GeoJSON de estados y devuelve las regiones pedidas (todas si `ids` es None), ordenadas por id."""
    found: dict[str, Region] = {}
    for country, path in files.items():
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        for feat in data["features"]:
            rid = feat["properties"]["id"]
            if ids is not None and rid not in ids:
                continue
            geom = shapely.make_valid(shape(feat["geometry"]))
            geom, notes = clip_to_valid_longitudes(rid, geom)
            found[rid] = Region(rid, NAMES_ES.get(rid, feat["properties"].get("name", rid)), country, geom, notes)
    wanted = sorted(found) if ids is None else list(ids)
    missing = [r for r in wanted if r not in found]
    if missing:
        raise KeyError(f"Regiones no encontradas en los GeoJSON: {missing}")
    return [found[r] for r in sorted(wanted)]


def candidate_cells(bounds: tuple[float, float, float, float]) -> tuple[np.ndarray, np.ndarray]:
    """Centros de todas las celdas cuyo rectángulo puede tocar la caja (oeste, sur, este, norte)."""
    w, s, e, n = bounds
    i0 = int(np.floor((s - CELL_DLAT / 2) / CELL_DLAT))
    i1 = int(np.ceil((n + CELL_DLAT / 2) / CELL_DLAT))
    j0 = int(np.floor((w - CELL_DLON / 2) / CELL_DLON))
    j1 = int(np.ceil((e + CELL_DLON / 2) / CELL_DLON))
    lats = np.arange(i0, i1 + 1) * CELL_DLAT
    lons = np.arange(j0, j1 + 1) * CELL_DLON
    lats = lats[(lats >= -90) & (lats <= 90)]
    lons = lons[(lons >= -180) & (lons <= 180)]
    la, lo = np.meshgrid(lats, lons, indexing="ij")
    return la.ravel(), lo.ravel()


def cell_boxes(lats: np.ndarray, lons: np.ndarray) -> np.ndarray:
    return shapely.box(lons - CELL_DLON / 2, lats - CELL_DLAT / 2, lons + CELL_DLON / 2, lats + CELL_DLAT / 2)


def region_weights(geom: BaseGeometry) -> CellWeights:
    """Fracción cubierta y peso de cada celda que toca el polígono (solo celdas con fracción > 0)."""
    if geom.is_empty or geom.area == 0:
        empty = np.array([], dtype=float)
        return CellWeights(empty, empty, empty, empty)
    lats, lons = candidate_cells(geom.bounds)
    boxes = cell_boxes(lats, lons)
    inter = shapely.area(shapely.intersection(boxes, geom))
    frac = inter / (CELL_DLAT * CELL_DLON)
    keep = frac > _MIN_FRACTION
    lats, lons, frac = lats[keep], lons[keep], np.minimum(frac[keep], 1.0)
    weights = np.cos(np.deg2rad(lats)) * frac
    return CellWeights(lats, lons, frac, weights)
