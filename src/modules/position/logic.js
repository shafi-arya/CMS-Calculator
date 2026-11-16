import { parseNumber, parsePositive, round } from '../../core/numbers.js';
import { getInstrument } from '../../core/instruments.js';

function resolveRisk(balance, riskMode, riskValue) {
  const riskNum = parsePositive(riskValue);
  if (!riskNum) return { ok: false, error: null };

  if (riskMode === 'percent') {
    const bal = parsePositive(balance);
    if (!bal) return { ok: false, error: null };
    if (riskNum > 100) {
      return { ok: false, error: 'Risk percentage must be between 0 and 100.' };
    }
    return {
      ok: true,
      balance: bal,
      riskAmount: bal * (riskNum / 100),
      riskPercent: riskNum,
    };
  }

  const bal = parsePositive(balance);
  return {
    ok: true,
    balance: bal,
    riskAmount: riskNum,
    riskPercent: bal ? (riskNum / bal) * 100 : null,
  };
}

export function calculateCryptoPosition({ balance, riskMode, riskValue, entry, sl, leverage, feePct }) {
  const entryNum = parsePositive(entry);
  const slNum = parsePositive(sl);
  if (!entryNum || !slNum) return { ok: false, error: null };

  if (entryNum === slNum) {
    return { ok: false, error: 'Entry price and Stop Loss cannot be equal.' };
  }

  const riskRes = resolveRisk(balance, riskMode, riskValue);
  if (!riskRes.ok) return riskRes;

  const lev = parsePositive(leverage);
  if (!lev || lev > 200) {
    return { ok: false, error: 'Leverage must be a number between 1 and 200.' };
  }

  const feeNum = parseNumber(feePct);
  const safeFeePct = feeNum !== null && feeNum >= 0 && feeNum <= 5 ? feeNum : 0;
  const feeRate = safeFeePct / 100;

  const side = entryNum > slNum ? 'long' : 'short';
  const priceDiff = Math.abs(entryNum - slNum);
  const slPercent = (priceDiff / entryNum) * 100;

  const lossPerUnit = priceDiff + feeRate * (entryNum + slNum);
  const quantity = riskRes.riskAmount / lossPerUnit;
  const positionValue = quantity * entryNum;
  const requiredMargin = positionValue / lev;
  const estimatedFee = quantity * feeRate * (entryNum + slNum);

  const mmr = 0.004;
  let liqPrice = 0;
  if (side === 'long') {
    liqPrice = lev === 1 ? 0 : Math.max(0, entryNum * (1 - 1 / lev + mmr));
  } else {
    liqPrice = entryNum * (1 + 1 / lev - mmr);
  }

  const warnings = [];
  if (riskRes.balance && requiredMargin > riskRes.balance) {
    warnings.push('Required margin exceeds account balance. Increase leverage or reduce risk.');
  }
  if ((side === 'long' && liqPrice >= slNum) || (side === 'short' && liqPrice <= slNum)) {
    warnings.push('Stop Loss is beyond the estimated liquidation price.');
  }

  return {
    ok: true,
    data: {
      side,
      riskAmount: round(riskRes.riskAmount, 2),
      riskPercent: riskRes.riskPercent !== null ? round(riskRes.riskPercent, 2) : null,
      quantity: round(quantity, 6),
      positionValue: round(positionValue, 2),
      requiredMargin: round(requiredMargin, 2),
      slPercent: round(slPercent, 2),
      estimatedFee: round(estimatedFee, 2),
      liqPrice: round(liqPrice, entryNum < 1 ? 6 : 2),
      warnings,
    },
  };
}

export function calculateForexPosition({ balance, riskMode, riskValue, entry, sl, symbol }) {
  const entryNum = parsePositive(entry);
  const slNum = parsePositive(sl);
  if (!entryNum || !slNum) return { ok: false, error: null };

  if (entryNum === slNum) {
    return { ok: false, error: 'Entry price and Stop Loss cannot be equal.' };
  }

  const riskRes = resolveRisk(balance, riskMode, riskValue);
  if (!riskRes.ok) return riskRes;

  const inst = getInstrument(symbol);
  const side = entryNum > slNum ? 'long' : 'short';
  const priceDiff = Math.abs(entryNum - slNum);
  const stopPips = priceDiff / inst.pipSize;

  let pipValuePerLot = inst.contractSize * inst.pipSize;
  if (inst.quoteType === 'BASE_USD') {
    pipValuePerLot = (inst.contractSize * inst.pipSize) / slNum;
  }

  const lots = riskRes.riskAmount / (stopPips * pipValuePerLot);
  const pipValueForTrade = lots * pipValuePerLot;
  const units = lots * inst.contractSize;

  const warnings = [];
  if (lots < 0.01) {
    warnings.push('Calculated size is below 0.01 lots.');
  }

  return {
    ok: true,
    data: {
      side,
      instrument: inst,
      riskAmount: round(riskRes.riskAmount, 2),
      riskPercent: riskRes.riskPercent !== null ? round(riskRes.riskPercent, 2) : null,
      lots: round(lots, 2),
      lotsExact: round(lots, 4),
      stopPips: round(stopPips, 1),
      pipValue: round(pipValueForTrade, 2),
      units: round(units, 2),
      warnings,
    },
  };
}