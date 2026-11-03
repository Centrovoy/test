// Хранилище «паспорта квартиры» и документов.
// В опубликованном артефакте записи лежат в базе артефакта (capability `db`,
// коллекции `items` и `docs`), а файлы документов — в его хранилище (`assets`).
// Локально (из репозитория) записи хранятся в браузере и выгружаются JSON-файлом,
// а документы берутся из папки docs/ по списку docs/manifest.json.
import { buildSeed } from './inventory-seed.js';

const LOCAL_KEY = 'smart-home.inventory.v1';
const DB_TIMEOUT = 10000;

const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

export async function openInventory() {
  const listeners = new Set();
  const store = {
    mode: 'loading',
    items: [],
    docs: [],
    canEdit: true,
    canUpload: false,
    error: '',
    on(fn) { listeners.add(fn); fn(store); return () => listeners.delete(fn); },
    emit() { for (const fn of listeners) fn(store); },
    save: async () => {},
    remove: async () => {},
    saveDoc: async () => {},
    removeDoc: async () => {},
    uploadDoc: async () => { throw new Error('Загрузка недоступна'); },
  };

  const db = window.claude?.use ? await withTimeout(window.claude.use('db'), DB_TIMEOUT) : null;
  if (db) {
    attachDb(store, db);
  } else if (await hasServer()) {
    await attachServer(store);
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

  // документы: записи в `docs`, файлы в хранилище артефакта
  const docsCol = db.collection('docs');
  docsCol.onSnapshot((snap) => {
    store.docs = snap.docs.map((d) => {
      const body = d.data();
      return { ...body, id: d.id, url: body.assetId ? `/_blob/${body.assetId}` : '' };
    });
    store.emit();
  }, () => {});

  let assets = null;
  window.claude.use('assets').then((a) => { assets = a; store.canUpload = Boolean(a); store.emit(); });

  store.saveDoc = async (doc) => {
    const { id, url, ...body } = doc;
    await docsCol.doc(id).set({ ...body, updatedAt: new Date().toISOString() });
  };
  store.uploadDoc = async (file, meta) => {
    if (!assets) throw new Error('Загружать файлы может только владелец страницы');
    const up = await assets.upload(file);
    const id = `doc-${Date.now().toString(36)}`;
    await store.saveDoc({ id, title: meta.title || file.name, kind: meta.kind || 'other', room: meta.room || '', items: meta.items || [], notes: '', date: '', assetId: up.id, contentType: up.contentType, size: up.sizeBytes });
    return id;
  };
  store.removeDoc = async (doc) => {
    await docsCol.doc(doc.id).delete();
    const shared = store.docs.some((d) => d.id !== doc.id && d.assetId === doc.assetId);
    if (assets && doc.assetId && !shared) { try { await assets.delete(doc.assetId); } catch { /* файл уже удалён */ } }
  };
}

// ---- локальный сервер (server.py): данные на диске компьютера ----
async function hasServer() {
  try { return (await fetch('api/health', { cache: 'no-store' })).ok; } catch { return false; }
}

async function api(method, path, body, headers = {}) {
  const r = await fetch(path, { method, body, headers, cache: 'no-store' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || `Ошибка сервера ${r.status}`), { code: r.status });
  return data;
}

async function attachServer(store) {
  store.mode = 'server';
  store.canUpload = true;
  const { items } = await api('GET', 'api/items');
  if (items) {
    store.items = items;
  } else {
    // первый запуск: начальный список (или данные, сохранённые раньше в этом браузере)
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch { saved = null; }
    store.items = Array.isArray(saved) ? saved : buildSeed();
    await api('PUT', 'api/items', JSON.stringify(store.items), { 'Content-Type': 'application/json' });
  }
  const loadDocs = async () => { store.docs = (await api('GET', 'api/docs')).docs; store.emit(); };
  await loadDocs();

  store.save = async (item) => {
    const saved = await api('PUT', `api/items/${encodeURIComponent(item.id)}`, JSON.stringify(item), { 'Content-Type': 'application/json' });
    const i = store.items.findIndex((x) => x.id === item.id);
    if (i >= 0) store.items[i] = saved; else store.items.push(saved);
    store.emit();
  };
  store.remove = async (id) => {
    await api('DELETE', `api/items/${encodeURIComponent(id)}`);
    store.items = store.items.filter((x) => x.id !== id);
    store.emit();
  };
  store.uploadDoc = async (file, meta) => {
    const doc = await api('POST', 'api/docs', file, {
      'Content-Type': file.type || 'application/octet-stream',
      'X-Filename': encodeURIComponent(file.name),
      'X-Meta': encodeURIComponent(JSON.stringify(meta)),
    });
    await loadDocs();
    return doc.id;
  };
  store.saveDoc = async (doc) => {
    if (doc.readonly) throw new Error('Документ из папки проекта меняется в docs/manifest.json');
    await api('PUT', `api/docs/${encodeURIComponent(doc.id)}`, JSON.stringify(doc), { 'Content-Type': 'application/json' });
    await loadDocs();
  };
  store.removeDoc = async (doc) => {
    await api('DELETE', `api/docs/${encodeURIComponent(doc.id)}`);
    await loadDocs();
  };
  store.exportJSON = () => JSON.stringify(store.items, null, 2);
  store.importJSON = async (text) => {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error('Ожидался массив записей');
    const r = await api('PUT', 'api/items', text, { 'Content-Type': 'application/json' });
    store.items = (await api('GET', 'api/items')).items || [];
    store.emit();
    return r.count;
  };
  store.emit();
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
  // документы из папки docs/ (только чтение)
  fetch('docs/manifest.json').then((r) => (r.ok ? r.json() : [])).then((list) => {
    store.docs = list.map((d) => ({ ...d, url: `docs/${d.path}` }));
    store.emit();
  }).catch(() => {});
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

export const DOC_KINDS = [
  ['drawing', 'Чертёж / проект'],
  ['manual', 'Инструкция'],
  ['receipt', 'Чек / накладная'],
  ['warranty', 'Гарантия'],
  ['contract', 'Договор / акт'],
  ['photo', 'Фото'],
  ['other', 'Другое'],
];
