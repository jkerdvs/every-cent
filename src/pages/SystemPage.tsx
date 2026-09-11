import { useEffect, useMemo, useState } from 'react'
import CalendarDatePicker from '../components/CalendarDatePicker'
import {
  getBalanceSections,
  loadBalanceAccounts,
} from '../data/balanceSheet'
import { loadCurrentMonthTransactions } from '../data/currentMonth'
import {
  loadInvestmentAccountConfigs,
  sortInvestmentAccountConfigs,
} from '../data/ownership'
import {
  formatSystemMoney,
  formatSystemMoneyInput,
  getOptionsCashAdjustmentForAccountFromTrades,
  loadOptionTrades,
  parseSystemMoneyInputToCents,
  saveOptionTrades,
} from '../data/system'
import type { OptionTrade, OptionType } from '../data/system'
import type { BalanceAccount } from '../data/balanceSheet'

type EntryMode = OptionType | null

const emptyForm = {
  accountId: '',
  ticker: '',
  expiration: '',
  strikeValue: '',
  costBasisDigits: '',
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      viewBox="0 0 24 24"
      width="14"
    >
      <path
        d="M3 6h18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M8 6V4h8v2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M6 6l1 15h10l1-15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M10 11v6M14 11v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      viewBox="0 0 24 24"
      width="14"
    >
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function parseDatePickerInput(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  return year * 10000 + month * 100 + day
}

function getDateParts(value: number) {
  const year = Math.floor(value / 10000)
  const month = Math.floor((value % 10000) / 100)
  const day = value % 100

  return { day, month, year }
}

function getTodayDateValue() {
  const today = new Date()

  return (
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate()
  )
}

function getCalendarDayIndex(value: number) {
  const { day, month, year } = getDateParts(value)

  return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

function formatDte(expiration: number, today: number) {
  return `${
    getCalendarDayIndex(expiration) - getCalendarDayIndex(today)
  } DTE`
}

function parseRealizedProfitLossInput(value: string) {
  const normalizedValue = value.trim().replace(/[$,]/g, '')

  if (
    !normalizedValue ||
    normalizedValue === '-' ||
    normalizedValue === '+' ||
    normalizedValue === '.' ||
    normalizedValue === '-.' ||
    normalizedValue === '+.'
  ) {
    return null
  }

  const numericValue = Number(normalizedValue)

  if (!Number.isFinite(numericValue)) return null

  return parseSystemMoneyInputToCents(normalizedValue)
}

function getNextTradeNo(trades: OptionTrade[]) {
  return (
    trades.reduce(
      (highestTradeNo, trade) =>
        Math.max(highestTradeNo, trade.tradeNo),
      0,
    ) + 1
  )
}

function getOptionsTradingAccounts() {
  const balanceAccounts = loadBalanceAccounts()
  const accountById = new Map(
    balanceAccounts.map((account) => [account.id, account]),
  )
  const configs = loadInvestmentAccountConfigs(balanceAccounts).filter(
    (config) => config.optionsTrading,
  )

  return sortInvestmentAccountConfigs(
    configs,
    (config) => accountById.get(config.accountId)?.name ?? '',
  )
    .map((config) => accountById.get(config.accountId))
    .filter((account): account is BalanceAccount => Boolean(account))
}

function SystemPage() {
  const [trades, setTrades] = useState<OptionTrade[]>(loadOptionTrades)
  const [entryMode, setEntryMode] = useState<EntryMode>(null)
  const [form, setForm] = useState(emptyForm)
  const [todayDateValue, setTodayDateValue] = useState(getTodayDateValue)
  const [realizedProfitLossInputs, setRealizedProfitLossInputs] =
    useState<Record<number, string>>({})
  const [validationMessage, setValidationMessage] = useState('')
  const optionsTradingAccounts = useMemo(() => getOptionsTradingAccounts(), [])
  const accountById = useMemo(() => {
    return new Map(
      optionsTradingAccounts.map((account) => [account.id, account]),
    )
  }, [optionsTradingAccounts])
  const openTrades = useMemo(
    () => trades.filter((trade) => trade.status === 'open'),
    [trades],
  )
  const openCostBasisCents = useMemo(() => {
    return openTrades.reduce(
      (total, trade) => total + trade.costBasisCents,
      0,
    )
  }, [openTrades])
  const realizedProfitLossCents = useMemo(() => {
    return trades.reduce(
      (total, trade) =>
        trade.status === 'closed'
          ? total + (trade.realizedProfitLossCents ?? 0)
          : total,
      0,
    )
  }, [trades])
  const tradingAccountBalanceCents = useMemo(() => {
    const eligibleAccountIds = new Set(
      optionsTradingAccounts.map((account) => account.id),
    )

    return getBalanceSections(
      loadBalanceAccounts(),
      loadCurrentMonthTransactions(),
      (accountId) =>
        getOptionsCashAdjustmentForAccountFromTrades(accountId, trades),
    ).reduce((total, section) => {
      return (
        total +
        section.accounts
          .filter((account) => eligibleAccountIds.has(account.id))
          .reduce(
            (sectionTotal, account) =>
              sectionTotal + account.balanceCents,
            0,
          )
      )
    }, 0)
  }, [optionsTradingAccounts, trades])
  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => b.tradeNo - a.tradeNo)
  }, [trades])
  const strikeCents = parseSystemMoneyInputToCents(form.strikeValue)
  const costBasisCents = form.costBasisDigits
    ? Number(form.costBasisDigits)
    : 0
  const realizedClass =
    realizedProfitLossCents > 0
      ? 'positive'
      : realizedProfitLossCents < 0
        ? 'negative'
        : 'neutral'

  useEffect(() => {
    saveOptionTrades(trades)
  }, [trades])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTodayDateValue(getTodayDateValue())
    }, 60000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  function updateMoneyDigits(
    value: string,
    field: 'costBasisDigits',
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value.replace(/\D/g, ''),
    }))
  }

  function updateStrikeValue(value: string) {
    const cleanValue = value.replace(/[^\d.]/g, '')
    const [wholeValue = '', ...decimalParts] = cleanValue.split('.')

    setForm((currentForm) => ({
      ...currentForm,
      strikeValue:
        decimalParts.length > 0
          ? `${wholeValue}.${decimalParts.join('')}`
          : wholeValue,
    }))
  }

  function getRealizedProfitLossInputValue(trade: OptionTrade) {
    const inputValue = realizedProfitLossInputs[trade.id]

    if (typeof inputValue === 'string') return inputValue
    if (typeof trade.realizedProfitLossCents !== 'number') return ''

    return formatSystemMoneyInput(trade.realizedProfitLossCents)
  }

  function updateRealizedProfitLoss(trade: OptionTrade, value: string) {
    if (trade.status !== 'open') return

    const parsedCents = parseRealizedProfitLossInput(value)

    setRealizedProfitLossInputs((currentInputs) => ({
      ...currentInputs,
      [trade.id]: value,
    }))

    setTrades((currentTrades) =>
      currentTrades.map((currentTrade) => {
        if (currentTrade.id !== trade.id || currentTrade.status !== 'open') {
          return currentTrade
        }

        if (parsedCents === null) {
          if (value.trim()) return currentTrade

          const nextTrade = { ...currentTrade }
          delete nextTrade.realizedProfitLossCents

          return nextTrade
        }

        return {
          ...currentTrade,
          realizedProfitLossCents: parsedCents,
        }
      }),
    )
  }

  function normalizeRealizedProfitLossInput(tradeId: number) {
    setRealizedProfitLossInputs((currentInputs) => {
      const nextInputs = { ...currentInputs }
      delete nextInputs[tradeId]

      return nextInputs
    })
  }

  function addOptionTrade() {
    if (!entryMode) return

    const account = accountById.get(form.accountId)
    const expiration = parseDatePickerInput(form.expiration)
    const ticker = form.ticker.trim().toUpperCase()

    if (
      !account ||
      expiration === null ||
      !ticker ||
      strikeCents <= 0 ||
      costBasisCents <= 0
    ) {
      setValidationMessage(
        'Enter account, expiration, ticker, strike, and cost basis.',
      )
      return
    }

    setTrades((currentTrades) => [
      {
        id: Date.now(),
        tradeNo: getNextTradeNo(currentTrades),
        accountId: account.id,
        accountName: account.name,
        ticker,
        optionType: entryMode,
        expiration,
        strikeCents,
        costBasisCents,
        status: 'open',
      },
      ...currentTrades,
    ])
    setForm(emptyForm)
    setValidationMessage('')
  }

  function deleteTrade(trade: OptionTrade) {
    const confirmed = window.confirm(
      `Delete trade ${trade.tradeNo}: ${trade.ticker} ${trade.optionType === 'call' ? 'call' : 'put'}?\n\nThis options trade will be permanently removed and its brokerage cash effect will be undone.`,
    )

    if (!confirmed) return

    normalizeRealizedProfitLossInput(trade.id)
    setTrades((currentTrades) =>
      currentTrades.filter((currentTrade) => currentTrade.id !== trade.id),
    )
  }

  function closeTrade(trade: OptionTrade) {
    if (trade.status !== 'open') return

    const realizedProfitLossCents = trade.realizedProfitLossCents

    if (typeof realizedProfitLossCents !== 'number') {
      setValidationMessage(
        `Enter realized P/L for ${trade.ticker} before closing the trade.`,
      )
      return
    }

    setTrades((currentTrades) =>
      currentTrades.map((currentTrade) => {
        if (
          currentTrade.id !== trade.id ||
          currentTrade.status !== 'open'
        ) {
          return currentTrade
        }

        return {
          ...currentTrade,
          status: 'closed',
          closeDate: getTodayDateValue(),
          proceedsCents:
            currentTrade.costBasisCents + realizedProfitLossCents,
        }
      }),
    )
    normalizeRealizedProfitLossInput(trade.id)
    setValidationMessage('')
  }

  return (
    <main className="system-page">
      <section className="system-stats" aria-label="Options statistics">
        <div className="system-stat">
          <span>Open Cost Basis</span>
          <strong>{formatSystemMoney(openCostBasisCents)}</strong>
        </div>

        <div className="system-stat">
          <span>Open Positions</span>
          <strong>{openTrades.length}</strong>
        </div>

        <div className="system-stat">
          <span>Realized P/L</span>
          <strong className={realizedClass}>
            {formatSystemMoney(realizedProfitLossCents)}
          </strong>
        </div>

        <div className="system-stat">
          <span>Trading Account Balance</span>
          <strong>{formatSystemMoney(tradingAccountBalanceCents)}</strong>
        </div>
      </section>

      <section className="system-entry-section" aria-label="Add option">
        <div className="ownership-action-row">
          <button
            aria-expanded={entryMode === 'call'}
            className={`ownership-entry-toggle buy-toggle ${
              entryMode === 'call' ? 'active' : ''
            }`}
            type="button"
            onClick={() => {
              setEntryMode((currentMode) =>
                currentMode === 'call' ? null : 'call',
              )
              setValidationMessage('')
            }}
          >
            Call
          </button>

          <button
            aria-expanded={entryMode === 'put'}
            className={`ownership-entry-toggle sell-toggle ${
              entryMode === 'put' ? 'active' : ''
            }`}
            type="button"
            onClick={() => {
              setEntryMode((currentMode) =>
                currentMode === 'put' ? null : 'put',
              )
              setValidationMessage('')
            }}
          >
            Put
          </button>
        </div>

        {entryMode ? (
          <div className="system-option-entry">
            <label>
              <span>Account</span>
              <select
                aria-label={`${entryMode} options account`}
                value={form.accountId}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    accountId: event.target.value,
                  }))
                }
              >
                <option value="" disabled></option>

                {optionsTradingAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Ticker</span>
              <input
                aria-label={`${entryMode} ticker`}
                type="text"
                value={form.ticker}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    ticker: event.target.value.toUpperCase(),
                  }))
                }
              />
            </label>

            <label>
              <span>Expiration</span>
              <CalendarDatePicker
                ariaLabel={`${entryMode} expiration`}
                value={form.expiration}
                onChange={(value) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    expiration: value,
                  }))
                }
              />
            </label>

            <label>
              <span>Strike</span>
              <div className="system-strike-field">
                <span>$</span>
                <input
                  aria-label={`${entryMode} strike`}
                  inputMode="decimal"
                  type="text"
                  value={form.strikeValue}
                  onChange={(event) => updateStrikeValue(event.target.value)}
                />
              </div>
            </label>

            <label>
              <span>Cost Basis</span>
              <div className="investment-amount-field">
                <span>$</span>
                <input
                  aria-label={`${entryMode} cost basis`}
                  inputMode="numeric"
                  type="text"
                  value={formatSystemMoneyInput(costBasisCents)}
                  onChange={(event) =>
                    updateMoneyDigits(
                      event.target.value,
                      'costBasisDigits',
                    )
                  }
                />
              </div>
            </label>

            <button
              aria-label={`Add ${entryMode}`}
              type="button"
              onClick={addOptionTrade}
            >
              +
            </button>
          </div>
        ) : null}

        {validationMessage ? (
          <p className="ownership-validation">{validationMessage}</p>
        ) : null}
      </section>

      <section className="system-ledger-section" aria-label="Options ledger">
        <table className="system-ledger-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Account</th>
              <th>Ticker</th>
              <th>C/P</th>
              <th>DTE</th>
              <th>Strike</th>
              <th>Cost Basis</th>
              <th>Status</th>
              <th>Realized P/L</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {sortedTrades.map((trade) => (
              <tr
                className={`system-trade-row ${trade.status}`}
                key={trade.id}
              >
                <td>{trade.tradeNo}</td>
                <td>{trade.accountName}</td>
                <td>{trade.ticker}</td>
                <td>{trade.optionType === 'call' ? 'C' : 'P'}</td>
                <td>{formatDte(trade.expiration, todayDateValue)}</td>
                <td>{formatSystemMoney(trade.strikeCents)}</td>
                <td>{formatSystemMoney(trade.costBasisCents)}</td>
                <td>{trade.status === 'open' ? 'Open' : 'Closed'}</td>
                <td
                  className={
                    typeof trade.realizedProfitLossCents === 'number' &&
                    trade.realizedProfitLossCents < 0
                      ? 'negative'
                      : typeof trade.realizedProfitLossCents === 'number' &&
                          trade.realizedProfitLossCents > 0
                        ? 'positive'
                        : 'neutral'
                  }
                >
                  {trade.status === 'open' ? (
                    <div className="system-realized-field">
                      <span>$</span>
                      <input
                        aria-label={`${trade.ticker} realized profit or loss`}
                        inputMode="decimal"
                        type="text"
                        value={getRealizedProfitLossInputValue(trade)}
                        onBlur={() =>
                          normalizeRealizedProfitLossInput(trade.id)
                        }
                        onChange={(event) =>
                          updateRealizedProfitLoss(
                            trade,
                            event.target.value,
                          )
                        }
                      />
                    </div>
                  ) : typeof trade.realizedProfitLossCents === 'number' ? (
                    formatSystemMoney(trade.realizedProfitLossCents)
                  ) : (
                    formatSystemMoney(0)
                  )}
                </td>
                <td className="system-action-cell">
                  {trade.status === 'open' ? (
                      <button
                        aria-label={`Close ${trade.ticker} option trade`}
                        className="close-system-trade"
                        type="button"
                        onClick={() => closeTrade(trade)}
                      >
                        <CheckIcon />
                      </button>
                  ) : null}

                  <button
                    aria-label={`Delete ${trade.ticker} option trade`}
                    className="delete-transaction"
                    type="button"
                    onClick={() => deleteTrade(trade)}
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}

            {sortedTrades.length === 0 ? (
              <tr>
                <td className="system-empty" colSpan={10}>
                  No options positions.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}

export default SystemPage
