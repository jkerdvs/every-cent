export type TransactionKind =
  | 'transaction'
  | 'transfer'
  | 'creditPurchase'
  | 'creditPayment'

type BaseTransaction = {
  id: number
  date: number
  amountCents: number
  comments: string
}

export type Transaction = BaseTransaction & {
  kind?: 'transaction'
  category: string
  subcategory: string
  medium: string
  type: string
}

export type TransferTransaction = BaseTransaction & {
  kind: 'transfer'
  category: 'Transfer'
  subcategory: string
  medium: string
  type: 'Transfer'
  transferId: string
  fromMedium: string
  toMedium: string
}

export type CreditPurchaseTransaction = BaseTransaction & {
  kind: 'creditPurchase'
  category: string
  subcategory: string
  medium: string
  type: 'Credit Purchase'
  creditAccountId: string
  creditAccountName: string
}

export type CreditPaymentTransaction = BaseTransaction & {
  kind: 'creditPayment'
  category: 'Credit Payment'
  subcategory: string
  medium: string
  type: 'Credit Payment'
  paymentId: string
  sourceAccountId: string
  sourceAccountName: string
  creditAccountId: string
  creditAccountName: string
}

export type CurrentMonthEntry =
  | Transaction
  | TransferTransaction
  | CreditPurchaseTransaction
  | CreditPaymentTransaction

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
  categoryId?: string
  name: string
}

