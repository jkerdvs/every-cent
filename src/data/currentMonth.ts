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

export type TransactionCategory = {
  id: string
  name: string
}

export type TransactionSubcategory = {
  id: string
  categoryId: string
  name: string
}

export const CURRENT_MONTH_ID = '2026-09'
export const CURRENT_MONTH_LABEL = 'September 2026'
export const CURRENT_MONTH_TRANSACTIONS_KEY =
  'every-cent-september-2026-transactions'
export const TRANSACTION_CATEGORIES_STORAGE_KEY =
  'every-cent-transaction-categories'
export const TRANSACTION_SUBCATEGORIES_STORAGE_KEY =
  'every-cent-transaction-subcategories'

export const starterTransactionCategories: TransactionCategory[] = [
  { id: 'category-income', name: 'Income' },
  { id: 'category-expense', name: 'Expense' },
  { id: 'category-invest', name: 'Invest' },
  { id: 'category-transfer', name: 'Transfer' },
  { id: 'category-credit', name: 'Credit' },
  { id: 'category-liquidation', name: 'Liquidation' },
  { id: 'category-save', name: 'Save' },
  { id: 'category-employ', name: 'Employ' },
]

export const starterTransactionSubcategories: TransactionSubcategory[] = [
  {
    id: 'subcategory-payment',
    categoryId: 'category-income',
    name: 'Payment',
  },
  { id: 'subcategory-rent', categoryId: 'category-expense', name: 'Rent' },
  {
    id: 'subcategory-groceries',
    categoryId: 'category-expense',
    name: 'Groceries',
  },
  {
    id: 'subcategory-options-trading',
    categoryId: 'category-invest',
    name: 'Options Trading',
  },
  {
    id: 'subcategory-shopping',
    categoryId: 'category-expense',
    name: 'Shopping',
  },
  { id: 'subcategory-work', categoryId: 'category-employ', name: 'Work' },
  { id: 'subcategory-crypto', categoryId: 'category-invest', name: 'Crypto' },
  {
    id: 'subcategory-going-out',
    categoryId: 'category-expense',
    name: 'Going Out',
  },
  {
    id: 'subcategory-equipment',
    categoryId: 'category-expense',
    name: 'Equipment',
  },
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

function getConfigId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeConfigName(name: string) {
  return name.trim()
}

function loadStoredConfig<ConfigItem>(
  storageKey: string,
  starterItems: ConfigItem[],
) {
  const savedItems = localStorage.getItem(storageKey)

  if (!savedItems) return starterItems

  try {
    const parsedItems = JSON.parse(savedItems) as ConfigItem[]

    if (!Array.isArray(parsedItems)) return starterItems

    return parsedItems
  } catch {
    return starterItems
  }
}

export function createTransactionCategory(
  name: string,
): TransactionCategory {
  return {
    id: getConfigId('category'),
    name: normalizeConfigName(name),
  }
}

export function createTransactionSubcategory(
  name: string,
  categoryId: string,
): TransactionSubcategory {
  return {
    id: getConfigId('subcategory'),
    categoryId,
    name: normalizeConfigName(name),
  }
}

export function loadTransactionCategories() {
  return loadStoredConfig(
    TRANSACTION_CATEGORIES_STORAGE_KEY,
    starterTransactionCategories,
  ).filter((category) => category.name.trim())
}

export function saveTransactionCategories(
  categories: TransactionCategory[],
) {
  localStorage.setItem(
    TRANSACTION_CATEGORIES_STORAGE_KEY,
    JSON.stringify(categories),
  )
}

export function loadTransactionSubcategories() {
  return loadStoredConfig(
    TRANSACTION_SUBCATEGORIES_STORAGE_KEY,
    starterTransactionSubcategories,
  ).filter((subcategory) => subcategory.name.trim())
}

export function saveTransactionSubcategories(
  subcategories: TransactionSubcategory[],
) {
  localStorage.setItem(
    TRANSACTION_SUBCATEGORIES_STORAGE_KEY,
    JSON.stringify(subcategories),
  )
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

export function saveCurrentMonthTransactions(transactions: Transaction[]) {
  localStorage.setItem(
    CURRENT_MONTH_TRANSACTIONS_KEY,
    JSON.stringify(transactions),
  )
}

export function renameCurrentMonthTransactionMedium(
  previousName: string,
  nextName: string,
) {
  if (previousName === nextName) return

  const transactions = loadCurrentMonthTransactions()
  const renamedTransactions = transactions.map((transaction) =>
    transaction.medium === previousName
      ? { ...transaction, medium: nextName }
      : transaction,
  )

  saveCurrentMonthTransactions(renamedTransactions)
}

export function clearCurrentMonthTransactionMedium(accountName: string) {
  const transactions = loadCurrentMonthTransactions()
  const clearedTransactions = transactions.map((transaction) =>
    transaction.medium === accountName
      ? { ...transaction, medium: '' }
      : transaction,
  )

  saveCurrentMonthTransactions(clearedTransactions)
}

export function clearCurrentMonthTransactionSubcategory(
  subcategoryName: string,
) {
  const transactions = loadCurrentMonthTransactions()
  const clearedTransactions = transactions.map((transaction) =>
    transaction.subcategory === subcategoryName
      ? { ...transaction, subcategory: '' }
      : transaction,
  )

  saveCurrentMonthTransactions(clearedTransactions)
}

export function clearCurrentMonthTransactionCategory(
  categoryName: string,
  subcategoryNames: string[],
) {
  const subcategoryNameSet = new Set(subcategoryNames)
  const transactions = loadCurrentMonthTransactions()
  const clearedTransactions = transactions.map((transaction) => {
    if (transaction.category === categoryName) {
      return { ...transaction, category: '', subcategory: '' }
    }

    if (subcategoryNameSet.has(transaction.subcategory)) {
      return { ...transaction, subcategory: '' }
    }

    return transaction
  })

  saveCurrentMonthTransactions(clearedTransactions)
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
