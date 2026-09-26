"""Build the real archived GEFS → IMD rainfall replay used by the dashboard.

Requires the official IMD 2025 annual binary under data/raw/. This command
never sends an alert; it writes a retrospective research artifact only.
"""

from services.replay.august_2025 import main


if __name__ == "__main__":
    main()
