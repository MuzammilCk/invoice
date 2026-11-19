"""Unified Proposal builder orchestrating parsing, matching, checks,
and formatting (BP 5.1, 5.3, 5.4)."""

from datetime import date
from decimal import Decimal

from contracts.proposal import (
    CandidateMatch,
    Proposal,
    ProposalFlag,
    StepKey,
)
from services.api.app.perception.checks import (
    check_date_bounds,
    check_item_text,
    check_qty,
    check_rate,
    check_recipient,
)
from services.api.app.perception.date import parse_date
from services.api.app.perception.lexicon import match_voice_command
from services.api.app.perception.matcher import match
from services.api.app.perception.normalizer import Normalizer, RuleBasedNormalizer
from services.api.app.perception.number import parse_number


def format_indian_currency(d: Decimal) -> str:
    """Format a Decimal into standard Indian currency string: ₹12,34,567.50 (BP 3.1)."""
    is_neg = d < 0
    d_abs = abs(d)
    int_part = int(d_abs)
    # 2 decimal places
    dec_part = f"{d_abs:.2f}".split(".")[1]

    s = str(int_part)
    if len(s) <= 3:
        grouped = s
    else:
        last3 = s[-3:]
        remaining = s[:-3]
        groups: list[str] = []
        while len(remaining) > 2:
            groups.insert(0, remaining[-2:])
            remaining = remaining[:-2]
        if remaining:
            groups.insert(0, remaining)
        grouped = ",".join(groups) + "," + last3

    prefix = "-₹" if is_neg else "₹"
    return f"{prefix}{grouped}.{dec_part}"


def build_proposal(
    step_key: str,
    raw_input: str,
    candidates: list[CandidateMatch] | None = None,
    aliases: dict[str, str] | None = None,
    recent_rates: list[Decimal] | None = None,
    reference_today: date | None = None,
    normalizer: Normalizer | None = None,
) -> Proposal:
    """Build a validated Proposal for an utterance or typed turn (BP 5.3, 5.4)."""
    raw = raw_input.strip()

    # Step 1: Check for whole-utterance voice command (BP 5.3 step 4, BP 5.5)
    cmd = match_voice_command(raw)
    if cmd is not None:
        return Proposal(
            step_key=step_key,
            raw_transcript=raw,
            command=cmd,
            display=f"Command: {cmd.value}",
            confidence=1.0,
        )

    norm = normalizer or RuleBasedNormalizer()
    cands = candidates or []
    alias_dict = aliases or {}

    # Step 2: Handle by step kind
    if step_key == StepKey.RECIPIENT:
        norm_res = norm.normalize(raw, candidates=cands, step_kind="recipient")
        match_res = match(norm_res.value, cands, alias_dict, step_kind="recipient")
        valid, chk_flags, warn = check_recipient(norm_res.value, match_res)

        val = (
            match_res.display_name
            if (match_res.is_exact and match_res.display_name)
            else norm_res.value
        )
        alts = [c.display_name for c in match_res.alternatives]
        needs_clar = match_res.is_near
        clar_text = (
            f"Did you mean '{match_res.alternatives[0].display_name}'?"
            if match_res.is_near and match_res.alternatives
            else warn
        )
        conf = 1.0 if match_res.is_exact else (0.85 if match_res.is_near else 0.75)

        return Proposal(
            step_key=step_key,
            raw_transcript=raw,
            value=val,
            display=val,
            matched_id=match_res.matched_id,
            flags=chk_flags,
            alternatives=alts,
            needs_clarification=needs_clar,
            clarification_text=clar_text,
            confidence=conf,
        )

    elif step_key == StepKey.DATE:
        date_res = parse_date(raw, reference_today=reference_today)
        if date_res.value is not None:
            valid, chk_flags, warn = check_date_bounds(
                date_res.value, reference_today=reference_today
            )
            clar_text = warn or date_res.warning
            return Proposal(
                step_key=step_key,
                raw_transcript=raw,
                value=date_res.iso_value,
                display=date_res.display,
                flags=chk_flags,
                needs_clarification=bool(clar_text),
                clarification_text=clar_text,
                confidence=1.0,
            )
        else:
            return Proposal(
                step_key=step_key,
                raw_transcript=raw,
                value=None,
                display=raw,
                flags=[ProposalFlag.NOT_UNDERSTOOD],
                needs_clarification=True,
                clarification_text="Could not understand date format",
                confidence=0.0,
            )

    elif step_key == StepKey.ITEM:
        norm_res = norm.normalize(raw, candidates=cands, step_kind="item")
        valid, cleaned_item, extra_num, item_flags, warn = check_item_text(norm_res.value)
        match_res = match(cleaned_item, cands, alias_dict, step_kind="item")

        val = (
            match_res.display_name
            if (match_res.is_exact and match_res.display_name)
            else cleaned_item
        )
        alts = [c.display_name for c in match_res.alternatives]
        flags = list(item_flags)
        if match_res.is_near:
            flags.append(ProposalFlag.NEAR_MATCH)

        clar_text = warn
        if extra_num is not None:
            clar_text = f"Extra number '{extra_num}' detected"

        return Proposal(
            step_key=step_key,
            raw_transcript=raw,
            value=val,
            display=val,
            matched_id=match_res.matched_id,
            flags=flags,
            alternatives=alts,
            needs_clarification=match_res.is_near,
            clarification_text=clar_text,
            confidence=1.0 if match_res.is_exact else 0.8,
        )

    elif step_key == StepKey.QTY:
        num_res = parse_number(raw)
        if num_res.value is not None:
            valid, chk_flags, warn = check_qty(num_res.value)
            clar_text = warn or num_res.clarification_text
            val_str = str(num_res.value)
            return Proposal(
                step_key=step_key,
                raw_transcript=raw,
                value=val_str,
                display=val_str,
                words=num_res.words,
                flags=chk_flags,
                alternatives=[str(a) for a in num_res.alternatives],
                needs_clarification=num_res.needs_clarification or bool(warn),
                clarification_text=clar_text,
                confidence=0.8 if num_res.needs_clarification else 1.0,
            )
        else:
            return Proposal(
                step_key=step_key,
                raw_transcript=raw,
                value=None,
                display=raw,
                flags=[ProposalFlag.NOT_UNDERSTOOD],
                needs_clarification=True,
                clarification_text="Could not parse quantity",
                confidence=0.0,
            )

    elif step_key == StepKey.RATE:
        num_res = parse_number(raw)
        if num_res.value is not None:
            valid, chk_flags, warn = check_rate(num_res.value, recent_rates=recent_rates)
            clar_text = warn or num_res.clarification_text
            val_str = f"{num_res.value:.2f}"
            disp_str = format_indian_currency(num_res.value)
            return Proposal(
                step_key=step_key,
                raw_transcript=raw,
                value=val_str,
                display=disp_str,
                words=num_res.words,
                flags=chk_flags,
                alternatives=[str(a) for a in num_res.alternatives],
                needs_clarification=num_res.needs_clarification or bool(chk_flags),
                clarification_text=clar_text,
                confidence=0.8 if chk_flags else 1.0,
            )
        else:
            return Proposal(
                step_key=step_key,
                raw_transcript=raw,
                value=None,
                display=raw,
                flags=[ProposalFlag.NOT_UNDERSTOOD],
                needs_clarification=True,
                clarification_text="Could not parse rate",
                confidence=0.0,
            )

    # Fallback for generic text
    norm_res = norm.normalize(raw)
    return Proposal(
        step_key=step_key,
        raw_transcript=raw,
        value=norm_res.value,
        display=norm_res.value,
        confidence=1.0,
    )
