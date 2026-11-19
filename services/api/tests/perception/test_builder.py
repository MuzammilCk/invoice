"""Tests for build_proposal orchestrator pipeline (BP 5.1, 5.3, 5.4)."""

from datetime import date
from decimal import Decimal

import pytest
from contracts.proposal import CandidateMatch, ProposalFlag, StepKey, VoiceCommand


@pytest.fixture
def sample_candidates() -> list[CandidateMatch]:
    return [
        CandidateMatch(id="c1", display_name="Asha Stores", norm_name="asha stores"),
        CandidateMatch(id="i1", display_name="PVC Pipe 1 Inch", norm_name="pvc pipe 1 inch"),
    ]


@pytest.fixture
def sample_aliases() -> dict[str, str]:
    return {"asha": "c1"}


def test_builder_voice_command():
    from services.api.app.perception.builder import build_proposal

    prop = build_proposal(StepKey.RECIPIENT, "ok")
    assert prop.command == VoiceCommand.CONFIRM
    assert prop.step_key == StepKey.RECIPIENT


def test_builder_recipient_exact_match(sample_candidates, sample_aliases):
    from services.api.app.perception.builder import build_proposal

    prop = build_proposal(
        StepKey.RECIPIENT,
        "asha",
        candidates=sample_candidates,
        aliases=sample_aliases,
    )
    assert prop.value == "Asha Stores"
    assert prop.matched_id == "c1"
    assert prop.flags == []


def test_builder_recipient_new_customer(sample_candidates, sample_aliases):
    from services.api.app.perception.builder import build_proposal

    prop = build_proposal(
        StepKey.RECIPIENT,
        "Sunrise Bakery",
        candidates=sample_candidates,
        aliases=sample_aliases,
    )
    assert prop.value == "Sunrise Bakery"
    assert prop.matched_id is None
    assert ProposalFlag.NEW_CUSTOMER in prop.flags


def test_builder_date():
    from services.api.app.perception.builder import build_proposal

    ref = date(2026, 11, 18)
    prop = build_proposal(StepKey.DATE, "today", reference_today=ref)
    assert prop.value == "2026-11-18"
    assert prop.display == "18 November 2026"


def test_builder_item_with_extra_number():
    from services.api.app.perception.builder import build_proposal

    prop = build_proposal(StepKey.ITEM, "cement 5 bags")
    assert "Cement Bags" in prop.display
    assert ProposalFlag.EXTRA_NUMBER in prop.flags


def test_builder_qty_words_and_warning():
    from services.api.app.perception.builder import build_proposal

    # Qty 150 -> words and warning
    prop = build_proposal(StepKey.QTY, "150")
    assert prop.value == "150"
    assert prop.words == "One hundred fifty"
    assert "100" in (prop.clarification_text or "")


def test_builder_rate_currency_and_outlier():
    from services.api.app.perception.builder import build_proposal

    recent = [Decimal("450.00"), Decimal("460.00"), Decimal("455.00")]
    prop = build_proposal(StepKey.RATE, "5000", recent_rates=recent)
    assert prop.value == "5000.00"
    assert "5,000.00" in prop.display
    assert prop.words == "Five thousand"
    assert ProposalFlag.PRICE_OUTLIER in prop.flags
