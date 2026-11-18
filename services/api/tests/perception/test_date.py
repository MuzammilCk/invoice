"""Tests for date parsing, Indian formats, Malayalam terms,
and Asia/Kolkata timezone (BP 3.1, 5.1)."""

from datetime import date

import pytest

REF_DATE = date(2026, 11, 18)


DATE_CASES = [
    # 1. Relative English
    ("today", date(2026, 11, 18)),
    ("yesterday", date(2026, 11, 17)),
    ("tomorrow", date(2026, 11, 19)),
    # 2. Relative Malayalam
    ("ഇന്ന്", date(2026, 11, 18)),
    ("ഇന്നലെ", date(2026, 11, 17)),
    ("നാളെ", date(2026, 11, 19)),
    # 3. ISO format
    ("2026-11-18", date(2026, 11, 18)),
    ("2026-01-05", date(2026, 1, 5)),
    ("2026/11/18", date(2026, 11, 18)),
    # 4. Indian standard formats (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
    ("10/11/2026", date(2026, 11, 10)),
    ("10-11-2026", date(2026, 11, 10)),
    ("10.11.2026", date(2026, 11, 10)),
    ("05/01/2026", date(2026, 1, 5)),
    ("1/5/2026", date(2026, 5, 1)),
    # 5. Natural month name formats
    ("10 Nov 2026", date(2026, 11, 10)),
    ("10 November 2026", date(2026, 11, 10)),
    ("10th November 2026", date(2026, 11, 10)),
    ("1st January 2026", date(2026, 1, 1)),
    ("2nd Feb 2026", date(2026, 2, 2)),
    ("3rd March 2026", date(2026, 3, 3)),
    ("November 10, 2026", date(2026, 11, 10)),
    ("Nov 10 2026", date(2026, 11, 10)),
    # 6. Missing year fallback to reference year
    ("10 November", date(2026, 11, 10)),
    ("10 Nov", date(2026, 11, 10)),
    ("5 Dec", date(2026, 12, 5)),
]


@pytest.mark.parametrize("raw_input,expected_date", DATE_CASES)
def test_parse_date_cases(raw_input: str, expected_date: date):
    from services.api.app.perception.date import parse_date

    res = parse_date(raw_input, reference_today=REF_DATE)
    assert res.value == expected_date
    assert res.iso_value == expected_date.isoformat()
    assert res.value is not None


def test_parse_date_display_formatting():
    from services.api.app.perception.date import parse_date

    res = parse_date("10/11/2026", reference_today=REF_DATE)
    assert res.display == "10 November 2026"

    res_single = parse_date("1/5/2026", reference_today=REF_DATE)
    assert res_single.display == "1 May 2026"


def test_parse_date_45_day_warning():
    from services.api.app.perception.date import parse_date

    # Date within 45 days -> no warning
    res_near = parse_date("10 November 2026", reference_today=REF_DATE)
    assert res_near.warning is None

    # Date > 45 days in past (e.g. 1 Jan 2026 vs 18 Nov 2026) -> warning
    res_past = parse_date("1 January 2026", reference_today=REF_DATE)
    assert res_past.warning is not None
    assert "45 days" in res_past.warning

    # Date > 45 days in future (e.g. 18 Feb 2027) -> warning
    res_future = parse_date("18 February 2027", reference_today=REF_DATE)
    assert res_future.warning is not None
    assert "45 days" in res_future.warning


def test_parse_date_invalid():
    from services.api.app.perception.date import parse_date

    res = parse_date("not a date", reference_today=REF_DATE)
    assert res.value is None
    assert res.iso_value is None
    assert res.display == "not a date"
