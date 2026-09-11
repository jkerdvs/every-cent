import { useMemo, useState } from 'react'
import {
  getBalanceSections,
  getInvestmentAccounts,
  loadBalanceAccounts,
} from '../data/balanceSheet'
import type { BalanceAccount } from '../data/balanceSheet'
import {
  CURRENT_MONTH_ID,
  CURRENT_MONTH_LABEL,
  calculateMonthTotals,
  loadCurrentMonthTransactions,
} from '../data/currentMonth'
import {
  formatMoney,
  getAmountInvestedByAccount,
  loadInvestmentAccountConfigs,
  loadInvestmentTransactions,
  sortInvestmentAccountConfigs,
} from '../data/ownership'
import type { InvestmentTransaction } from '../data/ownership'
import { loadOptionTrades } from '../data/system'
import type { OptionTrade } from '../data/system'

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

function isCurrentMonthDate(value: number) {
  const year = Math.floor(value / 10000)
  const month = Math.floor((value % 10000) / 100)
  const monthId = `${year}-${String(month).padStart(2, '0')}`

  return monthId === CURRENT_MONTH_ID
}

function addSignedRealizedAmount(
  totals: {
    profitCents: number
    lossCents: number
    realizedProfitLossCents: number
  },
  amountCents: number,
) {
  if (amountCents > 0) {
    return {
      ...totals,
      profitCents: totals.profitCents + amountCents,
      realizedProfitLossCents:
        totals.realizedProfitLossCents + amountCents,
    }
  }

  if (amountCents < 0) {
    return {
      ...totals,
      lossCents: totals.lossCents + Math.abs(amountCents),
      realizedProfitLossCents:
        totals.realizedProfitLossCents + amountCents,
    }
  }

  return totals
}

function addInvestmentRealizedTotals(
  totals: {
    profitCents: number
    lossCents: number
    realizedProfitLossCents: number
  },
  transactions: InvestmentTransaction[],
) {
  return transactions
    .filter(
      (transaction) =>
        transaction.type === 'sell' &&
        isCurrentMonthDate(transaction.date) &&
        typeof transaction.netGainLossCents === 'number',
    )
    .reduce(
      (nextTotals, transaction) =>
        addSignedRealizedAmount(
          nextTotals,
          transaction.netGainLossCents ?? 0,
        ),
      totals,
    )
}

function addOptionRealizedTotals(
  totals: {
    profitCents: number
    lossCents: number
    realizedProfitLossCents: number
  },
  trades: OptionTrade[],
) {
  return trades
    .filter(
      (trade) =>
        trade.status === 'closed' &&
        typeof trade.closeDate === 'number' &&
        isCurrentMonthDate(trade.closeDate) &&
        typeof trade.realizedProfitLossCents === 'number',
    )
    .reduce(
      (nextTotals, trade) =>
        addSignedRealizedAmount(
          nextTotals,
          trade.realizedProfitLossCents ?? 0,
        ),
      totals,
    )
}

function getLiveSnapshot(): MonthlySnapshot {
  const transactions = loadCurrentMonthTransactions()
  const investmentTransactions = loadInvestmentTransactions()
  const optionTrades = loadOptionTrades()
  const monthTotals = addOptionRealizedTotals(
    addInvestmentRealizedTotals(
      calculateMonthTotals(transactions),
      investmentTransactions,
    ),
    optionTrades,
  )
  const balanceAccounts = loadBalanceAccounts()
  const amountInvestedByAccount = getAmountInvestedByAccount(
    investmentTransactions,
  )
  const investmentBalanceAccounts = getInvestmentAccounts(balanceAccounts)
  const accountById = new Map(
    investmentBalanceAccounts.map((account) => [account.id, account]),
  )
  const investedAccounts = sortInvestmentAccountConfigs(
    loadInvestmentAccountConfigs(balanceAccounts),
    (config) => accountById.get(config.accountId)?.name ?? '',
  )
    .map((config) => accountById.get(config.accountId))
    .filter((account): account is BalanceAccount => Boolean(account))
    .map((account) => ({
      name: account.name,
      amountCents: amountInvestedByAccount.get(account.id) ?? 0,
    }))
  const totalInvestedCents = investedAccounts.reduce(
    (total, account) => total + account.amountCents,
    0,
  )

  return {
    monthId: CURRENT_MONTH_ID,
    monthLabel: CURRENT_MONTH_LABEL,
    monthTotals,
    balanceSheet: getBalanceSections(balanceAccounts, transactions),
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
  isPrimary = false,
  label,
  onUndoFinalize,
  snapshot,
}: {
  isPrimary?: boolean
  label: string
  onUndoFinalize?: () => void
  snapshot: MonthlySnapshot
}) {
  const Heading = isPrimary ? 'h1' : 'h2'

  return (
    <section className="totals-month">
      <div className="totals-month-heading">
        <Heading>{snapshot.monthLabel}</Heading>
        <div className="totals-month-heading-actions">
          <span>{label}</span>
          {onUndoFinalize ? (
            <button type="button" onClick={onUndoFinalize}>
              Undo Finalize
            </button>
          ) : null}
        </div>
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

  function undoLatestFinalization() {
    const latestSnapshot = sortedSnapshots[0]

    if (!latestSnapshot) return

    let removedLatestSnapshot = false
    const nextSnapshots = snapshots.filter((snapshot) => {
      if (
        !removedLatestSnapshot &&
        snapshot.monthId === latestSnapshot.monthId
      ) {
        removedLatestSnapshot = true
        return false
      }

      return true
    })

    setSnapshots(nextSnapshots)
    localStorage.setItem(
      MONTHLY_TOTALS_STORAGE_KEY,
      JSON.stringify(nextSnapshots),
    )
  }

  return (
    <main className="totals-page">
      <section className="totals-section totals-current-section">
        <TotalsMonthBlock
          isPrimary
          label="Live"
          snapshot={liveSnapshot}
        />
      </section>

      <section className="totals-section">
        <div className="totals-history-heading">
          <h2>Historical Months</h2>
          <button
            disabled={hasCurrentSnapshot}
            type="button"
            onClick={finalizeCurrentMonth}
          >
            Finalize Current Month
          </button>
        </div>

        {sortedSnapshots.length > 0 ? (
          sortedSnapshots.map((snapshot) => (
            <TotalsMonthBlock
              key={snapshot.monthId}
              label="Frozen"
              onUndoFinalize={
                snapshot === sortedSnapshots[0]
                  ? undoLatestFinalization
                  : undefined
              }
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
