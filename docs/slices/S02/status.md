# S02: Perception kernel — Status

## State: PLANNED

## Baseline Results
- Branch: `slice/S02-perception-kernel` (to be created from `main`)
- Baseline commit: `a5c8334273e8613a82f5257fb4299d6c5c7c8bdc` (S01: Renderer engine)
- Existing tests: S00 and S01 tests green on main

## Task Checklist
- [ ] T1: Contracts & Proposal Data Models (`contracts/proposal.py`, `contracts/__init__.py`)
- [ ] T2: Number Parser, Fractions & Indian Words (`services/api/app/perception/number.py`, `words.py`)
- [ ] T3: Text Normalizer & RapidFuzz Matcher (`services/api/app/perception/normalizer.py`, `matcher.py`)
- [ ] T4: Date Parser & Timezone Handling (`services/api/app/perception/date.py`)
- [ ] T5: Domain & Perception Checks Engine (`services/api/app/perception/checks.py`)
- [ ] T6: Lexicon & Proposal Builder Pipeline [Stop Point: Owner review] (`services/api/app/perception/lexicon.py`, `builder.py`)
- [ ] T7: Fake Perception Kernel (`contracts/fakes/perception.py`)
- [ ] T8: Demo Script & Comprehensive Case Table Verification (`services/api/app/perception/demo.py`)

## Decisions Log
- D1: Use `RuleBasedNormalizer` behind `Normalizer` interface; LLM selection deferred to M3 bake-off (BP 6.3, STATE.md).
- D2: Number in words uses Indian numbering system (Lakh, Crore, Thousand) matching BP 3.1 display rules.

## Deviations Log
(none)

## Questions Log
- Q1: Should the 30-phrase demo script live under `services/api/app/perception/demo.py` (runnable via `python -m app.perception.demo`) to strictly respect S02's Owns scope, or at `scripts/demo_s02.py`? (Recommended: `services/api/app/perception/demo.py` with a thin runner script if desired).
- Q2: In S02 build phase, should we add `rapidfuzz>=3.0.0` directly to `services/api/pyproject.toml` dependencies? (Recommended: Yes, since BP 6.4 explicitly mandates RapidFuzz for token set matching).

## Handoff
(filled at close)
