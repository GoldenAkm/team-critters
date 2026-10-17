import { REVIEWS_NEEDED } from '../config.js';

// An answer is one of: { kind: 'yes' } | { kind: 'no', alt } | { kind: 'unsure' }.
// Votes are tallied by kind; a "no" counts against the AI's guess whatever the alternative.
export function addVote(votes, kind) {
  return { yes: 0, no: 0, unsure: 0, ...votes, [kind]: ((votes?.[kind]) ?? 0) + 1 };
}

export function totalVotes(votes) {
  return (votes.yes ?? 0) + (votes.no ?? 0) + (votes.unsure ?? 0);
}

// Returns null while the clip still needs reviews. Otherwise:
//   { winner: 'yes' | 'no' | 'unsure' | null, count, of }
// winner null means no simple majority (e.g. 1 / 1 / 1).
export function resolveConsensus(votes, needed = REVIEWS_NEEDED) {
  const total = totalVotes(votes);
  if (total < needed) return null;
  const majority = Math.floor(needed / 2) + 1;
  const [kind, count] = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  return { winner: count >= majority ? kind : null, count, of: total };
}

// What happens to the player once their answer is in.
export function outcomeFor(answerKind, consensus) {
  if (!consensus) return { type: 'waiting', matched: false };
  const matched = consensus.winner === answerKind;
  if (consensus.winner === 'yes') return { type: matched ? 'confirmed_match' : 'confirmed_other', matched };
  if (consensus.winner === 'no') return { type: 'rejected', matched };
  return { type: 'unresolved', matched };
}
