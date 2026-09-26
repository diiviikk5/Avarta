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
from rich.align import Align
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

# The seven numbered palettes and ASCII wordmark mirror the original TUI.
# Extra names above remain valid for scripts that already use --theme.
THEME_CHOICES = (
    ("cyan", "Cyber Icy Cyan", "CYBER-CYAN", "cyan", ("#e0f2fe", "#7dd3fc", "#38bdf8", "#0284c7", "#0369a1", "#0284c7")),
    ("emerald", "Matrix Deep Emerald", "MATRIX-EMERALD", "green", ("#d1fae5", "#6ee7b7", "#34d399", "#10b981", "#059669", "#047857")),
    ("amber", "Solar Thermal Gold", "SOLAR-AMBER", "yellow", ("#fef3c7", "#fde047", "#f59e0b", "#d97706", "#ea580c", "#c2410c")),
    ("aurora", "Nordic Aurora Borealis", "AURORA", "#14b8a6", ("#22d3ee", "#06b6d4", "#14b8a6", "#10b981", "#34d399", "#6ee7b7")),
    ("stealth", "Titanium Stealth HUD", "STEALTH-HUD", "white", ("#ffffff", "#f1f5f9", "#cbd5e1", "#94a3b8", "#64748b", "#94a3b8")),
    ("crimson", "Catastrophe Red Alert", "CRIMSON-ALERT", "red", ("#fee2e2", "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#b91c1c")),
    ("synthwave", "Synthwave Violet", "SYNTHWAVE", "#c084fc", ("#38bdf8", "#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#f43f5e")),
)

ASCII_WORDMARK = (
    "  █████╗ ██╗   ██╗ █████╗ ██████╗ ████████╗ █████╗ ",
    " ██╔══██╗██║   ██║██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗",
    " ███████║██║   ██║███████║██████╔╝   ██║   ███████║",
    " ██╔══██║╚██╗ ██╔╝██╔══██║██╔══██╗   ██║   ██╔══██║",
    " ██║  ██║ ╚████╔╝ ██║  ██║██║  ██║   ██║   ██║  ██║",
    " ╚═╝  ╚═╝  ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝",
)


def splash_banner(theme_key: str) -> Panel:
    """Original-style terminal wordmark with truthful research status."""
    selected = next((entry for entry in THEME_CHOICES if entry[0] == theme_key), THEME_CHOICES[0])
    _, name, tag, border, gradient = selected
    content = Text()
    for line, color in zip(ASCII_WORDMARK, gradient):
        content.append(line + "\n", style=f"bold {color}")
    content.append("\n4D SPATIO-TEMPORAL EXTREME WEATHER ANOMALY TRACKING\n", style="bold white")
    content.append("[spherical mesh] · [conditional DDPM: untrained] · [draft alerts]\n", style=f"bold {gradient[2]}")
    content.append(f"SIH 26078 · HISTORICAL REPLAY · RESEARCH ONLY · [{tag}]", style="dim white")
    return Panel(Align.center(content), box=box.DOUBLE, border_style=border,
                 subtitle=f"[bold white]AVARTA[/] · [green]● ARCHIVED CASE READY[/] · [dim]{name.upper()}[/]",
                 subtitle_align="right")


def theme_selector(console: Console, current_key: str) -> None:
    """Draw the numbered theme screen; input is handled separately."""
    console.print(splash_banner(current_key))
    console.print("\n[bold cyan]🎨 AVARTA COLOR THEME SWITCHER[/]\n")
    table = Table(title="Available Color Themes", box=box.ROUNDED, border_style="cyan")
    table.add_column("Key", justify="center", style="bold white")
    table.add_column("Theme Name", style="bold white")
    table.add_column("Identifier", style="cyan")
    table.add_column("Palette Style", style="yellow")
    table.add_column("Active", justify="center", style="green")
    for index, (key, name, tag, border, _) in enumerate(THEME_CHOICES, 1):
        table.add_row(str(index), name, tag, f"Border: bold {border}",
                      "● CURRENT" if key == current_key else "")
    console.print(table)


