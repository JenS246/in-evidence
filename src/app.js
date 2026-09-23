import { PUZZLES } from "./puzzles.js";
import { ADMITTED, EXCLUDED, classifyAttempt, nextDeduction, positionLabel } from "./logic.js";
import { freshProgressState, migrateProgress } from "./progress.js";
import { boardCompletionAvailable, hintMessage, renderMoreCaseDetails, rulingReviewModel, timerResultLabel } from "./review.js";

const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = "in-evidence-progress-v1";
let puzzleIndex = Math.max(0, Math.min(PUZZLES.length - 1, Number(localStorage.getItem("in-evidence-active") || 0)));
let timerInterval;
let toastTimer;
let reviewReturnIndex = null;
let reviewSupportIndices = [];
let showFirstReviewNote = false;

function loadAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

let allProgress = loadAll();

let state = migrateProgress(PUZZLES[puzzleIndex], allProgress[PUZZLES[puzzleIndex].slug]);

function save() {
  if (state.timerOn && state.startedAt) state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  allProgress[PUZZLES[puzzleIndex].slug] = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
  localStorage.setItem("in-evidence-active", String(puzzleIndex));
}

function current() { return PUZZLES[puzzleIndex]; }
function statusName(value) { return value === ADMITTED ? "ADMITTED" : "EXCLUDED"; }
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }

function startClock() {
  clearInterval(timerInterval);
  if (!state.timerOn) return;
  if (!state.startedAt) state.startedAt = Date.now() - state.elapsed * 1000;
  timerInterval = setInterval(() => {
    state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    $("#timerLabel").textContent = formatTime(state.elapsed);
  }, 1000);
}

function portraitStyle(art) {
  const col = art % 4;
  const row = Math.floor(art / 4);
  return `--portrait-x:${col * 100 / 3}%;--portrait-y:${row * 100 / 3}%`;
}

function evidenceGlyph(type) {
  return ({ transcript: "T", receipt: "R", photograph: "P", recording: "▶", spreadsheet: "#", map: "M", email: "@", object: "◇", note: "N", contract: "§", voicemail: "V", text: "…", plan: "⌑" })[type] || "E";
}

