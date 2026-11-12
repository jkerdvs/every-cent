import { useState } from 'react'
import {
  averageCapitalRetention, capitalRetention, formatWeekRange, getWeekStart, loadRetentionWeeks,
  parseJournalMoney, saveRetentionWeeks,
} from '../data/capitalRetention'
import type { RetentionWeek } from '../data/capitalRetention'
import { formatSystemMoney } from '../data/system'
import './SystemPage.css'

const emptyForm = { week: '', starting: '', ending: '', invested: '' }

function HistoryChart({ entries }: { entries: RetentionWeek[] }) {
  const chronological = [...entries].reverse()
  const values = chronological.map(capitalRetention)
  const high = Math.max(120, ...values) * 1.1
  const low = Math.max(0, Math.min(80, ...values) - 10)
  const y = (value: number) => 140 - ((value - low) / (high - low)) * 120
  const x = (index: number) => chronological.length === 1 ? 350 : 55 + index * 620 / Math.max(1, chronological.length - 1)
  return (
    <figure className="retention-chart">
      <figcaption>Capital retention history</figcaption>
      <svg viewBox="0 0 700 175" role="img" aria-label="Weekly capital retention with a 100% reference line. Exact values are in the history table.">
        <line x1="55" x2="675" y1={y(100)} y2={y(100)} stroke="#aaa" strokeDasharray="4 4" />
        <text x="4" y={y(100) + 4} fill="#666" fontSize="12">100%</text>
        <polyline points={values.map((value, index) => `${x(index)},${y(value)}`).join(' ')} fill="none" stroke="#333" strokeWidth="2" />
        {chronological.map((entry, index) => (
          <circle key={entry.week} cx={x(index)} cy={y(values[index])} r="3.5" fill="#111">
            <title>{`${formatWeekRange(entry.week)}: ${values[index].toFixed(1)}%`}</title>
          </circle>
        ))}
        {chronological.length > 0 ? <>
          <text x={x(0)} y="168" textAnchor={chronological.length === 1 ? 'middle' : 'start'} fontSize="11" fill="#666">{chronological[0].week}</text>
          {chronological.length > 1 && <text x="675" y="168" textAnchor="end" fontSize="11" fill="#666">{chronological[chronological.length - 1].week}</text>}
        </> : <text x="350" y="130" textAnchor="middle" fill="#777" fontSize="13">Add your first week to begin.</text>}
      </svg>
    </figure>
  )
}

export default function SystemPage() {
  const [entries, setEntries] = useState(loadRetentionWeeks)
  const [form, setForm] = useState(emptyForm)
  const [editingWeek, setEditingWeek] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const sorted = [...entries].sort((a, b) => b.week.localeCompare(a.week))
  const average = averageCapitalRetention(entries)

  function openForm(entry?: RetentionWeek) {
    setEditingWeek(entry?.week ?? null)
    setForm(entry ? {
      week: entry.week, starting: (entry.startingCents / 100).toFixed(2),
      ending: (entry.endingCents / 100).toFixed(2), invested: (entry.investedCents / 100).toFixed(2),
    } : emptyForm)
    setError('')
    setIsOpen(true)
  }

  function save() {
    const week = getWeekStart(form.week)
    const startingCents = parseJournalMoney(form.starting)
    const endingCents = parseJournalMoney(form.ending)
    const investedCents = parseJournalMoney(form.invested)
    if (!week || startingCents === null || startingCents <= 0 || endingCents === null || investedCents === null) {
      setError('Enter a week, starting cash greater than zero, and nonnegative ending cash and invested amounts with up to two decimal places.')
      return
    }
    if (entries.some((entry) => entry.week === week && entry.week !== editingWeek)) {
      setError('This week already has an entry. Edit its existing row instead.')
      return
    }
    const next = [...entries.filter((entry) => entry.week !== editingWeek), { week, startingCents, endingCents, investedCents }]
    try {
      saveRetentionWeeks(next)
      setEntries(next)
      setIsOpen(false)
      setError('')
    } catch {
      setError('Unable to save in this browser. Please try again; your inputs are still here.')
    }
  }

  return (
    <main className="retention-page">
      <h1>Average Weekly Capital Retention</h1>
      <div className="retention-latest" aria-label="Average weekly capital retention">
        <strong>{average === null ? '—' : `${average.toFixed(1)}%`}</strong>
        <span>{entries.length} recorded {entries.length === 1 ? 'week' : 'weeks'}</span>
      </div>
      <HistoryChart entries={sorted} />
      <section aria-labelledby="retention-history-heading">
        <div className="retention-heading">
          <h2 id="retention-history-heading">Weekly history</h2>
          <button type="button" onClick={() => openForm()} aria-expanded={isOpen} aria-controls="retention-form">Add Week</button>
        </div>
        {isOpen && (
          <form id="retention-form" className="retention-form" onSubmit={(event) => { event.preventDefault(); save() }}>
            <h3>{editingWeek ? 'Edit week' : 'Add week'}</h3>
            <label>Week<input autoFocus required type="date" value={form.week} onChange={(event) => setForm({ ...form, week: event.target.value })} /></label>
            {(['starting', 'ending', 'invested'] as const).map((field) => (
              <label key={field}>{field === 'starting' ? 'Starting cash' : field === 'ending' ? 'Ending cash' : 'Invested'}
                <input required type="number" inputMode="decimal" min={field === 'starting' ? '0.01' : '0'} step="0.01" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
              </label>
            ))}
            <p className="retention-help">Select any date in the Monday–Sunday week. Invested is cash moved from your options trading account into long-term holdings that week.</p>
            {error && <p className="retention-error" role="alert">{error}</p>}
            <div className="retention-form-actions">
              <button type="submit">Save Week</button>
              <button type="button" onClick={() => setIsOpen(false)}>Cancel</button>
            </div>
          </form>
        )}
        <div className="retention-table-scroll" role="region" aria-label="Weekly history table" tabIndex={0}>
          <table className="retention-table">
            <thead><tr>{['Week', 'Starting cash', 'Ending cash', 'Invested', 'Capital retention'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>
              {sorted.map((entry) => <tr key={entry.week}>
                <td><button className="retention-edit" type="button" aria-label={`Edit week ${formatWeekRange(entry.week)}`} onClick={() => openForm(entry)}>{formatWeekRange(entry.week)}</button></td>
                <td>{formatSystemMoney(entry.startingCents)}</td>
                <td>{formatSystemMoney(entry.endingCents)}</td>
                <td>{formatSystemMoney(entry.investedCents)}</td>
                <td>{capitalRetention(entry).toFixed(1)}%</td>
              </tr>)}
              {!sorted.length && <tr><td colSpan={5} className="retention-empty">No weeks recorded. Add a week to start your journal.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="retention-help">Capital retention = ((Ending cash + Invested) / Starting cash) × 100. Select a week to edit it.</p>
      </section>
    </main>
  )
}
