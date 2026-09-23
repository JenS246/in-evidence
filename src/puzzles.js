import { CASE_INSTRUCTION } from "./instructional-data.js";
import { neighbors } from "./logic.js";

const CAST = [
  ["Mina", "court reporter"], ["Theo", "delivery driver"], ["Odette", "neighbor"],
  ["Calvin", "building manager"], ["Hiro", "accountant"], ["Marisol", "dog walker"],
  ["Priya", "paralegal"], ["Bennett", "mechanic"], ["Yuki", "shop owner"],
  ["Elias", "photographer"], ["Nora", "records clerk"], ["Samira", "contractor"],
  ["Imani", "nurse"], ["Arthur", "teacher"], ["Mei", "architect"], ["Luis", "cafe owner"]
];

const CASES = [
  { slug: "blue-tile", title: "The Blue Tile Mix-Up", difficulty: "Introductory", summary: "A hallway renovation left the Vale Apartments with blue tile instead of green. The contractor and building manager disagree about when the change was approved.", solution: "1011001010010110", shift: 0, mode: "row" },
  { slug: "garden-goose", title: "The Giant Garden Goose", difficulty: "Introductory", summary: "A twelve-foot floral goose appeared between two neighboring gardens before the spring tour. Both households say the display was promised to them.", solution: "0110100111001001", shift: 5, mode: "col" },
  { slug: "wandering-clock", title: "The Wandering Clock", difficulty: "Introductory", summary: "An ornate clock was sold twice during a community attic sale. The buyers want the court to untangle the timing without stopping the clock.", solution: "1100101001110001", shift: 9, mode: "row" },
  { slug: "lantern-festival", title: "Lanterns After Lunch", difficulty: "Standard", summary: "Rain canceled the Riverbend lantern festival after lunch, but the catering invoice had already arrived. The organizers dispute which cancellation terms were actually confirmed.", solution: "0101110001011010", shift: 2, mode: "col" },
  { slug: "parade-balloon", title: "The Runaway Pear", difficulty: "Standard", summary: "A pear-shaped parade balloon drifted into a rooftop greenhouse during a rehearsal. The parade committee and greenhouse owner disagree about the repair bill.", solution: "1001011010100101", shift: 12, mode: "row" },
  { slug: "mosaic-bench", title: "Bench in Pieces", difficulty: "Standard", summary: "A mosaic bench commissioned for the library plaza arrived in six separate sections. The artist says the segmented design was approved; the library says it expected one piece.", solution: "0011100101101001", shift: 7, mode: "col" },
  { slug: "violet-awning", title: "The Violet Awning", difficulty: "Standard", summary: "A cafe awning was installed in vivid violet just before the neighborhood design walk. The owner and fabricator disagree about the final color selection.", solution: "1010011100101100", shift: 14, mode: "row" },
  { slug: "paper-moon", title: "A Moon on Loan", difficulty: "Challenging", summary: "A silver paper moon vanished from a school theater and reappeared in a bookstore window. Each group says it had permission to keep the prop through autumn.", solution: "0111010010101100", shift: 3, mode: "col" },
  { slug: "rooftop-bees", title: "The Rooftop Bee Hotel", difficulty: "Challenging", summary: "A decorative bee hotel was moved from one rooftop garden to another during building repairs. The tenants dispute whether the move was temporary or permanent.", solution: "1101000110110010", shift: 10, mode: "row" },
  { slug: "brass-octopus", title: "The Brass Octopus", difficulty: "Challenging", summary: "A brass octopus centerpiece was promised to both a seafood cafe and a maritime club. The disagreement turns on a trail of messages, sketches, and pickup times.", solution: "0010111011000101", shift: 6, mode: "col" }
];

function positionLabel(index) {
  return `${String.fromCharCode(65 + (index % 4))}${Math.floor(index / 4) + 1}`;
}

function orderFor(mode) {
  if (mode === "col") return Array.from({ length: 16 }, (_, i) => (i % 4) * 4 + Math.floor(i / 4));
  return Array.from({ length: 16 }, (_, i) => i);
}

function arrange(shift, items, solution) {
  return Array.from({ length: 16 }, (_, i) => {
    const art = (i + shift) % 16;
    const [name, defaultRole] = CAST[art];
    const item = items[i];
    return {
      name, role: item.caseRole || defaultRole, art, ...item,
      rulingExplanation: normalizeLegalReason(item.legalReason)
    };
  });
}

