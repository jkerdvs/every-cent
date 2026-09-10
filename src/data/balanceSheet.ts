import {
  isCreditPaymentTransaction,
  isCreditPurchaseTransaction,
  isTransferTransaction,
} from './currentMonth'
import type { CurrentMonthEntry } from './currentMonth'
import {
  getInvestmentCashAdjustmentForAccount,
  INVESTMENT_ACCOUNTS_STORAGE_KEY,
} from './ownership'
import { getOptionsCashAdjustmentForAccount } from './system'

export type BalanceCategory = string
export type AccountScope = 'transaction' | 'investment'

export type BalanceCategoryConfig = {
  id: string
  name: string
  order: number
}

export type BalanceAccount = {
  id: string
  name: string
  category: BalanceCategory
  accountScope: AccountScope
  baseBalanceCents: number
}

export type DisplayBalanceAccount = BalanceAccount & {
  adjustmentCents: number
  balanceCents: number
  displayBalance: string
}

export type BalanceSection = {
  title: BalanceCategory
  accounts: DisplayBalanceAccount[]
  netCents: number
  displayNet: string
}

type LegacyBalanceAccount = Partial<BalanceAccount> & {
  balanceCents?: number
}

export const BALANCE_SHEET_STORAGE_KEY =
  'every-cent-balance-sheet-accounts'
export const BALANCE_CATEGORIES_STORAGE_KEY =
  'every-cent-balance-sheet-account-types'
export const BALANCE_RESET_ADJUSTMENTS_STORAGE_KEY =
  'every-cent-balance-sheet-reset-adjustments'

export const starterBalanceCategories: BalanceCategoryConfig[] = [
  { id: 'account-type-save', name: 'Save', order: 1 },
  { id: 'account-type-liquid', name: 'Liquid', order: 2 },
  { id: 'account-type-growth', name: 'Growth', order: 3 },
  { id: 'account-type-credit', name: 'Credit', order: 4 },
]

export const balanceCategories = starterBalanceCategories.map(
  (category) => category.name,
)

export const starterBalanceAccounts: BalanceAccount[] = []

function loadInvestmentAccountIds() {
  const savedConfigs = localStorage.getItem(INVESTMENT_ACCOUNTS_STORAGE_KEY)

  if (!savedConfigs) return new Set<string>()

  try {
    const parsedConfigs = JSON.parse(savedConfigs)

    if (!Array.isArray(parsedConfigs)) return new Set<string>()

    return new Set(
      parsedConfigs
        .map((config) =>
          typeof config.accountId === 'string' ? config.accountId : '',
        )
        .filter(Boolean),
    )
  } catch {
    return new Set<string>()
  }
}

function normalizeAccountScope(
  account: LegacyBalanceAccount,
  investmentAccountIds: Set<string>,
): AccountScope {
  if (
    account.accountScope === 'transaction' ||
    account.accountScope === 'investment'
  ) {
    return account.accountScope
  }

  return typeof account.id === 'string' && investmentAccountIds.has(account.id)
    ? 'investment'
    : 'transaction'
}

export function formatBalanceMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function formatBaseBalanceInput(cents: number) {
  return (cents / 100).toFixed(2)
}

export function parseMoneyInputToCents(value: string) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return 0

  return Math.round(numericValue * 100)
}

export function formatAccountBalance(cents: number) {
  return formatBalanceMoney(cents)
}

