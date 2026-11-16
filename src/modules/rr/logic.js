import { parseNumber, parsePositive, round } from '../../core/numbers.js';

export function calculateRiskReward({ entry, sl, riskAmount, targets }) {
  const entryNum = parsePositive(entry);
  const slNum = parsePositive(sl);
  if (!entryNum || !slNum) return { ok: false, error: null };

  if (entryNum === slNum) {
    return { ok: false, error: 'Entry price and Stop Loss cannot be equal.' };
  }

  const side = entryNum > slNum ? 'long' : 'short';
  const riskDist = Math.abs(entryNum - slNum);
  const slPercent = (riskDist / entryNum) * 100;
  const riskUsd = parsePositive(riskAmount);

  const activeTargets = [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const tpNum = parsePositive(t.price);
    if (!tpNum) continue;

    if (side === 'long' && tpNum <= entryNum) {
      return { ok: false, error: `TP${i + 1} must be higher than Entry for a LONG trade.` };
    }
    if (side === 'short' && tpNum >= entryNum) {
      return { ok: false, error: `TP${i + 1} must be lower than Entry for a SHORT trade.` };
    }

    const pctRaw = parseNumber(t.pct);
    const pct = pctRaw !== null && pctRaw >= 0 ? pctRaw : 0;
    const rewardDist = Math.abs(tpNum - entryNum);
    const rr = rewardDist / riskDist;
    const movePct = (rewardDist / entryNum) * 100;

    activeTargets.push({
      index: i + 1,
      price: tpNum,
      pct,
      rr: round(rr, 2),
      movePct: round(movePct, 2),
      profitUsd: riskUsd ? round(riskUsd * rr * (pct / 100), 2) : null,
    });
  }

  if (activeTargets.length === 0) {
    return { ok: false, error: null };
  }

  const totalPct = round(activeTargets.reduce((sum, t) => sum + t.pct, 0), 2);
  let weightedRR = 0;

  if (totalPct > 0) {
    weightedRR = activeTargets.reduce((sum, t) => sum + t.rr * (t.pct / 100), 0);
  } else {
    weightedRR = activeTargets[0].rr;
  }

  const breakevenWinRate = weightedRR > 0 ? (1 / (1 + weightedRR)) * 100 : 0;
  const totalProfitUsd = riskUsd ? round(riskUsd * weightedRR, 2) : null;

  const warnings = [];
  if (totalPct !== 100) {
    warnings.push(`Total exit allocation is ${totalPct}%. Set allocations to 100% for exact weighted R:R.`);
  }

  return {
    ok: true,
    data: {
      side,
      slPercent: round(slPercent, 2),
      weightedRR: round(weightedRR, 2),
      breakevenWinRate: round(breakevenWinRate, 1),
      riskUsd: riskUsd ? round(riskUsd, 2) : null,
      totalProfitUsd,
      totalPct,
      targets: activeTargets,
      warnings,
    },
  };
}