from io import StringIO

from rich.console import Console

from avarta_tui import CASE_FILE, THEMES, load_artifact, render_view


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
