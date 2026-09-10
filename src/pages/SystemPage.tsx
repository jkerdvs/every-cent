import { useEffect, useMemo, useState } from 'react'
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
  saveOptionTrades,
} from '../data/system'
import type { OptionTrade, OptionType } from '../data/system'
import type { BalanceAccount } from '../data/balanceSheet'

type EntryMode = OptionType | null

const emptyForm = {
  accountId: '',
  date: '',
  ticker: '',
  expiration: '',
  strikeDigits: '',
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

function parseDateInput(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

  if (!match) return null

  const month = Number(match[1])
  const day = Number(match[2])
  const year = Number(match[3])

  if (
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  return year * 10000 + month * 100 + day
}

function formatSystemDate(value: number) {
  const year = Math.floor(value / 10000)
  const month = Math.floor((value % 10000) / 100)
  const day = value % 100

  return `${String(month).padStart(2, '0')}/${String(day).padStart(
    2,
    '0',
  )}/${year}`
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
      (total, trade) => total + (trade.realizedProfitLossCents ?? 0),
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
    return [...trades].sort((a, b) => b.id - a.id)
  }, [trades])
  const strikeCents = form.strikeDigits ? Number(form.strikeDigits) : 0
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

  function updateMoneyDigits(
    value: string,
    field: 'strikeDigits' | 'costBasisDigits',
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value.replace(/\D/g, ''),
    }))
  }

  function addOptionTrade() {
    if (!entryMode) return

    const account = accountById.get(form.accountId)
    const date = parseDateInput(form.date)
    const expiration = parseDateInput(form.expiration)
    const ticker = form.ticker.trim().toUpperCase()

    if (
      !account ||
      date === null ||
      expiration === null ||
      !ticker ||
      strikeCents <= 0 ||
      costBasisCents <= 0
    ) {
      setValidationMessage(
        'Enter account, dates as MM/DD/YYYY, ticker, strike, and cost basis.',
      )
      return
    }

    setTrades((currentTrades) => [
      {
        id: Date.now(),
        accountId: account.id,
        accountName: account.name,
        date,
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
      `Delete ${trade.ticker} ${trade.optionType === 'call' ? 'call' : 'put'}?\n\nThis options trade will be permanently removed.`,
    )

    if (!confirmed) return

    setTrades((currentTrades) =>
      currentTrades.filter((currentTrade) => currentTrade.id !== trade.id),
    )
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
            className={`ownership-entry-toggle ${
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
            className={`ownership-entry-toggle ${
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
              <span>Date</span>
              <input
                aria-label={`${entryMode} trade date`}
                placeholder="MM/DD/YYYY"
                type="text"
                value={form.date}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    date: event.target.value,
                  }))
                }
              />
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
              <input
                aria-label={`${entryMode} expiration`}
                placeholder="MM/DD/YYYY"
                type="text"
                value={form.expiration}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    expiration: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span>Strike</span>
              <div className="investment-amount-field">
                <span>$</span>
                <input
                  aria-label={`${entryMode} strike`}
                  inputMode="numeric"
                  type="text"
                  value={formatSystemMoneyInput(strikeCents)}
                  onChange={(event) =>
                    updateMoneyDigits(event.target.value, 'strikeDigits')
                  }
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
              <th>Date</th>
              <th>Account</th>
              <th>Ticker</th>
              <th>C/P</th>
              <th>Expiration</th>
              <th>Strike</th>
              <th>Cost Basis</th>
              <th>Status</th>
              <th>Realized P/L</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {sortedTrades.map((trade) => (
              <tr key={trade.id}>
                <td>{formatSystemDate(trade.date)}</td>
                <td>{trade.accountName}</td>
                <td>{trade.ticker}</td>
                <td>{trade.optionType === 'call' ? 'C' : 'P'}</td>
                <td>{formatSystemDate(trade.expiration)}</td>
                <td>{formatSystemMoney(trade.strikeCents)}</td>
                <td>{formatSystemMoney(trade.costBasisCents)}</td>
                <td>{trade.status === 'open' ? 'Open' : 'Closed'}</td>
                <td
                  className={
                    trade.realizedProfitLossCents &&
                    trade.realizedProfitLossCents < 0
                      ? 'negative'
                      : trade.realizedProfitLossCents &&
                          trade.realizedProfitLossCents > 0
                        ? 'positive'
                        : 'neutral'
                  }
                >
                  {trade.status === 'closed' &&
                  typeof trade.realizedProfitLossCents === 'number'
                    ? formatSystemMoney(trade.realizedProfitLossCents)
                    : '—'}
                </td>
                <td className="transaction-action-cell">
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
