import { getCloudStorage } from './telegram.js';

const LOCAL_PREFIX = 'tcalc_';

function readLocal(key) {
  try {
    return localStorage.getItem(LOCAL_PREFIX + key);
  } catch {
    return null;
  }
}

function readRaw(key) {
  return new Promise((resolve) => {
    const cloud = getCloudStorage();
    if (cloud) {
      try {
        cloud.getItem(key, (err, value) => {
          if (!err && value !== undefined && value !== null && value !== '') {
            resolve(value);
          } else {
            resolve(readLocal(key));
          }
        });
        return;
      } catch (_) {}
    }
    resolve(readLocal(key));
  });
}

function writeRaw(key, value) {
  return new Promise((resolve) => {
    const str = String(value);
    try {
      localStorage.setItem(LOCAL_PREFIX + key, str);
    } catch (_) {}

    const cloud = getCloudStorage();
    if (cloud) {
      try {
        cloud.setItem(key, str, () => resolve());
        return;
      } catch (_) {}
    }
    resolve();
  });
}

export async function getShared(key, fallback = null) {
  const raw = await readRaw(`shared_${key}`);
  if (raw === null || raw === '') return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function setShared(key, value) {
  await writeRaw(`shared_${key}`, JSON.stringify(value));
}

export function createModuleStore(moduleId) {
  const prefix = `mod_${moduleId}_`;
  return {
    async get(key, fallback = null) {
      const raw = await readRaw(prefix + key);
      if (raw === null || raw === '') return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    async set(key, value) {
      await writeRaw(prefix + key, JSON.stringify(value));
    },
  };
}