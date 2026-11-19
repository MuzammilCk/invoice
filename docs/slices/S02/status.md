# S02: Perception kernel — Status

## State: DONE

## Baseline Results
- Branch: `slice/S02-perception-kernel`
- Baseline commit: `8d0405ff42a2911ca41a7b7beb9c7fcddb12f010` (S02/plan: control files)
- Existing tests: S00 and S01 tests green (22 passed in renderer contracts, S00 auth/db clean)
- Lint & Type check: clean

## Task Checklist
- [x] T1: Contracts & Proposal Data Models (`contracts/proposal.py`, `contracts/__init__.py`)
- [x] T2: Number Parser, Fractions & Indian Words (`services/api/app/perception/number.py`, `words.py`)
- [x] T3: Text Normalizer & RapidFuzz Matcher (`services/api/app/perception/normalizer.py`, `matcher.py`)
- [x] T4: Date Parser & Timezone Handling (`services/api/app/perception/date.py`)
- [x] T5: Domain & Perception Checks Engine (`services/api/app/perception/checks.py`)
- [x] T6: Lexicon & Proposal Builder Pipeline [Stop Point: Owner review] (`services/api/app/perception/lexicon.py`, `builder.py`)
- [x] T7: Fake Perception Kernel (`contracts/fakes/perception.py`)
- [x] T8: Demo Script & Comprehensive Case Table Verification (`services/api/app/perception/demo.py`)

## Decisions Log
- D1: Use `RuleBasedNormalizer` behind `Normalizer` interface; LLM selection deferred to M3 bake-off (BP 6.3, STATE.md).
- D2: Number in words uses Indian numbering system (Lakh, Crore, Thousand) matching BP 3.1 display rules.

## Deviations Log
(none)

## Questions Log
- Q1: Should the 30-phrase demo script live under `services/api/app/perception/demo.py` (runnable via `python -m app.perception.demo`) to strictly respect S02's Owns scope, or at `scripts/demo_s02.py`? -> Resolved: `services/api/app/perception/demo.py`.
- Q2: In S02 build phase, should we add `rapidfuzz>=3.0.0` directly to `services/api/pyproject.toml` dependencies? -> Resolved: Yes, add to `services/api/pyproject.toml`.
- Q3: How should backend unit/property tests for S02 be run? -> Resolved: Run with pytest using dev dependencies, maintaining unittest as fallback.

## Handoff

### What S02 Provides

#### 1. Public Contracts
- **`contracts/proposal.py`**:
  - `Proposal`: Canonical data contract for step proposals (BP 5.4). Fields: `step_key`, `raw_transcript`, `language_code`, `value`, `display`, `words`, `confidence`, `alternatives`, `matched_id`, `flags`, `needs_clarification`, `clarification_text`, `command`.
  - `ProposalFlag`: Enum of domain flags (`NEW_CUSTOMER`, `NEAR_MATCH`, `PRICE_OUTLIER`, `EXTRA_NUMBER`, `LOW_CONFIDENCE`, `EMPTY_AUDIO`, `NOT_UNDERSTOOD`).
  - `VoiceCommand`: Whole-utterance command enum (`CONFIRM`, `BACK`, `REDO`, `DONE`).
  - `StepKey`: Standard step keys (`recipient`, `date`, `item`, `qty`, `rate`, `command`).
  - `CandidateMatch`: Schema for matching candidates (`id`, `display_name`, `norm_name`, `score`).
- **`contracts/fakes/perception.py`**:
  - `FakePerceptionKernel`: Deterministic test double for downstream slices (S05, S08). Allows mocking proposals, numbers, dates, and matches with pre-programmed canned dictionaries.

#### 2. Perception Library Modules (`services/api/app/perception/`)
- **`build_proposal(...)`**: Central orchestrator pipeline taking a step key, raw transcript, optional candidates/aliases/recent rates/reference date, and returning a validated `Proposal`.
- **`parse_number(text)`**: Pure number parser supporting digits, commas, currency affixes, English number words ("fifteen hundred"), metric shorthand ("1.5k", "2.5L", "1cr"), fractions ("half", "one and a half"), and Malayalam numerals ("ഒന്ന്", "രണ്ട്", "അര", "ഒന്നര"). Returns exact `Decimal` with zero float operations.
- **`parse_date(text, reference_today)`**: Parses relative dates ("today", "yesterday", "ഇന്ന്"), ISO dates, and Indian DD/MM/YYYY formats into `date` anchored to `Asia/Kolkata`.
- **`match(query, candidates, aliases)`**: RapidFuzz token set ratio matching with alias precedence, adhering to BP 6.4 thresholds (>=95 match, 80-94 near match with alternatives, <80 new).
- **`RuleBasedNormalizer`**: Text cleaner enforcing Title Case, keeping <=4 letter acronyms (PVC, LED, AC, TMT) uppercase, transliterating Malayalam trade vocabulary, and enforcing length limits (Recipient <= 80, Item <= 120).
- **Domain Checks**: `check_recipient`, `check_date_bounds` (>45-day warning), `check_qty` (>0, <=100000, 3 decimals, warn >100), `check_rate` (>0, <=10000000, 2 decimals, warn >100000, warn outlier 0.2x-5.0x median), `check_item_text` (extracts extra embedded numbers for next Qty step).
- **`match_voice_command(text)`**: Whole-utterance keyword matcher (no LLM) for English and Malayalam navigation commands.
- **`number_to_indian_words(d)`**: Formats Decimal into Indian numbering words (lakh, crore).

### Usage Examples

```python
from decimal import Decimal
from contracts.proposal import StepKey, CandidateMatch
from services.api.app.perception import build_proposal, parse_number, parse_date

# 1. Build a Proposal for Recipient with memory matching
candidates = [
    CandidateMatch(id="c1", display_name="Asha Stores", norm_name="asha stores")
]
prop = build_proposal(StepKey.RECIPIENT, "Asha Stor", candidates=candidates)
# -> Proposal(value="Asha Stor", flags=[ProposalFlag.NEAR_MATCH], needs_clarification=True, alternatives=["Asha Stores"])

# 2. Parse Spoken Number Words into Decimal
res = parse_number("one and a half thousand")
# -> res.value == Decimal("1500"), res.words == "One thousand five hundred"

# 3. Parse Date with Asia/Kolkata defaults
date_res = parse_date("today")
# -> date_res.iso_value == "2026-11-18", date_res.display == "18 November 2026"
```

### Environment Variables
None required. S02 is a self-contained, pure Python library.

### Known Limits
- Normalizer is currently rule-based (`RuleBasedNormalizer`); LLM-based normalizer bake-off is scheduled for M3 / S08.
- Recipient string truncated at 80 characters; Item string truncated at 120 characters per blueprint rules.

### Deferred Items
- Expand Malayalam shop vocabulary and phonetic variations based on actual recordings collected during S08.
- Multi-field single utterance parsing (e.g. speaking item and quantity in one breath) deferred to voice fill enhancements in S09.
