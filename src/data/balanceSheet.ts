import type { Transaction } from './currentMonth'
import { getInvestmentCashAdjustmentForAccount } from './ownership'

export type BalanceCategory = 'Save' | 'Liquid' | 'Growth' | 'Credit'

export type BalanceAccount = {
  id: string
  name: string
  category: BalanceCategory
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

export const balanceCategories: BalanceCategory[] = [
  'Save',
  'Liquid',
  'Growth',
  'Credit',
]

export const starterBalanceAccounts: BalanceAccount[] = [
  {
    id: 'save-ally',
    name: 'Ally',
    category: 'Save',
    baseBalanceCents: 119300,
  },
  {
    id: 'save-robinhood',
    name: 'Robinhood',
    category: 'Save',
    baseBalanceCents: 0,
  },
  {
    id: 'liquid-cash',
    name: 'Cash',
    category: 'Liquid',
    baseBalanceCents: 0,
  },
  {
    id: 'liquid-checking',
    name: 'Checking',
    category: 'Liquid',
    baseBalanceCents: 7085,
  },
  {
    id: 'liquid-venmo',
    name: 'Venmo',
    category: 'Liquid',
    baseBalanceCents: 0,
  },
  {
    id: 'growth-coinbase',
    name: 'Coinbase',
    category: 'Growth',
    baseBalanceCents: 3500,
  },
  {
    id: 'growth-equity',
    name: 'Equity',
    category: 'Growth',
    baseBalanceCents: 14000,
  },
  {
    id: 'growth-equities',
    name: 'Equities',
    category: 'Growth',
    baseBalanceCents: 0,
  },
  {
    id: 'growth-roth',
    name: 'Roth',
    category: 'Growth',
    baseBalanceCents: 24695,
  },
  {
    id: 'credit-coinbase-one',
    name: 'Coinbase One',
    category: 'Credit',
    baseBalanceCents: 0,
  },
  {
    id: 'credit-platinum',
    name: 'Platinum',
    category: 'Credit',
    baseBalanceCents: 0,
  },
  {
    id: 'credit-quicksilver',
    name: 'Quicksilver',
    category: 'Credit',
    baseBalanceCents: 0,
  },
  {
    id: 'credit-robinhood-gold',
    name: 'Robinhood Gold',
    category: 'Credit',
    baseBalanceCents: 0,
  },
]

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

export function formatAccountBalance(
  cents: number,
  category: BalanceCategory,
) {
  if (category !== 'Credit') return formatBalanceMoney(cents)
  if (cents >= 0) return `-${formatBalanceMoney(cents)}`

  return formatBalanceMoney(Math.abs(cents))
}

export function loadBalanceAccounts() {
  const savedAccounts = localStorage.getItem(BALANCE_SHEET_STORAGE_KEY)

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
          category: balanceCategories.includes(
            account.category as BalanceCategory,
          )
            ? (account.category as BalanceCategory)
            : 'Liquid',
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

export function getTransactionAccountEffect(transaction: Transaction) {
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
  accountName: string,
  transactions: Transaction[],
) {
  return transactions
    .filter((transaction) => transaction.medium === accountName)
    .reduce(
      (total, transaction) =>
        total + getTransactionAccountEffect(transaction),
      0,
    )
}

export function getBalanceSections(
  accounts: BalanceAccount[],
  transactions: Transaction[],
) {
  return balanceCategories.map((category) => {
    const sectionAccounts = accounts
      .filter((account) => account.category === category)
      .map((account) => {
        const adjustmentCents = getAdjustmentForAccount(
          account.name,
          transactions,
        )
        const investmentAdjustmentCents =
          getInvestmentCashAdjustmentForAccount(account.id)
        const balanceCents =
          account.baseBalanceCents +
          adjustmentCents +
          investmentAdjustmentCents

        return {
          ...account,
          adjustmentCents: adjustmentCents + investmentAdjustmentCents,
          balanceCents,
          displayBalance: formatAccountBalance(balanceCents, category),
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
      displayNet: formatAccountBalance(netCents, category),
    }
  })
}
