"""Text normalizer interface and rule-based implementation (BP 6.3, 3.1)."""

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from contracts.proposal import CandidateMatch, ProposalFlag


@dataclass
class NormalizerResult:
    """Result of normalizing text for an invoice field."""

    value: str
    alternatives: list[str] = field(default_factory=list)
    flags: list[ProposalFlag] = field(default_factory=list)
    needs_clarification: bool = False


# Common Malayalam item and trade vocabulary transliterations
_MALAYALAM_TRANSLITERATION: dict[str, str] = {
    "സിമന്റ്": "Cement",
    "സിമണ്ട്": "Cement",
    "പൈപ്പ്": "Pipe",
    "പെയിന്റ്": "Paint",
    "പെയിൻറ്": "Paint",
    "കമ്പി": "Steel Rod",
    "ബൾബ്": "Bulb",
    "ബോർഡ്": "Board",
    "വയർ": "Wire",
    "സ്വിച്ച്": "Switch",
    "സ്റ്റീൽ": "Steel",
    "ഷീറ്റ്": "Sheet",
    "ടാങ്ക്": "Tank",
    "മണൽ": "Sand",
    "കട്ട": "Brick",
}

# Known common acronyms to keep UPPERCASE (<= 4 chars)
_KNOWN_ACRONYMS = {
    "pvc",
    "led",
    "ac",
    "tmt",
    "gi",
    "cpvc",
    "upvc",
    "hdpe",
    "inr",
    "ltd",
    "pvt",
    "kg",
    "mm",
    "m",
    "w",
    "v",
    "ah",
}


def _normalize_token_casing(token: str) -> str:
    """Format token to Title Case, keeping <=4 letter acronyms UPPERCASE (BP 6.3)."""
    if not token:
        return ""

    lower = token.lower()
    # Check if known acronym or short token like "9W", "12V", "PVC"
    if lower in _KNOWN_ACRONYMS or (
        len(token) <= 4 and re.match(r"^[a-zA-Z0-9]+$", token) and token.isupper()
    ):
        return token.upper()

    # Alpha-numeric tokens like 9w -> 9W, 10mm -> 10MM or 10mm
    match_alphanumeric = re.match(r"^([0-9]+)([a-zA-Z]+)$", token)
    if match_alphanumeric:
        digits, unit = match_alphanumeric.groups()
        if len(unit) <= 2:
            return f"{digits}{unit.upper()}"

    # Default to Title Case
    return token.capitalize()


class Normalizer(ABC):
    """Abstract interface for text normalization (BP 6.3)."""

    @abstractmethod
    def normalize(
        self,
        transcript: str,
        candidates: list[CandidateMatch] | None = None,
        step_kind: str = "item",
    ) -> NormalizerResult:
        """Normalize the transcript into a strict Latin text representation."""
        ...


class RuleBasedNormalizer(Normalizer):
    """Rule-based text cleanup and casing implementation (STATE.md decision)."""

    def normalize(
        self,
        transcript: str,
        candidates: list[CandidateMatch] | None = None,
        step_kind: str = "item",
    ) -> NormalizerResult:
        raw = transcript.strip()
        if not raw:
            return NormalizerResult(value="")

        # 1. Translate / transliterate Malayalam words if present
        text = raw
        for ml_word, en_word in _MALAYALAM_TRANSLITERATION.items():
            text = text.replace(ml_word, en_word)

        # 2. Collapse multiple whitespace
        text = re.sub(r"\s+", " ", text).strip()

        # 3. Apply casing rules: Title Case, except all-caps <= 4 letters
        tokens = text.split(" ")
        cased_tokens = [_normalize_token_casing(tok) for tok in tokens if tok]
        result_text = " ".join(cased_tokens)

        # 4. Enforce length limits (BP 3.1)
        max_length = 80 if step_kind == "recipient" else 120
        if len(result_text) > max_length:
            result_text = result_text[:max_length].rstrip()

        return NormalizerResult(value=result_text)