function render() {
  const puzzle = current();
  const count = Object.keys(state.established).length;
  $("#caseMeta").textContent = `CASE ${String(puzzle.number).padStart(2, "0")} / ${puzzle.difficulty}`;
  $("#puzzleTitle").textContent = puzzle.title;
  $("#caseSummary").textContent = puzzle.summary;
  $("#caseIssues").innerHTML = `<div><dt>Disputed issue</dt><dd>${puzzle.disputedIssue}</dd></div><div><dt>Evidence focus</dt><dd>${puzzle.evidenceFocus}</dd></div>`;
  $("#progressText").textContent = `${count} of 16 rulings established`;
  $("#timerToggle").setAttribute("aria-pressed", String(state.timerOn));
  $("#timerLabel").textContent = state.timerOn ? formatTime(state.elapsed) : "Timer off";
  $("#undoButton").disabled = !state.history.length;
  $("#caseReady").hidden = !boardCompletionAvailable(state);
  $("#ruleCard").innerHTML = puzzle.ruleCard ? `<article class="rule-card">
    <strong>${puzzle.ruleCard.title}</strong>
    <p>${puzzle.ruleCard.plain}</p><p><b>Simplified for this case:</b> ${puzzle.ruleCard.simplified}</p>
    <div class="rule-links">${puzzle.ruleCard.rules.map((rule) => `<a href="${rule.url}" target="_blank" rel="noreferrer">${rule.label}<span class="sr-only"> opens official Pennsylvania Code in a new tab</span></a>`).join("")}</div>
  </article>` : "";

  $("#clueList").innerHTML = [...puzzle.initialClues, ...puzzle.cardClues.filter((clue) => state.revealed.includes(clue.owner))]
    .map((clue, i) => `<article class="clue-paper ${state.dimmed.includes(clue.id) ? "is-dimmed" : ""}">
      <button class="clue-toggle" data-clue="${clue.id}" aria-pressed="${state.dimmed.includes(clue.id)}" aria-label="${state.dimmed.includes(clue.id) ? "Restore" : "Dim"} clue ${i + 1}">
        <span class="clue-number">${String(i + 1).padStart(2, "0")}</span><span>${clue.text}</span>
      </button>
    </article>`).join("");

  $("#board").innerHTML = puzzle.characters.map((person, index) => {
    const value = state.established[index];
    const decided = value !== undefined;
    const isReviewTarget = reviewReturnIndex === index;
    const isReviewSupport = reviewSupportIndices.includes(index) && !isReviewTarget;
    const reviewDescription = isReviewTarget ? ", ruling under review" : isReviewSupport ? ", supporting position in the open Ruling Review" : "";
    return `<article class="person-card ${decided ? "is-decided" : ""} ${isReviewTarget ? "is-review-target" : ""} ${isReviewSupport ? "is-review-support" : ""}" data-index="${index}">
      <button class="person-open" data-open="${index}" aria-label="Open ${person.name}, ${person.role}, evidence: ${person.evidence}${reviewDescription}">
        <span class="portrait" style="${portraitStyle(person.art)}" role="img" aria-label="Illustration of ${person.name}"></span>
        <span class="card-position">${String.fromCharCode(65 + index % 4)}${Math.floor(index / 4) + 1}</span>
        ${decided ? `<span class="status-stamp status-${value}" aria-label="${statusName(value)}"><b>${value ? "✓" : "×"}</b>${statusName(value)}</span>` : ""}
      </button>
      <div class="person-copy"><strong>${person.name}</strong><span>${person.role}</span></div>
      <div class="evidence-tag"><b aria-hidden="true">${evidenceGlyph(person.evidenceType)}</b><span>${person.evidence}</span></div>
      <div class="ruling-buttons" aria-label="Ruling for ${person.name}">
        <button data-ruling="1" data-index="${index}" ${decided ? "disabled" : ""} aria-label="Mark ${person.name}'s evidence admitted"><span aria-hidden="true">✓</span><em>Admit</em></button>
        <button data-ruling="0" data-index="${index}" ${decided ? "disabled" : ""} aria-label="Mark ${person.name}'s evidence excluded"><span aria-hidden="true">×</span><em>Exclude</em></button>
      </div>
      <div class="card-clue ${state.revealed.includes(index) ? "is-revealed" : ""}">${state.revealed.includes(index) ? (puzzle.cardClues.find((clue) => clue.owner === index)?.text || "The record is complete.") : "Clue sealed"}</div>
    </article>`;
  }).join("");

  renderArchive();
}

function renderArchive() {
  $("#archiveList").innerHTML = PUZZLES.map((puzzle, index) => {
    const progress = allProgress[puzzle.slug];
    const solved = progress?.complete;
    const count = Object.keys(progress?.established || {}).length;
    const opened = Boolean(progress?.opened || solved || count);
    return `<button class="archive-case ${index === puzzleIndex ? "is-current" : ""}" data-case="${index}">
      <span class="archive-number">${String(puzzle.number).padStart(2, "0")}</span>
      <span><strong>${puzzle.title}${opened ? "" : `<em>New</em>`}</strong><small>${puzzle.evidenceFocus}</small><small>${puzzle.difficulty} / About ${puzzle.estimatedMinutes} minutes / ${solved ? "Record complete" : `${count} of 16 complete`}</small></span>
      <b aria-hidden="true">${solved ? "✓" : "→"}</b>
    </button>`;
  }).join("");
}

function announce(message, tone = "neutral") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 4200);
}

function makeRuling(index, value) {
  if (state.established[index] !== undefined) return;
  const puzzle = current();
  const outcome = classifyAttempt(puzzle, state.established, state.revealed, index, value);
  if (outcome.result === "unsupported") {
    announce("The record does not establish that yet. Review the clues currently on the docket.");
    return;
  }
  if (outcome.result === "contradiction") {
    announce(`That conflicts with: “${outcome.requiredClues[0]}” Try the other ruling.`, "contradiction");
    return;
  }
  state.established[index] = value;
  state.revealed.push(index);
  state.history.push(index);
  state.reasoning[index] = {
    explanation: outcome.explanation,
    requiredClues: outcome.requiredClues,
    supportIndices: outcome.supportIndices,
    highlightedIndices: outcome.highlightedIndices,
    establishedText: outcome.establishedText,
    isCombined: outcome.isCombined
  };
  showFirstReviewNote = !localStorage.getItem("in-evidence-review-intro-seen");
  if (showFirstReviewNote) localStorage.setItem("in-evidence-review-intro-seen", "1");
  announce(`${statusName(value)}. The visible clues establish this ruling.`, "accepted");
  if (state.timerOn && !state.startedAt) state.startedAt = Date.now();
  save();
  openEvidence(index);
}

