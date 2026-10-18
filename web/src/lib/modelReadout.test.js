import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aiAnnouncement, appStatus, article, boxPlacement, describeModelResult, reviewQuestion } from './modelReadout.js';

// Shapes copied from real /predict results on ONC frames.
const thresholds = { needs_review: 0.1122, identified: 0.8838 };
const needsReview = {
  status: 'Needs review', score: 0.5826, box: [480, 0, 640, 195], species_hint: null, thresholds,
  all_boxes: [{ box: [480, 0, 640, 195], score: 0.5826, status: 'Needs review', det_conf: 0.572, det_source: 'mbari_315k' }],
  model_version: 'vic02-rockfish-fine-tuned-6bef1b984c43', seconds: 1.2,
};
const identified = {
  status: 'Identified', score: 0.8882, box: [371, 226, 517, 300], thresholds,
  species_hint: { name: 'Sebastes caurinus', prob: 0.9979, common_name: 'copper rockfish', validated: false },
  all_boxes: [{ box: [371, 226, 517, 300], score: 0.8882, status: 'Identified', det_conf: 0.855, det_source: 'cfd' }],
  model_version: 'v', seconds: 1,
};
const noDetection = { status: 'No detection', score: null, box: null, species_hint: null, all_boxes: [], thresholds, model_version: 'v', seconds: 1.1 };
const notRockfish = { ...needsReview, status: 'Not rockfish', score: 0.05 };

describe('appStatus', () => {
  it('maps the model statuses to the three product words', () => {
    assert.equal(appStatus('Identified'), 'Identified');
    assert.equal(appStatus('Needs review'), 'Needs review');
    assert.equal(appStatus('Not rockfish'), 'Uncertain');
    assert.equal(appStatus('No detection'), 'Uncertain');
  });
});

describe('boxPlacement', () => {
  it('names the region and the share of the frame', () => {
    assert.deepEqual(boxPlacement({ x: 0.75, y: 0, w: 0.25, h: 0.4 }), { where: 'upper right', share: 0.1 });
    assert.equal(boxPlacement({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 }).where, 'centre');
  });
});

describe('reviewQuestion', () => {
  it('asks about the box, or the whole frame when there is none', () => {
    assert.equal(reviewQuestion('Rockfish', true), 'Is the boxed animal a rockfish?');
    assert.equal(reviewQuestion('Rockfish', false), 'Is there a rockfish anywhere in this frame?');
  });
});

describe('describeModelResult', () => {
  it('explains a needs-review result against both cutoffs', () => {
    const r = describeModelResult(needsReview, { x: 0.75, y: 0, w: 0.25, h: 0.4 });
    assert.equal(r.status, 'Needs review');
    assert.equal(r.guess, 'Possibly a rockfish (Sebastes)');
    assert.match(r.sentence, /MBARI 315k found an animal in the upper right \(detector 57% sure/);
    assert.match(r.sentence, /scored it 0\.58\. That's above the review line \(0\.11\) but below the Identified line \(0\.88\)/);
    assert.ok(!r.facts.some(([label]) => label === 'Species guess'));
  });

  it('shows the species hint as not validated', () => {
    const r = describeModelResult(identified, { x: 0.58, y: 0.47, w: 0.23, h: 0.15 });
    assert.equal(r.status, 'Identified');
    assert.equal(r.guess, 'Rockfish (Sebastes, maybe copper rockfish)');
    assert.deepEqual(r.facts.find(([label]) => label === 'Species guess'), ['Species guess', 'copper rockfish (Sebastes caurinus), 100% · not validated']);
  });

  it('asks about the whole frame when nothing was detected', () => {
    const r = describeModelResult(noDetection, null);
    assert.equal(r.status, 'Uncertain');
    assert.deepEqual(r.flags, ['no_box']);
    assert.equal(r.guess, 'No fish');
    assert.ok(!r.facts.some(([label]) => label === 'Rockfish score'));
  });

  it('flags a box that covers most of the frame', () => {
    const r = describeModelResult(notRockfish, { x: 0, y: 0.3, w: 0.92, h: 0.69 });
    assert.equal(r.status, 'Uncertain');
    assert.ok(r.flags.includes('large_box'));
    assert.match(r.sentence, /below the review line.*covers 63% of the frame/);
  });
});

describe('aiAnnouncement', () => {
  const species = { name: 'Copper rockfish' };
  it('names the sample species with its confidence', () => {
    assert.deepEqual(aiAnnouncement({ confidence: 0.58 }, species), { name: 'copper rockfish', confidence: '58%' });
  });
  it('names the genus for model results, not the unvalidated species hint', () => {
    assert.deepEqual(aiAnnouncement({ model: identified, box: null }, species), { name: 'rockfish', confidence: '89%' });
  });
  it('has no name or confidence when no fish was found', () => {
    assert.deepEqual(aiAnnouncement({ model: noDetection, box: null }, species), { name: null, confidence: null });
  });
  it('picks a or an', () => {
    assert.equal(article('rockfish'), 'a');
    assert.equal(article('eelpout'), 'an');
  });
});
