import { useEffect, useMemo, useRef, useState } from 'react'

// Number of times the 0-9 sequence repeats in the scrolling strip.
const REPEATS = 40
const STRIP_LENGTH = REPEATS * 10

// The visible window is 1/0.7 × the cell height (i.e. cell fills 70 % of the
// window), so 15 % of the window sits above the digit and 15 % below.
// This ratio is reflected in the CSS: .digit-strip { top: 15% } handles the
// vertical centring without any JS pixel constants.

function buildStrip() {
  const strip = []
  for (let i = 0; i < STRIP_LENGTH; i++) {
    strip.push(i % 10)
  }
  return strip
}

/**
 * A single rolling digit, styled like a mechanical odometer wheel.
 * `digit` is the 0-9 value it should be showing.
 * `resetSignal` changes whenever the whole counter is reset, which makes
 * the wheel snap straight to 0 instead of rolling backwards.
 */
export default function DigitWheel({ digit, resetSignal }) {
  const strip = useMemo(buildStrip, [])
  const [pos, setPos] = useState(0)
  const [transitionOn, setTransitionOn] = useState(true)
  const prevDigit = useRef(0)
  const prevReset = useRef(resetSignal)

  // Roll forward to the next matching digit whenever the target digit changes.
  useEffect(() => {
    if (prevReset.current !== resetSignal) {
      prevReset.current = resetSignal
      prevDigit.current = digit
      setTransitionOn(false)
      setPos(0)
      requestAnimationFrame(() => requestAnimationFrame(() => setTransitionOn(true)))
      return
    }

    if (digit === prevDigit.current) return
    prevDigit.current = digit

    setPos((current) => {
      let next = current + 1
      while (strip[next % strip.length] !== digit) {
        next++
      }
      return next
    })
  }, [digit, resetSignal, strip])

  // Once the wheel has spun most of the way down the strip, jump it
  // invisibly back to the equivalent position near the top.
  //
  // The threshold is STRIP_LENGTH - 30 (not the old - 10 with pos%10===0)
  // because with a fast counter the position can advance up to 10 steps in
  // one tick, meaning it can blow past 390 without landing on a multiple of
  // 10 and then overshoot past 400 (the strip end), making the window show
  // empty space.  Snapping to pos%10 always lands on the same digit value
  // because strip[i] = i%10, so strip[pos] === strip[pos%10].
  useEffect(() => {
    if (pos >= STRIP_LENGTH - 30) {
      requestAnimationFrame(() => {
        setTransitionOn(false)
        setPos(pos % 10)
        requestAnimationFrame(() => requestAnimationFrame(() => setTransitionOn(true)))
      })
    }
  }, [pos])

  return (
    <div className="digit-window">
      <div
        className="digit-strip"
        style={{
          // Percentage positions the strip so digit `pos` is at the window top;
          // the pixel offset then shifts it down to centre it in the window.
          transform: `translateY(-${pos * (100 / STRIP_LENGTH)}%)`,
          transition: transitionOn ? 'transform 120ms ease-out' : 'none',
        }}
      >
        {strip.map((d, i) => (
          <div className="digit-cell" key={i}>
            {d}
          </div>
        ))}
      </div>
      {/* Gradient overlay: simulates the cylinder curving away at top/bottom */}
      <div className="digit-overlay" />
    </div>
  )
}
