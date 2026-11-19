# S02: Perception kernel — Tests & Acceptance Criteria

## Acceptance Criteria

- **AC1: Number Parsing Precision & Zero-Float Typing (BP 3.1, 6.5)**
  - *Given* numeric strings with currency symbols, commas, or decimals (e.g. `₹ 1,500.50`, `12,34,567.00`, `Rs. 450`),
  - *When* `parse_number(text)` is invoked,
  - *Then* it returns a `Decimal` instance with exact precision and zero intermediate or final `float` representations.

- **AC2: English Number Words & Informal Compounds (BP 6.5)**
  - *Given* English spoken number words including compounds (e.g. `"fifteen hundred"`, `"one and a half thousand"`, `"two lakh fifty thousand"`),
  - *When* `parse_number(text)` is invoked,
  - *Then* it resolves to exact Decimal values (`1500`, `1500`, `250000`).

- **AC3: Fractions & Metric Shorthand (BP 6.5)**
  - *Given* fractional quantities or shorthand suffixes (e.g. `"half"`, `"quarter"`, `"one and a half"`, `"1.5k"`, `"2.5L"`, `"1cr"`),
  - *When* `parse_number(text)` is invoked,
  - *Then* it returns `Decimal("0.5")`, `Decimal("0.25")`, `Decimal("1.5")`, `Decimal("1500")`, `Decimal("250000")`, `Decimal("10000000")`.

- **AC4: Malayalam Number Words & Fractions (BP 6.5)**
  - *Given* Malayalam number words or fractions (e.g. `"ഒന്ന്"`, `"രണ്ട്"`, `"പത്ത്"`, `"നൂറ്"`, `"ആയിരം"`, `"ലക്ഷം"`, `"അര"`, `"കാൽ"`, `"ഒന്നര"`),
  - *When* `parse_number(text)` is invoked,
  - *Then* it resolves to `1`, `2`, `10`, `100`, `1000`, `100000`, `0.5`, `0.25`, `1.5`.

- **AC5: Indian Number in Words & Digit Grouping (BP 3.1, 5.4)**
  - *Given* a Decimal value for Qty or Rate (e.g. `Decimal("1500")`, `Decimal("1234567.50")`),
  - *When* formatted for presentation,
  - *Then* `words` returns `"One thousand five hundred"` and display uses Indian digit grouping (`12,34,567.50`).

- **AC6: Date Parsing & Asia/Kolkata Timezone (BP 3.1, 5.1)**
  - *Given* relative words (`"today"`, `"yesterday"`, `"ഇന്ന്"`, `"ഇന്നലെ"`), ISO dates (`"2026-11-18"`), or Indian date strings (`"10/11/2026"`, `"10 Nov 2026"`),
  - *When* `parse_date(text, reference_today)` is called,
  - *Then* it returns the corresponding `datetime.date` anchored to `Asia/Kolkata` and formatted ISO string (`YYYY-MM-DD`).

- **AC7: Date 45-Day Warning Rule (BP 5.1)**
  - *Given* a parsed date `d` and reference today `ref`,
  - *When* `abs((d - ref).days) > 45`,
  - *Then* `check_date(d, ref)` returns a warning indicating the date is more than 45 days away.

- **AC8: Text Normalization, Latin Script & Acronym Casing (BP 3.1, 6.3)**
  - *Given* raw text with mixed whitespace, Malayalam phonetic words, or abbreviations (e.g. `"  pvc  pipe  "`, `"led bulb 9w"`),
  - *When* normalized by `RuleBasedNormalizer`,
  - *Then* it outputs Latin script trimmed to Title Case, keeping all-caps tokens of 4 letters or fewer (`"PVC Pipe"`, `"LED Bulb 9W"`), within length limits (Recipient <= 80, Item <= 120).

- **AC9: Alias Priority & RapidFuzz Matcher Thresholds (BP 6.4)**
  - *Given* candidate memory entities and an alias table,
  - *When* `match(query, candidates, aliases)` is executed:
    - If `query_norm` matches an alias key, it returns immediate exact match.
    - If RapidFuzz token set ratio is `>= 95`, it returns a match with matched display name.
    - If score is `80-94`, it returns `NEAR_MATCH` flag with up to 3 alternatives.
    - If score is `< 80`, it flags `NEW_CUSTOMER` for recipient or no match.

