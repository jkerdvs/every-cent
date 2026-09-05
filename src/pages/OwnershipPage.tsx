import { useEffect, useMemo, useState } from 'react'
import {
  HOLDINGS_STORAGE_KEY,
  INVESTED_STORAGE_KEY,
  canonicalInvestedAccounts,
  formatMoney,
  loadHoldings,
  loadInvestedAccounts,
} from '../data/ownership'
import type { Holding, InvestedAccount } from '../data/ownership'

function formatShares(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
  }).format(value)
}

function formatMoneyInput(cents: number) {
  return (cents / 100).toFixed(2)
}

function getNetAddedClass(netAdded: number) {
  if (netAdded > 0) return 'positive'
  if (netAdded < 0) return 'negative'

  return 'neutral'
}

function getCurrentShares(holding: Holding) {
  return holding.baseShares + holding.netAdded
}

function OwnershipPage() {
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings)
  const [investedAccounts, setInvestedAccounts] = useState<
    InvestedAccount[]
  >(loadInvestedAccounts)

  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')
  const [account, setAccount] = useState(canonicalInvestedAccounts[0].name)
  const [costBasisDigits, setCostBasisDigits] = useState('')

  useEffect(() => {
    localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdings))
  }, [holdings])

  useEffect(() => {
    localStorage.setItem(
      INVESTED_STORAGE_KEY,
      JSON.stringify(investedAccounts),
    )
  }, [investedAccounts])

  const totalInvestedCents = useMemo(() => {
    return investedAccounts.reduce(
      (total, investedAccount) => total + investedAccount.amountCents,
      0,
    )
  }, [investedAccounts])

  const costBasisCents = costBasisDigits ? Number(costBasisDigits) : 0

  function addHolding() {
    const cleanTicker = ticker.trim().toUpperCase()
    const parsedShares = Number(shares)

    if (
      !cleanTicker ||
      !Number.isFinite(parsedShares)
    ) {
      return
    }

    const holding: Holding = {
      id: Date.now(),
      ticker: cleanTicker,
      baseShares: parsedShares,
      netAdded: 0,
    }

    setHoldings((currentHoldings) => [...currentHoldings, holding])
    setInvestedAccounts((currentAccounts) =>
      currentAccounts.map((currentAccount) =>
        currentAccount.name === account
          ? {
              ...currentAccount,
              amountCents:
                currentAccount.amountCents + costBasisCents,
            }
          : currentAccount,
      ),
    )
    setTicker('')
    setShares('')
    setAccount(canonicalInvestedAccounts[0].name)
    setCostBasisDigits('')
  }

  function updateHoldingNetAdded(holdingId: number, value: string) {
    const parsedNetAdded = Number(value)

    if (!Number.isFinite(parsedNetAdded)) return

    setHoldings((currentHoldings) =>
      currentHoldings.map((holding) =>
        holding.id === holdingId
          ? { ...holding, netAdded: parsedNetAdded }
          : holding,
      ),
    )
  }

  function adjustHoldingNetAdded(holdingId: number, amount: number) {
    setHoldings((currentHoldings) =>
      currentHoldings.map((holding) =>
        holding.id === holdingId
          ? { ...holding, netAdded: holding.netAdded + amount }
          : holding,
      ),
    )
  }

  function updateCostBasis(value: string) {
    setCostBasisDigits(value.replace(/\D/g, ''))
  }

  return (
    <main className="ownership-page">
      <header className="ownership-header">
        <h1>Ownership</h1>
        <p>Ownership is the goal.</p>
      </header>

      <div className="ownership-layout">
        <section className="ownership-portfolio">
          <div className="portfolio-heading">
            <h2>Portfolio</h2>
          </div>

          <table className="ownership-table">
            <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Shares</th>
                  <th>Net Added</th>
                </tr>
              </thead>

            <tbody>
              {holdings.map((holding) => (
                <tr key={holding.id}>
                  <td>{holding.ticker}</td>
                  <td>{formatShares(getCurrentShares(holding))}</td>
                  <td
                    className={`net-added ${getNetAddedClass(
                      holding.netAdded,
                    )}`}
                  >
                    <div className="net-added-control">
                      <button
                        aria-label={`Decrease ${holding.ticker} net added`}
                        type="button"
                        onClick={() =>
                          adjustHoldingNetAdded(holding.id, -1)
                        }
                      >
                        -
                      </button>

                      <input
                        aria-label={`${holding.ticker} net added`}
                        step="any"
                        type="number"
                        value={holding.netAdded}
                        onChange={(event) =>
                          updateHoldingNetAdded(
                            holding.id,
                            event.target.value,
                          )
                        }
                      />

                      <button
                        aria-label={`Increase ${holding.ticker} net added`}
                        type="button"
                        onClick={() =>
                          adjustHoldingNetAdded(holding.id, 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {holdings.length === 0 ? (
                <tr>
                  <td className="empty-holdings" colSpan={3}>
                    Add an equity to start tracking ownership.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="add-equity">
            <input
              aria-label="Ticker"
              placeholder="Ticker"
              type="text"
              value={ticker}
              onChange={(event) =>
                setTicker(event.target.value.toUpperCase())
              }
            />

            <input
              aria-label="Shares"
              placeholder="Shares"
              step="any"
              type="number"
              value={shares}
              onChange={(event) => setShares(event.target.value)}
            />

            <select
              aria-label="Account"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
            >
              {canonicalInvestedAccounts.map((investedAccount) => (
                <option
                  key={investedAccount.name}
                  value={investedAccount.name}
                >
                  {investedAccount.name}
                </option>
              ))}
            </select>

            <div className="add-cost-basis">
              <span className="cost-basis-dollar">$</span>
              <input
                aria-label="Cost Basis"
                inputMode="numeric"
                placeholder="Cost Basis"
                type="text"
                value={formatMoneyInput(costBasisCents)}
                onChange={(event) => updateCostBasis(event.target.value)}
              />
            </div>

            <button type="button" onClick={addHolding}>
              Add Equity
            </button>
          </div>
        </section>

        <section className="amount-invested">
          <h2>Amount Invested</h2>

          <table className="invested-table">
            <tbody>
              {investedAccounts.map((investedAccount) => (
                <tr key={investedAccount.name}>
                  <td>{investedAccount.name}</td>
                  <td>{formatMoney(investedAccount.amountCents)}</td>
                </tr>
              ))}

              <tr className="total-row">
                <td>Total</td>
                <td>{formatMoney(totalInvestedCents)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}

export default OwnershipPage