export function createBalanceCategory(name: string, order: number) {
  const cleanName = name.trim()

  return {
    id: `account-type-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    name: cleanName,
    order,
  }
}

export function loadBalanceCategories() {
  const savedCategories = localStorage.getItem(BALANCE_CATEGORIES_STORAGE_KEY)

  if (!savedCategories) return starterBalanceCategories

  try {
    const parsedCategories = JSON.parse(savedCategories)

    if (!Array.isArray(parsedCategories)) return starterBalanceCategories

    return parsedCategories
      .map((category, index): BalanceCategoryConfig => ({
        id:
          typeof category.id === 'string'
            ? category.id
            : `account-type-${Date.now()}-${index}`,
        name:
          typeof category.name === 'string' && category.name.trim()
            ? category.name.trim()
            : '',
        order:
          typeof category.order === 'number' &&
          Number.isFinite(category.order)
            ? Math.trunc(category.order)
            : index + 1,
      }))
      .filter((category) => category.name)
      .sort((a, b) => a.order - b.order)
  } catch {
    return starterBalanceCategories
  }
}

export function saveBalanceCategories(categories: BalanceCategoryConfig[]) {
  localStorage.setItem(
    BALANCE_CATEGORIES_STORAGE_KEY,
    JSON.stringify(categories),
  )
}

export function loadBalanceAccounts() {
  const savedAccounts = localStorage.getItem(BALANCE_SHEET_STORAGE_KEY)
  const investmentAccountIds = loadInvestmentAccountIds()

  if (!savedAccounts) return starterBalanceAccounts

  try {
    const parsedAccounts = JSON.parse(
      savedAccounts,
    ) as LegacyBalanceAccount[]

    return parsedAccounts
      .map((account, index) => {
        const baseBalanceCents =
          typeof account.baseBalanceCents === 'number'
            ? account.baseBalanceCents
            : account.balanceCents

        return {
          id: account.id ?? `balance-account-${Date.now()}-${index}`,
          name: account.name?.trim() ?? '',
          category:
            typeof account.category === 'string' && account.category.trim()
              ? account.category.trim()
              : 'Liquid',
          accountScope: normalizeAccountScope(account, investmentAccountIds),
          baseBalanceCents:
            typeof baseBalanceCents === 'number' &&
            Number.isFinite(baseBalanceCents)
              ? baseBalanceCents
              : 0,
        }
      })
      .filter((account) => account.name)
  } catch {
    return starterBalanceAccounts
  }
}

export function saveBalanceAccounts(accounts: BalanceAccount[]) {
  localStorage.setItem(BALANCE_SHEET_STORAGE_KEY, JSON.stringify(accounts))
}

function loadBalanceResetAdjustments() {
  const savedAdjustments = localStorage.getItem(
    BALANCE_RESET_ADJUSTMENTS_STORAGE_KEY,
  )

  if (!savedAdjustments) return new Map<string, number>()

  try {
    const parsedAdjustments = JSON.parse(savedAdjustments)

    if (!Array.isArray(parsedAdjustments)) return new Map<string, number>()

    return new Map(
      parsedAdjustments
        .map((adjustment): [string, number] | null => {
          if (
            typeof adjustment.accountId !== 'string' ||
            typeof adjustment.adjustmentCents !== 'number' ||
            !Number.isFinite(adjustment.adjustmentCents)
          ) {
            return null
          }

          return [
            adjustment.accountId,
            Math.round(adjustment.adjustmentCents),
          ]
        })
        .filter((adjustment): adjustment is [string, number] =>
          Boolean(adjustment),
        ),
    )
  } catch {
    return new Map<string, number>()
  }
}

function saveBalanceResetAdjustments(adjustments: Map<string, number>) {
  localStorage.setItem(
    BALANCE_RESET_ADJUSTMENTS_STORAGE_KEY,
    JSON.stringify(
      [...adjustments.entries()].map(([accountId, adjustmentCents]) => ({
        accountId,
        adjustmentCents,
      })),
    ),
  )
}

export function getTransactionAccounts(accounts: BalanceAccount[]) {
  return accounts.filter((account) => account.accountScope === 'transaction')
}

export function getInvestmentAccounts(accounts: BalanceAccount[]) {
  return accounts.filter((account) => account.accountScope === 'investment')
}

export function getCreditAccounts(accounts: BalanceAccount[]) {
  return getTransactionAccounts(accounts).filter(
    (account) => account.category === 'Credit',
  )
}

export function getCashTransactionAccounts(accounts: BalanceAccount[]) {
  return getTransactionAccounts(accounts).filter(
    (account) => account.category !== 'Credit',
  )
}

export function getTransactionAccountEffect(transaction: CurrentMonthEntry) {
  switch (transaction.type) {
    case '+':
    case 'Credit Purchase':
    case 'Liquidation':
      return transaction.amountCents
    case '-':
    case 'Investment':
    case 'Savings':
      return -transaction.amountCents
    default:
      return 0
  }
}

export function getAdjustmentForAccount(
  account: BalanceAccount,
  transactions: CurrentMonthEntry[],
) {
  return transactions
    .reduce((total, transaction) => {
      if (isTransferTransaction(transaction)) {
        if (transaction.fromMedium === account.name) {
          return total - transaction.amountCents
        }

        if (transaction.toMedium === account.name) {
          return total + transaction.amountCents
        }

        return total
      }

      if (isCreditPurchaseTransaction(transaction)) {
        const matchesCreditAccount =
          transaction.creditAccountId === account.id ||
          transaction.creditAccountName === account.name

        return matchesCreditAccount ? total - transaction.amountCents : total
      }

      if (isCreditPaymentTransaction(transaction)) {
        const matchesSourceAccount =
          transaction.sourceAccountId === account.id ||
          transaction.sourceAccountName === account.name
        const matchesCreditAccount =
          transaction.creditAccountId === account.id ||
          transaction.creditAccountName === account.name

        if (matchesSourceAccount) return total - transaction.amountCents
        if (matchesCreditAccount) return total + transaction.amountCents

        return total
      }

      if (transaction.medium !== account.name) return total

      return total + getTransactionAccountEffect(transaction)
    }, 0)
}

export function getBalanceSections(
  accounts: BalanceAccount[],
  transactions: CurrentMonthEntry[],
  getOptionsAdjustment = getOptionsCashAdjustmentForAccount,
) {
  const resetAdjustments = loadBalanceResetAdjustments()
  const accountCategories = loadBalanceCategories()
  const configuredCategoryNames = new Set(
    accountCategories.map((category) => category.name),
  )
  const uncategorizedAccountCategories = accounts
    .map((account) => account.category)
    .filter((category) => category && !configuredCategoryNames.has(category))
  const categories = [
    ...accountCategories.map((category) => category.name),
    ...Array.from(new Set(uncategorizedAccountCategories)).sort(),
  ]

  return categories.map((category) => {
    const sectionAccounts = accounts
      .filter((account) => account.category === category)
      .map((account) => {
        const adjustmentCents = getAdjustmentForAccount(account, transactions)
        const investmentAdjustmentCents =
          getInvestmentCashAdjustmentForAccount(account.id)
        const optionsAdjustmentCents =
          getOptionsAdjustment(account.id)
        const resetAdjustmentCents = resetAdjustments.get(account.id) ?? 0
        const balanceCents =
          account.baseBalanceCents +
          adjustmentCents +
          investmentAdjustmentCents +
          optionsAdjustmentCents +
          resetAdjustmentCents

        return {
          ...account,
          adjustmentCents:
            adjustmentCents +
            investmentAdjustmentCents +
            optionsAdjustmentCents +
            resetAdjustmentCents,
          balanceCents,
          displayBalance: formatAccountBalance(balanceCents),
        }
      })

    const netCents = sectionAccounts.reduce(
      (total, account) => total + account.balanceCents,
      0,
    )

    return {
      title: category,
      accounts: sectionAccounts,
      netCents,
      displayNet: formatAccountBalance(netCents),
    }
  })
}

export function resetLiveBalanceSheet(
  accounts: BalanceAccount[],
  transactions: CurrentMonthEntry[],
) {
  const currentBalances = new Map<string, number>()

  getBalanceSections(accounts, transactions).forEach((section) => {
    section.accounts.forEach((account) => {
      currentBalances.set(account.id, account.balanceCents)
    })
  })

  const resetAdjustments = loadBalanceResetAdjustments()
  const nextAdjustments = new Map<string, number>()

  accounts.forEach((account) => {
    const currentBalanceCents = currentBalances.get(account.id) ?? 0
    const currentResetAdjustmentCents =
      resetAdjustments.get(account.id) ?? 0

    nextAdjustments.set(
      account.id,
      currentResetAdjustmentCents - currentBalanceCents,
    )
  })

  saveBalanceResetAdjustments(nextAdjustments)
}
