export const MODULES = [
  {
    id: 'position',
    title: 'Position',
    icon: '⚖️',
    hasStyle: true,
    load: () => import('./modules/position/view.js'),
  },
  {
    id: 'rr',
    title: 'Risk/Reward',
    icon: '🎯',
    hasStyle: true,
    load: () => import('./modules/rr/view.js'),
  },
  {
    id: 'dca',
    title: 'DCA',
    icon: '📊',
    hasStyle: true,
    load: () => import('./modules/dca/view.js'),
  },
  {
    id: 'liquidation',
    title: 'Liq. Price',
    icon: '⚠️',
    hasStyle: true,
    load: () => import('./modules/liquidation/view.js'),
  },
];