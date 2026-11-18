"""Domain and perception checks engine (BP 3.1, 5.1, 5.4)."""

import re
from datetime import date
from decimal import Decimal
from statistics import median

from contracts.proposal import ProposalFlag
from services.api.app.perception.matcher import MatchResult


def check_recipient(
    text: str,
    match_result: MatchResult | None = None,
) -> tuple[bool, list[ProposalFlag], str | None]:
    """Validate recipient text and associate matching flags (BP 3.1, 5.1)."""
    raw = text.strip()
    if not raw:
        return False, [], "Recipient name cannot be empty"
    if len(raw) > 80:
        return False, [], "Recipient name exceeds 80 characters"

    flags: list[ProposalFlag] = []
    warning: str | None = None

    if match_result:
        if match_result.is_new:
            flags.append(ProposalFlag.NEW_CUSTOMER)
        elif match_result.is_near:
            flags.append(ProposalFlag.NEAR_MATCH)

    return True, flags, warning


def check_date_bounds(
    d: date,
    reference_today: date | None = None,
) -> tuple[bool, list[ProposalFlag], str | None]:
    """Check date is within 45 days of reference today (BP 5.1)."""
    from services.api.app.perception.date import get_today_kolkata

    ref = reference_today if reference_today is not None else get_today_kolkata()
    diff = abs((d - ref).days)
    if diff > 45:
        return True, [], f"Date is more than 45 days from today ({diff} days difference)"
    return True, [], None


def check_qty(qty: Decimal | None) -> tuple[bool, list[ProposalFlag], str | None]:
    """Validate quantity limits, decimal places, and high-value warnings (BP 3.1, 5.1)."""
    if qty is None or qty <= Decimal("0"):
        return False, [], "Quantity must be greater than 0"

    if qty > Decimal("100000"):
        return False, [], "Quantity cannot exceed 100,000"

    # Check up to 3 decimal places
    exp = qty.as_tuple().exponent
    if isinstance(exp, int) and exp < -3:
        return False, [], "Quantity cannot have more than 3 decimal places"

    flags: list[ProposalFlag] = []
    warning: str | None = None

    if qty > Decimal("100"):
        warning = f"Quantity {qty} is unusually high (> 100)"

    return True, flags, warning


def check_rate(
    rate: Decimal | None,
    recent_rates: list[Decimal] | None = None,
) -> tuple[bool, list[ProposalFlag], str | None]:
    """Validate rate limits, 2 decimal places, outlier checks, and warnings (BP 3.1, 5.1)."""
    if rate is None or rate <= Decimal("0"):
        return False, [], "Rate must be greater than 0"

    if rate > Decimal("10000000"):
        return False, [], "Rate cannot exceed 10,000,000"

    # Check up to 2 decimal places
    exp = rate.as_tuple().exponent
    if isinstance(exp, int) and exp < -2:
        return False, [], "Rate cannot have more than 2 decimal places"

    flags: list[ProposalFlag] = []
    warning: str | None = None

    # Outlier check against recent rates median (BP 5.1)
    rates_history = recent_rates or []
    if len(rates_history) >= 3:
        med = Decimal(str(median(rates_history)))
        lower_bound = Decimal("0.2") * med
        upper_bound = Decimal("5.0") * med
        if rate < lower_bound or rate > upper_bound:
            flags.append(ProposalFlag.PRICE_OUTLIER)
            warning = f"Rate {rate} is outside 0.2x to 5x of recent median ({med})"

    # Absolute high rate warning (BP 5.1: > 1,00,000)
    if rate > Decimal("100000"):
        high_warn = "Rate is unusually high (> 1,00,000)"
        warning = f"{warning}; {high_warn}" if warning else high_warn

    return True, flags, warning


# Units representing dimensions / product specifications (not quantity or price)
_SPEC_UNIT_PATTERN = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(inch|in|\"|mm|cm|meter|mtr|m|kg|gm|g|ltr|liter|litre|ml|w|watt|v|volt|hp|gauge|ply)\b",
    re.IGNORECASE,
)


def check_item_text(
    text: str,
) -> tuple[bool, str, Decimal | None, list[ProposalFlag], str | None]:
    """Validate item text, enforce 120 char limit, and extract extra numbers (BP 5.4, 6.5)."""
    raw = text.strip()
    if not raw:
        return False, "", None, [], "Item description cannot be empty"

    if len(raw) > 120:
        return False, raw, None, [], "Item description exceeds 120 characters"

    flags: list[ProposalFlag] = []
    extra_number: Decimal | None = None
    cleaned = raw

    # Find all number tokens
    for match in re.finditer(r"\b(\d+(?:\.\d+)?)\b", raw):
        num_str = match.group(1)
        start, end = match.span()

        # Check if this number is part of a dimension spec (e.g. 1 Inch, 9W, 10mm)
        sub_window = raw[start : min(len(raw), end + 15)]
        if _SPEC_UNIT_PATTERN.match(sub_window):
            # This number belongs to a dimension specification, skip it
            continue

        # Otherwise it is an extra number (e.g. "5 Bags", "500")
        extra_number = Decimal(num_str)
        flags.append(ProposalFlag.EXTRA_NUMBER)
        # Strip number from cleaned text
        cleaned = raw[:start] + raw[end:]
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        break

    return True, cleaned, extra_number, flags, None
