"""Fuzzy matching against memory candidates and aliases (BP 6.4)."""

import re
from dataclasses import dataclass, field

from contracts.proposal import CandidateMatch
from rapidfuzz import fuzz


@dataclass
class MatchResult:
    """Result of memory candidate matching (BP 6.4)."""

    matched_id: str | None = None
    display_name: str | None = None
    score: float = 0.0
    is_exact: bool = False
    is_near: bool = False
    is_new: bool = False
    alternatives: list[CandidateMatch] = field(default_factory=list)


def normalize_for_matching(text: str) -> str:
    """Lowercase and strip punctuation/spaces for alias and token set matching."""
    # Lowercase, replace punctuation with spaces, collapse spaces
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def match(
    query: str,
    candidates: list[CandidateMatch],
    aliases: dict[str, str] | None = None,
    step_kind: str = "recipient",
) -> MatchResult:
    """Match heard query against candidates using aliases and RapidFuzz (BP 6.4)."""
    raw_query = query.strip()
    if not raw_query:
        return MatchResult(is_new=True)

    query_norm = normalize_for_matching(raw_query)
    aliases_map = aliases or {}

    # Step 1: Check Alias table first
    if query_norm in aliases_map:
        target_id = aliases_map[query_norm]
        # Locate candidate by target_id
        for cand in candidates:
            if cand.id == target_id:
                return MatchResult(
                    matched_id=cand.id,
                    display_name=cand.display_name,
                    score=100.0,
                    is_exact=True,
                )

    if not candidates:
        return MatchResult(is_new=True, score=0.0)

    # Step 2: Score all candidates using rapidfuzz token_set_ratio
    scored_candidates: list[tuple[float, CandidateMatch]] = []
    for cand in candidates:
        cand_norm = cand.norm_name or normalize_for_matching(cand.display_name)
        score = float(fuzz.token_set_ratio(query_norm, cand_norm))
        cand_copy = cand.model_copy(update={"score": score})
        scored_candidates.append((score, cand_copy))

    # Sort descending by score
    scored_candidates.sort(key=lambda x: x[0], reverse=True)
    top_score, top_cand = scored_candidates[0]

    # Step 3: Apply BP 6.4 thresholds
    if top_score >= 95.0:
        # Match: matched display name wins over heard spelling
        return MatchResult(
            matched_id=top_cand.id,
            display_name=top_cand.display_name,
            score=top_score,
            is_exact=True,
        )
    elif top_score >= 80.0:
        # Near match: ask 'Did you mean', return up to 3 alternatives
        alts = [c for s, c in scored_candidates if s >= 80.0][:3]
        return MatchResult(
            matched_id=None,
            display_name=None,
            score=top_score,
            is_near=True,
            alternatives=alts,
        )
    else:
        # Below 80 is new
        return MatchResult(
            matched_id=None,
            display_name=None,
            score=top_score,
            is_new=True,
        )
