# S02: Perception kernel — Status

## State: READY_FOR_VERIFY

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
(filled at close)
