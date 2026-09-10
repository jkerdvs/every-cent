import { useEffect, useState } from 'react'
import {
  createBalanceCategory,
  formatBaseBalanceInput,
  getTransactionAccounts,
  loadBalanceCategories,
  loadBalanceAccounts,
  parseMoneyInputToCents,
  resetLiveBalanceSheet,
  saveBalanceCategories,
  saveBalanceAccounts,
} from '../data/balanceSheet'
import type {
  BalanceAccount,
  BalanceCategory,
  BalanceCategoryConfig,
} from '../data/balanceSheet'
import {
  CURRENT_MONTH_LABEL,
  loadCurrentMonthTransactions,
  clearCurrentMonthTransactionMedium,
  clearCurrentMonthTransactionCategory,
  clearCurrentMonthTransactionSubcategory,
  createTransactionCategory,
  createTransactionSubcategory,
  createTransactionType,
  loadTransactionCategories,
  loadTransactionSubcategories,
  loadTransactionTypes,
  renameCurrentMonthTransactionMedium,
  saveCurrentMonthTransactions,
  saveTransactionCategories,
  saveTransactionSubcategories,
  saveTransactionTypes,
} from '../data/currentMonth'
import type {
  TransactionCategory,
  TransactionSubcategory,
  TransactionType,
} from '../data/currentMonth'
import {
  createInvestmentAccountConfig,
  deriveInvestmentPositions,
  loadInvestmentAccountConfigs,
  loadInvestmentTransactions,
  saveInvestmentAccountConfigs,
  sortInvestmentAccountConfigs,
} from '../data/ownership'
import type { InvestmentAccountConfig } from '../data/ownership'

function TrashIcon() {
  return (
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
  )
}

function createStorageAccountId(prefix: string) {
  return `${prefix}-${Date.now()}`
}

