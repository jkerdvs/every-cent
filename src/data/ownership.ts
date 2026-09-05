export type Holding = {
  id: number
  ticker: string
  baseShares: number
  netAdded: number
}

export type StoredHolding = Partial<Holding> & {
  costBasisCents?: number
  shares?: number
}

export type InvestedAccount = {
  name: string
  amountCents: number
}

export const HOLDINGS_STORAGE_KEY = 'every-cent-ownership-holdings'
export const INVESTED_STORAGE_KEY =
  'every-cent-ownership-amount-invested'

export const canonicalInvestedAccounts: InvestedAccount[] = [
  { name: 'Equity', amountCents: 112820 },
  { name: 'Equities', amountCents: 0 },
  { name: 'Roth', amountCents: 459549 },
  { name: 'Coinbase', amountCents: 120586 },
]

export function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function loadStoredArray<T>(key: string, fallback: T[]) {
  const savedValue = localStorage.getItem(key)

  if (!savedValue) return fallback

  try {
    return JSON.parse(savedValue) as T[]
  } catch {
    return fallback
  }
}

export function loadHoldings() {
  return loadStoredArray<StoredHolding>(HOLDINGS_STORAGE_KEY, [])
    .map((holding, index) => {
      const baseShares =
        typeof holding.baseShares === 'number'
          ? holding.baseShares
          : holding.shares
      const normalizedBaseShares =
        typeof baseShares === 'number' && Number.isFinite(baseShares)
          ? baseShares
          : 0
      const normalizedNetAdded =
        typeof holding.netAdded === 'number' &&
        Number.isFinite(holding.netAdded)
          ? holding.netAdded
          : 0

      return {
        id: holding.id ?? Date.now() + index,
        ticker: holding.ticker?.trim().toUpperCase() ?? '',
        baseShares: normalizedBaseShares,
        netAdded: normalizedNetAdded,
      }
    })
    .filter((holding) => holding.ticker)
}

export function loadInvestedAccounts() {
  const savedAccounts = loadStoredArray<InvestedAccount>(
    INVESTED_STORAGE_KEY,
    [],
  )
  const savedByName = new Map(
    savedAccounts.map((account) => [account.name, account.amountCents]),
  )

  return canonicalInvestedAccounts.map((account) => {
    const savedAmount = savedByName.get(account.name)

    if (typeof savedAmount === 'number') {
      return { ...account, amountCents: savedAmount }
    }

    if (account.name === 'Equity') {
      const robinhoodAmount = savedByName.get('Robinhood')

      if (typeof robinhoodAmount === 'number') {
        return { ...account, amountCents: robinhoodAmount }
      }
    }

    return account
  })
}
