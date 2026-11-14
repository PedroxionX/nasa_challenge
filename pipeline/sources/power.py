"""Alternativa NASA POWER (solo con --source power; nunca se activa sola). Envuelve power_regional.Downloader."""

from __future__ import annotations

from typing import Any

import numpy as np

from power_regional import Downloader, DownloadFailed, merge_grids, tiles_for_bounds
from sources.base import GridData, ReadFailed, SourceInfo


class PowerSource:
    id = "power"

    def __init__(self, downloader: Downloader | None = None):
        self.downloader = downloader or Downloader()

    @property
    def manifest(self) -> list[dict[str, Any]]:
        return self.downloader.manifest

    def read(self, var, regions, weights, union_lats, union_lons, first_year: int, end_year: int) -> GridData:
        spec = var.spec
        tiles_by_region = {r.id: tiles_for_bounds(r.bbox) for r in regions if weights[r.id].n_cells}
        all_tiles = sorted({t for ts in tiles_by_region.values() for t in ts})
        try:
            grids = self.downloader.fetch_many(spec, all_tiles, max(first_year, 1981), end_year)
        except DownloadFailed as exc:
            failed = {f["tile"] for f in exc.failures}
            affected = sorted(r for r, ts in tiles_by_region.items() if any(t.label in failed for t in ts))
            raise ReadFailed([{"variable": var.id, "item": f["tile"], "error": f["error"]} for f in exc.failures],
                             affected) from exc
        merged = merge_grids(list(grids.values()))
        times = {e["tile"]: e["retrieved_at_utc"] for e in self.manifest
                 if e.get("variable") == spec.code and e["status"] == "ok"}
        info = SourceInfo(
            source="NASA POWER — API mensual regional", product="+".join(merged.sources),
            short_name="POWER", version=merged.api_version or "", doi=None,
            api_version=f"NASA POWER API {merged.api_version}", parameter=var.parameter,
            unit_declared=merged.unit_declared, grid_text=var.grid.text)
        return GridData(
            merged.lats, merged.lons, merged.months, merged.values.astype(float), info,
            retrieved_by_region={r: max(times[t.label] for t in ts) for r, ts in tiles_by_region.items()},
            granules_by_region={r: len(ts) for r, ts in tiles_by_region.items()})