function StoragePage() {
  const [accountCategories, setAccountCategories] = useState<
    BalanceCategoryConfig[]
  >(loadBalanceCategories)
  const [accounts, setAccounts] = useState<BalanceAccount[]>(
    loadBalanceAccounts,
  )
  const [accountName, setAccountName] = useState('')
  const [category, setCategory] = useState<BalanceCategory>('Liquid')
  const [baseBalance, setBaseBalance] = useState('')
  const [newAccountTypeName, setNewAccountTypeName] = useState('')
  const [accountTypeMessage, setAccountTypeMessage] = useState('')
  const [transactionCategories, setTransactionCategories] = useState<
    TransactionCategory[]
  >(loadTransactionCategories)
  const [transactionSubcategories, setTransactionSubcategories] = useState<
    TransactionSubcategory[]
  >(loadTransactionSubcategories)
  const [newTransactionCategory, setNewTransactionCategory] = useState('')
  const [newTransactionSubcategory, setNewTransactionSubcategory] =
    useState('')
  const [transactionTypes, setTransactionTypes] = useState<
    TransactionType[]
  >(loadTransactionTypes)
  const [newTransactionType, setNewTransactionType] = useState('')
  const [transactionConfigMessage, setTransactionConfigMessage] =
    useState('')
  const [investmentAccountConfigs, setInvestmentAccountConfigs] = useState<
    InvestmentAccountConfig[]
  >(() =>
    loadInvestmentAccountConfigs(loadBalanceAccounts()),
  )
  const [investmentAccountName, setInvestmentAccountName] = useState('')
  const [investmentAccountOrder, setInvestmentAccountOrder] = useState('')
  const [investmentAccountStartingCash, setInvestmentAccountStartingCash] =
    useState('')
  const [
    investmentAccountOptionsTrading,
    setInvestmentAccountOptionsTrading,
  ] = useState(false)
  const [investmentAccountMessage, setInvestmentAccountMessage] =
    useState('')

  useEffect(() => {
    saveBalanceAccounts(accounts)
  }, [accounts])

  useEffect(() => {
    saveBalanceCategories(accountCategories)
  }, [accountCategories])

  useEffect(() => {
    saveInvestmentAccountConfigs(investmentAccountConfigs)
  }, [investmentAccountConfigs])

  useEffect(() => {
    saveTransactionCategories(transactionCategories)
  }, [transactionCategories])

  useEffect(() => {
    saveTransactionSubcategories(transactionSubcategories)
  }, [transactionSubcategories])

  useEffect(() => {
    saveTransactionTypes(transactionTypes)
  }, [transactionTypes])

  const sortedAccountCategories = [...accountCategories].sort(
    (a, b) => a.order - b.order,
  )
  const selectedAccountCategory = sortedAccountCategories.some(
    (categoryItem) => categoryItem.name === category,
  )
    ? category
    : sortedAccountCategories[0]?.name ?? ''

  function updateAccountType(
    accountId: string,
    nextCategory: BalanceCategory,
  ) {
    setAccounts((currentAccounts) =>
      currentAccounts.map((account) =>
        account.id === accountId
          ? { ...account, category: nextCategory }
          : account,
      ),
    )
  }

  function updateAccountCategoryOrder(categoryId: string, value: string) {
    const order = Number(value)

    if (!Number.isFinite(order)) return

    setAccountCategories((currentCategories) =>
      currentCategories.map((categoryItem) =>
        categoryItem.id === categoryId
          ? { ...categoryItem, order: Math.trunc(order) }
          : categoryItem,
      ),
    )
  }

  function updateAccountCategoryName(categoryId: string, nextName: string) {
    const previousName = accountCategories.find(
      (categoryItem) => categoryItem.id === categoryId,
    )?.name

    setAccountCategories((currentCategories) =>
      currentCategories.map((categoryItem) =>
        categoryItem.id === categoryId
          ? { ...categoryItem, name: nextName }
          : categoryItem,
      ),
    )

    if (!previousName || previousName === nextName) return

    setAccounts((currentAccounts) =>
      currentAccounts.map((account) =>
        account.category === previousName
          ? { ...account, category: nextName }
          : account,
      ),
    )

    if (category === previousName) {
      setCategory(nextName)
    }
  }

  function addAccountCategory() {
    const cleanName = newAccountTypeName.trim()

    if (!cleanName) return
    if (
      accountCategories.some(
        (categoryItem) =>
          categoryItem.name.trim().toLowerCase() ===
          cleanName.toLowerCase(),
      )
    ) {
      return
    }

    setAccountCategories((currentCategories) => [
      ...currentCategories,
      createBalanceCategory(cleanName, currentCategories.length + 1),
    ])
    setNewAccountTypeName('')
    setAccountTypeMessage('')
  }

  function deleteAccountCategory(categoryItem: BalanceCategoryConfig) {
    const hasAccounts = accounts.some(
      (account) => account.category === categoryItem.name,
    )

    if (hasAccounts) {
      setAccountTypeMessage(
        `Cannot delete "${categoryItem.name}" because accounts use this category.`,
      )
      return
    }

    const confirmed = window.confirm(
      `Delete "${categoryItem.name}"?\n\nThis will remove the account category from future Balance Sheet account selections.`,
    )

    if (!confirmed) return

    setAccountCategories((currentCategories) =>
      currentCategories.filter(
        (currentCategory) => currentCategory.id !== categoryItem.id,
      ),
    )
    setAccountTypeMessage('')
  }

  function updateAccountName(accountId: string, nextName: string) {
    setAccounts((currentAccounts) =>
      currentAccounts.map((account) => {
        if (account.id !== accountId) return account

        renameCurrentMonthTransactionMedium(account.name, nextName)

        return { ...account, name: nextName }
      }),
    )
  }

  function updateBaseBalance(accountId: string, value: string) {
    const baseBalanceCents = parseMoneyInputToCents(value)

    setAccounts((currentAccounts) =>
      currentAccounts.map((account) =>
        account.id === accountId
          ? { ...account, baseBalanceCents }
          : account,
      ),
    )
  }

  function addAccount() {
    const cleanAccountName = accountName.trim()
    const selectedCategory = selectedAccountCategory

    if (!cleanAccountName || !selectedCategory) return

    const account: BalanceAccount = {
      id: createStorageAccountId('balance-account'),
      name: cleanAccountName,
      category: selectedCategory,
      accountScope: 'transaction',
      baseBalanceCents: parseMoneyInputToCents(baseBalance),
    }

    setAccounts((currentAccounts) => [...currentAccounts, account])
    setAccountName('')
    setCategory(sortedAccountCategories[0]?.name ?? '')
    setBaseBalance('')
  }

  function deleteAccount(account: BalanceAccount) {
    const confirmed = window.confirm(
      `Delete "${account.name}"?\n\nThis will remove the account from everyCent and clear its Balance Sheet references from current-month transactions.`,
    )

    if (!confirmed) return

    clearCurrentMonthTransactionMedium(account.name)
    setAccounts((currentAccounts) =>
      currentAccounts.filter(
        (currentAccount) => currentAccount.id !== account.id,
      ),
    )
  }

  const accountById = new Map(
    accounts.map((account) => [account.id, account]),
  )
  const transactionAccounts = getTransactionAccounts(accounts)
  const sortedInvestmentAccountConfigs = sortInvestmentAccountConfigs(
    investmentAccountConfigs,
    (config) => accountById.get(config.accountId)?.name ?? '',
  )
  const investmentTransactions = loadInvestmentTransactions()
  const investmentPositions = deriveInvestmentPositions(
    investmentTransactions,
  )

  function updateInvestmentAccountOrder(
    configId: string,
    value: string,
  ) {
    const order = Number(value)

    if (!Number.isFinite(order)) return

    setInvestmentAccountConfigs((currentConfigs) =>
      currentConfigs.map((config) =>
        config.id === configId
          ? { ...config, order: Math.trunc(order) }
          : config,
      ),
    )
  }

  function updateInvestmentAccountName(accountId: string, value: string) {
    setAccounts((currentAccounts) =>
      currentAccounts.map((account) => {
        if (account.id !== accountId) return account

        renameCurrentMonthTransactionMedium(account.name, value)

        return { ...account, name: value }
      }),
    )
  }

  function updateInvestmentAccountStartingCash(
    configId: string,
    value: string,
  ) {
    const startingCashCents = parseMoneyInputToCents(value)

    setInvestmentAccountConfigs((currentConfigs) =>
      currentConfigs.map((config) =>
        config.id === configId
          ? { ...config, startingCashCents }
          : config,
      ),
    )
  }

  function updateInvestmentAccountOptionsTrading(
    configId: string,
    optionsTrading: boolean,
  ) {
    setInvestmentAccountConfigs((currentConfigs) =>
      currentConfigs.map((config) =>
        config.id === configId ? { ...config, optionsTrading } : config,
      ),
    )
  }

  function addInvestmentAccount() {
    const cleanName = investmentAccountName.trim()
    const order = Number(investmentAccountOrder)

    if (!cleanName || !Number.isFinite(order)) return

    const nextAccount: BalanceAccount = {
      id: createStorageAccountId('investment-account'),
      name: cleanName,
      category:
        sortedAccountCategories.find(
          (categoryItem) => categoryItem.name === 'Growth',
        )
          ?.name ??
        sortedAccountCategories[0]?.name ??
        'Growth',
      accountScope: 'investment',
      baseBalanceCents: 0,
    }

    setAccounts((currentAccounts) => [...currentAccounts, nextAccount])
    setInvestmentAccountConfigs((currentConfigs) => [
      ...currentConfigs,
      createInvestmentAccountConfig(
        nextAccount.id,
        Math.trunc(order),
        parseMoneyInputToCents(investmentAccountStartingCash),
        investmentAccountOptionsTrading,
      ),
    ])
    setInvestmentAccountName('')
    setInvestmentAccountOrder('')
    setInvestmentAccountStartingCash('')
    setInvestmentAccountOptionsTrading(false)
    setInvestmentAccountMessage('')
  }

  function deleteInvestmentAccount(config: InvestmentAccountConfig) {
    const account = accountById.get(config.accountId)
    const accountName = account?.name ?? 'Investment account'
    const hasTransactions = investmentTransactions.some(
      (transaction) => transaction.accountId === config.accountId,
    )
    const hasHoldings = investmentPositions.some(
      (position) => position.accountId === config.accountId,
    )

    if (hasTransactions || hasHoldings) {
      setInvestmentAccountMessage(
        `Cannot delete "${accountName}" because it contains investment transactions or holdings.`,
      )
      return
    }

    const confirmed = window.confirm(
      `Delete "${accountName}"?\n\nThis will remove it from Ownership investment accounts. The Balance Sheet account will remain.`,
    )

    if (!confirmed) return

    setInvestmentAccountConfigs((currentConfigs) =>
      currentConfigs.filter(
        (currentConfig) => currentConfig.id !== config.id,
      ),
    )
    setInvestmentAccountMessage('')
  }

  function hasDuplicateCategory(name: string) {
    return transactionCategories.some(
      (categoryItem) =>
        categoryItem.name.trim().toLowerCase() ===
        name.trim().toLowerCase(),
    )
  }

  function hasDuplicateSubcategory(name: string) {
    return transactionSubcategories.some(
      (subcategory) =>
        subcategory.name.trim().toLowerCase() ===
        name.trim().toLowerCase(),
    )
  }

  function addTransactionCategory() {
    const cleanName = newTransactionCategory.trim()

    if (!cleanName || hasDuplicateCategory(cleanName)) return

    const nextCategory = createTransactionCategory(cleanName)

    setTransactionCategories((currentCategories) => [
      ...currentCategories,
      nextCategory,
    ])
    setNewTransactionCategory('')
  }

  function deleteTransactionCategory(categoryItem: TransactionCategory) {
    const confirmed = window.confirm(
      `Delete "${categoryItem.name}"?\n\nThis will remove the category and its configured subcategories from future transaction selections. Existing transactions will be preserved.`,
    )

    if (!confirmed) return

    clearCurrentMonthTransactionCategory(categoryItem.name)
    setTransactionCategories((currentCategories) =>
      currentCategories.filter(
        (currentCategory) => currentCategory.id !== categoryItem.id,
      ),
    )
  }

  function addTransactionSubcategory() {
    const cleanName = newTransactionSubcategory.trim()

    if (!cleanName || hasDuplicateSubcategory(cleanName)) {
      return
    }

    setTransactionSubcategories((currentSubcategories) => [
      ...currentSubcategories,
      createTransactionSubcategory(cleanName),
    ])
    setNewTransactionSubcategory('')
  }

  function deleteTransactionSubcategory(
    subcategoryItem: TransactionSubcategory,
  ) {
    const confirmed = window.confirm(
      `Delete "${subcategoryItem.name}"?\n\nThis will remove the description from future transaction selections. Existing transactions will be preserved.`,
    )

    if (!confirmed) return

    clearCurrentMonthTransactionSubcategory(subcategoryItem.name)
    setTransactionSubcategories((currentSubcategories) =>
      currentSubcategories.filter(
        (subcategory) => subcategory.id !== subcategoryItem.id,
      ),
    )
  }

  function hasDuplicateTransactionType(name: string) {
    return transactionTypes.some(
      (transactionType) =>
        transactionType.name.trim().toLowerCase() ===
        name.trim().toLowerCase(),
    )
  }

  function addTransactionType() {
    const cleanName = newTransactionType.trim()

    if (!cleanName || hasDuplicateTransactionType(cleanName)) return

    setTransactionTypes((currentTypes) => [
      ...currentTypes,
      createTransactionType(cleanName),
    ])
    setNewTransactionType('')
    setTransactionConfigMessage('')
  }

  function deleteTransactionType(transactionType: TransactionType) {
    const confirmed = window.confirm(
      `Delete "${transactionType.name}"?\n\nThis removes it from future transaction type selections. Existing transactions will be preserved.`,
    )

    if (!confirmed) return

    setTransactionTypes((currentTypes) =>
      currentTypes.filter(
        (currentType) => currentType.id !== transactionType.id,
      ),
    )
  }

  function clearCurrentMonthTransactions() {
    const confirmed = window.confirm(
      `Clear all transactions for ${CURRENT_MONTH_LABEL}?\n\nThis cannot be recovered through this action. Finalized historical months will not be deleted.`,
    )

    if (!confirmed) return

    saveCurrentMonthTransactions([])
  }

  function resetBalanceSheet() {
    const confirmed = window.confirm(
      'Reset Balance Sheet?\n\nAll current Balance Sheet account balances will be reset to $0.00. Configured Starting Balance values will remain unchanged. Finalized historical months will not be changed.',
    )

    if (!confirmed) return

    resetLiveBalanceSheet(accounts, loadCurrentMonthTransactions())
  }

  return (
    <main className="storage-page">
      <section className="storage-group transaction-setup">
        <div className="storage-config-grid transaction-setup-grid">
          <section className="storage-section transaction-setup-section">
            <h2>Categories</h2>

            <div className="storage-list">
              {transactionCategories.map((categoryItem) => (
                <div className="storage-list-row" key={categoryItem.id}>
                  <span>{categoryItem.name}</span>
                  <button
                    aria-label={`Delete ${categoryItem.name} category`}
                    className="delete-storage-account"
                    type="button"
                    onClick={() => deleteTransactionCategory(categoryItem)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}

              <div className="storage-list-row storage-entry-row">
                <input
                  aria-label="New category name"
                  type="text"
                  value={newTransactionCategory}
                  onChange={(event) =>
                    setNewTransactionCategory(event.target.value)
                  }
                />
                <button
                  aria-label="Add category"
                  className="add-storage-account"
                  type="button"
                  onClick={addTransactionCategory}
                >
                  +
                </button>
              </div>
            </div>
          </section>

          <section className="storage-section transaction-setup-section">
            <h2>Descriptions</h2>

            <div className="storage-list">
              {transactionSubcategories.length > 0 ? (
                transactionSubcategories.map((subcategoryItem) => (
                  <div className="storage-list-row" key={subcategoryItem.id}>
                    <span>{subcategoryItem.name}</span>
                    <button
                      aria-label={`Delete ${subcategoryItem.name} description`}
                      className="delete-storage-account"
                      type="button"
                      onClick={() =>
                        deleteTransactionSubcategory(subcategoryItem)
                      }
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))
              ) : (
                <p className="storage-empty">No descriptions yet.</p>
              )}

              <div className="storage-list-row storage-entry-row">
                <input
                  aria-label="New description name"
                  type="text"
                  value={newTransactionSubcategory}
                  onChange={(event) =>
                    setNewTransactionSubcategory(event.target.value)
                  }
                />
                <button
                  aria-label="Add description"
                  className="add-storage-account"
                  type="button"
                  onClick={addTransactionSubcategory}
                >
                  +
                </button>
              </div>
            </div>
          </section>

          <section className="storage-section transaction-setup-section">
            <h2>Transaction Types</h2>

            <div className="storage-list">
              {transactionTypes.map((transactionType) => (
                <div className="storage-list-row" key={transactionType.id}>
                  <span>{transactionType.name}</span>
                  <button
                    aria-label={`Delete ${transactionType.name} transaction type`}
                    className="delete-storage-account"
                    type="button"
                    onClick={() => deleteTransactionType(transactionType)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}

              <div className="storage-list-row storage-entry-row">
                <input
                  aria-label="New transaction type"
                  type="text"
                  value={newTransactionType}
                  onChange={(event) =>
                    setNewTransactionType(event.target.value)
                  }
                />
                <button
                  aria-label="Add transaction type"
                  className="add-storage-account"
                  type="button"
                  onClick={addTransactionType}
                >
                  +
                </button>
              </div>
            </div>

            {transactionConfigMessage ? (
              <p className="storage-validation">{transactionConfigMessage}</p>
            ) : null}
          </section>
        </div>
      </section>

      <section className="storage-group account-setup">
        <section className="storage-section account-categories-section">
          <h2>Account Categories</h2>

          <table className="storage-table storage-type-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Account Category</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {sortedAccountCategories.map((categoryItem) => (
                <tr key={categoryItem.id}>
                  <td>
                    <input
                      aria-label={`${categoryItem.name} account category order`}
                      type="number"
                      value={categoryItem.order}
                      onChange={(event) =>
                        updateAccountCategoryOrder(
                          categoryItem.id,
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`${categoryItem.name} account category name`}
                      type="text"
                      value={categoryItem.name}
                      onChange={(event) =>
                        updateAccountCategoryName(
                          categoryItem.id,
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      aria-label={`Delete ${categoryItem.name} account category`}
                      className="delete-storage-account"
                      type="button"
                      onClick={() => deleteAccountCategory(categoryItem)}
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}

              <tr className="storage-entry-row">
                <td></td>
                <td>
                  <input
                    aria-label="New account category name"
                    type="text"
                    value={newAccountTypeName}
                    onChange={(event) =>
                      setNewAccountTypeName(event.target.value)
                    }
                  />
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <button
            aria-label="Add account category"
            className="add-storage-account"
            type="button"
            onClick={addAccountCategory}
          >
            +
          </button>

          {accountTypeMessage ? (
            <p className="storage-validation">{accountTypeMessage}</p>
          ) : null}
        </section>

        <section className="storage-section accounts-section">
          <h2>Accounts</h2>

          <table className="storage-table">
            <thead>
              <tr>
                <th>Account Category</th>
                <th>Account Name</th>
                <th>Starting Balance</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {transactionAccounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <select
                      aria-label={`${account.name} account category`}
                      value={account.category}
                      onChange={(event) =>
                        updateAccountType(account.id, event.target.value)
                      }
                    >
                      {sortedAccountCategories.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <input
                      aria-label={`${account.name} account name`}
                      type="text"
                      value={account.name}
                      onChange={(event) =>
                        updateAccountName(account.id, event.target.value)
                      }
                    />
                  </td>

                  <td>
                    <div className="storage-money-cell">
                      <span>$</span>
                      <input
                        aria-label={`${account.name} starting balance`}
                        step="0.01"
                        type="number"
                        value={formatBaseBalanceInput(
                          account.baseBalanceCents,
                        )}
                        onChange={(event) =>
                          updateBaseBalance(account.id, event.target.value)
                        }
                      />
                    </div>
                  </td>

                  <td>
                    <button
                      aria-label={`Delete ${account.name} account`}
                      className="delete-storage-account"
                      type="button"
                      onClick={() => deleteAccount(account)}
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}

              <tr className="storage-entry-row">
                <td>
                  <select
                    aria-label="New account category"
                    value={selectedAccountCategory}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {sortedAccountCategories.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </td>

                <td>
                  <input
                    aria-label="New account name"
                    type="text"
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                  />
                </td>

                <td>
                  <div className="storage-money-cell">
                    <span>$</span>
                    <input
                      aria-label="New account starting balance"
                      step="0.01"
                      type="number"
                      value={baseBalance}
                      onChange={(event) => setBaseBalance(event.target.value)}
                    />
                  </div>
                </td>

                <td></td>
              </tr>
            </tbody>
          </table>

          <button
            aria-label="Add account"
            className="add-storage-account"
            type="button"
            onClick={addAccount}
          >
            +
          </button>
        </section>
      </section>

      <section className="storage-group">
        <section className="storage-section investment-accounts-section">
          <h2>Investment Accounts</h2>

          <table className="storage-table storage-investment-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Investment Account</th>
                <th>Starting Cash</th>
                <th>Options Trading</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {sortedInvestmentAccountConfigs.map((config) => {
                const account = accountById.get(config.accountId)

                if (!account) return null

                return (
                  <tr key={config.id}>
                    <td>
                      <input
                        aria-label={`${account.name} investment order`}
                        type="number"
                        value={config.order}
                        onChange={(event) =>
                          updateInvestmentAccountOrder(
                            config.id,
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        aria-label={`${account.name} investment account name`}
                        type="text"
                        value={account.name}
                        onChange={(event) =>
                          updateInvestmentAccountName(
                            account.id,
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td>
                      <div className="storage-money-cell">
                        <span>$</span>
                        <input
                          aria-label={`${account.name} starting cash`}
                          step="0.01"
                          type="number"
                          value={formatBaseBalanceInput(
                            config.startingCashCents,
                          )}
                          onChange={(event) =>
                            updateInvestmentAccountStartingCash(
                              config.id,
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </td>

                    <td>
                      <input
                        aria-label={`${account.name} options trading`}
                        checked={config.optionsTrading}
                        className="storage-checkbox"
                        type="checkbox"
                        onChange={(event) =>
                          updateInvestmentAccountOptionsTrading(
                            config.id,
                            event.target.checked,
                          )
                        }
                      />
                    </td>

                    <td>
                      <button
                        aria-label={`Delete ${account.name} investment account`}
                        className="delete-storage-account"
                        type="button"
                        onClick={() => deleteInvestmentAccount(config)}
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                )
              })}

              <tr className="storage-entry-row">
                <td>
                  <input
                    aria-label="New investment account order"
                    type="number"
                    value={investmentAccountOrder}
                    onChange={(event) =>
                      setInvestmentAccountOrder(event.target.value)
                    }
                  />
                </td>

                <td>
                  <input
                    aria-label="New investment account name"
                    type="text"
                    value={investmentAccountName}
                    onChange={(event) =>
                      setInvestmentAccountName(event.target.value)
                    }
                  />
                </td>

                <td>
                  <div className="storage-money-cell">
                    <span>$</span>
                    <input
                      aria-label="New investment account starting cash"
                      step="0.01"
                      type="number"
                      value={investmentAccountStartingCash}
                      onChange={(event) =>
                        setInvestmentAccountStartingCash(event.target.value)
                      }
                    />
                  </div>
                </td>

                <td>
                  <input
                    aria-label="New investment account options trading"
                    checked={investmentAccountOptionsTrading}
                    className="storage-checkbox"
                    type="checkbox"
                    onChange={(event) =>
                      setInvestmentAccountOptionsTrading(
                        event.target.checked,
                      )
                    }
                  />
                </td>

                <td></td>
              </tr>
            </tbody>
          </table>

        <button
          aria-label="Add investment account"
          className="add-storage-account"
          type="button"
          onClick={addInvestmentAccount}
        >
          +
        </button>

        {investmentAccountMessage ? (
          <p className="storage-validation">{investmentAccountMessage}</p>
        ) : null}
      </section>
      </section>

      <section className="storage-controls" aria-label="Storage controls">
        <button type="button" onClick={clearCurrentMonthTransactions}>
          Clear Current Month Transactions
        </button>

        <button type="button" onClick={resetBalanceSheet}>
          Reset Balance Sheet
        </button>
      </section>
    </main>
  )
}

export default StoragePage
