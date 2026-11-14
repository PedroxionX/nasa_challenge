"""Las 84 regiones del MVP: identificador ISO 3166-2, nombre en español y país.

Los identificadores coinciden con la propiedad `id` de `web/public/data/{mx,us}-states.geojson`.
Los nombres en español salen de `docs/regiones-mvp-giovanni.md` (el GeoJSON de EE. UU. los trae en inglés).
"""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
GEOJSON_FILES = {
    "MX": REPO_ROOT / "web" / "public" / "data" / "mx-states.geojson",
    "US": REPO_ROOT / "web" / "public" / "data" / "us-states.geojson",
}

NAMES_ES: dict[str, str] = {
    "MX-AGU": "Aguascalientes", "MX-BCN": "Baja California", "MX-BCS": "Baja California Sur",
    "MX-CAM": "Campeche", "MX-CHP": "Chiapas", "MX-CHH": "Chihuahua", "MX-CMX": "Ciudad de México",
    "MX-COA": "Coahuila", "MX-COL": "Colima", "MX-DUR": "Durango", "MX-GUA": "Guanajuato",
    "MX-GRO": "Guerrero", "MX-HID": "Hidalgo", "MX-JAL": "Jalisco", "MX-MEX": "México (Estado de)",
    "MX-MIC": "Michoacán", "MX-MOR": "Morelos", "MX-NAY": "Nayarit", "MX-NLE": "Nuevo León",
    "MX-OAX": "Oaxaca", "MX-PUE": "Puebla", "MX-QUE": "Querétaro", "MX-ROO": "Quintana Roo",
    "MX-SLP": "San Luis Potosí", "MX-SIN": "Sinaloa", "MX-SON": "Sonora", "MX-TAB": "Tabasco",
    "MX-TAM": "Tamaulipas", "MX-TLA": "Tlaxcala", "MX-VER": "Veracruz", "MX-YUC": "Yucatán",
    "MX-ZAC": "Zacatecas",
    "US-AL": "Alabama", "US-AK": "Alaska", "US-AZ": "Arizona", "US-AR": "Arkansas", "US-CA": "California",
    "US-CO": "Colorado", "US-CT": "Connecticut", "US-DE": "Delaware", "US-DC": "Distrito de Columbia",
    "US-FL": "Florida", "US-GA": "Georgia", "US-HI": "Hawái", "US-ID": "Idaho", "US-IL": "Illinois",
    "US-IN": "Indiana", "US-IA": "Iowa", "US-KS": "Kansas", "US-KY": "Kentucky", "US-LA": "Luisiana",
    "US-ME": "Maine", "US-MD": "Maryland", "US-MA": "Massachusetts", "US-MI": "Míchigan",
    "US-MN": "Minnesota", "US-MS": "Misisipi", "US-MO": "Misuri", "US-MT": "Montana", "US-NE": "Nebraska",
    "US-NV": "Nevada", "US-NH": "Nuevo Hampshire", "US-NJ": "Nueva Jersey", "US-NM": "Nuevo México",
    "US-NY": "Nueva York", "US-NC": "Carolina del Norte", "US-ND": "Dakota del Norte", "US-OH": "Ohio",
    "US-OK": "Oklahoma", "US-OR": "Oregón", "US-PA": "Pensilvania", "US-RI": "Rhode Island",
    "US-SC": "Carolina del Sur", "US-SD": "Dakota del Sur", "US-TN": "Tennessee", "US-TX": "Texas",
    "US-UT": "Utah", "US-VT": "Vermont", "US-VA": "Virginia", "US-WA": "Washington",
    "US-WV": "Virginia Occidental", "US-WI": "Wisconsin", "US-WY": "Wyoming", "US-PR": "Puerto Rico",
}

ALL_REGION_IDS: tuple[str, ...] = tuple(sorted(NAMES_ES))
assert len(ALL_REGION_IDS) == 84
