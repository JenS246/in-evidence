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

export function positionLabel(index) {
  return `${String.fromCharCode(65 + (index % 4))}${Math.floor(index / 4) + 1}`;
}

function rulingWord(value) {
  return value === ADMITTED ? "admitted" : "excluded";
}

function joinStatements(statements) {
  if (statements.length <= 1) return statements[0] || "";
  if (statements.length === 2) return `${statements[0]}, while ${statements[1]}`;
  return `${statements.slice(0, -1).join(", ")}, while ${statements.at(-1)}`;
}

function establishedSummary(puzzle, established, indices) {
  const admitted = indices.filter((index) => established[index] === ADMITTED);
  const excluded = indices.filter((index) => established[index] === EXCLUDED);
  const describe = (group, value) => {
    if (!group.length) return "";
    const labels = group.map((index) => `${positionLabel(index)} (${puzzle.characters[index].name})`);
    const subject = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
    return `${subject} ${labels.length === 1 ? "is" : "are"} already ${rulingWord(value)}`;
  };
  return joinStatements([describe(admitted, ADMITTED), describe(excluded, EXCLUDED)].filter(Boolean));
}

function supportForClue(clue, target) {
  if (Array.isArray(clue.supportIndices)) return clue.supportIndices.filter((index) => index !== target);
  if (clue.type === "relation") return [clue.a === target ? clue.b : clue.a];
  if (clue.type === "rowCount") return [0, 1, 2, 3].map((col) => clue.row * 4 + col).filter((index) => index !== target);
  if (clue.type === "colCount") return [0, 1, 2, 3].map((row) => row * 4 + clue.col).filter((index) => index !== target);
  if (clue.type === "neighborCount") return neighbors(clue.index).filter((index) => index !== target);
  return [];
}

export function deductionDetails(puzzle, established, index, value, reasons) {
  const usableReasons = reasons.filter(Boolean);
  const supportIndices = [...new Set(usableReasons.flatMap((clue) => supportForClue(clue, index)))]
    .filter((supportIndex) => established[supportIndex] !== undefined);
  const clauses = usableReasons.map((clue) => {
    if (clue.type === "fixed") return clue.text;
    const supports = supportForClue(clue, index).filter((supportIndex) => established[supportIndex] !== undefined);
    const known = establishedSummary(puzzle, established, supports);
    return known ? `${clue.text} ${known}.` : clue.text;
  });
  const target = `${positionLabel(index)} (${puzzle.characters[index].name})`;
  const conclusion = `Therefore, ${target} must be ${rulingWord(value)}.`;
  const establishedText = supportIndices.length
    ? `Established rulings used: ${establishedSummary(puzzle, established, supportIndices)}.`
    : "No earlier ruling is needed for this direct clue.";
  return {
    explanation: [...clauses, conclusion].join(" "),
    requiredClues: usableReasons.map((clue) => clue.text),
    supportIndices,
    highlightedIndices: [...new Set([index, ...supportIndices])],
    establishedText,
    isCombined: usableReasons.length > 1 || supportIndices.length > 0
  };
}

export function deductionFor(puzzle, established, revealedOwners, index) {
  const solutions = enumerateSolutions(puzzle, established, revealedOwners);
  if (!solutions.length) return null;
  const value = solutions[0][index];
  if (!solutions.every((solution) => solution[index] === value)) return null;
  const clues = activeClues(puzzle, revealedOwners);
  const reasons = clues.filter((clue) => clue.targets?.includes(index));
  const reason = reasons[reasons.length - 1] || clues[clues.length - 1];
  const requiredReasons = reasons.length ? reasons : [reason];
  return {
    value, reason, reasons: requiredReasons, possibilities: solutions.length,
    ...deductionDetails(puzzle, established, index, value, requiredReasons)
  };
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
