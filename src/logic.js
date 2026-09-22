export const ADMITTED = 1;
export const EXCLUDED = 0;

export function satisfies(bits, clue) {
  switch (clue.type) {
    case "fixed": return bits[clue.index] === clue.value;
    case "relation": return clue.relation === "same"
      ? bits[clue.a] === bits[clue.b]
      : bits[clue.a] !== bits[clue.b];
    case "rowCount": {
      const start = clue.row * 4;
      return bits.slice(start, start + 4).reduce((a, b) => a + b, 0) === clue.value;
    }
    case "colCount":
      return [0, 1, 2, 3].reduce((sum, row) => sum + bits[row * 4 + clue.col], 0) === clue.value;
    case "neighborCount":
      return neighbors(clue.index).reduce((sum, index) => sum + bits[index], 0) === clue.value;
    default: throw new Error(`Unknown clue type: ${clue.type}`);
  }
}

export function neighbors(index) {
  const row = Math.floor(index / 4);
  const col = index % 4;
  const result = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < 4 && c >= 0 && c < 4) result.push(r * 4 + c);
    }
  }
  return result;
}

export function activeClues(puzzle, revealedOwners = []) {
  const ownerSet = new Set(revealedOwners);
  return [
    ...puzzle.initialClues,
    ...puzzle.cardClues.filter((clue) => ownerSet.has(clue.owner))
  ];
}

export function enumerateSolutions(puzzle, established = {}, revealedOwners = []) {
  const clues = activeClues(puzzle, revealedOwners);
  const solutions = [];
  for (let mask = 0; mask < 65536; mask += 1) {
    const bits = Array.from({ length: 16 }, (_, i) => (mask >> i) & 1);
    let viable = true;
    for (const [index, value] of Object.entries(established)) {
      if (bits[Number(index)] !== value) { viable = false; break; }
    }
    if (viable && clues.every((clue) => satisfies(bits, clue))) solutions.push(bits);
  }
  return solutions;
}

export function deductionFor(puzzle, established, revealedOwners, index) {
  const solutions = enumerateSolutions(puzzle, established, revealedOwners);
  if (!solutions.length) return null;
  const value = solutions[0][index];
  if (!solutions.every((solution) => solution[index] === value)) return null;
  const clues = activeClues(puzzle, revealedOwners);
  const reasons = clues.filter((clue) => clue.targets?.includes(index));
  const reason = reasons[reasons.length - 1] || clues[clues.length - 1];
  return { value, reason, reasons: reasons.length ? reasons : [reason], possibilities: solutions.length };
}

export function classifyAttempt(puzzle, established, revealedOwners, index, value) {
  const deduction = deductionFor(puzzle, established, revealedOwners, index);
  if (!deduction) return { result: "unsupported" };
  return value === deduction.value
    ? { result: "accepted", ...deduction }
    : { result: "contradiction", ...deduction };
}

export function nextDeduction(puzzle, established, revealedOwners) {
  for (const index of puzzle.path) {
    if (established[index] !== undefined) continue;
    const deduction = deductionFor(puzzle, established, revealedOwners, index);
    if (deduction) return { index, ...deduction };
  }
  return null;
}

export function verifyPuzzle(puzzle) {
  const allOwners = puzzle.cardClues.map((clue) => clue.owner);
  const allSolutions = enumerateSolutions(puzzle, {}, allOwners);
  const expected = puzzle.solution.join("");
  if (allSolutions.length !== 1 || allSolutions[0].join("") !== expected) {
    return { valid: false, reason: `Expected one solution, found ${allSolutions.length}` };
  }
  const established = {};
  const revealed = [];
  const sequence = [];
  while (Object.keys(established).length < 16) {
    const next = nextDeduction(puzzle, established, revealed);
    if (!next) return { valid: false, reason: `Stalled after ${sequence.length} moves` };
    if (next.value !== puzzle.solution[next.index]) return { valid: false, reason: "Deduction differs from solution" };
    established[next.index] = next.value;
    revealed.push(next.index);
    sequence.push(next.index);
  }
  return { valid: true, sequence };
}
