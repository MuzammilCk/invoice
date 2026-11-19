"""Tests for memory matching and RapidFuzz scoring (BP 6.4)."""

import pytest
from contracts.proposal import CandidateMatch


@pytest.fixture
def sample_candidates() -> list[CandidateMatch]:
    return [
        CandidateMatch(id="c1", display_name="Asha Stores", norm_name="asha stores"),
        CandidateMatch(id="c2", display_name="National Hardware", norm_name="national hardware"),
        CandidateMatch(id="c3", display_name="Kochi Builders", norm_name="kochi builders"),
        CandidateMatch(id="c4", display_name="Asha Supermarket", norm_name="asha supermarket"),
    ]


@pytest.fixture
def sample_aliases() -> dict[str, str]:
    return {
        "asha": "c1",
        "hardware": "c2",
    }


def test_alias_match_priority(sample_candidates, sample_aliases):
    from services.api.app.perception.matcher import match

    # "asha" is in aliases -> exact match to "c1" (Asha Stores)
    res = match("asha", sample_candidates, sample_aliases)
    assert res.is_exact is True
    assert res.matched_id == "c1"
    assert res.display_name == "Asha Stores"
    assert res.score == 100.0


def test_rapidfuzz_exact_match(sample_candidates, sample_aliases):
    from services.api.app.perception.matcher import match

    # Score >= 95 is a match, matched display name wins
    res = match("Asha Stores", sample_candidates, sample_aliases)
    assert res.is_exact is True
    assert res.matched_id == "c1"
    assert res.display_name == "Asha Stores"
    assert res.score >= 95.0


def test_rapidfuzz_near_match(sample_candidates, sample_aliases):
    from services.api.app.perception.matcher import match

    # Score between 80 and 94 asks 'Did you mean'
    res = match("Nation Hardware", sample_candidates, sample_aliases)
    assert res.is_near is True
    assert res.matched_id is None
    assert len(res.alternatives) >= 1
    assert res.alternatives[0].id == "c2"


def test_rapidfuzz_new_match(sample_candidates, sample_aliases):
    from services.api.app.perception.matcher import match

    # Score below 80 is new
    res = match("Sunrise Bakery", sample_candidates, sample_aliases)
    assert res.is_new is True
    assert res.matched_id is None
    assert res.is_exact is False
    assert res.is_near is False
    assert len(res.alternatives) == 0
