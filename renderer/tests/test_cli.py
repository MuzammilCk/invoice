"""T7 tests: CLI interface (`python -m renderer`).

Run:
    pytest renderer/tests/test_cli.py -v
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent
FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"
SAMPLE_FIXTURE = FIXTURES_DIR / "matrix_no_item_rate_8.json"


def _run_cli(args: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(REPO_ROOT)
    cmd = [sys.executable, "-m", "renderer", *args]
    return subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, check=False)


class TestRendererCLI:
    def test_cli_help(self) -> None:
        result = _run_cli(["--help"])
        assert result.returncode == 0
        assert "render" in result.stdout

    def test_cli_render_default_out(self, tmp_path: Path) -> None:
        result = _run_cli(["render", str(SAMPLE_FIXTURE)], cwd=tmp_path)
        assert result.returncode == 0
        default_pdf = tmp_path / "invoice.pdf"
        assert default_pdf.is_file()
        assert default_pdf.stat().st_size > 0

    def test_cli_render_explicit_out_and_preview(self, tmp_path: Path) -> None:
        out_pdf = tmp_path / "custom_invoice.pdf"
        result = _run_cli([
            "render",
            str(SAMPLE_FIXTURE),
            "--out",
            str(out_pdf),
            "--preview",
        ])
        assert result.returncode == 0
        assert out_pdf.is_file()
        assert out_pdf.stat().st_size > 0

        # Check preview PNG generated
        preview_png = tmp_path / "custom_invoice_page1.png"
        assert preview_png.is_file()
        assert preview_png.stat().st_size > 0

    def test_cli_file_not_found(self, tmp_path: Path) -> None:
        result = _run_cli(["render", str(tmp_path / "nonexistent.json")])
        assert result.returncode != 0
        assert "not found" in result.stderr.lower()

    def test_cli_invalid_json(self, tmp_path: Path) -> None:
        bad_file = tmp_path / "bad.json"
        bad_file.write_text("{not valid json")
        result = _run_cli(["render", str(bad_file)])
        assert result.returncode != 0
        assert "invalid json" in result.stderr.lower()
