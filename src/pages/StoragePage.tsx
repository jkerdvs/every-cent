import { useEffect, useState } from 'react'
import {
  balanceCategories,
  formatBaseBalanceInput,
  loadBalanceAccounts,
  parseMoneyInputToCents,
  saveBalanceAccounts,
} from '../data/balanceSheet'
import type {
  BalanceAccount,
  BalanceCategory,
} from '../data/balanceSheet'
import {
  clearCurrentMonthTransactionMedium,
  clearCurrentMonthTransactionCategory,
  clearCurrentMonthTransactionSubcategory,
  createTransactionCategory,
  createTransactionSubcategory,
  loadTransactionCategories,
  loadTransactionSubcategories,
  renameCurrentMonthTransactionMedium,
  saveTransactionCategories,
  saveTransactionSubcategories,
} from '../data/currentMonth'
import type {
  TransactionCategory,
  TransactionSubcategory,
} from '../data/currentMonth'
import {
  canonicalInvestmentAccountNames,
  createInvestmentAccountConfig,
  deriveInvestmentPositions,
  loadInvestmentAccountConfigs,
  loadInvestmentTransactions,
  saveInvestmentAccountConfigs,
  sortInvestmentAccountConfigs,
} from '../data/ownership'
import type { InvestmentAccountConfig } from '../data/ownership'

function getAccountsWithCanonicalInvestmentAccounts() {
  const loadedAccounts = loadBalanceAccounts()

  return canonicalInvestmentAccountNames.reduce<BalanceAccount[]>(
    (currentAccounts, name) => {
      if (currentAccounts.some((account) => account.name === name)) {
        return currentAccounts
      }

      return [
        ...currentAccounts,
        {
          id: `growth-${name.toLowerCase().replace(/\s+/g, '-')}`,
          name,
          category: 'Growth',
          baseBalanceCents: 0,
        },
      ]
    },
    loadedAccounts,
  )
}