function openEvidence(index) {
  const puzzle = current();
  const person = puzzle.characters[index];
  const value = state.established[index];
  const review = rulingReviewModel(puzzle, state, index);
  reviewReturnIndex = index;
  reviewSupportIndices = review?.supportIndices || [];
  render();
  const supportingText = review?.supportPositions.length
    ? `Uses ${review.supportPositions.length === 1 ? review.supportPositions[0] : `${review.supportPositions.slice(0, -1).join(", ")} and ${review.supportPositions.at(-1)}`}`
    : "";
  $("#evidenceDetail").innerHTML = `
    <div class="detail-top">
      <div class="detail-portrait portrait" style="${portraitStyle(person.art)}" role="img" aria-label="Illustration of ${person.name}"></div>
      <div><p class="dialog-label">POSITION ${positionLabel(index)}</p><h2 id="evidenceName" tabindex="-1">${person.name}</h2><p>${person.role}</p><div class="detail-evidence"><b>${evidenceGlyph(person.evidenceType)}</b><span>Potential evidence<strong>${person.evidence}</strong></span></div></div>
    </div>
    <section class="offer-panel"><small>OFFERED TO PROVE</small><p>${person.offeredToProve}</p></section>
    ${value === undefined ? `<div class="detail-question"><p><strong>Question to consider:</strong> ${person.questionToConsider}</p><h3>What do the visible logic clues establish?</h3><div class="detail-actions"><button data-modal-ruling="1" data-index="${index}"><span>✓</span>ADMITTED</button><button data-modal-ruling="0" data-index="${index}"><span>×</span>EXCLUDED</button></div></div>` : `
      <section class="review-heading" aria-labelledby="reviewHeading"><p class="dialog-label">RULING REVIEW</p><h3 id="reviewHeading" tabindex="-1">${review.accessibleHeading}</h3>${showFirstReviewNote ? `<p class="first-review-note">Your deduction opened the legal explanation.</p>` : ""}</section>
      <div class="detail-ruling status-${value}"><span>${value ? "✓" : "×"}</span><strong>${statusName(value)}</strong></div>
      <div class="learning-sections">
        <section><small>PUZZLE REASONING</small><p>${review.puzzleReasoning}</p>${supportingText ? `<p class="supporting-positions">${supportingText}</p>` : ""}</section>
        <section class="litigation-note"><small>CIVIL LITIGATION EXPLANATION</small><p>${review.litigationExplanation}</p><p class="evidence-issue"><strong>Evidence issue:</strong> ${review.evidenceIssue}</p></section>
        ${renderMoreCaseDetails(review)}
      </div>
      <div class="review-actions"><button class="primary" data-continue-review="${review.actionLabel === "Complete Case" ? "complete" : "close"}">${review.actionLabel}</button></div>`}
    ${value === undefined ? `<div class="detail-clue"><small>SEALED LOGIC CLUE</small><p>Establish this ruling to add the next logic clue to the docket.</p></div>` : ""}`;
  const dialog = $("#evidenceDialog");
  dialog.setAttribute("aria-labelledby", value === undefined ? "evidenceName" : "reviewHeading");
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => $(value === undefined ? "#evidenceName" : "#reviewHeading")?.focus());
}

