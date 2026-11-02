// «Паспорт квартиры»: всё оборудование, мебель и отделка с брендами, моделями
// и артикулами — чтобы при поломке сразу знать, что покупать. Вкладка
// «Документы» хранит чертежи, инструкции, чеки, гарантии и фото с привязкой
// к позициям паспорта.
import { CATEGORIES, FIELDS } from './inventory-seed.js';
import { isFilled, DOC_KINDS } from './inventory.js';

const CAT_NAME = Object.fromEntries(CATEGORIES);
const KIND_NAME = Object.fromEntries(DOC_KINDS);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const isImage = (d) => /\.(webp|jpe?g|png|gif)$/i.test(d.path || '') || /^image\//.test(d.contentType || '');

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
  const uploadInput = $('inv-upload');
  const roomName = (id) => home.rooms.find((r) => r.id === id)?.name || id;

  roomSel.innerHTML = '<option value="">Все помещения</option>' + home.rooms.map((r) => `<option value="${r.id}">${r.name}</option>`).join('');
  catSel.innerHTML = '<option value="">Все категории</option>' + CATEGORIES.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');

  let tab = 'items';       // items | docs
  let selected = null;     // id позиции
  let draft = null;        // редактируемая копия позиции
  let selectedDoc = null;  // id документа
  let docDraft = null;
  let confirmDelete = false;

  const docsFor = (itemId) => store.docs.filter((d) => (d.items || []).includes(itemId));
  const query = () => search.value.trim().toLowerCase();

  // ---- вкладки ----
  for (const b of document.querySelectorAll('#inv-tabs button')) {
    b.addEventListener('click', () => { tab = b.dataset.tab; confirmDelete = false; render(); });
  }

  function render() {
    for (const b of document.querySelectorAll('#inv-tabs button')) b.classList.toggle('active', b.dataset.tab === tab);
    catSel.hidden = tab !== 'items';
    missing.closest('label').hidden = tab !== 'items';
    $('inv-add').hidden = tab !== 'items' || !store.canEdit;
    uploadInput.closest('label').hidden = tab !== 'docs' || !store.canUpload;
    const local = store.mode === 'local';
    $('inv-export').hidden = !local || tab !== 'items';
    $('inv-import').closest('label').hidden = !local || tab !== 'items';
    if (tab === 'items') { renderList(); renderForm(); } else { renderDocList(); renderDocForm(); }
  }

  // ---- позиции: список ----
  function filtered() {
    const q = query();
    return store.items.filter((it) =>
      (!roomSel.value || it.room === roomSel.value) &&
      (!catSel.value || it.category === catSel.value) &&
      (!missing.checked || !isFilled(it)) &&
      (!q || [it.name, it.brand, it.model, it.sku, it.place, it.specs, it.notes].join(' ').toLowerCase().includes(q)));
  }

  function summary() {
    const total = store.items.length;
    const done = store.items.filter(isFilled).length;
    summaryEl.textContent = store.mode === 'loading' ? 'Загрузка…'
      : `Заполнено ${done} из ${total} · документов: ${store.docs.length}${store.error ? ` · ${store.error}` : ''}`;
  }

  function renderList() {
    summary();
    const items = filtered();
    if (!items.length) {
      listEl.innerHTML = `<p class="inv-empty">${store.items.length ? 'Ничего не найдено. Измените фильтры или поиск.' : 'Записей пока нет. Нажмите «Добавить», чтобы описать первый предмет.'}</p>`;
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
        ${arr.sort((a, b) => a.name.localeCompare(b.name, 'ru')).map((it) => {
          const nd = docsFor(it.id).length;
          return `
          <button type="button" class="inv-row${it.id === selected ? ' selected' : ''}" data-id="${esc(it.id)}">
            <span class="inv-name">${esc(it.name)}${it.qty && it.qty !== '1' ? ` <small>× ${esc(it.qty)}</small>` : ''}${nd ? ` <small class="inv-docs-count">· док. ${nd}</small>` : ''}</span>
            <span class="inv-meta">${isFilled(it) ? esc([it.brand, it.model].filter(Boolean).join(' ') || it.sku) : '<span class="inv-chip">заполнить</span>'}</span>
          </button>`;
        }).join('')}
      </div>`;
    }).join('');
  }

  // ---- документы: список ----
  function renderDocList() {
    summary();
    const q = query();
    const docs = store.docs.filter((d) =>
      (!roomSel.value || d.room === roomSel.value) &&
      (!q || [d.title, d.notes, KIND_NAME[d.kind]].join(' ').toLowerCase().includes(q)));
    if (!docs.length) {
      listEl.innerHTML = `<p class="inv-empty">${store.docs.length ? 'Ничего не найдено.' : store.canUpload
        ? 'Документов пока нет. Нажмите «Загрузить документ», чтобы добавить чертёж, инструкцию, чек или фото.'
        : 'Документов пока нет.'}</p>`;
      return;
    }
    const groups = new Map(DOC_KINDS.map(([k]) => [k, []]));
    for (const d of docs) (groups.get(d.kind) || groups.get('other')).push(d);
    listEl.innerHTML = [...groups.entries()].filter(([, arr]) => arr.length).map(([k, arr]) => `
      <div class="inv-group">
        <h3>${esc(KIND_NAME[k])} <span>· ${arr.length}</span></h3>
        ${arr.sort((a, b) => a.title.localeCompare(b.title, 'ru')).map((d) => `
          <button type="button" class="inv-row${d.id === selectedDoc ? ' selected' : ''}" data-doc="${esc(d.id)}">
            <span class="inv-name">${esc(d.title)}</span>
            <span class="inv-meta">${esc(d.room ? roomName(d.room) : 'вся квартира')}${d.items?.length ? ` · позиций ${d.items.length}` : ''}</span>
          </button>`).join('')}
      </div>`).join('');
  }

  listEl.addEventListener('click', (e) => {
    const row = e.target.closest('.inv-row');
    if (!row) return;
    if (row.dataset.doc) selectDoc(row.dataset.doc); else select(row.dataset.id);
  });
  for (const el of [search, roomSel, catSel, missing]) el.addEventListener('input', () => (tab === 'items' ? renderList() : renderDocList()));

  // ---- позиции: карточка ----
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

  function docLinks(list) {
    return list.map((d) => `<li><a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.title)}</a> <small>${esc(KIND_NAME[d.kind] || '')}</small></li>`).join('');
  }

  function renderForm() {
    if (!draft) {
      formEl.innerHTML = `<p class="inv-hint">Выберите запись слева, чтобы посмотреть или заполнить её. Место предмета подсветится на плане.</p>
        <p class="inv-hint">Совет: заполняйте бренд, модель и артикул — по ним проще всего найти замену. Для ламп укажите цоколь, мощность и цветовую температуру. Чеки, инструкции и гарантийные талоны прикрепляйте в блоке «Документы» карточки.</p>`;
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
    const linked = docsFor(draft.id);
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
      <div class="inv-docs">
        <h4>Документы</h4>
        ${linked.length ? `<ul>${docLinks(linked)}</ul>` : '<p class="inv-hint">Документов нет.</p>'}
        ${store.canUpload ? `<label class="chip inv-import">Прикрепить файл<input id="inv-attach" type="file" accept="application/pdf,image/*,.txt,.csv,.md"></label>` : ''}
      </div>
      ${ro ? '<p class="inv-hint">Только просмотр: редактировать может владелец страницы.</p>' : `
      <div class="inv-actions">
        <button type="button" class="chip primary" data-act="save">Сохранить</button>
        <button type="button" class="chip" data-act="delete">${confirmDelete ? 'Точно удалить?' : 'Удалить'}</button>
        <span class="inv-saved" id="inv-saved" role="status"></span>
      </div>`}`;
    $('inv-attach')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const status = $('inv-saved');
      if (status) status.textContent = 'Загрузка…';
      try {
        await store.uploadDoc(file, { title: `${draft.name}: ${file.name}`, kind: /^image\//.test(file.type) ? 'photo' : 'other', room: draft.room, items: [draft.id] });
        if ($('inv-saved')) $('inv-saved').textContent = 'Файл прикреплён';
      } catch (err) {
        if ($('inv-saved')) $('inv-saved').textContent = uploadError(err);
      }
    });
  }

  // ---- документы: карточка ----
  function selectDoc(id) {
    selectedDoc = id;
    const d = store.docs.find((x) => x.id === id);
    docDraft = d ? { ...d, items: [...(d.items || [])] } : null;
    confirmDelete = false;
    renderDocList();
    renderDocForm();
    if (d) {
      const its = (d.items || []).map((i) => store.items.find((x) => x.id === i)).filter(Boolean);
      actions.highlight({ rooms: d.room ? [d.room] : [...new Set(its.map((i) => i.room))], points: its.filter((i) => i.at).slice(0, 8).map((i) => [i.at[0], i.at[1], i.name]) });
      if (d.room) actions.focusRoom(d.room);
    }
  }

  function renderDocForm() {
    if (!docDraft) {
      formEl.innerHTML = `<p class="inv-hint">Выберите документ слева, чтобы открыть его и посмотреть, к каким позициям он относится.</p>
        ${store.mode === 'local' ? '<p class="inv-hint">В локальной версии документы берутся из папки docs/ репозитория (список — docs/manifest.json).</p>' : ''}`;
      return;
    }
    const ro = !store.canUpload || store.mode === 'local';
    const roomItems = store.items.filter((i) => !docDraft.room || i.room === docDraft.room || docDraft.items.includes(i.id));
    formEl.innerHTML = `
      <div class="inv-form-head">
        <span class="inv-state ok">${esc(KIND_NAME[docDraft.kind] || 'Документ')}</span>
        <a href="${esc(docDraft.url)}" target="_blank" rel="noopener">Открыть файл</a>
      </div>
      ${isImage(docDraft) ? `<a href="${esc(docDraft.url)}" target="_blank" rel="noopener" class="inv-preview"><img src="${esc(docDraft.url)}" alt="${esc(docDraft.title)}"></a>` : ''}
      <div class="inv-fields">
        <label class="inv-field wide"><span>Название</span><input id="inv-d-title" data-d="title" value="${esc(docDraft.title)}" ${ro ? 'readonly' : ''}></label>
        <label class="inv-field"><span>Тип</span><select id="inv-d-kind" data-d="kind" ${ro ? 'disabled' : ''}>${DOC_KINDS.map(([k, n]) => `<option value="${k}"${k === docDraft.kind ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="inv-field"><span>Помещение</span><select id="inv-d-room" data-d="room" ${ro ? 'disabled' : ''}><option value="">Вся квартира</option>${home.rooms.map((r) => `<option value="${r.id}"${r.id === docDraft.room ? ' selected' : ''}>${r.name}</option>`).join('')}</select></label>
        <label class="inv-field"><span>Дата</span><input id="inv-d-date" data-d="date" type="date" value="${esc(docDraft.date)}" ${ro ? 'readonly' : ''}></label>
        <label class="inv-field wide"><span>Заметки</span><textarea id="inv-d-notes" data-d="notes" rows="2" ${ro ? 'readonly' : ''}>${esc(docDraft.notes)}</textarea></label>
      </div>
      <div class="inv-docs">
        <h4>Относится к позициям</h4>
        <div class="inv-links">${roomItems.map((i) => `<label class="inv-check"><input type="checkbox" data-link="${esc(i.id)}"${docDraft.items.includes(i.id) ? ' checked' : ''} ${ro ? 'disabled' : ''}> ${esc(i.name)}${docDraft.room ? '' : ` <small>(${esc(roomName(i.room))})</small>`}</label>`).join('') || '<p class="inv-hint">Нет позиций.</p>'}</div>
      </div>
      ${ro ? '' : `
      <div class="inv-actions">
        <button type="button" class="chip primary" data-act="save-doc">Сохранить</button>
        <button type="button" class="chip" data-act="delete-doc">${confirmDelete ? 'Удалить файл?' : 'Удалить'}</button>
        <span class="inv-saved" id="inv-saved" role="status"></span>
      </div>`}`;
  }

  function uploadError(err) {
    const code = err?.code;
    if (code === 'unsupported_type') return 'Этот тип файла не поддерживается: загрузите PDF, изображение или текст.';
    if (code === 'too_large' || code === 'payload_too_large') return 'Файл слишком большой (до 20 МБ).';
    if (code === 'quota_exceeded') return 'Хранилище заполнено: удалите ненужные документы.';
    return err?.message || 'Не удалось загрузить файл.';
  }

  // ---- ввод и действия в карточках ----
  formEl.addEventListener('input', (e) => {
    const k = e.target.dataset?.k;
    if (k && draft) draft[k] = e.target.value;
    const dk = e.target.dataset?.d;
    if (dk && docDraft) {
      docDraft[dk] = e.target.value;
      if (dk === 'room') renderDocForm();
    }
    const link = e.target.dataset?.link;
    if (link && docDraft) {
      docDraft.items = e.target.checked ? [...new Set([...docDraft.items, link])] : docDraft.items.filter((x) => x !== link);
    }
  });
  formEl.addEventListener('click', async (e) => {
    const act = e.target.dataset?.act;
    if (!act) return;
    const status = $('inv-saved');
    if (act === 'save' && draft) {
      if (!draft.name.trim()) { status.textContent = 'Укажите название'; return; }
      try {
        await store.save(draft);
        renderForm();
        $('inv-saved').textContent = 'Сохранено';
      } catch (err) {
        status.textContent = err.code === 'quota_exceeded' ? 'База заполнена: удалите лишние записи.' : 'Не удалось сохранить. Попробуйте ещё раз.';
      }
    }
    if (act === 'delete' && draft) {
      if (!confirmDelete) { confirmDelete = true; renderForm(); return; }
      await store.remove(draft.id);
      selected = null; draft = null;
      renderForm();
    }
    if (act === 'save-doc' && docDraft) {
      if (!docDraft.title.trim()) { status.textContent = 'Укажите название'; return; }
      try {
        await store.saveDoc(docDraft);
        renderDocForm();
        $('inv-saved').textContent = 'Сохранено';
      } catch { status.textContent = 'Не удалось сохранить. Попробуйте ещё раз.'; }
    }
    if (act === 'delete-doc' && docDraft) {
      if (!confirmDelete) { confirmDelete = true; renderDocForm(); return; }
      await store.removeDoc(docDraft);
      selectedDoc = null; docDraft = null; confirmDelete = false;
      renderDocForm();
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

  uploadInput.addEventListener('change', async () => {
    const file = uploadInput.files[0];
    if (!file) return;
    summaryEl.textContent = 'Загрузка файла…';
    try {
      const id = await store.uploadDoc(file, { title: file.name.replace(/\.[^.]+$/, ''), kind: /^image\//.test(file.type) ? 'photo' : 'other', room: roomSel.value, items: [] });
      summary();
      setTimeout(() => selectDoc(id), 300);
    } catch (err) {
      summaryEl.textContent = uploadError(err);
    }
    uploadInput.value = '';
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
    const typing = formEl.contains(document.activeElement);
    if (draft && !typing) {
      const fresh = store.items.find((x) => x.id === draft.id);
      if (fresh) draft = { ...fresh };
    }
    if (docDraft && !typing) {
      const fresh = store.docs.find((x) => x.id === docDraft.id);
      if (fresh) docDraft = { ...fresh, items: [...(fresh.items || [])] };
    }
    if (typing) { summary(); if (tab === 'items') renderList(); else renderDocList(); } else render();
  });

  // ---- открытие/закрытие ----
  function open(v, opts = {}) {
    drawer.hidden = !v;
    $('inv-open').classList.toggle('active', v);
    if (v) {
      document.dispatchEvent(new CustomEvent('drawer-open', { detail: 'inventory' }));
      if (opts.room !== undefined) { roomSel.value = opts.room; render(); }
    } else {
      actions.highlight(null);
    }
  }
  $('inv-open').addEventListener('click', () => open(drawer.hidden));
  $('inv-close').addEventListener('click', () => open(false));
  document.addEventListener('drawer-open', (e) => { if (e.detail !== 'inventory' && !drawer.hidden) open(false); });

  render();
  return { open };
}