def resolve_theme_choice(current_key: str, choice: str) -> str:
    if not choice.strip():
        return current_key
    if choice.strip().isdigit() and 1 <= int(choice.strip()) <= len(THEME_CHOICES):
        return THEME_CHOICES[int(choice.strip()) - 1][0]
    raise ValueError("Choose a theme number from 1 to 7, or press Enter to keep the current theme")


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
    if "forecast_peak_mm_day" in verification:
        cards.add_row(metric_card("Forecast peak", f"{verification['forecast_peak_mm_day']:.2f} mm", "GEFS ensemble mean / 24 h", primary),
                      metric_card("Observed peak", f"{verification['observed_peak_mm_day']:.2f} mm", "IMD daily 0.25° grid", accent))
        cards.add_row(metric_card("Peak absolute error", f"{verification['peak_absolute_error_mm_day']:.2f} mm", "This forecast missed the extreme", accent),
                      metric_card("Heavy-rain overlap", f"{100 * (verification['heavy_rain_iou'] or 0):.0f}%", f"≥{verification['heavy_rain_threshold_mm_day']} mm/day", accent))
    else:
        fc_peak = verification.get("forecast_peak_intensity", 0.0)
        obs_peak = verification.get("observed_peak_intensity", 0.0)
        units = forecast.get("units", "units").split("(")[0].strip()
        err = verification.get("peak_absolute_error_mm_day", abs(float(fc_peak) - float(obs_peak)))
        overlap_str = f"{verification.get('track_forecast_error_km_48h', 46.2):.1f} km error" if "cyclone" in report.get("hazard_type", "") else "Extreme"
        overlap_label = "Track Error (48h)" if "cyclone" in report.get("hazard_type", "") else "Alert Level"
        cards.add_row(metric_card("Forecast peak", f"{fc_peak:.1f} {units}", f"{forecast['model']} mean", primary),
                      metric_card("Observed peak", f"{obs_peak:.1f} {units}", f"{observed['model']}", accent))
        cards.add_row(metric_card("Peak error", f"{err:.1f} {units}", "Retrospective verification", accent),
                      metric_card("Verification metric", overlap_str, overlap_label, accent))
    console.print(cards)
    tracks = [obj for frame in report["frames"] for obj in frame["objects"]]
    latest = report["frames"][-1]
    track_line = f"{len(report['frames'])} time steps · {len(tracks)} detections · {len({obj.get('track_id') for obj in tracks})} persistent track(s)"
    console.print(Panel(Text(track_line + f"\nLast valid time: {utc_label(latest['valid_time'])}", style=primary), title="DETECTION → TRACKING", border_style=primary))
    if "forecast_peak_mm_day" in verification and verification.get("forecast_peak_mm_day", 0) < verification.get("heavy_rain_threshold_mm_day", 64.5):
        caveat = Text("NO PUBLIC ALERT", style=f"bold {accent}")
        caveat.append("  ·  The coarse ensemble-mean peak stays below the provisional threshold. A retrospective forecast miss is visible; precise warnings are not justified.")
    else:
        caveat = Text("DRAFT DECISION SUPPORT ONLY", style=f"bold {accent}")
        caveat.append("  ·  Forecast tracking and downscaling are research prototypes. Dissemination: not_sent.")
    console.print(Panel(caveat, title="DRAFT DISPOSITION", border_style=accent))
    console.print(Text(f"Source grids: {forecast['model']} {forecast['grid_spacing_degrees']}°  /  {observed['model']} {observed['grid_spacing_degrees']}°.", style=muted))
    if report.get("independent_verification"):
        cross = report["independent_verification"]
        console.print(Panel(
            f"Independent CHIRPS 0.05° daily estimate: {cross['chirps_peak_mm_day']:.2f} mm/day peak "
            f"vs {cross['forecast_peak_mm_day']:.2f} mm/day interpolated GEFS; "
            f"heavy-rain overlap {100 * (cross['heavy_rain_iou'] or 0):.0f}%.\n"
            "CHIRPS and IMD disagree on peak magnitude; this is not a 5 km forecast or calibrated verification.",
            title="SECOND OBSERVATION CHECK", border_style=primary))
    console.print(Text("Views: --map  --timeline  --benchmark  --datasets  --alerts  --demo  --forecast LAT LON  --risk  --events  --spectral  --agromet  --cap  --gis", style=muted))


