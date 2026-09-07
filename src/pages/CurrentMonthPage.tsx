import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  CURRENT_MONTH_LABEL,
  calculateMonthTotals,
  formatLedgerMoney,
  isTransferTransaction,
  loadCurrentMonthTransactions,
  loadTransactionCategories,
  loadTransactionSubcategories,
  saveCurrentMonthTransactions,
  types,
} from '../data/currentMonth'
import type { CurrentMonthEntry, Transaction } from '../data/currentMonth'
import { loadBalanceAccounts } from '../data/balanceSheet'

type EntryMode = 'transaction' | 'transfer'

function getTransactionAmountClass(transaction: CurrentMonthEntry) {
  if (isTransferTransaction(transaction)) return 'neutral'

  const { type } = transaction

  if (type === '+' || type === 'Liquidation') return 'positive'
  if (type === '-' || type === 'Investment' || type === 'Savings') {
    return 'negative'
  }

  return 'neutral'
}

function CurrentMonthPage() {
  const [transactions, setTransactions] = useState<CurrentMonthEntry[]>(
    loadCurrentMonthTransactions,
  )

  const [entryMode, setEntryMode] = useState<EntryMode | null>(null)
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [medium, setMedium] = useState('')
  const [type, setType] = useState('')
  const [amountDigits, setAmountDigits] = useState('')
  const [comments, setComments] = useState('')
  const [transferDate, setTransferDate] = useState('')
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferAmountDigits, setTransferAmountDigits] = useState('')
  const [transferComments, setTransferComments] = useState('')

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
  const transferAmountCents = transferAmountDigits
    ? Number(transferAmountDigits)
    : 0
  const transferAmountDisplay = formatLedgerMoney(transferAmountCents)
  const lossClass = lossCents > 0 ? 'negative' : 'neutral'
  const profitClass = profitCents > 0 ? 'positive' : 'neutral'

  function handleAmountChange(
    value: string,
    setDigits: (value: string) => void,
  ) {
    const digitsOnly = value.replace(/\D/g, '')
    setDigits(digitsOnly)
  }

  function handleAmountKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    setDigits: (value: string | ((currentValue: string) => string)) => void,
  ) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      setDigits((currentValue) => currentValue.slice(0, -1))
    }

    if (event.key === 'Delete') {
      event.preventDefault()
      setDigits('')
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

  function addTransfer() {
    if (
      !transferDate ||
      !transferFrom ||
      !transferTo ||
      transferFrom === transferTo ||
      transferAmountCents === 0
    ) {
      return
    }

    const transferId = `transfer-${Date.now()}`

    setTransactions((currentTransactions) => [
      ...currentTransactions,
      {
        id: Date.now(),
        kind: 'transfer',
        transferId,
        date: Number(transferDate),
        category: 'Transfer',
        subcategory: `${transferFrom} -> ${transferTo}`,
        medium: '',
        type: 'Transfer',
        amountCents: transferAmountCents,
        comments: transferComments,
        fromMedium: transferFrom,
        toMedium: transferTo,
      },
    ])

    setTransferDate('')
    setTransferFrom('')
    setTransferTo('')
    setTransferAmountDigits('')
    setTransferComments('')
  }

  function deleteTransaction(transaction: CurrentMonthEntry) {
    const isTransfer = isTransferTransaction(transaction)
    const confirmed = window.confirm(
      isTransfer
        ? 'Delete this transfer?\n\nBoth sides of this transfer will be permanently removed.'
        : 'Delete this transaction?\n\nThis transaction will be permanently removed.',
    )

    if (!confirmed) return

    setTransactions((currentTransactions) =>
      currentTransactions.filter(
        (currentTransaction) => currentTransaction.id !== transaction.id,
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

      <section className="transaction-entry" aria-label="Add Entry">
        <div className="entry-mode-selector" aria-label="Entry type">
          <button
            aria-pressed={entryMode === 'transaction'}
            className={entryMode === 'transaction' ? 'active' : ''}
            type="button"
            onClick={() => setEntryMode('transaction')}
          >
            Transaction
          </button>

          <button
            aria-pressed={entryMode === 'transfer'}
            className={entryMode === 'transfer' ? 'active' : ''}
            type="button"
            onClick={() => setEntryMode('transfer')}
          >
            Transfer
          </button>
        </div>

        {entryMode === 'transaction' ? (
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
                    handleAmountChange(event.target.value, setAmountDigits)
                  }
                  onKeyDown={(event) =>
                    handleAmountKeyDown(event, setAmountDigits)
                  }
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
        ) : null}

        {entryMode === 'transfer' ? (
          <div className="transfer-entry-grid">
            <label>
              <span>Date</span>
              <input
                aria-label="Transfer date"
                className="date-input"
                type="number"
                min="1"
                max="31"
                value={transferDate}
                onChange={(event) => setTransferDate(event.target.value)}
              />
            </label>

            <label>
              <span>From</span>
              <select
                aria-label="Transfer from account"
                value={transferFrom}
                onChange={(event) => setTransferFrom(event.target.value)}
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
              <span>To</span>
              <select
                aria-label="Transfer to account"
                value={transferTo}
                onChange={(event) => setTransferTo(event.target.value)}
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
              <span>Amount</span>
              <div className="amount-field">
                <span className="currency-symbol">$</span>

                <input
                  aria-label="Transfer amount"
                  className="amount-input"
                  type="text"
                  inputMode="numeric"
                  value={transferAmountDisplay}
                  onChange={(event) =>
                    handleAmountChange(
                      event.target.value,
                      setTransferAmountDigits,
                    )
                  }
                  onKeyDown={(event) =>
                    handleAmountKeyDown(event, setTransferAmountDigits)
                  }
                />
              </div>
            </label>

            <label className="comments-field">
              <span>Comments</span>
              <input
                aria-label="Transfer comments"
                className="comments-input"
                type="text"
                placeholder="Add comments"
                value={transferComments}
                onChange={(event) => setTransferComments(event.target.value)}
              />
            </label>

            <button
              className="add-transaction"
              type="button"
              onClick={addTransfer}
            >
              + Add Transfer
            </button>
          </div>
        ) : null}
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
            {sortedTransactions.map((transaction) => {
              const isTransfer = isTransferTransaction(transaction)
              const subcategoryValue = isTransfer
                ? `${transaction.fromMedium} -> ${transaction.toMedium}`
                : transaction.subcategory

              return (
                <tr className="transaction-row" key={transaction.id}>
                  <td data-label="Date">{transaction.date}</td>
                  <td data-label="Category">{transaction.category}</td>
                  <td data-label="Subcategory">{subcategoryValue}</td>
                  <td data-label="Medium">
                    {isTransfer ? '' : transaction.medium}
                  </td>
                  <td data-label="Type">{transaction.type}</td>
                  <td
                    className={`ledger-amount ${getTransactionAmountClass(
                      transaction,
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
                      onClick={() => deleteTransaction(transaction)}
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
              )
            })}
          </tbody>
        </table>
      </section>
    </main>
  )
}

export default CurrentMonthPage
