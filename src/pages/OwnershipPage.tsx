import { useEffect, useMemo, useState } from 'react'
import CalendarDatePicker from '../components/CalendarDatePicker'
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
} from '../data/ownership'

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

function formatInvestmentDate(value: number) {
  if (value >= 10000000) {
    const year = Math.floor(value / 10000)
    const month = Math.floor((value % 10000) / 100)
    const day = value % 100

    return `${String(month).padStart(2, '0')}/${String(day).padStart(
      2,
      '0',
    )}/${year}`
  }

  return value ? String(value) : ''
}

function parseSignedMoneyInputToCents(value: string) {
  const normalizedValue = value.trim().replace(/[$,]/g, '')

  if (!normalizedValue) return 0

  const numericValue = Number(normalizedValue)

  if (!Number.isFinite(numericValue)) return Number.NaN

  return Math.round(numericValue * 100)
}

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
  const [showBuyEntry, setShowBuyEntry] = useState(false)
  const [showSellEntry, setShowSellEntry] = useState(false)
  const [showHoldingEntry, setShowHoldingEntry] = useState(false)
  const [showRemoveHoldingEntry, setShowRemoveHoldingEntry] =
    useState(false)
  const [buyDate, setBuyDate] = useState('')
  const [buyAccountId, setBuyAccountId] = useState(
    () => getInvestmentAccounts()[0]?.id ?? '',
  )
  const [sellDate, setSellDate] = useState('')
  const [sellAccountId, setSellAccountId] = useState(
    () => getInvestmentAccounts()[0]?.id ?? '',
  )
  const [holdingAccountId, setHoldingAccountId] = useState(
    () => getInvestmentAccounts()[0]?.id ?? '',
  )
  const [removeHoldingAccountId, setRemoveHoldingAccountId] = useState(
    () => getInvestmentAccounts()[0]?.id ?? '',
  )
  const [buyTicker, setBuyTicker] = useState('')
  const [buyShares, setBuyShares] = useState('')
  const [buyCostBasisDigits, setBuyCostBasisDigits] = useState('')
  const [sellTicker, setSellTicker] = useState('')
  const [sellShares, setSellShares] = useState('')
  const [sellProceedsDigits, setSellProceedsDigits] = useState('')
  const [sellNetGainLoss, setSellNetGainLoss] = useState('')
  const [holdingTicker, setHoldingTicker] = useState('')
  const [holdingShares, setHoldingShares] = useState('')
  const [holdingCostBasisDigits, setHoldingCostBasisDigits] = useState('')
  const [removeHoldingTicker, setRemoveHoldingTicker] = useState('')
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
  const removeHoldingTickerOptions = useMemo(() => {
    return positions
      .filter((position) => position.accountId === removeHoldingAccountId)
      .map((position) => position.ticker)
  }, [positions, removeHoldingAccountId])
  const sellTickerOptions = useMemo(() => {
    return positions
      .filter((position) => position.accountId === sellAccountId)
      .map((position) => position.ticker)
  }, [positions, sellAccountId])

  const buyCostBasisCents = buyCostBasisDigits
    ? Number(buyCostBasisDigits)
    : 0
  const sellProceedsCents = sellProceedsDigits
    ? Number(sellProceedsDigits)
    : 0
  const sellNetGainLossCents = parseSignedMoneyInputToCents(sellNetGainLoss)
  const holdingCostBasisCents = holdingCostBasisDigits
    ? Number(holdingCostBasisDigits)
    : 0

  function updateBuyCostBasis(value: string) {
    setBuyCostBasisDigits(value.replace(/\D/g, ''))
  }

  function updateSellProceeds(value: string) {
    setSellProceedsDigits(value.replace(/\D/g, ''))
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

  function addBuyTransaction() {
    const cleanTicker = buyTicker.trim().toUpperCase()
    const parsedShares = Number(buyShares)
    const parsedDate = parseDatePickerInput(buyDate)
    const account = accountById.get(buyAccountId)

    if (
      !account ||
      parsedDate === null ||
      !cleanTicker ||
      !Number.isFinite(parsedShares) ||
      parsedShares <= 0 ||
      buyCostBasisCents <= 0
    ) {
      setValidationMessage(
        'Select a date, account, ticker, positive shares, and a positive cost basis.',
      )
      return
    }

    const nextTransaction: InvestmentTransaction = {
      id: Date.now(),
      date: parsedDate,
      type: 'buy',
      accountId: account.id,
      accountName: getAccountName(account),
      ticker: cleanTicker,
      shares: parsedShares,
      amountCents: buyCostBasisCents,
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
    setBuyDate('')
    setBuyTicker('')
    setBuyShares('')
    setBuyCostBasisDigits('')
    setValidationMessage('')
  }

  function addSellTransaction() {
    const cleanTicker = sellTicker.trim().toUpperCase()
    const parsedShares = Number(sellShares)
    const parsedDate = parseDatePickerInput(sellDate)
    const account = accountById.get(sellAccountId)
    const currentPosition = getPosition(sellAccountId, cleanTicker)
    const currentShares = currentPosition?.shares ?? 0
    const currentCostBasisCents = currentPosition?.costBasisCents ?? 0
    const costBasisRemovedCents =
      sellProceedsCents - sellNetGainLossCents

    if (
      !account ||
      parsedDate === null ||
      !cleanTicker ||
      !Number.isFinite(parsedShares) ||
      parsedShares <= 0 ||
      sellProceedsCents < 0 ||
      !Number.isFinite(sellNetGainLossCents)
    ) {
      setValidationMessage(
        'Select a date, account, ticker, positive shares, total proceeds, and a valid net gain/loss.',
      )
      return
    }

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

    if (costBasisRemovedCents < 0) {
      setValidationMessage(
        'Net gain/loss cannot imply a negative cost basis removed.',
      )
      return
    }

    if (costBasisRemovedCents > currentCostBasisCents + 1) {
      setValidationMessage(
        `Cannot remove ${formatMoney(
          costBasisRemovedCents,
        )} of cost basis from ${cleanTicker}; only ${formatMoney(
          currentCostBasisCents,
        )} is invested.`,
      )
      return
    }

    const nextTransaction: InvestmentTransaction = {
      id: Date.now(),
      date: parsedDate,
      type: 'sell',
      accountId: account.id,
      accountName: getAccountName(account),
      ticker: cleanTicker,
      shares: parsedShares,
      amountCents: sellProceedsCents,
      totalProceedsCents: sellProceedsCents,
      netGainLossCents: sellNetGainLossCents,
      costBasisRemovedCents,
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
    setSellDate('')
    setSellTicker('')
    setSellShares('')
    setSellProceedsDigits('')
    setSellNetGainLoss('')
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

  function removeHolding() {
    const cleanTicker = removeHoldingTicker.trim().toUpperCase()
    const account = accountById.get(removeHoldingAccountId)
    const hasMatchingPosition = positions.some(
      (position) =>
        position.accountId === removeHoldingAccountId &&
        position.ticker === cleanTicker,
    )

    if (!account || !cleanTicker || !hasMatchingPosition) {
      setValidationMessage('Select an investment account and holding.')
      return
    }

    const confirmed = window.confirm(
      `Remove ${cleanTicker} from ${getAccountName(
        account,
      )}?\n\nThis will remove the holding and amount invested for this position without changing brokerage cash.`,
    )

    if (!confirmed) return

    setHoldings((currentHoldings) =>
      currentHoldings.filter(
        (holding) =>
          holding.accountId !== removeHoldingAccountId ||
          holding.ticker !== cleanTicker,
      ),
    )
    setTransactions((currentTransactions) =>
      currentTransactions.map((transaction) =>
        transaction.accountId === removeHoldingAccountId &&
        transaction.ticker === cleanTicker
          ? { ...transaction, affectsPosition: false }
          : transaction,
      ),
    )
    setRemoveHoldingTicker('')
    setValidationMessage('')
  }

  return (
    <main className="ownership-page">
      <div className="ownership-layout">
        <section className="ownership-portfolio">
          <div className="ownership-account-grid">
            {investmentAccounts.map((account) => {
              const accountPositions = positions
                .filter((position) => position.accountId === account.id)
                .sort((a, b) => {
                  if (a.costBasisCents !== b.costBasisCents) {
                    return b.costBasisCents - a.costBasisCents
                  }

                  return a.ticker.localeCompare(b.ticker)
                })

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
            aria-expanded={showBuyEntry}
            className={`ownership-entry-toggle buy-toggle ${
              showBuyEntry ? 'active' : ''
            }`}
            type="button"
            onClick={() => {
              setShowBuyEntry((isOpen) => !isOpen)
              setShowSellEntry(false)
              setShowHoldingEntry(false)
              setShowRemoveHoldingEntry(false)
            }}
          >
            Buy
          </button>

          <button
            aria-expanded={showSellEntry}
            className={`ownership-entry-toggle sell-toggle ${
              showSellEntry ? 'active' : ''
            }`}
            type="button"
            onClick={() => {
              setShowSellEntry((isOpen) => !isOpen)
              setShowBuyEntry(false)
              setShowHoldingEntry(false)
              setShowRemoveHoldingEntry(false)
            }}
          >
            Sell
          </button>

          <button
            aria-expanded={showHoldingEntry}
            className={`ownership-entry-toggle ${
              showHoldingEntry ? 'active' : ''
            }`}
            type="button"
            onClick={() => {
              setShowHoldingEntry((isOpen) => !isOpen)
              setShowBuyEntry(false)
              setShowSellEntry(false)
              setShowRemoveHoldingEntry(false)
            }}
          >
            Add Existing
          </button>

          <button
            aria-expanded={showRemoveHoldingEntry}
            className={`ownership-entry-toggle ${
              showRemoveHoldingEntry ? 'active' : ''
            }`}
            type="button"
            onClick={() => {
              setShowRemoveHoldingEntry((isOpen) => !isOpen)
              setShowBuyEntry(false)
              setShowSellEntry(false)
              setShowHoldingEntry(false)
            }}
          >
            Remove
          </button>
        </div>

        {showBuyEntry ? (
          <div className="buy-entry">
            <label>
              <span>Date</span>
              <CalendarDatePicker
                ariaLabel="Buy date"
                value={buyDate}
                onChange={setBuyDate}
              />
            </label>

            <label>
              <span>Account</span>
              <select
                aria-label="Buy investment account"
                value={buyAccountId}
                onChange={(event) => setBuyAccountId(event.target.value)}
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
                aria-label="Buy ticker"
                placeholder="Ticker"
                type="text"
                value={buyTicker}
                onChange={(event) =>
                  setBuyTicker(event.target.value.toUpperCase())
                }
              />
            </label>

            <label>
              <span>Shares</span>
              <input
                aria-label="Buy shares"
                placeholder="Shares"
                type="number"
                step="any"
                value={buyShares}
                onChange={(event) => setBuyShares(event.target.value)}
              />
            </label>

            <label>
              <span>Cost Basis</span>
              <div className="investment-amount-field">
                <span>$</span>
                <input
                  aria-label="Buy cost basis"
                  inputMode="numeric"
                  placeholder="Cost Basis"
                  type="text"
                  value={formatMoneyInput(buyCostBasisCents)}
                  onChange={(event) =>
                    updateBuyCostBasis(event.target.value)
                  }
                />
              </div>
            </label>

            <button aria-label="Add buy" type="button" onClick={addBuyTransaction}>
              +
            </button>
          </div>
        ) : null}

        {showSellEntry ? (
          <div className="sell-entry">
            <label>
              <span>Date</span>
              <CalendarDatePicker
                ariaLabel="Sell date"
                value={sellDate}
                onChange={setSellDate}
              />
            </label>

            <label>
              <span>Account</span>
              <select
                aria-label="Sell investment account"
                value={sellAccountId}
                onChange={(event) => {
                  setSellAccountId(event.target.value)
                  setSellTicker('')
                }}
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
              <select
                aria-label="Sell ticker"
                value={sellTicker}
                onChange={(event) => setSellTicker(event.target.value)}
              >
                <option value="">Ticker</option>
                {sellTickerOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Shares</span>
              <input
                aria-label="Sell shares"
                placeholder="Shares"
                type="number"
                step="any"
                value={sellShares}
                onChange={(event) => setSellShares(event.target.value)}
              />
            </label>

            <label>
              <span>Total Proceeds</span>
              <div className="investment-amount-field">
                <span>$</span>
                <input
                  aria-label="Sell total proceeds"
                  inputMode="numeric"
                  placeholder="Total Proceeds"
                  type="text"
                  value={formatMoneyInput(sellProceedsCents)}
                  onChange={(event) =>
                    updateSellProceeds(event.target.value)
                  }
                />
              </div>
            </label>

            <label>
              <span>Net Gain/Loss</span>
              <div className="investment-amount-field">
                <span>$</span>
                <input
                  aria-label="Sell net gain or loss"
                  placeholder="0.00"
                  type="text"
                  value={sellNetGainLoss}
                  onChange={(event) =>
                    setSellNetGainLoss(event.target.value)
                  }
                />
              </div>
            </label>

            <button aria-label="Add sell" type="button" onClick={addSellTransaction}>
              −
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

            <button
              aria-label="Add current holding"
              type="button"
              onClick={addCurrentHolding}
            >
              +
            </button>
          </div>
        ) : null}

        {showRemoveHoldingEntry ? (
          <div className="remove-holding-entry">
            <label>
              <span>Account</span>
              <select
                aria-label="Remove holding account"
                value={removeHoldingAccountId}
                onChange={(event) => {
                  setRemoveHoldingAccountId(event.target.value)
                  setRemoveHoldingTicker('')
                }}
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
              <select
                aria-label="Remove holding ticker"
                value={removeHoldingTicker}
                onChange={(event) =>
                  setRemoveHoldingTicker(event.target.value)
                }
              >
                <option value="">Ticker</option>
                {removeHoldingTickerOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <button
              aria-label="Remove holding"
              type="button"
              onClick={removeHolding}
            >
              −
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
                <td>{formatInvestmentDate(transaction.date)}</td>
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
