import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  CURRENT_MONTH_LABEL,
  calculateMonthTotals,
  formatLedgerMoney,
  isCreditPaymentTransaction,
  isCreditPurchaseTransaction,
  isTransferTransaction,
  loadCurrentMonthTransactions,
  loadTransactionCategories,
  loadTransactionSubcategories,
  loadTransactionTypes,
  saveCurrentMonthTransactions,
} from '../data/currentMonth'
import type {
  CreditPaymentTransaction,
  CreditPurchaseTransaction,
  CurrentMonthEntry,
  Transaction,
} from '../data/currentMonth'
import {
  getCashTransactionAccounts,
  getCreditAccounts,
  loadBalanceAccounts,
} from '../data/balanceSheet'

type EntryMode = 'transaction' | 'transfer' | 'credit'
type CreditMode = 'purchase' | 'payment'

function getTransactionAmountClass(transaction: CurrentMonthEntry) {
  if (
    isTransferTransaction(transaction) ||
    isCreditPaymentTransaction(transaction)
  ) {
    return 'neutral'
  }

  if (isCreditPurchaseTransaction(transaction)) return 'negative'

  const { type } = transaction

  if (type === '+' || type === 'Liquidation') return 'positive'
  if (type === '-' || type === 'Investment' || type === 'Savings') {
    return 'negative'
  }

  return 'neutral'
}

function getLedgerCategory(transaction: CurrentMonthEntry) {
  if (isCreditPurchaseTransaction(transaction)) return 'Credit Purchase'
  if (isCreditPaymentTransaction(transaction)) return 'Credit Payment'

  return transaction.category
}

function getLedgerSubcategory(transaction: CurrentMonthEntry) {
  if (isTransferTransaction(transaction)) {
    return `${transaction.fromMedium} -> ${transaction.toMedium}`
  }

  if (isCreditPaymentTransaction(transaction)) {
    return `${transaction.sourceAccountName} -> ${transaction.creditAccountName}`
  }

  return transaction.subcategory
}

