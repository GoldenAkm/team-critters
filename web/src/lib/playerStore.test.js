import { describe, expect, it } from 'vitest';
import { collect, emptyPlayer, markPending, parsePlayer } from './playerStore.js';

describe('playerStore', () => {
  it('collects once, then counts sightings', () => {
    let s = collect(emptyPlayer(), 'copper_rockfish', 'hartley_bay', '2024-04-20');
    s = collect(s, 'copper_rockfish', 'china_creek', '2024-04-21');
    expect(s.collected.copper_rockfish).toMatchObject({ firstAt: 'hartley_bay', sightings: 2 });
  });
  it('clears pending when a species is collected', () => {
    let s = markPending(emptyPlayer(), 'lingcod', 'c2');
    expect(s.pending.lingcod).toEqual(['c2']);
    s = collect(s, 'lingcod', 'campbell_river', '2024-08-01');
    expect(s.pending.lingcod).toBeUndefined();
  });
  it('survives corrupt storage', () => {
    expect(parsePlayer('{not json')).toEqual(emptyPlayer());
  });
});