function finishPuzzle() {
  if (!boardCompletionAvailable(state)) return;
  if (state.timerOn && state.startedAt) state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  state.complete = true;
  state.timerOn = false;
  state.startedAt = null;
  clearInterval(timerInterval);
  save();
  render();
  const puzzle = current();
  const timeLabel = timerResultLabel(state);
  const admitted = puzzle.solution.reduce((sum, value) => sum + value, 0);
  const excluded = 16 - admitted;
  $("#completionContent").innerHTML = `
    <p class="dialog-label">CASE ${String(puzzle.number).padStart(2, "0")} CLOSED</p>
    <h2>The record is complete.</h2>
    <p>The court admitted ${admitted} items and excluded ${excluded}. Every ruling followed from the visible logic record.</p>
    <div class="case-debrief">
      <section><small>DISPUTED ISSUE</small><p>${puzzle.disputedIssue}</p></section>
      <section><small>PRINCIPAL RULES</small><p>${puzzle.ruleCard.rules.map((rule) => rule.label).join(" and ")}</p></section>
      <section><small>WHAT MATTERED</small><p>${puzzle.debrief}</p><ul>${puzzle.examples.map((index) => `<li><strong>${puzzle.characters[index].evidence}:</strong> ${puzzle.characters[index].rulingExplanation}</li>`).join("")}</ul></section>
      <section><small>PARALEGAL PRACTICE</small><p>${puzzle.paralegalPractice}</p></section>
      <section class="reflection"><small>DISCUSS OR WRITE</small><p>${puzzle.discussionQuestion}</p></section>
    </div>
    <div class="classroom-actions"><button id="copyQuestionButton">Copy discussion question</button><button id="printDebriefButton">Print case debrief</button></div>
    <div class="completion-stats"><span><small>TIME</small><strong>${timeLabel}</strong></span><span><small>HINTS</small><strong>${state.hints}</strong></span></div>
    <div class="share-result"><code>IN EVIDENCE #${puzzle.number}<br>${["🟦🟨🟥🟦", "🟨🟥🟦🟨", "🟥🟦🟨🟥"][puzzle.number % 3]}<br>${state.hints} hint${state.hints === 1 ? "" : "s"} / ${timeLabel}</code><button id="shareButton">Copy result</button></div>
    <div class="completion-actions"><button id="replayButton">Replay</button><button class="primary" id="nextButton">Next case</button></div>`;
  if ($("#evidenceDialog").open) $("#evidenceDialog").close();
  $("#completionDialog").showModal();
  $("#shareButton").addEventListener("click", async () => {
    const text = $(".share-result code").innerText;
    if (await copyText(text)) announce("Share result copied.", "accepted");
    else announce("Select the result text to copy it.");
  });
  $("#copyQuestionButton").addEventListener("click", async () => {
    if (await copyText(puzzle.discussionQuestion)) announce("Discussion question copied.", "accepted");
    else announce("Select the discussion question to copy it.");
  });
  $("#printDebriefButton").addEventListener("click", () => {
    $("#printDebrief").innerHTML = `
      <h1>${puzzle.title}</h1>
      <section><h2>Civil claim</h2><p>${puzzle.claim}</p></section>
      <section><h2>Disputed issue</h2><p>${puzzle.disputedIssue}</p></section>
      <section><h2>Evidence focus</h2><p>${puzzle.evidenceFocus}</p></section>
      <section><h2>Principal rules</h2><p>${puzzle.ruleCard.rules.map((rule) => rule.label).join(" and ")}</p></section>
      <section><h2>Featured evidence examples</h2><ul>${puzzle.examples.map((index) => `<li><strong>${puzzle.characters[index].evidence}</strong> (${puzzle.characters[index].role}): ${puzzle.characters[index].rulingExplanation}</li>`).join("")}</ul></section>
      <section><h2>Paralegal Practice</h2><p>${puzzle.paralegalPractice}</p></section>
      <section><h2>Discussion question</h2><p>${puzzle.discussionQuestion}</p></section>`;
    window.print();
  });
  $("#replayButton").addEventListener("click", () => { $("#completionDialog").close(); resetPuzzle(); });
  $("#nextButton").addEventListener("click", () => { $("#completionDialog").close(); choosePuzzle((puzzleIndex + 1) % PUZZLES.length); });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const priorFocus = document.activeElement;
    const copyField = document.createElement("textarea");
    copyField.value = text;
    copyField.setAttribute("readonly", "");
    copyField.style.cssText = "position:fixed;inset:auto auto 0 -9999px";
    document.body.append(copyField);
    copyField.select();
    const copied = document.execCommand("copy");
    copyField.remove();
    priorFocus?.focus();
    return copied;
  }
}

