export type RetentionWeek = {
  week: string
  startingCents: number
  endingCents: number
  investedCents: number
}

export const RETENTION_STORAGE_KEY = 'every-cent-system-capital-retention'

// UTC calendar arithmetic keeps week boundaries independent of daylight saving.
export function getWeekStart(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const date = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return ''
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

export function formatWeekRange(week: string) {
  const start = new Date(`${week}T00:00:00Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  const format = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
  return `${format.format(start)} – ${format.format(end)}`
}

export function capitalRetention(entry: RetentionWeek) {
  return ((entry.endingCents + entry.investedCents) / entry.startingCents) * 100
}

export function averageCapitalRetention(entries: RetentionWeek[]) {
  if (entries.length === 0) return null
  return entries.reduce((total, entry) => total + capitalRetention(entry), 0) / entries.length
}

export function parseJournalMoney(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null
  const cents = Math.round(Number(value) * 100)
  return Number.isSafeInteger(cents) && cents <= Number.MAX_SAFE_INTEGER / 2 ? cents : null
}

export function loadRetentionWeeks(): RetentionWeek[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(RETENTION_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(data)) return []
    const seen = new Set<string>()
    return data.filter((entry): entry is RetentionWeek => {
      if (!entry || typeof entry.week !== 'string' || !entry.week ||
          getWeekStart(entry.week) !== entry.week || seen.has(entry.week)) return false
      if (![entry.startingCents, entry.endingCents, entry.investedCents].every(
        (value) => Number.isSafeInteger(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER / 2,
      ) || entry.startingCents <= 0) return false
      seen.add(entry.week)
      return true
    })
  } catch {
    return []
  }
}

export function saveRetentionWeeks(entries: RetentionWeek[]) {
  localStorage.setItem(RETENTION_STORAGE_KEY, JSON.stringify(entries))
}
