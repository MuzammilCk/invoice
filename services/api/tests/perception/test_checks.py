"""Tests for perception checks engine (BP 3.1, 5.1, 5.4)."""

from datetime import date
from decimal import Decimal

from contracts.proposal import ProposalFlag
from services.api.app.perception.matcher import MatchResult


def test_check_recipient():
    from services.api.app.perception.checks import check_recipient

    # Valid exact match
    valid, flags, warn = check_recipient("Asha Stores", MatchResult(is_exact=True, score=100.0))
    assert valid is True
    assert flags == []
    assert warn is None

    # Near match
    valid, flags, warn = check_recipient("Nation Hardware", MatchResult(is_near=True, score=85.0))
    assert valid is True
    assert ProposalFlag.NEAR_MATCH in flags

    # New customer
    valid, flags, warn = check_recipient("Sunrise Bakery", MatchResult(is_new=True, score=50.0))
    assert valid is True
    assert ProposalFlag.NEW_CUSTOMER in flags

    # Exceeding length limit (80 chars)
    valid, flags, warn = check_recipient("a" * 85)
    assert valid is False
    assert "80 characters" in (warn or "")


def test_check_date_bounds():
    from services.api.app.perception.checks import check_date_bounds

    today = date(2026, 11, 18)
    near_date = date(2026, 11, 25)
    far_date = date(2026, 8, 1)  # > 45 days in past

    valid, flags, warn = check_date_bounds(near_date, reference_today=today)
    assert valid is True
    assert warn is None

    valid, flags, warn = check_date_bounds(far_date, reference_today=today)
    assert valid is True
    assert warn is not None
    assert "45 days" in warn


def test_check_qty():
    from services.api.app.perception.checks import check_qty

    # Normal qty
    valid, flags, warn = check_qty(Decimal("5"))
    assert valid is True
    assert warn is None

    # Warning above 100
    valid, flags, warn = check_qty(Decimal("150"))
    assert valid is True
    assert warn is not None
    assert "100" in warn

    # Invalid <= 0
    valid, flags, warn = check_qty(Decimal("0"))
    assert valid is False

    valid, flags, warn = check_qty(Decimal("-2"))
    assert valid is False

    # Invalid > 100000
    valid, flags, warn = check_qty(Decimal("100001"))
    assert valid is False

    # More than 3 decimal places rejected
    valid, flags, warn = check_qty(Decimal("1.2345"))
    assert valid is False


def test_check_rate():
    from services.api.app.perception.checks import check_rate

    recent = [Decimal("450.00"), Decimal("460.00"), Decimal("455.00"), Decimal("450.00")]

    # Normal rate (near median 452.5)
    valid, flags, warn = check_rate(Decimal("450.00"), recent_rates=recent)
    assert valid is True
    assert ProposalFlag.PRICE_OUTLIER not in flags
    assert warn is None

    # Outlier: > 5x median (e.g. 5000)
    valid, flags, warn = check_rate(Decimal("5000.00"), recent_rates=recent)
    assert valid is True
    assert ProposalFlag.PRICE_OUTLIER in flags
    assert warn is not None
    assert "median" in warn

    # Outlier: < 0.2x median (e.g. 50)
    valid, flags, warn = check_rate(Decimal("50.00"), recent_rates=recent)
    assert valid is True
    assert ProposalFlag.PRICE_OUTLIER in flags

    # Warning: > 100,000
    valid, flags, warn = check_rate(Decimal("150000.00"))
    assert valid is True
    assert warn is not None
    assert "1,00,000" in warn

    # Invalid: <= 0 or > 10,000,000
    valid, flags, warn = check_rate(Decimal("0"))
    assert valid is False

    valid, flags, warn = check_rate(Decimal("10000001"))
    assert valid is False

    # More than 2 decimal places rejected
    valid, flags, warn = check_rate(Decimal("100.555"))
    assert valid is False


def test_check_item_text_and_extra_number():
    from services.api.app.perception.checks import check_item_text

    # Normal item
    valid, cleaned, extra_num, flags, warn = check_item_text("PVC Pipe 1 Inch")
    assert valid is True
    assert cleaned == "PVC Pipe 1 Inch"
    assert extra_num is None
    assert ProposalFlag.EXTRA_NUMBER not in flags

    # Extra number in item: "Cement 5 Bags"
    valid, cleaned, extra_num, flags, warn = check_item_text("Cement 5 Bags")
    assert valid is True
    assert cleaned == "Cement Bags"
    assert extra_num == Decimal("5")
    assert ProposalFlag.EXTRA_NUMBER in flags

    # Extra number in item: "Asian Paints 500"
    valid, cleaned, extra_num, flags, warn = check_item_text("Asian Paints 500")
    assert valid is True
    assert cleaned == "Asian Paints"
    assert extra_num == Decimal("500")
    assert ProposalFlag.EXTRA_NUMBER in flags
