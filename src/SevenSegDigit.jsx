import { memo } from 'react'

/*
 * Seven-segment digits for the digital display option.
 *
 * Drawn as SVG polygons rather than set in a seven-segment WEB FONT on
 * purpose. Three reasons, all of which have bitten this project before:
 *   - no network dependency (this ends up on a kiosk; a font that fails
 *     to load would silently fall back to a normal typeface, and the
 *     browser might synthesize a fake weight on top),
 *   - vector polygons stay razor-crisp at any size, with no hinting or
 *     antialiasing softness on the diagonals,
 *   - segment geometry can be matched to the reference exactly, which a
 *     font would only approximate.
 *
 * Every constant below is measured off the reference artwork
 * (~/Downloads/number-display.png) rather than eyeballed. In that image
 * a digit's ink is 93 x 191 px with 15px-thick segments:
 *   W / H   = 93 / 191 = 0.487   (kept as 87 / 180)
 *   THICK   = 15 / 191 = 7.85 % of the digit's height
 *   THICK/W = 15 / 93  = 16.1 %  of its width
 * The exact W is 87 rather than 87.7 so the glyph's aspect matches the
 * aspect its layout slot works out to (see .dg-digits in Digital.css) —
 * the SVG then fills its slot almost exactly instead of leaving a sliver
 * of slack on one axis.
 */
const W = 87
const H = 180
const THICK = 14
// Empty wedge left between the mitred tips of two adjacent segments, so
// they read as separate physical elements rather than one continuous
// outline. Measured at 3.5px in the reference's 191-tall digit.
const GAP = 3.3
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

// Which segments are lit for each value.
const LIT = {
  0: ['a', 'b', 'c', 'd', 'e', 'f'],
  1: ['b', 'c'],
  2: ['a', 'b', 'g', 'e', 'd'],
  3: ['a', 'b', 'g', 'c', 'd'],
  4: ['f', 'g', 'b', 'c'],
  5: ['a', 'f', 'g', 'c', 'd'],
  6: ['a', 'f', 'g', 'e', 'c', 'd'],
  7: ['a', 'b', 'c'],
  8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  9: ['a', 'b', 'c', 'd', 'f', 'g'],
}

/**
 * One seven-segment digit. `value` is 0-9.
 *
 * Only LIT segments are drawn. An earlier pass also painted the unlit
 * ones as faint "ghosts", on the theory that a real seven-segment module
 * shows all its segments whether energised or not — but the reference
 * artwork has none: sampled inside a "0", where the middle segment would
 * be, every pixel is 0/255 pure black. The ghosts also hurt the thing
 * this display exists to do, which is let a player read a fast-moving
 * number at a glance.
 */
function SevenSegDigit({ value }) {
  return (
    <svg
      className="dg-glyph"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {(LIT[value] ?? []).map((name) => (
        <polygon key={name} className="dg-seg" points={SEGMENTS[name]} />
      ))}
    </svg>
  )
}

export default memo(SevenSegDigit)
