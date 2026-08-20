import { memo } from 'react'

/*
 * Seven-segment digits for the alternative "digital readout" display.
 *
 * Drawn as SVG polygons rather than set in a seven-segment WEB FONT on
 * purpose. Three reasons, all of which have bitten this project before:
 *   - no network dependency (this ends up on a kiosk; a font that fails
 *     to load would silently fall back to a normal typeface, and the
 *     browser might synthesize a fake weight on top),
 *   - vector polygons stay razor-crisp at any size, with no hinting or
 *     antialiasing softness on the diagonals — the digits were just
 *     criticised for looking blurry, so this variant is deliberately
 *     hard-edged everywhere,
 *   - the unlit "ghost" segments (the thing that actually sells a real
 *     digital readout, versus text that happens to be square) can't be
 *     drawn with a font at all — they aren't part of the glyph.
 */

// Geometry, in the digit's own 100x180 coordinate space. THICK is the
// segment thickness; GAP is the empty wedge left between the mitred tips
// of two adjacent segments, so they read as separate physical elements
// rather than one continuous outline.
// W:H is deliberately narrow (~0.43, not the ~0.55 of a generic
// calculator digit). Ten digits plus three separators have to span the
// panel, and each slot's SVG scales to fit its box — so a wide glyph
// forces the row to bind on WIDTH, which shrinks the digits vertically
// and leaves the screen looking half empty. A tall narrow digit both
// fills the screen properly and matches the proportions real fuel-pump
// readouts use.
const W = 62
const H = 180
const THICK = 12
const GAP = 3.5
const HALF = THICK / 2

// A horizontal segment centred on `yc`, mitred at 45° on both ends.
function hSeg(yc) {
  const x0 = HALF + GAP
  const x1 = W - HALF - GAP
  return [
    [x0, yc],
    [x0 + HALF, yc - HALF],
    [x1 - HALF, yc - HALF],
    [x1, yc],
    [x1 - HALF, yc + HALF],
    [x0 + HALF, yc + HALF],
  ]
    .map((p) => p.join(','))
    .join(' ')
}

// A vertical segment centred on `xc`, running between the tips y0..y1.
function vSeg(xc, y0, y1) {
  return [
    [xc, y0],
    [xc + HALF, y0 + HALF],
    [xc + HALF, y1 - HALF],
    [xc, y1],
    [xc - HALF, y1 - HALF],
    [xc - HALF, y0 + HALF],
  ]
    .map((p) => p.join(','))
    .join(' ')
}

const MID_Y = H / 2

// Standard seven-segment naming: a = top, b = upper-right, c =
// lower-right, d = bottom, e = lower-left, f = upper-left, g = middle.
const SEGMENTS = {
  a: hSeg(HALF),
  b: vSeg(W - HALF, HALF + GAP, MID_Y - GAP),
  c: vSeg(W - HALF, MID_Y + GAP, H - HALF - GAP),
  d: hSeg(H - HALF),
  e: vSeg(HALF, MID_Y + GAP, H - HALF - GAP),
  f: vSeg(HALF, HALF + GAP, MID_Y - GAP),
  g: hSeg(MID_Y),
}

const SEGMENT_ORDER = ['a', 'b', 'c', 'd', 'e', 'f', 'g']

// Which segments are lit for each value.
const LIT = {
  0: 'abcdef',
  1: 'bc',
  2: 'abged',
  3: 'abgcd',
  4: 'fgbc',
  5: 'afgcd',
  6: 'afgecd',
  7: 'abc',
  8: 'abcdefg',
  9: 'abcdfg',
}

/** One seven-segment digit. `value` is 0-9. */
function SevenSegDigit({ value }) {
  const lit = LIT[value] ?? ''
  return (
    <svg
      className="lcd-glyph"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {SEGMENT_ORDER.map((name) => (
        <polygon
          key={name}
          className={lit.includes(name) ? 'seg seg-on' : 'seg seg-off'}
          points={SEGMENTS[name]}
        />
      ))}
    </svg>
  )
}

/*
 * Thousands separator, in the same visual language. A real seven-segment
 * module has no comma — the closest it has is the square decimal point —
 * so this is built from two offset square blocks rather than a typeset
 * comma glyph, which would be the one curved, "printed"-looking mark on
 * an otherwise entirely rectilinear display. Same 180-tall coordinate
 * space as the digits so it scales and sits on the same baseline.
 */
// Same 180-tall space as a digit, and its slot is given a matching
// FRACTION of a digit slot's width in CSS (see .lcd-comma-slot), so the
// comma ends up scaled by the same factor as the digits around it. Sized
// off THICK so the blocks read as the same weight of element as a lit
// segment — a first pass sized these independently and they scaled down
// to unreadable specks next to the digits.
// KEEP IN SYNC: .lcd-comma-slot's flex ratio must equal COMMA_W / W.
const COMMA_W = 26

function SevenSegComma() {
  const y = H - 2 * THICK
  return (
    <svg
      className="lcd-glyph lcd-glyph-comma"
      viewBox={`0 0 ${COMMA_W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <rect className="seg seg-on" x={COMMA_W - THICK - 2} y={y} width={THICK} height={THICK} />
      <rect className="seg seg-on" x="2" y={y + THICK} width={THICK} height={THICK} />
    </svg>
  )
}

export default memo(SevenSegDigit)
export { SevenSegComma }
