import { useMemo, useState } from 'react'
import { balanceSections } from '../data/balanceSheet'
import {
  CURRENT_MONTH_ID,
  CURRENT_MONTH_LABEL,
  calculateMonthTotals,
  loadCurrentMonthTransactions,
} from '../data/currentMonth'
import { formatMoney, loadInvestedAccounts } from '../data/ownership'

type MonthlySnapshot = {
  monthId: string
  monthLabel: string
  monthTotals: {
    profitCents: number
    lossCents: number
    realizedProfitLossCents: number
  }
  balanceSheet: {
    title: string
    accounts: {
      name: string
      balanceCents: number
      displayBalance: string
    }[]
    netCents: number
    displayNet: string
  }[]
  amountInvested: {
    accounts: {
      name: string
      amountCents: number
    }[]
    totalCents: number
  }
}

const MONTHLY_TOTALS_STORAGE_KEY = 'every-cent-monthly-totals'

function loadSnapshots() {
  const savedSnapshots = localStorage.getItem(MONTHLY_TOTALS_STORAGE_KEY)

  if (!savedSnapshots) return []

  try {
    return JSON.parse(savedSnapshots) as MonthlySnapshot[]
  } catch {
    return []
  }
}

function getRealizedClass(cents: number) {
  if (cents > 0) return 'positive'
  if (cents < 0) return 'negative'

  return 'neutral'
}

function getLiveSnapshot(): MonthlySnapshot {
  const transactions = loadCurrentMonthTransactions()
  const monthTotals = calculateMonthTotals(transactions)
  const investedAccounts = loadInvestedAccounts()
  const totalInvestedCents = investedAccounts.reduce(
    (total, account) => total + account.amountCents,
    0,
  )

  return {
    monthId: CURRENT_MONTH_ID,
    monthLabel: CURRENT_MONTH_LABEL,
    monthTotals,
    balanceSheet: balanceSections,
    amountInvested: {
      accounts: investedAccounts,
      totalCents: totalInvestedCents,
    },
  }
}

function renderMoney(cents: number) {
  return formatMoney(cents)
}

function TotalsMonthBlock({
  label,
  snapshot,
}: {
  label: string
  snapshot: MonthlySnapshot
}) {
  return (
    <section className="totals-month">
      <div className="totals-month-heading">
        <h2>{snapshot.monthLabel}</h2>
        <span>{label}</span>
      </div>

      <div className="totals-layout">
        <section className="totals-on-month">
          <h3>On the Month</h3>
          <p>Profit: {renderMoney(snapshot.monthTotals.profitCents)}</p>
          <p>Loss: {renderMoney(snapshot.monthTotals.lossCents)}</p>
          <p>
            Realized Profit & Loss:{' '}
            <span
              className={`totals-realized ${getRealizedClass(
                snapshot.monthTotals.realizedProfitLossCents,
              )}`}
            >
              {renderMoney(
                snapshot.monthTotals.realizedProfitLossCents,
              )}
            </span>
          </p>
        </section>

        <section className="totals-balance">
          <h3>Balance Sheet</h3>
          <div className="totals-balance-grid">
            {snapshot.balanceSheet.map((section) => (
              <table key={section.title}>
                <thead>
                  <tr>
                    <th colSpan={2}>{section.title}</th>
                  </tr>
                </thead>
                <tbody>
                  {section.accounts.map((account) => (
                    <tr key={account.name}>
                      <td>{account.name}</td>
                      <td>{account.displayBalance}</td>
                    </tr>
                  ))}
                  <tr className="totals-net-row">
                    <td>Net</td>
                    <td>{section.displayNet}</td>
                  </tr>
                </tbody>
              </table>
            ))}
          </div>
        </section>

        <section className="totals-invested">
          <h3>Amount Invested</h3>
          <table>
            <tbody>
              {snapshot.amountInvested.accounts.map((account) => (
                <tr key={account.name}>
                  <td>{account.name}</td>
                  <td>{renderMoney(account.amountCents)}</td>
                </tr>
              ))}
              <tr className="totals-net-row">
                <td>Total</td>
                <td>{renderMoney(snapshot.amountInvested.totalCents)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </section>
  )
}

function TotalsPage() {
  const [snapshots, setSnapshots] =
    useState<MonthlySnapshot[]>(loadSnapshots)
  const liveSnapshot = getLiveSnapshot()
  const hasCurrentSnapshot = snapshots.some(
    (snapshot) => snapshot.monthId === CURRENT_MONTH_ID,
  )
  const sortedSnapshots = useMemo(() => {
    return [...snapshots].sort((a, b) =>
      b.monthId.localeCompare(a.monthId),
    )
  }, [snapshots])

  function finalizeCurrentMonth() {
    if (hasCurrentSnapshot) return

    const nextSnapshots = [liveSnapshot, ...snapshots]
    setSnapshots(nextSnapshots)
    localStorage.setItem(
      MONTHLY_TOTALS_STORAGE_KEY,
      JSON.stringify(nextSnapshots),
    )
  }

  return (
    <main className="totals-page">
      <div className="totals-header">
        <h1>Totals</h1>
        <button
          disabled={hasCurrentSnapshot}
          type="button"
          onClick={finalizeCurrentMonth}
        >
          Finalize Current Month
        </button>
      </div>

      <section className="totals-section">
        <h2>Current Month</h2>
        <TotalsMonthBlock label="Live" snapshot={liveSnapshot} />
      </section>

      <section className="totals-section">
        <h2>Historical Months</h2>

        {sortedSnapshots.length > 0 ? (
          sortedSnapshots.map((snapshot) => (
            <TotalsMonthBlock
              key={snapshot.monthId}
              label="Frozen"
              snapshot={snapshot}
            />
          ))
        ) : (
          <p className="totals-empty">
            No finalized monthly snapshots yet.
          </p>
        )}
      </section>
    </main>
  )
}

export default TotalsPage
