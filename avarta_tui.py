"""Avarta's evidence-first terminal dashboard for the historical rainfall replay.

The CLI reads the same generated artifacts as the web dashboard. It never
issues a public alert; the separate demo view contains fictional examples.
"""

from __future__ import annotations

import argparse
from contextlib import redirect_stdout
from io import StringIO
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from rich import box
from rich.console import Console, Group
from rich.panel import Panel
from rich.rule import Rule
from rich.table import Table
from rich.text import Text

ROOT = Path(__file__).resolve().parent
CASE_FILE = ROOT / "avarta/public/replay/august-2025.json"
BENCHMARK_FILE = ROOT / "avarta/public/replay/training-benchmark.json"
IMD_FILE = ROOT / "data/raw/Rainfall_ind2025_rfp25.grd"

THEMES = {
    "forest": ("#1d6859", "#bc6945", "#7f9489"),
    "emerald": ("#1d6859", "#bc6945", "#7f9489"),
    "midnight": ("#438db2", "#e2985f", "#8a9ba8"),
    "stealth": ("#438db2", "#e2985f", "#8a9ba8"),
    "cyan": ("#198c9b", "#db9567", "#839fa0"),
    "amber": ("#a36a2d", "#aa5040", "#a1967e"),
    "aurora": ("#745db0", "#d28068", "#9a94ad"),
    "crimson": ("#a83f4f", "#d38959", "#ad9192"),
    "synthwave": ("#a158ad", "#df7e8e", "#a39ab0"),
    "mono": ("#666666", "#888888", "#777777"),
}


