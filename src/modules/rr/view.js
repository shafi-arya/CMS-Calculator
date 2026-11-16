import { formatNumber, parsePositive, round } from '../../core/numbers.js';
import { calculateRiskReward } from './logic.js';

export async function mount(root, ctx) {
  const savedBalance = parsePositive(await ctx.shared.get('balance', '1000'));
  const savedRiskMode = await ctx.shared.get('riskMode', 'percent');
  const savedRiskValue = parsePositive(await ctx.shared.get('riskValue', '1'));

  let defaultRiskUsd = '';
  if (savedRiskMode === 'amount' && savedRiskValue) {
    defaultRiskUsd = String(round(savedRiskValue, 2));
  } else if (savedBalance && savedRiskValue) {
    defaultRiskUsd = String(round(savedBalance * (savedRiskValue / 100), 2));
  }

  const state = {
    entry: ctx.launchParams.entry ? String(ctx.launchParams.entry) : '',
    sl: ctx.launchParams.sl ? String(ctx.launchParams.sl) : '',
    riskAmount: defaultRiskUsd,
    targets: [
      { price: ctx.launchParams.tp ? String(ctx.launchParams.tp) : '', pct: '100' },
      { price: '', pct: '0' },
      { price: '', pct: '0' },
    ],
  };

  const isCrypto = ctx.market === 'crypto';

  root.innerHTML = `
    <section class="ui-card">
      <h2 class="ui-card-title">Trade Setup</h2>

      <div class="ui-grid-2">
        <div class="ui-field">
          <label class="ui-label" for="rr-entry">Entry Price</label>
          <input id="rr-entry" class="ui-input" inputmode="decimal" placeholder="${isCrypto ? '95000' : '2650'}" value="${state.entry}" />
        </div>
        <div class="ui-field">
          <label class="ui-label" for="rr-sl">Stop Loss</label>
          <input id="rr-sl" class="ui-input" inputmode="decimal" placeholder="${isCrypto ? '94000' : '2645'}" value="${state.sl}" />
        </div>
      </div>

      <div class="ui-field">
        <label class="ui-label" for="rr-risk">Risk Amount ($) — Optional</label>
        <input id="rr-risk" class="ui-input" inputmode="decimal" placeholder="10" value="${state.riskAmount}" />
      </div>
    </section>

    <section class="ui-card">
      <h2 class="ui-card-title">Take Profit Targets &amp; Exit %</h2>

      <div class="mod-rr-tp-row">
        <div class="ui-field" style="margin-bottom:0;">
          <label class="ui-label" for="rr-tp1">TP 1 Price</label>
          <input id="rr-tp1" class="ui-input" inputmode="decimal" placeholder="${isCrypto ? '97000' : '2660'}" value="${state.targets[0].price}" />
        </div>
        <div class="ui-field" style="margin-bottom:0;">
          <label class="ui-label" for="rr-pct1">Exit (%)</label>
          <input id="rr-pct1" class="ui-input" inputmode="decimal" placeholder="100" value="${state.targets[0].pct}" />
        </div>
      </div>

      <div class="mod-rr-tp-row">
        <div class="ui-field" style="margin-bottom:0;">
          <label class="ui-label" for="rr-tp2">TP 2 Price (Optional)</label>
          <input id="rr-tp2" class="ui-input" inputmode="decimal" placeholder="${isCrypto ? '98500' : '2670'}" value="${state.targets[1].price}" />
        </div>
        <div class="ui-field" style="margin-bottom:0;">
          <label class="ui-label" for="rr-pct2">Exit (%)</label>
          <input id="rr-pct2" class="ui-input" inputmode="decimal" placeholder="0" value="${state.targets[1].pct}" />
        </div>
      </div>

      <div class="mod-rr-tp-row">
        <div class="ui-field" style="margin-bottom:0;">
          <label class="ui-label" for="rr-tp3">TP 3 Price (Optional)</label>
          <input id="rr-tp3" class="ui-input" inputmode="decimal" placeholder="${isCrypto ? '100000' : '2680'}" value="${state.targets[2].price}" />
        </div>
        <div class="ui-field" style="margin-bottom:0;">
          <label class="ui-label" for="rr-pct3">Exit (%)</label>
          <input id="rr-pct3" class="ui-input" inputmode="decimal" placeholder="0" value="${state.targets[2].pct}" />
        </div>
      </div>
    </section>

    <section id="rr-output" class="ui-card"></section>
  `;

  const $ = (sel) => root.querySelector(sel);
  const outputEl = $('#rr-output');
  let lastSummary = '';

  function renderResult() {
    const res = calculateRiskReward(state);

    if (!res.ok) {
      lastSummary = '';
      if (res.error) {
        outputEl.innerHTML = `<div class="ui-error">${res.error}</div>`;
      } else {
        outputEl.innerHTML = `
          <h3 class="ui-card-title">Risk / Reward Result</h3>
          <p class="ui-note">Enter Entry, Stop Loss, and at least TP 1 to calculate Risk/Reward.</p>
        `;
      }
      return;
    }

    const d = res.data;
    const sideLabel = d.side === 'long' ? (isCrypto ? 'LONG' : 'BUY') : (isCrypto ? 'SHORT' : 'SELL');
    const warningsHtml = d.warnings.map((w) => `<div class="mod-rr-warn">Warning: ${w}</div>`).join('');

    const tpRowsHtml = d.targets.map((t) => `
      <div class="mod-rr-item">
        <div class="mod-rr-item-left">
          <span class="mod-rr-item-title">TP ${t.index}: ${formatNumber(t.price, 6)}</span>
          <span class="mod-rr-item-sub">Exit: ${t.pct}% | Move: +${formatNumber(t.movePct, 2)}%</span>
        </div>
        <div class="mod-rr-item-right">
          <div>1 : ${formatNumber(t.rr, 2)}</div>
          ${t.profitUsd !== null ? `<div class="mod-rr-item-sub" style="color:var(--success);">+$${formatNumber(t.profitUsd, 2)}</div>` : ''}
        </div>
      </div>
    `).join('');

    const tpSummaryLines = d.targets
      .map((t) => `TP${t.index}: ${t.price} (${t.pct}%) -> 1:${t.rr}${t.profitUsd !== null ? ` (+$${t.profitUsd})` : ''}`)
      .join('\n');

    lastSummary = `Risk / Reward (${sideLabel})\nEntry: ${state.entry} | SL: ${state.sl}\nWeighted R:R: 1:${d.weightedRR}\nBreakeven Win Rate: ${d.breakevenWinRate}%\n${tpSummaryLines}`;

    outputEl.innerHTML = `
      <div class="mod-rr-head">
        <h3 class="ui-card-title" style="margin:0;">Risk / Reward Result</h3>
        <span class="mod-rr-badge ${d.side}">${sideLabel}</span>
      </div>

      <div class="ui-result-grid">
        <div class="ui-stat">
          <div class="ui-stat-label">Weighted R:R</div>
          <div class="ui-stat-value success">1 : ${formatNumber(d.weightedRR, 2)}</div>
        </div>
        <div class="ui-stat">
          <div class="ui-stat-label">Breakeven Win Rate</div>
          <div class="ui-stat-value">${formatNumber(d.breakevenWinRate, 1)}%</div>
        </div>
        ${d.totalProfitUsd !== null ? `
          <div class="ui-stat">
            <div class="ui-stat-label">Total Est. Profit</div>
            <div class="ui-stat-value success">+$${formatNumber(d.totalProfitUsd, 2)}</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat-label">Max Risk</div>
            <div class="ui-stat-value danger">-$${formatNumber(d.riskUsd, 2)}</div>
          </div>
        ` : `
          <div class="ui-stat">
            <div class="ui-stat-label">Stop Loss Distance</div>
            <div class="ui-stat-value danger">${formatNumber(d.slPercent, 2)}%</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat-label">Active Targets</div>
            <div class="ui-stat-value">${d.targets.length}</div>
          </div>
        `}
      </div>

      <div class="mod-rr-list">${tpRowsHtml}</div>
      ${warningsHtml}

      <div class="mod-rr-actions">
        <button type="button" id="rr-copy" class="ui-btn ui-btn-secondary">Copy Summary</button>
      </div>
    `;

    const copyBtn = $('#rr-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(lastSummary);
          ctx.haptic('light');
          copyBtn.textContent = 'Copied';
          setTimeout(() => {
            if (copyBtn) copyBtn.textContent = 'Copy Summary';
          }, 1500);
        } catch (_) {}
      });
    }
  }

  $('#rr-entry').addEventListener('input', (e) => {
    state.entry = e.target.value;
    renderResult();
  });

  $('#rr-sl').addEventListener('input', (e) => {
    state.sl = e.target.value;
    renderResult();
  });

  $('#rr-risk').addEventListener('input', (e) => {
    state.riskAmount = e.target.value;
    renderResult();
  });

  [0, 1, 2].forEach((idx) => {
    $(`#rr-tp${idx + 1}`).addEventListener('input', (e) => {
      state.targets[idx].price = e.target.value;
      renderResult();
    });
    $(`#rr-pct${idx + 1}`).addEventListener('input', (e) => {
      state.targets[idx].pct = e.target.value;
      renderResult();
    });
  });

  renderResult();
}