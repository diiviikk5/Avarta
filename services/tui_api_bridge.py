"""Bridge script connecting the web dashboard to the rich terminal UI (avarta_tui.py).

Accepts CLI arguments or a command string, renders the view using Python Rich with exact
inline CSS styling and raw text, and returns a JSON payload to stdout.
"""

from __future__ import annotations

import io
import json
import shlex
import sys
import time
from pathlib import Path
from typing import Any

# Ensure project root is in sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import avarta_tui
from rich.console import Console


def execute_tui_command(
    command_str: str = "",
    case_name: str = "rainfall",
    theme_name: str = "forest",
    width: int = 85,
) -> dict[str, Any]:
    start_time = time.perf_counter()

    # Parse arguments
    args = shlex.split(command_str.strip()) if command_str.strip() else []

    # Filter out 'python', 'avarta_tui.py', or 'avarta' prefix if user typed it
    if args and args[0] in ("python", "python3", "./avarta_tui.py", "avarta_tui.py", "avarta"):
        args = args[1:]
    if args and args[0] in ("avarta_tui.py", "avarta"):
        args = args[1:]

    # Parse options or recognize direct subcommands
    view = "overview"
    case = case_name
    theme = theme_name
    forecast_coords: tuple[float, float] | None = None
    ask_coords: tuple[float, float] | None = None
    hours = 12

    # Map of numeric shortcuts matching avarta_tui.py interactive menu
    NUMERIC_MAP = {
        "1": "overview",
        "2": "map",
        "3": "timeline",
        "4": "benchmark",
        "5": "sources",
        "6": "alerts",
        "7": "demo",
        "8": "train",
        "9": "risk",
        "10": "events",
        "11": "forecast",
        "12": "spectral",
        "13": "agromet",
        "14": "cap",
        "15": "gis",
    }

    # Handle numeric input
    if len(args) == 1 and args[0] in NUMERIC_MAP:
        view = NUMERIC_MAP[args[0]]
        if view == "forecast":
            forecast_coords = (28.40, 77.31)
    elif len(args) > 0:
        first = args[0].lower()
        if first in NUMERIC_MAP.values():
            view = first
            args = args[1:]
            if view in ("forecast", "ask") and len(args) >= 2:
                try:
                    coords = (float(args[0]), float(args[1]))
                    if view == "forecast":
                        forecast_coords = coords
                    else:
                        ask_coords = coords
                    args = args[2:]
                except ValueError:
                    pass
        elif first in ("help", "--help", "-h"):
            view = "help"
            args = args[1:]
        elif first in ("interactive", "menu"):
            view = "interactive_menu"
            args = args[1:]

    # Parse remaining standard CLI flags
    i = 0
    while i < len(args):
        arg = args[i]
        if arg in ("--view", "-v") and i + 1 < len(args):
            view = args[i + 1].lower()
            i += 2
        elif arg == "--case" and i + 1 < len(args):
            case = args[i + 1].lower()
            i += 2
        elif arg == "--theme" and i + 1 < len(args):
            theme = args[i + 1].lower()
            i += 2
        elif arg == "--forecast" and i + 2 < len(args):
            try:
                forecast_coords = (float(args[i + 1]), float(args[i + 2]))
                view = "forecast"
                i += 3
            except ValueError:
                i += 1
        elif arg == "--ask" and i + 2 < len(args):
            try:
                ask_coords = (float(args[i + 1]), float(args[i + 2]))
                view = "ask"
                i += 3
            except ValueError:
                i += 1
        elif arg == "--hours" and i + 1 < len(args):
            try:
                hours = int(args[i + 1])
                i += 2
            except ValueError:
                i += 1
        elif arg.startswith("--"):
            flag = arg[2:].lower()
            if flag in ("overview", "map", "timeline", "benchmark", "sources", "alerts",
                        "demo", "risk", "events", "spectral", "agromet", "cap", "gis", "train"):
                view = flag
            elif flag == "datasets":
                view = "sources"
            elif flag in ("cyclone", "heatwave", "rainfall"):
                case = flag
            i += 1
        else:
            i += 1

    # Validate theme and case
    active_theme = avarta_tui.THEMES.get(theme, avarta_tui.THEMES["forest"])
    if case not in ("rainfall", "cyclone", "heatwave"):
        case = "rainfall"

    # Setup capture console
    output_buffer = io.StringIO()
    console = Console(record=True, width=width, file=output_buffer, force_terminal=True)

    try:
        from services.cases.case_registry import get_case as fetch_case
        case_data = fetch_case(case)

        if view == "help":
            render_help_view(console, active_theme)
        elif view == "interactive_menu":
            render_interactive_menu(console, active_theme, case_data)
        elif view == "forecast":
            lat, lon = forecast_coords if forecast_coords else (28.40, 77.31)
            avarta_tui.forecast_view(console, active_theme, lat, lon, hours=hours)
        elif view == "ask":
            lat, lon = ask_coords if ask_coords else (28.53, 77.39)
            avarta_tui.ask_view(console, active_theme, lat, lon)
        elif view == "train":
            console.print("[bold yellow]⚡ IMD Coarse-Proxy Residual CNN Model Benchmark[/]")
            benchmark_data = avarta_tui.load_artifact(avarta_tui.BENCHMARK_FILE)
            avarta_tui.benchmark(console, benchmark_data, active_theme)
        else:
            avarta_tui.render_view(console, view, active_theme, case_artifact=case_data)

    except Exception as exc:
        from rich.panel import Panel
        console.print(Panel(f"[bold red]Command Error:[/] {exc}\n\nType 'help' to see valid views and parameters.",
                            title="EXECUTION ERROR", border_style="red"))

    html_content = console.export_html(inline_styles=True, code_format="{code}")
    raw_content = output_buffer.getvalue()
    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return {
        "status": "ok",
        "view": view,
        "case": case,
        "theme": theme,
        "command": command_str,
        "execution_time_ms": elapsed_ms,
        "html": html_content,
        "raw": raw_content,
        "available_views": [
            "overview", "map", "timeline", "benchmark", "sources", "alerts",
            "demo", "risk", "events", "forecast", "spectral", "agromet", "cap", "gis", "ask"
        ],
        "available_cases": ["rainfall", "cyclone", "heatwave"],
        "available_themes": list(avarta_tui.THEMES.keys()),
    }


