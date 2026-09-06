export type Holding = {
  id: number
  ticker: string
  baseShares: number
  netAdded: number
}

export type StoredHolding = Partial<Holding> & {
  accountId?: string
  accountName?: string
  costBasisCents?: number
  shares?: number
}

export type InvestedAccount = {
  name: string
  amountCents: number
}

export type InvestmentTransactionType = 'buy' | 'sell'

export type InvestmentTransaction = {
  id: number
  date: number
  type: InvestmentTransactionType
  accountId: string
  accountName: string
  ticker: string
  shares: number
  amountCents: number
  affectsBalance?: boolean
}

export type InvestmentPosition = {
  accountId: string
  ticker: string
  shares: number
  costBasisCents: number
}

export type InvestmentAccountConfig = {
  id: string
  accountId: string
  order: number
}

export const HOLDINGS_STORAGE_KEY = 'every-cent-ownership-holdings'
export const INVESTED_STORAGE_KEY =
  'every-cent-ownership-amount-invested'
export const INVESTMENT_TRANSACTIONS_STORAGE_KEY =
  'every-cent-ownership-investment-transactions'
export const INVESTMENT_ACCOUNTS_STORAGE_KEY =
  'every-cent-ownership-investment-accounts'

export const canonicalInvestedAccounts: InvestedAccount[] = [
  { name: 'Equity', amountCents: 112820 },
  { name: 'Equities', amountCents: 0 },
  { name: 'Roth', amountCents: 459549 },
  { name: 'Coinbase', amountCents: 120586 },
]

export const canonicalInvestmentAccountNames = canonicalInvestedAccounts.map(
  (account) => account.name,
)

export function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function formatMoneyInput(cents: number) {
  return (cents / 100).toFixed(2)
}

export function formatShares(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
  }).format(value)
}

export function parseMoneyInputToCents(value: string) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return 0

  return Math.round(numericValue * 100)
}

