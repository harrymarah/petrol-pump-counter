import { useEffect, useRef, useState } from 'react'
import DigitWheel from './DigitWheel.jsx'
import './App.css'

const DIGIT_COUNT = 8
// Positions (0-indexed from the left) after which a comma is printed.
const COMMA_AFTER = [1, 4]
const TICK_MS = 50
const MAX_RATE = 5000  // average increments/tick at full speed
const RAMP_TICKS = 20  // ticks to reach full speed (~1 s)
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
              <DigitWheel digit={digit} resetSignal={resetSignal} />
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