export type TransactionType = {
  id: string
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
export const TRANSACTION_TYPES_STORAGE_KEY = 'every-cent-transaction-types'

export const starterTransactionCategories: TransactionCategory[] = [
  { id: 'category-income', name: 'Income' },
  { id: 'category-expense', name: 'Expense' },
]

export const starterTransactionSubcategories: TransactionSubcategory[] = []

export const starterTransactionTypes: TransactionType[] = [
  { id: 'type-income', name: '+' },
  { id: 'type-expense', name: '-' },
]

export function formatLedgerMoney(cents: number) {
  return (cents / 100).toFixed(2)
}

export function isTransferTransaction(
  transaction: CurrentMonthEntry,
): transaction is TransferTransaction {
  return transaction.kind === 'transfer'
}

export function isCreditPurchaseTransaction(
  transaction: CurrentMonthEntry,
): transaction is CreditPurchaseTransaction {
  return transaction.kind === 'creditPurchase'
}

export function isCreditPaymentTransaction(
  transaction: CurrentMonthEntry,
): transaction is CreditPaymentTransaction {
  return transaction.kind === 'creditPayment'
}

export function isTransactionTransferCategory(
  transaction: CurrentMonthEntry,
) {
  return transaction.category === 'Transfer'
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
): TransactionSubcategory {
  return {
    id: getConfigId('subcategory'),
    name: normalizeConfigName(name),
  }
}

export function createTransactionType(name: string): TransactionType {
  return {
    id: getConfigId('type'),
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
  )
    .map((subcategory) => ({
      ...subcategory,
      name: subcategory.name.trim(),
    }))
    .filter((subcategory) => subcategory.name)
}

export function saveTransactionSubcategories(
  subcategories: TransactionSubcategory[],
) {
  localStorage.setItem(
    TRANSACTION_SUBCATEGORIES_STORAGE_KEY,
    JSON.stringify(subcategories),
  )
}

export function loadTransactionTypes() {
  return loadStoredConfig(
    TRANSACTION_TYPES_STORAGE_KEY,
    starterTransactionTypes,
  ).filter((type) => type.name.trim())
}

export function saveTransactionTypes(transactionTypes: TransactionType[]) {
  localStorage.setItem(
    TRANSACTION_TYPES_STORAGE_KEY,
    JSON.stringify(transactionTypes),
  )
}

export function loadCurrentMonthTransactions() {
  const savedTransactions = localStorage.getItem(
    CURRENT_MONTH_TRANSACTIONS_KEY,
  )

  if (!savedTransactions) return []

  try {
    return JSON.parse(savedTransactions) as CurrentMonthEntry[]
  } catch {
    return []
  }
}

export function saveCurrentMonthTransactions(transactions: CurrentMonthEntry[]) {
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
  const renamedTransactions = transactions.map((transaction) => {
    if (isTransferTransaction(transaction)) {
      return {
        ...transaction,
        fromMedium:
          transaction.fromMedium === previousName
            ? nextName
            : transaction.fromMedium,
        toMedium:
          transaction.toMedium === previousName
            ? nextName
            : transaction.toMedium,
      }
    }

    if (isCreditPurchaseTransaction(transaction)) {
      return transaction.creditAccountName === previousName
        ? {
            ...transaction,
            medium: nextName,
            creditAccountName: nextName,
          }
        : transaction
    }

    if (isCreditPaymentTransaction(transaction)) {
      return {
        ...transaction,
        subcategory:
          transaction.sourceAccountName === previousName ||
          transaction.creditAccountName === previousName
            ? `${transaction.sourceAccountName === previousName ? nextName : transaction.sourceAccountName} -> ${
                transaction.creditAccountName === previousName
                  ? nextName
                  : transaction.creditAccountName
              }`
            : transaction.subcategory,
        sourceAccountName:
          transaction.sourceAccountName === previousName
            ? nextName
            : transaction.sourceAccountName,
        creditAccountName:
          transaction.creditAccountName === previousName
            ? nextName
            : transaction.creditAccountName,
      }
    }

    return transaction.medium === previousName
      ? { ...transaction, medium: nextName }
      : transaction
  })

  saveCurrentMonthTransactions(renamedTransactions)
}

export function clearCurrentMonthTransactionMedium(accountName: string) {
  const transactions = loadCurrentMonthTransactions()
  const clearedTransactions = transactions.map((transaction) => {
    if (isTransferTransaction(transaction)) {
      return {
        ...transaction,
        fromMedium:
          transaction.fromMedium === accountName
            ? ''
            : transaction.fromMedium,
        toMedium:
          transaction.toMedium === accountName ? '' : transaction.toMedium,
      }
    }

    if (isCreditPurchaseTransaction(transaction)) {
      return transaction.creditAccountName === accountName
        ? { ...transaction, medium: '', creditAccountName: '' }
        : transaction
    }

    if (isCreditPaymentTransaction(transaction)) {
      const sourceAccountName =
        transaction.sourceAccountName === accountName
          ? ''
          : transaction.sourceAccountName
      const creditAccountName =
        transaction.creditAccountName === accountName
          ? ''
          : transaction.creditAccountName

      return {
        ...transaction,
        subcategory:
          sourceAccountName && creditAccountName
            ? `${sourceAccountName} -> ${creditAccountName}`
            : '',
        sourceAccountName,
        creditAccountName,
      }
    }

    return transaction.medium === accountName
      ? { ...transaction, medium: '' }
      : transaction
  })

  saveCurrentMonthTransactions(clearedTransactions)
}

export function clearCurrentMonthTransactionSubcategory(
  subcategoryName: string,
) {
  const transactions = loadCurrentMonthTransactions()
  const clearedTransactions = transactions.map((transaction) => {
    if (
      isTransferTransaction(transaction) ||
      isCreditPaymentTransaction(transaction)
    ) {
      return transaction
    }

    return transaction.subcategory === subcategoryName
      ? { ...transaction, subcategory: '' }
      : transaction
  })

  saveCurrentMonthTransactions(clearedTransactions)
}

export function clearCurrentMonthTransactionCategory(
  categoryName: string,
  subcategoryNames: string[] = [],
) {
  const subcategoryNameSet = new Set(subcategoryNames)
  const transactions = loadCurrentMonthTransactions()
  const clearedTransactions = transactions.map((transaction) => {
    if (
      isTransferTransaction(transaction) ||
      isCreditPaymentTransaction(transaction)
    ) {
      return transaction
    }

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
  transactions: CurrentMonthEntry[],
): MonthTotals {
  const profitCents = transactions
    .filter(
      (transaction) =>
        !isTransactionTransferCategory(transaction) &&
        transaction.type === '+',
    )
    .reduce((total, transaction) => total + transaction.amountCents, 0)
  const lossCents = transactions
    .filter(
      (transaction) =>
        !isTransactionTransferCategory(transaction) &&
        (transaction.type === '-' ||
          isCreditPurchaseTransaction(transaction)),
    )
    .reduce((total, transaction) => total + transaction.amountCents, 0)

  return {
    profitCents,
    lossCents,
    realizedProfitLossCents: profitCents - lossCents,
  }
}
