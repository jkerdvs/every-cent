import { useEffect, useMemo, useState } from 'react'
import {
  balanceCategories,
  formatBaseBalanceInput,
  getBalanceSections,
  loadBalanceAccounts,
  parseMoneyInputToCents,
  saveBalanceAccounts,
} from '../data/balanceSheet'
import { loadCurrentMonthTransactions } from '../data/currentMonth'
import type {
  BalanceAccount,
  BalanceCategory,
} from '../data/balanceSheet'

function BalanceSheetPage() {
  const [accounts, setAccounts] = useState<BalanceAccount[]>(
    loadBalanceAccounts,
  )
  const [accountName, setAccountName] = useState('')
  const [category, setCategory] = useState<BalanceCategory>('Liquid')
  const [baseBalance, setBaseBalance] = useState('')

  useEffect(() => {
    saveBalanceAccounts(accounts)
  }, [accounts])

  const balanceSections = useMemo(() => {
    return getBalanceSections(accounts, loadCurrentMonthTransactions())
  }, [accounts])

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
    <main className="balance-sheet">
      <h1>Balance Sheet</h1>

      <div className="balance-grid">
        {balanceSections.map((section) => (
          <section className="balance-section" key={section.title}>
            <h2>{section.title}</h2>

            <table className="balance-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Base Balance</th>
                  <th>Balance</th>
                </tr>
              </thead>

              <tbody>
                {section.accounts.map((account) => (
                  <tr key={account.name}>
                    <td>{account.name}</td>
                    <td className="base-balance-cell">
                      <span>$</span>
                      <input
                        aria-label={`${account.name} base balance`}
                        step="0.01"
                        type="number"
                        value={formatBaseBalanceInput(
                          account.baseBalanceCents,
                        )}
                        onChange={(event) =>
                          updateBaseBalance(
                            account.id,
                            event.target.value,
                          )
                        }
                      />
                    </td>
                    <td>{account.displayBalance}</td>
                  </tr>
                ))}

                <tr className="net-row">
                  <td>Net</td>
                  <td></td>
                  <td>{section.displayNet}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <div className="add-balance-account">
        <input
          aria-label="Account name"
          placeholder="Account Name"
          type="text"
          value={accountName}
          onChange={(event) => setAccountName(event.target.value)}
        />

        <select
          aria-label="Category"
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

        <div className="new-base-balance">
          <span>$</span>
          <input
            aria-label="Base balance"
            placeholder="Base Balance"
            step="0.01"
            type="number"
            value={baseBalance}
            onChange={(event) => setBaseBalance(event.target.value)}
          />
        </div>

        <button type="button" onClick={addAccount}>
          Add Account
        </button>
      </div>
    </main>
  )
}

export default BalanceSheetPage