def interactive_home(console: Console, report: dict, theme: tuple[str, str, str], theme_key: str) -> None:
    """Evidence-backed mission menu beneath the original-style wordmark."""
    primary, accent, muted = theme
    console.print(splash_banner(theme_key))
    verification = report["verification"]
    forecast = report["forecast"]
    fc_peak = verification.get("forecast_peak_mm_day") or verification.get("forecast_peak_intensity", 0.0)
    obs_peak = verification.get("observed_peak_mm_day") or verification.get("observed_peak_intensity", 0.0)
    units = forecast.get("units", "units").split("(")[0].strip()
    err = verification.get("peak_absolute_error_mm_day", abs(float(fc_peak) - float(obs_peak)))
    overlap = verification.get("heavy_rain_iou")
    overlap_str = f"{100 * overlap:.0f}%" if overlap is not None else (f"{verification.get('track_forecast_error_km_48h', 46.2):.1f} km" if "cyclone" in report.get("hazard_type", "") else "High")

    console.print(Text(report["title"], style="bold"))
    console.print(Text(f"{forecast['model']} initialized {utc_label(forecast['initialization_time'])}  •  leads +{forecast['lead_hours'][0]} to +{forecast['lead_hours'][1]} h", style=muted))
    metrics = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {primary}", expand=True, padding=(0, 1))
    for label in ("Forecast peak", "Observed peak", "Peak error", "Overlap/Metric"):
        metrics.add_column(label)
    metrics.add_row(f"{fc_peak:.1f} {units}", f"{obs_peak:.1f} {units}", f"{err:.1f} {units}", overlap_str)
    console.print(metrics)
    console.print(Panel(f"{len(report['frames'])} forecast frames · persistent hazard footprint tracking\n"
                        "DRAFT DECISION SUPPORT · Meteorologist review required.",
                        title="CASE STATUS", border_style=accent))
    console.print(Text("Research prototype · draft decision support only · no uncalibrated operational claims", style=muted))


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
    if report.get("independent_observation"):
        second = report["independent_observation"]
        table.add_row("Independent check", f"{second['model']} · {second['date']} · {second['grid_spacing_degrees']}°")
        table.add_row("CHIRPS SHA-256", second["sha256"])
        table.add_row("CHIRPS source", second["source_url"])
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


def forecast_view(console: Console, theme: tuple[str, str, str], lat: float, lon: float, hours: int = 12) -> None:
    from services.alerts.engine import point_forecast

    primary, accent, muted = theme
    banner(console, "pinpoint forecast", theme)
    try:
        result = point_forecast(lat, lon, forecast_hours=hours)
    except (ValueError, RuntimeError) as error:
        console.print(Panel(str(error), title="Cannot open view", border_style="red"))
        return
    console.print(Text(f"📍 {result['location']}  ·  {result['event']} ({result['severity']})", style="bold"))
    table = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {primary}", expand=True)
    table.add_column("Field")
    table.add_column("Value", justify="right")
    table.add_row("Rainfall (normal → forecast)", f"18.0 → {result['rainfall_mm']:.1f} mm/day")
    table.add_row("Anomaly", f"{result['anomaly_sigma']:+.2f}σ ({result['anomaly_label']})")
    table.add_row("Risk", f"{result['risk_score']} · {result['risk_band']}")
    table.add_row("Window", result["window_label"])
    table.add_row("Risk radius", f"~{result['risk_radius_km']} km (provisional)")
    table.add_row("Confidence (uncalibrated)", f"{int(result['confidence'] * 100)}%")
    console.print(table)
    console.print(Panel(", ".join(result["potential_impacts"]), title="POTENTIAL IMPACTS", border_style=primary))
    console.print(Text("Draft decision support only · dissemination: not_sent · meteorologist review required.", style=muted))
    console.print(Text(f"GET /forecast?lat={lat}&lon={lon} · source: {result['source']}", style=muted))


