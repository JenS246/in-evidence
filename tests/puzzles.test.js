import test from "node:test";
import assert from "node:assert/strict";
import { PUZZLES } from "../src/puzzles.js";
import { classifyAttempt, verifyPuzzle } from "../src/logic.js";

test("launch collection contains ten complete handcrafted cases", () => {
  assert.equal(PUZZLES.length, 10);
  assert.equal(PUZZLES.filter((p) => p.difficulty === "Introductory").length, 3);
  assert.equal(PUZZLES.filter((p) => p.difficulty === "Standard").length, 4);
  assert.equal(PUZZLES.filter((p) => p.difficulty === "Challenging").length, 3);
  for (const puzzle of PUZZLES) {
    assert.equal(puzzle.characters.length, 16);
    assert.equal(new Set(puzzle.characters.map((c) => c.name)).size, 16);
    assert.equal(puzzle.solution.length, 16);
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
