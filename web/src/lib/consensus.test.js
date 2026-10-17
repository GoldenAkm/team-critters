import { describe, expect, it } from 'vitest';
import { addVote, outcomeFor, resolveConsensus } from './consensus.js';

describe('resolveConsensus', () => {
  it('waits until every review is in', () => {
    expect(resolveConsensus({ yes: 2, no: 0, unsure: 0 }, 3)).toBeNull();
  });
  it('confirms on a simple majority', () => {
    expect(resolveConsensus(addVote({ yes: 2 }, 'unsure'), 3)).toMatchObject({ winner: 'yes', count: 2, of: 3 });
  });
  it('has no winner on a three-way split', () => {
    expect(resolveConsensus({ yes: 1, no: 1, unsure: 1 }, 3).winner).toBeNull();
  });
});

describe('outcomeFor', () => {
  it('only a matching yes on a confirmed clip collects', () => {
    const c = { winner: 'yes', count: 3, of: 3 };
    expect(outcomeFor('yes', c)).toEqual({ type: 'confirmed_match', matched: true });
    expect(outcomeFor('unsure', c)).toEqual({ type: 'confirmed_other', matched: false });
  });
  it('is waiting when there is no consensus yet', () => {
    expect(outcomeFor('yes', null).type).toBe('waiting');
  });
});