- **AC10: Extra Number Extraction in Item Utterance (BP 5.4, 6.5)**
  - *Given* an item utterance containing an embedded numeric token (e.g. `"cement 5 bags"` or `"asian paints 500"`),
  - *When* processed for the `ITEM` step,
  - *Then* the proposal item text is cleaned of the number, flag `EXTRA_NUMBER` is set, and the extracted number is carried for the subsequent `QTY` step without being committed early.

- **AC11: Quantity and Rate Boundary & Outlier Checks (BP 3.1, 5.1)**
  - *Given* numeric values for Qty or Rate,
  - *When* checked by `check_qty` and `check_rate`:
    - Qty `<= 0` or `> 100000` is rejected; Qty `> 100` generates a warning.
    - Rate `<= 0` or `> 10000000` is rejected; Rate `> 100000` generates a warning.
    - Rate outside `0.2x` to `5.0x` of the median of >= 3 recent rates flags `PRICE_OUTLIER` with a warning.

- **AC12: Whole-Utterance Voice Command Lexicon (BP 5.5)**
  - *Given* an utterance that matches a whole voice command in English or Malayalam (`"ok"`, `"yes"`, `"ശരി"`, `"back"`, `"തിരികെ"`, `"redo"`, `"again"`, `"വീണ്ടും"`, `"done"`, `"മതി"`, `"കഴിഞ്ഞു"`),
  - *When* checked against the lexicon,
  - *Then* it resolves to the corresponding `VoiceCommand` enum (`CONFIRM`, `BACK`, `REDO`, `DONE`). Utterances with additional content are treated as content, not commands.

- **AC13: Proposal Object Contract & Completeness (BP 5.4)**
  - *Given* any valid step input and context,
  - *When* `build_proposal(step_key, raw_input, ...)` is called,
  - *Then* it produces a valid `Proposal` Pydantic model with all required fields (`step_key`, `raw_transcript`, `value`, `display`, `flags`, `confidence`, `needs_clarification`).

- **AC14: Fake Perception Kernel Compliance (BP 15)**
  - *Given* the `FakePerceptionKernel` in `contracts/fakes/perception.py`,
  - *When* called with mock step inputs,
  - *Then* it returns deterministic proposals conforming to the `Proposal` contract for downstream test suites.

- **AC15: Decimal Property Invariants (BP 3.1, 15)**
  - *Given* arbitrary Decimal quantities and rates,
  - *When* parsed and rounded half up,
  - *Then* precision limits are preserved (Qty <= 3 decimals, Rate <= 2 decimals, Amount = Qty x Rate rounded half up to 2 decimals) without precision loss.

---

## Test Matrix

| Acceptance Criteria | Test File | Level |
| --- | --- | --- |
| AC1: Number Parsing Precision | `tests/perception/test_number.py` | Unit |
| AC2: English Number Words | `tests/perception/test_number.py` | Unit |
| AC3: Fractions & Metric Shorthand | `tests/perception/test_number.py` | Unit |
| AC4: Malayalam Number Words | `tests/perception/test_number.py` | Unit |
| AC5: Indian Number in Words | `tests/perception/test_words.py` | Unit |
| AC6: Date Parsing & Timezone | `tests/perception/test_date.py` | Unit |
| AC7: Date 45-Day Warning | `tests/perception/test_date.py`, `test_checks.py` | Unit |
| AC8: Text Normalization & Acronyms | `tests/perception/test_normalizer.py` | Unit |
| AC9: Matching & RapidFuzz Thresholds | `tests/perception/test_matcher.py` | Unit |
| AC10: Extra Number in Item | `tests/perception/test_checks.py`, `test_builder.py` | Integration |
| AC11: Quantity & Rate Outlier Checks | `tests/perception/test_checks.py` | Unit |
| AC12: Voice Command Lexicon | `tests/perception/test_lexicon.py` | Unit |
| AC13: Proposal Object Contract | `tests/perception/test_builder.py`, `test_contracts.py` | Integration |
| AC14: Fake Perception Kernel | `tests/perception/test_fakes.py` | Unit |
| AC15: Decimal Property Invariants | `tests/perception/test_property.py` | Property |

---

## Fakes & Fixtures
- Candidate memories fixture: Sample customers (`Asha Stores`, `National Hardware`, `Kochi Builders`) and items (`PVC Pipe 1 inch`, `Cement 50kg`, `LED Bulb 9W`).
- Alias mapping fixture: `{"asha": "cust_1", "hardware": "cust_2"}`.
- Recent rates fixture: `[Decimal("450.00"), Decimal("460.00"), Decimal("455.00"), Decimal("450.00")]` for median testing.
- `FakePerceptionKernel`: Deterministic responses for testing S05/S08 without perception internals.

