# Raise a change request

Use this when the blueprint, a contract or a decision blocks you. Stop coding first.

Write docs/changes/CR-NNN-short-name.md, using the next free number:
- Slice and task where it happened
- The problem, in two sentences
- Evidence: blueprint section pointers, file and line, command output
- Options: 2 or 3, each with trade-offs
- Your recommendation and why
- Impact: contracts, other slices, tests, and the blueprint sections that would change
- Meanwhile: what you did or did not do (never a silent workaround)

Then tell the owner in 5 lines or fewer and wait. Set the slice state to BLOCKED in STATE.md.

After the owner decides: record the decision in the CR file and apply only what was approved. If the blueprint must change, propose the exact replacement text and let the owner apply it. List the slices whose status.md needs a note. Set STATE.md back to its previous state.
