export type Holding = {
  id: number
  accountId: string
  accountName: string
  ticker: string
  shares: number
  costBasisCents: number
}

export type StoredHolding = Partial<Holding> & {
  baseShares?: number
  netAdded?: number
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
  totalProceedsCents?: number
  netGainLossCents?: number
  costBasisRemovedCents?: number
  affectsBalance?: boolean
  affectsPosition?: boolean
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
  startingCashCents: number
  optionsTrading: boolean
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
  startingCashCents = 0,
  optionsTrading = false,
): InvestmentAccountConfig {
  return {
    id: `investment-account-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    accountId,
    order,
    startingCashCents,
    optionsTrading,
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
      const shares =
        typeof holding.shares === 'number'
          ? holding.shares
          : holding.baseShares
      const normalizedShares =
        typeof shares === 'number' && Number.isFinite(shares)
          ? shares
          : 0
      const costBasisCents =
        typeof holding.costBasisCents === 'number' &&
        Number.isFinite(holding.costBasisCents)
          ? holding.costBasisCents
          : 0

      return {
        id: holding.id ?? Date.now() + index,
        accountId: holding.accountId ?? 'growth-equity',
        accountName: holding.accountName ?? 'Equity',
        ticker: holding.ticker?.trim().toUpperCase() ?? '',
        shares: normalizedShares,
        costBasisCents,
      }
    })
    .filter((holding) => holding.accountId && holding.ticker)
}

export function saveHoldings(holdings: Holding[]) {
  localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdings))
}

export function upsertHolding(
  holdings: Holding[],
  nextHolding: Holding,
) {
  const existingHolding = holdings.find(
    (holding) =>
      holding.accountId === nextHolding.accountId &&
      holding.ticker === nextHolding.ticker,
  )

  if (!existingHolding) return [...holdings, nextHolding]

  return holdings.map((holding) =>
    holding.id === existingHolding.id
      ? {
          ...holding,
          accountName: nextHolding.accountName,
          shares: holding.shares + nextHolding.shares,
          costBasisCents:
            holding.costBasisCents + nextHolding.costBasisCents,
        }
      : holding,
  )
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

export function loadInvestmentTransactions() {
  const savedTransactions = localStorage.getItem(
    INVESTMENT_TRANSACTIONS_STORAGE_KEY,
  )

  if (!savedTransactions) return []

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
        const totalProceedsCents =
          typeof transaction.totalProceedsCents === 'number' &&
          Number.isFinite(transaction.totalProceedsCents)
            ? Math.round(transaction.totalProceedsCents)
            : undefined
        const netGainLossCents =
          typeof transaction.netGainLossCents === 'number' &&
          Number.isFinite(transaction.netGainLossCents)
            ? Math.round(transaction.netGainLossCents)
            : undefined
        const costBasisRemovedCents =
          typeof transaction.costBasisRemovedCents === 'number' &&
          Number.isFinite(transaction.costBasisRemovedCents)
            ? Math.round(transaction.costBasisRemovedCents)
            : undefined
        const affectsBalance = transaction.affectsBalance !== false
        const affectsPosition = transaction.affectsPosition !== false

        if (
          !type ||
          !ticker ||
          shares <= 0 ||
          (type === 'buy' && amountCents <= 0 && affectsBalance) ||
          (type === 'sell' && amountCents < 0 && affectsBalance)
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
          totalProceedsCents,
          netGainLossCents,
          costBasisRemovedCents,
          affectsBalance,
          affectsPosition,
        }
      })
      .filter((transaction): transaction is InvestmentTransaction =>
        Boolean(transaction),
      )
  } catch {
    return []
  }
}

export function loadInvestmentAccountConfigs(
  balanceAccounts: { id: string; name: string }[],
) {
  const savedConfigs = localStorage.getItem(INVESTMENT_ACCOUNTS_STORAGE_KEY)

  if (!savedConfigs) return []

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
          startingCashCents:
            typeof config.startingCashCents === 'number' &&
            Number.isFinite(config.startingCashCents)
              ? Math.round(config.startingCashCents)
              : 0,
          optionsTrading: config.optionsTrading === true,
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
  holdings = loadHoldings(),
) {
  const positionsByKey = new Map<string, InvestmentPosition>()

  holdings.forEach((holding) => {
    if (holding.shares <= 0) return

    const key = getPositionKey(holding.accountId, holding.ticker)
    const currentPosition = positionsByKey.get(key) ?? {
      accountId: holding.accountId,
      ticker: holding.ticker,
      shares: 0,
      costBasisCents: 0,
    }

    positionsByKey.set(key, {
      ...currentPosition,
      shares: currentPosition.shares + holding.shares,
      costBasisCents:
        currentPosition.costBasisCents + holding.costBasisCents,
    })
  })

  transactions.forEach((transaction) => {
    if (transaction.affectsPosition === false) return

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
      typeof transaction.costBasisRemovedCents === 'number'
        ? transaction.costBasisRemovedCents
        : transaction.shares >= currentPosition.shares
          ? currentPosition.costBasisCents
          : Math.round(
              (currentPosition.costBasisCents * transaction.shares) /
                currentPosition.shares,
            )
    const nextShares = currentPosition.shares - transaction.shares
    const rawNextCostBasisCents = currentPosition.costBasisCents - basisRemoved
    const nextCostBasisCents =
      nextShares <= 0 || Math.abs(rawNextCostBasisCents) <= 1
        ? 0
        : rawNextCostBasisCents

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
  holdings = loadHoldings(),
) {
  const positions = deriveInvestmentPositions(transactions, holdings)
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
  return (
    getInvestmentStartingCashForAccount(accountId) +
    loadInvestmentTransactions()
      .filter(
        (transaction) =>
          transaction.accountId === accountId &&
          transaction.affectsBalance !== false,
      )
      .reduce((total, transaction) => {
        if (transaction.type === 'buy') {
          return total - transaction.amountCents
        }

        return total + transaction.amountCents
      }, 0)
  )
}

export function getInvestmentStartingCashForAccount(accountId: string) {
  const savedConfigs = localStorage.getItem(INVESTMENT_ACCOUNTS_STORAGE_KEY)

  if (!savedConfigs) return 0

  try {
    const parsedConfigs = JSON.parse(savedConfigs)

    if (!Array.isArray(parsedConfigs)) return 0

    return parsedConfigs
      .filter((config) => config.accountId === accountId)
      .reduce((total, config) => {
        if (
          typeof config.startingCashCents !== 'number' ||
          !Number.isFinite(config.startingCashCents)
        ) {
          return total
        }

        return total + Math.round(config.startingCashCents)
      }, 0)
  } catch {
    return 0
  }
}

export function validateInvestmentTransactions(
  transactions: InvestmentTransaction[],
  holdings = loadHoldings(),
) {
  const positionsByKey = new Map<string, InvestmentPosition>()

  holdings.forEach((holding) => {
    const key = getPositionKey(holding.accountId, holding.ticker)
    const currentPosition = positionsByKey.get(key) ?? {
      accountId: holding.accountId,
      ticker: holding.ticker,
      shares: 0,
      costBasisCents: 0,
    }

    positionsByKey.set(key, {
      ...currentPosition,
      shares: currentPosition.shares + holding.shares,
      costBasisCents:
        currentPosition.costBasisCents + holding.costBasisCents,
    })
  })

  for (const transaction of transactions) {
    if (transaction.affectsPosition === false) continue

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
      continue
    }

    if (transaction.shares > currentPosition.shares) {
      return {
        valid: false,
        message: `Cannot sell ${formatShares(
          transaction.shares,
        )} shares of ${transaction.ticker}; only ${formatShares(
          currentPosition.shares,
        )} shares are available at that point in the ledger.`,
      }
    }

    const costBasisRemovedCents =
      typeof transaction.costBasisRemovedCents === 'number'
        ? transaction.costBasisRemovedCents
        : transaction.shares >= currentPosition.shares
          ? currentPosition.costBasisCents
          : Math.round(
              (currentPosition.costBasisCents * transaction.shares) /
                currentPosition.shares,
            )

    if (costBasisRemovedCents < 0) {
      return {
        valid: false,
        message: 'Sell cost basis removed cannot be negative.',
      }
    }

    if (costBasisRemovedCents > currentPosition.costBasisCents + 1) {
      return {
        valid: false,
        message: `Cannot remove ${formatMoney(
          costBasisRemovedCents,
        )} of cost basis from ${transaction.ticker}; only ${formatMoney(
          currentPosition.costBasisCents,
        )} is invested.`,
      }
    }

    const nextShares = currentPosition.shares - transaction.shares
    const rawNextCostBasisCents =
      currentPosition.costBasisCents - costBasisRemovedCents
    const nextCostBasisCents =
      Math.abs(rawNextCostBasisCents) <= 1 ? 0 : rawNextCostBasisCents

    if (nextShares <= 0) {
      positionsByKey.delete(key)
    } else {
      positionsByKey.set(key, {
        ...currentPosition,
        shares: nextShares,
        costBasisCents: nextCostBasisCents,
      })
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
