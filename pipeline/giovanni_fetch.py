"""Descarga de Giovanni la serie mensual promediada por área (servicio ArAvTs) y la deja en validation/giovanni/
con el formato que lee `validate_real.py giovanni` (medias o sumas anuales por año).

    python giovanni_fetch.py --region US-MD --var runoff
    python giovanni_fetch.py --region US-DC --var runoff --bbox -77.25,38.75,-76.75,39.25 --tag celda

Usa el mismo servicio que la web de Giovanni (`daac-bin/service_manager.pl`), por tramos de tres meses, y baja el CSV con el inicio de sesión
de Earthdata (`~/.netrc`), así que el resultado es el mismo que exportarlo a mano. Antes de esto, T040 y T041
quedaban pendientes porque «Giovanni exige exportar a mano».
"""

from __future__ import annotations

import argparse
import calendar
import csv
import io
import json
import sys
import time
from pathlib import Path

import socket

import requests
import urllib3.util.connection

from sources.base import now_utc

# En redes con IPv6 roto las conexiones a Giovanni y a Earthdata se quedan en SYN_SENT hasta agotar el plazo
# antes de caer a IPv4, y cada tramo pierde hasta dos minutos (visto el 2026-11-15). Se fuerza IPv4.
urllib3.util.connection.allowed_gai_family = lambda: socket.AF_INET

BASE = "https://giovanni.gsfc.nasa.gov/giovanni/"
OUT_DIR = Path(__file__).resolve().parent / "validation" / "giovanni"

# tl_2014_us_state: identificador de forma en Giovanni (getProvisionedShapefiles.py, campo NAME).
SHAPES = {"US-MD": ("shp_4", "Maryland"), "US-VA": ("shp_52", "Virginia"), "US-DC": ("shp_53", "District of Columbia"),
          "US-AZ": ("shp_55", "Arizona"), "US-TX": ("shp_25", "Texas"), "US-NM": ("shp_12", "New Mexico")}

# Variable del catálogo → campos de Giovanni que se suman, factor a la unidad mensual del pipeline y periodo.
VARS = {
    "runoff": {"fields": ["GLDAS_NOAH025_M_2_1_Qs_acc", "GLDAS_NOAH025_M_2_1_Qsb_acc"], "factor": 8.0,
               "first": 2000, "last": 2025, "units_giovanni": "kg m-2 (acumulado medio por paso de 3 h)",
               "annual_method": "(Qs_acc + Qsb_acc) × 8 pasos/día × días del mes, sumado en 12 meses, mm"},
    "dust_optical_depth": {"fields": ["M2TMNXAER_5_12_4_DUEXTTAU"], "factor": 1.0, "first": 2003, "last": 2025,
                           "units_giovanni": "1",
                           "annual_method": "media de 12 meses ponderada por días, adimensional"},
    # Referencia independiente para T041: MODIS Aqua Deep Blue (AOD total, no solo polvo). MERRA-2 asimila el
    # producto Dark Target de MODIS, no el Deep Blue sobre tierra, así que no es la misma información de entrada.
    "modis_deep_blue_aod": {"fields": ["MYD08_M3_6_1_Deep_Blue_Aerosol_Optical_Depth_550_Land_Mean_Mean"],
                            "factor": 1.0, "first": 2003, "last": 2025, "units_giovanni": "1",
                            "annual_method": "media de 12 meses ponderada por días, adimensional"},
}


def run_job(s: requests.Session, field: str, start: str, end: str, shape: str | None, bbox: str | None) -> str:
    """Lanza el trabajo, espera a que termine y devuelve la URL del CSV."""
    q = {"service": "ArAvTs", "starttime": start, "endtime": end, "data": field, "portal": "GIOVANNI", "format": "json"}
    q.update({"shape": shape} if shape else {"bbox": bbox})
    r = s.get(BASE + "daac-bin/service_manager.pl", params=q, timeout=(15, 120)).json()["session"]
    ids = {"session": r["id"], "resultset": r["resultset"][0]["id"], "result": r["resultset"][0]["result"][0]["id"]}
    for _ in range(360):
        time.sleep(5)
        res = s.get(BASE + "daac-bin/service_manager.pl", params={**ids, "portal": "GIOVANNI", "format": "json"},
                    timeout=120).json()["session"]["resultset"][0]["result"][0]
        st = res["status"][0]
        if st["code"][0]["value"] != "0":
            raise RuntimeError(f"Giovanni falló con {field}: {st['message'][0]['value'][:200]}")
        if st["percentComplete"][0]["value"] == "100":
            urls = res["data"][0]["fileGroup"][0]["dataFile"][0]["dataUrl"]
            return BASE + next(u["value"] for u in urls if u["label"].endswith(".csv"))
    raise TimeoutError(f"Giovanni no terminó {field} en 30 min")


