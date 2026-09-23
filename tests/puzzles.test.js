import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLegalReason, PUZZLES } from "../src/puzzles.js";
import { classifyAttempt, deductionFor, verifyPuzzle } from "../src/logic.js";
import { migrateProgress } from "../src/progress.js";
import { boardCompletionAvailable, hintMessage, renderMoreCaseDetails, reviewActionLabel, rulingReviewModel, timerResultLabel } from "../src/review.js";

const LEGACY_SOLUTIONS = {
  "blue-tile": "1011001010010110", "garden-goose": "0110100111001001",
  "wandering-clock": "1100101001110001", "lantern-festival": "0101110001011010",
  "parade-balloon": "1001011010100101", "mosaic-bench": "0011100101101001",
  "violet-awning": "1010011100101100", "paper-moon": "0111010010101100",
  "rooftop-bees": "1101000110110010", "brass-octopus": "0010111011000101"
};

test("launch collection contains ten complete handcrafted cases", () => {
  assert.equal(PUZZLES.length, 10);
  assert.equal(PUZZLES.filter((p) => p.difficulty === "Introductory").length, 3);
  assert.equal(PUZZLES.filter((p) => p.difficulty === "Standard").length, 4);
  assert.equal(PUZZLES.filter((p) => p.difficulty === "Challenging").length, 3);
  for (const puzzle of PUZZLES) {
    assert.equal(puzzle.characters.length, 16);
    assert.equal(new Set(puzzle.characters.map((c) => c.name)).size, 16);
    assert.equal(puzzle.solution.length, 16);
    assert.ok(puzzle.disputedIssue);
    assert.ok(puzzle.evidenceFocus);
    assert.ok(puzzle.paralegalPractice);
    assert.ok(puzzle.discussionQuestion);
    assert.equal(puzzle.ruleCard.timing, "initial");
    assert.ok(puzzle.ruleCard.plain);
    assert.ok(puzzle.ruleCard.simplified);
    assert.equal(new Set(puzzle.characters.map((c) => c.evidence)).size, 16, `${puzzle.title} has duplicate evidence labels`);
    assert.equal(puzzle.solution.join(""), LEGACY_SOLUTIONS[puzzle.slug], `${puzzle.title} changed its saved-progress solution`);
    for (const person of puzzle.characters) {
      assert.ok(person.caseRole);
      assert.ok(person.evidence);
      assert.ok(person.offeredToProve);
      assert.ok(person.evidenceIssue);
      assert.ok(person.foundation);
      assert.ok(person.rulingExplanation);
      assert.doesNotMatch(person.rulingExplanation, /^The court (admitted|excluded) this item because/i);
      assert.match(person.rulingExplanation, /^[A-Z]/);
      assert.match(person.rulingExplanation, /[.!?]$/);
      assert.ok(person.paralegalTask);
      assert.ok(person.rules.length >= 1);
      for (const rule of person.rules) {
        const url = new URL(rule.url);
        assert.equal(url.protocol, "https:");
        assert.equal(url.hostname, "www.pacodeandbulletin.gov");
      }
    }
    for (const rule of puzzle.ruleCard.rules) {
      const url = new URL(rule.url);
      assert.equal(url.hostname, "www.pacodeandbulletin.gov");
    }
  }
});

