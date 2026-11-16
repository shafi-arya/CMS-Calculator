import { MODULES } from './registry.js';
import { initTelegram, isInsideTelegram, getLaunchParams, haptic } from './core/telegram.js';
import { getShared, setShared, createModuleStore } from './core/storage.js';

const loadedStyles = new Set();
const state = {
  market: 'crypto',
  activeTab: MODULES[0].id,
  launchParams: {},
  cleanup: null,
};

function ensureModuleStyle(mod) {
  if (!mod.hasStyle || loadedStyles.has(mod.id)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `./src/modules/${mod.id}/style.css`;
  document.head.appendChild(link);
  loadedStyles.add(mod.id);
}

function renderMarketButtons() {
  document.querySelectorAll('.market-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.market === state.market);
  });
}

function renderTabs() {
  const tabBar = document.getElementById('tab-bar');
  tabBar.innerHTML = '';

  MODULES.forEach((mod) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tab-btn${mod.id === state.activeTab ? ' active' : ''}`;
    btn.dataset.tab = mod.id;
    btn.innerHTML = `<span class="tab-icon">${mod.icon}</span><span>${mod.title}</span>`;
    btn.addEventListener('click', () => {
      if (state.activeTab === mod.id) return;
      haptic('light');
      state.activeTab = mod.id;
      renderTabs();
      mountActiveModule();
    });
    tabBar.appendChild(btn);
  });
}

async function mountActiveModule() {
  const root = document.getElementById('module-root');

  if (typeof state.cleanup === 'function') {
    try {
      state.cleanup();
    } catch (_) {}
    state.cleanup = null;
  }

  root.innerHTML = '';
  const mod = MODULES.find((m) => m.id === state.activeTab) || MODULES[0];

  try {
    ensureModuleStyle(mod);
    const exportsObj = await mod.load();
    const ctx = {
      market: state.market,
      launchParams: state.launchParams,
      store: createModuleStore(mod.id),
      shared: { get: getShared, set: setShared },
      haptic,
    };
    const cleanup = await exportsObj.mount(root, ctx);
    if (typeof cleanup === 'function') {
      state.cleanup = cleanup;
    }
  } catch (err) {
    root.innerHTML = `
      <div class="ui-card">
        <h2 class="ui-card-title">${mod.icon} ${mod.title}</h2>
        <p class="ui-note">This module is not installed yet.</p>
      </div>
    `;
  }
}

async function bootstrap() {
  initTelegram();

  const badge = document.getElementById('env-badge');
  badge.textContent = isInsideTelegram() ? 'Telegram' : 'Browser Test';

  state.launchParams = getLaunchParams();
  const savedMarket = await getShared('market', 'crypto');
  if (state.launchParams.market === 'crypto' || state.launchParams.market === 'forex') {
    state.market = state.launchParams.market;
  } else {
    state.market = savedMarket;
  }

  if (MODULES.some((m) => m.id === state.launchParams.tab)) {
    state.activeTab = state.launchParams.tab;
  }

  document.querySelectorAll('.market-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const next = btn.dataset.market;
      if (next === state.market) return;
      haptic('light');
      state.market = next;
      await setShared('market', next);
      renderMarketButtons();
      mountActiveModule();
    });
  });

  renderMarketButtons();
  renderTabs();
  await mountActiveModule();
}

bootstrap();