def render_help_view(console: Console, theme: tuple[str, str, str]) -> None:
    from rich import box
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text

    primary, accent, muted = theme
    avarta_tui.banner(console, "tui command guide", theme)

    table = Table(box=box.SIMPLE_HEAVY, header_style=f"bold {primary}", expand=True)
    table.add_column("Command / Shortcut", style="bold")
    table.add_column("Description")
    table.add_column("Example Syntax", style=muted)

    commands = [
        ("1 / overview", "Executive briefing and verification metrics", "avarta --view overview"),
        ("2 / map", "2D ASCII rainfall grid with IMD ground truth", "avarta --view map"),
        ("3 / timeline", "Event tracking timeline with bounding boxes", "avarta --timeline"),
        ("4 / benchmark", "Residual CNN vs Bilinear spatial metrics", "avarta --benchmark"),
        ("5 / sources", "Data provenance, GRIB headers, SHA-256 hashes", "avarta --datasets"),
        ("6 / alerts", "Draft alert thresholds and disposition", "avarta --alerts"),
        ("7 / demo", "Hand-authored extreme scenario testbeds", "avarta --demo"),
        ("8 / train", "IMD real-data training benchmark metrics", "avarta --train"),
        ("9 / risk", "Subcontinent region risk classifications", "avarta --risk"),
        ("10 / events", "Tracked event trajectories with T+24/48/72 legs", "avarta --events"),
        ("11 / forecast", "Pinpoint coordinate forecast with anomaly σ", "forecast 28.40 77.31"),
        ("12 / spectral", "2D FFT Power Spectral Density benchmark", "avarta --spectral"),
        ("13 / agromet", "Gramin Krishi Mausam Sewa crop advisories", "avarta --agromet"),
        ("14 / cap", "OASIS CAP 1.2 XML transmission payload", "avarta --cap"),
        ("15 / gis", "5km spatial threat buffer & critical lifelines", "avarta --gis"),
        ("ask <lat> <lon>", "Plain-language 'what happens here' briefing", "ask 28.53 77.39"),
        ("clear", "Clears the active terminal output screen", "clear"),
        ("theme <name>", "Switch terminal color palette", "theme midnight"),
        ("case <hazard>", "Switch dataset (rainfall, cyclone, heatwave)", "case cyclone"),
    ]

    for cmd, desc, ex in commands:
        table.add_row(cmd, desc, ex)

    console.print(table)
    console.print(Panel(
        "Supported Themes: forest · emerald · midnight · stealth · cyan · amber · aurora · crimson · synthwave · mono\n"
        "Multi-Hazard Cases: rainfall (August 2025) · cyclone (Amphan 2020) · heatwave (North India 2024)",
        title="ENVIRONMENT CONFIGURATION", border_style=accent
    ))


def render_interactive_menu(console: Console, theme: tuple[str, str, str], report: dict) -> None:
    from rich import box
    from rich.rule import Rule
    from rich.table import Table

    avarta_tui.interactive_home(console, report, theme)
    console.print(Rule("INTERACTIVE MENU MODES (Type number to run)", style=theme[0]))

    table = Table(box=box.MINIMAL, expand=True)
    table.add_column("No.", style="bold cyan", width=4)
    table.add_column("View", style="bold")
    table.add_column("No.", style="bold cyan", width=4)
    table.add_column("View", style="bold")

    table.add_row("[1]", "Overview Deck", "[9]", "Risk Matrix")
    table.add_row("[2]", "2D Rain Grid Map", "[10]", "Tracked Events")
    table.add_row("[3]", "Track Timeline", "[11]", "Forecast (28.40, 77.31)")
    table.add_row("[4]", "Model Benchmark", "[12]", "Spectral PSD Analysis")
    table.add_row("[5]", "Data Provenance", "[13]", "Agromet Advisories (GKMS)")
    table.add_row("[6]", "Draft Alert Status", "[14]", "OASIS CAP 1.2 XML")
    table.add_row("[7]", "Prototype Demo", "[15]", "5km GIS Infrastructure")
    table.add_row("[8]", "Residual CNN Train", "[0]", "Exit / Clear")

    console.print(table)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Avarta TUI Web API Bridge")
    parser.add_argument("cmd", nargs="*", default=[], help="Command string or arguments")
    parser.add_argument("--case", default="rainfall", help="Active hazard case")
    parser.add_argument("--theme", default="forest", help="Active terminal theme")
    parser.add_argument("--width", type=int, default=85, help="Terminal column width")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")

    parsed = parser.parse_args()
    cmd_line = " ".join(parsed.cmd)

    result = execute_tui_command(
        command_str=cmd_line,
        case_name=parsed.case,
        theme_name=parsed.theme,
        width=parsed.width,
    )

    if parsed.json or not sys.stdout.isatty():
        print(json.dumps(result))
    else:
        print(result["raw"])