test("difficulty levels have distinct combined-deduction profiles", () => {
  for (const puzzle of PUZZLES) {
    const combined = puzzle.cardClues.filter((clue) => clue.combined).length;
    if (puzzle.difficulty === "Introductory") {
      const simpleRelations = puzzle.cardClues.filter((clue) => clue.type === "relation" && !clue.combined);
      assert.ok(simpleRelations.length >= 3, `${puzzle.title} needs at least three simple relational deductions`);
      assert.ok(combined <= 1, `${puzzle.title} has too many genuinely combined deductions`);
      for (const clue of simpleRelations) assert.ok(puzzle.path.indexOf(clue.owner) < puzzle.path.indexOf(clue.targets[0]));
    }
    if (puzzle.difficulty === "Standard") assert.ok(combined >= 3, `${puzzle.title} needs at least three combined deductions`);
    if (puzzle.difficulty === "Challenging") {
      assert.ok(combined >= 4, `${puzzle.title} needs at least four combined deductions`);
      assert.ok(puzzle.cardClues.some((clue) => clue.type === "neighborCount"));
      assert.ok(puzzle.cardClues.some((clue) => clue.type === "relation"));
      assert.ok(puzzle.cardClues.some((clue) => clue.type === "rowCount" || clue.type === "colCount"));
      assert.ok(puzzle.cardClues.findIndex((clue) => clue.combined) < 6);
      assert.ok(puzzle.cardClues.findLastIndex((clue) => clue.combined) > 10);
    }
  }
});

test("corrected Pennsylvania rule references are direct and issue-matched", () => {
  const blueInvoice = PUZZLES[0].characters.find((person) => person.evidence === "Final invoice");
  const damagePhoto = PUZZLES[4].characters.find((person) => person.evidence === "Undated damage photograph");
  assert.deepEqual(blueInvoice.rules.map((rule) => rule.label), ["Pa.R.E. 901"]);
  assert.deepEqual(damagePhoto.rules.map((rule) => rule.label), ["Pa.R.E. 901"]);
  const rule701 = PUZZLES[8].ruleCard.rules.find((rule) => rule.label === "Pa.R.E. 701");
  const rule8036 = PUZZLES[5].ruleCard.rules.find((rule) => rule.label === "Pa.R.E. 803(6)");
  assert.equal(rule701.url, "https://www.pacodeandbulletin.gov/secure/pacode/data/225/chapter7/.html");
  assert.equal(rule8036.url, "https://www.pacodeandbulletin.gov/secure/pacode/data/225/chapter8/s803-6.html");
});

test("the final ruling review precedes completion and decided reviews can reopen", () => {
  const puzzle = PUZZLES[0];
  const established = Object.fromEntries(puzzle.solution.map((value, index) => [index, value]));
  const state = { established, complete: false, reasoning: { 15: { explanation: "Verified final deduction.", supportIndices: [], highlightedIndices: [15] } } };
  const review = rulingReviewModel(puzzle, state, 15);
  assert.equal(review.actionLabel, "Complete Case");
  assert.equal(review.puzzleReasoning, "Verified final deduction.");
  assert.equal(reviewActionLabel(1, false), "Continue to Next Deduction");
  assert.equal(reviewActionLabel(16, true), "Close Review");
  assert.equal(boardCompletionAvailable(state), true);
  assert.equal(boardCompletionAvailable({ ...state, complete: true }), false);
  assert.ok(rulingReviewModel(puzzle, { ...state, complete: true }, 15), "completed evidence reviews remain available");
  const details = renderMoreCaseDetails(review);
  assert.match(details, /<details class="case-details">/);
  assert.match(details, /<summary>More Case Details<\/summary>/);
  assert.ok(details.includes(review.foundation));
  assert.ok(details.includes(review.paralegalTask));
  for (const rule of review.rules) assert.ok(details.includes(rule.url));
});

test("timer results distinguish an unused timer from elapsed play", () => {
  assert.equal(timerResultLabel({ timerUsed: false, elapsed: 0 }), "Timer off");
  assert.equal(timerResultLabel({ timerUsed: true, elapsed: 0 }), "00:00");
  assert.equal(timerResultLabel({ timerUsed: true, elapsed: 125 }), "02:05");
});

test("legal-reason normalization changes presentation without changing substance", () => {
  assert.equal(normalizeLegalReason("the signed writing supplied the terms"), "The signed writing supplied the terms.");
  assert.equal(normalizeLegalReason("Authentication remained disputed?"), "Authentication remained disputed?");
});

