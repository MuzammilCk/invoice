"""Tests for FakePerceptionKernel (BP 15, Operating Rules)."""

from datetime import date
from decimal import Decimal

from contracts.proposal import Proposal, ProposalFlag, StepKey, VoiceCommand


def test_fake_perception_kernel_defaults():
    from contracts.fakes.perception import FakePerceptionKernel

    kernel = FakePerceptionKernel()

    # Proposal for command
    prop_cmd = kernel.build_proposal(StepKey.RECIPIENT, "ok")
    assert prop_cmd.command == VoiceCommand.CONFIRM

    # Proposal for text
    prop_text = kernel.build_proposal(StepKey.RECIPIENT, "Asha Stores")
    assert isinstance(prop_text, Proposal)
    assert prop_text.value == "Asha Stores"
    assert prop_text.display == "Asha Stores"

    # Number parsing
    num_res = kernel.parse_number("1500")
    assert num_res.value == Decimal("1500")

    # Date parsing
    date_res = kernel.parse_date("2026-11-18")
    assert date_res.value == date(2026, 11, 18)


def test_fake_perception_kernel_canned_override():
    from contracts.fakes.perception import FakePerceptionKernel

    custom_prop = Proposal(
        step_key="custom",
        raw_transcript="mock input",
        value="mock value",
        display="Mock Display",
        flags=[ProposalFlag.LOW_CONFIDENCE],
    )
    kernel = FakePerceptionKernel(canned_proposals={"mock input": custom_prop})

    prop = kernel.build_proposal("custom", "mock input")
    assert prop.value == "mock value"
    assert ProposalFlag.LOW_CONFIDENCE in prop.flags


def test_contracts_fakes_package_export():
    import contracts.fakes

    assert hasattr(contracts.fakes, "FakePerceptionKernel")
