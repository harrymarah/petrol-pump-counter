import { useEffect, useRef, useState } from 'react'
import DigitWheel from './DigitWheel.jsx'
import './App.css'

const DIGIT_COUNT = 10  // covers up to 9,999,999,999 — the real target is in the billions
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
// Tuned so a full run (0 to MAX_VALUE, ~10 billion) takes ~15-20s: with
// RAMP_TICKS of quadratic ease-in then steady state, average full-speed
// throughput is MAX_RATE * 0.75 per tick (see the 0.5 + 0.5*random below).
const MAX_RATE = 95_000_000  // average increments/tick at full speed
const RAMP_TICKS = 8  // ticks to reach full speed (~1 s)
const MAX_VALUE = 10 ** DIGIT_COUNT - 1

function App() {
  const [value, setValue] = useState(0)
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

  const digits = String(value).padStart(DIGIT_COUNT, '0').split('').map(Number)

  return (
    <div className="pump">
      <div className="pump-label">LITRES</div>

      <div className="pump-display">
        <div className="display-digits">
          {digits.map((digit, i) => (
            <span className="digit-slot" key={i}>
              <DigitWheel digit={digit} resetSignal={resetSignal} tickMs={TICK_MS} />
              {COMMA_AFTER.includes(i) && <span className="comma">,</span>}
            </span>
          ))}
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
    </div>
  )
}

export default App
