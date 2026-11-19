"""Date parser and Asia/Kolkata timezone handling (BP 3.1, 5.1)."""

import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

_MONTHS = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}

_RELATIVE_DATES = {
    "today": 0,
    "yesterday": -1,
    "tomorrow": 1,
    "ഇന്ന്": 0,
    "ഇന്നലെ": -1,
    "നാളെ": 1,
}


@dataclass
class DateParseResult:
    """Result of parsing a date input."""

    value: date | None
    iso_value: str | None
    display: str
    raw: str
    is_relative: bool = False
    warning: str | None = None


def get_today_kolkata() -> date:
    """Return today's date in Asia/Kolkata timezone (BP 3.1)."""
    return datetime.now(ZoneInfo("Asia/Kolkata")).date()


def format_date_display(d: date) -> str:
    """Format date into standard presentation (e.g. '10 November 2026') (BP 3.1)."""
    month_name = d.strftime("%B")
    return f"{d.day} {month_name} {d.year}"


def parse_date(text: str, reference_today: date | None = None) -> DateParseResult:
    """Parse a date string or relative term into a valid date (BP 3.1, 5.1)."""
    raw = text.strip()
    if not raw:
        return DateParseResult(
            value=None, iso_value=None, display=raw, raw=raw, warning=None
        )

    ref = reference_today if reference_today is not None else get_today_kolkata()
    lower = raw.lower()

    # 1. Check relative date terms
    if lower in _RELATIVE_DATES:
        offset = _RELATIVE_DATES[lower]
        target_date = ref + timedelta(days=offset)
        return DateParseResult(
            value=target_date,
            iso_value=target_date.isoformat(),
            display=format_date_display(target_date),
            raw=raw,
            is_relative=True,
            warning=None,
        )

    # 2. Check ISO formats: YYYY-MM-DD or YYYY/MM/DD
    iso_match = re.match(r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$", raw)
    if iso_match:
        try:
            y, m, d = (
                int(iso_match.group(1)),
                int(iso_match.group(2)),
                int(iso_match.group(3)),
            )
            parsed_d = date(y, m, d)
            diff_days = abs((parsed_d - ref).days)
            warning = (
                f"Date is more than 45 days from today ({diff_days} days difference)"
                if diff_days > 45
                else None
            )
            return DateParseResult(
                value=parsed_d,
                iso_value=parsed_d.isoformat(),
                display=format_date_display(parsed_d),
                raw=raw,
                warning=warning,
            )
        except ValueError:
            pass

    # 3. Clean ordinal suffixes: 10th -> 10, 1st -> 1, 2nd -> 2, 3rd -> 3
    cleaned = re.sub(r"(\d+)(st|nd|rd|th)\b", r"\1", raw, flags=re.IGNORECASE)
    cleaned = cleaned.replace(",", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # 4. Standard Indian numeric formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    numeric_match = re.match(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$", cleaned)
    if numeric_match:
        try:
            d_val = int(numeric_match.group(1))
            m_val = int(numeric_match.group(2))
            y_val = int(numeric_match.group(3))
            parsed_d = date(y_val, m_val, d_val)
            diff_days = abs((parsed_d - ref).days)
            warning = (
                f"Date is more than 45 days from today ({diff_days} days difference)"
                if diff_days > 45
                else None
            )
            return DateParseResult(
                value=parsed_d,
                iso_value=parsed_d.isoformat(),
                display=format_date_display(parsed_d),
                raw=raw,
                warning=warning,
            )
        except ValueError:
            pass

    # 5. Natural month name formats: "10 November 2026", "Nov 10 2026", "10 November"
    # Format: <day> <month> <optional year>
    day_month_match = re.match(
        r"^(\d{1,2})\s+([a-zA-Z]+)(?:\s+(\d{4}))?$", cleaned
    )
    if day_month_match:
        d_val = int(day_month_match.group(1))
        month_str = day_month_match.group(2).lower()
        y_val = int(day_month_match.group(3)) if day_month_match.group(3) else ref.year
        if month_str in _MONTHS:
            m_val = _MONTHS[month_str]
            try:
                parsed_d = date(y_val, m_val, d_val)
                diff_days = abs((parsed_d - ref).days)
                warning = (
                    f"Date is more than 45 days from today ({diff_days} days difference)"
                    if diff_days > 45
                    else None
                )
                return DateParseResult(
                    value=parsed_d,
                    iso_value=parsed_d.isoformat(),
                    display=format_date_display(parsed_d),
                    raw=raw,
                    warning=warning,
                )
            except ValueError:
                pass

    # Format: <month> <day> <optional year> (e.g. "November 10 2026")
    month_day_match = re.match(
        r"^([a-zA-Z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$", cleaned
    )
    if month_day_match:
        month_str = month_day_match.group(1).lower()
        d_val = int(month_day_match.group(2))
        y_val = int(month_day_match.group(3)) if month_day_match.group(3) else ref.year
        if month_str in _MONTHS:
            m_val = _MONTHS[month_str]
            try:
                parsed_d = date(y_val, m_val, d_val)
                diff_days = abs((parsed_d - ref).days)
                warning = (
                    f"Date is more than 45 days from today ({diff_days} days difference)"
                    if diff_days > 45
                    else None
                )
                return DateParseResult(
                    value=parsed_d,
                    iso_value=parsed_d.isoformat(),
                    display=format_date_display(parsed_d),
                    raw=raw,
                    warning=warning,
                )
            except ValueError:
                pass

    # Could not parse as valid date
    return DateParseResult(
        value=None, iso_value=None, display=raw, raw=raw, warning=None
    )
