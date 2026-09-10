export type OptionType = 'call' | 'put'
export type OptionStatus = 'open' | 'closed'

export type OptionTrade = {
  id: number
  accountId: string
  accountName: string
  date: number
  ticker: string
  optionType: OptionType
  expiration: number
  strikeCents: number
  costBasisCents: number
  status: OptionStatus
  closeDate?: number
  proceedsCents?: number
  realizedProfitLossCents?: number
}

type StoredOptionTrade = Partial<OptionTrade> & {
  callPut?: string
}

export const OPTIONS_TRADES_STORAGE_KEY =
  'every-cent-system-options-trades'

export function formatSystemMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function formatSystemMoneyInput(cents: number) {
  return (cents / 100).toFixed(2)
}

export function parseSystemMoneyInputToCents(value: string) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return 0

  return Math.round(numericValue * 100)
}

export function loadOptionTrades() {
  const savedTrades = localStorage.getItem(OPTIONS_TRADES_STORAGE_KEY)

  if (!savedTrades) return []

  try {
    const parsedTrades = JSON.parse(savedTrades)

    if (!Array.isArray(parsedTrades)) return []

    return parsedTrades
      .map((trade: StoredOptionTrade, index): OptionTrade | null => {
        const optionType =
          trade.optionType === 'call' ||
          trade.optionType === 'put'
            ? trade.optionType
            : trade.callPut === 'Call'
              ? 'call'
              : trade.callPut === 'Put'
                ? 'put'
                : null
        const status =
          trade.status === 'closed' || trade.status === 'open'
            ? trade.status
            : 'open'
        const ticker =
          typeof trade.ticker === 'string'
            ? trade.ticker.trim().toUpperCase()
            : ''
        const costBasisCents =
          typeof trade.costBasisCents === 'number' &&
          Number.isFinite(trade.costBasisCents)
            ? Math.round(trade.costBasisCents)
            : 0
        const strikeCents =
          typeof trade.strikeCents === 'number' &&
          Number.isFinite(trade.strikeCents)
            ? Math.round(trade.strikeCents)
            : 0

        if (
          !optionType ||
          !ticker ||
          !trade.accountId ||
          !trade.accountName ||
          typeof trade.date !== 'number' ||
          typeof trade.expiration !== 'number' ||
          costBasisCents <= 0 ||
          strikeCents <= 0
        ) {
          return null
        }

        return {
          id:
            typeof trade.id === 'number' && Number.isFinite(trade.id)
              ? trade.id
              : Date.now() + index,
          accountId: trade.accountId,
          accountName: trade.accountName,
          date: trade.date,
          ticker,
          optionType,
          expiration: trade.expiration,
          strikeCents,
          costBasisCents,
          status,
          closeDate:
            typeof trade.closeDate === 'number' &&
            Number.isFinite(trade.closeDate)
              ? trade.closeDate
              : undefined,
          proceedsCents:
            typeof trade.proceedsCents === 'number' &&
            Number.isFinite(trade.proceedsCents)
              ? Math.round(trade.proceedsCents)
              : undefined,
          realizedProfitLossCents:
            typeof trade.realizedProfitLossCents === 'number' &&
            Number.isFinite(trade.realizedProfitLossCents)
              ? Math.round(trade.realizedProfitLossCents)
              : undefined,
        }
      })
      .filter((trade): trade is OptionTrade => Boolean(trade))
  } catch {
    return []
  }
}

export function saveOptionTrades(trades: OptionTrade[]) {
  localStorage.setItem(OPTIONS_TRADES_STORAGE_KEY, JSON.stringify(trades))
}

export function getOptionsCashAdjustmentForAccount(accountId: string) {
  return getOptionsCashAdjustmentForAccountFromTrades(
    accountId,
    loadOptionTrades(),
  )
}

export function getOptionsCashAdjustmentForAccountFromTrades(
  accountId: string,
  trades: OptionTrade[],
) {
  return trades
    .filter((trade) => trade.accountId === accountId)
    .reduce((total, trade) => {
      if (trade.status === 'closed') {
        return total + (trade.proceedsCents ?? 0) - trade.costBasisCents
      }

      return total - trade.costBasisCents
    }, 0)
}
