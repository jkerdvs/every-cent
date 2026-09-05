export type BalanceAccount = {
  name: string
  balanceCents: number
  displayBalance: string
}

export type BalanceSection = {
  title: string
  accounts: BalanceAccount[]
  netCents: number
  displayNet: string
}

export const balanceSections: BalanceSection[] = [
  {
    title: 'Save',
    accounts: [
      { name: 'Ally', balanceCents: 119300, displayBalance: '$1,193.00' },
      { name: 'Robinhood', balanceCents: 0, displayBalance: '$0.00' },
    ],
    netCents: 119300,
    displayNet: '$1,193.00',
  },
  {
    title: 'Liquid',
    accounts: [
      { name: 'Cash', balanceCents: 0, displayBalance: '$0.00' },
      { name: 'Checking', balanceCents: 7085, displayBalance: '$70.85' },
      { name: 'Venmo', balanceCents: 0, displayBalance: '$0.00' },
    ],
    netCents: 7085,
    displayNet: '$70.85',
  },
  {
    title: 'Growth',
    accounts: [
      { name: 'Coinbase', balanceCents: 3500, displayBalance: '$35.00' },
      { name: 'Equity', balanceCents: 14000, displayBalance: '$140.00' },
      { name: 'Roth', balanceCents: 24695, displayBalance: '$246.95' },
    ],
    netCents: 42195,
    displayNet: '$421.95',
  },
  {
    title: 'Credit',
    accounts: [
      { name: 'Coinbase One', balanceCents: 0, displayBalance: '-$0.00' },
      { name: 'Platinum', balanceCents: 0, displayBalance: '-$0.00' },
      { name: 'Quicksilver', balanceCents: 0, displayBalance: '-$0.00' },
      { name: 'Robinhood Gold', balanceCents: 0, displayBalance: '-$0.00' },
    ],
    netCents: 0,
    displayNet: '-$0.00',
  },
]
