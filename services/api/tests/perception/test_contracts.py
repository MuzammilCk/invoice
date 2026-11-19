"""Tests for perception contracts (Proposal, ProposalFlag, VoiceCommand, etc.)."""

from enum import Enum


def test_proposal_flags_enum():
    from contracts.proposal import ProposalFlag

    assert issubclass(ProposalFlag, str)
    assert issubclass(ProposalFlag, Enum)
    assert ProposalFlag.NEW_CUSTOMER == "NEW_CUSTOMER"
    assert ProposalFlag.NEAR_MATCH == "NEAR_MATCH"
    assert ProposalFlag.PRICE_OUTLIER == "PRICE_OUTLIER"
    assert ProposalFlag.EXTRA_NUMBER == "EXTRA_NUMBER"
    assert ProposalFlag.LOW_CONFIDENCE == "LOW_CONFIDENCE"
    assert ProposalFlag.EMPTY_AUDIO == "EMPTY_AUDIO"
    assert ProposalFlag.NOT_UNDERSTOOD == "NOT_UNDERSTOOD"


def test_voice_command_enum():
    from contracts.proposal import VoiceCommand

    assert issubclass(VoiceCommand, str)
    assert issubclass(VoiceCommand, Enum)
    assert VoiceCommand.CONFIRM == "CONFIRM"
    assert VoiceCommand.BACK == "BACK"
    assert VoiceCommand.REDO == "REDO"
    assert VoiceCommand.DONE == "DONE"


def test_step_key_enum():
    from contracts.proposal import StepKey

    assert StepKey.RECIPIENT == "recipient"
    assert StepKey.DATE == "date"
    assert StepKey.ITEM == "item"
    assert StepKey.QTY == "qty"
    assert StepKey.RATE == "rate"
    assert StepKey.COMMAND == "command"


def test_candidate_match():
    from contracts.proposal import CandidateMatch

    candidate = CandidateMatch(id="cust_1", display_name="Asha Stores", norm_name="asha stores")
    assert candidate.id == "cust_1"
    assert candidate.display_name == "Asha Stores"
    assert candidate.norm_name == "asha stores"
    assert candidate.score is None


def test_proposal_minimal_valid():
    from contracts.proposal import Proposal

    p = Proposal(
        step_key="recipient",
        raw_transcript="Asha Stores",
        value="Asha Stores",
        display="Asha Stores",
    )
    assert p.step_key == "recipient"
    assert p.raw_transcript == "Asha Stores"
    assert p.value == "Asha Stores"
    assert p.display == "Asha Stores"
    assert p.language_code == "en-IN"
    assert p.confidence == 1.0
    assert p.alternatives == []
    assert p.matched_id is None
    assert p.flags == []
    assert p.needs_clarification is False
    assert p.clarification_text is None
    assert p.command is None


def test_proposal_full():
    from contracts.proposal import Proposal, ProposalFlag

    p = Proposal(
        step_key="rate",
        raw_transcript="fifteen hundred",
        value="1500.00",
        display="₹1,500.00",
        words="One thousand five hundred",
        confidence=0.95,
        alternatives=["150", "15000"],
        matched_id=None,
        flags=[ProposalFlag.PRICE_OUTLIER],
        needs_clarification=True,
        clarification_text="Did you mean 1500?",
        command=None,
    )
    assert p.value == "1500.00"
    assert p.words == "One thousand five hundred"
    assert ProposalFlag.PRICE_OUTLIER in p.flags
    assert p.needs_clarification is True


def test_contracts_package_exports():
    import contracts

    assert hasattr(contracts, "Proposal")
    assert hasattr(contracts, "ProposalFlag")
    assert hasattr(contracts, "VoiceCommand")
    assert hasattr(contracts, "StepKey")
    assert hasattr(contracts, "CandidateMatch")
