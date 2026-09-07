import { useEffect, useMemo, useState } from 'react'
import {
  getInvestmentAccounts as getInvestmentBalanceAccounts,
  loadBalanceAccounts,
} from '../data/balanceSheet'
import type { BalanceAccount } from '../data/balanceSheet'
import {
  deriveInvestmentPositions,
  formatMoney,
  formatMoneyInput,
  formatShares,
  getAmountInvestedByAccount,
  loadHoldings,
  loadInvestmentAccountConfigs,
  loadInvestmentTransactions,
  saveHoldings,
  saveInvestmentTransactions,
  sortInvestmentAccountConfigs,
  upsertHolding,
  validateInvestmentTransactions,
} from '../data/ownership'
import type {
  Holding,
  InvestmentTransaction,
  InvestmentTransactionType,
} from '../data/ownership'

function getInvestmentAccounts() {
  const balanceAccounts = loadBalanceAccounts()
  const investmentBalanceAccounts = getInvestmentBalanceAccounts(
    balanceAccounts,
  )
  const accountById = new Map(
    investmentBalanceAccounts.map((account) => [account.id, account]),
  )
  const configs = loadInvestmentAccountConfigs(balanceAccounts)

  return sortInvestmentAccountConfigs(
    configs,
    (config) => accountById.get(config.accountId)?.name ?? '',
  )
    .map((config) => accountById.get(config.accountId))
    .filter((account): account is BalanceAccount => Boolean(account))
}

