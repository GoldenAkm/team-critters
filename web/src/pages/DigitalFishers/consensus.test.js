import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addVote, outcomeFor, resolveConsensus } from './consensus.js';

describe('resolveConsensus', () => {
  it('waits until every review is in', () => {
    assert.equal(resolveConsensus({ yes: 2, no: 0, unsure: 0 }, 3), null);
  });
  it('confirms on a simple majority', () => {
    const { winner, count, of } = resolveConsensus(addVote({ yes: 2 }, 'unsure'), 3);
    assert.deepEqual({ winner, count, of }, { winner: 'yes', count: 2, of: 3 });
  });
  it('has no winner on a three-way split', () => {
    assert.equal(resolveConsensus({ yes: 1, no: 1, unsure: 1 }, 3).winner, null);
  });
});

describe('outcomeFor', () => {
  it('only a matching yes on a confirmed clip collects', () => {
    const c = { winner: 'yes', count: 3, of: 3 };
    assert.deepEqual(outcomeFor('yes', c), { type: 'confirmed_match', matched: true });
    assert.deepEqual(outcomeFor('unsure', c), { type: 'confirmed_other', matched: false });
  });
  it('is waiting when there is no consensus yet', () => {
    assert.equal(outcomeFor('yes', null).type, 'waiting');
  });
});
