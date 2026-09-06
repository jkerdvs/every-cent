import {
  getBalanceSections,
  loadBalanceAccounts,
} from '../data/balanceSheet'
import { loadCurrentMonthTransactions } from '../data/currentMonth'
import type { BalanceAccount } from '../data/balanceSheet'

function BalanceSheetPage() {
  const accounts: BalanceAccount[] = loadBalanceAccounts()
  const balanceSections = getBalanceSections(
    accounts,
    loadCurrentMonthTransactions(),
  )

  return (
    <main className="balance-sheet">
      <div className="balance-grid">
        {balanceSections.map((section) => (
          <section className="balance-section" key={section.title}>
            <h2>{section.title}</h2>

            <table className="balance-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Balance</th>
                </tr>
              </thead>

              <tbody>
                {section.accounts.map((account) => (
                  <tr key={account.name}>
                    <td>{account.name}</td>
                    <td>{account.displayBalance}</td>
                  </tr>
                ))}

                <tr className="net-row">
                  <td>Net</td>
                  <td>{section.displayNet}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </main>
  )
}

export default BalanceSheetPage
