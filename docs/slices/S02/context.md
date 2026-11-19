# S02: Perception kernel — Context

## Goal
Provide a pure, deterministic Python library that parses, normalizes, validates, and matches text inputs into typed values, domain checks, and Proposals without an LLM. Downstream slices (S05 Typed guided fill, S08 STT bake-off, S09 Voice fill) benefit from reliable numeric and date parsing, text normalization, RapidFuzz matching, and the Proposal contract.

## Blueprint References
- BP 3.1 (Number, money, text, date and display rules)
- BP 5.1 (Step definitions, prompts, shortcuts, checks)
- BP 5.4 (Proposal object schema, flags, confidence, alternatives, extra number policy)
- BP 5.5 (Voice commands: whole utterance lexicon matching with no LLM, English + Malayalam)
- BP 6.3 (Normalizer: text steps only, RuleBasedNormalizer behind Normalizer interface, Latin output, title casing, acronym handling, Malayalam phonetics, proper noun preservation)
- BP 6.4 (Matching: lowercase/strip normalization, Alias exact check first, RapidFuzz token set ratio thresholds: >=95 match, 80-94 near match, <80 new)
- BP 6.5 (Number parsing: no LLM, strip currency/commas, English number words, Malayalam table, fractions for Qty, 1.5k shorthand, Indian words output, case tables, Decimal property tests)
- BP 15 (S02 Perception kernel catalog entry: Owns, Depends on, Provides, Not in it, Demo, Done when)

## Distilled Requirements
- **Purity & Non-LLM Execution** (BP 5.5, 6.5): Pure Python logic; zero float calculations; no external network or LLM calls during parsing or validation.
- **Numbers & Money** (BP 3.1, 6.5):
  - Values are `Decimal`, never `float`. String serialization for transfers.
  - Qty: `> 0`, up to 3 decimals, default 1, maximum 100,000. Warn if `> 100`.
  - Rate: `> 0`, up to 2 decimals, maximum 10,000,000. Warn if `> 100,000` or outside `0.2x` to `5.0x` of recent median (when >= 3 history rates exist; flag `PRICE_OUTLIER`).
  - Parsing strips commas, ₹, Rs, Rs., rupees, INR.
  - Supports English number words ("fifteen hundred" -> 1500, "one and a half thousand" -> 1500), shorthand ("1.5k" -> 1500, "2.5L" -> 250000, "1cr" -> 10000000), fractions ("half" -> 0.5, "quarter" -> 0.25, "one and a half" -> 1.5), and Malayalam number words table ("ഒന്ന്", "രണ്ട്", "പത്ത്", "നൂറ്", "ആയിരം", "ലക്ഷം", "അര", "കാൽ", "ഒന്നര").
  - Formats numbers into Indian words (e.g. 1500 -> "One thousand five hundred").
  - Extra number in Item text flagged as `EXTRA_NUMBER` without early commitment (BP 5.4).
- **Dates** (BP 3.1, 5.1):
  - Parsed into `datetime.date`, stored as ISO 8601 (`YYYY-MM-DD`).
  - Default is today in timezone `Asia/Kolkata`.
  - Parses relative words ("today", "yesterday", "ഇന്ന്", "ഇന്നലെ"), ISO dates, and Indian formats ("10/11/2026", "10 Nov 2026", "10th Nov 2026").
  - Display format like `10 November 2026`.
  - Warns if date is more than 45 days away from today (`abs(days) > 45`).
- **Text & Normalization** (BP 3.1, 6.3):
  - Recipient up to 80 chars, Item up to 120 chars; whitespace trimmed and collapsed.
  - Latin script only in final output. Transliterates Malayalam phonetic script.
  - Casing: Title Case, except all-caps tokens of 4 letters or fewer (e.g. `PVC`, `LED`, `AC`, `TMT`).
  - `Normalizer` interface with rule-based implementation `RuleBasedNormalizer` (STATE.md decision).
