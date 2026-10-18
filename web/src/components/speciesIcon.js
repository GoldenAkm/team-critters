// One drawn animal per species, inside a round marker, so species stay distinct without colour. Used on the map
// (markers, filters, species card) and in Digital Fishers (collection, badges). Returns an SVG string so Leaflet
// markers can use it as HTML too.
//
// The marker carries the status:
//   identified    filled circle, animal in white
//   uncertain     white circle with a dashed ring, animal in colour
//   needs_review  white circle with a solid ring, animal in colour, "?" badge top left (a count goes top right)
//   locked        faded (Digital Fishers: not collected yet)
//
// Animals face left, as in field guides, drawn in a 100 x 68 box (y from -8 to 60). Each draw function gets the
// animal's fill, the colour for its markings (eye, gill cover, fins) and whether to add the finest markings, which
// are left out at small sizes where they would only blur.

import { ONC } from './oncTheme.js'

const line = (d, w, colour, extra = '') =>
  `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
const dot = (cx, cy, r, colour, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colour}"${extra}/>`

// Rockfish (genus Sebastes): deep body, big head and eye, spiny dorsal fin, fan-shaped pectoral fin, square tail.
// spine: how tall the dorsal spines stand (quillback's are much taller)
function rockfishBody(spine) {
  const tips = [[29, 13], [35, 12], [41, 11.5], [47, 11.5], [53, 12], [59, 13]]
  const scale = [1, 1, 1, 1, 0.9, 0.75]
  const spines = tips.map(([x, y], i) => `L${x} ${y - spine * scale[i]} L${x + 3} ${y + 0.5}`).join(' ')
  return `M5 31 C6 24 12 18 22 15 L27 14 ${spines} L62 13.5 C66 6 74 7 78 16 C80 19 82 21 84 22 L93 13 C95 12 97 13 97 15
    C98 24 98 36 97 45 C97 47 95 48 93 47 L84 38 C80 39 77 41 75 43 L71 51 L68 50 L66 52 L63 44 C54 47 42 48 32 45
    L30 53 L26 52 L25 44 C18 42 10 39 6 35 L4 33 Z`
}

function rockfish({ fill, mark, fine, spine = 9, stripe = false }) {
  let s = `<path d="${rockfishBody(spine)}" fill="${fill}"/>`
  s += line('M27 16 C32 23 32 33 27 42', 1.8, mark) // gill cover
  s += line('M33 30 L45 23 M33 30 L48 30 M33 30 L45 37 M45 23 C49 26 49 34 45 37', 1.4, mark) // fan-shaped pectoral fin
  s += line('M5 31.5 C9 32 13 32.5 16 31', 1.5, mark) // mouth
  if (fine) {
    s += line('M28 15.5 C45 13.5 60 14.5 76 17', 0.9, mark) // base of the dorsal fin
    s += line('M29 19 C45 16 66 17 84 28', 0.9, mark) // lateral line
    s += line('M11 28 C15 27.5 20 27.5 24 28.5', 1, mark) // bony ridge under the eye
    s += line('M33 30 L47 26 M33 30 L47 34', 0.7, mark) // more pectoral rays
    s += line('M86 28 L96 18 M86 30 L97 30 M86 32 L96 42', 0.8, mark) // tail rays
  }
  // Copper rockfish: pale band along the rear two-thirds of the lateral line
  if (stripe) s += line('M46 23.5 C60 22.5 72 24.5 85 30', 3.4, mark, ' opacity="0.7"')
  s += dot(17, 22, 4.8, mark) + dot(17, 22, 2.3, fill) // eye
  return s
}

// Lingcod: long body, big head and jaw with teeth, long dorsal fin with a notch, mottled sides
function lingcod({ fill, mark, fine }) {
  let s = `<path d="M3 30 C4 24 10 20 20 19 C26 18.5 30 19 34 19.5 L36 15 L39 18.5 L42 14.5 L45 18.5 L48 14.5 L51 18.5
    L54 15 L57 19 L59 19.5 C64 13 78 13 87 22 L89 24 L95 18 C97 17 98 19 98 21 L98 37 C98 39 97 41 95 40 L89 34
    C86 37 82 40 78 42 C70 44 62 43 56 41 C48 42 40 41 34 40 L31 45 L28 44 L28 39 C20 38 10 37 4 34 L2 32 Z" fill="${fill}"/>`
  s += line('M25 20 C29 26 29 33 25 39', 1.7, mark) // gill cover
  s += line('M30 30 C37 24 45 26 46 31 C45 36 37 38 30 32', 1.5, mark) // pectoral fin
  s += line('M3 31 C9 32 16 32.5 22 30.5', 1.5, mark) // big mouth
  if (fine) {
    s += line('M6 31.6 L7 33 L8.5 31.8 L10 33.2 L11.5 32 L13 33.4 L14.5 32.2', 0.7, mark) // teeth
    s += line('M27 22 C45 21 70 22 89 28', 0.9, mark) // lateral line
    s += line('M91 28 L97 21 M91 29 L98 29 M91 30 L97 37', 0.8, mark) // tail rays
    for (const [x, y, r] of [[40, 26, 1.7], [50, 33, 1.5], [58, 25, 1.6], [66, 32, 1.4], [74, 26, 1.3], [44, 35, 1.2], [81, 31, 1.2]]) {
      s += dot(x, y, r, mark, ' opacity="0.6"') // mottling
    }
  }
  s += dot(16, 24, 3.6, mark) + dot(16, 24, 1.7, fill) // eye
  return s
}

