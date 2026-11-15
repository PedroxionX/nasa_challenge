"""Pesos por celda (FR-D02, T003): geometrías de prueba hechas a mano y las geometrías reales de los estados."""

import numpy as np
import pytest
from shapely.geometry import Polygon, box

from regions import ALL_REGION_IDS
from weights import (ANTIMERIDIAN_NOTE_AK, CELL_DLAT, CELL_DLON, clip_to_valid_longitudes, load_regions,
                     region_weights)


def test_single_cell_region():
    """Un polígono dentro de una sola celda: una celda, fracción = área relativa, región pequeña."""
    poly = box(-115.1, 30.05, -114.9, 30.2)  # dentro de la celda centrada en (30.0, -115.0): 29.75–30.25
    w = region_weights(poly)
    assert w.n_cells == 1
    assert (w.lats[0], w.lons[0]) == (30.0, -115.0)
    assert w.fractions[0] == pytest.approx(poly.area / (CELL_DLAT * CELL_DLON))
    assert w.small_region


def test_fully_covered_cell_has_fraction_one():
    cell = box(-115.0 - CELL_DLON / 2, 30.0 - CELL_DLAT / 2, -115.0 + CELL_DLON / 2, 30.0 + CELL_DLAT / 2)
    w = region_weights(cell.buffer(0.01, join_style="mitre"))
    i = np.where((w.lats == 30.0) & (w.lons == -115.0))[0][0]
    assert w.fractions[i] == pytest.approx(1.0)
    assert w.weights[i] == pytest.approx(np.cos(np.deg2rad(30.0)))


def test_sum_of_covered_area_equals_polygon_area():
    poly = Polygon([(-110.2, 25.3), (-104.9, 26.1), (-106.3, 31.7), (-109.8, 30.2)])
    w = region_weights(poly)
    assert np.sum(w.fractions) * CELL_DLAT * CELL_DLON == pytest.approx(poly.area, rel=1e-9)
    assert not w.small_region


def test_two_cells_is_small_region_three_is_not():
    two = box(-115.2, 30.1, -114.5, 30.2)  # cruza el borde entre dos celdas de longitud
    assert region_weights(two).n_cells == 2 and region_weights(two).small_region
    three = box(-115.2, 30.1, -113.9, 30.2)
    assert region_weights(three).n_cells == 3 and not region_weights(three).small_region


def test_empty_geometry_has_no_cells():
    assert region_weights(Polygon()).n_cells == 0


def test_antimeridian_clip_synthetic_polygon():
    poly = box(-185.0, 52.0, -175.0, 54.0)
    clipped, notes = clip_to_valid_longitudes("US-AK", poly)
    assert clipped.bounds[0] >= -180.0
    assert clipped.area == pytest.approx(10.0)
    assert notes == [ANTIMERIDIAN_NOTE_AK]
    unchanged, none = clip_to_valid_longitudes("MX-BCN", box(-116, 30, -115, 31))
    assert none == [] and unchanged.equals(box(-116, 30, -115, 31))


def test_real_alaska_is_clipped_and_declared():
    (ak,) = load_regions(["US-AK"])
    assert ak.bbox[0] >= -180.0
    assert ak.transformations == [ANTIMERIDIAN_NOTE_AK]
    w = region_weights(ak.geometry)
    assert w.n_cells > 100 and np.all(w.lons >= -180.0)


def test_all_84_regions_load_and_have_cells():
    regions = load_regions()
    assert [r.id for r in regions] == list(ALL_REGION_IDS)
    for r in regions:
        w = region_weights(r.geometry)
        assert w.n_cells >= 1, r.id
        assert np.all(w.weights > 0), r.id
        if r.id != "US-AK":
            assert r.transformations == [], r.id


def test_known_small_regions_are_flagged():
    regions = {r.id: r for r in load_regions(["US-DC", "MX-CMX", "US-TX"])}
    assert region_weights(regions["US-DC"].geometry).small_region
    assert not region_weights(regions["US-TX"].geometry).small_region


# ---- malla de IMERG (0,1°, centros en ±0,05) ---------------------------------------------
from weights import IMERG_GRID, MERRA2_GRID  # noqa: E402


def test_imerg_single_cell_and_full_cell():
    poly = box(-100.08, 30.02, -100.02, 30.08)  # dentro de la celda centrada en (30.05, -100.05)
    w = region_weights(poly, IMERG_GRID)
    assert w.n_cells == 1 and (w.lats[0], w.lons[0]) == pytest.approx((30.05, -100.05))
    assert w.fractions[0] == pytest.approx(poly.area / 0.01)
    full = box(-100.1, 30.0, -100.0, 30.1).buffer(0.001, join_style="mitre")
    wf = region_weights(full, IMERG_GRID)
    i = np.argmin(np.abs(wf.lats - 30.05) + np.abs(wf.lons + 100.05))
    assert wf.fractions[i] == pytest.approx(1.0)


def test_imerg_sum_of_area_and_more_cells_than_merra2():
    poly = Polygon([(-110.2, 25.3), (-104.9, 26.1), (-106.3, 31.7), (-109.8, 30.2)])
    wi = region_weights(poly, IMERG_GRID)
    assert np.sum(wi.fractions) * 0.01 == pytest.approx(poly.area, rel=1e-9)
    assert wi.n_cells > 20 * region_weights(poly, MERRA2_GRID).n_cells


def test_real_alaska_imerg_cells_within_valid_longitudes():
    (ak,) = load_regions(["US-AK"])
    w = region_weights(ak.geometry, IMERG_GRID)
    assert w.n_cells > 10000 and np.all(w.lons >= -180.0)
