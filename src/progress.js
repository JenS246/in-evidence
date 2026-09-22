import { deductionFor, positionLabel } from "./logic.js";

export function freshProgressState() {
  return { established: {}, revealed: [], history: [], reasoning: {}, hints: 0, dimmed: [], timerOn: false, elapsed: 0, startedAt: null, complete: false, opened: false, dataVersion: 3 };
}

export function migrateProgress(puzzle, saved = {}) {
  const next = { ...freshProgressState(), ...saved };
  const entries = Object.entries(next.established || {});
  if (entries.some(([index, value]) => puzzle.solution[Number(index)] !== value)) return freshProgressState();
  next.revealed = [...new Set((next.revealed || []).filter((index) => Number.isInteger(index) && index >= 0 && index < 16))];
  next.history = (next.history || []).filter((index) => next.established[index] !== undefined);
  const migratedReasoning = {};
  const migrationOrder = [...new Set([...next.history, ...puzzle.path.filter((index) => next.established[index] !== undefined)])];
  const establishedBefore = {};
  const revealedBefore = [];
  for (const index of migrationOrder) {
    const value = next.established[index];
    const deduction = deductionFor(puzzle, establishedBefore, revealedBefore, index);
    migratedReasoning[index] = deduction ? {
      explanation: deduction.explanation,
      requiredClues: deduction.requiredClues,
      supportIndices: deduction.supportIndices,
      highlightedIndices: deduction.highlightedIndices,
      establishedText: deduction.establishedText,
      isCombined: deduction.isCombined
    } : {
      explanation: `The visible record established that ${positionLabel(index)} must be ${value ? "admitted" : "excluded"}.`,
      requiredClues: [], supportIndices: [], highlightedIndices: [index],
      establishedText: "The visible record supplied the required information.", isCombined: false
    };
    establishedBefore[index] = value;
    revealedBefore.push(index);
  }
  next.reasoning = migratedReasoning;
  next.opened = saved.opened ?? (entries.length > 0 || Boolean(saved.complete));
  next.dataVersion = 3;
  return next;
}