- **Matching** (BP 6.4):
  - Normalized query (lowercase, strip punctuation and whitespace).
  - Alias table checked first (`heard_norm == alias` -> exact match).
  - RapidFuzz token set ratio: `>= 95` match (`matched_id` assigned, matched name wins), `80-94` near match (`NEAR_MATCH` flag, up to 3 alternatives), `< 80` new (`NEW_CUSTOMER` flag on recipient).
- **Voice Commands** (BP 5.5):
  - Whole utterance only, lexicon match, no LLM: `CONFIRM` ("ok", "yes", "ശരി", "അതെ"), `BACK` ("back", "തിരികെ"), `REDO` ("redo", "again", "വീണ്ടും"), `DONE` ("done", "മതി", "കഴിഞ്ഞു").
- **Proposal Object** (BP 5.4):
  - Fields: `step_key`, `raw_transcript`, `language_code`, `value`, `display`, `words`, `confidence`, `alternatives`, `matched_id`, `flags`, `needs_clarification`, `clarification_text`.
  - Flags: `NEW_CUSTOMER`, `NEAR_MATCH`, `PRICE_OUTLIER`, `EXTRA_NUMBER`, `LOW_CONFIDENCE`, `EMPTY_AUDIO`, `NOT_UNDERSTOOD`.

## Owns
- `services/api/app/perception/` (`__init__.py`, `number.py`, `words.py`, `date.py`, `normalizer.py`, `matcher.py`, `checks.py`, `lexicon.py`, `builder.py`, `demo.py`).
- `services/api/tests/perception/` (unit test suite with case tables and property tests).
- Provided contracts: `contracts/proposal.py`, `contracts/fakes/perception.py`, export in `contracts/__init__.py`.

## Depends on
- Nothing (`none`).

## Provides
- `parse_number(text: str) -> NumberParseResult`
- `parse_date(text: str, reference_today: Optional[date] = None) -> DateParseResult`
- `match(query: str, candidates: list[CandidateMatch], aliases: dict[str, str] = {}) -> MatchResult`
- Domain checks: `check_recipient`, `check_date`, `check_qty`, `check_rate`, `check_item`
- `build_proposal(...) -> Proposal`
- `Normalizer` ABC and `RuleBasedNormalizer`
- Contracts: `Proposal`, `ProposalFlag`, `VoiceCommand`, `StepKey`, `CandidateMatch` in `contracts/proposal.py`
- Fake: `FakePerceptionKernel` in `contracts/fakes/perception.py`

## Not in this Slice
- STT audio capture, microphone hardware access, audio formats, Whisper/ElevenLabs/Gemini/Saaras adapters (S08, S09).
- FastAPI HTTP turn/parse endpoints (`POST /turn`, `POST /parse`) — part of S05.
- React UI components, step cards, microphone buttons — part of S05, S09.
- Database tables (Turn, Customer, ItemMemory, Alias) — persistent storage belongs to S00, S04, S09; S02 takes in-memory candidates and aliases.
- LLM-based normalizer implementation (deferred to M3 evaluation per STATE.md decision).

## Decisions
- LLM for Normalizer: Rule-based cleanup behind `Normalizer` interface. Pick LLM by eval in M3 (STATE.md decision).
- Indian numbering system for spoken words (lakh, crore, thousand) and digit grouping (`12,34,567.50`) (BP 3.1, 5.4).
- Reference skin / design: Design 1 (simplest) (BP Decisions table).
- UI language: English, strings externalized, Latin script only for invoice fields (BP 3.1, STATE.md).

## Risks and Unknowns
- **Number Word Ambiguity**: Informal phrases (e.g. "two fifty", "fifteen hundred", "ഒന്നര") require deterministic precedence rules and fallback to `needs_clarification=True` when confidence is split.
- **Decimal Precision Invariants**: Float arithmetic must be strictly barred to avoid IEEE 754 precision leakage in price and quantity calculations.
- **RapidFuzz Scoring Stability**: Fuzzy token set matching across candidate vocabularies must execute deterministically in microseconds per turn.
