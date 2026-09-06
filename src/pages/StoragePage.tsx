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
import { renameCurrentMonthTransactionMedium } from '../data/currentMonth'

function StoragePage() {
  const [accounts, setAccounts] = useState<BalanceAccount[]>(
    loadBalanceAccounts,
  )
  const [accountName, setAccountName] = useState('')
  const [category, setCategory] = useState<BalanceCategory>('Liquid')
  const [baseBalance, setBaseBalance] = useState('')

  useEffect(() => {
    saveBalanceAccounts(accounts)
  }, [accounts])

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

  return (
    <main className="storage-page">
      <h1>Storage</h1>

      <section className="storage-section">
        <h2>Balance Sheet Accounts</h2>

        <table className="storage-table">
          <thead>
            <tr>
              <th>Account Type</th>
              <th>Account</th>
              <th>Base Balance</th>
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
    </main>
  )
}

export default StoragePage
