"""Contracts for Perception and Turn Proposals (BP 5.4, 5.5, 15)."""

from enum import StrEnum

from pydantic import BaseModel, Field


class ProposalFlag(StrEnum):
    """Flags indicating special domain conditions or required actions (BP 5.4)."""

    NEW_CUSTOMER = "NEW_CUSTOMER"
    NEAR_MATCH = "NEAR_MATCH"
    PRICE_OUTLIER = "PRICE_OUTLIER"
    EXTRA_NUMBER = "EXTRA_NUMBER"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    EMPTY_AUDIO = "EMPTY_AUDIO"
    NOT_UNDERSTOOD = "NOT_UNDERSTOOD"


class VoiceCommand(StrEnum):
    """Recognized whole-utterance voice commands (BP 5.5)."""

    CONFIRM = "CONFIRM"
    BACK = "BACK"
    REDO = "REDO"
    DONE = "DONE"


class StepKey(StrEnum):
    """Standard step keys for the guided invoice fill engine (BP 5.1)."""

    RECIPIENT = "recipient"
    DATE = "date"
    ITEM = "item"
    QTY = "qty"
    RATE = "rate"
    COMMAND = "command"


class CandidateMatch(BaseModel):
    """Candidate customer or item from memory for matching (BP 3.2, 6.4)."""

    id: str
    display_name: str
    norm_name: str
    score: float | None = None


class Proposal(BaseModel):
    """The Proposal object returned for each utterance or typed turn (BP 5.4)."""

    step_key: str = Field(description="Which step this proposal corresponds to")
    raw_transcript: str = Field(description="The raw input as spoken or typed")
    language_code: str | None = Field(default="en-IN", description="Language code")
    value: str | None = Field(
        default=None,
        description="Typed value per step: text, Decimal string, or ISO date (YYYY-MM-DD)",
    )
    display: str = Field(description="Human-readable string formatted for the StepCard")
    words: str | None = Field(
        default=None,
        description="Number in words (Indian numbering system) for Qty and Rate",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score 0.0 to 1.0 (affects UI presentation only)",
    )
    alternatives: list[str] = Field(
        default_factory=list,
        description="Up to 3 alternative suggestions when confidence is split",
    )
    matched_id: str | None = Field(
        default=None,
        description="Memory ID of matched Customer or ItemMemory entity",
    )
    flags: list[ProposalFlag] = Field(
        default_factory=list,
        description="Active domain flags (e.g. NEAR_MATCH, PRICE_OUTLIER)",
    )
    needs_clarification: bool = Field(
        default=False,
        description="Whether the card must ask for clarification instead of guessing",
    )
    clarification_text: str | None = Field(
        default=None,
        description="Prompt shown to user when needs_clarification is True",
    )
    command: VoiceCommand | None = Field(
        default=None,
        description="Recognized voice command if whole utterance was a command",
    )
