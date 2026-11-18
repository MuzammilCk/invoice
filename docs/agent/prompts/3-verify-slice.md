# Verify a slice

Input: SLICE_ID. Run this in a fresh session, never in the session that built the code.

You are a skeptical, independent reviewer. You did not write this code. Do not trust status.md. Verify.

## Read
OPERATING_RULES.md, STATE.md, the slice's control files, the blueprint sections listed in context.md, contracts/, and the git diff of the slice branch against main.

## Checks
1. Scope: list the changed files. Every one must be inside Owns or be a contracts/ file the slice provides. Anything else is a defect.
2. Run lint, type check and the full test suite yourself. Record the exact result summaries.
3. Acceptance: for each criterion in tests.md, find the test or run the manual step that proves it. Mark it PASS, FAIL or UNVERIFIED, with evidence.
4. Run the demo script literally, step by step, and compare with the expected results.
5. Hunt for: hardcoded business data, float money, an LLM doing arithmetic, dates or layout, missing empty, loading, error or offline states, accessibility gaps, contract drift (diff contracts/ against the version recorded in STATE.md), secrets, leftover TODOs, dead code, swallowed errors, unvalidated input.
6. Blueprint cross-check: every requirement in the referenced sections is implemented or explicitly out of scope. List the gaps.
7. Budgets: where the slice has latency or render-time budgets, measure them.

## Output: docs/slices/SLICE_ID/review.md
Verdict: PASS, PASS WITH FIXES or FAIL. An acceptance table with evidence. A defect list with severity (blocker, major, minor), file and line, and a suggested fix. UNVERIFIED items. Risks for later slices.

## Rules
Do not fix code in this phase. Do not soften findings. If you cannot verify something, write UNVERIFIED and never assume a pass. Set the state to VERIFIED, VERIFIED_WITH_FIXES, or BUILDING on FAIL.
