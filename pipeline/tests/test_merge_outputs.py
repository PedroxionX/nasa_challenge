"""Publicación parcial (T027): añadir variables sin tocar las publicadas. Datos SINTÉTICOS solo de prueba."""

import datetime as dt
import hashlib
import json

import pytest

import build
import contract
import merge_outputs
from test_build import FakeSource

REGIONS = ["US-DC", "US-RI"]
TODAY = dt.date(2026, 11, 14)


def run(out, var_ids):
    src = FakeSource()
    return build.build(REGIONS, var_ids, out, {v: src for v in var_ids}, manifest_dir=out.parent / "m", today=TODAY)


def digest(folder):
    return {p.relative_to(folder).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in folder.rglob("*.json") if p.name != "catalog.json"}


@pytest.fixture(scope="module")
def folders(tmp_path_factory):
    base = tmp_path_factory.mktemp("m")
    run(base / "pub", ["air_temperature"])
    run(base / "new", ["precipitation"])
    return base / "pub", base / "new"


def test_adds_variable_and_keeps_existing_files_identical(folders, tmp_path):
    pub, new = folders
    dst = tmp_path / "dst"
    import shutil
    shutil.copytree(pub, dst)
    before = digest(dst)
    assert merge_outputs.merge(new, dst) == ["precipitation"]
    after = digest(dst)
    assert all(after[k] == v for k, v in before.items())  # lo publicado, byte a byte igual
    assert any(k.startswith("series/precipitation/") for k in after)
    cat = json.loads((dst / "catalog.json").read_text(encoding="utf-8"))
    assert [v["id"] for v in cat["variables"]] == ["air_temperature", "precipitation"]
    assert cat["period"]["first_year"] == 1980 and contract.validate_catalog(cat) == []
    assert merge_outputs.validate_folder(cat, dst, {}) == []


def test_invalid_new_output_writes_nothing(folders, tmp_path):
    pub, new = folders
    import shutil
    dst, bad = tmp_path / "dst", tmp_path / "bad"
    shutil.copytree(pub, dst)
    shutil.copytree(new, bad)
    p = next((bad / "series" / "precipitation").glob("*.json"))
    s = json.loads(p.read_text(encoding="utf-8"))
    s["windows"]["rows"][0][11] = "quizás"
    p.write_text(json.dumps(s), encoding="utf-8")
    cat_before = (dst / "catalog.json").read_bytes()
    with pytest.raises(contract.ContractError):
        merge_outputs.merge(bad, dst)
    assert (dst / "catalog.json").read_bytes() == cat_before
    assert not (dst / "series" / "precipitation").exists()


def test_regions_must_match(folders, tmp_path):
    pub, new = folders
    cat_new = json.loads((new / "catalog.json").read_text(encoding="utf-8"))
    cat_new["regions"] = cat_new["regions"][:1]
    with pytest.raises(ValueError):
        merge_outputs.merged_catalog(json.loads((pub / "catalog.json").read_text(encoding="utf-8")), cat_new)
