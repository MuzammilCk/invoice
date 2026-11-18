# S02: Perception kernel — Build Plan

## Branch & Baseline Commands
- Branch: `slice/S02-perception-kernel`
- Baseline check commands:
  - Lint: `ruff check services/api/app/perception contracts`
  - Type check: `mypy services/api/app/perception contracts`
  - Unit tests & Case tables: `pytest services/api/tests/perception`
  - Property tests: `pytest services/api/tests/perception/test_property.py`
  - Demo script: `python -m app.perception.demo`

## Order Rationale
1. **Contracts First (T1)**: Establish `Proposal`, `ProposalFlag`, `VoiceCommand`, and `StepKey` schemas first so all downstream perception components output verified contract types.
2. **Number Parser & Indian Words (T2 - Riskiest)**: Pure number parsing from digits, words, Malayalam, fractions, and shorthand into `Decimal` is mathematically sensitive and prone to precision bugs. Build first with exhaustive case tables and property tests.
3. **Text Normalizer & RapidFuzz Matcher (T3)**: Normalization (script, acronym casing, length limits) and fuzzy matching against memory/alias tables form the core customer and item resolution pipeline.
4. **Date Parser & Timezone (T4)**: Parsing relative ("today", "yesterday", "ഇന്ന്") and structured dates anchored to Asia/Kolkata with 45-day threshold warnings.
5. **Perception Checks Engine (T5)**: Implement domain checks for Qty, Rate, Date, Recipient, and Item (outlier warnings, price limits, extra number detection).
6. **Lexicon & Proposal Builder Pipeline (T6 - Stop Point)**: Whole-utterance command matching and unified `build_proposal()` orchestrator. Owner stop point allows reviewing proposal schema, flags, and clarification policies.
7. **Fake Perception Kernel (T7)**: Provide test doubles conforming to the perception contracts for downstream slices (S05, S08).
8. **Demo Script & Verification (T8)**: Run the 30 curated test phrases through `python -m app.perception.demo` and confirm all acceptance criteria pass.

---

## Tasks

### T1: Contracts & Proposal Data Models
- **Goal**: Define `Proposal`, `ProposalFlag`, `VoiceCommand`, `StepKey`, and `CandidateMatch` Pydantic models in `contracts/proposal.py` and re-export in `contracts/__init__.py`.
- **Files**:
  - `contracts/proposal.py`
  - `contracts/__init__.py`
  - `services/api/tests/perception/test_contracts.py`
- **Tests First**: `services/api/tests/perception/test_contracts.py` verifying schema parsing, required fields, flag enums, Decimal string serialization, and empty-state defaults.
- **Steps**:
  1. Write tests for `Proposal` serialization, deserialization, and immutability expectations.
  2. Implement `contracts/proposal.py` with `Proposal`, `ProposalFlag`, `VoiceCommand`, `StepKey`, `CandidateMatch`.
  3. Re-export public models in `contracts/__init__.py`.
- **Done Check**: `pytest services/api/tests/perception/test_contracts.py` passes; `mypy contracts` passes.
- **Stop Point**: No.

### T2: Number Parser, Fractions & Indian Words
- **Goal**: Implement pure number parsing from digits, English words, fractions, shorthand ("1.5k", "2L"), and Malayalam number words into `Decimal`, plus Indian numbering words ("One thousand five hundred"). Zero float operations.
- **Files**:
  - `services/api/app/perception/number.py`
  - `services/api/app/perception/words.py`
  - `services/api/tests/perception/test_number.py`
  - `services/api/tests/perception/test_property.py`
- **Tests First**: `services/api/tests/perception/test_number.py` with 50+ case table (digits, commas, currency symbols, English number words, Malayalam words, fractions, shorthand) and `test_property.py` for Decimal invariance and half-up rounding.
- **Steps**:
  1. Write unit tests and case table for numbers and Indian words formatter.
  2. Implement `words.py` to convert Decimal numbers into Indian numbering words (lakh, crore).
  3. Implement `number.py` with currency stripping, fraction parser, English word combinator, Malayalam word lookup, and Decimal property assertions.
- **Done Check**: All 50+ number cases pass; Decimal property tests pass without float usage.
- **Stop Point**: No.

### T3: Text Normalizer & RapidFuzz Matcher
- **Goal**: Implement `Normalizer` interface with `RuleBasedNormalizer` (Latin script, Title Case with <=4 letter acronym preservation, Malayalam phonetic mapping) and RapidFuzz token set matcher with Alias lookup and BP 6.4 thresholds (>=95 match, 80-94 near match, <80 new).
- **Files**:
  - `services/api/app/perception/normalizer.py`
  - `services/api/app/perception/matcher.py`
  - `services/api/tests/perception/test_normalizer.py`
  - `services/api/tests/perception/test_matcher.py`
- **Tests First**: `test_normalizer.py` (acronym casing, whitespace collapsing, Malayalam transliteration) and `test_matcher.py` (alias exact hit, RapidFuzz threshold boundaries at 95 and 80).
- **Steps**:
  1. Write tests for text normalization rules and fuzzy matching scoring.
  2. Implement `Normalizer` ABC and `RuleBasedNormalizer` in `normalizer.py`.
  3. Implement `match()` in `matcher.py` with Alias priority and RapidFuzz token_set_ratio.
