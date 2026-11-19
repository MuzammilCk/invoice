"""Perception Kernel — text parsing, matching, checks and proposals (BP 15)."""

from services.api.app.perception.builder import build_proposal, format_indian_currency
from services.api.app.perception.checks import (
    check_date_bounds,
    check_item_text,
    check_qty,
    check_rate,
    check_recipient,
)
from services.api.app.perception.date import format_date_display, get_today_kolkata, parse_date
from services.api.app.perception.lexicon import match_voice_command
from services.api.app.perception.matcher import match, normalize_for_matching
from services.api.app.perception.normalizer import Normalizer, RuleBasedNormalizer
from services.api.app.perception.number import parse_number
from services.api.app.perception.words import number_to_indian_words

__all__ = [
    "Normalizer",
    "RuleBasedNormalizer",
    "build_proposal",
    "check_date_bounds",
    "check_item_text",
    "check_qty",
    "check_rate",
    "check_recipient",
    "format_date_display",
    "format_indian_currency",
    "get_today_kolkata",
    "match",
    "match_voice_command",
    "normalize_for_matching",
    "number_to_indian_words",
    "parse_date",
    "parse_number",
]