// Kelp greenling: slim body, small head and mouth, long dorsal fin, several lateral lines, spots
function kelpGreenling({ fill, mark, fine }) {
  let s = `<path d="M5 30 C7 25 12 21 20 19 C24 18 27 17.5 30 17 C36 10 50 10 56 15 C58 13 60 11 64 11 C74 11 82 14 86 21
    L88 23 L95 16 C97 15 98 17 98 19 C99 26 99 33 98 40 C98 42 96 43 95 42 L88 35 C84 38 78 42 72 43 C64 44 56 43 50 41
    C42 41 34 40 28 38 L26 44 L23 43 L23 37 C15 36 9 34 5 31 Z" fill="${fill}"/>`
  s += line('M23 21 C26 26 26 32 23 37', 1.6, mark) // gill cover
  s += line('M28 29 C34 24 40 25 42 29 C40 33 34 35 28 30', 1.4, mark) // pectoral fin
  s += line('M5 30 C7 30.5 9 30.8 11 30.2', 1.3, mark) // small mouth
  s += line('M26 21 C50 17 70 18 88 25', 1, mark) // upper lateral line
  if (fine) {
    s += line('M27 32 C50 33 70 32 88 31', 0.8, mark) + line('M30 37 C50 40 70 38 88 34', 0.8, mark) // more lateral lines
    s += line('M31 16 C45 13.5 62 13 84 19', 0.8, mark) // base of the dorsal fin
    for (const [x, y] of [[46, 25], [56, 28], [64, 24], [72, 29], [52, 36], [78, 25]]) s += dot(x, y, 1.2, mark, ' opacity="0.6"')
  }
  s += dot(15, 25, 3.3, mark) + dot(15, 25, 1.6, fill) // eye
  return s
}

// European green crab, seen from above: spined shell, two claws forward, four legs a side
function greenCrab({ fill, mark, fine }) {
  const legs = ['M74 28 L86 26 L94 32', 'M73 33 L84 34 L90 42', 'M70 38 L79 42 L82 51', 'M64 43 L70 50 L70 57']
  const side = legs.map((d) => line(d, 3.4, fill)).join('') +
    `<path d="M66 14 C72 10 78 6 82 2 L88 -2 C93 -5 97 -2 95 2 L90 3 L94 6 C92 9 86 9 84 7 C80 11 74 15 70 18 Z" fill="${fill}"/>`
  let s = side + `<g transform="matrix(-1 0 0 1 100 0)">${side}</g>`
  s += `<path d="M28 16 C34 8 44 6 50 6 C56 6 66 8 72 16 L76 15 L75 19 L79 19 L77 23 L81 24 L78 27 L81 30 L77 31
    C74 40 62 46 50 46 C38 46 26 40 23 31 L19 30 L22 27 L19 24 L23 23 L21 19 L25 19 L24 15 Z" fill="${fill}"/>`
  s += dot(45, 4.5, 2.2, fill) + dot(55, 4.5, 2.2, fill) // eyes on stalks
  s += line('M40 22 C45 26 55 26 60 22', 1.2, mark) // shell grooves
  if (fine) {
    s += line('M50 26 L50 38', 0.9, mark) + line('M38 32 C44 36 56 36 62 32', 0.9, mark)
    s += line('M45 9 L47 11.5 L50 9.5 L53 11.5 L55 9', 0.8, mark) // three bumps between the eyes
  }
  return s
}

const ANIMALS = {
  rockfish: (c) => rockfish(c),
  copper_rockfish: (c) => rockfish({ ...c, stripe: true }),
  quillback_rockfish: (c) => rockfish({ ...c, spine: 16 }),
  lingcod,
  kelp_greenling: kelpGreenling,
  green_crab: greenCrab,
}

// speciesId: a species id from either data set; unknown ids fall back to the rockfish
// color: the marker colour (any CSS colour, including currentColor)
export function speciesIconSvg(speciesId, status = 'identified', size = 24, color = ONC.navy) {
  const draw = ANIMALS[speciesId] ?? ANIMALS.rockfish
  const filled = status === 'identified'
  const fill = filled ? '#ffffff' : color
  const mark = filled ? color : '#ffffff'
  const ring = status === 'uncertain' ? ' stroke-dasharray="9 7"' : ''
  const badge = status === 'needs_review'
    ? `<circle cx="20" cy="20" r="18" fill="${color}" stroke="#ffffff" stroke-width="4"/>` +
      `<text x="20" y="29" text-anchor="middle" font-size="26" font-weight="700" fill="#ffffff" font-family="system-ui,sans-serif">?</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"` +
    `${status === 'locked' ? ' opacity="0.35"' : ''}>` +
    `<circle cx="50" cy="50" r="46" fill="${filled ? color : '#ffffff'}" stroke="${color}" stroke-width="6"${ring}/>` +
    `<g transform="translate(8 26) scale(0.84)">${draw({ fill, mark, fine: size >= 28 })}</g>${badge}</svg>`
}