- **Done Check**: `pytest services/api/tests/perception/test_normalizer.py services/api/tests/perception/test_matcher.py` passes.
- **Stop Point**: No.

### T4: Date Parser & Timezone Handling
- **Goal**: Parse relative dates ("today", "yesterday", "ഇന്ന്", "ഇന്നലെ"), ISO dates, and Indian date formats into `datetime.date` anchored to Asia/Kolkata timezone, returning ISO string and formatted display string.
- **Files**:
  - `services/api/app/perception/date.py`
  - `services/api/tests/perception/test_date.py`
- **Tests First**: `services/api/tests/perception/test_date.py` with 25+ date cases (relative terms, slash/dash/dot variants, missing year fallback, day/month validation).
- **Steps**:
  1. Write unit tests for date patterns and relative words.
  2. Implement `date.py` with Asia/Kolkata reference date support, regex parsers, and date formatting.
- **Done Check**: All 25+ date cases pass; timezone conversions are deterministic.
- **Stop Point**: No.

### T5: Domain & Perception Checks Engine
- **Goal**: Implement pure domain validation checks for Recipient (length <= 80), Date (warn if > 45 days from reference today), Item (length <= 120, extra number extraction), Qty (> 0, <= 100000, 3 decimals, warn > 100), Rate (> 0, <= 10000000, 2 decimals, warn > 100000, warn outlier 0.2x-5x median).
- **Files**:
  - `services/api/app/perception/checks.py`
  - `services/api/tests/perception/test_checks.py`
- **Tests First**: `services/api/tests/perception/test_checks.py` testing each check function on boundary values, flags (`NEW_CUSTOMER`, `NEAR_MATCH`, `PRICE_OUTLIER`, `EXTRA_NUMBER`), and warning strings.
- **Steps**:
  1. Write unit tests for all domain check rules and thresholds.
  2. Implement `checks.py` with pure validation functions returning flags and warning messages.
- **Done Check**: `pytest services/api/tests/perception/test_checks.py` passes with 100% boundary coverage.
- **Stop Point**: No.

### T6: Lexicon & Proposal Builder Pipeline
- **Goal**: Whole-utterance voice command lexicon (English + Malayalam) and unified `build_proposal()` orchestrator synthesizing parsers, normalizer, matcher, and checks into a final `Proposal` object.
- **Files**:
  - `services/api/app/perception/lexicon.py`
  - `services/api/app/perception/builder.py`
  - `services/api/app/perception/__init__.py`
  - `services/api/tests/perception/test_lexicon.py`
  - `services/api/tests/perception/test_builder.py`
- **Tests First**: `test_lexicon.py` (confirm, back, redo, done in EN + ML) and `test_builder.py` testing proposal creation across all step types.
- **Steps**:
  1. Write tests for whole-utterance command extraction and proposal assembly.
  2. Implement `lexicon.py` with English and Malayalam keyword dictionaries.
  3. Implement `builder.py` wiring together parsing, matching, checks, and formatting.
  4. Expose public API in `services/api/app/perception/__init__.py`.
- **Done Check**: End-to-end proposal generation passes across all step keys.
- **Stop Point**: YES. Owner visual check of Proposal output structure, flags, and voice command lexicon.

### T7: Fake Perception Kernel
- **Goal**: Implement `FakePerceptionKernel` in `contracts/fakes/perception.py` for deterministic testing in downstream slices (S05, S08).
- **Files**:
  - `contracts/fakes/perception.py`
  - `contracts/fakes/__init__.py`
  - `services/api/tests/perception/test_fakes.py`
- **Tests First**: `services/api/tests/perception/test_fakes.py` verifying fake returns predictable proposals for fixed fixtures.
- **Steps**:
  1. Write tests for fake perception behavior.
  2. Implement `FakePerceptionKernel` conforming to the perception public interface.
- **Done Check**: `pytest services/api/tests/perception/test_fakes.py` passes.
- **Stop Point**: No.

### T8: Demo Script & Comprehensive Case Table Verification
- **Goal**: Implement `services/api/app/perception/demo.py` running 30 typed phrases covering all steps, printing an aligned pass/fail report, and confirming all acceptance criteria pass.
- **Files**:
  - `services/api/app/perception/demo.py`
  - `services/api/tests/perception/test_demo.py`
- **Tests First**: `services/api/tests/perception/test_demo.py` asserting demo runner executes cleanly.
- **Steps**:
  1. Curate 30 phrases covering all steps, edge cases, Malayalam words, and voice commands.
  2. Implement `demo.py` CLI runner with clean tabular output.
  3. Verify all case tables and property tests pass.
- **Done Check**: `python -m app.perception.demo` outputs 30/30 passed; entire perception test suite green.
- **Stop Point**: No.

---

## Completion Checklist
- [ ] All 8 tasks implemented and tested
- [ ] No float usage in any number parsing or money calculations
- [ ] All parser and matcher case tables pass
- [ ] Decimal property tests pass
- [ ] Voice command lexicon matches whole utterances only (no LLM)
- [ ] Normalizer interface and rule-based implementation clean
- [ ] Lint (`ruff check`) and type check (`mypy`) clean
- [ ] Demo script runs 30 phrases with 100% pass rate