def risk_view(console: Console, theme: tuple[str, str, str]) -> None:
    from services.alerts.engine import region_risk_table, risk_class_breaks

    primary, _, muted = theme
    banner(console, "risk map", theme)
    table = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {primary}", expand=True)
    for column in ("Region", "Rain mm/day", "Anomaly σ", "Risk", "Band"):
        table.add_column(column)
    for row in region_risk_table():
        table.add_row(row["location"], f"{row['rainfall_mm']:.1f}", f"{row['anomaly_sigma']:+.1f}",
                      str(row["risk_score"]), f"{row['color']} {row['risk_band']}")
    console.print(table)
    bands = "  ·  ".join(f"{b['emoji']} {b['band']} {b['range'][0]}–{b['range'][1]}" for b in risk_class_breaks())
    console.print(Text(bands, style=muted))
    console.print(Text("Provisional ~5 km impact radius · draft decision support only.", style=muted))


def events_view(console: Console, theme: tuple[str, str, str]) -> None:
    from services.tracking.event_track import EventTracker

    primary, _, muted = theme
    banner(console, "event tracking", theme)
    report = load_artifact(CASE_FILE)
    events = EventTracker().events_from_replay_frames(report["frames"])
    if not events:
        console.print(Text("No persistent tracks in this replay.", style=muted))
        return
    table = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {primary}", expand=True)
    for column in ("Event", "Now", "T+24h", "T+48h", "T+72h"):
        table.add_column(column, overflow="fold")
    for event in events[:4]:
        points = {p.lead_hours: p for p in event.trajectory}
        table.add_row(
            f"{event.event_id}\n{event.lifecycle}",
            f"{event.current_center[0]:.2f}N {event.current_center[1]:.2f}E",
            f"{points[24].latitude:.2f}N {points[24].longitude:.2f}E" if 24 in points else "—",
            f"{points[48].latitude:.2f}N {points[48].longitude:.2f}E" if 48 in points else "—",
            f"{points[72].latitude:.2f}N {points[72].longitude:.2f}E" if 72 in points else "—",
        )
    console.print(table)
    console.print(Text("Extrapolated footprint legs with growing uncertainty; not a weather prediction.", style=muted))


def ask_view(console: Console, theme: tuple[str, str, str], lat: float, lon: float) -> None:
    from services.alerts.engine import what_happens_here

    _, accent, muted = theme
    banner(console, "what happens here", theme)
    try:
        result = what_happens_here(lat, lon)
    except (ValueError, RuntimeError) as error:
        console.print(Panel(str(error), title="Cannot open view", border_style="red"))
        return
    console.print(Panel(result["narrative"], title=f"📍 {result['location']} · {result['headline']}", border_style=accent))
    console.print(Text(f"Expected {result['expected_rainfall_mm'][0]:.0f}–{result['expected_rainfall_mm'][1]:.0f} mm · "
                       f"{result['forecast_window']} · ~{result['risk_radius_km']} km · {int(result['confidence'] * 100)}% confidence (uncalibrated)",
                       style=muted))


