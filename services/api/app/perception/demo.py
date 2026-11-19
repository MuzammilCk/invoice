"""30-phrase demo script and acceptance runner for Perception Kernel (BP 15).

Run via:
    python -m app.perception.demo
or
    python services/api/app/perception/demo.py
"""

import sys
from datetime import date
from decimal import Decimal

from contracts.proposal import (
    CandidateMatch,
    ProposalFlag,
    StepKey,
    VoiceCommand,
)
from services.api.app.perception.builder import build_proposal

# Sample memory fixtures for demo
DEMO_CANDIDATES = [
    CandidateMatch(id="c1", display_name="Asha Stores", norm_name="asha stores"),
    CandidateMatch(id="c2", display_name="National Hardware", norm_name="national hardware"),
    CandidateMatch(id="c3", display_name="Kochi Builders", norm_name="kochi builders"),
]

DEMO_ALIASES = {
    "asha": "c1",
    "hardware": "c2",
}

DEMO_RATES = [
    Decimal("450.00"),
    Decimal("460.00"),
    Decimal("455.00"),
    Decimal("450.00"),
]

DEMO_REF_DATE = date(2026, 11, 18)


def run_demo(verbose: bool = True) -> tuple[int, int, int]:
    """Execute the 30-phrase demo and print a clean verification report."""
    cases = [
        # (step, input, check_fn, description)
        (
            StepKey.RECIPIENT,
            "Asha Stores",
            lambda p: p.value == "Asha Stores" and p.matched_id == "c1",
            "Exact memory match",
        ),
        (
            StepKey.RECIPIENT,
            "asha",
            lambda p: p.value == "Asha Stores" and p.matched_id == "c1",
            "Alias match",
        ),
        (
            StepKey.RECIPIENT,
            "Asha Stor",
            lambda p: ProposalFlag.NEAR_MATCH in p.flags or p.matched_id == "c1",
            "Near match",
        ),
        (
            StepKey.RECIPIENT,
            "Sunrise Bakery",
            lambda p: ProposalFlag.NEW_CUSTOMER in p.flags and p.value == "Sunrise Bakery",
            "New customer",
        ),
        (
            StepKey.RECIPIENT,
            "  kerala   electricals  ",
            lambda p: p.value == "Kerala Electricals",
            "Title Case & collapsed whitespace",
        ),
        (
            StepKey.DATE,
            "today",
            lambda p: p.value == DEMO_REF_DATE.isoformat(),
            "Relative 'today'",
        ),
        (
            StepKey.DATE,
            "yesterday",
            lambda p: p.value == "2026-11-17",
            "Relative 'yesterday'",
        ),
        (
            StepKey.DATE,
            "ഇന്ന്",
            lambda p: p.value == DEMO_REF_DATE.isoformat(),
            "Malayalam 'today'",
        ),
        (
            StepKey.DATE,
            "10/11/2026",
            lambda p: p.value == "2026-11-10",
            "Standard Indian format (DD/MM/YYYY)",
        ),
        (
            StepKey.DATE,
            "15 January 2026",
            lambda p: (
                p.value == "2026-01-15"
                and bool(p.clarification_text and "45 days" in p.clarification_text)
            ),
            "Date > 45 days warning",
        ),
        (
            StepKey.ITEM,
            "pvc pipe 1 inch",
            lambda p: "PVC Pipe 1 Inch" in p.display,
            "<=4 letter acronyms uppercase",
        ),
        (
            StepKey.ITEM,
            "led bulb 9w",
            lambda p: "LED Bulb 9W" in p.display,
            "Alphanumeric token casing",
        ),
        (
            StepKey.ITEM,
            "cement 5 bags",
            lambda p: ProposalFlag.EXTRA_NUMBER in p.flags and "Cement Bags" in p.display,
            "Extra number extracted from item",
        ),
        (
            StepKey.ITEM,
            "asian paints 500",
            lambda p: ProposalFlag.EXTRA_NUMBER in p.flags and "Asian Paints" in p.display,
            "Trailing number extracted",
        ),
        (
            StepKey.ITEM,
            "steel rods",
            lambda p: p.value == "Steel Rods",
            "Clean item normalization",
        ),
        (
            StepKey.QTY,
            "1",
            lambda p: p.value == "1",
            "Integer quantity",
        ),
        (
            StepKey.QTY,
            "5",
            lambda p: p.value == "5" and p.words == "Five",
            "Quantity in words",
        ),
        (
            StepKey.QTY,
            "half",
            lambda p: p.value == "0.5" and p.words == "Zero point five",
            "Fraction 'half'",
        ),
        (
            StepKey.QTY,
            "one and a half",
            lambda p: p.value == "1.5" and p.words == "One point five",
            "Compound fraction 'one and a half'",
        ),
        (
            StepKey.QTY,
            "രണ്ടര",
            lambda p: p.value == "2.5" and p.words == "Two point five",
            "Malayalam fraction 'two and a half'",
        ),
        (
            StepKey.QTY,
            "150",
            lambda p: p.value == "150" and (p.clarification_text and "100" in p.clarification_text),
            "Quantity > 100 warning",
        ),
        (
            StepKey.RATE,
            "450",
            lambda p: (
                p.value == "450.00"
                and "₹450.00" in p.display
                and p.words == "Four hundred fifty"
            ),
            "Rate in words and currency display",
        ),
        (
            StepKey.RATE,
            "₹ 1,500.50",
            lambda p: p.value == "1500.50" and "₹1,500.50" in p.display,
            "Currency symbols and commas stripped",
        ),
        (
            StepKey.RATE,
            "1.5k",
            lambda p: p.value == "1500.00" and "₹1,500.00" in p.display,
            "Shorthand '1.5k'",
        ),
        (
            StepKey.RATE,
            "fifteen hundred",
            lambda p: p.value == "1500.00" and p.words == "One thousand five hundred",
            "Spoken number words",
        ),
        (
            StepKey.RATE,
            "5000",
            lambda p: ProposalFlag.PRICE_OUTLIER in p.flags and "5,000.00" in p.display,
            "Price outlier (> 5x recent median)",
        ),
        (
            StepKey.COMMAND,
            "ok",
            lambda p: p.command == VoiceCommand.CONFIRM,
            "Voice command: CONFIRM (EN)",
        ),
        (
            StepKey.COMMAND,
            "ശരി",
            lambda p: p.command == VoiceCommand.CONFIRM,
            "Voice command: CONFIRM (ML)",
        ),
        (
            StepKey.COMMAND,
            "back",
            lambda p: p.command == VoiceCommand.BACK,
            "Voice command: BACK",
        ),
        (
            StepKey.COMMAND,
            "done",
            lambda p: p.command == VoiceCommand.DONE,
            "Voice command: DONE",
        ),
    ]

    total = len(cases)
    passed = 0
    failed = 0

    if verbose:
        print("=" * 86)
        hdr = f"{'#':<3} | {'Step':<9} | {'Input Phrase':<20} | {'Display Output':<20} | {'Status'}"
        print(hdr)
        print("-" * 86)

    for idx, (step, inp, check_fn, desc) in enumerate(cases, 1):
        prop = build_proposal(
            step_key=step,
            raw_input=inp,
            candidates=DEMO_CANDIDATES,
            aliases=DEMO_ALIASES,
            recent_rates=DEMO_RATES,
            reference_today=DEMO_REF_DATE,
        )

        ok = check_fn(prop)
        if ok:
            passed += 1
            status_str = "PASS"
        else:
            failed += 1
            status_str = "FAIL"

        if verbose:
            disp = prop.display[:20] if prop.display else (prop.value[:20] if prop.value else "")
            print(f"{idx:<3} | {step:<9} | {inp:<22} | {disp:<22} | {status_str} ({desc})")

    if verbose:
        print("=" * 90)
        print(f"Result: {passed}/{total} phrases passed, {failed} failed.")
        print("=" * 90)

    return total, passed, failed


if __name__ == "__main__":
    _, _, failed_count = run_demo(verbose=True)
    sys.exit(0 if failed_count == 0 else 1)
