# S02: Perception kernel — Review & Verification

## Verdict: PASS

The perception kernel is completely implemented as a pure Python library without an LLM or float math. All 15 acceptance criteria pass with automated tests, the 30-phrase demo script executes with a 100% pass rate, and type check and lint are clean.

---

## 1. Scope Verification

Changed files against `origin/main`:
- `contracts/proposal.py` (provided contract: Proposal, ProposalFlag, VoiceCommand, StepKey, CandidateMatch)
- `contracts/__init__.py` (re-exports Proposal models)
- `contracts/fakes/perception.py` (provided fake: FakePerceptionKernel)
- `contracts/fakes/__init__.py` (re-exports FakePerceptionKernel)
- `services/api/app/perception/__init__.py` (perception exports)
- `services/api/app/perception/number.py` (number parser, Malayalam table, fractions, shorthand)
- `services/api/app/perception/words.py` (Indian numbering system to words)
- `services/api/app/perception/date.py` (date parser, relative words, Asia/Kolkata timezone)
- `services/api/app/perception/normalizer.py` (Normalizer ABC, RuleBasedNormalizer)
- `services/api/app/perception/matcher.py` (RapidFuzz token set ratio matching, alias priority)
- `services/api/app/perception/checks.py` (domain and boundary checks, outlier detection)
- `services/api/app/perception/lexicon.py` (whole-utterance voice command lexicon in EN & ML)
- `services/api/app/perception/builder.py` (unified build_proposal orchestrator)
- `services/api/app/perception/demo.py` (30-phrase demo runner)
- `services/api/pyproject.toml` (added `rapidfuzz>=3.0.0` dependency, approved in plan Q2)
- `services/api/tests/perception/*` (unit, integration, property, and demo test files)
- `docs/slices/S02/*` and `docs/STATE.md` (slice control files)

Every modified or added file is within S02's Owns list, provided contracts, or approved dependencies.

---

## 2. Test & Quality Suite Results

- **Unit & Integration Suite**: 138 perception tests passed in 0.22s.
- **Combined Test Suite**: 160 tests passed across contracts and perception.
- **Lint (`ruff check`)**: Clean (`All checks passed!`).
- **Type Check (`mypy`)**: Clean (`Success: no issues found in 28 source files`).
- **Performance**: Proposal generation average latency is ~0.030 ms (budget is < 10 ms).

---

## 3. Acceptance Matrix

| Acceptance Criteria | Blueprint | Test / Verification Evidence | Result |
| --- | --- | --- | --- |
| AC1: Number Parsing Precision | BP 3.1, 6.5 | `test_number.py::test_parse_number_cases`, `test_property.py::test_no_float_leaks_in_parser` | PASS |
| AC2: English Number Words | BP 6.5 | `test_number.py::test_parse_number_cases` ("fifteen hundred", "one and a half thousand") | PASS |
| AC3: Fractions & Metric Shorthand | BP 6.5 | `test_number.py::test_parse_number_cases` ("half", "quarter", "1.5k", "2.5L", "1cr") | PASS |
| AC4: Malayalam Number Words | BP 6.5 | `test_number.py::test_parse_number_cases` ("ഒന്ന്", "രണ്ട്", "അര", "ഒന്നര", "രണ്ടര") | PASS |
| AC5: Indian Number in Words | BP 3.1, 5.4 | `test_number.py::test_indian_words_formatter`, `test_builder.py::test_builder_rate_currency_and_outlier` | PASS |
| AC6: Date Parsing & Timezone | BP 3.1, 5.1 | `test_date.py::test_parse_date_cases`, `test_date_display_formatting` | PASS |
| AC7: Date 45-Day Warning Rule | BP 5.1 | `test_date.py::test_parse_date_45_day_warning`, `test_checks.py::test_check_date_bounds` | PASS |
| AC8: Text Normalization & Acronyms | BP 3.1, 6.3 | `test_normalizer.py::test_normalizer_casing_and_acronyms`, `test_normalizer_malayalam_transliteration` | PASS |
| AC9: Alias & RapidFuzz Thresholds | BP 6.4 | `test_matcher.py::test_alias_match_priority`, `test_rapidfuzz_exact_match`, `test_rapidfuzz_near_match`, `test_rapidfuzz_new_match` | PASS |
| AC10: Extra Number in Item | BP 5.4, 6.5 | `test_checks.py::test_check_item_text_and_extra_number`, `test_builder.py::test_builder_item_with_extra_number` | PASS |
| AC11: Quantity & Rate Outlier Checks | BP 3.1, 5.1 | `test_checks.py::test_check_qty`, `test_checks.py::test_check_rate` | PASS |
| AC12: Voice Command Lexicon | BP 5.5 | `test_lexicon.py::test_lexicon_english_commands`, `test_lexicon_malayalam_commands`, `test_lexicon_ignores_commands_with_content` | PASS |
| AC13: Proposal Object Contract | BP 5.4 | `test_contracts.py::test_proposal_minimal_valid`, `test_proposal_full`, `test_builder.py` | PASS |
| AC14: Fake Perception Kernel | BP 15 | `test_fakes.py::test_fake_perception_kernel_defaults`, `test_fake_perception_kernel_canned_override`, `test_contracts_fakes_package_export` | PASS |
| AC15: Decimal Property Invariants | BP 3.1, 15 | `test_property.py::test_amount_calculation_and_rounding`, `test_decimal_precision_invariants` | PASS |

---

## 4. Demo Script Execution (30 Phrases)

Command: `python -m app.perception.demo`
Result: `30/30 phrases passed, 0 failed`.

Summary of execution steps:
- Recipient matching (exact memory hit, alias lookup, near match, new customer, Title Case): Steps 1–5 PASSED.
- Date parsing (relative "today", "yesterday", "ഇന്ന്", standard DD/MM/YYYY, >45-day warning): Steps 6–10 PASSED.
- Item normalization (acronyms PVC/LED, extra number extracted from "cement 5 bags" and "asian paints 500"): Steps 11–15 PASSED.
- Quantity parsing (integer, words, fractions, Malayalam "രണ്ടര", >100 warning): Steps 16–21 PASSED.
- Rate parsing (currency stripping, 1.5k shorthand, words, >5x median outlier): Steps 22–26 PASSED.
- Voice commands (whole-utterance "ok", "ശരി", "back", "done"): Steps 27–30 PASSED.

---

## 5. Defect List

No blockers, majors, or minors found.
- Float usage: 0 instances. `Decimal` used exclusively.
- Hardcoded business data: 0 instances.
- Swallowed exceptions: 0 instances. All exceptions caught are specific (`ValueError`, `InvalidOperation`).
- Contract drift: 0 diff in existing contracts (`contracts/render_model.py`, `contracts/openapi.json`).
- Leftover TODOs: 0.

---

## 6. UNVERIFIED Items

None. All 15 acceptance criteria and the 30 demo phrases have automated test assertions.

---

## 7. Risks & Notes for Later Slices

- **S05 (Typed guided fill)**: `build_proposal()` expects candidates and aliases passed into the function; S05 / S04 must load active Customer and ItemMemory records from the database or cache when invoking the perception pipeline.
- **S08 (STT bake-off) & S09 (Voice fill)**: STT outputs may introduce unexpected Unicode punctuation or acoustic misrecognitions. The voice command lexicon and normalizer handle common Malayalam phrases, but candidate expansion from real shop recordings in S08 should be added to the lexicon table as discovered.
