import { parseNumber, parsePositive, round } from '../../core/numbers.js';

export function calculateDCA(entries) {
  const validEntries = [];
  for (let i = 0; i < entries.length; i++) {
    const p = parsePositive(entries[i].price);
    const q = parsePositive(entries[i].amount);
    if (p !== null && q !== null) {
      validEntries.push({ price: p, amount: q });
    }
  }

  if (validEntries.length === 0) {
    return { ok: false, error: null };
  }

  let totalCost = 0;
  let totalAmount = 0;

  validEntries.forEach((e) => {
    totalCost += e.price * e.amount;
    totalAmount += e.amount;
  });

  const averagePrice = totalCost / totalAmount;

  return {
    ok: true,
    data: {
      averagePrice: round(averagePrice, averagePrice < 1 ? 6 : 2),
      totalAmount: round(totalAmount, 6),
      totalCost: round(totalCost, 2),
      entriesCount: validEntries.length,
    },
  };
}