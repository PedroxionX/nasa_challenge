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


@dataclass(frozen=True)
class GridSpec:
    """Malla regular: centros en lat0 + i·dlat y lon0 + j·dlon."""

    name: str
    dlat: float
    dlon: float
    lat0: float
    lon0: float
    text: str


MERRA2_GRID = GridSpec("merra2", 0.5, 0.625, 0.0, 0.0, "0.5° × 0.625°")  # también la de NASA POWER
IMERG_GRID = GridSpec("imerg", 0.1, 0.1, 0.05, 0.05, "0.1° × 0.1°")


def candidate_cells(bounds: tuple[float, float, float, float], grid: GridSpec = MERRA2_GRID
                    ) -> tuple[np.ndarray, np.ndarray]:
    """Centros de todas las celdas cuyo rectángulo puede tocar la caja (oeste, sur, este, norte)."""
    w, s, e, n = bounds
    i0 = int(np.floor((s - grid.dlat / 2 - grid.lat0) / grid.dlat))
    i1 = int(np.ceil((n + grid.dlat / 2 - grid.lat0) / grid.dlat))
    j0 = int(np.floor((w - grid.dlon / 2 - grid.lon0) / grid.dlon))
    j1 = int(np.ceil((e + grid.dlon / 2 - grid.lon0) / grid.dlon))
    lats = np.round(grid.lat0 + np.arange(i0, i1 + 1) * grid.dlat, 6)
    lons = np.round(grid.lon0 + np.arange(j0, j1 + 1) * grid.dlon, 6)
    lats = lats[(lats >= -90) & (lats <= 90)]
    lons = lons[(lons >= -180) & (lons <= 180)]
    la, lo = np.meshgrid(lats, lons, indexing="ij")
    return la.ravel(), lo.ravel()


def cell_boxes(lats: np.ndarray, lons: np.ndarray, grid: GridSpec = MERRA2_GRID) -> np.ndarray:
    return shapely.box(lons - grid.dlon / 2, lats - grid.dlat / 2, lons + grid.dlon / 2, lats + grid.dlat / 2)


def region_weights(geom: BaseGeometry, grid: GridSpec = MERRA2_GRID) -> CellWeights:
    """Fracción cubierta y peso de cada celda que toca el polígono (solo celdas con fracción > 0).

    Las celdas enteramente dentro del polígono tienen fracción 1 sin calcular la intersección; solo las del
    borde se recortan (necesario en la malla de 0,1°, donde un estado grande tiene decenas de miles de celdas).
    """
    if geom.is_empty or geom.area == 0:
        empty = np.array([], dtype=float)
        return CellWeights(empty, empty, empty, empty)
    lats, lons = candidate_cells(geom.bounds, grid)
    boxes = cell_boxes(lats, lons, grid)
    shapely.prepare(geom)
    touching = shapely.intersects(geom, boxes)
    lats, lons, boxes = lats[touching], lons[touching], boxes[touching]
    inside = shapely.contains_properly(geom, boxes)
    frac = np.ones(len(boxes))
    edge = ~inside
    if edge.any():
        frac[edge] = shapely.area(shapely.intersection(boxes[edge], geom)) / (grid.dlat * grid.dlon)
    keep = frac > _MIN_FRACTION
    lats, lons, frac = lats[keep], lons[keep], np.minimum(frac[keep], 1.0)
    weights = np.cos(np.deg2rad(lats)) * frac
    return CellWeights(lats, lons, frac, weights)
