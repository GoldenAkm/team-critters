// Species shape + status styling as an SVG string (also used for Leaflet markers).
import { ONC } from '../../components/oncTheme.js'

export const SPECIES_COLOR = ONC.navy

export function symbolSvg(shape, status, size = 20, color = SPECIES_COLOR) {
  const filled = status === 'identified'
  const fill = filled ? color : '#ffffff'
  const dash = status === 'uncertain' ? ' stroke-dasharray="3 2.5"' : ''
  const s = size, p = 2.5
  let body
  if (shape === 'square') body = `<rect x="${p}" y="${p}" width="${s - 2 * p}" height="${s - 2 * p}" rx="2"`
  else if (shape === 'triangle') body = `<polygon points="${s / 2},${p} ${s - p},${s - p} ${p},${s - p}"`
  else body = `<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - p}"`
  const q = status === 'needs_review'
    ? `<text x="${s / 2}" y="${s / 2 + (shape === 'triangle' ? 4.5 : 4)}" text-anchor="middle" font-size="${s * 0.55}" font-weight="700" fill="${color}" font-family="system-ui,sans-serif">?</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true">${body} fill="${fill}" stroke="${color}" stroke-width="2"${dash}/>${q}</svg>`
}