export function normalizeLegalReason(reason) {
  const trimmed = reason.trim();
  const sentence = `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function relationText(a, b, relation, characters) {
  const first = characters[a].name;
  const second = characters[b].name;
  const delta = b - a;
  const spatial = delta === 1 && Math.floor(a / 4) === Math.floor(b / 4)
    ? `${second}, directly beside ${first}`
    : delta === 4 ? `${second}, directly below ${first}`
      : `${first} and ${second}`;
  if (relation === "same") return spatial.includes(" and ")
    ? `${spatial} received the same ruling.`
    : `${spatial}, received the same ruling as ${first}.`;
  return `Of ${first} and ${second}, exactly one item was admitted.`;
}

function buildPuzzle(spec, number) {
  const instruction = CASE_INSTRUCTION.find((item) => item.slug === spec.slug);
  const solution = [...spec.solution].map(Number);
  const characters = arrange(spec.shift, instruction.items, solution);
  const path = orderFor(spec.mode);
  const initialClues = [{
    id: `${spec.slug}-filed`, type: "fixed", index: path[0], value: solution[path[0]], targets: [path[0]],
    text: `The clerk's opening note establishes that ${characters[path[0]].name}'s evidence was ${solution[path[0]] ? "admitted" : "excluded"}.`,
    label: "Filed with the case"
  }];
  const cardClues = [];

  for (let step = 0; step < 15; step += 1) {
    const owner = path[step];
    const target = path[step + 1];
    const countSteps = new Set([2, 6, 10, 14]);
    const neighborSteps = new Set(spec.difficulty === "Introductory" ? [] : [4, 12]);
    const relationSteps = new Set(spec.difficulty === "Introductory" ? [1, 4, 7, 10, 13] : spec.difficulty === "Standard" ? [8] : [1, 8, 13]);
    const clueKind = countSteps.has(step) && spec.difficulty !== "Introductory" ? "count"
      : neighborSteps.has(step) ? "neighbor"
        : relationSteps.has(step) ? "relation" : "fixed";

    if (clueKind === "count") {
      const group = Math.floor((step + 1) / 4);
      const value = spec.mode === "row"
        ? solution.slice(group * 4, group * 4 + 4).reduce((a, b) => a + b, 0)
        : [0, 1, 2, 3].reduce((sum, row) => sum + solution[row * 4 + group], 0);
      const label = spec.mode === "row" ? `Row ${group + 1}` : `Column ${String.fromCharCode(65 + group)}`;
      const supportIndices = spec.mode === "row"
        ? [0, 1, 2, 3].map((col) => group * 4 + col).filter((index) => index !== target)
        : [0, 1, 2, 3].map((row) => row * 4 + group).filter((index) => index !== target);
      cardClues.push({
        id: `${spec.slug}-count-${step}`, owner, type: spec.mode === "row" ? "rowCount" : "colCount",
        ...(spec.mode === "row" ? { row: group } : { col: group }), value, targets: [target], supportIndices, combined: true,
        text: `${label} contains exactly ${value} admitted ${value === 1 ? "item" : "items"}.`, label: `Revealed by ${characters[owner].name}`
      });
    } else if (clueKind === "neighbor") {
      const establishedBeforeTarget = new Set(path.slice(0, step + 1));
      const anchor = Array.from({ length: 16 }, (_, index) => index).find((index) =>
        neighbors(index).includes(target) && neighbors(index).every((neighbor) => neighbor === target || establishedBeforeTarget.has(neighbor))
      );
      const adjacent = neighbors(anchor);
      const value = adjacent.reduce((sum, index) => sum + solution[index], 0);
      cardClues.push({
        id: `${spec.slug}-neighbors-${step}`, owner, type: "neighborCount", index: anchor, value, targets: [target],
        supportIndices: adjacent.filter((index) => index !== target), combined: true,
        text: `Exactly ${value} of the positions neighboring ${positionLabel(anchor)} have admitted evidence.`, label: `Revealed by ${characters[owner].name}`
      });
    } else if (clueKind === "relation") {
      const relation = solution[owner] === solution[target] ? "same" : "opposite";
      cardClues.push({
        id: `${spec.slug}-link-${step}`, owner, type: "relation", a: owner, b: target, relation, targets: [target], supportIndices: [owner], combined: false,
        text: relationText(owner, target, relation, characters), label: `Revealed by ${characters[owner].name}`
      });
    } else {
      cardClues.push({
        id: `${spec.slug}-direct-${step}`, owner, type: "fixed", index: target, value: solution[target], targets: [target], supportIndices: [], combined: false,
        text: `The revealed file note establishes that ${characters[target].name}'s evidence was ${solution[target] ? "admitted" : "excluded"}.`,
        label: `Revealed by ${characters[owner].name}`
      });
    }
  }
  cardClues.push({
    id: `${spec.slug}-closing`, owner: path[15], type: "fixed", index: path[15], value: solution[path[15]], targets: [path[15]],
    text: `The final notation confirms the ruling at ${positionLabel(path[15])}.`, label: "Closing notation", closing: true
  });
  return {
    ...spec,
    ...instruction,
    ruleCard: { timing: "initial", ...instruction.ruleCard },
    summary: instruction.claim,
    estimatedMinutes: spec.difficulty === "Introductory" ? 8 : spec.difficulty === "Standard" ? 12 : 16,
    number, characters, solution, path, initialClues, cardClues
  };
}

export const PUZZLES = CASES.map((spec, index) => buildPuzzle(spec, index + 1));
