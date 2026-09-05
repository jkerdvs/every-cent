import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'

type Transaction = {
  id: number
  date: number
  category: string
  subcategory: string
  medium: string
  type: string
  amountCents: number
  comments: string
}

const STORAGE_KEY = 'every-cent-september-2026-transactions'

const categories = [
  'Income',
  'Expense',
  'Invest',
  'Transfer',
  'Credit',
  'Liquidation',
  'Save',
  'Employ',
]

const subcategories = [
  'Payment',
  'Rent',
  'Groceries',
  'Options Trading',
  'Shopping',
  'Work',
  'Crypto',
  'Going Out',
  'Equipment',
]

const mediums = [
  'Checking',
  'Platinum Credit Card',
  'Quicksilver Credit Card',
  'Cash',
  'Brokerage',
  'Roth IRA',
  'Crypto Broker',
  'Savings',
  'Venmo',
]

const types = [
  '+',
  '-',
  'Investment',
  'Credit Purchase',
  'Savings',
  'Liquidation',
]

function formatMoney(cents: number) {
  return (cents / 100).toFixed(2)
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const savedTransactions = localStorage.getItem(STORAGE_KEY)

    if (!savedTransactions) return []

    try {
      return JSON.parse(savedTransactions)
    } catch {
      return []
    }
  })

  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [medium, setMedium] = useState('')
  const [type, setType] = useState('')
  const [amountDigits, setAmountDigits] = useState('')
  const [comments, setComments] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  }, [transactions])

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.date - a.date)
  }, [transactions])

  const profitCents = useMemo(() => {
    return transactions
      .filter((transaction) => transaction.type === '+')
      .reduce(
        (total, transaction) => total + transaction.amountCents,
        0,
      )
  }, [transactions])

  const lossCents = useMemo(() => {
    return transactions
      .filter((transaction) => transaction.type === '-')
      .reduce(
        (total, transaction) => total + transaction.amountCents,
        0,
      )
  }, [transactions])

  const realizedProfitLossCents = profitCents - lossCents

  const realizedProfitLossClass =
    realizedProfitLossCents > 0
      ? 'positive'
      : realizedProfitLossCents < 0
        ? 'negative'
        : 'neutral'

  const amountCents = amountDigits ? Number(amountDigits) : 0
  const amountDisplay = formatMoney(amountCents)

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

  return (
    <main className="current-month">
      <h1>September 2026</h1>

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
          </tr>
        </thead>

        <tbody>
          <tr className="entry-row">
            <td>
              <input
                className="date-input"
                type="number"
                min="1"
                max="31"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </td>

            <td>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="" disabled>
                  Select
                </option>

                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </td>

            <td>
              <select
                value={subcategory}
                onChange={(event) => setSubcategory(event.target.value)}
              >
                <option value="" disabled>
                  Select
                </option>

                {subcategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </td>

            <td>
              <select
                value={medium}
                onChange={(event) => setMedium(event.target.value)}
              >
                <option value="" disabled>
                  Select
                </option>

                {mediums.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </td>

            <td>
              <select
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
            </td>

            <td>
              <div className="amount-field">
                <span className="currency-symbol">$</span>

                <input
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
            </td>

            <td>
              <input
                className="comments-input"
                type="text"
                placeholder="Add comments"
                value={comments}
                onChange={(event) => setComments(event.target.value)}
              />
            </td>
          </tr>

          {sortedTransactions.map((transaction) => (
            <tr className="transaction-row" key={transaction.id}>
              <td>{transaction.date}</td>
              <td>{transaction.category}</td>
              <td>{transaction.subcategory}</td>
              <td>{transaction.medium}</td>
              <td>{transaction.type}</td>
              <td className="ledger-amount">
                ${formatMoney(transaction.amountCents)}
              </td>
              <td>{transaction.comments}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        className="add-transaction"
        type="button"
        onClick={addTransaction}
      >
        Add Transaction
      </button>

      <aside className="month-summary">
        <h2>On the Month</h2>

        <p>Profit: ${formatMoney(profitCents)}</p>

        <p>Loss: ${formatMoney(lossCents)}</p>

        <p>
          Realized Profit & Loss:{' '}
          <span className={`realized-value ${realizedProfitLossClass}`}>
            ${formatMoney(realizedProfitLossCents)}
          </span>
        </p>
      </aside>
    </main>
  )
}

export default App