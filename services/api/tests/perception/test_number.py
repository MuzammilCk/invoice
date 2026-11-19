"""Tests for number parser and Indian words representation (BP 3.1, 6.5)."""

from decimal import Decimal

import pytest

# ---------------------------------------------------------------------------
# Test Case Table (50+ cases covering digits, words, Malayalam, fractions)
# ---------------------------------------------------------------------------
NUMBER_CASES = [
    # 1. Plain digits and decimals
    ("0", Decimal("0")),
    ("1", Decimal("1")),
    ("5", Decimal("5")),
    ("42", Decimal("42")),
    ("100", Decimal("100")),
    ("1500", Decimal("1500")),
    ("10000", Decimal("10000")),
    ("100000", Decimal("100000")),
    ("1500.50", Decimal("1500.50")),
    ("0.25", Decimal("0.25")),
    ("0.005", Decimal("0.005")),
    # 2. Commas and Indian digit grouping
    ("1,500", Decimal("1500")),
    ("1,500.50", Decimal("1500.50")),
    ("12,34,567", Decimal("1234567")),
    ("12,34,567.50", Decimal("1234567.50")),
    ("1,00,00,000", Decimal("10000000")),
    # 3. Currency symbols and affixes
    ("₹1500", Decimal("1500")),
    ("₹ 1,500.50", Decimal("1500.50")),
    ("Rs. 450", Decimal("450")),
    ("Rs 450", Decimal("450")),
    ("450 rupees", Decimal("450")),
    ("rupees 450", Decimal("450")),
    ("450 INR", Decimal("450")),
    ("₹ 500/-", Decimal("500")),
    # 4. Metric / Informal shorthand
    ("1.5k", Decimal("1500")),
    ("2k", Decimal("2000")),
    ("10k", Decimal("10000")),
    ("2.5L", Decimal("250000")),
    ("1 lac", Decimal("100000")),
    ("2 lakh", Decimal("200000")),
    ("1.5 lakh", Decimal("150000")),
    ("1cr", Decimal("10000000")),
    ("2 crore", Decimal("20000000")),
    # 5. Fractions (common for Qty)
    ("half", Decimal("0.5")),
    ("quarter", Decimal("0.25")),
    ("three quarters", Decimal("0.75")),
    ("1/2", Decimal("0.5")),
    ("1/4", Decimal("0.25")),
    ("3/4", Decimal("0.75")),
    ("one and a half", Decimal("1.5")),
    ("two and a half", Decimal("2.5")),
    ("three and a half", Decimal("3.5")),
    ("1 1/2", Decimal("1.5")),
    ("2 1/2", Decimal("2.5")),
    # 6. English number words
    ("one", Decimal("1")),
    ("ten", Decimal("10")),
    ("twenty five", Decimal("25")),
    ("one hundred", Decimal("100")),
    ("four hundred fifty", Decimal("450")),
    ("one thousand", Decimal("1000")),
    ("fifteen hundred", Decimal("1500")),
    ("twenty five hundred", Decimal("2500")),
    ("one and a half thousand", Decimal("1500")),
    ("two lakh fifty thousand", Decimal("250000")),
    ("one crore", Decimal("10000000")),
    # 7. Malayalam number words & fractions
    ("ഒന്ന്", Decimal("1")),
    ("രണ്ട്", Decimal("2")),
    ("മൂന്ന്", Decimal("3")),
    ("നാല്", Decimal("4")),
    ("അഞ്ച്", Decimal("5")),
    ("പത്ത്", Decimal("10")),
    ("നൂറ്", Decimal("100")),
    ("ആയിരം", Decimal("1000")),
    ("ലക്ഷം", Decimal("100000")),
    ("അര", Decimal("0.5")),
    ("കാൽ", Decimal("0.25")),
    ("മുക്കാൽ", Decimal("0.75")),
    ("ഒന്നര", Decimal("1.5")),
    ("രണ്ടര", Decimal("2.5")),
]


@pytest.mark.parametrize("raw_input,expected_val", NUMBER_CASES)
def test_parse_number_cases(raw_input: str, expected_val: Decimal):
    from services.api.app.perception.number import parse_number

    res = parse_number(raw_input)
    assert res.value == expected_val
    assert isinstance(res.value, Decimal)
    assert not res.needs_clarification


def test_parse_number_ambiguous_two_fifty():
    from services.api.app.perception.number import parse_number

    res = parse_number("two fifty")
    assert res.value == Decimal("250")
    assert Decimal("2.50") in res.alternatives
    assert res.needs_clarification is True


def test_parse_number_invalid():
    from services.api.app.perception.number import parse_number

    res = parse_number("gibberish not a number")
    assert res.value is None
    assert res.needs_clarification is False


def test_indian_words_formatter():
    from services.api.app.perception.words import number_to_indian_words

    assert number_to_indian_words(Decimal("0")) == "Zero"
    assert number_to_indian_words(Decimal("5")) == "Five"
    assert number_to_indian_words(Decimal("1500")) == "One thousand five hundred"
    assert number_to_indian_words(Decimal("250000")) == "Two lakh fifty thousand"
    assert number_to_indian_words(Decimal("10000000")) == "One crore"
    assert (
        number_to_indian_words(Decimal("1234567.50"))
        == "Twelve lakh thirty-four thousand five hundred sixty-seven point five zero"
    )
    assert number_to_indian_words(Decimal("0.5")) == "Zero point five"
    assert number_to_indian_words(Decimal("1.5")) == "One point five"
