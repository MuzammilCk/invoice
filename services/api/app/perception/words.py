"""Indian numbering system to words converter (BP 3.1, 5.4)."""

from decimal import Decimal

_ONES = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
]

_TENS = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
]


def _two_digits_to_words(n: int) -> str:
    if n == 0:
        return ""
    if n < 20:
        return _ONES[n]
    tens = _TENS[n // 10]
    ones = _ONES[n % 10]
    return f"{tens}-{ones}" if ones else tens


def _three_digits_to_words(n: int) -> str:
    hundreds = n // 100
    rem = n % 100
    parts = []
    if hundreds:
        parts.append(f"{_ONES[hundreds]} hundred")
    if rem:
        parts.append(_two_digits_to_words(rem))
    return " ".join(parts)


def number_to_indian_words(d: Decimal) -> str:
    """Convert a Decimal into Indian numbering system words (e.g. Lakh, Crore)."""
    if d == 0:
        return "Zero"

    is_negative = d < 0
    d_abs = abs(d)

    # Split into integer and fractional parts
    int_part = int(d_abs)
    # Check if there's a fractional part
    s = f"{d_abs:.10f}".rstrip("0")
    frac_part = ""
    if "." in s:
        frac_part = s.split(".")[1]
        # But respect original decimal precision up to 3 decimals
        original_s = str(d_abs)
        if "." in original_s:
            frac_part = original_s.split(".")[1]

    parts = []

    if int_part == 0:
        parts.append("zero")
    else:
        crores = int_part // 10000000
        rem = int_part % 10000000

        lakhs = rem // 100000
        rem = rem % 100000

        thousands = rem // 1000
        rem = rem % 1000

        hundreds_and_below = rem

        if crores > 0:
            parts.append(f"{number_to_indian_words(Decimal(crores)).lower()} crore")
        if lakhs > 0:
            parts.append(f"{_two_digits_to_words(lakhs)} lakh")
        if thousands > 0:
            parts.append(f"{_two_digits_to_words(thousands)} thousand")
        if hundreds_and_below > 0:
            parts.append(_three_digits_to_words(hundreds_and_below))

    result = " ".join(p for p in parts if p).strip()

    if frac_part:
        # Convert each digit of fraction: e.g. "50" -> "point five zero"
        frac_words = " ".join(_ONES[int(c)] if int(c) != 0 else "zero" for c in frac_part)
        result = f"{result} point {frac_words}"

    if is_negative:
        result = f"Minus {result}"

    # Capitalize the first letter
    return result[0].upper() + result[1:]
