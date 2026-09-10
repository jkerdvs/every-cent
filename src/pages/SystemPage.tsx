import { useEffect, useState } from 'react'
import { loadBalanceAccounts } from '../data/balanceSheet'
import {
  loadInvestmentAccountConfigs,
  sortInvestmentAccountConfigs,
} from '../data/ownership'

type SystemTrade = {
  id: number
  accountId?: string
  accountName?: string
  week: string
  day: string
  dataNumber: string
  ticker: string
  callPut: string
  tradePercent: string
  winLoss: string
  riskRespected: string
  hourlyScheme: string
  confirmation: string
  smallSize: boolean
  slMarked: boolean
  tightSpread: boolean
  takeaway: string
}

const SYSTEM_STORAGE_KEY = 'every-cent-system-trades'

const emptyTrade: Omit<SystemTrade, 'id'> = {
  accountId: '',
  accountName: '',
  week: '',
  day: '',
  dataNumber: '',
  ticker: '',
  callPut: '',
  tradePercent: '',
  winLoss: '',
  riskRespected: '',
  hourlyScheme: '',
  confirmation: '',
  smallSize: false,
  slMarked: false,
  tightSpread: false,
  takeaway: '',
}

const days = ['M', 'T', 'W', 'Th', 'F']
const callPutOptions = ['Call', 'Put']
const winLossOptions = ['Win', 'Loss']
const riskOptions = ['Yes', 'No', 'N/A']

function getOptionsTradingAccounts() {
  const balanceAccounts = loadBalanceAccounts()
  const accountById = new Map(
    balanceAccounts.map((account) => [account.id, account]),
  )
  const configs = loadInvestmentAccountConfigs(balanceAccounts).filter(
    (config) => config.optionsTrading,
  )

  return sortInvestmentAccountConfigs(
    configs,
    (config) => accountById.get(config.accountId)?.name ?? '',
  )
    .map((config) => accountById.get(config.accountId))
    .filter((account): account is NonNullable<typeof account> =>
      Boolean(account),
    )
}

function loadTrades() {
  const savedTrades = localStorage.getItem(SYSTEM_STORAGE_KEY)

  if (!savedTrades) return []

  try {
    return JSON.parse(savedTrades) as SystemTrade[]
  } catch {
    return []
  }
}