export function createInvestmentAccountConfig(
  accountId: string,
  order: number,
): InvestmentAccountConfig {
  return {
    id: `investment-account-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    accountId,
    order,
  }
}

export function loadStoredArray<T>(key: string, fallback: T[]) {
  const savedValue = localStorage.getItem(key)

  if (!savedValue) return fallback

  try {
    const parsedValue = JSON.parse(savedValue)

    if (!Array.isArray(parsedValue)) return fallback

    return parsedValue as T[]
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

function getLegacyAccountAmount(name: string) {
  const savedAccounts = loadStoredArray<InvestedAccount>(
    INVESTED_STORAGE_KEY,
    [],
  )
  const savedByName = new Map(
    savedAccounts.map((account) => [account.name, account.amountCents]),
  )

  if (name === 'Equity') {
    return savedByName.get('Equity') ?? savedByName.get('Robinhood') ?? 0
  }

  return savedByName.get(name) ?? 0
}

function loadLegacyInvestmentTransactions() {
  const holdings = loadStoredArray<StoredHolding>(HOLDINGS_STORAGE_KEY, [])

  return holdings
    .map((holding, index): InvestmentTransaction | null => {
      const baseShares =
        typeof holding.baseShares === 'number'
          ? holding.baseShares
          : holding.shares
      const shares =
        typeof baseShares === 'number' && Number.isFinite(baseShares)
          ? baseShares
          : 0
      const ticker = holding.ticker?.trim().toUpperCase() ?? ''

      if (!ticker || shares <= 0) return null

      return {
        id: holding.id ?? Date.now() + index,
        date: 0,
        type: 'buy',
        accountId: holding.accountId ?? 'growth-equity',
        accountName: holding.accountName ?? 'Equity',
        ticker,
        shares,
        amountCents:
          typeof holding.costBasisCents === 'number' &&
          Number.isFinite(holding.costBasisCents)
            ? holding.costBasisCents
            : 0,
        affectsBalance: false,
      }
    })
    .filter((transaction): transaction is InvestmentTransaction =>
      Boolean(transaction),
    )
}

export function loadInvestmentTransactions() {
  const savedTransactions = localStorage.getItem(
    INVESTMENT_TRANSACTIONS_STORAGE_KEY,
  )

  if (!savedTransactions) return loadLegacyInvestmentTransactions()

  try {
    const parsedTransactions = JSON.parse(savedTransactions)

    if (!Array.isArray(parsedTransactions)) return []

    return parsedTransactions
      .map((transaction): InvestmentTransaction | null => {
        const type =
          transaction.type === 'sell' || transaction.type === 'buy'
            ? transaction.type
            : null
        const ticker =
          typeof transaction.ticker === 'string'
            ? transaction.ticker.trim().toUpperCase()
            : ''
        const shares =
          typeof transaction.shares === 'number' &&
          Number.isFinite(transaction.shares)
            ? transaction.shares
            : 0
        const amountCents =
          typeof transaction.amountCents === 'number' &&
          Number.isFinite(transaction.amountCents)
            ? transaction.amountCents
            : 0
        const affectsBalance = transaction.affectsBalance !== false

        if (
          !type ||
          !ticker ||
          shares <= 0 ||
          (amountCents <= 0 && affectsBalance)
        ) {
          return null
        }

        return {
          id:
            typeof transaction.id === 'number'
              ? transaction.id
              : Date.now(),
          date:
            typeof transaction.date === 'number' &&
            Number.isFinite(transaction.date)
              ? transaction.date
              : 0,
          type,
          accountId:
            typeof transaction.accountId === 'string'
              ? transaction.accountId
              : '',
          accountName:
            typeof transaction.accountName === 'string'
              ? transaction.accountName
              : '',
          ticker,
          shares,
          amountCents,
          affectsBalance,
        }
      })
      .filter((transaction): transaction is InvestmentTransaction =>
        Boolean(transaction),
      )
  } catch {
    return []
  }
}

function getCanonicalInvestmentConfigs(
  balanceAccounts: { id: string; name: string }[],
) {
  return canonicalInvestmentAccountNames
    .map((name, index) => {
      const account = balanceAccounts.find(
        (balanceAccount) => balanceAccount.name === name,
      )

      if (!account) return null

      return {
        id: `investment-account-${account.id}`,
        accountId: account.id,
        order: index + 1,
      }
    })
    .filter((config): config is InvestmentAccountConfig => Boolean(config))
}

export function loadInvestmentAccountConfigs(
  balanceAccounts: { id: string; name: string }[],
) {
  const savedConfigs = localStorage.getItem(INVESTMENT_ACCOUNTS_STORAGE_KEY)

  if (!savedConfigs) return getCanonicalInvestmentConfigs(balanceAccounts)

  try {
    const parsedConfigs = JSON.parse(savedConfigs)

    if (!Array.isArray(parsedConfigs)) return []

    const accountIds = new Set(
      balanceAccounts.map((account) => account.id),
    )

    return parsedConfigs
      .map((config, index): InvestmentAccountConfig | null => {
        const accountId =
          typeof config.accountId === 'string' ? config.accountId : ''

        if (!accountId || !accountIds.has(accountId)) return null

        return {
          id:
            typeof config.id === 'string'
              ? config.id
              : `investment-account-${accountId}`,
          accountId,
          order:
            typeof config.order === 'number' &&
            Number.isFinite(config.order)
              ? Math.trunc(config.order)
              : index + 1,
        }
      })
      .filter((config): config is InvestmentAccountConfig =>
        Boolean(config),
      )
  } catch {
    return []
  }
}

export function saveInvestmentAccountConfigs(
  configs: InvestmentAccountConfig[],
) {
  localStorage.setItem(
    INVESTMENT_ACCOUNTS_STORAGE_KEY,
    JSON.stringify(configs),
  )
}

export function sortInvestmentAccountConfigs<
  AccountConfig extends InvestmentAccountConfig,
>(
  configs: AccountConfig[],
  getName: (config: AccountConfig) => string,
) {
  return [...configs].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order

    return getName(a).localeCompare(getName(b))
  })
}

export function saveInvestmentTransactions(
  transactions: InvestmentTransaction[],
) {
  localStorage.setItem(
    INVESTMENT_TRANSACTIONS_STORAGE_KEY,
    JSON.stringify(transactions),
  )
}

function getPositionKey(accountId: string, ticker: string) {
  return `${accountId}:${ticker}`
}

export function deriveInvestmentPositions(
  transactions: InvestmentTransaction[],
) {
  const positionsByKey = new Map<string, InvestmentPosition>()

  transactions.forEach((transaction) => {
    const key = getPositionKey(transaction.accountId, transaction.ticker)
    const currentPosition = positionsByKey.get(key) ?? {
      accountId: transaction.accountId,
      ticker: transaction.ticker,
      shares: 0,
      costBasisCents: 0,
    }

    if (transaction.type === 'buy') {
      positionsByKey.set(key, {
        ...currentPosition,
        shares: currentPosition.shares + transaction.shares,
        costBasisCents:
          currentPosition.costBasisCents + transaction.amountCents,
      })
      return
    }

    if (currentPosition.shares <= 0) return

    const basisRemoved =
      transaction.shares >= currentPosition.shares
        ? currentPosition.costBasisCents
        : Math.round(
            (currentPosition.costBasisCents * transaction.shares) /
              currentPosition.shares,
          )
    const nextShares = currentPosition.shares - transaction.shares
    const nextCostBasisCents =
      nextShares <= 0 ? 0 : currentPosition.costBasisCents - basisRemoved

    if (nextShares <= 0) {
      positionsByKey.delete(key)
      return
    }

    positionsByKey.set(key, {
      ...currentPosition,
      shares: nextShares,
      costBasisCents: nextCostBasisCents,
    })
  })

  return [...positionsByKey.values()].sort((a, b) => {
    if (a.accountId !== b.accountId) {
      return a.accountId.localeCompare(b.accountId)
    }

    return a.ticker.localeCompare(b.ticker)
  })
}

export function getAmountInvestedByAccount(
  transactions: InvestmentTransaction[],
) {
  const positions = deriveInvestmentPositions(transactions)
  const amountByAccountId = new Map<string, number>()

  positions.forEach((position) => {
    amountByAccountId.set(
      position.accountId,
      (amountByAccountId.get(position.accountId) ?? 0) +
        position.costBasisCents,
    )
  })

  return amountByAccountId
}

export function getInvestmentCashAdjustmentForAccount(accountId: string) {
  return loadInvestmentTransactions()
    .filter(
      (transaction) =>
        transaction.accountId === accountId &&
        transaction.affectsBalance !== false,
    )
    .reduce((total, transaction) => {
      if (transaction.type === 'buy') return total - transaction.amountCents

      return total + transaction.amountCents
    }, 0)
}

export function validateInvestmentTransactions(
  transactions: InvestmentTransaction[],
) {
  const sharesByKey = new Map<string, number>()

  for (const transaction of transactions) {
    const key = getPositionKey(transaction.accountId, transaction.ticker)
    const currentShares = sharesByKey.get(key) ?? 0

    if (transaction.type === 'buy') {
      sharesByKey.set(key, currentShares + transaction.shares)
      continue
    }

    if (transaction.shares > currentShares) {
      return {
        valid: false,
        message: `Cannot sell ${formatShares(
          transaction.shares,
        )} shares of ${transaction.ticker}; only ${formatShares(
          currentShares,
        )} shares are available at that point in the ledger.`,
      }
    }

    const nextShares = currentShares - transaction.shares

    if (nextShares <= 0) {
      sharesByKey.delete(key)
    } else {
      sharesByKey.set(key, nextShares)
    }
  }

  return {
    valid: true,
    message: '',
  }
}

export function loadInvestedAccounts() {
  const transactions = loadInvestmentTransactions()

  if (transactions.length === 0) {
    return canonicalInvestedAccounts.map((account) => ({
      ...account,
      amountCents: getLegacyAccountAmount(account.name),
    }))
  }

  const amountByAccountId = getAmountInvestedByAccount(transactions)

  return [...amountByAccountId.entries()].map(([name, amountCents]) => ({
    name,
    amountCents,
  }))
}
