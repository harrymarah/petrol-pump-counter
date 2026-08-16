import { memo, useEffect, useMemo, useRef, useState } from 'react'

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
 * `tickMs` must match the counter's tick interval — it sets the roll
 * transition duration so each step finishes exactly as the next one
 * starts, instead of being cut off mid-animation.
 */
function DigitWheel({ digit, resetSignal, tickMs }) {
  const strip = useMemo(buildStrip, [])
  const [pos, setPos] = useState(0)
  const [transitionOn, setTransitionOn] = useState(true)
  const prevDigit = useRef(0)
  const prevReset = useRef(resetSignal)
  // Set synchronously alongside the pos update it belongs to, then
  // consumed by the effect below — see the wrap-handling comment.
  const pendingSkipRef = useRef(false)

  // Roll forward to the next matching digit whenever the target digit changes.
  useEffect(() => {
    if (prevReset.current !== resetSignal) {
      prevReset.current = resetSignal
      prevDigit.current = digit
      pendingSkipRef.current = true
      setPos(0)
      return
    }

    if (digit === prevDigit.current) return
    prevDigit.current = digit

    setPos((current) => {
      // Keep the physical strip index bounded to the 400 rendered cells.
      // If we're close to the end, fold the baseline back to the
      // equivalent position near the start (same digit value, since
      // strip[i] === i % 10) *before* searching forward — in the same
      // synchronous update that advances to the new digit, not as a
      // separate later step.
      //
      // The previous version did this as its own effect, async via
      // requestAnimationFrame (disable transition, snap, re-enable two
      // frames later). That left a window where a fast-arriving tick
      // could read the not-yet-wrapped position and search forward from
      // it, pushing pos past the end of the strip — which rendered as
      // blank space (the digit appearing to vanish). Folding the wrap
      // into this one state update removes that window entirely.
      const base = current >= STRIP_LENGTH - 30 ? current % 10 : current
      pendingSkipRef.current = base !== current
      let next = base + 1
      while (strip[next % strip.length] !== digit) {
        next++
      }
      return next
    })
  }, [digit, resetSignal, strip])

  // A wrap (or a reset) just moved pos backwards without animating —
  // suppress the transition for exactly this one render, then restore it
  // two frames later so the *next* forward step rolls normally.
  useEffect(() => {
    if (!pendingSkipRef.current) return
    pendingSkipRef.current = false
    setTransitionOn(false)
    requestAnimationFrame(() => requestAnimationFrame(() => setTransitionOn(true)))
  }, [pos])

  return (
    <div className="digit-window">
      <div
        className="digit-strip"
        style={{
          // Percentage positions the strip so digit `pos` is at the window top;
          // the pixel offset then shifts it down to centre it in the window.
          transform: `translateY(-${pos * (100 / STRIP_LENGTH)}%)`,
          transition: transitionOn ? `transform ${tickMs}ms ease-out` : 'none',
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

export default memo(DigitWheel)