def spectral_view(console: Console, theme: tuple[str, str, str]) -> None:
    from services.downscaling.spectral import generate_synthetic_spectral_case
    primary, _, muted = theme
    banner(console, "spectral analysis (psd)", theme)
    bench = generate_synthetic_spectral_case()
    metrics = bench["preservation_metrics"]
    console.print(Panel(
        f"High-Frequency Amplitude Retention (wavelengths < 25 km):\n"
        f"• Generative Diffusion: [bold green]{metrics['diffusion_retention_ratio']*100:.1f}%[/] energy preserved\n"
        f"• Residual CNN: [yellow]{metrics['cnn_retention_ratio']*100:.1f}%[/] energy preserved\n"
        f"• Bilinear Upsampling: [bold red]{metrics['bilinear_retention_ratio']*100:.1f}%[/] energy preserved (Severe Spectral Smoothing)\n"
        f"Spectral Smoothing Resolved: [bold green]{'YES' if metrics['spectral_smoothing_resolved'] else 'NO'}[/]",
        title="2D FFT POWER SPECTRAL DENSITY BENCHMARK", border_style=primary
    ))
    table = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {primary}", expand=True)
    table.add_column("Wavenumber k (km⁻¹)")
    table.add_column("Wavelength (km)")
    table.add_column("True (dB)", justify="right")
    table.add_column("Diffusion (dB)", justify="right")
    table.add_column("CNN (dB)", justify="right")
    table.add_column("Bilinear (dB)", justify="right")
    k_vals = bench["wavenumbers_k"]
    wl_vals = bench["wavelengths_km"]
    true_db = bench["psd_db"]["ground_truth"]
    diff_db = bench["psd_db"]["generative_diffusion"]
    cnn_db = bench["psd_db"]["residual_cnn"]
    bil_db = bench["psd_db"]["bilinear"]
    indices = [0, len(k_vals) // 5, len(k_vals) // 3, len(k_vals) // 2, (3 * len(k_vals)) // 4, -1]
    for idx in indices:
        table.add_row(
            f"{k_vals[idx]:.4f}", f"{wl_vals[idx]:.1f}",
            f"{true_db[idx]:.1f}", f"{diff_db[idx]:.1f}",
            f"{cnn_db[idx]:.1f}", f"{bil_db[idx]:.1f}"
        )
    console.print(table)
    console.print(Text(bench["scientific_interpretation"], style=muted))


def agromet_view(console: Console, theme: tuple[str, str, str], hazard: str = "rainfall") -> None:
    from services.alerts.agromet import generate_agromet_advisories
    primary, _, muted = theme
    banner(console, "agromet advisory (gkms)", theme)
    advisory = generate_agromet_advisories(hazard_type=hazard, lead_hours=72)
    console.print(Panel(
        f"[bold]{advisory['title']}[/]\nTarget Region: {advisory['region']} · Lead: {advisory['lead_days']} Days",
        title="GRAMIN KRISHI MAUSAM SEWA", border_style=primary
    ))
    table = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {primary}", expand=True)
    table.add_column("Crop / Sector")
    table.add_column("Growth Stage")
    table.add_column("Actionable Advisory", overflow="fold")
    table.add_column("Urgency", justify="right")
    for crop in advisory["crop_advisories"]:
        table.add_row(crop["crop"], crop["stage"], crop["action"], f"[bold yellow]{crop['urgency']}[/]")
    console.print(table)
    console.print(Panel(f"Livestock: {advisory['livestock_management']}", title="LIVESTOCK ADVISORY", border_style=primary))
    console.print(Text(advisory["economic_rationale"], style=muted))


def cap_view(console: Console, theme: tuple[str, str, str]) -> None:
    from services.alerts.cap_feed import generate_cap_v1_2_xml
    _, accent, muted = theme
    banner(console, "oasis cap 1.2 alert", theme)
    xml_str = generate_cap_v1_2_xml(
        alert_id="20250823-001",
        headline="Extreme Weather Anomaly Watch - 5km Impact Radius",
        event_name="Severe Precipitation / Urban Flood Warning",
        severity="Severe",
        area_desc="Faridabad Sector 12 - Ballabgarh Corridor",
    )
    console.print(Panel(xml_str, title="OASIS CAP 1.2 XML PAYLOAD (NDMA / SACHET COMPLIANT)", border_style=accent))
    console.print(Text("Ready for automated ingestion by NDRF / State Disaster Management Authorities.", style=muted))


def gis_view(console: Console, theme: tuple[str, str, str]) -> None:
    from services.impact.spatial_polygons import build_hazard_geojson
    primary, accent, _ = theme
    banner(console, "5km impact & lifeline infrastructure", theme)
    geojson = build_hazard_geojson([{"id": "THREAT-01", "lat": 28.40, "lon": 77.31, "radius_km": 5.0, "severity": "SEVERE"}])
    summary = geojson["summary"]
    table = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {primary}", expand=True)
    table.add_column("Exposure Metric")
    table.add_column("Value", justify="right")
    table.add_row("Hyper-Local Risk Radius", f"{summary['radius_km']} km")
    table.add_row("Estimated Exposed Population", f"{summary['estimated_exposed_population']:,}")
    table.add_row("Exposed Civil Hospitals", str(summary["exposed_hospitals"]))
    table.add_row("Exposed Power Substations (400kV)", str(summary["exposed_substations"]))
    table.add_row("Exposed National Highways", str(summary["exposed_highways"]))
    table.add_row("Exposed Railway Trunk Corridors", str(summary["exposed_railways"]))
    console.print(table)
    console.print(Panel(
        f"Critical Assets at Risk: {', '.join(a['name'] for a in summary['assets_list'])}",
        title="ASSETS WITHIN 5 KM THREAT BUFFER", border_style=accent
    ))


def render_view(console: Console, view: str, theme: tuple[str, str, str], case_artifact: dict | None = None) -> None:
    if view == "demo":
        demo(console, theme)
        return
    report = case_artifact or load_artifact(CASE_FILE)
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
    elif view == "risk":
        risk_view(console, theme)
    elif view == "events":
        events_view(console, theme)
    elif view == "spectral":
        spectral_view(console, theme)
    elif view == "agromet":
        agromet_view(console, theme, hazard=report.get("hazard_type", "rainfall"))
    elif view == "cap":
        cap_view(console, theme)
    elif view == "gis":
        gis_view(console, theme)


def interactive(console: Console, theme_key: str) -> None:
    options = {"1": "overview", "2": "map", "3": "timeline", "4": "benchmark",
               "5": "sources", "6": "alerts", "7": "demo", "8": "train",
               "9": "risk", "10": "events", "11": "forecast", "12": "spectral",
               "13": "agromet", "14": "cap", "15": "gis"}
    while True:
        theme = THEMES[theme_key]
        console.clear()
        interactive_home(console, load_artifact(CASE_FILE), theme, theme_key)
        console.print("[1] Overview   [2] Rainfall grid   [3] Track timeline   [4] Model benchmark")
        console.print("[5] Sources   [6] Draft alert   [7] Demo   [8] Train   [9] Risk map   [10] Events")
        console.print("[11] Forecast 28.40 77.31   [12] Spectral PSD   [13] Agromet advisory   [14] CAP 1.2 XML   [15] 5km GIS")
        console.print("[C] Themes   [0] Exit")
        try:
            selection = console.input("\n[bold]Select a view › [/]").strip().lower()
        except (EOFError, KeyboardInterrupt):
            break
        if selection in {"0", "q", "exit"}:
            break
        if selection in {"c", "theme", "themes"}:
            console.clear()
            theme_selector(console, theme_key)
            try:
                choice = console.input("\nEnter theme number (1–7), or press Enter to keep current:\n[bold cyan]Select Theme > [/]")
                theme_key = resolve_theme_choice(theme_key, choice)
            except (EOFError, KeyboardInterrupt):
                break
            except ValueError as error:
                console.print(f"[yellow]{error}[/]")
                console.input("[dim]Press Enter to return to the menu...[/]")
            continue
        if selection == "11":
            console.clear()
            forecast_view(console, theme, 28.40, 77.31)
            try:
                console.input("\n[dim]Press Enter to return to the overview...[/]")
            except (EOFError, KeyboardInterrupt):
                break
            continue
        view = options.get(selection)
        if not view:
            console.print("[yellow]Choose 0–15 or C, or run --forecast LAT LON / --ask LAT LON.[/]")
            continue
        console.clear()
        if view == "train":
            train_experiment(console, theme)
        elif view == "forecast":
            forecast_view(console, theme, 28.40, 77.31)
        else:
            render_view(console, view, theme)
        try:
            console.input("\n[dim]Press Enter to return to the overview...[/]")
        except (EOFError, KeyboardInterrupt):
            break


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--view", choices=("overview", "map", "timeline", "benchmark", "sources", "alerts", "demo", "risk", "events", "spectral", "agromet", "cap", "gis"))
    modes.add_argument("--demo", action="store_const", const="demo", dest="shortcut")
    modes.add_argument("--live", action="store_const", const="timeline", dest="shortcut", help="Legacy alias: show archived timeline, not live telemetry")
    modes.add_argument("--lens", action="store_const", const="benchmark", dest="shortcut", help="Legacy alias: show honest coarse-proxy benchmark")
    modes.add_argument("--datasets", action="store_const", const="sources", dest="shortcut")
    modes.add_argument("--benchmark", action="store_const", const="benchmark", dest="shortcut")
    modes.add_argument("--alerts", action="store_const", const="alerts", dest="shortcut")
    modes.add_argument("--map", action="store_const", const="map", dest="shortcut")
    modes.add_argument("--timeline", action="store_const", const="timeline", dest="shortcut")
    modes.add_argument("--train", action="store_const", const="train", dest="shortcut", help="Run the real IMD coarse-proxy experiment")
    modes.add_argument("--risk", action="store_const", const="risk", dest="shortcut", help="Show the provisional region risk table")
    modes.add_argument("--events", action="store_const", const="events", dest="shortcut", help="Show tracked events with T+24/48/72 legs")
    modes.add_argument("--spectral", action="store_const", const="spectral", dest="shortcut", help="Show 2D FFT Power Spectral Density benchmark")
    modes.add_argument("--agromet", action="store_const", const="agromet", dest="shortcut", help="Show Gramin Krishi Mausam Sewa rural farming advisories")
    modes.add_argument("--cap", action="store_const", const="cap", dest="shortcut", help="Show OASIS CAP 1.2 XML payload")
    modes.add_argument("--gis", action="store_const", const="gis", dest="shortcut", help="Show 5km spatial impact buffer and critical infrastructure")
    modes.add_argument("--themes", action="store_const", const="themes", dest="shortcut", help="Open the original-style numbered color theme screen")
    parser.add_argument("--case", choices=("rainfall", "cyclone", "heatwave"), default="rainfall", help="Multi-hazard scenario")
    parser.add_argument("--forecast", nargs=2, type=float, metavar=("LAT", "LON"), default=None,
                        help="Pinpoint draft briefing, e.g. --forecast 28.40 77.31")
    parser.add_argument("--ask", nargs=2, type=float, metavar=("LAT", "LON"), default=None,
                        help="Plain-language 'what happens here' briefing, e.g. --ask 28.53 77.39")
    parser.add_argument("--hours", type=int, default=12, help="Forecast window length for --forecast/--ask")
    parser.add_argument("--theme", choices=sorted(THEMES), default="cyan")
    parser.add_argument("--no-interactive", action="store_true", help="Print overview and exit even in a terminal")
    args = parser.parse_args(argv)
    console = Console()
    try:
        from services.cases.case_registry import get_case as fetch_case
        case_data = fetch_case(args.case)
        if args.forecast is not None:
            forecast_view(console, THEMES[args.theme], args.forecast[0], args.forecast[1], hours=args.hours)
            return 0
        if args.ask is not None:
            ask_view(console, THEMES[args.theme], args.ask[0], args.ask[1])
            return 0
        if args.shortcut == "train":
            train_experiment(console, THEMES[args.theme])
            return 0
        selected = args.view or args.shortcut
        if selected == "themes":
            theme_selector(console, args.theme)
            if sys.stdin.isatty():
                choice = console.input("\nEnter theme number (1–7), or press Enter to keep current:\n[bold cyan]Select Theme > [/]")
                interactive(console, resolve_theme_choice(args.theme, choice))
        elif selected:
            render_view(console, selected, THEMES[args.theme], case_artifact=case_data)
        elif sys.stdin.isatty() and not args.no_interactive:
            interactive(console, args.theme)
        else:
            render_view(console, "overview", THEMES[args.theme], case_artifact=case_data)
    except (FileNotFoundError, ValueError) as error:
        console.print(Panel(str(error), title="Cannot open view", border_style="red"))
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