def read_csv(s: requests.Session, url: str) -> dict[tuple[int, int], float]:
    """El CSV trae unas líneas de cabecera y luego `time,valor`; se toman las filas con fecha."""
    r = s.get(url, timeout=300)
    r.raise_for_status()
    out = {}
    for row in csv.reader(io.StringIO(r.text)):
        if len(row) >= 2 and row[0][:4].isdigit() and row[0][4:5] == "-":
            try:
                out[(int(row[0][:4]), int(row[0][5:7]))] = float(row[1])
            except ValueError:
                continue
    if not out:
        raise RuntimeError(f"CSV de Giovanni sin filas de datos: {r.text[:300]!r}")
    return out


def fetch_field(s: requests.Session, field: str, first: int, last: int, shape: str | None, bbox: str | None,
                chunk_months: int = 3, workers: int = 4, tries: int = 4) -> dict[tuple[int, int], float]:
    """Giovanni rechaza los trabajos de un año o más («Workflow failed») y acepta los de tres meses: se pide por
    tramos, cuatro a la vez, con reintentos, y se une la serie."""
    from concurrent.futures import ThreadPoolExecutor

    chunks = []
    for y in range(first, last + 1):
        for m0 in range(1, 13, chunk_months):
            m1 = m0 + chunk_months - 1
            chunks.append((f"{y}-{m0:02d}-01T00:00:00Z", f"{y}-{m1:02d}-{calendar.monthrange(y, m1)[1]}T23:59:59Z"))

    def one(c):
        for k in range(tries):
            try:
                return read_csv(s, run_job(s, field, c[0], c[1], shape, bbox))
            except (RuntimeError, TimeoutError, requests.RequestException, KeyError, ValueError) as e:
                err = e
                time.sleep(10 * (k + 1))
        raise RuntimeError(f"{field} {c[0][:7]}–{c[1][:7]}: {err}")

    out: dict[tuple[int, int], float] = {}
    with ThreadPoolExecutor(workers) as ex:
        for i, part in enumerate(ex.map(one, chunks), 1):
            out.update(part)
            if i % 8 == 0 or i == len(chunks):
                print(f"  {field}: {i}/{len(chunks)} tramos", flush=True)
    print(f"  {field}: {len(out)} meses en {len(chunks)} tramos", flush=True)
    return out


def annual(monthly: dict[tuple[int, int], float], aggregation: str) -> dict[str, float]:
    out = {}
    for y in sorted({y for y, _ in monthly}):
        vals = [(m, monthly.get((y, m))) for m in range(1, 13)]
        if any(v is None or v != v or v <= -9000 for _, v in vals):
            continue
        days = [calendar.monthrange(y, m)[1] for m, _ in vals]
        tot = sum(v * d for (_, v), d in zip(vals, days))
        out[str(y)] = round(tot / sum(days) if aggregation == "mean" else tot, 6)
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--region", required=True)
    ap.add_argument("--var", required=True, choices=list(VARS))
    ap.add_argument("--bbox", default=None, help="oeste,sur,este,norte; sustituye la forma del estado")
    ap.add_argument("--tag", default=None, help="sufijo del archivo (p. ej. celda)")
    a = ap.parse_args(argv)
    v = VARS[a.var]
    shape = None if a.bbox else f"tl_2014_us_state/{SHAPES[a.region][0]}"
    start, end = f"{v['first']}-01-01T00:00:00Z", f"{v['last']}-12-31T23:59:59Z"
    s = requests.Session()  # requests toma ~/.netrc para urs.earthdata.nasa.gov al seguir la redirección
    parts = [fetch_field(s, field, v["first"], v["last"], shape, a.bbox) for field in v["fields"]]
    common = set.intersection(*(set(p) for p in parts))
    monthly = {k: sum(p[k] for p in parts) * v["factor"] for k in sorted(common)}
    aggregation = "sum_from_rate" if a.var == "runoff" else "mean"
    ann = annual(monthly, aggregation)
    where = f"bbox={a.bbox}" if a.bbox else f"shape={shape}"
    rep = {"region": a.region, "variable": a.var, "service": "Time Series, Area-Averaged (ArAvTs)",
           "giovanni_variable": " + ".join(v["fields"]),
           "shape": f"bbox {a.bbox}" if a.bbox else f"{shape} ({SHAPES[a.region][1]})",
           "units_giovanni": v["units_giovanni"],
           "url_to_reproduce": [f"{BASE}#service=ArAvTs&starttime={start}&endtime={end}&{where}&data={f}"
                                for f in v["fields"]],
           "retrieved": now_utc()[:10], "retrieved_by": "giovanni_fetch.py (service_manager.pl + CSV)",
           "months": len(monthly), "annual_method": v["annual_method"], "annual": ann}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{a.region}_{a.var}{'_' + a.tag if a.tag else ''}.json"
    (OUT_DIR / name).write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    print(name, len(monthly), "meses,", len(ann), "años")
    return 0


if __name__ == "__main__":
    sys.exit(main())
