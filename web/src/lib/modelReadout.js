// Turns the rockfish model's result JSON (see rockfishModel.js) into the words people read.
// The model returns fields only, no sentence, so every line shown about a result is built here.
// Box arguments are fractions of the frame ({ x, y, w, h }), the format both pages draw.

const APP_STATUS = {
  Identified: 'Identified',
  'Needs review': 'Needs review',
  'Not rockfish': 'Uncertain',
  'No detection': 'Uncertain',
};

const DETECTORS = { cfd: 'Community Fish Detector', mbari_315k: 'MBARI 315k' };

// A box this share of the frame or more is usually outlining background, not a fish.
export const LARGE_BOX = 0.5;

// The model's four statuses -> the product's three words.
export function appStatus(rawStatus) {
  return APP_STATUS[rawStatus] ?? 'Uncertain';
}

export function detectorName(source) {
  return DETECTORS[source] ?? source ?? 'the fish detector';
}

// Where the box's centre sits ("lower left", "centre") and how much of the frame it covers (0-1).
export function boxPlacement(box) {
  if (!box) return null;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const col = cx < 1 / 3 ? 'left' : cx > 2 / 3 ? 'right' : '';
  const row = cy < 1 / 3 ? 'upper' : cy > 2 / 3 ? 'lower' : '';
  const where = [row, col].filter(Boolean).join(' ') || 'centre';
  return { where, share: box.w * box.h };
}

const pct = (v) => `${Math.round(v * 100)}%`;
const num = (v) => v.toFixed(2);

// The one question reviewers answer: about the box, or the whole frame when there is no box.
export function reviewQuestion(speciesName, hasBox) {
  const name = speciesName.toLowerCase();
  return hasBox ? `Is the boxed animal a ${name}?` : `Is there a ${name} anywhere in this frame?`;
}

// -> { status, rawStatus, guess, headline, sentence, facts: [[label, value]], flags: [] }
// flags: 'no_box' (nothing to point at), 'large_box' (box covers LARGE_BOX or more of the frame).
export function describeModelResult(model, box) {
  const status = appStatus(model.status);
  const best = model.all_boxes?.[0];
  const placement = boxPlacement(box);
  const { needs_review: reviewLine, identified: idLine } = model.thresholds ?? {};
  const flags = [];
  if (!box) flags.push('no_box');
  if (placement && placement.share >= LARGE_BOX) flags.push('large_box');

  const where = placement ? ` in the ${placement.where}` : '';
  const found = best
    ? `The ${detectorName(best.det_source)} found an animal${where} (detector ${pct(best.det_conf)} sure it's a fish).`
    : '';
  const scored = model.score != null ? `The rockfish classifier scored it ${num(model.score)}` : '';

  // What the AI thinks it is. The model only tells rockfish from not-rockfish; the species hint is unvalidated.
  const hint = model.species_hint;
  const hintText = hint ? `, maybe ${hint.common_name ?? hint.name}` : '';
  const guess = {
    Identified: `Rockfish (Sebastes${hintText})`,
    'Needs review': `Possibly a rockfish (Sebastes${hintText})`,
    'Not rockfish': 'An animal, but not a rockfish',
  }[model.status] ?? 'No fish';

  let headline, sentence;
  switch (model.status) {
    case 'Identified':
      headline = 'Confident at genus level, so it counts.';
      sentence = `${found} ${scored}, above the Identified line (${num(idLine)}), so it counts without review.`;
      break;
    case 'Needs review':
      headline = 'Not sure enough to count it.';
      sentence = `${found} ${scored}. That's above the review line (${num(reviewLine)}) but below the Identified line (${num(idLine)}), so a person needs to check it.`;
      break;
    case 'Not rockfish':
      headline = 'Scored below the review line, so it is not counted.';
      sentence = `${found} ${scored}, below the review line (${num(reviewLine)}), so it isn't counted. People check these in case the AI is wrong.`;
      break;
    default:
      headline = 'Nothing for the classifier to check.';
      sentence = "The detectors found no fish in this frame, so nothing was classified. A rockfish may still be there: the AI misses small, dark or partly hidden fish.";
  }
  if (flags.includes('large_box')) {
    sentence += ` The box covers ${pct(placement.share)} of the frame, so it may be outlining background rather than one fish.`;
  }

  const facts = [
    best && ['Detector', `${detectorName(best.det_source)} · ${pct(best.det_conf)} sure it's a fish`],
    model.score != null && ['Rockfish score', `${num(model.score)} (review ≥ ${num(reviewLine)}, Identified ≥ ${num(idLine)})`],
    placement && ['Box', `${placement.where} · ${pct(placement.share)} of the frame`],
    hint && ['Species guess', `${hint.common_name ?? hint.name} (${hint.name}), ${pct(hint.prob)} · not validated`],
    model.all_boxes?.length > 1 && ['Other boxes', `${model.all_boxes.length - 1} more, not shown`],
    model.model_version && ['Model', `${model.model_version}${model.seconds != null ? ` · ${model.seconds}s` : ''}`],
  ].filter(Boolean);

  return { status, rawStatus: model.status, guess, headline, sentence: sentence.replace(/\s+/g, ' ').trim(), facts, flags };
}

// The AI's answer and how sure it is, for the frame's subheader:
// "The model detected a {name} with {confidence} confidence".
// The model only tells rockfish from not-rockfish, so its answer is the genus, never the unvalidated species hint.
// Its score is shown as a percentage here, though it is not a calibrated probability.
// -> { name, confidence } where name is null when no fish was found and confidence is null when nothing was scored.
const MODEL_NAME = { Identified: 'rockfish', 'Needs review': 'rockfish', 'Not rockfish': 'fish that is not a rockfish' };

export function aiAnnouncement(detection, species) {
  const { model } = detection;
  const value = model ? model.score : detection.confidence;
  const name = model ? (MODEL_NAME[model.status] ?? null) : species.name.toLowerCase();
  return { name, confidence: value != null ? pct(value) : null };
}

// "a" or "an" before a name: a rockfish, an eelpout
export function article(name) {
  return /^[aeiou]/i.test(name) ? 'an' : 'a';
}
