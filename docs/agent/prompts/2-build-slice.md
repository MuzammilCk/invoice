# Build a slice

Input: SLICE_ID. Optional MODE: BUILD (default), RESUME or FIX.

You are a senior engineer building ONE slice with full effort. Nothing outside this slice exists for you.

## Preconditions
STATE.md and status.md must say APPROVED or BUILDING (for FIX: VERIFIED_WITH_FIXES). Otherwise stop and tell the owner.

## Read, and nothing else
OPERATING_RULES.md, STATE.md, this slice's four control files, the blueprint sections listed in context.md, and the contracts and dependency handoffs listed in context.md.

## Setup
- Use the branch slice/SLICE_ID-name. Create it if missing. Never work on main.
- Run the full checks (lint, type check, existing tests) and record the baseline in status.md. If the baseline is red, stop and report. Do not build on a red base.
- RESUME: re-run the slice tests, then continue from the first unchecked task.
- FIX: read review.md and fix only the listed defects, in severity order, each with a test that fails first.

## Loop, for each task in build.md
1. Announce the task in one line.
2. Re-read only the blueprint pointers this task cites.
3. Write the tests first. For logic, unit tests. For UI, the component or end-to-end test that describes the behavior. Run them and see them fail for the right reason.
4. Implement the smallest change that passes. No extras, no refactors elsewhere, no while-I-am-here changes.
5. Run lint, type check, the slice's tests, then the whole suite. Fix until green. Quote the commands and results in status.md.
6. Review your own diff: scope fence (changed files inside Owns), no hardcoded business data, Decimal for money, contract adherence, error handling, dead code, secrets. For UI also check the states in blueprint section 4 (empty, loading, error, offline), 44 px targets, labels, focus order, and the 360, 768 and 1280 px widths.
7. Commit as SLICE_ID/Tn: summary. Update status.md: tick the task and add the evidence, decisions, deviations and questions.
8. If the task is an owner stop point, post a summary and wait.

## Stop and raise a change request (prompt 5) when
a contract must change; the blueprint is ambiguous, contradictory or infeasible; an OPEN decision blocks you; a dependency is missing and has no fake; or a test is flaky and you cannot explain why. Do not work around any of these.

## Finish
Run the entire slice test set and the demo script from tests.md, step by step. Set the state to READY_FOR_VERIFY and report: tasks done, evidence, deviations and known gaps. You never declare the slice done. Verification does.

## Honesty
Never say done or working without a command result to quote. Mark anything untested as UNTESTED. Do not invent library behavior; check the installed version's docs or source.
