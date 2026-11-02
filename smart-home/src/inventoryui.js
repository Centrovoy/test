// «Паспорт квартиры»: всё оборудование, мебель и отделка с брендами, моделями
// и артикулами — чтобы при поломке сразу знать, что покупать.
import { CATEGORIES, FIELDS } from './inventory-seed.js';
import { isFilled } from './inventory.js';

const CAT_NAME = Object.fromEntries(CATEGORIES);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createInventoryUI(home, store, actions) {
  const $ = (id) => document.getElementById(id);
  const drawer = $('inv-drawer');
  const listEl = $('inv-list');
  const formEl = $('inv-form');
  const summaryEl = $('inv-summary');
  const search = $('inv-search');
  const roomSel = $('inv-room');
  const catSel = $('inv-cat');
  const missing = $('inv-missing');
  const roomName = (id) => home.rooms.find((r) => r.id === id)?.name || id;

  roomSel.innerHTML = '<option value="">Все помещения</option>' + home.rooms.map((r) => `<option value="${r.id}">${r.name}</option>`).join('');
  catSel.innerHTML = '<option value="">Все категории</option>' + CATEGORIES.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');

  let selected = null;
  let draft = null;        // редактируемая копия выбранной записи
  let confirmDelete = false;

  // ---- список ----
  function filtered() {
    const q = search.value.trim().toLowerCase();
    return store.items.filter((it) =>
      (!roomSel.value || it.room === roomSel.value) &&
      (!catSel.value || it.category === catSel.value) &&
      (!missing.checked || !isFilled(it)) &&
      (!q || [it.name, it.brand, it.model, it.sku, it.place, it.specs, it.notes].join(' ').toLowerCase().includes(q)));
  }

  function renderList() {
    const items = filtered();
    const total = store.items.length;
    const done = store.items.filter(isFilled).length;
    summaryEl.textContent = store.mode === 'loading' ? 'Загрузка…' : `Заполнено ${done} из ${total}${store.error ? ` · ${store.error}` : ''}`;
    if (!items.length) {
      listEl.innerHTML = `<p class="inv-empty">${total ? 'Ничего не найдено. Измените фильтры или поиск.' : 'Записей пока нет. Нажмите «Добавить», чтобы описать первый предмет.'}</p>`;
      return;
    }
    const groups = new Map();
    for (const it of items) {
      const key = `${it.room}|${it.category}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(it);
    }
    const order = (k) => {
      const [room, cat] = k.split('|');
      return home.rooms.findIndex((r) => r.id === room) * 100 + CATEGORIES.findIndex(([c]) => c === cat);
    };
    listEl.innerHTML = [...groups.entries()].sort((a, b) => order(a[0]) - order(b[0])).map(([k, arr]) => {
      const [room, cat] = k.split('|');
      return `<div class="inv-group">
        <h3>${esc(roomName(room))} · <span>${esc(CAT_NAME[cat] || cat)}</span></h3>
        ${arr.sort((a, b) => a.name.localeCompare(b.name, 'ru')).map((it) => `
          <button type="button" class="inv-row${it.id === selected ? ' selected' : ''}" data-id="${esc(it.id)}">
            <span class="inv-name">${esc(it.name)}${it.qty && it.qty !== '1' ? ` <small>× ${esc(it.qty)}</small>` : ''}</span>
            <span class="inv-meta">${isFilled(it) ? esc([it.brand, it.model].filter(Boolean).join(' ') || it.sku) : '<span class="inv-chip">заполнить</span>'}</span>
          </button>`).join('')}
      </div>`;
    }).join('');
  }

  listEl.addEventListener('click', (e) => {
    const row = e.target.closest('.inv-row');
    if (row) select(row.dataset.id);
  });
  for (const el of [search, roomSel, catSel, missing]) el.addEventListener('input', renderList);

  // ---- карточка ----
  function select(id) {
    selected = id;
    const it = store.items.find((x) => x.id === id);
    draft = it ? { ...it } : null;
    confirmDelete = false;
    renderList();
    renderForm();
    if (it) {
      actions.highlight({ rooms: [it.room], points: it.at ? [[it.at[0], it.at[1], it.name]] : [] });
      actions.focusRoom(it.room);
    }
  }

  function renderForm() {
    if (!draft) {
      formEl.innerHTML = `<p class="inv-hint">Выберите запись слева, чтобы посмотреть или заполнить её. Место предмета подсветится на плане.</p>
        <p class="inv-hint">Совет: заполняйте бренд, модель и артикул — по ним проще всего найти замену. Для ламп укажите цоколь, мощность и цветовую температуру.</p>`;
      return;
    }
    const ro = !store.canEdit;
    const field = ([k, label]) => {
      const v = esc(draft[k]);
      const long = k === 'specs' || k === 'notes';
      const type = k === 'purchased' || k === 'warranty' ? 'date' : k === 'link' ? 'url' : 'text';
      return `<label class="inv-field${long ? ' wide' : ''}"><span>${label}</span>${long
        ? `<textarea id="inv-f-${k}" data-k="${k}" rows="2" ${ro ? 'readonly' : ''}>${v}</textarea>`
        : `<input id="inv-f-${k}" data-k="${k}" type="${type}" value="${v}" ${ro ? 'readonly' : ''}>`}</label>`;
    };
    formEl.innerHTML = `
      <div class="inv-form-head">
        <span class="inv-state ${isFilled(draft) ? 'ok' : 'todo'}">${isFilled(draft) ? 'Заполнено' : 'Нужно заполнить'}</span>
        ${draft.link ? `<a href="${esc(draft.link)}" target="_blank" rel="noopener">Открыть ссылку</a>` : ''}
      </div>
      <div class="inv-fields">
        <label class="inv-field"><span>Помещение</span><select id="inv-f-room" data-k="room" ${ro ? 'disabled' : ''}>${home.rooms.map((r) => `<option value="${r.id}"${r.id === draft.room ? ' selected' : ''}>${r.name}</option>`).join('')}</select></label>
        <label class="inv-field"><span>Категория</span><select id="inv-f-category" data-k="category" ${ro ? 'disabled' : ''}>${CATEGORIES.map(([k, n]) => `<option value="${k}"${k === draft.category ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        ${FIELDS.map(field).join('')}
      </div>
      ${ro ? '<p class="inv-hint">Только просмотр: редактировать может владелец страницы.</p>' : `
      <div class="inv-actions">
        <button type="button" class="chip primary" data-act="save">Сохранить</button>
        <button type="button" class="chip" data-act="delete">${confirmDelete ? 'Точно удалить?' : 'Удалить'}</button>
        <span class="inv-saved" id="inv-saved" role="status"></span>
      </div>`}`;
  }

  formEl.addEventListener('input', (e) => {
    const k = e.target.dataset?.k;
    if (k && draft) draft[k] = e.target.value;
  });
  formEl.addEventListener('click', async (e) => {
    const act = e.target.dataset?.act;
    if (!act || !draft) return;
    const status = $('inv-saved');
    if (act === 'save') {
      if (!draft.name.trim()) { status.textContent = 'Укажите название'; return; }
      try {
        await store.save(draft);
        renderForm();
        $('inv-saved').textContent = 'Сохранено';
      } catch (err) {
        status.textContent = err.code === 'quota_exceeded' ? 'База заполнена: удалите лишние записи.' : 'Не удалось сохранить. Попробуйте ещё раз.';
      }
    }
    if (act === 'delete') {
      if (!confirmDelete) { confirmDelete = true; renderForm(); return; }
      await store.remove(draft.id);
      selected = null; draft = null;
      renderForm();
    }
  });

  $('inv-add').addEventListener('click', () => {
    const id = `custom-${Date.now().toString(36)}`;
    const room = roomSel.value || 'hall';
    draft = { id, room, category: catSel.value || 'furniture', name: '', qty: '1', at: home.rooms.find((r) => r.id === room).label };
    for (const [k] of FIELDS) draft[k] ??= '';
    selected = id;
    renderList();
    renderForm();
    $('inv-f-name')?.focus();
  });

  // выгрузка/загрузка JSON — только в локальной версии
  const exportBtn = $('inv-export');
  const importInput = $('inv-import');
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pasport-kvartiry.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    if (!file) return;
    try { store.importJSON(await file.text()); summaryEl.textContent += ' · Загружено'; } catch (err) { summaryEl.textContent = `Не удалось загрузить файл: ${err.message}`; }
    importInput.value = '';
  });

  store.on(() => {
    const local = store.mode === 'local';
    exportBtn.hidden = !local;
    importInput.closest('label').hidden = !local;
    $('inv-add').hidden = !store.canEdit;
    renderList();
    if (draft && !formEl.contains(document.activeElement)) {
      const fresh = store.items.find((x) => x.id === draft.id);
      if (fresh) { draft = { ...fresh }; renderForm(); }
    }
  });

  // ---- открытие/закрытие ----
  function open(v, opts = {}) {
    drawer.hidden = !v;
    $('inv-open').classList.toggle('active', v);
    if (v) {
      document.dispatchEvent(new CustomEvent('drawer-open', { detail: 'inventory' }));
      if (opts.room !== undefined) { roomSel.value = opts.room; renderList(); }
    } else {
      actions.highlight(null);
    }
  }
  $('inv-open').addEventListener('click', () => open(drawer.hidden));
  $('inv-close').addEventListener('click', () => open(false));
  document.addEventListener('drawer-open', (e) => { if (e.detail !== 'inventory' && !drawer.hidden) open(false); });

  renderForm();
  return { open };
}
