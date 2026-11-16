import { parseNumber, parsePositive, round } from '../../core/numbers.js';

export function calculateLiquidation({ entry, leverage, side, maintenanceMarginRate }) {
  const entryNum = parsePositive(entry);
  const lev = parsePositive(leverage);
  
  if (!entryNum || !lev) {
    return { ok: false, error: null };
  }

  if (lev > 200) {
    return { ok: false, error: 'Leverage cannot exceed 200x.' };
  }

  const mmrNum = parseNumber(maintenanceMarginRate);
  const mmr = mmrNum !== null && mmrNum >= 0 ? mmrNum / 100 : 0.004;

  let liqPrice = 0;
  if (side === 'long') {
    liqPrice = lev === 1 ? 0 : entryNum * (1 - (1 / lev) + mmr);
  } else {
    liqPrice = entryNum * (1 + (1 / lev) - mmr);
  }

  liqPrice = Math.max(0, liqPrice);
  const distancePct = Math.abs((liqPrice - entryNum) / entryNum) * 100;

  return {
    ok: true,
    data: {
      side,
      leverage: lev,
      liqPrice: round(liqPrice, entryNum < 1 ? 6 : 2),
      distancePct: round(distancePct, 2),
      mmrPct: round(mmr * 100, 2),
    },
  };
}