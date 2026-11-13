import { useState } from 'react'
import { parseInvestmentAccountColor } from '../data/ownership'

type AccountColorPickerProps = {
  color: string | null
  defaultColor: string
  onChange: (color: string | null) => void
}

export default function AccountColorPicker({
  color: customColor,
  defaultColor,
  onChange,
}: AccountColorPickerProps) {
  const [hexDraft, setHexDraft] = useState<string | null>(null)
  const color = customColor ?? defaultColor

  return (
    <div className="investment-settings-row">
      <label>
        Account color
        <input
          type="color"
          value={color}
          onChange={(event) => {
            setHexDraft(null)
            onChange(event.target.value)
          }}
        />
      </label>
      <input
        aria-label="Hex color"
        aria-invalid={hexDraft !== null && !parseInvestmentAccountColor(hexDraft)}
        className="investment-color-hex"
        maxLength={7}
        placeholder="#RRGGBB"
        spellCheck={false}
        value={hexDraft ?? color}
        onBlur={() => setHexDraft(null)}
        onChange={(event) => {
          const value = event.target.value
          const validColor = parseInvestmentAccountColor(value)

          setHexDraft(value)
          if (validColor) onChange(validColor)
        }}
      />
      <span
        aria-hidden="true"
        className="investment-color-swatch"
        style={{ backgroundColor: color }}
      />
      <button
        type="button"
        onClick={() => {
          setHexDraft(null)
          onChange(null)
        }}
      >
        Reset to default
      </button>
    </div>
  )
}