function getLedgerMedium(transaction: CurrentMonthEntry) {
  if (isTransferTransaction(transaction)) return ''
  if (isCreditPurchaseTransaction(transaction)) {
    return transaction.creditAccountName
  }
  if (isCreditPaymentTransaction(transaction)) return ''

  return transaction.medium
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
  const [creditMode, setCreditMode] = useState<CreditMode>('purchase')
  const [creditPurchaseDate, setCreditPurchaseDate] = useState('')
  const [creditPurchaseAccountId, setCreditPurchaseAccountId] =
    useState('')
  const [creditPurchaseSubcategory, setCreditPurchaseSubcategory] =
    useState('')
  const [creditPurchaseAmountDigits, setCreditPurchaseAmountDigits] =
    useState('')
  const [creditPurchaseComments, setCreditPurchaseComments] = useState('')
  const [creditPaymentDate, setCreditPaymentDate] = useState('')
  const [creditPaymentSourceId, setCreditPaymentSourceId] = useState('')
  const [creditPaymentAccountId, setCreditPaymentAccountId] = useState('')
  const [creditPaymentAmountDigits, setCreditPaymentAmountDigits] =
    useState('')
  const [creditPaymentComments, setCreditPaymentComments] = useState('')

  useEffect(() => {
    saveCurrentMonthTransactions(transactions)
  }, [transactions])

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.date - a.date)
  }, [transactions])
  const accounts = useMemo(() => loadBalanceAccounts(), [])
  const accountById = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]))
  }, [accounts])
  const cashTransactionAccounts = useMemo(() => {
    return getCashTransactionAccounts(accounts)
  }, [accounts])
  const creditAccounts = useMemo(() => {
    return getCreditAccounts(accounts)
  }, [accounts])
  const mediumOptions = useMemo(() => {
    return cashTransactionAccounts.map((account) => account.name)
  }, [cashTransactionAccounts])
  const transferAccountOptions = useMemo(() => {
    return accounts.map((account) => account.name)
  }, [accounts])
  const categoryOptions = useMemo(() => {
    return loadTransactionCategories().map((item) => item.name)
  }, [])
  const subcategoryOptions = useMemo(() => {
    return loadTransactionSubcategories().map((item) => item.name)
  }, [])
  const typeOptions = useMemo(() => {
    return loadTransactionTypes().map((item) => item.name)
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
  const creditPurchaseAmountCents = creditPurchaseAmountDigits
    ? Number(creditPurchaseAmountDigits)
    : 0
  const creditPurchaseAmountDisplay = formatLedgerMoney(
    creditPurchaseAmountCents,
  )
  const creditPaymentAmountCents = creditPaymentAmountDigits
    ? Number(creditPaymentAmountDigits)
    : 0
  const creditPaymentAmountDisplay = formatLedgerMoney(
    creditPaymentAmountCents,
  )
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
      (subcategoryOptions.length > 0 && !subcategory) ||
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

  function addCreditPurchase() {
    const creditAccount = accountById.get(creditPurchaseAccountId)

    if (
      !creditPurchaseDate ||
      !creditAccount ||
      (subcategoryOptions.length > 0 && !creditPurchaseSubcategory) ||
      creditPurchaseAmountCents <= 0 ||
      !creditAccounts.some((account) => account.id === creditAccount.id)
    ) {
      return
    }

    const newCreditPurchase: CreditPurchaseTransaction = {
      id: Date.now(),
      kind: 'creditPurchase',
      date: Number(creditPurchaseDate),
      category: 'Credit',
      subcategory: creditPurchaseSubcategory,
      medium: creditAccount.name,
      type: 'Credit Purchase',
      amountCents: creditPurchaseAmountCents,
      comments: creditPurchaseComments,
      creditAccountId: creditAccount.id,
      creditAccountName: creditAccount.name,
    }

    setTransactions((currentTransactions) => [
      ...currentTransactions,
      newCreditPurchase,
    ])
    setCreditPurchaseDate('')
    setCreditPurchaseAccountId('')
    setCreditPurchaseSubcategory('')
    setCreditPurchaseAmountDigits('')
    setCreditPurchaseComments('')
  }

  function addCreditPayment() {
    const sourceAccount = accountById.get(creditPaymentSourceId)
    const creditAccount = accountById.get(creditPaymentAccountId)

    if (
      !creditPaymentDate ||
      !sourceAccount ||
      !creditAccount ||
      sourceAccount.id === creditAccount.id ||
      creditPaymentAmountCents <= 0 ||
      !cashTransactionAccounts.some(
        (account) => account.id === sourceAccount.id,
      ) ||
      !creditAccounts.some((account) => account.id === creditAccount.id)
    ) {
      return
    }

    const newCreditPayment: CreditPaymentTransaction = {
      id: Date.now(),
      kind: 'creditPayment',
      paymentId: `credit-payment-${Date.now()}`,
      date: Number(creditPaymentDate),
      category: 'Credit Payment',
      subcategory: `${sourceAccount.name} -> ${creditAccount.name}`,
      medium: sourceAccount.name,
      type: 'Credit Payment',
      amountCents: creditPaymentAmountCents,
      comments: creditPaymentComments,
      sourceAccountId: sourceAccount.id,
      sourceAccountName: sourceAccount.name,
      creditAccountId: creditAccount.id,
      creditAccountName: creditAccount.name,
    }

    setTransactions((currentTransactions) => [
      ...currentTransactions,
      newCreditPayment,
    ])
    setCreditPaymentDate('')
    setCreditPaymentSourceId('')
    setCreditPaymentAccountId('')
    setCreditPaymentAmountDigits('')
    setCreditPaymentComments('')
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

          <button
            aria-pressed={entryMode === 'credit'}
            className={entryMode === 'credit' ? 'active' : ''}
            type="button"
            onClick={() => setEntryMode('credit')}
          >
            Credit
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
              <span>Description</span>
              <select
                aria-label="Transaction description"
                value={subcategory}
                onChange={(event) => setSubcategory(event.target.value)}
              >
                <option value="" disabled={subcategoryOptions.length > 0}>
                  {subcategoryOptions.length > 0 ? 'Select' : 'None'}
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

                {typeOptions.map((item) => (
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

                {transferAccountOptions.map((item) => (
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

                {transferAccountOptions.map((item) => (
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

        {entryMode === 'credit' ? (
          <div className="credit-entry">
            <div className="credit-mode-selector" aria-label="Credit type">
              <button
                aria-pressed={creditMode === 'purchase'}
                className={creditMode === 'purchase' ? 'active' : ''}
                type="button"
                onClick={() => setCreditMode('purchase')}
              >
                Purchase
              </button>

              <button
                aria-pressed={creditMode === 'payment'}
                className={creditMode === 'payment' ? 'active' : ''}
                type="button"
                onClick={() => setCreditMode('payment')}
              >
                Payment
              </button>
            </div>

            {creditAccounts.length === 0 ? (
              <p className="credit-empty">No credit accounts configured.</p>
            ) : null}

            {creditAccounts.length > 0 && creditMode === 'purchase' ? (
              <div className="credit-purchase-grid">
                <label>
                  <span>Date</span>
                  <input
                    aria-label="Credit purchase date"
                    className="date-input"
                    type="number"
                    min="1"
                    max="31"
                    value={creditPurchaseDate}
                    onChange={(event) =>
                      setCreditPurchaseDate(event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Credit Account</span>
                  <select
                    aria-label="Credit purchase account"
                    value={creditPurchaseAccountId}
                    onChange={(event) =>
                      setCreditPurchaseAccountId(event.target.value)
                    }
                  >
                    <option value="" disabled>
                      Select
                    </option>

                    {creditAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Description</span>
                  <select
                    aria-label="Credit purchase description"
                    value={creditPurchaseSubcategory}
                    onChange={(event) =>
                      setCreditPurchaseSubcategory(event.target.value)
                    }
                  >
                    <option
                      value=""
                      disabled={subcategoryOptions.length > 0}
                    >
                      {subcategoryOptions.length > 0 ? 'Select' : 'None'}
                    </option>

                    {subcategoryOptions.map((item) => (
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
                      aria-label="Credit purchase amount"
                      className="amount-input"
                      type="text"
                      inputMode="numeric"
                      value={creditPurchaseAmountDisplay}
                      onChange={(event) =>
                        handleAmountChange(
                          event.target.value,
                          setCreditPurchaseAmountDigits,
                        )
                      }
                      onKeyDown={(event) =>
                        handleAmountKeyDown(
                          event,
                          setCreditPurchaseAmountDigits,
                        )
                      }
                    />
                  </div>
                </label>

                <label className="comments-field">
                  <span>Comments</span>
                  <input
                    aria-label="Credit purchase comments"
                    className="comments-input"
                    type="text"
                    placeholder="Add comments"
                    value={creditPurchaseComments}
                    onChange={(event) =>
                      setCreditPurchaseComments(event.target.value)
                    }
                  />
                </label>

                <button
                  className="add-transaction"
                  type="button"
                  onClick={addCreditPurchase}
                >
                  Add Credit Purchase
                </button>
              </div>
            ) : null}

            {creditAccounts.length > 0 && creditMode === 'payment' ? (
              <div className="credit-payment-grid">
                <label>
                  <span>Date</span>
                  <input
                    aria-label="Credit payment date"
                    className="date-input"
                    type="number"
                    min="1"
                    max="31"
                    value={creditPaymentDate}
                    onChange={(event) =>
                      setCreditPaymentDate(event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Pay From</span>
                  <select
                    aria-label="Credit payment source account"
                    value={creditPaymentSourceId}
                    onChange={(event) =>
                      setCreditPaymentSourceId(event.target.value)
                    }
                  >
                    <option value="" disabled>
                      Select
                    </option>

                    {cashTransactionAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Credit Account</span>
                  <select
                    aria-label="Credit payment account"
                    value={creditPaymentAccountId}
                    onChange={(event) =>
                      setCreditPaymentAccountId(event.target.value)
                    }
                  >
                    <option value="" disabled>
                      Select
                    </option>

                    {creditAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Amount</span>
                  <div className="amount-field">
                    <span className="currency-symbol">$</span>

                    <input
                      aria-label="Credit payment amount"
                      className="amount-input"
                      type="text"
                      inputMode="numeric"
                      value={creditPaymentAmountDisplay}
                      onChange={(event) =>
                        handleAmountChange(
                          event.target.value,
                          setCreditPaymentAmountDigits,
                        )
                      }
                      onKeyDown={(event) =>
                        handleAmountKeyDown(
                          event,
                          setCreditPaymentAmountDigits,
                        )
                      }
                    />
                  </div>
                </label>

                <label className="comments-field">
                  <span>Comments</span>
                  <input
                    aria-label="Credit payment comments"
                    className="comments-input"
                    type="text"
                    placeholder="Add comments"
                    value={creditPaymentComments}
                    onChange={(event) =>
                      setCreditPaymentComments(event.target.value)
                    }
                  />
                </label>

                <button
                  className="add-transaction"
                  type="button"
                  onClick={addCreditPayment}
                >
                  Add Credit Payment
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="transaction-ledger" aria-label="Transaction Ledger">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Medium</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Comments</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {sortedTransactions.map((transaction) => {
              return (
                <tr className="transaction-row" key={transaction.id}>
                  <td data-label="Date">{transaction.date}</td>
                  <td data-label="Category">
                    {getLedgerCategory(transaction)}
                  </td>
                  <td data-label="Description">
                    {getLedgerSubcategory(transaction)}
                  </td>
                  <td data-label="Medium">{getLedgerMedium(transaction)}</td>
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
