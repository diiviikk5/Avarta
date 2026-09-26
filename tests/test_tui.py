from io import StringIO

from rich.console import Console

from avarta_tui import (CASE_FILE, THEMES, load_artifact, render_view,
                        resolve_theme_choice, theme_selector)


def capture(view: str, width: int = 80) -> str:
    buffer = StringIO()
    console = Console(file=buffer, width=width, force_terminal=False, color_system=None)
    render_view(console, view, THEMES["forest"])
    return buffer.getvalue()


def test_overview_uses_computed_replay_values():
    report = load_artifact(CASE_FILE)
    output = capture("overview")
    assert str(report["verification"]["forecast_peak_mm_day"]) in output
    assert str(report["verification"]["observed_peak_mm_day"]) in output
    assert "NO PUBLIC ALERT" in output
    assert "RESEARCH ONLY" in output


def test_demo_is_unambiguously_fictional():
    output = capture("demo")
    assert "SYNTHETIC DESIGN DEMO" in output
    assert "NOT A FORECAST" in output
    assert "fictional" in output.lower()


def test_map_keeps_markers_at_narrow_width():
    output = capture("map", width=60)
    assert "◆" in output
    assert "●" in output
    assert "░░" in output
    assert "▒▒" in output
    assert "not a 5 km impact map" in output


def test_benchmark_is_separate_from_forecast_replay():
    output = capture("benchmark")
    assert "SEPARATE IMD COARSE-PROXY EXPERIMENT" in output
    assert "not an independent NWP forecast" in output


def test_alert_view_never_sends_warning():
    output = capture("alerts")
    assert "draft_decision_support" in output
    assert "not_sent" in output
    assert "NO PUBLIC ALERT" in output


def test_tui_api_bridge_views():
    from services.tui_api_bridge import execute_tui_command

    # Test overview
    res_overview = execute_tui_command("overview", case_name="rainfall", theme_name="forest")
    assert res_overview["status"] == "ok"
    assert "<span" in res_overview["html"]
    assert "CASE OVERVIEW" in res_overview["raw"]

    # Test spectral
    res_spectral = execute_tui_command("spectral", case_name="cyclone", theme_name="cyan")
    assert res_spectral["status"] == "ok"
    assert "SPECTRAL" in res_spectral["raw"]

    # Test numeric shortcut '2' (map)
    res_map = execute_tui_command("2", case_name="rainfall", theme_name="forest")
    assert res_map["status"] == "ok"
    assert res_map["view"] == "map"

    # Test forecast
    res_fc = execute_tui_command("forecast 28.40 77.31", case_name="rainfall")
    assert res_fc["status"] == "ok"
    assert res_fc["view"] == "forecast"


def test_original_style_theme_screen_is_available_without_false_live_claims():
    buffer = StringIO()
    console = Console(file=buffer, width=100, force_terminal=False, color_system=None)
    theme_selector(console, "amber")
    output = buffer.getvalue()
    assert "AVARTA COLOR THEME SWITCHER" in output
    assert "Solar Thermal Gold" in output
    assert "● CURRENT" in output
    assert "CONDITIONAL DDPM" not in output  # label is explicit and lowercase
    assert "untrained" in output
    assert "RESEARCH ONLY" in output
    assert "TENSOR ENGINE SYNCHRONIZED" not in output
    assert resolve_theme_choice("amber", "1") == "cyan"
    assert resolve_theme_choice("amber", "") == "amber"

