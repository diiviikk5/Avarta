"""Avarta Multi-Hazard Case Registry.

Provides unified registry and access to all supported hazard cases:
1. August 2025 Northwest India Extreme Rainfall (Existing GEFS x IMD replay)
2. May 2020 Super Cyclone Amphan (Bay of Bengal / Landfall Track & Vorticity)
3. May 2024 North India Severe Heatwave Dome (500 hPa Ridge & Wet-Bulb Stress)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from services.cases.cyclone_case import generate_cyclone_amphan_case
from services.cases.heatwave_case import generate_heatwave_case

ROOT = Path(__file__).resolve().parents[2]
REPLAY_DIR = ROOT / "avarta/public/replay"
RAIN_CASE_FILE = REPLAY_DIR / "august-2025.json"
CYCLONE_CASE_FILE = REPLAY_DIR / "cyclone-amphan.json"
HEATWAVE_CASE_FILE = REPLAY_DIR / "heatwave-2024.json"

AVAILABLE_CASES = [
    {
        "id": "gefs-imd-rain-2025-08-23",
        "hazard_type": "rainfall",
        "title": "23 August 2025 · Northwest India Heavy Rainfall",
        "region": "Northwest India (Rajasthan, Haryana, Delhi)",
        "dates": "19–23 August 2025",
        "model_inputs": "NOAA GEFS (0.5°) × IMD Daily (0.25°)",
        "peak_observed": "469.2 mm/day",
        "file": "august-2025.json",
    },
    {
        "id": "cyclone-amphan-2020-05",
        "hazard_type": "cyclone",
        "title": "May 2020 · Super Cyclonic Storm Amphan",
        "region": "Bay of Bengal & Sundarbans Landfall",
        "dates": "16–21 May 2020",
        "model_inputs": "NCMRWF NEPS-G / IMD Best-Track (0.25°)",
        "peak_observed": "260.0 km/h (907 hPa)",
        "file": "cyclone-amphan.json",
    },
    {
        "id": "heatwave-north-india-2024-05",
        "hazard_type": "heatwave",
        "title": "May 2024 · Severe North India Heat Dome",
        "region": "Indo-Gangetic Plain & Thar Desert",
        "dates": "23–28 May 2024",
        "model_inputs": "NCMRWF NEPS-G / IMD Gridded Temp (0.25°)",
        "peak_observed": "49.8 °C (Tw 31.4°C)",
        "file": "heatwave-2024.json",
    },
]


def export_all_cases() -> Dict[str, Path]:
    """Ensure all multi-hazard cases are generated and serialized to JSON artifacts."""
    REPLAY_DIR.mkdir(parents=True, exist_ok=True)
    results = {}

    # 1. Rainfall case already exists or is preserved
    if RAIN_CASE_FILE.exists():
        results["rainfall"] = RAIN_CASE_FILE

    # 2. Cyclone Amphan
    amphan = generate_cyclone_amphan_case()
    CYCLONE_CASE_FILE.write_text(json.dumps(amphan, indent=2), encoding="utf-8")
    results["cyclone"] = CYCLONE_CASE_FILE

    # 3. Heatwave
    heatwave = generate_heatwave_case()
    HEATWAVE_CASE_FILE.write_text(json.dumps(heatwave, indent=2), encoding="utf-8")
    results["heatwave"] = HEATWAVE_CASE_FILE

    return results


def list_cases() -> List[Dict[str, Any]]:
    """Return catalog of available multi-hazard scenarios."""
    return AVAILABLE_CASES


def get_case(case_id: str) -> Optional[Dict[str, Any]]:
    """Fetch complete case payload by case ID or hazard type keyword."""
    export_all_cases()

    lookup = {
        "gefs-imd-rain-2025-08-23": RAIN_CASE_FILE,
        "rainfall": RAIN_CASE_FILE,
        "rain": RAIN_CASE_FILE,
        "cyclone-amphan-2020-05": CYCLONE_CASE_FILE,
        "cyclone": CYCLONE_CASE_FILE,
        "amphan": CYCLONE_CASE_FILE,
        "heatwave-north-india-2024-05": HEATWAVE_CASE_FILE,
        "heatwave": HEATWAVE_CASE_FILE,
        "heat": HEATWAVE_CASE_FILE,
    }

    target = lookup.get(case_id.lower())
    if target and target.exists():
        return json.loads(target.read_text(encoding="utf-8"))

    # Direct file fallback
    for case_meta in AVAILABLE_CASES:
        if case_meta["id"] == case_id:
            path = REPLAY_DIR / case_meta["file"]
            if path.exists():
                return json.loads(path.read_text(encoding="utf-8"))

    return None
