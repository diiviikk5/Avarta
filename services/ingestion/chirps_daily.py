"""Read a CHIRPS v2 daily 0.05-degree GeoTIFF from the official archive.

CHIRPS is an independent gridded rainfall estimate, not a point-gauge truth
field. Daily extreme verification needs caution because of its methodology.
"""

from __future__ import annotations

import gzip
import hashlib
import io
from datetime import date
from pathlib import Path
from urllib.request import Request, urlopen

import numpy as np
from PIL import Image


BASE = "https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/tifs/p05"


def source_url(day: date) -> str:
    return f"{BASE}/{day.year}/chirps-v2.0.{day:%Y.%m.%d}.tif.gz"


def download(day: date, cache_dir: Path = Path("data/raw")) -> Path:
    """Cache the official compressed TIFF; do not alter or commit source bytes."""
    destination = cache_dir / f"chirps-v2.0.{day:%Y.%m.%d}.tif.gz"
    if destination.exists():
        return destination
    cache_dir.mkdir(parents=True, exist_ok=True)
    request = Request(source_url(day), headers={"User-Agent": "Avarta research replay"})
    with urlopen(request, timeout=90) as response:
        payload = response.read()
    # Validate before replacing any cache file.
    with Image.open(io.BytesIO(gzip.decompress(payload))) as image:
        if image.mode != "F" or image.size != (7200, 2000):
            raise ValueError("Unexpected CHIRPS GeoTIFF raster")
    destination.write_bytes(payload)
    return destination


def read_crop(path: Path, domain: tuple[float, float, float, float]) -> tuple[np.ndarray, np.ndarray, np.ndarray, str]:
    """Return (rainfall, descending latitude centers, longitude centers, SHA256).

    Reads the GeoTIFF tie point and pixel scale instead of assuming array
    coordinates. Values below zero are product missing-data sentinels.
    """
    compressed = path.read_bytes()
    with Image.open(io.BytesIO(gzip.decompress(compressed))) as image:
        tiepoint = image.tag_v2.get(33922)
        scale = image.tag_v2.get(33550)
        if image.mode != "F" or not tiepoint or not scale:
            raise ValueError("Expected a floating-point georeferenced GeoTIFF")
        if abs(scale[0] - 0.05) > 1e-5 or abs(scale[1] - 0.05) > 1e-5:
            raise ValueError("Expected 0.05-degree CHIRPS grid")
        west_edge, north_edge = float(tiepoint[3]), float(tiepoint[4])
        lats = north_edge - (np.arange(image.height) + 0.5) * float(scale[1])
        lons = west_edge + (np.arange(image.width) + 0.5) * float(scale[0])
        south, north, west, east = domain
        rows = np.flatnonzero((lats >= south) & (lats <= north))
        cols = np.flatnonzero((lons >= west) & (lons <= east))
        if len(rows) == 0 or len(cols) == 0:
            raise ValueError("Requested domain misses the CHIRPS grid")
        crop = np.asarray(image.crop((int(cols[0]), int(rows[0]),
                                      int(cols[-1]) + 1, int(rows[-1]) + 1)), dtype=np.float32)
    crop = np.where(crop >= 0, crop, np.nan)
    return crop, lats[rows], lons[cols], hashlib.sha256(compressed).hexdigest()
