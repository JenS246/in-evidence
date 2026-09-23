export function reviewActionLabel(establishedCount, complete) {
  if (complete) return "Close Review";
  return establishedCount === 16 ? "Complete Case" : "Continue to Next Deduction";
}

export function boardCompletionAvailable(state) {
  return Object.keys(state.established || {}).length === 16 && !state.complete;
}

export function timerResultLabel(state) {
  if (!state.timerUsed) return "Timer off";
  const seconds = Math.max(0, Number(state.elapsed) || 0);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function renderMoreCaseDetails(review) {
  const details = review.moreCaseDetails;
  return `<details class="case-details">
    <summary>${details.label}</summary>
    <dl class="case-detail-list"><div><dt>Foundation</dt><dd>${details.foundation}</dd></div></dl>
    <section class="paralegal-task"><small>PARALEGAL CONNECTION</small><p>${details.paralegalTask}</p></section>
    <section class="applicable-rules"><small>APPLICABLE PENNSYLVANIA ${details.rules.length === 1 ? "RULE" : "RULES"}</small><div>${details.rules.map((rule) => `<a href="${rule.url}" target="_blank" rel="noreferrer">${rule.label}<span class="sr-only"> opens official Pennsylvania Code in a new tab</span></a>`).join("")}</div></section>
  </details>`;
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
    supportPositions: (details?.supportIndices || []).map((supportIndex) => `${String.fromCharCode(65 + (supportIndex % 4))}${Math.floor(supportIndex / 4) + 1}`),
    moreCaseDetails: {
      label: "More Case Details",
      foundation: person.foundation,
      paralegalTask: person.paralegalTask,
      rules: person.rules
    },
    actionLabel: reviewActionLabel(Object.keys(state.established).length, state.complete)
  };
}
