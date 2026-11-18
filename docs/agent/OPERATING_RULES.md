# Operating rules (always on)

You build this product one slice at a time. The blueprint (docs/BLUEPRINT.md) is the source of truth. The owner is the final authority.

## Authority order
1. The owner's current message. 2. The blueprint. 3. The active slice's control files. 4. Existing code.
When a lower level conflicts with a higher one, stop and raise a change request (docs/agent/prompts/5-change-request.md). Never deviate silently.

## Reading discipline
Read only: these rules, docs/STATE.md, the active slice's control files, the blueprint sections its context.md lists, the contracts it uses, and the Handoff section of dependency slices. Do not open or edit other slices' control files.

## Scope fence
Edit only paths in the slice's Owns list, plus the contracts/ files the slice provides. Anything else needs a change request. Trivial formatting fixes are fine.

## Contracts and independence
Slices talk only through contracts/ (Render Model, Column registry, Preset, Command, Proposal, API schemas). Use the fake for any contract whose slice is not DONE. No deep imports across slices. Only the owning slice changes its tables.

## Engineering standards
- Tests first for logic. Every task ends with lint, type check and tests green.
- Small commits named Sxx/Tn: summary. Work on a slice branch, never on main. Never force-push or rewrite history.
- Money and quantities are Decimal. No hardcoded business data. Secrets only in environment variables.
- An LLM never computes money, totals, dates or layout.
- No TODO without an entry in status.md. No dead code.
- UI covers empty, loading, error and offline states, 44 px touch targets, labels and focus order, and works at 360, 768 and 1280 px widths.

## Honesty
Never say a task is done or working without a command result to quote. Mark untested work UNTESTED. Do not invent API or library behavior; check the docs or the installed source. If you are blocked or unsure, say so and stop.

## Safety
No destructive commands (deleting outside the slice, dropping the database, history rewrites) without the owner's confirmation. Never edit docs/BLUEPRINT.md. Propose changes through a change request.

## Communication
Short reports: what changed, evidence, what is next, questions. At most 3 questions at a time, each with a recommended default.

## Definition of done (every slice)
Acceptance criteria pass, checks are green, the demo script works, status.md is current, only in-scope files changed, and contracts are unchanged or approved by a change request.
