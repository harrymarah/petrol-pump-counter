import { Fragment, useEffect, useRef, useState } from 'react'
import DigitWheel from './DigitWheel.jsx'
import SevenSegDigit, { SevenSegComma } from './SevenSegDigit.jsx'
import './App.css'
import './Digital.css'

const DIGIT_COUNT = 8  // covers up to 99,999,999 — real target is 48 million litres
// Positions (0-indexed from the left) after which a comma is printed —
// derived from DIGIT_COUNT so it's automatically correct if this changes
// again (standard thousands grouping, counting from the right).
const COMMA_AFTER = Array.from({ length: DIGIT_COUNT - 1 }, (_, i) => i).filter(
  (i) => (DIGIT_COUNT - 1 - i) % 3 === 0
)
// Matches the digit-roll CSS transition duration (see DigitWheel) so each
// step finishes exactly as the next tick arrives, instead of being
// interrupted mid-animation — that mismatch (50ms ticks vs a 120ms
// transition) was the main cause of the juddery motion.
const TICK_MS = 120
// The real answer the client will reveal, in LITRES. Pacing below is
// derived from THIS, not MAX_VALUE — MAX_VALUE is just the display's
// headroom so the counter can keep running sensibly if held past the
// target, not the number a run is paced to reach.
const REAL_TARGET = 48_000_000
const RUN_SECONDS = 15  // client's requested run length: the counter should
                        // reach the target ~15 s after START
const RAMP_TICKS = 8  // ticks to reach full speed (~1 s)

// MAX_RATE is derived from REAL_TARGET rather than a hand-picked magic
// number, so it stays correct if the target, RUN_SECONDS or TICK_MS ever
// change. Per tick, the average step is MAX_RATE * 0.75 (see the
// 0.5 + 0.5*random below in the tick handler), scaled by a quadratic
// ease-in during the ramp and at full strength after it. Solving for the
// total distance over RUN_SECONDS to equal REAL_TARGET gives the rate
// that lands a run right on target.
const totalTicks = (RUN_SECONDS * 1000) / TICK_MS
let rampFactorSum = 0
for (let k = 1; k <= RAMP_TICKS; k++) {
  rampFactorSum += (k / RAMP_TICKS) ** 2
}
const MAX_RATE = REAL_TARGET / (0.75 * (rampFactorSum + (totalTicks - RAMP_TICKS)))
const MAX_VALUE = 10 ** DIGIT_COUNT - 1

// Dev/verification affordance: ?value=1234567890 renders the counter
// frozen at that number so every glyph shape can be checked against the
// design reference at once. Ignored (starts at 0) when absent/invalid.
function initialValue() {
  const raw = new URLSearchParams(window.location.search).get('value')
  const n = raw === null ? NaN : Number(raw)
  return Number.isInteger(n) && n >= 0 && n <= MAX_VALUE ? n : 0
}

// Which readout to show at load. ?display=digital opens straight into the
// seven-segment screen; anything else, including no param, opens on the
// mechanical drums. This only seeds the initial state — the toggle at the
// bottom-left switches it afterwards and writes the choice back into the
// URL, so the address bar always describes what is on screen and a reload
// or a shared link lands on the same design.
function initialDigital() {
  return new URLSearchParams(window.location.search).get('display') === 'digital'
}

/**
 * Switch between the two designs. Lives outside both of them: it belongs
 * to neither the pump housing nor the flat screen, so it is styled as
 * quiet page furniture that reads on either ground rather than trying to
 * match one and clashing with the other.
 */
function DesignToggle({ digital, onToggle }) {
  return (
    <div className="design-toggle">
      <span className={digital ? 'design-name' : 'design-name is-on'}>Mechanical</span>
      <button
        type="button"
        role="switch"
        aria-checked={digital}
        aria-label="Switch display design"
        className="design-switch"
        onClick={onToggle}
      >
        <span className="design-knob" />
      </button>
      <span className={digital ? 'design-name is-on' : 'design-name'}>Digital</span>
    </div>
  )
}

