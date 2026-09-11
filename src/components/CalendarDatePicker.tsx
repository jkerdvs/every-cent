import { useRef } from 'react'

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      viewBox="0 0 24 24"
      width="14"
    >
      <path
        d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

type CalendarDatePickerProps = {
  ariaLabel: string
  max?: string
  min?: string
  onChange: (value: string) => void
  value: string
}

function CalendarDatePicker({
  ariaLabel,
  max,
  min,
  onChange,
  value,
}: CalendarDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function openPicker() {
    const input = inputRef.current

    if (!input) return

    const dateInput = input as HTMLInputElement & {
      showPicker?: () => void
    }

    input.focus()

    if (dateInput.showPicker) {
      dateInput.showPicker()
      return
    }

    input.click()
  }

  return (
    <div className="calendar-date-picker">
      <button
        aria-label={`${ariaLabel} date picker`}
        type="button"
        onClick={openPicker}
      >
        <CalendarIcon />
      </button>

      <input
        ref={inputRef}
        aria-label={ariaLabel}
        max={max}
        min={min}
        tabIndex={-1}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

export default CalendarDatePicker
