import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { collect, emptyPlayer, markPending, parsePlayer } from './playerStore.js';

describe('playerStore', () => {
  it('collects once, then counts sightings', () => {
    let s = collect(emptyPlayer(), 'copper_rockfish', 'hartley_bay', '2024-04-20');
    s = collect(s, 'copper_rockfish', 'china_creek', '2024-04-21');
    assert.equal(s.collected.copper_rockfish.firstAt, 'hartley_bay');
    assert.equal(s.collected.copper_rockfish.sightings, 2);
  });
  it('clears pending when a species is collected', () => {
    let s = markPending(emptyPlayer(), 'lingcod', 'c2');
    assert.deepEqual(s.pending.lingcod, ['c2']);
    s = collect(s, 'lingcod', 'campbell_river', '2024-08-01');
    assert.equal(s.pending.lingcod, undefined);
  });
  it('survives corrupt storage', () => {
    assert.deepEqual(parsePlayer('{not json'), emptyPlayer());
  });
});
