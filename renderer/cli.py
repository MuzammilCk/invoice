"""Command-line interface for the invoice renderer.

Usage:
    python -m renderer render sample.json [--out invoice.pdf] [--preview]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from pydantic import ValidationError

from contracts.render_model import RenderModel
from renderer.engine import previews, render
from renderer.layout import RenderLimitExceeded


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m renderer",
        description="Voice-to-Invoice deterministic PDF and preview renderer.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    render_parser = subparsers.add_parser("render", help="Render a JSON RenderModel into a PDF invoice.")
    render_parser.add_argument("input_file", type=str, help="Path to input RenderModel JSON file.")
    render_parser.add_argument(
        "--out",
        "-o",
        type=str,
        default="invoice.pdf",
        help="Path for output PDF file (default: invoice.pdf).",
    )
    render_parser.add_argument(
        "--preview",
        action="store_true",
        help="Also generate PNG preview images for each page.",
    )
    render_parser.add_argument(
        "--design",
        "-d",
        type=str,
        default="design1",
        help="Skin design ID (default: design1).",
    )

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = create_parser()
    args = parser.parse_args(argv)

    if args.command == "render":
        input_path = Path(args.input_file)
        if not input_path.is_file():
            sys.stderr.write(f"Error: Input file '{input_path}' not found.\n")
            return 1

        try:
            raw_text = input_path.read_text(encoding="utf-8")
            data = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            sys.stderr.write(f"Error: Invalid JSON in '{input_path}': {exc}\n")
            return 1

        try:
            model = RenderModel.model_validate(data)
        except ValidationError as exc:
            sys.stderr.write(f"Error: Schema validation failed for '{input_path}':\n{exc}\n")
            return 1

        try:
            pdf_bytes, page_count = render(model, design_id=args.design)
        except (ValueError, RenderLimitExceeded) as exc:
            sys.stderr.write(f"Error during rendering: {exc}\n")
            return 1

        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_bytes(pdf_bytes)
        print(f"Rendered {page_count} page(s) to {out_path}")

        if args.preview:
            png_pages = previews(pdf_bytes, dpi=110)
            stem = out_path.stem
            parent = out_path.parent
            for idx, png_data in enumerate(png_pages, 1):
                preview_path = parent / f"{stem}_page{idx}.png"
                preview_path.write_bytes(png_data)
                print(f"Generated preview: {preview_path}")

        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
