import { FOREX_INSTRUMENTS } from '../../core/instruments.js';
import { formatNumber } from '../../core/numbers.js';
import { calculateCryptoPosition, calculateForexPosition } from './logic.js';

export async function mount(root, ctx) {
  const isCrypto = ctx.market === 'crypto';

  const savedBalance = await ctx.shared.get('balance', '1000');
  const savedRiskMode = await ctx.shared.get('riskMode', 'percent');
  const savedRiskValue = await ctx.shared.get('riskValue', '1');
  const savedLeverage = await ctx.store.get('leverage', '10');
  const savedFeePct = await ctx.store.get('feePct', '0.05');
  const savedSymbol = await ctx.store.get('symbol', 'XAUUSD');

  const state = {
    balance: String(savedBalance ?? '1000'),
    riskMode: savedRiskMode === 'amount' ? 'amount' : 'percent',
    riskValue: String(savedRiskValue ?? '1'),
    entry: ctx.launchParams.entry ? String(ctx.launchParams.entry) : '',
    sl: ctx.launchParams.sl ? String(ctx.launchParams.sl) : '',
    leverage: String(savedLeverage ?? '10'),
    feePct: String(savedFeePct ?? '0.05'),
    symbol: ctx.launchParams.symbol || savedSymbol || 'XAUUSD',
  };

  const symbolOptions = FOREX_INSTRUMENTS.map(
    (item) => `<option value="${item.id}"${item.id === state.symbol ? ' selected' : ''}>${item.label}</option>`
  ).join('');

  root.innerHTML = `
    <section class="ui-card">
      <div class="mod-pos-row-head">
        <h2 class="ui-card-title" style="margin:0;">Account &amp; Trade Settings</h2>
        <div class="mod-pos-toggle">
          <button type="button" class="mod-pos-toggle-btn" data-rmode="percent">% Percent</button>
          <button type="button" class="mod-pos-toggle-btn" data-rmode="amount">$ USD</button>
        </div>
      </div>

      ${!isCrypto ? `
        <div class="ui-field">
          <label class="ui-label" for="pos-symbol">Instrument</label>
          <select id="pos-symbol" class="ui-select">${symbolOptions}</select>
        </div>
      ` : ''}

      <div class="ui-grid-2">
        <div class="ui-field">
          <label class="ui-label" for="pos-balance">Account Balance ($)</label>
          <input id="pos-balance" class="ui-input" inputmode="decimal" placeholder="1000" value="${state.balance}" />
        </div>
        <div class="ui-field">
          <label class="ui-label" id="pos-risk-label" for="pos-risk">Risk (%)</label>
          <input id="pos-risk" class="ui-input" inputmode="decimal" placeholder="1" value="${state.riskValue}" />
        </div>
      </div>

      <div id="pos-risk-chips" class="mod-pos-chips" style="margin-bottom:10px;">
        <button type="button" class="mod-pos-chip" data-risk="0.5">0.5%</button>
        <button type="button" class="mod-pos-chip" data-risk="1">1%</button>
        <button type="button" class="mod-pos-chip" data-risk="2">2%</button>
        <button type="button" class="mod-pos-chip" data-risk="3">3%</button>
      </div>

      <div class="ui-grid-2">
        <div class="ui-field">
          <label class="ui-label" for="pos-entry">Entry Price</label>
          <input id="pos-entry" class="ui-input" inputmode="decimal" placeholder="${isCrypto ? '95000' : '2650'}" value="${state.entry}" />
        </div>
        <div class="ui-field">
          <label class="ui-label" for="pos-sl">Stop Loss</label>
          <input id="pos-sl" class="ui-input" inputmode="decimal" placeholder="${isCrypto ? '94000' : '2645'}" value="${state.sl}" />
        </div>
      </div>

      ${isCrypto ? `
        <div class="ui-grid-2" style="margin-top:10px;">
          <div class="ui-field" style="margin-bottom:0;">
            <label class="ui-label" for="pos-leverage">Leverage (x)</label>
            <input id="pos-leverage" class="ui-input" inputmode="decimal" placeholder="10" value="${state.leverage}" />
          </div>
          <div class="ui-field" style="margin-bottom:0;">
            <label class="ui-label" for="pos-fee">Fee per Side (%)</label>
            <input id="pos-fee" class="ui-input" inputmode="decimal" placeholder="0.05" value="${state.feePct}" />
          </div>
        </div>
        <div class="mod-pos-chips">
          <button type="button" class="mod-pos-chip" data-lev="3">3x</button>
          <button type="button" class="mod-pos-chip" data-lev="5">5x</button>
          <button type="button" class="mod-pos-chip" data-lev="10">10x</button>
          <button type="button" class="mod-pos-chip" data-lev="20">20x</button>
          <button type="button" class="mod-pos-chip" data-lev="50">50x</button>
        </div>
      ` : ''}
    </section>

    <section id="pos-output" class="ui-card"></section>
  `;

  const $ = (sel) => root.querySelector(sel);
  const outputEl = $('#pos-output');
  let lastSummaryText = '';

  function syncControls() {
    root.querySelectorAll('[data-rmode]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.rmode === state.riskMode);
    });
    const riskLabel = $('#pos-risk-label');
    const riskChips = $('#pos-risk-chips');
    if (state.riskMode === 'percent') {
      riskLabel.textContent = 'Risk (%)';
      riskChips.style.display = 'flex';
    } else {
      riskLabel.textContent = 'Risk Amount ($)';
      riskChips.style.display = 'none';
    }

    root.querySelectorAll('[data-risk]').forEach((btn) => {
      btn.classList.toggle('active', state.riskMode === 'percent' && state.riskValue === btn.dataset.risk);
    });
    root.querySelectorAll('[data-lev]').forEach((btn) => {
      btn.classList.toggle('active', state.leverage === btn.dataset.lev);
    });
  }

  function renderResult() {
    const res = isCrypto
      ? calculateCryptoPosition(state)
      : calculateForexPosition(state);

    if (!res.ok) {
      lastSummaryText = '';
      if (res.error) {
        outputEl.innerHTML = `<div class="ui-error">${res.error}</div>`;
      } else {
        outputEl.innerHTML = `
          <h3 class="ui-card-title">Calculation Result</h3>
          <p class="ui-note">Enter Entry Price and Stop Loss to calculate position size automatically.</p>
        `;
      }
      return;
    }

    const d = res.data;
    const sideLabel = d.side === 'long' ? (isCrypto ? 'LONG' : 'BUY') : (isCrypto ? 'SHORT' : 'SELL');
    const warningsHtml = d.warnings.map((w) => `<div class="mod-pos-warn">Warning: ${w}</div>`).join('');

    if (isCrypto) {
      lastSummaryText = `Position Size (${sideLabel})\nEntry: ${state.entry} | SL: ${state.sl}\nQuantity: ${d.quantity}\nPosition Value: $${d.positionValue}\nMargin (${state.leverage}x): $${d.requiredMargin}\nRisk: $${d.riskAmount}`;
      outputEl.innerHTML = `
        <div class="mod-pos-row-head">
          <h3 class="ui-card-title" style="margin:0;">Calculation Result</h3>
          <span class="mod-pos-badge ${d.side}">${sideLabel}</span>
        </div>
        <div class="ui-result-grid">
          <div class="ui-stat">
            <div class="ui-stat-label">Quantity (Coins)</div>
            <div class="ui-stat-value success">${formatNumber(d.quantity, 6)}</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat-label">Position Value</div>
            <div class="ui-stat-value">$${formatNumber(d.positionValue, 2)}</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat-label">Required Margin (${state.leverage}x)</div>
            <div class="ui-stat-value">$${formatNumber(d.requiredMargin, 2)}</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat-label">Net Risk ${d.riskPercent !== null ? `(${d.riskPercent}%)` : ''}</div>
            <div class="ui-stat-value danger">$${formatNumber(d.riskAmount, 2)}</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat-label">Stop Loss Distance</div>
            <div class="ui-stat-value">${formatNumber(d.slPercent, 2)}%</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat-label">Est. Liquidation (Isolated)</div>
            <div class="ui-stat-value warning">${d.liqPrice === 0 ? 'None (1x)' : formatNumber(d.liqPrice, 4)}</div>
          </div>
        </div>
        ${d.estimatedFee > 0 ? `<p class="ui-note">Est. round-trip fee included in risk: <strong>$${formatNumber(d.estimatedFee, 2)}</strong></p>` : ''}
        ${warningsHtml}
        <div class="mod-pos-actions">
          <button type="button" id="pos-copy" class="ui-btn ui-btn-secondary">Copy Summary</button>
        </div>
      `;
    } else {
      lastSummaryText = `Position Size ${d.instrument.id} (${sideLabel})\nEntry: ${state.entry} | SL: ${state.sl}\nLot Size: ${d.lots} lots\nStop Loss: ${d.stopPips} pips\nRisk: $${d.riskAmount}`;
      outputEl.innerHTML = `
        <div class="mod-pos-row-head">
          <h3 class="ui-card-title" style="margin:0;">Calculation Result</h3>
          <span class="mod-pos-badge ${d.side}">${sideLabel}</span>
        </div>
        <div class="ui-result-grid">
          <div class="ui-stat">
            <div class="ui-stat-label">Position Size (Lots)</div>
            <div class="ui-stat-value success">${formatNumber(d.lots, 2)}</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat-label">Risk Amount ${d.riskPercent !== null ? `(${d.riskPercent}%)` : ''}</div>
            <div class="ui-stat-value danger">$${formatNumber(d.riskAmount, 2)}</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat-label">Stop Loss Distance</div>
            <div class="ui-stat-value">${formatNumber(d.stopPips, 1)} pips</div>
          </div>
          <div class="ui-stat">
            <div class="ui-stat-label">Pip Value (Trade)</div>
            <div class="ui-stat-value">$${formatNumber(d.pipValue, 2)}</div>
          </div>
        </div>
        <p class="ui-note">Exact size: <strong>${formatNumber(d.lotsExact, 4)} lots</strong> (${formatNumber(d.units, 2)} units)</p>
        ${warningsHtml}
        <div class="mod-pos-actions">
          <button type="button" id="pos-copy" class="ui-btn ui-btn-secondary">Copy Summary</button>
        </div>
      `;
    }

    const copyBtn = $('#pos-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(lastSummaryText);
          ctx.haptic('light');
          copyBtn.textContent = 'Copied';
          setTimeout(() => {
            if (copyBtn) copyBtn.textContent = 'Copy Summary';
          }, 1500);
        } catch (_) {}
      });
    }
  }

  $('#pos-balance').addEventListener('input', (e) => {
    state.balance = e.target.value;
    ctx.shared.set('balance', state.balance);
    renderResult();
  });

  $('#pos-risk').addEventListener('input', (e) => {
    state.riskValue = e.target.value;
    ctx.shared.set('riskValue', state.riskValue);
    syncControls();
    renderResult();
  });

  $('#pos-entry').addEventListener('input', (e) => {
    state.entry = e.target.value;
    renderResult();
  });

  $('#pos-sl').addEventListener('input', (e) => {
    state.sl = e.target.value;
    renderResult();
  });

  root.querySelectorAll('[data-rmode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.riskMode = btn.dataset.rmode;
      ctx.shared.set('riskMode', state.riskMode);
      ctx.haptic('light');
      syncControls();
      renderResult();
    });
  });

  root.querySelectorAll('[data-risk]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.riskMode = 'percent';
      state.riskValue = btn.dataset.risk;
      $('#pos-risk').value = state.riskValue;
      ctx.shared.set('riskMode', state.riskMode);
      ctx.shared.set('riskValue', state.riskValue);
      ctx.haptic('light');
      syncControls();
      renderResult();
    });
  });

  if (isCrypto) {
    $('#pos-leverage').addEventListener('input', (e) => {
      state.leverage = e.target.value;
      ctx.store.set('leverage', state.leverage);
      syncControls();
      renderResult();
    });

    $('#pos-fee').addEventListener('input', (e) => {
      state.feePct = e.target.value;
      ctx.store.set('feePct', state.feePct);
      renderResult();
    });

    root.querySelectorAll('[data-lev]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.leverage = btn.dataset.lev;
        $('#pos-leverage').value = state.leverage;
        ctx.store.set('leverage', state.leverage);
        ctx.haptic('light');
        syncControls();
        renderResult();
      });
    });
  } else {
    $('#pos-symbol').addEventListener('change', (e) => {
      state.symbol = e.target.value;
      ctx.store.set('symbol', state.symbol);
      ctx.haptic('light');
      renderResult();
    });
  }

  syncControls();
  renderResult();
}