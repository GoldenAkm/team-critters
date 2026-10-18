// Data provenance and ONC citations, shown in the page footer under the credits.
import { sources, sightingsMeta } from '../../components/data.js'

export default function DataNote() {
  return (
    <section className="mp-note" aria-label="About the data">
      <details className="sources">
        <summary>Data sources &amp; citations</summary>
        <ul>
          {sources.notes.map((n) => <li key={n}>{n}</li>)}
          <li>
            ONC annotations kept only if {sightingsMeta.rule}: {sightingsMeta.rulePrecision.confirmed} of {sightingsMeta.rulePrecision.checked} such
            rockfish annotations were confirmed by corrected labels, versus {sightingsMeta.baselinePrecision.confirmed} of {sightingsMeta.baselinePrecision.checked} overall.
            Lingcod annotations are unmeasured, so they stay in Needs review.
          </li>
        </ul>
        <ul>{sources.citations.map((c) => <li key={c.doi}>{c.citation}</li>)}</ul>
      </details>
    </section>
  )
}
