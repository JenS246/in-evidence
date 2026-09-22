export function reviewActionLabel(establishedCount, complete) {
  if (complete) return "Close Review";
  return establishedCount === 16 ? "Complete Case" : "Continue to Next Deduction";
}

export function hintMessage(puzzle, deduction) {
  const position = `${String.fromCharCode(65 + (deduction.index % 4))}${Math.floor(deduction.index / 4) + 1}`;
  const clueText = deduction.requiredClues.map((text) => `“${text}”`).join(" Also use: ");
  return `Look at ${puzzle.characters[deduction.index].name} in position ${position}. Use: ${clueText} ${deduction.establishedText}`;
}

export function rulingReviewModel(puzzle, state, index) {
  const person = puzzle.characters[index];
  const value = state.established[index];
  if (value === undefined) return null;
  const details = state.reasoning[index];
  return {
    index,
    ruling: value === 1 ? "ADMITTED" : "EXCLUDED",
    accessibleHeading: `Ruling Review: ${value === 1 ? "Admitted" : "Excluded"}`,
    puzzleReasoning: details?.explanation || "The visible clues established this ruling.",
    requiredClues: details?.requiredClues || [],
    supportIndices: details?.supportIndices || [],
    highlightedIndices: details?.highlightedIndices || [index],
    establishedText: details?.establishedText || "The visible record supplied the required information.",
    litigationExplanation: person.rulingExplanation,
    evidenceIssue: person.evidenceIssue,
    foundation: person.foundation,
    paralegalTask: person.paralegalTask,
    rules: person.rules,
    actionLabel: reviewActionLabel(Object.keys(state.established).length, state.complete)
  };
}
