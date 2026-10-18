// Always a text label; colour (once a style is chosen) is only a second cue.
export default function ConservationTag({ species }) {
  return <span className={`tag tag--${species.tagKind}`}>{species.tag}</span>;
}
