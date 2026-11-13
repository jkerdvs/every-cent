import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
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
  renumberCurrentMonthTransactions,
  saveCurrentMonthTransactions,
} from '../data/currentMonth'
import type { CurrentMonthEntry } from '../data/currentMonth'
import {
  getCashTransactionAccounts,
  getCreditAccounts,
  loadBalanceAccounts,
} from '../data/balanceSheet'
import {
  getDefaultInvestmentAccountColor,
  getDefaultTransactionAccountColor,
  loadInvestmentAccountConfigs,
  sortInvestmentAccountConfigs,
} from '../data/ownership'

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

const ledgerCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

type LedgerAccountReference = { id?: string; name?: string }

function getLedgerAccounts(transaction: CurrentMonthEntry): LedgerAccountReference[] {
  if (isTransferTransaction(transaction)) {
    return [{ name: transaction.fromMedium }, { name: transaction.toMedium }]
  }

  if (isCreditPaymentTransaction(transaction)) {
    return [
      { id: transaction.sourceAccountId, name: transaction.sourceAccountName || transaction.medium },
      { id: transaction.creditAccountId, name: transaction.creditAccountName },
    ]
  }

  if (isCreditPurchaseTransaction(transaction)) {
    return [{ id: transaction.creditAccountId, name: transaction.creditAccountName || transaction.medium }]
  }

  return [{ name: transaction.medium }]
}

function getLedgerDescription(transaction: CurrentMonthEntry) {
  if (isTransferTransaction(transaction) || isCreditPaymentTransaction(transaction)) {
    // Older rows store their account path in the description.
    if (transaction.subcategory?.includes(' -> ')) return ''
  }

  return transaction.subcategory
}

