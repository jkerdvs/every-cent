import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  CURRENT_MONTH_LABEL,
  calculateMonthTotals,
  formatLedgerMoney,
  loadCurrentMonthTransactions,
  loadTransactionCategories,
  loadTransactionSubcategories,
  saveCurrentMonthTransactions,
  types,
} from '../data/currentMonth'
import type { Transaction } from '../data/currentMonth'
import { loadBalanceAccounts } from '../data/balanceSheet'

function getTransactionAmountClass(type: string) {
  if (type === '+' || type === 'Liquidation') return 'positive'
  if (type === '-' || type === 'Investment' || type === 'Savings') {
    return 'negative'
  }

  return 'neutral'
}

function CurrentMonthPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(
    loadCurrentMonthTransactions,
  )

  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [medium, setMedium] = useState('')
  const [type, setType] = useState('')
  const [amountDigits, setAmountDigits] = useState('')
  const [comments, setComments] = useState('')

  useEffect(() => {
    saveCurrentMonthTransactions(transactions)
  }, [transactions])

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.date - a.date)
  }, [transactions])
  const mediumOptions = useMemo(() => {
    return loadBalanceAccounts().map((account) => account.name)
  }, [])
  const categoryOptions = useMemo(() => {
    return loadTransactionCategories().map((item) => item.name)
  }, [])
  const subcategoryOptions = useMemo(() => {
    return loadTransactionSubcategories().map((item) => item.name)
  }, [])

  const { profitCents, lossCents, realizedProfitLossCents } =
    useMemo(() => calculateMonthTotals(transactions), [transactions])

  const realizedProfitLossClass =
    realizedProfitLossCents > 0
      ? 'positive'
      : realizedProfitLossCents < 0
        ? 'negative'
        : 'neutral'

  const amountCents = amountDigits ? Number(amountDigits) : 0
  const amountDisplay = formatLedgerMoney(amountCents)
  const lossClass = lossCents > 0 ? 'negative' : 'neutral'
  const profitClass = profitCents > 0 ? 'positive' : 'neutral'

  function handleAmountChange(value: string) {
    const digitsOnly = value.replace(/\D/g, '')
    setAmountDigits(digitsOnly)
  }

  function handleAmountKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      setAmountDigits((currentValue) => currentValue.slice(0, -1))
    }

    if (event.key === 'Delete') {
      event.preventDefault()
      setAmountDigits('')
    }
  }

  function addTransaction() {
    if (
      !date ||
      !category ||
      !subcategory ||
      !medium ||
      !type ||
      amountCents === 0
    ) {
      return
    }

    const newTransaction: Transaction = {
      id: Date.now(),
      date: Number(date),
      category,
      subcategory,
      medium,
      type,
      amountCents,
      comments,
    }

    setTransactions((currentTransactions) => [
      ...currentTransactions,
      newTransaction,
    ])

    setDate('')
    setCategory('')
    setSubcategory('')
    setMedium('')
    setType('')
    setAmountDigits('')
    setComments('')
  }

  function deleteTransaction(transactionId: number) {
    const confirmed = window.confirm(
      'Delete this transaction?\n\nThis transaction will be permanently removed.',
    )

    if (!confirmed) return

    setTransactions((currentTransactions) =>
      currentTransactions.filter(
        (transaction) => transaction.id !== transactionId,
      ),
    )
  }

  return (
    <main className="current-month">
      <header className="month-header">
        <h1>{CURRENT_MONTH_LABEL}</h1>
      </header>

      <section className="month-summary" aria-label="On the Month">
        <div className="summary-item">
          <span>Profit</span>
          <strong className={profitClass}>
            ${formatLedgerMoney(profitCents)}
          </strong>
        </div>

        <div className="summary-item">
          <span>Loss</span>
          <strong className={lossClass}>
            ${formatLedgerMoney(lossCents)}
          </strong>
        </div>

        <div className="summary-item">
          <span>Net</span>
          <strong className={realizedProfitLossClass}>
            ${formatLedgerMoney(realizedProfitLossCents)}
          </strong>
        </div>
      </section>

      <section className="transaction-entry" aria-label="Add Transaction">
        <div className="transaction-entry-grid">
          <label>
            <span>Date</span>
            <input
              aria-label="Transaction date"
              className="date-input"
              type="number"
              min="1"
              max="31"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>

          <label>
            <span>Category</span>
            <select
              aria-label="Transaction category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="" disabled>
                Select
              </option>

              {categoryOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Subcategory</span>
            <select
              aria-label="Transaction subcategory"
              value={subcategory}
              onChange={(event) => setSubcategory(event.target.value)}
            >
              <option value="" disabled>
                Select
              </option>

              {subcategoryOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Medium</span>
            <select
              aria-label="Transaction medium"
              value={medium}
              onChange={(event) => setMedium(event.target.value)}
            >
              <option value="" disabled>
                Select
              </option>

              {mediumOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Type</span>
            <select
              aria-label="Transaction type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="" disabled>
                Select
              </option>

              {types.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Amount</span>
            <div className="amount-field">
              <span className="currency-symbol">$</span>

              <input
                aria-label="Transaction amount"
                className="amount-input"
                type="text"
                inputMode="numeric"
                value={amountDisplay}
                onChange={(event) =>
                  handleAmountChange(event.target.value)
                }
                onKeyDown={handleAmountKeyDown}
              />
            </div>
          </label>

          <label className="comments-field">
            <span>Comments</span>
            <input
              aria-label="Transaction comments"
              className="comments-input"
              type="text"
              placeholder="Add comments"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
            />
          </label>

          <button
            className="add-transaction"
            type="button"
            onClick={addTransaction}
          >
            + Add Transaction
          </button>
        </div>
      </section>

      <section className="transaction-ledger" aria-label="Transaction Ledger">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Subcategory</th>
              <th>Medium</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Comments</th>
              <th></th>
            </tr>
          </thead>

          <tbody>

          {sortedTransactions.map((transaction) => (
            <tr className="transaction-row" key={transaction.id}>
              <td data-label="Date">{transaction.date}</td>
              <td data-label="Category">{transaction.category}</td>
              <td data-label="Subcategory">{transaction.subcategory}</td>
              <td data-label="Medium">{transaction.medium}</td>
              <td data-label="Type">{transaction.type}</td>
              <td
                className={`ledger-amount ${getTransactionAmountClass(
                  transaction.type,
                )}`}
                data-label="Amount"
              >
                ${formatLedgerMoney(transaction.amountCents)}
              </td>
              <td data-label="Comments">{transaction.comments}</td>
              <td className="transaction-action-cell">
                <button
                  aria-label={`Delete transaction from day ${transaction.date}`}
                  className="delete-transaction"
                  type="button"
                  onClick={() => deleteTransaction(transaction.id)}
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
        </tbody>
      </table>
      </section>
    </main>
  )
}

export default CurrentMonthPage