function App() {
  const [digital, setDigital] = useState(initialDigital)
  const [value, setValue] = useState(initialValue)
  const [running, setRunning] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const intervalRef = useRef(null)
  // Fractional accumulator so sub-integer steps still advance the counter.
  const accRef = useRef(0)
  // How many ticks have elapsed since the last Start.
  const tickCountRef = useRef(0)

  useEffect(() => {
    if (!running) return undefined

    // Reset ramp whenever we (re-)start.
    tickCountRef.current = 0
    accRef.current = 0

    intervalRef.current = setInterval(() => {
      tickCountRef.current += 1
      // Quadratic ease-in: starts near-zero, reaches 1 after RAMP_TICKS.
      const t = Math.min(1, tickCountRef.current / RAMP_TICKS)
      const speed = t * t
      // Add a randomised fractional step scaled by current speed.
      accRef.current += MAX_RATE * speed * (0.5 + 0.5 * Math.random())
      const step = Math.floor(accRef.current)
      if (step > 0) {
        accRef.current -= step
        setValue((current) => Math.min(current + step, MAX_VALUE))
      }
    }, TICK_MS)

    return () => clearInterval(intervalRef.current)
  }, [running])

  const handleStartStop = () => setRunning((r) => !r)

  const handleReset = () => {
    setRunning(false)
    setValue(0)
    setResetSignal((s) => s + 1)
  }

  // Switching design keeps the current value rather than resetting it —
  // the point of the toggle is comparing the two, which is far more
  // useful with the same number showing in both. The URL is rewritten to
  // match so a reload or a shared link opens on the design you were
  // looking at. replaceState rather than pushState: flipping the switch
  // shouldn't fill the back button with history entries.
  const handleToggleDesign = () => {
    const next = !digital
    setDigital(next)
    const url = new URL(window.location.href)
    if (next) url.searchParams.set('display', 'digital')
    else url.searchParams.delete('display')
    window.history.replaceState(null, '', url)
  }

  const digits = String(value).padStart(DIGIT_COUNT, '0').split('').map(Number)

  // The digital option is a wholly separate design, not the pump housing
  // with a different readout dropped into it — flat, black, graphic,
  // with no metal, no cavity and no physical buttons. So it renders its
  // own tree rather than sharing one with branches in it; the two builds
  // have no markup in common below this point. Nothing animates here
  // either (a real digital readout just changes value), so resetSignal
  // and TICK_MS go unused on this path.
  if (digital) {
    return (
      <div className="dg">
        <div className="dg-stage">
          <div className="dg-frame">
            <div className="dg-label">LITRES</div>
            <div className="dg-digits">
              {/* Digits and commas are flat siblings on one flex row,
                  deliberately NOT nested together — a slot that owned a
                  comma would have to share its flex allowance with it and
                  would come out narrower than the slots that don't. */}
              {digits.map((digit, i) => (
                <Fragment key={i}>
                  <span className="dg-slot">
                    <SevenSegDigit value={digit} />
                  </span>
                  {COMMA_AFTER.includes(i) && (
                    <span className="dg-comma-slot">
                      <SevenSegComma />
                    </span>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="dg-controls">
          <button
            type="button"
            className="dg-button"
            onClick={handleStartStop}
            aria-label={running ? 'Stop' : 'Start'}
          >
            {running ? 'STOP FUEL FLOW' : 'START FUEL FLOW'}
          </button>
          <button
            type="button"
            className="dg-button"
            onClick={handleReset}
            aria-label="Reset"
          >
            STOP THE COUNT
          </button>
        </div>

        <DesignToggle digital={digital} onToggle={handleToggleDesign} />
      </div>
    )
  }

  return (
    <div className="pump">
      <div className="pump-panel">
        <div className="pump-label">LITRES</div>

        <div className="pump-display">
          <div className="display-digits">
            {digits.map((digit, i) => (
              // Each digit-window and each comma is its own flex item here —
              // deliberately NOT nested together in a shared wrapper. Nesting
              // them meant a slot with a comma had to share its flex:1 share
              // with that comma, making that digit-window narrower than the
              // 7 slots with no comma. Flat siblings means every digit-window
              // gets an equal share regardless of neighboring commas.
              <Fragment key={i}>
                <span className="digit-slot">
                  <DigitWheel digit={digit} resetSignal={resetSignal} tickMs={TICK_MS} />
                </span>
                {COMMA_AFTER.includes(i) && <span className="comma">,</span>}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="pump-controls">
        <div className="button-group">
          <span className="button-label">{running ? 'STOP FUEL\nFLOW' : 'START FUEL\nFLOW'}</span>
          <button
            type="button"
            className="pump-button"
            onClick={handleStartStop}
            aria-label={running ? 'Stop' : 'Start'}
          />
        </div>
        <div className="button-group">
          <span className="button-label">{'STOP THE\nCOUNT'}</span>
          <button
            type="button"
            className="pump-button"
            onClick={handleReset}
            aria-label="Reset"
          />
        </div>
      </div>

      <DesignToggle digital={digital} onToggle={handleToggleDesign} />
    </div>
  )
}

export default App