function CurrentMonthPage() {
  const [transactions, setTransactions] = useState<CurrentMonthEntry[]>(
    loadCurrentMonthTransactions,
  )

  const [entryMode, setEntryMode] = useState<EntryMode | null>(null)
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [medium, setMedium] = useState('')
  const [type, setType] = useState('')
  const [amountDigits, setAmountDigits] = useState('')
  const [comments, setComments] = useState('')
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferAmountDigits, setTransferAmountDigits] = useState('')
  const [transferComments, setTransferComments] = useState('')
  const [creditMode, setCreditMode] = useState<CreditMode>('purchase')
  const [creditPurchaseAccountId, setCreditPurchaseAccountId] =
    useState('')
  const [creditPurchaseSubcategory, setCreditPurchaseSubcategory] =
    useState('')
  const [creditPurchaseAmountDigits, setCreditPurchaseAmountDigits] =
    useState('')
  const [creditPurchaseComments, setCreditPurchaseComments] = useState('')
  const [creditPaymentSourceId, setCreditPaymentSourceId] = useState('')
  const [creditPaymentAccountId, setCreditPaymentAccountId] = useState('')
  const [creditPaymentAmountDigits, setCreditPaymentAmountDigits] =
    useState('')
  const [creditPaymentComments, setCreditPaymentComments] = useState('')

  useEffect(() => {
    saveCurrentMonthTransactions(transactions)
  }, [transactions])

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort(
      (a, b) => b.transactionNo - a.transactionNo,
    )
  }, [transactions])
  const accounts = useMemo(() => loadBalanceAccounts(), [])
  const accountById = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]))
  }, [accounts])
  const accountByName = new Map(accounts.map((account) => [account.name, account]))
  const investmentConfigs = sortInvestmentAccountConfigs(
    loadInvestmentAccountConfigs(accounts),
    (config) => accountById.get(config.accountId)?.name ?? '',
  )
  const investmentColors = new Map(
    investmentConfigs.map((config) => [config.accountId, config.color]),
  )
  investmentConfigs
    .filter((config) => accountById.get(config.accountId)?.accountScope === 'investment')
    .forEach((config, index) => {
      investmentColors.set(config.accountId, config.color ?? getDefaultInvestmentAccountColor(index))
    })

  function renderAccountChip({ id, name }: LedgerAccountReference) {
    const account = (id ? accountById.get(id) : undefined) ??
      (name ? accountByName.get(name) : undefined)
    const color = account
      ? (investmentColors.has(account.id) ? investmentColors.get(account.id) : account.color) ??
        getDefaultTransactionAccountColor(account.id)
      : '#aab4c5'

    return (
      <span className="ledger-account-chip" style={{ '--chip-color': color } as CSSProperties}>
        {account?.name || name || '—'}
      </span>
    )
  }

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
    return accounts
      .filter((account) => account.category !== 'Credit')
      .map((account) => account.name)
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
  const realizedProfitLossDisplayCents = Math.abs(realizedProfitLossCents)

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
      !category ||
      (subcategoryOptions.length > 0 && !subcategory) ||
      !medium ||
      !type ||
      amountCents === 0
    ) {
      return
    }

    setTransactions((currentTransactions) => [
      ...currentTransactions,
      {
        id: Date.now(),
        transactionNo: currentTransactions.length + 1,
        category,
        subcategory,
        medium,
        type,
        amountCents,
        comments,
      },
    ])

    setCategory('')
    setSubcategory('')
    setMedium('')
    setType('')
    setAmountDigits('')
    setComments('')
  }

  function addTransfer() {
    if (
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
        transactionNo: currentTransactions.length + 1,
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

    setTransferFrom('')
    setTransferTo('')
    setTransferAmountDigits('')
    setTransferComments('')
  }

  function addCreditPurchase() {
    const creditAccount = accountById.get(creditPurchaseAccountId)

    if (
      !creditAccount ||
      (subcategoryOptions.length > 0 && !creditPurchaseSubcategory) ||
      creditPurchaseAmountCents <= 0 ||
      !creditAccounts.some((account) => account.id === creditAccount.id)
    ) {
      return
    }

    setTransactions((currentTransactions) => [
      ...currentTransactions,
      {
        id: Date.now(),
        kind: 'creditPurchase',
        transactionNo: currentTransactions.length + 1,
        category: 'Credit',
        subcategory: creditPurchaseSubcategory,
        medium: creditAccount.name,
        type: 'Credit Purchase',
        amountCents: creditPurchaseAmountCents,
        comments: creditPurchaseComments,
        creditAccountId: creditAccount.id,
        creditAccountName: creditAccount.name,
      },
    ])
    setCreditPurchaseAccountId('')
    setCreditPurchaseSubcategory('')
    setCreditPurchaseAmountDigits('')
    setCreditPurchaseComments('')
  }

  function addCreditPayment() {
    const sourceAccount = accountById.get(creditPaymentSourceId)
    const creditAccount = accountById.get(creditPaymentAccountId)

    if (
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

    setTransactions((currentTransactions) => [
      ...currentTransactions,
      {
        id: Date.now(),
        kind: 'creditPayment',
        paymentId: `credit-payment-${Date.now()}`,
        transactionNo: currentTransactions.length + 1,
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
      },
    ])
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
      renumberCurrentMonthTransactions(
        currentTransactions.filter(
          (currentTransaction) => currentTransaction.id !== transaction.id,
        ),
      ),
    )
  }

  return (
    <main className="current-month">
      <header className="month-header">
        <h1>{CURRENT_MONTH_LABEL}</h1>

        <section className="month-summary" aria-label="On the Month">
          <div className="summary-item">
            <span>Profit</span>
            <strong className={profitClass}>
              {ledgerCurrency.format(profitCents / 100)}
            </strong>
          </div>

          <div className="summary-item">
            <span>Loss</span>
            <strong className={lossClass}>
              {ledgerCurrency.format(lossCents / 100)}
            </strong>
          </div>

          <div className="summary-item">
            <span>Net</span>
            <strong className={realizedProfitLossClass}>
              {ledgerCurrency.format(realizedProfitLossDisplayCents / 100)}
            </strong>
          </div>
        </section>
      </header>

      <section className="transaction-entry" aria-label="Add Entry">
        <div className="entry-mode-selector" aria-label="Entry type">
          <button
            aria-pressed={entryMode === 'transaction'}
            className={entryMode === 'transaction' ? 'active' : ''}
            type="button"
            onClick={() => setEntryMode('transaction')}
          >
            <span aria-hidden="true">+</span>
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

            <label>
              <span>Category</span>
              <select
                aria-label="Transaction category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="" disabled></option>

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
                  {''}
                </option>

                {subcategoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Account</span>
              <select
                aria-label="Transaction account"
                value={medium}
                onChange={(event) => setMedium(event.target.value)}
              >
                <option value="" disabled></option>

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
                <option value="" disabled></option>

                {typeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="comments-field">
              <span>Comments</span>
              <input
                aria-label="Transaction comments"
                className="comments-input"
                type="text"
                value={comments}
                onChange={(event) => setComments(event.target.value)}
              />
            </label>

            <button
              aria-label="Add transaction"
              className="add-transaction"
              type="button"
              onClick={addTransaction}
            >
              +
            </button>
          </div>
        ) : null}

        {entryMode === 'transfer' ? (
          <div className="transfer-entry-grid">
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

            <label>
              <span>From</span>
              <select
                aria-label="Transfer from account"
                value={transferFrom}
                onChange={(event) => setTransferFrom(event.target.value)}
              >
                <option value="" disabled></option>

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
                <option value="" disabled></option>

                {transferAccountOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="comments-field">
              <span>Comments</span>
              <input
                aria-label="Transfer comments"
                className="comments-input"
                type="text"
                value={transferComments}
                onChange={(event) => setTransferComments(event.target.value)}
              />
            </label>

            <button
              aria-label="Add transfer"
              className="add-transaction"
              type="button"
              onClick={addTransfer}
            >
              +
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

                <label>
                  <span>Credit Account</span>
                  <select
                    aria-label="Credit purchase account"
                    value={creditPurchaseAccountId}
                    onChange={(event) =>
                      setCreditPurchaseAccountId(event.target.value)
                    }
                  >
                    <option value="" disabled></option>

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
                      {''}
                    </option>

                    {subcategoryOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="comments-field">
                  <span>Comments</span>
                  <input
                    aria-label="Credit purchase comments"
                    className="comments-input"
                    type="text"
                    value={creditPurchaseComments}
                    onChange={(event) =>
                      setCreditPurchaseComments(event.target.value)
                    }
                  />
                </label>

                <button
                  aria-label="Add credit purchase"
                  className="add-transaction"
                  type="button"
                  onClick={addCreditPurchase}
                >
                  +
                </button>
              </div>
            ) : null}

            {creditAccounts.length > 0 && creditMode === 'payment' ? (
              <div className="credit-payment-grid">
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

                <label>
                  <span>Pay From</span>
                  <select
                    aria-label="Credit payment source account"
                    value={creditPaymentSourceId}
                    onChange={(event) =>
                      setCreditPaymentSourceId(event.target.value)
                    }
                  >
                    <option value="" disabled></option>

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
                    <option value="" disabled></option>

                    {creditAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="comments-field">
                  <span>Comments</span>
                  <input
                    aria-label="Credit payment comments"
                    className="comments-input"
                    type="text"
                    value={creditPaymentComments}
                    onChange={(event) =>
                      setCreditPaymentComments(event.target.value)
                    }
                  />
                </label>

                <button
                  aria-label="Add credit payment"
                  className="add-transaction"
                  type="button"
                  onClick={addCreditPayment}
                >
                  +
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
              <th scope="col" className="ledger-amount">Amount</th>
              <th scope="col" className="ledger-account-column">Account</th>
              <th scope="col">Details</th>
              <th scope="col" className="transaction-action-cell" aria-label="Row actions" />
            </tr>
          </thead>

          <tbody>
            {sortedTransactions.map((transaction) => {
              const amountClass = getTransactionAmountClass(transaction)
              const amount = Math.abs(transaction.amountCents)
              const sign = amountClass !== 'negative' && transaction.amountCents < 0 ? '−' : ''
              const [source, destination] = getLedgerAccounts(transaction)
              const description = getLedgerDescription(transaction)
              const comments = transaction.comments

              return (
                <tr key={transaction.id}>
                  <td className={`ledger-amount ${amountClass}`}>
                    <span>{sign}{ledgerCurrency.format(amount / 100)}</span>
                  </td>
                  <td className="ledger-account-column">
                    <div className="ledger-account-path">
                      {renderAccountChip(source)}
                      {destination && (
                        <>
                          <span className="ledger-account-arrow" aria-label="to">→</span>
                          {renderAccountChip(destination)}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="ledger-details">
                    {description && <strong>{description}</strong>}
                    {description && comments && <span className="ledger-details-dot" aria-hidden="true"> · </span>}
                    {comments && <span className="ledger-comment">{comments}</span>}
                  </td>
                  <td className="transaction-action-cell">
                    <div className="transaction-row-actions">
                      <details className="transaction-row-details">
                        <summary aria-label="Transaction details" title="Transaction details">ⓘ</summary>
                        <dl>
                          <dt>Category</dt><dd>{transaction.category || '—'}</dd>
                          <dt>Type</dt><dd>{transaction.type || '—'}</dd>
                          {transaction.date !== undefined && (
                            <><dt>Date</dt><dd>{transaction.date}</dd></>
                          )}
                        </dl>
                      </details>
                      <button
                        aria-label={isTransferTransaction(transaction) ? 'Delete transfer' : 'Delete transaction'}
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
                    </div>
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