def load_artifact(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Missing {path.name}. Rebuild with `python run_pipeline.py` or follow README setup.")
    return json.loads(path.read_text(encoding="utf-8"))


def utc_label(value: str) -> str:
    moment = datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    return moment.strftime("%d %b %H:%M UTC")


def banner(console: Console, section: str, theme: tuple[str, str, str], demo: bool = False,
           context: str | None = None) -> None:
    primary, accent, muted = theme
    wordmark = Text("a  AVARTA", style=f"bold {primary}")
    wordmark.append("   /   ", style=muted)
    wordmark.append(section.upper(), style="bold")
    subtitle = context or ("SYNTHETIC DESIGN DEMO  ·  NOT A FORECAST" if demo else
                           "HISTORICAL GEFS × IMD REPLAY  ·  RESEARCH ONLY")
    console.print(Panel(Group(wordmark, Text(subtitle, style=accent)), box=box.ROUNDED, border_style=primary, padding=(0, 2)))


def metric_card(label: str, value: str, detail: str, color: str) -> Panel:
    content = Text()
    content.append(label.upper() + "\n", style="dim")
    content.append(value + "\n", style=f"bold {color}")
    content.append(detail, style="dim")
    return Panel(content, box=box.SQUARE, border_style="grey54", padding=(0, 1))


def overview(console: Console, report: dict, theme: tuple[str, str, str]) -> None:
    primary, accent, muted = theme
    banner(console, "case overview", theme)
    forecast, observed, verification = report["forecast"], report["observation"], report["verification"]
    console.print(Text(report["title"], style="bold"))
    console.print(Text(f"Forecast initialized {utc_label(forecast['initialization_time'])}  •  leads +{forecast['lead_hours'][0]}–+{forecast['lead_hours'][1]} h  •  {len(forecast['members'])} members", style=muted))
    cards = Table.grid(expand=True, padding=(0, 1))
    cards.add_column(ratio=1)
    cards.add_column(ratio=1)
    cards.add_row(metric_card("Forecast peak", f"{verification['forecast_peak_mm_day']:.2f} mm", "GEFS ensemble mean / 24 h", primary),
                  metric_card("Observed peak", f"{verification['observed_peak_mm_day']:.2f} mm", "IMD daily 0.25° grid", accent))
    cards.add_row(metric_card("Peak absolute error", f"{verification['peak_absolute_error_mm_day']:.2f} mm", "This forecast missed the extreme", accent),
                  metric_card("Heavy-rain overlap", f"{100 * (verification['heavy_rain_iou'] or 0):.0f}%", f"≥{verification['heavy_rain_threshold_mm_day']} mm/day", accent))
    console.print(cards)
    tracks = [obj for frame in report["frames"] for obj in frame["objects"]]
    latest = report["frames"][-1]
    track_line = f"{len(report['frames'])} time steps · {len(tracks)} detections · {len({obj.get('track_id') for obj in tracks})} persistent track(s)"
    console.print(Panel(Text(track_line + f"\nLast valid time: {utc_label(latest['valid_time'])}", style=primary), title="DETECTION → TRACKING", border_style=primary))
    caveat = Text("NO PUBLIC ALERT", style=f"bold {accent}")
    caveat.append("  ·  The coarse ensemble-mean peak stays below the provisional threshold. A retrospective forecast miss is visible; precise warnings are not justified.")
    console.print(Panel(caveat, title="DRAFT DISPOSITION", border_style=accent))
    console.print(Text(f"Source grids: GEFS {forecast['grid_spacing_degrees']}°  /  IMD {observed['grid_spacing_degrees']}°. No 5 km output or diffusion model is used here.", style=muted))
    console.print(Text("Views: --map  --timeline  --benchmark  --datasets  --alerts  --demo", style=muted))


def interactive_home(console: Console, report: dict, theme: tuple[str, str, str]) -> None:
    """A compact home screen that keeps the menu visible on a 24-line terminal."""
    primary, accent, muted = theme
    banner(console, "mission desk", theme)
    verification = report["verification"]
    console.print(Text(report["title"], style="bold"))
    console.print(Text(f"GEFS initialized {utc_label(report['forecast']['initialization_time'])}  •  +75 to +99 h", style=muted))
    metrics = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {primary}", expand=True, padding=(0, 1))
    for label in ("GEFS peak", "IMD peak", "Peak error", "Heavy-rain IoU"):
        metrics.add_column(label)
    metrics.add_row(f"{verification['forecast_peak_mm_day']:.2f} mm",
                    f"{verification['observed_peak_mm_day']:.2f} mm",
                    f"{verification['peak_absolute_error_mm_day']:.2f} mm",
                    f"{100 * (verification['heavy_rain_iou'] or 0):.0f}%")
    console.print(metrics)
    console.print(Panel(f"{len(report['frames'])} forecast frames · persistent rain footprint tracking\n"
                        "NO PUBLIC ALERT · This archived forecast missed the observed extreme.",
                        title="CASE STATUS", border_style=accent))
    console.print(Text("Research prototype · draft decision support only · no 5 km downscaling", style=muted))


def rain_style(value: float) -> str:
    if value >= 35:
        return "#b94f37"
    if value >= 25:
        return "#d77646"
    if value >= 15:
        return "#e7a65b"
    if value >= 8:
        return "#d8c480"
    if value >= 3:
        return "#8fbca9"
    return "#5b9385"


def rain_glyph(value: float) -> str:
    if value >= 15:
        return "██"
    if value >= 8:
        return "▓▓"
    if value >= 3:
        return "▒▒"
    return "░░"


def map_view(console: Console, report: dict, theme: tuple[str, str, str]) -> None:
    primary, accent, muted = theme
    banner(console, "forecast grid", theme)
    raster = report["raster"]
    lats, lons, values = raster["latitudes"], raster["longitudes"], raster["forecast_mm_day"]
    columns_to_show = min(len(lons), max(5, (console.width - 8) // 2))
    shown_columns = sorted({round(i * (len(lons) - 1) / (columns_to_show - 1)) for i in range(columns_to_show)})
    observed_lat, observed_lon = report["verification"]["observed_peak_location"]
    observed_cell = (min(range(len(lats)), key=lambda i: abs(lats[i] - observed_lat)),
                     min(shown_columns, key=lambda i: abs(lons[i] - observed_lon)))
    latest = report["frames"][-1]["objects"]
    track_cells = {(min(range(len(lats)), key=lambda i: abs(lats[i] - item["centroid"][0])),
                    min(shown_columns, key=lambda i: abs(lons[i] - item["centroid"][1]))) for item in latest}
    console.print(Text("GEFS ensemble mean · 0.5° grid · 24-hour accumulation · mm/day", style=muted))
    console.print(Rule(style=primary))
    for row, values_row in enumerate(values):
        line = Text(f"{lats[row]:>4.1f}° ", style=muted)
        for col in shown_columns:
            value = values_row[col]
            if (row, col) == observed_cell:
                line.append("◆ ", style=f"bold {accent}")
            elif (row, col) in track_cells:
                line.append("● ", style=f"bold {primary}")
            elif value < 0.5:
                line.append("· ", style="grey46")
            else:
                line.append(rain_glyph(value), style=rain_style(value))
        console.print(line, overflow="crop")
    console.print(Rule(style=primary))
    console.print(Text(f"       {lons[0]}°E{' ' * max(1, 2 * len(shown_columns) - 12)}{lons[-1]}°E", style=muted))
    legend = Text("· dry  ")
    for label, value in (("0.5–3", 1), ("3–8", 4), ("8–15", 10), ("15–25", 18), ("25–35", 28), ("≥35", 40)):
        legend.append(rain_glyph(value), style=rain_style(value))
        legend.append(" " + label + "  ")
    console.print(legend)
    console.print(Text("◆ observed IMD peak (retrospective)    ● last forecast track centroid", style=muted))
    console.print(Panel("This is a geographic grid, not a 5 km impact map. The marker is an observed peak, not a successful forecast.", border_style=accent))


def timeline(console: Console, report: dict, theme: tuple[str, str, str]) -> None:
    primary, _, muted = theme
    banner(console, "track timeline", theme)
    table = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {primary}", show_lines=True, expand=True)
    for column in ("Lead", "Valid time", "Objects", "Track ID", "Peak / 3 h", "Footprint bbox (S, W, N, E)"):
        table.add_column(column, overflow="fold")
    for frame in report["frames"]:
        if frame["objects"]:
            for item in frame["objects"]:
                bbox = ", ".join(str(v) for v in item["bbox"])
                table.add_row(f"+{frame['lead_hour']} h", utc_label(frame["valid_time"]), str(len(frame["objects"])),
                              item.get("track_id", "—"), f"{item['peak_mm_3h']:.2f} mm", bbox)
        else:
            table.add_row(f"+{frame['lead_hour']} h", utc_label(frame["valid_time"]), "0", "—", "—", "—", style=muted)
    console.print(table)
    console.print(Text("Objects are connected components at ≥8 mm per 3 h on the ensemble-mean 0.5° grid; association uses the prototype Kalman tracker.", style=muted))


def benchmark(console: Console, result: dict, theme: tuple[str, str, str]) -> None:
    primary, accent, muted = theme
    banner(console, "model benchmark", theme,
           context="SEPARATE IMD COARSE-PROXY EXPERIMENT  ·  NOT A FORECAST")
    validation = result["validation"]
    console.print(Panel(f"IMD 0.25° coarse-proxy reconstruction  ·  {validation['validation_samples']} held-out dates from {validation['first_validation_date']}\n"
                        "Input is smoothed from the target, not an independent NWP forecast. No 5 km target or diffusion model.", border_style=accent))
    table = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {primary}", expand=True)
    table.add_column("Validation metric")
    table.add_column("Residual CNN", justify="right")
    table.add_column("Bilinear", justify="right")
    cnn, base = validation["residual_cnn"], validation["bilinear"]
    rows = (
        ("Peak absolute error ↓", "mean_peak_absolute_error_mm_day", " mm", 1),
        ("Heavy-rain recall ↑", "heavy_rain_detection_recall", "%", 100),
        ("Footprint IoU ↑", "heavy_rain_footprint_iou", "%", 100),
        ("Overall MAE ↓", "mean_absolute_error_mm_day", " mm", 1),
        ("False-alarm ratio ↓", "heavy_rain_false_alarm_ratio", "%", 100),
    )
    for label, key, unit, scale in rows:
        precision = ".1f" if unit == "%" else ".3f"
        table.add_row(label, f"{cnn[key] * scale:{precision}}{unit}", f"{base[key] * scale:{precision}}{unit}")
    console.print(table)
    console.print(Text("The CNN improves peak and overlap metrics but worsens overall MAE and false alarms; it is not deployed in the forecast replay.", style=muted))


def sources(console: Console, report: dict, theme: tuple[str, str, str]) -> None:
    primary, _, muted = theme
    banner(console, "data provenance", theme)
    forecast, observation = report["forecast"], report["observation"]
    table = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {primary}", expand=True)
    table.add_column("Layer")
    table.add_column("Source / timing", overflow="fold")
    table.add_row("Forecast", f"{forecast['model']} · {len(forecast['members'])} members · 0.5° · initialized {forecast['initialization_time']}")
    table.add_row("Forecast window", " → ".join(forecast["window_utc"]))
    table.add_row("Observation", f"{observation['model']} · {observation['date']} · 0.25°")
    table.add_row("IMD SHA-256", observation["sha256"])
    table.add_row("IMD source", observation["source_url"])
    table.add_row("Archived GRIB records", str(len(report["provenance"]["gefs_grib_records"])))
    console.print(table)
    console.print(Text("GEFS record URLs, byte ranges, step windows and SHA-256 hashes are included in avarta/public/replay/august-2025.json.", style=muted))
    console.print(Panel("Raw IMD data and cached GRIB messages are not committed. See README for reproduction and dataset terms.", border_style=primary))


def alerts(console: Console, report: dict, theme: tuple[str, str, str]) -> None:
    _, accent, muted = theme
    banner(console, "alert disposition", theme)
    field = report["raster"]["forecast_mm_day"]
    row, col = max(((r, c) for r, line in enumerate(field) for c in range(len(line))),
                   key=lambda pos: field[pos[0]][pos[1]])
    peak = field[row][col]
    threshold = report["verification"]["heavy_rain_threshold_mm_day"]
    status = "PROVISIONAL THRESHOLD EXCEEDED — HUMAN REVIEW REQUIRED" if peak >= threshold else "NO PUBLIC ALERT INDICATED"
    panel = Text()
    panel.append(status + "\n", style=f"bold {accent}")
    panel.append(f"GEFS coarse-grid peak: {peak:.2f} mm/day · threshold: {threshold:.1f} mm/day\n")
    panel.append(f"Grid-cell centroid: {report['raster']['latitudes'][row]}°N, {report['raster']['longitudes'][col]}°E\n")
    panel.append(f"Forecast window: {' to '.join(report['forecast']['window_utc'])}\n")
    panel.append("Status: draft_decision_support · dissemination: not_sent", style=muted)
    console.print(Panel(panel, title="DRAFT ONLY", border_style=accent))
    console.print(Text("A single uncalibrated case and five members cannot justify a 5 km impact radius, public CAP message or evacuation directive.", style=muted))


def demo(console: Console, theme: tuple[str, str, str]) -> None:
    _, accent, muted = theme
    banner(console, "prototype demo", theme, demo=True)
    console.print(Panel("These are the original hand-authored interface examples. They are fictional—not forecasts, observations, or alerts.", border_style=accent))
    table = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {accent}", expand=True)
    table.add_column("Fictional scenario")
    table.add_column("Concept")
    table.add_column("Example intensity")
    table.add_row("Severe Cyclone Amphan-II", "Cyclone track", "165 km/h")
    table.add_row("Kullu-Mandi Orographic Cloudburst", "Extreme rainfall", "142.8 mm/h")
    table.add_row("Vidarbha Persistent Heat Dome", "Heat anomaly", "47.9 °C")
    console.print(table)
    console.print(Text("Synthetic mode generates no CAP payload and makes no physical-verification or 5 km skill claim.", style=muted))


def train_experiment(console: Console, theme: tuple[str, str, str]) -> None:
    if not IMD_FILE.exists():
        raise FileNotFoundError(f"Official IMD file missing: {IMD_FILE}. See README setup.")
    from training.train_imd_real import run_real_imd_training

    started = time.perf_counter()
    with console.status("Training the IMD coarse-proxy residual CNN…", spinner="dots"):
        with redirect_stdout(StringIO()):
            result = run_real_imd_training(grd_path=str(IMD_FILE))
    elapsed = time.perf_counter() - started
    console.print(Panel(f"Training completed in {elapsed:.1f}s. Updated checkpoint and benchmark artifacts.\n"
                        "This is target-derived 0.25° reconstruction, not NWP forecasting or 5 km downscaling.",
                        title="EXPERIMENT COMPLETE", border_style=theme[0]))
    benchmark(console, result, theme)


def render_view(console: Console, view: str, theme: tuple[str, str, str]) -> None:
    if view == "demo":
        demo(console, theme)
        return
    report = load_artifact(CASE_FILE)
    if view == "overview":
        overview(console, report, theme)
    elif view == "map":
        map_view(console, report, theme)
    elif view == "timeline":
        timeline(console, report, theme)
    elif view == "benchmark":
        benchmark(console, load_artifact(BENCHMARK_FILE), theme)
    elif view == "sources":
        sources(console, report, theme)
    elif view == "alerts":
        alerts(console, report, theme)


def interactive(console: Console, theme: tuple[str, str, str]) -> None:
    options = {"1": "overview", "2": "map", "3": "timeline", "4": "benchmark",
               "5": "sources", "6": "alerts", "7": "demo", "8": "train"}
    while True:
        console.clear()
        interactive_home(console, load_artifact(CASE_FILE), theme)
        console.print(Rule("EXPLORE", style=theme[0]))
        console.print("[1] Overview   [2] Rainfall grid   [3] Track timeline   [4] Model benchmark")
        console.print("[5] Sources   [6] Draft alert   [7] Demo   [8] Train   [0] Exit")
        try:
            selection = console.input("\n[bold]Select a view › [/]").strip().lower()
        except (EOFError, KeyboardInterrupt):
            break
        if selection in {"0", "q", "exit"}:
            break
        view = options.get(selection)
        if not view:
            console.print("[yellow]Choose 0–8.[/]")
            continue
        console.clear()
        if view == "train":
            train_experiment(console, theme)
        else:
            render_view(console, view, theme)
        try:
            console.input("\n[dim]Press Enter to return to the overview...[/]")
        except (EOFError, KeyboardInterrupt):
            break


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--view", choices=("overview", "map", "timeline", "benchmark", "sources", "alerts", "demo"))
    modes.add_argument("--demo", action="store_const", const="demo", dest="shortcut")
    modes.add_argument("--live", action="store_const", const="timeline", dest="shortcut", help="Legacy alias: show archived timeline, not live telemetry")
    modes.add_argument("--lens", action="store_const", const="benchmark", dest="shortcut", help="Legacy alias: show honest coarse-proxy benchmark")
    modes.add_argument("--datasets", action="store_const", const="sources", dest="shortcut")
    modes.add_argument("--benchmark", action="store_const", const="benchmark", dest="shortcut")
    modes.add_argument("--alerts", action="store_const", const="alerts", dest="shortcut")
    modes.add_argument("--map", action="store_const", const="map", dest="shortcut")
    modes.add_argument("--timeline", action="store_const", const="timeline", dest="shortcut")
    modes.add_argument("--train", action="store_const", const="train", dest="shortcut", help="Run the real IMD coarse-proxy experiment")
    parser.add_argument("--theme", choices=sorted(THEMES), default="forest")
    parser.add_argument("--no-interactive", action="store_true", help="Print overview and exit even in a terminal")
    args = parser.parse_args(argv)
    console = Console()
    try:
        if args.shortcut == "train":
            train_experiment(console, THEMES[args.theme])
            return 0
        selected = args.view or args.shortcut
        if selected:
            render_view(console, selected, THEMES[args.theme])
        elif sys.stdin.isatty() and not args.no_interactive:
            interactive(console, THEMES[args.theme])
        else:
            render_view(console, "overview", THEMES[args.theme])
    except (FileNotFoundError, ValueError) as error:
        console.print(Panel(str(error), title="Cannot open view", border_style="red"))
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
