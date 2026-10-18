// The answer icons, shared by the answer tiles and the review dots:
// a check for confirm, a cross for deny and a question mark for uncertain.
const PATHS = {
  yes: 'M5 12.5l4.5 4.5L19 7.5',
  no: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  unsure: 'M9 9.2a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.8v.7M12 17.6v.4',
};

export default function AnswerIcon({ kind, size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[kind]} />
    </svg>
  );
}
