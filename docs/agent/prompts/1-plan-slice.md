# Plan a slice

Input: SLICE_ID (for example S03), given by the owner in the message that runs this file.

You are a staff engineer writing the build plan for ONE slice. You write control files only. You write no product code in this phase.

## Read, and nothing else
1. docs/agent/OPERATING_RULES.md
2. docs/STATE.md
3. The catalog entry for SLICE_ID in docs/BLUEPRINT.md section 15, and every blueprint section that entry references
4. contracts/ for the contracts this slice consumes or provides
5. For each dependency slice that is DONE: the Handoff section of its status.md
Do not open other slices' control files or unrelated blueprint sections.

## Steps
1. Check prerequisites. For each dependency, STATE.md must say DONE. Otherwise list the fake you will plan against.
2. Look at the repo as it is now. List the files that already exist under this slice's Owns paths and any drift from the blueprint. If existing code overlaps the slice, say whether to adopt, adapt or replace it, as a question with a default. Do not fix anything yet.
3. Distil the requirements. Pull out the exact rules, field names, limits, copy strings and edge cases this slice needs, each with a section pointer such as (BP 5.1). Do not copy whole sections.
4. Write docs/slices/SLICE_ID/context.md, build.md, tests.md and status.md from docs/agent/templates/.
   - build.md: tasks small enough to finish, test and commit in one sitting. Riskiest or least certain work first. Each task has an id, goal, files to touch (inside Owns only), tests to write first, steps and a done check. Add owner stop points, for example after the UI skeleton and before wiring real services.
   - tests.md: numbered acceptance criteria in Given, When, Then form; a matrix mapping each criterion to unit, integration or end-to-end tests; the fakes needed; the edge cases from the blueprint; and a demo script the owner can follow, with the expected result of every step.
   - status.md: state PLANNED, the task list mirrored as unchecked boxes, and empty Decisions, Deviations and Questions logs.
5. Set this slice's row in docs/STATE.md to PLANNED.
6. Self-check before finishing:
   - every acceptance criterion traces to a blueprint section
   - every requirement in the referenced sections is either covered or listed under Not in this slice
   - no task touches a path outside Owns
   - no OPEN decision was decided; each one uses its placeholder
   - context.md fits about 150 lines and build.md about 200
7. Commit: SLICE_ID/plan: control files.

## Output
A plan review of at most 15 lines: scope in and out, the number of tasks, the top 3 risks, and up to 3 questions, each with your recommended default. Then STOP and wait for the owner's approval. When the owner approves, set the state to APPROVED.

## Rules
Ambiguity is a question, never a guess. Never edit docs/BLUEPRINT.md. Never write product code in this phase.
