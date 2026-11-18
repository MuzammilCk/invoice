"""Module entry point for `python -m renderer`."""
from __future__ import annotations

import sys

from renderer.cli import main

if __name__ == "__main__":
    sys.exit(main())
