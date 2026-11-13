import { useState } from 'react'
import type { SubmitEvent } from 'react'
import AccountColorPicker from './AccountColorPicker'
import type { InvestmentAccountConfig, ShareGoal } from '../data/ownership'

type ShareGoalFormProps = {
  goal?: ShareGoal
  goals: ShareGoal[]
  onSave: (goal: ShareGoal) => void
  onRemove?: () => void
}

function ShareGoalForm({ goal, goals, onSave, onRemove }: ShareGoalFormProps) {
  const [message, setMessage] = useState('')

  function saveGoal(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const ticker = String(fields.get('ticker')).trim().toUpperCase()
    const targetShares = Number(fields.get('targetShares'))

    if (!ticker || !Number.isFinite(targetShares) || targetShares <= 0) {
      setMessage('Enter a ticker and a positive target share count.')
      return
    }

    if (goals.some((item) => item.ticker === ticker && item.ticker !== goal?.ticker)) {
      setMessage(`${ticker} already has a goal for this account.`)
      return
    }

    onSave({ ticker, targetShares })
    setMessage('')
    if (!goal) form.reset()
  }

  return (
    <form className="investment-settings-row" onSubmit={saveGoal}>
      <input
        aria-label={goal ? `${goal.ticker} goal ticker` : 'New goal ticker'}
        defaultValue={goal?.ticker}
        name="ticker"
        placeholder="Ticker"
        required
      />
      <input
        aria-label={goal ? `${goal.ticker} target shares` : 'New goal target shares'}
        defaultValue={goal?.targetShares}
        name="targetShares"
        placeholder="Target shares"
        required
        step="any"
        type="number"
      />
      <button type="submit">{goal ? 'Save goal' : 'Add goal'}</button>
      {onRemove && (
        <button aria-label={`Remove ${goal?.ticker} goal`} type="button" onClick={onRemove}>
          Remove
        </button>
      )}
      {message && <p className="storage-validation" role="alert">{message}</p>}
    </form>
  )
}

type InvestmentAccountSettingsProps = {
  accountName: string
  color: string | null
  defaultColor: string
  shareGoals: ShareGoal[]
  onChange: (settings: Partial<Pick<InvestmentAccountConfig, 'color' | 'shareGoals'>>) => void
}

export default function InvestmentAccountSettings({
  accountName,
  color,
  defaultColor,
  shareGoals,
  onChange,
}: InvestmentAccountSettingsProps) {
  return (
    <details className="investment-settings">
      <summary aria-label={`${accountName} color and share goals`}>Color and share goals</summary>
      <AccountColorPicker
        color={color}
        defaultColor={defaultColor}
        onChange={(color) => onChange({ color })}
      />
      <div className="investment-settings-goals">
        <h3>Share goals</h3>
        {shareGoals.map((goal) => (
          <ShareGoalForm
            key={goal.ticker}
            goal={goal}
            goals={shareGoals}
            onSave={(updatedGoal) => onChange({
              shareGoals: shareGoals.map((item) => item === goal ? updatedGoal : item),
            })}
            onRemove={() => onChange({
              shareGoals: shareGoals.filter((item) => item !== goal),
            })}
          />
        ))}
        <ShareGoalForm
          goals={shareGoals}
          onSave={(goal) => onChange({ shareGoals: [...shareGoals, goal] })}
        />
      </div>
    </details>
  )
}
