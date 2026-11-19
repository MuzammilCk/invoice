"""Pure number parser and Malayalam table (BP 3.1, 6.5). Zero float arithmetic."""

import re
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation

from services.api.app.perception.words import number_to_indian_words


@dataclass
class NumberParseResult:
    """Result of parsing a numeric string or spoken utterance."""

    value: Decimal | None
    raw: str
    words: str | None = None
    alternatives: list[Decimal] = field(default_factory=list)
    needs_clarification: bool = False
    clarification_text: str | None = None


# English word mapping
_WORD_VALUES: dict[str, int] = {
    "zero": 0,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
    "twenty": 20,
    "thirty": 30,
    "forty": 40,
    "fifty": 50,
    "sixty": 60,
    "seventy": 70,
    "eighty": 80,
    "ninety": 90,
}

_SCALE_VALUES: dict[str, int] = {
    "hundred": 100,
    "thousand": 1000,
    "lakh": 100000,
    "lac": 100000,
    "lakhs": 100000,
    "crore": 10000000,
    "crores": 10000000,
}

# Malayalam number words and fractions (BP 6.5)
_MALAYALAM_NUMBERS: dict[str, Decimal] = {
    "പൂജ്യം": Decimal("0"),
    "ഒന്ന്": Decimal("1"),
    "ഒന്നു": Decimal("1"),
    "രണ്ട്": Decimal("2"),
    "മൂന്ന്": Decimal("3"),
    "നാല്": Decimal("4"),
    "അഞ്ച്": Decimal("5"),
    "ആറ്": Decimal("6"),
    "ഏഴ്": Decimal("7"),
    "എട്ട്": Decimal("8"),
    "ഒൻപത്": Decimal("9"),
    "പത്ത്": Decimal("10"),
    "ഇരുപത്": Decimal("20"),
    "മുപ്പത്": Decimal("30"),
    "നാൽപ്പത്": Decimal("40"),
    "അമ്പത്": Decimal("50"),
    "അറുപത്": Decimal("60"),
    "എഴുപത്": Decimal("70"),
    "എൺപത്": Decimal("80"),
    "തൊണ്ണൂറ്": Decimal("90"),
    "നൂറ്": Decimal("100"),
    "ആയിരം": Decimal("1000"),
    "ലക്ഷം": Decimal("100000"),
    "കോടി": Decimal("10000000"),
    # Fractions
    "കാൽ": Decimal("0.25"),
    "അര": Decimal("0.5"),
    "മുക്കാൽ": Decimal("0.75"),
    "ഒന്നര": Decimal("1.5"),
    "രണ്ടര": Decimal("2.5"),
    "മൂന്നര": Decimal("3.5"),
}

# Common fraction phrases
_FRACTION_MAP: dict[str, Decimal] = {
    "half": Decimal("0.5"),
    "quarter": Decimal("0.25"),
    "three quarters": Decimal("0.75"),
    "1/2": Decimal("0.5"),
    "1/4": Decimal("0.25"),
    "3/4": Decimal("0.75"),
    "one and a half": Decimal("1.5"),
    "two and a half": Decimal("2.5"),
    "three and a half": Decimal("3.5"),
    "four and a half": Decimal("4.5"),
    "1 1/2": Decimal("1.5"),
    "2 1/2": Decimal("2.5"),
    "3 1/2": Decimal("3.5"),
}


def _clean_input(text: str) -> str:
    cleaned = text.strip()
    # Strip currency symbols and common affixes using word boundaries
    cleaned = re.sub(r"₹|/-|\brs\.?|\brupees?\b|\binr\b", "", cleaned, flags=re.IGNORECASE)
    # Strip commas inside numbers (e.g. 1,500.50 -> 1500.50)
    cleaned = re.sub(r",", "", cleaned)
    return cleaned.strip()


def _parse_english_words(tokens: list[str]) -> Decimal | None:
    if not tokens:
        return None

    total = Decimal("0")
    current_chunk = Decimal("0")

    for token in tokens:
        if token in _WORD_VALUES:
            current_chunk += Decimal(str(_WORD_VALUES[token]))
        elif token in _SCALE_VALUES:
            scale = Decimal(str(_SCALE_VALUES[token]))
            if current_chunk == 0:
                current_chunk = Decimal("1")
            if scale >= 1000:
                total += current_chunk * scale
                current_chunk = Decimal("0")
            else:
                current_chunk *= scale
        else:
            return None

    return total + current_chunk


def parse_number(text: str) -> NumberParseResult:
    """Parse text into a Decimal and Indian words representation without an LLM (BP 6.5)."""
    raw = text.strip()
    if not raw:
        return NumberParseResult(value=None, raw=raw)

    cleaned = _clean_input(raw)
    lower = cleaned.lower()

    # 1. Malayalam direct lookup
    if lower in _MALAYALAM_NUMBERS:
        val = _MALAYALAM_NUMBERS[lower]
        return NumberParseResult(value=val, raw=raw, words=number_to_indian_words(val))

    # 2. Fractions direct lookup
    if lower in _FRACTION_MAP:
        val = _FRACTION_MAP[lower]
        return NumberParseResult(value=val, raw=raw, words=number_to_indian_words(val))

    # 3. Handle ambiguous "two fifty" specifically
    if lower == "two fifty":
        val = Decimal("250")
        return NumberParseResult(
            value=val,
            raw=raw,
            words=number_to_indian_words(val),
            alternatives=[Decimal("2.50")],
            needs_clarification=True,
            clarification_text="Did you mean 250 or 2.50?",
        )

    # 4. Metric / Shorthand suffixes: e.g. "1.5k", "2.5L", "1 lac", "2 crore"
    shorthand_match = re.match(
        r"^([0-9]+(?:\.[0-9]+)?)\s*(k|kilo|l|lac|lakh|lakhs|cr|crore|crores)$",
        lower,
    )
    if shorthand_match:
        base_num = Decimal(shorthand_match.group(1))
        unit = shorthand_match.group(2)
        multiplier = Decimal("1000")
        if unit in ("l", "lac", "lakh", "lakhs"):
            multiplier = Decimal("100000")
        elif unit in ("cr", "crore", "crores"):
            multiplier = Decimal("10000000")
        val = base_num * multiplier
        return NumberParseResult(value=val, raw=raw, words=number_to_indian_words(val))

    # 5. Direct Decimal string parsing
    try:
        val = Decimal(cleaned)
        return NumberParseResult(value=val, raw=raw, words=number_to_indian_words(val))
    except InvalidOperation:
        pass

    # 6. Compound scale phrases: "one and a half thousand", "two lakh fifty thousand", etc.
    compound_match = re.match(
        r"^(one|two|three|four|five|six|seven|eight|nine|ten)?"
        r"\s*and a half\s+(thousand|lakh|lac|crore)$",
        lower,
    )
    if compound_match:
        base_word = compound_match.group(1) or "one"
        scale_word = compound_match.group(2)
        base_val = Decimal(str(_WORD_VALUES.get(base_word, 1))) + Decimal("0.5")
        multiplier = Decimal(str(_SCALE_VALUES.get(scale_word, 1000)))
        val = base_val * multiplier
        return NumberParseResult(value=val, raw=raw, words=number_to_indian_words(val))

    # 7. English number words
    tokens = [t for t in re.split(r"[\s-]+", lower) if t and t != "and"]
    if tokens:
        word_val = _parse_english_words(tokens)
        if word_val is not None:
            return NumberParseResult(
                value=word_val, raw=raw, words=number_to_indian_words(word_val)
            )

    # If parsing failed completely
    return NumberParseResult(value=None, raw=raw)
