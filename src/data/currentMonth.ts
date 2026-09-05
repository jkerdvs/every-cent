export type Transaction = {
  id: number
  date: number
  category: string
  subcategory: string
  medium: string
  type: string
  amountCents: number
  comments: string
}

export type MonthTotals = {
  profitCents: number
  lossCents: number
  realizedProfitLossCents: number
}

export const CURRENT_MONTH_ID = '2026-09'
export const CURRENT_MONTH_LABEL = 'September 2026'
export const CURRENT_MONTH_TRANSACTIONS_KEY =
  'every-cent-september-2026-transactions'

export const categories = [
  'Income',
  'Expense',
  'Invest',
  'Transfer',
  'Credit',
  'Liquidation',
  'Save',
  'Employ',
]

export const subcategories = [
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

export const mediums = [
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

export const types = [
  '+',
  '-',
  'Investment',
  'Credit Purchase',
  'Savings',
  'Liquidation',
]

export function formatLedgerMoney(cents: number) {
  return (cents / 100).toFixed(2)
}

export function loadCurrentMonthTransactions() {
  const savedTransactions = localStorage.getItem(
    CURRENT_MONTH_TRANSACTIONS_KEY,
  )

  if (!savedTransactions) return []

  try {
    return JSON.parse(savedTransactions) as Transaction[]
  } catch {
    return []
  }
}

export function calculateMonthTotals(
  transactions: Transaction[],
): MonthTotals {
  const profitCents = transactions
    .filter((transaction) => transaction.type === '+')
    .reduce((total, transaction) => total + transaction.amountCents, 0)
  const lossCents = transactions
    .filter((transaction) => transaction.type === '-')
    .reduce((total, transaction) => total + transaction.amountCents, 0)

  return {
    profitCents,
    lossCents,
    realizedProfitLossCents: profitCents - lossCents,
  }
}