test("legacy saved progress is preserved and gains complete review reasoning", () => {
  const puzzle = PUZZLES[3];
  const established = Object.fromEntries(puzzle.path.slice(0, 7).map((index) => [index, puzzle.solution[index]]));
  const legacy = {
    established, revealed: puzzle.path.slice(0, 7), history: puzzle.path.slice(0, 7),
    reasoning: { [puzzle.path[0]]: ["Legacy clue text"] }, hints: 2, elapsed: 93
  };
  const migrated = migrateProgress(puzzle, legacy);
  assert.deepEqual(migrated.established, established);
  assert.deepEqual(migrated.history, legacy.history);
  assert.equal(migrated.hints, 2);
  assert.equal(migrated.elapsed, 93);
  assert.equal(migrated.opened, true);
  assert.equal(migrated.dataVersion, 4);
  assert.equal(migrated.timerUsed, true);
  for (const index of legacy.history) {
    assert.ok(migrated.reasoning[index].explanation);
    assert.ok(migrated.reasoning[index].requiredClues.length);
  }
});

test("lost completion state migrates to a visible board completion action", () => {
  const puzzle = PUZZLES[0];
  const established = Object.fromEntries(puzzle.solution.map((value, index) => [index, value]));
  const recovered = migrateProgress(puzzle, { established, history: puzzle.path, revealed: puzzle.path, elapsed: 0 });
  assert.equal(recovered.complete, false);
  assert.equal(boardCompletionAvailable(recovered), true);
  const completed = migrateProgress(puzzle, { established, history: puzzle.path, revealed: puzzle.path, complete: true });
  assert.equal(completed.complete, true);
  assert.equal(boardCompletionAvailable(completed), false);
});

for (const puzzle of PUZZLES) {
  test(`${puzzle.number}. ${puzzle.title} has one solution and a complete deduction path`, () => {
    const report = verifyPuzzle(puzzle);
    assert.equal(report.valid, true, report.reason);
    assert.equal(report.sequence.length, 16);
    const established = {};
    const revealed = [];
    for (const index of report.sequence) {
      const expected = puzzle.solution[index];
      const accepted = classifyAttempt(puzzle, established, revealed, index, expected);
      assert.equal(accepted.result, "accepted");
      assert.ok(accepted.explanation.endsWith(`${puzzle.characters[index].name}) must be ${expected ? "admitted" : "excluded"}.`));
      assert.ok(accepted.requiredClues.length >= 1);
      for (const clueText of accepted.requiredClues) assert.ok(accepted.explanation.includes(clueText));
      for (const supportIndex of accepted.supportIndices) {
        assert.notEqual(established[supportIndex], undefined, `${puzzle.title} explanation uses an unestablished ruling`);
        assert.ok(accepted.explanation.includes(puzzle.characters[supportIndex].name));
      }
      if (accepted.isCombined) {
        assert.ok(accepted.supportIndices.length || accepted.requiredClues.length > 1);
        assert.match(accepted.establishedText, /Established rulings used:/);
      }
      const hint = hintMessage(puzzle, { index, ...accepted });
      for (const clueText of accepted.requiredClues) assert.ok(hint.includes(clueText));
      for (const supportIndex of accepted.supportIndices) {
        assert.ok(hint.includes(puzzle.characters[supportIndex].name));
      }
      assert.equal(classifyAttempt(puzzle, established, revealed, index, 1 - expected).result, "contradiction");
      established[index] = expected;
      revealed.push(index);
      const reviewState = {
        established: { ...established }, complete: false,
        reasoning: { [index]: {
          explanation: accepted.explanation, requiredClues: accepted.requiredClues,
          supportIndices: accepted.supportIndices, highlightedIndices: accepted.highlightedIndices,
          establishedText: accepted.establishedText
        } }
      };
      const review = rulingReviewModel(puzzle, reviewState, index);
      assert.ok(review.puzzleReasoning);
      assert.ok(review.litigationExplanation);
      assert.ok(review.evidenceIssue);
      assert.ok(review.foundation);
      assert.ok(review.paralegalTask);
      assert.ok(review.rules.length);
    }
  });
}
