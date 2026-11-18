# Close a slice

Input: SLICE_ID. Run only after the owner says to close it and review.md says PASS.

1. Confirm the working tree is clean and the full test suite is green. Quote the result.
2. Write the Handoff section in status.md for future slices: what this slice provides (public contracts, endpoints, modules, route names), how to use each with a short example, environment variables, known limits and deferred items. Write it for a reader who sees only this section.
3. Freeze contracts: record each provided contract's version and content hash in docs/STATE.md under Contracts.
4. Move deferred items and ideas to docs/BACKLOG.md. Do not build them.
5. Update the slice row in STATE.md: DONE, date, tag name. Tag the branch tip SLICE_ID-done and merge to main the way the owner specifies (default: squash merge with the message SLICE_ID: title).
6. Suggest the next slice: one whose dependencies are now all DONE, with the reason.

Output: a short closing report with the commit and tag, the frozen contracts and the next suggested slice. Never edit docs/BLUEPRINT.md.