---

## Edge Cases & Error States
- Ambiguous number (e.g. `"two fifty"`): Flag `needs_clarification=True`, offer alternatives (`["250", "2.50"]`).
- Missing year in date (`"10 November"`): Defaults to current year in Asia/Kolkata.
- Impossible dates (`"31 February"`): Marked invalid, `value=None`, flag `NOT_UNDERSTOOD`.
- Negative or zero quantities/rates (`"0"`, `"-5"`): Validation error caught by checks.
- Extremely long names (> 80 chars for recipient, > 120 for item): Truncated with whitespace collapsed.
- Pure voice command uttered with content (`"ok add cement"`): Handled as content, not command.

---

## Performance Budgets
- Perception pipeline execution (parsing + matching + checks + proposal build): < 10 ms per turn.
- RapidFuzz candidate match across 500 candidates: < 5 ms.

---

## Demo Script (30 Typed Phrases)

Run with: `python -m app.perception.demo`

| Step # | Step Key | Input Phrase | Expected Value / Output | Expected Flags / Notes |
| --- | --- | --- | --- | --- |
| 1 | recipient | `"Asha Stores"` | `matched_id="cust_1"`, `"Asha Stores"` | Exact match |
| 2 | recipient | `"asha"` | `matched_id="cust_1"`, `"Asha Stores"` | Alias match |
| 3 | recipient | `"Asha Stor"` | `matched_id="cust_1"`, `"Asha Stores"` | `NEAR_MATCH` (score >= 90) |
| 4 | recipient | `"Sunrise Bakery"` | `"Sunrise Bakery"` | `NEW_CUSTOMER` (score < 80) |
| 5 | recipient | `"  kerala   electricals  "` | `"Kerala Electricals"` | Title Case & collapsed spaces |
| 6 | date | `"today"` | Today's ISO date (`YYYY-MM-DD`) | Current date Asia/Kolkata |
| 7 | date | `"yesterday"` | Yesterday's ISO date | Reference date - 1 day |
| 8 | date | `"ഇന്ന്"` | Today's ISO date | Malayalam "today" |
| 9 | date | `"10/11/2026"` | `"2026-11-10"` | Indian date format |
| 10 | date | `"15 January 2026"` | `"2026-01-15"` | Warn if > 45 days away |
| 11 | item | `"pvc pipe 1 inch"` | `"PVC Pipe 1 Inch"` | <=4 letter acronym PVC kept caps |
| 12 | item | `"led bulb 9w"` | `"LED Bulb 9W"` | LED caps preserved |
| 13 | item | `"cement 5 bags"` | `"Cement Bags"`, extra=`5` | `EXTRA_NUMBER` flag |
| 14 | item | `"asian paints 500"` | `"Asian Paints"`, extra=`500` | `EXTRA_NUMBER` flag |
| 15 | item | `"steel rods"` | `"Steel Rods"` | Clean item string |
| 16 | qty | `"1"` | `Decimal("1")` | Default qty |
| 17 | qty | `"5"` | `Decimal("5")`, `"Five"` | Standard int |
| 18 | qty | `"half"` | `Decimal("0.5")`, `"Zero point five"` | Fraction half |
| 19 | qty | `"one and a half"` | `Decimal("1.5")`, `"One point five"` | Compound fraction |
| 20 | qty | `"രണ്ടര"` | `Decimal("2.5")`, `"Two point five"` | Malayalam "two and a half" |
| 21 | qty | `"150"` | `Decimal("150")` | Warning: qty > 100 |
| 22 | rate | `"450"` | `Decimal("450.00")`, `"Four hundred fifty"` | Standard rate |
| 23 | rate | `"₹ 1,500.50"` | `Decimal("1500.50")` | Currency symbol & commas stripped |
| 24 | rate | `"1.5k"` | `Decimal("1500.00")` | Suffix 'k' |
| 25 | rate | `"fifteen hundred"` | `Decimal("1500.00")` | Spoken number words |
| 26 | rate | `"5000"` | `Decimal("5000.00")` | `PRICE_OUTLIER` (median=450) |
| 27 | command | `"ok"` | `VoiceCommand.CONFIRM` | Whole utterance command |
| 28 | command | `"ശരി"` | `VoiceCommand.CONFIRM` | Malayalam "ok" |
| 29 | command | `"back"` | `VoiceCommand.BACK` | Navigation command |
| 30 | command | `"done"` | `VoiceCommand.DONE` | Finish command |
