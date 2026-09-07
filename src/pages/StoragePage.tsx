import { useEffect, useState } from 'react'
import {
  createBalanceCategory,
  formatBaseBalanceInput,
  getTransactionAccounts,
  loadBalanceCategories,
  loadBalanceAccounts,
  parseMoneyInputToCents,
  saveBalanceCategories,
  saveBalanceAccounts,
} from '../data/balanceSheet'
import type {
  BalanceAccount,
  BalanceCategory,
  BalanceCategoryConfig,
} from '../data/balanceSheet'
import {
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
        `Cannot delete "${categoryItem.name}" because accounts use this type.`,
      )
      return
    }

    const confirmed = window.confirm(
      `Delete "${categoryItem.name}"?\n\nThis will remove the account type from future Balance Sheet account selections.`,
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

  return (
    <main className="storage-page">
      <section className="storage-group">
        <h1>Transaction Setup</h1>

        <div className="storage-config-grid">
          <section className="storage-section">
            <h2>Categories</h2>

            <div className="storage-list">
              {transactionCategories.map((categoryItem) => (
                <div className="storage-list-row" key={categoryItem.id}>
                  <span>{categoryItem.name}</span>
                  <button
                    className="delete-storage-account"
                    type="button"
                    onClick={() => deleteTransactionCategory(categoryItem)}
                  >
                    Delete
                  </button>
                </div>
              ))}

              <div className="storage-list-row storage-entry-row">
                <input
                  aria-label="New category name"
                  placeholder="Category Name"
                  type="text"
                  value={newTransactionCategory}
                  onChange={(event) =>
                    setNewTransactionCategory(event.target.value)
                  }
                />
                <button
                  className="add-storage-account"
                  type="button"
                  onClick={addTransactionCategory}
                >
                  Add Category
                </button>
              </div>
            </div>
          </section>

          <section className="storage-section">
            <h2>Descriptions</h2>

            <div className="storage-list">
              {transactionSubcategories.length > 0 ? (
                transactionSubcategories.map((subcategoryItem) => (
                  <div className="storage-list-row" key={subcategoryItem.id}>
                    <span>{subcategoryItem.name}</span>
                    <button
                      className="delete-storage-account"
                      type="button"
                      onClick={() =>
                        deleteTransactionSubcategory(subcategoryItem)
                      }
                    >
                      Delete
                    </button>
                  </div>
                ))
              ) : (
                <p className="storage-empty">No descriptions yet.</p>
              )}

              <div className="storage-list-row storage-entry-row">
                <input
                  aria-label="New description name"
                  placeholder="Description Name"
                  type="text"
                  value={newTransactionSubcategory}
                  onChange={(event) =>
                    setNewTransactionSubcategory(event.target.value)
                  }
                />
                <button
                  className="add-storage-account"
                  type="button"
                  onClick={addTransactionSubcategory}
                >
                  Add Description
                </button>
              </div>
            </div>
          </section>

          <section className="storage-section">
            <h2>Transaction Types</h2>

            <div className="storage-list">
              {transactionTypes.map((transactionType) => (
                <div className="storage-list-row" key={transactionType.id}>
                  <span>{transactionType.name}</span>
                  <button
                    className="delete-storage-account"
                    type="button"
                    onClick={() => deleteTransactionType(transactionType)}
                  >
                    Delete
                  </button>
                </div>
              ))}

              <div className="storage-list-row storage-entry-row">
                <input
                  aria-label="New transaction type"
                  placeholder="Type"
                  type="text"
                  value={newTransactionType}
                  onChange={(event) =>
                    setNewTransactionType(event.target.value)
                  }
                />
                <button
                  className="add-storage-account"
                  type="button"
                  onClick={addTransactionType}
                >
                  Add Type
                </button>
              </div>
            </div>

            {transactionConfigMessage ? (
              <p className="storage-validation">{transactionConfigMessage}</p>
            ) : null}
          </section>
        </div>
      </section>

      <section className="storage-group">
        <h1>Account Setup</h1>

        <section className="storage-section">
          <h2>Account Types</h2>

          <table className="storage-table storage-type-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Account Type</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {sortedAccountCategories.map((categoryItem) => (
                <tr key={categoryItem.id}>
                  <td>
                    <input
                      aria-label={`${categoryItem.name} account type order`}
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
                      aria-label={`${categoryItem.name} account type name`}
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
                      className="delete-storage-account"
                      type="button"
                      onClick={() => deleteAccountCategory(categoryItem)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              <tr className="storage-entry-row">
                <td></td>
                <td>
                  <input
                    aria-label="New account type name"
                    placeholder="Account Type"
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
            className="add-storage-account"
            type="button"
            onClick={addAccountCategory}
          >
            Add Account Type
          </button>

          {accountTypeMessage ? (
            <p className="storage-validation">{accountTypeMessage}</p>
          ) : null}
        </section>

        <section className="storage-section">
          <h2>Accounts</h2>

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
              {transactionAccounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <select
                      aria-label={`${account.name} account type`}
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
      </section>

      <section className="storage-group">
        <h1>Investment Setup</h1>

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
      </section>
    </main>
  )
}

export default StoragePage