function OwnershipPage() {
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>(
    loadInvestmentTransactions,
  )
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings)
  const [showTransactionEntry, setShowTransactionEntry] = useState(false)
  const [showHoldingEntry, setShowHoldingEntry] = useState(false)
  const [date, setDate] = useState('')
  const [type, setType] = useState<InvestmentTransactionType>('buy')
  const [accountId, setAccountId] = useState(
    () => getInvestmentAccounts()[0]?.id ?? '',
  )
  const [holdingAccountId, setHoldingAccountId] = useState(
    () => getInvestmentAccounts()[0]?.id ?? '',
  )
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')
  const [amountDigits, setAmountDigits] = useState('')
  const [holdingTicker, setHoldingTicker] = useState('')
  const [holdingShares, setHoldingShares] = useState('')
  const [holdingCostBasisDigits, setHoldingCostBasisDigits] = useState('')
  const [validationMessage, setValidationMessage] = useState('')

  useEffect(() => {
    saveInvestmentTransactions(transactions)
  }, [transactions])

  useEffect(() => {
    saveHoldings(holdings)
  }, [holdings])

  const investmentAccounts = useMemo(() => getInvestmentAccounts(), [])
  const accountById = useMemo(() => {
    return new Map(
      investmentAccounts.map((account) => [account.id, account]),
    )
  }, [investmentAccounts])
  const positions = useMemo(
    () => deriveInvestmentPositions(transactions, holdings),
    [transactions, holdings],
  )
  const amountInvestedByAccount = useMemo(
    () => getAmountInvestedByAccount(transactions, holdings),
    [transactions, holdings],
  )
  const totalInvestedCents = useMemo(() => {
    return [...amountInvestedByAccount.values()].reduce(
      (total, amountCents) => total + amountCents,
      0,
    )
  }, [amountInvestedByAccount])
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.id - a.id)
  }, [transactions])

  const amountCents = amountDigits ? Number(amountDigits) : 0
  const holdingCostBasisCents = holdingCostBasisDigits
    ? Number(holdingCostBasisDigits)
    : 0

  function updateAmount(value: string) {
    setAmountDigits(value.replace(/\D/g, ''))
  }

  function updateHoldingCostBasis(value: string) {
    setHoldingCostBasisDigits(value.replace(/\D/g, ''))
  }

  function getAccountName(account: BalanceAccount) {
    return account.name
  }

  function getPosition(accountIdValue: string, tickerValue: string) {
    return positions.find(
      (position) =>
        position.accountId === accountIdValue &&
        position.ticker === tickerValue,
    )
  }

  function addInvestmentTransaction() {
    const cleanTicker = ticker.trim().toUpperCase()
    const parsedShares = Number(shares)
    const account = accountById.get(accountId)

    if (
      !account ||
      !cleanTicker ||
      !Number.isFinite(parsedShares) ||
      parsedShares <= 0 ||
      amountCents <= 0
    ) {
      setValidationMessage(
        'Enter an account, ticker, positive shares, and a positive amount.',
      )
      return
    }

    if (type === 'sell') {
      const currentPosition = getPosition(accountId, cleanTicker)
      const currentShares = currentPosition?.shares ?? 0

      if (parsedShares > currentShares) {
        setValidationMessage(
          `Cannot sell ${formatShares(
            parsedShares,
          )} shares of ${cleanTicker}; only ${formatShares(
            currentShares,
          )} shares are available.`,
        )
        return
      }
    }

    const nextTransaction: InvestmentTransaction = {
      id: Date.now(),
      date: date ? Number(date) : 0,
      type,
      accountId: account.id,
      accountName: getAccountName(account),
      ticker: cleanTicker,
      shares: parsedShares,
      amountCents,
    }
    const nextTransactions = [...transactions, nextTransaction]
    const validation = validateInvestmentTransactions(
      nextTransactions,
      holdings,
    )

    if (!validation.valid) {
      setValidationMessage(validation.message)
      return
    }

    setTransactions(nextTransactions)
    setDate('')
    setType('buy')
    setTicker('')
    setShares('')
    setAmountDigits('')
    setValidationMessage('')
  }

  function deleteInvestmentTransaction(transactionId: number) {
    const nextTransactions = transactions.filter(
      (transaction) => transaction.id !== transactionId,
    )
    const validation = validateInvestmentTransactions(nextTransactions, holdings)

    if (!validation.valid) {
      setValidationMessage(validation.message)
      return
    }

    const confirmed = window.confirm(
      'Delete this investment transaction?\n\nThis transaction will be permanently removed.',
    )

    if (!confirmed) return

    setTransactions(nextTransactions)
    setValidationMessage('')
  }

  function addCurrentHolding() {
    const cleanTicker = holdingTicker.trim().toUpperCase()
    const parsedShares = Number(holdingShares)
    const account = accountById.get(holdingAccountId)

    if (
      !account ||
      !cleanTicker ||
      !Number.isFinite(parsedShares) ||
      parsedShares <= 0 ||
      holdingCostBasisCents < 0
    ) {
      setValidationMessage(
        'Enter an investment account, ticker, positive shares, and a valid cost basis.',
      )
      return
    }

    setHoldings((currentHoldings) =>
      upsertHolding(currentHoldings, {
        id: Date.now(),
        accountId: account.id,
        accountName: getAccountName(account),
        ticker: cleanTicker,
        shares: parsedShares,
        costBasisCents: holdingCostBasisCents,
      }),
    )
    setHoldingTicker('')
    setHoldingShares('')
    setHoldingCostBasisDigits('')
    setValidationMessage('')
  }

  return (
    <main className="ownership-page">
      <div className="ownership-layout">
        <section className="ownership-portfolio">
          <div className="ownership-account-grid">
            {investmentAccounts.map((account) => {
              const accountPositions = positions.filter(
                (position) => position.accountId === account.id,
              )

              return (
                <section
                  className="ownership-account-section"
                  key={account.id}
                >
                  <div className="portfolio-heading">
                    <h2>{getAccountName(account)}</h2>
                  </div>

                  <table className="ownership-table">
                    <thead>
                      <tr>
                        <th>Ticker</th>
                        <th>Shares</th>
                      </tr>
                    </thead>

                    <tbody>
                      {accountPositions.map((position) => (
                        <tr key={`${position.accountId}-${position.ticker}`}>
                          <td>{position.ticker}</td>
                          <td>{formatShares(position.shares)}</td>
                        </tr>
                      ))}

                      {accountPositions.length === 0 ? (
                        <tr>
                          <td className="empty-holdings" colSpan={2}>
                            No open positions.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </section>
              )
            })}
          </div>
        </section>

        <section className="amount-invested">
          <h2>Amount Invested</h2>

          <table className="invested-table">
            <tbody>
              {investmentAccounts.map((account) => (
                <tr key={account.id}>
                  <td>{getAccountName(account)}</td>
                  <td>
                    {formatMoney(amountInvestedByAccount.get(account.id) ?? 0)}
                  </td>
                </tr>
              ))}

              <tr className="total-row">
                <td>Total</td>
                <td>{formatMoney(totalInvestedCents)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <section className="investment-ledger-section investment-entry-section">
        <div className="ownership-action-row">
          <button
            aria-expanded={showTransactionEntry}
            className={`ownership-entry-toggle ${
              showTransactionEntry ? 'active' : ''
            }`}
            type="button"
            onClick={() => {
              setShowTransactionEntry((isOpen) => !isOpen)
              setShowHoldingEntry(false)
            }}
          >
            Transaction
          </button>

          <button
            aria-expanded={showHoldingEntry}
            className={`ownership-entry-toggle ${
              showHoldingEntry ? 'active' : ''
            }`}
            type="button"
            onClick={() => {
              setShowHoldingEntry((isOpen) => !isOpen)
              setShowTransactionEntry(false)
            }}
          >
            Add Current Holding
          </button>
        </div>

        {showTransactionEntry ? (
          <div className="investment-entry">
            <label>
              <span>Date</span>
              <input
                aria-label="Investment date"
                placeholder="Day"
                type="number"
                min="1"
                max="31"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>

            <label>
              <span>Type</span>
              <select
                aria-label="Buy or sell"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as InvestmentTransactionType)
                }
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </label>

            <label>
              <span>Account</span>
              <select
                aria-label="Investment account"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              >
                {investmentAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {getAccountName(account)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Ticker</span>
              <input
                aria-label="Ticker"
                placeholder="Ticker"
                type="text"
                value={ticker}
                onChange={(event) =>
                  setTicker(event.target.value.toUpperCase())
                }
              />
            </label>

            <label>
              <span>Shares</span>
              <input
                aria-label="Shares"
                placeholder="Shares"
                type="number"
                step="any"
                value={shares}
                onChange={(event) => setShares(event.target.value)}
              />
            </label>

            <label>
              <span>Amount</span>
              <div className="investment-amount-field">
                <span>$</span>
                <input
                  aria-label="Transaction Amount"
                  inputMode="numeric"
                  placeholder="Amount"
                  type="text"
                  value={formatMoneyInput(amountCents)}
                  onChange={(event) => updateAmount(event.target.value)}
                />
              </div>
            </label>

            <button type="button" onClick={addInvestmentTransaction}>
              Add Transaction
            </button>
          </div>
        ) : null}

        {showHoldingEntry ? (
          <div className="current-holding-entry">
            <label>
              <span>Account</span>
              <select
                aria-label="Current holding account"
                value={holdingAccountId}
                onChange={(event) => setHoldingAccountId(event.target.value)}
              >
                {investmentAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {getAccountName(account)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Ticker</span>
              <input
                aria-label="Current holding ticker"
                placeholder="Ticker"
                type="text"
                value={holdingTicker}
                onChange={(event) =>
                  setHoldingTicker(event.target.value.toUpperCase())
                }
              />
            </label>

            <label>
              <span>Shares</span>
              <input
                aria-label="Current holding shares"
                placeholder="Shares"
                type="number"
                step="any"
                value={holdingShares}
                onChange={(event) => setHoldingShares(event.target.value)}
              />
            </label>

            <label>
              <span>Cost Basis</span>
              <div className="investment-amount-field">
                <span>$</span>
                <input
                  aria-label="Current holding cost basis"
                  inputMode="numeric"
                  placeholder="Cost Basis"
                  type="text"
                  value={formatMoneyInput(holdingCostBasisCents)}
                  onChange={(event) =>
                    updateHoldingCostBasis(event.target.value)
                  }
                />
              </div>
            </label>

            <button type="button" onClick={addCurrentHolding}>
              Add Holding
            </button>
          </div>
        ) : null}

        {validationMessage ? (
          <p className="ownership-validation">{validationMessage}</p>
        ) : null}
      </section>

      <section className="investment-ledger-section">
        <h2>Recent Transactions</h2>

        <table className="investment-ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Account</th>
              <th>Ticker</th>
              <th>Shares</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {sortedTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.date || ''}</td>
                <td className={`investment-type ${transaction.type}`}>
                  {transaction.type === 'buy' ? 'Buy' : 'Sell'}
                </td>
                <td>
                  {accountById.get(transaction.accountId)?.name ??
                    transaction.accountName}
                </td>
                <td>{transaction.ticker}</td>
                <td>{formatShares(transaction.shares)}</td>
                <td>{formatMoney(transaction.amountCents)}</td>
                <td className="transaction-action-cell">
                  <button
                    aria-label={`Delete ${transaction.ticker} investment transaction`}
                    className="delete-transaction"
                    type="button"
                    onClick={() =>
                      deleteInvestmentTransaction(transaction.id)
                    }
                  >
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
                  </button>
                </td>
              </tr>
            ))}

            {sortedTransactions.length === 0 ? (
              <tr>
                <td className="empty-holdings" colSpan={7}>
                  No investment transactions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}

export default OwnershipPage