function SystemPage() {
  const [trades, setTrades] = useState<SystemTrade[]>(loadTrades)
  const [entry, setEntry] = useState(emptyTrade)
  const optionsTradingAccounts = getOptionsTradingAccounts()

  useEffect(() => {
    localStorage.setItem(SYSTEM_STORAGE_KEY, JSON.stringify(trades))
  }, [trades])

  function updateEntry<Value extends keyof typeof emptyTrade>(
    field: Value,
    value: (typeof emptyTrade)[Value],
  ) {
    setEntry((currentEntry) => ({
      ...currentEntry,
      [field]: value,
    }))
  }

  function addTrade() {
    const cleanTicker = entry.ticker.trim().toUpperCase()
    const selectedAccount = optionsTradingAccounts.find(
      (account) => account.id === entry.accountId,
    )

    if (!cleanTicker) return

    setTrades((currentTrades) => [
      {
        ...entry,
        id: Date.now(),
        accountName: selectedAccount?.name ?? entry.accountName,
        ticker: cleanTicker,
      },
      ...currentTrades,
    ])
    setEntry(emptyTrade)
  }

  return (
    <main className="system-page">
      <table className="system-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Week</th>
            <th>Day</th>
            <th>Data #</th>
            <th>Ticker</th>
            <th>C/P</th>
            <th>Trade %</th>
            <th>W/L</th>
            <th>Risk Respected</th>
            <th>Hourly Scheme</th>
            <th>Confirmation</th>
            <th>Small Size</th>
            <th>SL Marked</th>
            <th>Tight Spread</th>
            <th>Takeaway</th>
          </tr>
        </thead>

        <tbody>
          <tr className="system-entry-row">
            <td>
              <select
                aria-label="Options trading account"
                value={entry.accountId}
                onChange={(event) => {
                  const account = optionsTradingAccounts.find(
                    (item) => item.id === event.target.value,
                  )

                  setEntry((currentEntry) => ({
                    ...currentEntry,
                    accountId: account?.id ?? '',
                    accountName: account?.name ?? '',
                  }))
                }}
              >
                <option value="">Account</option>
                {optionsTradingAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input
                aria-label="Week"
                type="text"
                value={entry.week}
                onChange={(event) =>
                  updateEntry('week', event.target.value)
                }
              />
            </td>
            <td>
              <select
                aria-label="Day"
                value={entry.day}
                onChange={(event) =>
                  updateEntry('day', event.target.value)
                }
              >
                <option value="">Day</option>
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input
                aria-label="Data number"
                type="number"
                value={entry.dataNumber}
                onChange={(event) =>
                  updateEntry('dataNumber', event.target.value)
                }
              />
            </td>
            <td>
              <input
                aria-label="Ticker"
                type="text"
                value={entry.ticker}
                onChange={(event) =>
                  updateEntry(
                    'ticker',
                    event.target.value.toUpperCase(),
                  )
                }
              />
            </td>
            <td>
              <select
                aria-label="Call or put"
                value={entry.callPut}
                onChange={(event) =>
                  updateEntry('callPut', event.target.value)
                }
              >
                <option value="">C/P</option>
                {callPutOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input
                aria-label="Trade percent"
                step="any"
                type="number"
                value={entry.tradePercent}
                onChange={(event) =>
                  updateEntry('tradePercent', event.target.value)
                }
              />
            </td>
            <td>
              <select
                aria-label="Win or loss"
                value={entry.winLoss}
                onChange={(event) =>
                  updateEntry('winLoss', event.target.value)
                }
              >
                <option value="">W/L</option>
                {winLossOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <select
                aria-label="Risk respected"
                value={entry.riskRespected}
                onChange={(event) =>
                  updateEntry('riskRespected', event.target.value)
                }
              >
                <option value="">Risk</option>
                {riskOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input
                aria-label="Hourly scheme"
                type="text"
                value={entry.hourlyScheme}
                onChange={(event) =>
                  updateEntry('hourlyScheme', event.target.value)
                }
              />
            </td>
            <td>
              <input
                aria-label="Confirmation"
                type="text"
                value={entry.confirmation}
                onChange={(event) =>
                  updateEntry('confirmation', event.target.value)
                }
              />
            </td>
            <td>
              <input
                aria-label="Small size"
                checked={entry.smallSize}
                type="checkbox"
                onChange={(event) =>
                  updateEntry('smallSize', event.target.checked)
                }
              />
            </td>
            <td>
              <input
                aria-label="SL marked"
                checked={entry.slMarked}
                type="checkbox"
                onChange={(event) =>
                  updateEntry('slMarked', event.target.checked)
                }
              />
            </td>
            <td>
              <input
                aria-label="Tight spread"
                checked={entry.tightSpread}
                type="checkbox"
                onChange={(event) =>
                  updateEntry('tightSpread', event.target.checked)
                }
              />
            </td>
            <td>
              <input
                aria-label="Takeaway"
                type="text"
                value={entry.takeaway}
                onChange={(event) =>
                  updateEntry('takeaway', event.target.value)
                }
              />
            </td>
          </tr>

          {trades.map((trade) => (
            <tr className="system-trade-row" key={trade.id}>
              <td>{trade.accountName ?? ''}</td>
              <td>{trade.week}</td>
              <td>{trade.day}</td>
              <td>{trade.dataNumber}</td>
              <td>{trade.ticker}</td>
              <td>{trade.callPut}</td>
              <td>
                {trade.tradePercent
                  ? `${trade.tradePercent}%`
                  : ''}
              </td>
              <td>{trade.winLoss}</td>
              <td>{trade.riskRespected}</td>
              <td>{trade.hourlyScheme}</td>
              <td>{trade.confirmation}</td>
              <td>{trade.smallSize ? 'Yes' : ''}</td>
              <td>{trade.slMarked ? 'Yes' : ''}</td>
              <td>{trade.tightSpread ? 'Yes' : ''}</td>
              <td>{trade.takeaway}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="add-trade" type="button" onClick={addTrade}>
        Add Trade
      </button>
    </main>
  )
}

export default SystemPage
