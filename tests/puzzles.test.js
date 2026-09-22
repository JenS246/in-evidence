import test from "node:test";
import assert from "node:assert/strict";
import { PUZZLES } from "../src/puzzles.js";
import { classifyAttempt, deductionFor, verifyPuzzle } from "../src/logic.js";

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
      assert.ok(person.evidence);
      assert.ok(person.offeredToProve);
      assert.ok(person.evidenceIssue);
      assert.ok(person.foundation);
      assert.ok(person.rulingExplanation);
      assert.ok(person.paralegalTask);
      assert.ok(person.ruleReference);
      const url = new URL(person.ruleUrl);
      assert.equal(url.protocol, "https:");
      assert.equal(url.hostname, "www.pacodeandbulletin.gov");
    }
    for (const rule of puzzle.ruleCard.rules) {
      const url = new URL(rule.url);
      assert.equal(url.hostname, "www.pacodeandbulletin.gov");
    }
  }
});

test("challenging openings require the filed count and the newly revealed relation together", () => {
  for (const puzzle of PUZZLES.filter((item) => item.difficulty === "Challenging")) {
    const owner = puzzle.path[0];
    const target = puzzle.path[1];
    const established = { [owner]: puzzle.solution[owner] };
    assert.ok(deductionFor(puzzle, established, [owner], target), `${puzzle.title} should expose a combined deduction`);
    const withoutCount = { ...puzzle, initialClues: puzzle.initialClues.filter((clue) => clue.type !== "rowCount") };
    assert.equal(deductionFor(withoutCount, established, [owner], target), null, `${puzzle.title} should need the count clue`);
    const withoutRelation = { ...puzzle, cardClues: puzzle.cardClues.filter((clue) => !clue.requiresTwoClues) };
    assert.equal(deductionFor(withoutRelation, established, [owner], target), null, `${puzzle.title} should need the relation clue`);
  }
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
      assert.equal(classifyAttempt(puzzle, established, revealed, index, expected).result, "accepted");
      assert.equal(classifyAttempt(puzzle, established, revealed, index, 1 - expected).result, "contradiction");
      established[index] = expected;
      revealed.push(index);
    }
  });
}
