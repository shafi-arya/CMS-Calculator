import { formatNumber, parsePositive } from '../../core/numbers.js';
import { calculateDCA } from './logic.js';

export async function mount(root, ctx) {
  const state = {
    entries: [
      { price: '', amount: '' },
      { price: '', amount: '' },
      { price: '', amount: '' },
    ],
  };

  const isCrypto = ctx.market === 'crypto';

  root.innerHTML = `
    <section class="ui-card">
      <h2 class="ui-card-title">DCA &amp; Average Entry Setup</h2>
      <p class="ui-note" style="margin-bottom:12px;">Enter prices and amounts for each entry level.</p>

      <div id="dca-rows-container">
        ${state.entries.map((_, i) => `
          <div class="mod-dca-row" data-index="${i}">
            <div class="ui-field" style="margin-bottom:0;">
              <label class="ui-label" for="dca-p-${i}">Entry ${i + 1} Price</label>
              <input id="dca-p-${i}" class="ui-input dca-price" inputmode="decimal" placeholder="${isCrypto ? (i === 0 ? '95000' : '92000') : (i === 0 ? '2650' : '2640')}" value="${_.price}" />
            </div>
            <div class="ui-field" style="margin-bottom:0;">
              <label class="ui-label" for="dca-a-${i}">Amount / Size</label>
              <input id="dca-a-${i}" class="ui-input dca-amount" inputmode="decimal" placeholder="${isCrypto ? '0.1' : '1'}" value="${_.amount}" />
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <section id="dca-output" class="ui-card"></section>
  `;

  const $ = (sel) => root.querySelector(sel);
  const outputEl = $('#dca-output');
  let lastSummary = '';

  function renderResult() {
    const res = calculateDCA(state.entries);

    if (!res.ok) {
      lastSummary = '';
      if (res.error) {
        outputEl.innerHTML = `<div class="ui-error">${res.error}</div>`;
      } else {
        outputEl.innerHTML = `
          <h3 class="ui-card-title">Average Entry Result</h3>
          <p class="ui-note">Fill at least one entry level to see calculation.</p>
        `;
      }
      return;
    }

    const d = res.data;
    const entryLines = state.entries
      .filter((e) => parsePositive(e.price) && parsePositive(e.amount))
      .map((e, idx) => `Entry ${idx + 1}: ${e.price} (Size: ${e.amount})`)
      .join('\n');

    lastSummary = `Average Entry Calculator\n${entryLines}\nAverage Price: ${d.averagePrice}\nTotal Capital: $${d.totalCost}`;

    outputEl.innerHTML = `
      <div class="mod-dca-head">
        <h3 class="ui-card-title" style="margin:0;">Average Entry Result</h3>
        <span class="env-badge">${d.entriesCount} Levels</span>
      </div>

      <div class="ui-result-grid">
        <div class="ui-stat">
          <div class="ui-stat-label">New Average Price</div>
          <div class="ui-stat-value success">${formatNumber(d.averagePrice, 4)}</div>
        </div>
        <div class="ui-stat">
          <div class="ui-stat-label">Total Capital Invested</div>
          <div class="ui-stat-value">$${formatNumber(d.totalCost, 2)}</div>
        </div>
        <div class="ui-stat">
          <div class="ui-stat-label">Total Amount / Size</div>
          <div class="ui-stat-value">${formatNumber(d.totalAmount, 4)}</div>
        </div>
      </div>

      <div class="mod-dca-actions" style="margin-top:12px;">
        <button type="button" id="dca-copy" class="ui-btn ui-btn-secondary">Copy Summary</button>
      </div>
    `;

    const copyBtn = $('#dca-copy');
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

  root.querySelectorAll('.dca-price').forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      state.entries[idx].price = e.target.value;
      renderResult();
    });
  });

  root.querySelectorAll('.dca-amount').forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      state.entries[idx].amount = e.target.value;
      renderResult();
    });
  });

  renderResult();
}