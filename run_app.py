#!/usr/bin/env python3
"""
Avarta Unified Platform Single-Port Launcher.

Launches the complete Avarta platform (Single-viewport Landing Page + Replay Lab +
All 9 Multi-Page Intelligence Tools + NWP APIs) on a single port.

Usage:
    python run_app.py               # Starts on port 3000 (default)
    python run_app.py --port 8000   # Starts on port 8000
    python run_app.py --dev         # Starts in dev mode with hot reloading
"""

import argparse
import os
import signal
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Run Avarta Platform on a single port")
    parser.add_argument(
        "--port",
        "-p",
        type=int,
        default=3000,
        help="Port to serve entire platform on (default: 3000)",
    )
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Run in development mode (hot reloading) instead of production build",
    )
    args = parser.parse_args()

    root_dir = Path(__file__).resolve().parent
    avarta_dir = root_dir / "avarta"
    next_build = avarta_dir / ".next"

    mode = "dev" if args.dev or not next_build.exists() else "start"
    port = args.port

    print("=" * 66)
    print("  🌀 AVARTA ATMOSPHERIC INTELLIGENCE PLATFORM (Single Port)")
    print("=" * 66)
    print(f"  Unified URL:            http://localhost:{port}/")
    print(f"  Replay Lab:             http://localhost:{port}/dashboard")
    print(f"  PINN Downscaling Lab:   http://localhost:{port}/dashboard/downscaling")
    print(f"  All-India Risk Map:     http://localhost:{port}/dashboard/risk")
    print(f"  Kalman 4D Trajectory:   http://localhost:{port}/dashboard/trajectory")
    print(f"  Mission Control TUI:    http://localhost:{port}/dashboard/terminal")
    print(f"  OASIS CAP 1.2 Feed:     http://localhost:{port}/dashboard/inspector")
    print(f"  Meteorological Copilot: http://localhost:{port}/dashboard/ask")
    print(f"  Live Demo Showcase:     http://localhost:{port}/dashboard/demo")
    print("=" * 66)
    print(f"  [Avarta] Mode: {mode.upper()} on port {port}")
    print("  [Avarta] Only 1 port required. Press Ctrl+C to stop.")
    print("=" * 66 + "\n")

    cmd = ["npm", "--prefix", str(avarta_dir), "run", mode, "--", "-p", str(port)]
    try:
        proc = subprocess.Popen(cmd, cwd=str(root_dir))
        proc.wait()
    except KeyboardInterrupt:
        print("\n[Avarta] Shutting down server...")
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        print("[Avarta] Server stopped successfully.")


if __name__ == "__main__":
    main()
