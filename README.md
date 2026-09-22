# In Evidence

In Evidence is a polished, sequential logic-deduction game set inside ten light fictional civil disputes. Players determine whether each of sixteen evidence items was admitted or excluded. Every accepted ruling must follow from the clues currently visible on the docket, so unsupported guesses never advance the case.

## How it works

- Ten handcrafted cases: three introductory, four standard, and three challenging.
- Every case uses a 4-by-4 board, sixteen illustrated characters, one unique binary solution, and a verified sixteen-move deduction path.
- `src/puzzles.js` keeps case content and character arrangements separate from the interface.
- `src/logic.js` exhaustively checks all 65,536 possible boards. It powers move validation, contradiction explanations, hints, and build-time verification.
- Correct rulings reveal the character's clue. Unsupported choices remain unmarked and wrong choices receive a gentle contradiction message.
- Progress, timer state, hints, dimmed clues, and archive completion remain in browser `localStorage`.
- The static site has no backend, account, analytics, cookies, runtime API, or secrets.

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

The tests exhaustively verify that each puzzle has exactly one solution, that the intended solution is the unique solution, that a logically supported move is always available, and that the complete path reaches all sixteen rulings without guessing.

## Add a case

Add one case specification to `CASES` in `src/puzzles.js`. Supply a unique slug, title, difficulty, two-sentence summary, explicit sixteen-bit solution, cast rotation, and row or column clue mode. The deterministic builder produces the clue chain and the exhaustive tests reject ambiguity or a stalled path.

## Accessibility

- Full keyboard access through native buttons and dialogs
- Visible focus rings and 44px minimum primary touch targets
- Text plus symbols on every ruling, never color alone
- Screen-reader labels for positions, portraits, evidence, and controls
- Reduced-motion support
- Responsive 4-by-4 board preserved on phones with a larger evidence sheet for close inspection
- Light and dark color schemes with semantic CSS tokens

## Artwork

The sixteen-person editorial portrait sheet was generated specifically for this game with OpenAI's built-in image generation tool. It is stored locally in `assets/character-sheet.png`, served with the site, and contains no external tracking or runtime dependency.

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
