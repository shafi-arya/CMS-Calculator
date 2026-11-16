export const FOREX_INSTRUMENTS = [
  {
    id: 'EURUSD',
    label: 'EUR/USD (XXX/USD Pairs)',
    pipSize: 0.0001,
    contractSize: 100000,
    quoteType: 'USD',
    decimals: 5,
  },
  {
    id: 'GBPUSD',
    label: 'GBP/USD',
    pipSize: 0.0001,
    contractSize: 100000,
    quoteType: 'USD',
    decimals: 5,
  },
  {
    id: 'XAUUSD',
    label: 'XAU/USD (Gold)',
    pipSize: 0.1,
    contractSize: 100,
    quoteType: 'USD',
    decimals: 2,
  },
  {
    id: 'USDJPY',
    label: 'USD/JPY (JPY Pairs)',
    pipSize: 0.01,
    contractSize: 100000,
    quoteType: 'BASE_USD',
    decimals: 3,
  },
  {
    id: 'NAS100',
    label: 'NAS100 / US100 (Nasdaq)',
    pipSize: 1,
    contractSize: 1,
    quoteType: 'USD',
    decimals: 1,
  },
];

export function getInstrument(id) {
  return FOREX_INSTRUMENTS.find((item) => item.id === id) || FOREX_INSTRUMENTS[0];
}