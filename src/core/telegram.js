const tg = window.Telegram?.WebApp || null;

export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
  } catch (err) {
    console.warn('Telegram init warning:', err);
  }
}

export function isInsideTelegram() {
  return Boolean(tg && tg.initData);
}

export function haptic(type = 'light') {
  try {
    if (isInsideTelegram()) {
      tg?.HapticFeedback?.impactOccurred?.(type);
    }
  } catch (_) {}
}

export function getLaunchParams() {
  const params = {};
  const urlParams = new URLSearchParams(window.location.search);
  for (const [k, v] of urlParams.entries()) {
    params[k] = v;
  }

  const startParam = tg?.initDataUnsafe?.start_param || urlParams.get('tgWebAppStartParam');
  if (startParam) {
    const keyMap = { m: 'market', t: 'tab', e: 'entry', sl: 'sl', tp: 'tp', s: 'symbol' };
    const numericKeys = new Set(['entry', 'sl', 'tp']);
    startParam.split('_').forEach((part) => {
      const idx = part.indexOf('-');
      if (idx > 0) {
        const key = keyMap[part.slice(0, idx)] || part.slice(0, idx);
        let val = part.slice(idx + 1);
        if (numericKeys.has(key)) {
          val = val.replace(/p/g, '.');
        }
        params[key] = val;
      }
    });
  }

  return params;
}

export function getCloudStorage() {
  if (!isInsideTelegram()) return null;
  if (typeof tg?.isVersionAtLeast === 'function' && !tg.isVersionAtLeast('6.9')) {
    return null;
  }
  return tg?.CloudStorage || null;
}