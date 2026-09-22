# In Evidence

In Evidence is a sequential logic-deduction game for introductory civil litigation and paralegal studies courses. Ten light fictional disputes ask players to determine whether sixteen case-specific evidence items were admitted or excluded. Every accepted ruling must follow from the logic clues currently visible on the docket, so unsupported guesses never advance the case.

The game deliberately separates two ideas:

- **Logic reasoning** explains how the visible puzzle clues establish the fictional judge's ruling.
- **Civil-litigation instruction** explains why that item received the ruling in the fictional case, the purpose for which it was offered, the evidence issue, likely foundation, and a realistic paralegal task.

Spatial clues are game mechanics. They are never presented as legal reasons for admissibility.

## How it works

- Ten handcrafted cases: three introductory, four standard, and three challenging. Later cases introduce combined-clue deductions rather than simply adding reading.
- Every case uses a 4-by-4 board, sixteen illustrated characters, one unique binary solution, and a verified sixteen-move deduction path.
- `src/puzzles.js` keeps solver-ready puzzle construction separate from the interface. `src/instructional-data.js` contains the case claims, evidence records, Pennsylvania rule references, debriefs, and reflection prompts.
- `src/logic.js` exhaustively checks all 65,536 possible boards. It powers move validation, contradiction explanations, hints, and build-time verification.
- Correct rulings reveal a new logic clue plus a separate civil-litigation note. Unsupported choices remain unmarked and contradictions cite only the conflicting visible clue.
- Every correct ruling automatically opens a Ruling Review. It identifies the complete puzzle deduction, highlights supporting board positions, and separates Puzzle Reasoning from the Civil Litigation Explanation. The final review must be completed before the case debrief opens.
- Each case begins with a plain-language Rule Card linked to the official Pennsylvania Code. Topics progress from relevance and authentication through writings, digital evidence, personal knowledge, business records, compromise, hearsay purpose, opinion testimony, and Rule 403 balancing.
- Characters retain their names and portraits but receive a case-specific role explaining how they created, received, observed, maintained, or can identify the current evidence item.
- The archive shows the evidence focus, estimated time, progress, and a New marker for unopened cases.
- Completion includes a one-minute teaching debrief, two evidence examples, a paralegal-practice note, and an optional discussion or writing prompt. Instructors can copy the prompt or print a board-free case debrief. The site never collects student responses.
- Progress, timer state, hints, dimmed clues, and archive completion remain in browser `localStorage`.
- The static site has no backend, account, analytics, cookies, runtime API, or secrets.

## Educational scope

The rulings use simplified fictional facts to practice spotting evidence issues. They do not state universal outcomes and do not offer legal advice. Real rulings depend on the jurisdiction, purpose, objections, foundation, and particular facts.

The launch sequence focuses on the current Pennsylvania Rules of Evidence and links directly to official Pennsylvania Code pages. It avoids common shortcuts: hearsay is not automatically excluded, a photographer is not always required to authenticate a photograph, printing an email does not authenticate it, authentication does not guarantee admissibility, relevant evidence may still be excluded, and an accurate duplicate is not inadmissible merely because it is a copy.

Discovery and trial admissibility are also distinct. An item may be collected and reviewed in discovery even if the judge later excludes it from the trial record.

## Classroom use

An introductory case can be completed as a short in-class warm-up. Instructors can pause after any ruling to compare the logic clue with the legal explanation, or use the completion prompt for a one-minute written response, pair discussion, or exhibit-preparation exercise. No submission or account is required.

## Run locally

Requires Node.js 22 and Python 3.

```bash
npm run dev
```

Open <http://127.0.0.1:4182>.

## Test

```bash
npm test
npm run check
```

The tests exhaustively verify one solution, a supported move at every stage, completion of all sixteen rulings, complete deduction explanations and hints, difficulty-specific combined-deduction counts, the final-review sequence, stable legacy solutions, case-specific roles, unique evidence labels, all instructional fields, initial Rule Cards, and official Pennsylvania Code URLs.

## Add a case

Add the solver specification to `CASES` in `src/puzzles.js`, then add the matching instructional record to `CASE_INSTRUCTION` in `src/instructional-data.js`. Supply exactly sixteen unique evidence items with offered purpose, issue, foundation, ruling reason, paralegal task, case-specific role, and at least one official rule reference. Add the case Rule Card, debrief, examples, practice note, and discussion question.

Do not change an issued solution string casually because it maps to saved rulings in `localStorage`. Run the full tests after changing any path, clue, or solution. The exhaustive validator rejects ambiguity or a stalled path. If an issued solution truly must change, add an explicit per-case migration instead of clearing unrelated archive progress.

## Accessibility

- Full keyboard access through native buttons and dialogs
- Visible focus rings and 44px minimum primary touch targets
- Text plus symbols on every ruling, never color alone
- Screen-reader labels for positions, portraits, evidence, and controls
- Reduced-motion support
- Responsive 4-by-4 board preserved on phones with a larger evidence sheet for close inspection
- Light and dark color schemes with semantic CSS tokens

## Artwork

The sixteen-person editorial portrait sheet was generated specifically for this game with OpenAI's built-in image generation tool. It is stored locally in `assets/character-sheet.png`, served with the site, and contains no external tracking or runtime dependency. Character appearance and occupation never determine credibility or the ruling.

Final generation prompt: exactly sixteen diverse fictional adults in a regular 4-by-4 sprite sheet, rendered as warm editorial gouache and ink with imperfect navy linework, screenprinted parchment, teal, coral, mustard, burgundy, and olive color blocks; no text, logos, legal clip art, police imagery, mugshots, photorealism, or stereotypes.

## Important URLs and services

- Production site: https://jens246.github.io/in-evidence/
- Source repository: https://github.com/JenS246/in-evidence
- Hosting: GitHub Pages
- Backend services: none
- Persistent data: browser `localStorage` only
- Backup and restore: clone the Git repository and redeploy the `main` branch

## License

MIT
