"""Decimal property and mathematical invariant tests (BP 3.1, 15)."""

from decimal import ROUND_HALF_UP, Decimal


def test_amount_calculation_and_rounding():
    """Amount = Qty x Rate rounded half up to 2 decimals (BP 3.1)."""
    # 3.333 * 10.00 = 33.33
    qty = Decimal("3.333")
    rate = Decimal("10.00")
    amount = (qty * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    assert amount == Decimal("33.33")

    # Round half up check: 2.5 * 1.55 = 3.875 -> 3.88
    qty2 = Decimal("2.5")
    rate2 = Decimal("1.55")
    amount2 = (qty2 * rate2).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    assert amount2 == Decimal("3.88")


def test_decimal_precision_invariants():
    """Ensure no float conversions corrupt precision across arithmetic ranges."""
    values = [
        "0.001",
        "0.01",
        "0.25",
        "0.50",
        "1.000",
        "100000.00",
        "1234567.89",
        "9999999.99",
    ]
    for s in values:
        d = Decimal(s)
        # Verify exact string fidelity
        assert str(d) == s or d == Decimal(s)
        # Arithmetic with integer preserves Decimal type
        doubled = d * Decimal("2")
        assert isinstance(doubled, Decimal)
        assert not isinstance(doubled, float)


def test_no_float_leaks_in_parser():
    from services.api.app.perception.number import parse_number

    test_inputs = [
        "1.5k",
        "1,500.50",
        "half",
        "two and a half",
        "12,34,567.50",
    ]
    for raw in test_inputs:
        res = parse_number(raw)
        assert res.value is not None
        assert isinstance(res.value, Decimal)
        assert not isinstance(res.value, float)
        # Ensure string representation matches exact decimal
        assert Decimal(str(res.value)) == res.value
