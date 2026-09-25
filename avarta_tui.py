"""Read-only terminal view of the same computed case used by the dashboard."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


CASE = Path(__file__).resolve().parent / "avarta/public/replay/august-2025.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true", help="Show a clearly fictional design example")
    args = parser.parse_args()
    if args.demo:
        print("AVARTA / SYNTHETIC DESIGN DEMO")
        print("Fictional cyclone, heat, and cloudburst examples are available in the web dashboard's Prototype demo tab.")
        print("No data here is a forecast or observation. No warning or CAP message is generated.")
        return

    if not CASE.exists():
        parser.error("case JSON missing; run `python run_pipeline.py` with the official IMD 2025 file")
    report = json.loads(CASE.read_text(encoding="utf-8"))
    forecast, observed, metrics = report["forecast"], report["observation"], report["verification"]
    print("AVARTA / HISTORICAL RAINFALL REPLAY — RESEARCH ONLY")
    print(f"{report['title']}\n")
    print(f"Forecast: {forecast['model']} {forecast['grid_spacing_degrees']}°; initialized {forecast['initialization_time']}")
    print(f"Window: {forecast['window_utc'][0]} to {forecast['window_utc'][1]} ({len(forecast['members'])} members)")
    print(f"Observation: {observed['model']} {observed['grid_spacing_degrees']}°; date {observed['date']}")
    print(f"Forecast / observed peak: {metrics['forecast_peak_mm_day']} / {metrics['observed_peak_mm_day']} mm/day")
    print(f"Peak error: {metrics['peak_absolute_error_mm_day']} mm/day")
    print(f"Heavy-rain footprint IoU: {metrics['heavy_rain_iou']}")
    print(f"Detected forecast frames: {len(report['frames'])}; non-empty: {sum(bool(f['objects']) for f in report['frames'])}")
    print("Disposition: no public alert; human review required for any future warning.")


if __name__ == "__main__":
    main()
