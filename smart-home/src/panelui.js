// Электрощиток: схема автоматов по рядам, включение/отключение, тест УЗО,
// подсветка зон и потребителей выбранной линии на 3D.
import { PANEL, BREAKERS, UNLABELED } from './panel.js';
import { ICONS } from './icons.js';

const KIND = { main: 'Ввод', rcbo: 'Дифавтомат 30 мА', mcb: 'Автомат' };
const SHORT = { main: 'ввод', rcbo: 'УЗО 30 мА', mcb: 'автомат' };
const ICON_FOR = { both: ['socket', 'light'], socket: ['socket'], light: ['light'], appliance: ['appliance'], ac: ['ac'], net: ['net'], fan: ['fan'], hood: ['hood'], power: ['power'] };

const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
};

export function createPanelUI(home, actions) {
  const drawer = document.getElementById('panel-drawer');
  const rowsEl = document.getElementById('panel-rows');
  const detailEl = document.getElementById('panel-detail');
  const summaryEl = document.getElementById('panel-summary');
  let selected = null;
  const cards = {};

  for (const row of PANEL) {
    const rowEl = h('div', 'din-row');
    rowEl.append(h('div', 'din-row-name', row.row));
    const rail = h('div', 'din-rail');
    for (const b of row.breakers) {
      const card = h('div', `breaker breaker-${b.kind}`);
      card.style.setProperty('--modules', b.modules);
      card.dataset.id = b.id;
      card.innerHTML = `
        <button type="button" class="lever" aria-label="${b.title}: включить или отключить"><span></span></button>
        <button type="button" class="breaker-body">
          <span class="breaker-rating">${b.rating}</span>
          <span class="breaker-kind">${SHORT[b.kind]}</span>
          <span class="breaker-title">${b.title}</span>
          <span class="breaker-icons">${[...new Set(b.lines.flatMap((l) => ICON_FOR[l.icon]))].map((i) => ICONS[i]).join('')}</span>
        </button>`;
      card.querySelector('.lever').addEventListener('click', () => home.setBreaker(b.id, !home.breakers[b.id], 'ui'));
      card.querySelector('.breaker-body').addEventListener('click', () => select(b.id));
      rail.append(card);
      cards[b.id] = card;
    }
    rowEl.append(rail);
    rowsEl.append(rowEl);
  }

  function roomNames(ids) {
    return ids.map((id) => home.rooms.find((r) => r.id === id)?.name).filter(Boolean);
  }

  function renderDetail() {
    const b = BREAKERS.find((x) => x.id === selected);
    if (!b) {
      const unl = UNLABELED.map((id) => home.def(id)).map((d) => `${d.name.toLowerCase()} (${home.rooms.find((r) => r.id === d.room).name.toLowerCase()})`);
      detailEl.innerHTML = `
        <p class="pd-hint">Выберите автомат, чтобы увидеть его зоны и потребителей на плане. Рычаг слева включает и отключает линию.</p>
        <p class="pd-note">Нет на наклейках щитка: ${unl.join(', ')}. Эти устройства отключаются только вводом.</p>`;
      return;
    }
    const on = home.breakers[b.id];
    const devs = b.devices[0] === '*' ? [] : b.devices.map((id) => home.def(id)).filter(Boolean);
    detailEl.innerHTML = `
      <div class="pd-head">
        <div>
          <h3>${b.title}</h3>
          <p>${b.brand} · ${b.rating}${b.poles ? ` · ${b.poles}P` : ''} · ${KIND[b.kind]}</p>
        </div>
        <span class="pd-state ${on ? 'on' : 'off'}">${on ? 'Включён' : 'Отключён'}</span>
      </div>
      <ul class="pd-lines">${b.lines.map((l) => `<li>${ICONS[ICON_FOR[l.icon][0]]}${l.text}</li>`).join('')}</ul>
      ${b.rooms.length ? `<p class="pd-row"><b>Зоны:</b> ${roomNames(b.rooms).join(', ')}</p>` : ''}
      ${b.kind === 'main' ? '<p class="pd-row"><b>Питает:</b> всю квартиру</p>' : ''}
      ${devs.length ? `<p class="pd-row"><b>Устройства в модели:</b> ${devs.map((d) => `${d.name} (${home.rooms.find((r) => r.id === d.room).name.toLowerCase()})`).join(', ')}</p>` : ''}
      <div class="pd-actions">
        <button type="button" class="chip" data-act="toggle">${on ? 'Отключить' : 'Включить'}</button>
        ${b.kind === 'rcbo' && on ? '<button type="button" class="chip" data-act="test">Тест УЗО</button>' : ''}
      </div>`;
    detailEl.querySelector('[data-act="toggle"]').addEventListener('click', () => home.setBreaker(b.id, !on, 'ui'));
    detailEl.querySelector('[data-act="test"]')?.addEventListener('click', () => home.setBreaker(b.id, false, 'trip'));
  }

  function select(id) {
    selected = selected === id ? null : id;
    for (const [bid, c] of Object.entries(cards)) c.classList.toggle('selected', bid === selected);
    actions.highlight(BREAKERS.find((b) => b.id === selected) || null);
    renderDetail();
  }

  function sync() {
    let off = 0;
    for (const b of BREAKERS) {
      const on = home.breakers[b.id];
      if (!on) off++;
      cards[b.id].classList.toggle('is-off', !on);
    }
    summaryEl.textContent = off ? `Отключено автоматов: ${off} из ${BREAKERS.length}` : `Все ${BREAKERS.length} автоматов включены`;
    summaryEl.classList.toggle('warn', off > 0);
    renderDetail();
  }

  home.on((e) => { if (e.type === 'breaker') sync(); });
  document.getElementById('panel-open').addEventListener('click', () => open(!isOpen()));
  document.getElementById('panel-close').addEventListener('click', () => open(false));

  const isOpen = () => !drawer.hidden;
  function open(v) {
    drawer.hidden = !v;
    document.getElementById('panel-open').classList.toggle('active', v);
    if (!v && selected) select(selected);
  }

  sync();
  return {
    open,
    // симуляция срабатывания дифавтомата
    trip(id) { home.setBreaker(id, false, 'trip'); open(true); if (selected !== id) select(id); },
  };
}
