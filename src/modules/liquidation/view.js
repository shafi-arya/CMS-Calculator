import { formatNumber } from '../../core/numbers.js';
import { calculateLiquidation } from './logic.js';

export async function mount(root, ctx) {
  const state = {
    entry: ctx.launchParams.entry ? String(ctx.launchParams.entry) : '95000',
    leverage: '20',
    side: 'long',
    mmr: '0.4',
  };

  root.innerHTML = `
    <section class="ui-card">
      <h2 class="ui-card-title">Liquidation Price Calculator</h2>
      
      <div class="ui-field">
        <label class="ui-label">Position Side</label>
        <div class="market-switch" style="grid-template-columns: 1fr 1fr; margin-bottom: 4px;">
          <button type="button" class="market-btn ${state.side === 'long' ? 'active' : ''}" data-side="long">LONG</button>
          <button type="button" class="market-btn ${state.side === 'short' ? 'active' : ''}" data-side="short">SHORT</button>
        </div>
      </div>

      <div class="ui-grid-2">
        <div class="ui-field">
          <label class="ui-label" for="liq-entry">Entry Price</label>
          <input id="liq-entry" class="ui-input" inputmode="decimal" placeholder="95000" value="${state.entry}" />
        </div>
        <div class="ui-field">
          <label class="ui-label" for="liq-lev">Leverage (x)</label>
          <input id="liq-lev" class="ui-input" inputmode="decimal" placeholder="20" value="${state.leverage}" />
        </div>
      </div>

      <div class="ui-field" style="margin-top: 8px;">
        <label class="ui-label" for="liq-mmr">Maintenance Margin Rate (%)</label>
        <input id="liq-mmr" class="ui-input" inputmode="decimal" placeholder="0.4" value="${state.mmr}" />
      </div>
    </section>

    <section id="liq-output" class="ui-card"></section>
  `;

  const $ = (sel) => root.querySelector(sel);
  const outputEl = $('#liq-output');
  let lastSummary = '';

  function renderResult() {
    const res = calculateLiquidation({
      entry: state.entry,
      leverage: state.leverage,
      side: state.side,
      maintenanceMarginRate: state.mmr,
    });

    if (!res.ok) {
      lastSummary = '';
      if (res.error) {
        outputEl.innerHTML = `<div class="ui-error">${res.error}</div>`;
      } else {
        outputEl.innerHTML = `
          <h3 class="ui-card-title">Liquidation Result</h3>
          <p class="ui-note">Enter entry price and leverage to calculate liquidation risk.</p>
        `;
      }
      return;
    }

    const d = res.data;
    const sideLabel = d.side.toUpperCase();
    
    lastSummary = `Liquidation Price (${sideLabel})\nEntry: ${state.entry} | Leverage: ${d.leverage}x\nLiq. Price: ${d.liqPrice}\nDistance: ${d.distancePct}%`;

    outputEl.innerHTML = `
      <div class="mod-liq-head">
        <h3 class="ui-card-title" style="margin:0;">Liquidation Result</h3>
        <span class="mod-liq-badge ${d.side}">${sideLabel} (${d.leverage}x)</span>
      </div>

      <div class="ui-result-grid">
        <div class="ui-stat">
          <div class="ui-stat-label">Estimated Liquidation Price</div>
          <div class="ui-stat-value warning">${formatNumber(d.liqPrice, 4)}</div>
        </div>
        <div class="ui-stat">
          <div class="ui-stat-label">Distance from Entry</div>
          <div class="ui-stat-value danger">${formatNumber(d.distancePct, 2)}%</div>
        </div>
      </div>

      <p class="ui-note">Calculated with isolated margin model (MMR: ${d.mmrPct}%).</p>

      <div class="mod-liq-actions" style="margin-top:12px;">
        <button type="button" id="liq-copy" class="ui-btn ui-btn-secondary">Copy Summary</button>
      </div>
    `;

    const copyBtn = $('#liq-copy');
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

  root.querySelectorAll('[data-side]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.side = btn.dataset.side;
      root.querySelectorAll('[data-side]').forEach((b) => b.classList.toggle('active', b === btn));
      ctx.haptic('light');
      renderResult();
    });
  });

  $('#liq-entry').addEventListener('input', (e) => {
    state.entry = e.target.value;
    renderResult();
  });

  $('#liq-lev').addEventListener('input', (e) => {
    state.leverage = e.target.value;
    renderResult();
  });

  $('#liq-mmr').addEventListener('input', (e) => {
    state.mmr = e.target.value;
    renderResult();
  });

  renderResult();
}