function StoragePage() {
  const [accounts, setAccounts] = useState<BalanceAccount[]>(
    getAccountsWithCanonicalInvestmentAccounts,
  )
  const [accountName, setAccountName] = useState('')
  const [category, setCategory] = useState<BalanceCategory>('Liquid')
  const [baseBalance, setBaseBalance] = useState('')
  const [transactionCategories, setTransactionCategories] = useState<
    TransactionCategory[]
  >(loadTransactionCategories)
  const [transactionSubcategories, setTransactionSubcategories] = useState<
    TransactionSubcategory[]
  >(loadTransactionSubcategories)
  const [newTransactionCategory, setNewTransactionCategory] = useState('')
  const [newTransactionSubcategory, setNewTransactionSubcategory] =
    useState('')
  const [parentCategoryId, setParentCategoryId] = useState(
    () => loadTransactionCategories()[0]?.id ?? '',
  )
  const [investmentAccountConfigs, setInvestmentAccountConfigs] = useState<
    InvestmentAccountConfig[]
  >(() =>
    loadInvestmentAccountConfigs(getAccountsWithCanonicalInvestmentAccounts()),
  )
  const [investmentAccountName, setInvestmentAccountName] = useState('')
  const [investmentAccountOrder, setInvestmentAccountOrder] = useState('')
  const [investmentAccountMessage, setInvestmentAccountMessage] =
    useState('')

  useEffect(() => {
    saveBalanceAccounts(accounts)
  }, [accounts])

  useEffect(() => {
    saveInvestmentAccountConfigs(investmentAccountConfigs)
  }, [investmentAccountConfigs])

  useEffect(() => {
    saveTransactionCategories(transactionCategories)
  }, [transactionCategories])

  useEffect(() => {
    saveTransactionSubcategories(transactionSubcategories)
  }, [transactionSubcategories])

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

    if (!cleanAccountName) return

    const account: BalanceAccount = {
      id: `balance-account-${Date.now()}`,
      name: cleanAccountName,
      category,
      baseBalanceCents: parseMoneyInputToCents(baseBalance),
    }

    setAccounts((currentAccounts) => [...currentAccounts, account])
    setAccountName('')
    setCategory('Liquid')
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

  function addInvestmentAccount() {
    const cleanName = investmentAccountName.trim()
    const order = Number(investmentAccountOrder)

    if (!cleanName || !Number.isFinite(order)) return

    const nextAccount: BalanceAccount = {
      id: `growth-${Date.now()}`,
      name: cleanName,
      category: 'Growth',
      baseBalanceCents: 0,
    }

    setAccounts((currentAccounts) => [...currentAccounts, nextAccount])
    setInvestmentAccountConfigs((currentConfigs) => [
      ...currentConfigs,
      createInvestmentAccountConfig(nextAccount.id, Math.trunc(order)),
    ])
    setInvestmentAccountName('')
    setInvestmentAccountOrder('')
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
    setParentCategoryId((currentParentCategoryId) =>
      currentParentCategoryId || nextCategory.id,
    )
    setNewTransactionCategory('')
  }

  function deleteTransactionCategory(categoryItem: TransactionCategory) {
    const confirmed = window.confirm(
      `Delete "${categoryItem.name}"?\n\nThis will remove the category and its configured subcategories from future transaction selections. Existing transactions will be preserved.`,
    )

    if (!confirmed) return

    const deletedSubcategories = transactionSubcategories.filter(
      (subcategory) => subcategory.categoryId === categoryItem.id,
    )

    clearCurrentMonthTransactionCategory(
      categoryItem.name,
      deletedSubcategories.map((subcategory) => subcategory.name),
    )
    setTransactionCategories((currentCategories) =>
      currentCategories.filter(
        (currentCategory) => currentCategory.id !== categoryItem.id,
      ),
    )
    setTransactionSubcategories((currentSubcategories) =>
      currentSubcategories.filter(
        (subcategory) => subcategory.categoryId !== categoryItem.id,
      ),
    )
    setParentCategoryId((currentParentCategoryId) => {
      if (currentParentCategoryId !== categoryItem.id) {
        return currentParentCategoryId
      }

      return transactionCategories.find(
        (currentCategory) => currentCategory.id !== categoryItem.id,
      )?.id ?? ''
    })
  }

  function addTransactionSubcategory() {
    const cleanName = newTransactionSubcategory.trim()

    if (
      !cleanName ||
      !parentCategoryId ||
      hasDuplicateSubcategory(cleanName)
    ) {
      return
    }

    setTransactionSubcategories((currentSubcategories) => [
      ...currentSubcategories,
      createTransactionSubcategory(cleanName, parentCategoryId),
    ])
    setNewTransactionSubcategory('')
  }

  function deleteTransactionSubcategory(
    subcategoryItem: TransactionSubcategory,
  ) {
    const confirmed = window.confirm(
      `Delete "${subcategoryItem.name}"?\n\nThis will remove the subcategory from future transaction selections. Existing transactions will be preserved.`,
    )

    if (!confirmed) return

    clearCurrentMonthTransactionSubcategory(subcategoryItem.name)
    setTransactionSubcategories((currentSubcategories) =>
      currentSubcategories.filter(
        (subcategory) => subcategory.id !== subcategoryItem.id,
      ),
    )
  }

  function getCategoryName(categoryId: string) {
    return (
      transactionCategories.find(
        (categoryItem) => categoryItem.id === categoryId,
      )?.name ?? ''
    )
  }

  return (
    <main className="storage-page">
      <section className="storage-section">
        <h2>Balance Sheet Accounts</h2>

        <table className="storage-table">
          <thead>
            <tr>
              <th>Account Type</th>
              <th>Account</th>
              <th>Base Balance</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {accounts.map((account) => (
              <tr key={account.id}>
                <td>
                  <select
                    aria-label={`${account.name} account type`}
                    value={account.category}
                    onChange={(event) =>
                      updateAccountType(
                        account.id,
                        event.target.value as BalanceCategory,
                      )
                    }
                  >
                    {balanceCategories.map((item) => (
                      <option key={item} value={item}>
                        {item}
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
                      aria-label={`${account.name} base balance`}
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
                    className="delete-storage-account"
                    type="button"
                    onClick={() => deleteAccount(account)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            <tr className="storage-entry-row">
              <td>
                <select
                  aria-label="New account type"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as BalanceCategory)
                  }
                >
                  {balanceCategories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </td>

              <td>
                <input
                  aria-label="New account name"
                  placeholder="Account Name"
                  type="text"
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                />
              </td>

              <td>
                <div className="storage-money-cell">
                  <span>$</span>
                  <input
                    aria-label="New account base balance"
                    placeholder="Base Balance"
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
          className="add-storage-account"
          type="button"
          onClick={addAccount}
        >
          Add Account
        </button>
      </section>

      <section className="storage-section">
        <h2>Investment Accounts</h2>

        <table className="storage-table storage-investment-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Investment Account</th>
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
                    <button
                      className="delete-storage-account"
                      type="button"
                      onClick={() => deleteInvestmentAccount(config)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}

            <tr className="storage-entry-row">
              <td>
                <input
                  aria-label="New investment account order"
                  placeholder="Order"
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
                  placeholder="Investment Account"
                  type="text"
                  value={investmentAccountName}
                  onChange={(event) =>
                    setInvestmentAccountName(event.target.value)
                  }
                />
              </td>

              <td></td>
            </tr>
          </tbody>
        </table>

        <button
          className="add-storage-account"
          type="button"
          onClick={addInvestmentAccount}
        >
          Add Investment Account
        </button>

        {investmentAccountMessage ? (
          <p className="storage-validation">{investmentAccountMessage}</p>
        ) : null}
      </section>

      <section className="storage-section">
        <h2>Categories</h2>

        <table className="storage-table storage-config-table">
          <thead>
            <tr>
              <th>Category</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {transactionCategories.map((categoryItem) => (
              <tr key={categoryItem.id}>
                <td>{categoryItem.name}</td>
                <td>
                  <button
                    className="delete-storage-account"
                    type="button"
                    onClick={() => deleteTransactionCategory(categoryItem)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            <tr className="storage-entry-row">
              <td>
                <input
                  aria-label="New category name"
                  placeholder="Category Name"
                  type="text"
                  value={newTransactionCategory}
                  onChange={(event) =>
                    setNewTransactionCategory(event.target.value)
                  }
                />
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <button
          className="add-storage-account"
          type="button"
          onClick={addTransactionCategory}
        >
          Add Category
        </button>
      </section>

      <section className="storage-section">
        <h2>Subcategories</h2>

        <table className="storage-table storage-config-table">
          <thead>
            <tr>
              <th>Subcategory</th>
              <th>Parent Category</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {transactionSubcategories.map((subcategoryItem) => (
              <tr key={subcategoryItem.id}>
                <td>{subcategoryItem.name}</td>
                <td>{getCategoryName(subcategoryItem.categoryId)}</td>
                <td>
                  <button
                    className="delete-storage-account"
                    type="button"
                    onClick={() =>
                      deleteTransactionSubcategory(subcategoryItem)
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            <tr className="storage-entry-row">
              <td>
                <input
                  aria-label="New subcategory name"
                  placeholder="Subcategory Name"
                  type="text"
                  value={newTransactionSubcategory}
                  onChange={(event) =>
                    setNewTransactionSubcategory(event.target.value)
                  }
                />
              </td>
              <td>
                <select
                  aria-label="New subcategory parent category"
                  value={parentCategoryId}
                  onChange={(event) =>
                    setParentCategoryId(event.target.value)
                  }
                >
                  {transactionCategories.map((categoryItem) => (
                    <option key={categoryItem.id} value={categoryItem.id}>
                      {categoryItem.name}
                    </option>
                  ))}
                </select>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <button
          className="add-storage-account"
          type="button"
          onClick={addTransactionSubcategory}
        >
          Add Subcategory
        </button>
      </section>
    </main>
  )
}

export default StoragePage
