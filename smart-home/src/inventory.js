// Хранилище «паспорта квартиры».
// В опубликованном артефакте записи лежат в базе артефакта (capability `db`,
// коллекция `items`) и видны на всех устройствах. Локально (из репозитория)
// записи хранятся в браузере; их можно выгрузить и загрузить JSON-файлом.
import { buildSeed } from './inventory-seed.js';

const LOCAL_KEY = 'smart-home.inventory.v1';
const DB_TIMEOUT = 10000;

const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

export async function openInventory() {
  const listeners = new Set();
  const store = {
    mode: 'loading',
    items: [],
    canEdit: true,
    error: '',
    on(fn) { listeners.add(fn); fn(store); return () => listeners.delete(fn); },
    emit() { for (const fn of listeners) fn(store); },
    save: async () => {},
    remove: async () => {},
  };

  const db = window.claude?.use ? await withTimeout(window.claude.use('db'), DB_TIMEOUT) : null;
  if (db) {
    attachDb(store, db);
  } else {
    attachLocal(store);
  }
  return store;
}

function attachDb(store, db) {
  store.mode = 'db';
  const col = db.collection('items');
  let loaded = false;
  const timer = setTimeout(() => {
    if (!loaded) { store.error = 'База пока недоступна — записи появятся, как только она ответит.'; store.emit(); }
  }, DB_TIMEOUT);
  col.onSnapshot((snap) => {
    store.items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    if (!snap.metadata.fromCache) { loaded = true; clearTimeout(timer); store.error = ''; }
    store.emit();
  }, (e) => {
    clearTimeout(timer);
    store.error = e.code === 'revoked' ? '' : `База недоступна (${e.code}).`;
    store.emit();
  });

  window.claude.use('user').then(async (user) => {
    const can = user ? await user.can('data.write') : null;
    if (can === false) { store.canEdit = false; store.emit(); }
  });

  store.save = async (item) => {
    const { id, ...body } = item;
    try {
      await col.doc(id).set({ ...body, updatedAt: new Date().toISOString() });
    } catch (e) {
      if (e.code === 'invalid_argument') { store.canEdit = false; store.emit(); }
      throw e;
    }
  };
  store.remove = async (id) => { await col.doc(id).delete(); };
}

function attachLocal(store) {
  store.mode = 'local';
  let items = null;
  try { items = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch { items = null; }
  store.items = Array.isArray(items) ? items : buildSeed();
  const persist = () => {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(store.items)); } catch { /* приватный режим */ }
  };
  store.save = async (item) => {
    const i = store.items.findIndex((x) => x.id === item.id);
    const next = { ...item, updatedAt: new Date().toISOString() };
    if (i >= 0) store.items[i] = next; else store.items.push(next);
    persist();
    store.emit();
  };
  store.remove = async (id) => {
    store.items = store.items.filter((x) => x.id !== id);
    persist();
    store.emit();
  };
  store.exportJSON = () => JSON.stringify(store.items, null, 2);
  store.importJSON = (text) => {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error('Ожидался массив записей');
    store.items = arr.filter((x) => x && x.id && x.name);
    persist();
    store.emit();
  };
}

// Насколько заполнена карточка: есть бренд/модель или артикул.
export function isFilled(item) {
  return Boolean((item.brand && item.model) || item.sku);
}
