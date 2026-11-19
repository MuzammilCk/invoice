"""Fake Perception Kernel for tests and downstream slice development (BP 15)."""

from datetime import date
from decimal import Decimal, InvalidOperation

from contracts.proposal import (
    CandidateMatch,
    Proposal,
    VoiceCommand,
)


class FakeNumberResult:
    """Mockable result for parse_number."""

    def __init__(self, value: Decimal | None, words: str | None = None):
        self.value = value
        self.words = words
        self.needs_clarification = False
        self.alternatives: list[Decimal] = []
        self.clarification_text = None


class FakeDateResult:
    """Mockable result for parse_date."""

    def __init__(self, value: date | None, iso_value: str | None, display: str):
        self.value = value
        self.iso_value = iso_value
        self.display = display
        self.warning = None


class FakeMatchResult:
    """Mockable result for match."""

    def __init__(
        self,
        matched_id: str | None = None,
        display_name: str | None = None,
        is_exact: bool = False,
        is_near: bool = False,
        is_new: bool = False,
    ):
        self.matched_id = matched_id
        self.display_name = display_name
        self.is_exact = is_exact
        self.is_near = is_near
        self.is_new = is_new
        self.alternatives: list[CandidateMatch] = []


class FakePerceptionKernel:
    """Deterministic perception fake conforming to the perception public interface."""

    def __init__(
        self,
        canned_proposals: dict[str, Proposal] | None = None,
        canned_numbers: dict[str, Decimal] | None = None,
        canned_dates: dict[str, date] | None = None,
    ):
        self.canned_proposals = canned_proposals or {}
        self.canned_numbers = canned_numbers or {}
        self.canned_dates = canned_dates or {}

    def parse_number(self, text: str) -> FakeNumberResult:
        raw = text.strip()
        if raw in self.canned_numbers:
            val = self.canned_numbers[raw]
            return FakeNumberResult(val, f"{val}")
        try:
            val = Decimal(raw)
            return FakeNumberResult(val, f"{val}")
        except (InvalidOperation, ValueError):
            return FakeNumberResult(None)

    def parse_date(
        self,
        text: str,
        reference_today: date | None = None,
    ) -> FakeDateResult:
        raw = text.strip()
        if raw in self.canned_dates:
            d = self.canned_dates[raw]
            return FakeDateResult(d, d.isoformat(), str(d))
        try:
            d = date.fromisoformat(raw)
            return FakeDateResult(d, d.isoformat(), str(d))
        except ValueError:
            ref = reference_today or date.today()
            return FakeDateResult(ref, ref.isoformat(), str(ref))

    def match(
        self,
        query: str,
        candidates: list[CandidateMatch],
        aliases: dict[str, str] | None = None,
        step_kind: str = "recipient",
    ) -> FakeMatchResult:
        raw = query.strip()
        for cand in candidates:
            if cand.norm_name == raw.lower() or cand.display_name.lower() == raw.lower():
                return FakeMatchResult(
                    matched_id=cand.id,
                    display_name=cand.display_name,
                    is_exact=True,
                )
        return FakeMatchResult(is_new=True)

    def build_proposal(
        self,
        step_key: str,
        raw_input: str,
        candidates: list[CandidateMatch] | None = None,
        aliases: dict[str, str] | None = None,
        recent_rates: list[Decimal] | None = None,
        reference_today: date | None = None,
    ) -> Proposal:
        raw = raw_input.strip()

        # Check canned override
        if raw in self.canned_proposals:
            return self.canned_proposals[raw]

        # Check commands
        if raw.lower() in ("ok", "yes", "confirm", "ശരി"):
            return Proposal(
                step_key=step_key,
                raw_transcript=raw,
                command=VoiceCommand.CONFIRM,
                display="Command: CONFIRM",
            )
        if raw.lower() in ("back", "തിരികെ"):
            return Proposal(
                step_key=step_key,
                raw_transcript=raw,
                command=VoiceCommand.BACK,
                display="Command: BACK",
            )
        if raw.lower() in ("redo", "again", "വീണ്ടും"):
            return Proposal(
                step_key=step_key,
                raw_transcript=raw,
                command=VoiceCommand.REDO,
                display="Command: REDO",
            )
        if raw.lower() in ("done", "finish", "മതി"):
            return Proposal(
                step_key=step_key,
                raw_transcript=raw,
                command=VoiceCommand.DONE,
                display="Command: DONE",
            )

        # Standard deterministic proposal
        return Proposal(
            step_key=step_key,
            raw_transcript=raw,
            value=raw,
            display=raw,
            confidence=1.0,
        )