function undo() {
  const index = state.history.pop();
  if (index === undefined) return;
  delete state.established[index];
  delete state.reasoning[index];
  const position = state.revealed.lastIndexOf(index);
  if (position >= 0) state.revealed.splice(position, 1);
  state.complete = false;
  reviewReturnIndex = null;
  reviewSupportIndices = [];
  save(); render();
  announce(`${current().characters[index].name}'s ruling returned to the record.`);
}

function resetPuzzle() {
  state = freshProgressState();
  state.opened = true;
  reviewReturnIndex = null;
  reviewSupportIndices = [];
  save(); startClock(); render();
  announce("The case file has been reset.");
}

function hint() {
  const next = nextDeduction(current(), state.established, state.revealed);
  if (!next) return;
  state.hints += 1;
  save(); render();
  announce(hintMessage(current(), next));
}

function choosePuzzle(index) {
  save();
  puzzleIndex = index;
  state = migrateProgress(current(), allProgress[current().slug]);
  state.opened = true;
  reviewReturnIndex = null;
  reviewSupportIndices = [];
  $("#archiveDialog").close();
  save(); startClock(); render();
  window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

document.addEventListener("click", (event) => {
  const ruling = event.target.closest("[data-ruling]");
  if (ruling) return makeRuling(Number(ruling.dataset.index), Number(ruling.dataset.ruling));
  const modalRuling = event.target.closest("[data-modal-ruling]");
  if (modalRuling) return makeRuling(Number(modalRuling.dataset.index), Number(modalRuling.dataset.modalRuling));
  const reviewButton = event.target.closest("[data-continue-review]");
  if (reviewButton) {
    const completeCase = reviewButton.dataset.continueReview === "complete";
    $("#evidenceDialog").close();
    if (completeCase) finishPuzzle();
    return;
  }
  const opener = event.target.closest("[data-open]");
  if (opener) return openEvidence(Number(opener.dataset.open));
  const clue = event.target.closest("[data-clue]");
  if (clue) {
    const id = clue.dataset.clue;
    state.dimmed = state.dimmed.includes(id) ? state.dimmed.filter((item) => item !== id) : [...state.dimmed, id];
    save(); render(); return;
  }
  const caseButton = event.target.closest("[data-case]");
  if (caseButton) return choosePuzzle(Number(caseButton.dataset.case));
  const closer = event.target.closest("[data-close]");
  if (closer) return $(`#${closer.dataset.close}`).close();
});

$("#undoButton").addEventListener("click", undo);
$("#hintButton").addEventListener("click", hint);
$("#resetButton").addEventListener("click", () => { if (confirm("Reset every ruling in this case?")) resetPuzzle(); });
$("#completeCaseButton").addEventListener("click", finishPuzzle);
$("#archiveButton").addEventListener("click", () => $("#archiveDialog").showModal());
$("#homeButton").addEventListener("click", () => $("#archiveDialog").showModal());
$("#helpButton").addEventListener("click", () => $("#helpDialog").showModal());
$("#timerToggle").addEventListener("click", () => {
  if (state.timerOn && state.startedAt) state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  state.timerOn = !state.timerOn;
  if (state.timerOn) state.timerUsed = true;
  state.startedAt = state.timerOn ? Date.now() - state.elapsed * 1000 : null;
  save(); startClock(); render();
});
for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("click", (event) => { if (event.target === dialog && dialog.id !== "completionDialog") dialog.close(); });
}

$("#evidenceDialog").addEventListener("close", () => {
  const returnIndex = reviewReturnIndex;
  reviewReturnIndex = null;
  reviewSupportIndices = [];
  showFirstReviewNote = false;
  render();
  if (returnIndex !== null) requestAnimationFrame(() => document.querySelector(`[data-open="${returnIndex}"]`)?.focus());
});

state.opened = true;
save(); render(); startClock();
if (!localStorage.getItem("in-evidence-seen-help")) {
  localStorage.setItem("in-evidence-seen-help", "1");
  $("#helpDialog").showModal();
}
