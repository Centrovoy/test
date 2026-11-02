// Панели управления: сценарии, комнаты, устройства, правила, журнал.
import { SCENES, RULES } from './home.js';
import { isActive, isAlarm } from './devices.js';
import { ICONS } from './icons.js';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
};

const MODE_NAMES = { home: 'Дома', away: 'Не дома · охрана', night: 'Ночь' };
const fmtHours = (x) => {
  const hh = Math.floor(x) % 24;
  const mm = Math.round((x - Math.floor(x)) * 60) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

export function createUI(home, actions) {
  let selectedRoom = 'living';
  let cards = {};

  // ---- сценарии ----
  const scenesEl = $('#scenes');
  for (const sc of SCENES) {
    const b = h('button', 'scene-btn', `<span>${sc.name}</span><small>${sc.hint}</small>`);
    b.addEventListener('click', () => home.runScene(sc.id));
    scenesEl.append(b);
  }

  // ---- комнаты ----
  const roomsEl = $('#rooms');
  const roomRows = {};
  for (const r of home.rooms) {
    const row = h('button', 'room-row', `<span class="rr-name">${r.name}</span><span class="rr-meta"></span>`);
    row.addEventListener('click', () => selectRoom(r.id, true));
    roomsEl.append(row);
    roomRows[r.id] = row;
  }

  // ---- правила ----
  const rulesEl = $('#rules');
  const ruleRows = {};
  for (const rule of RULES) {
    const row = h('label', 'rule-row', `
      <input type="checkbox" ${rule.enabled ? 'checked' : ''}>
      <span><b>${rule.name}</b><small>${rule.desc}</small></span>`);
    $('input', row).addEventListener('change', (e) => {
      rule.enabled = e.target.checked;
      home.notify(`Правило «${rule.name}» ${rule.enabled ? 'включено' : 'отключено'}`);
    });
    rulesEl.append(row);
    ruleRows[rule.id] = row;
  }

  // ---- журнал и имитация ----
  const logEl = $('#log');
  const sims = [
    ['Протечка в ванной', () => home.set('leak.bath', { alarm: true }, 'sim')],
    ['Дым на кухне', () => home.set('smoke.kitchen', { alarm: true }, 'sim')],
    ['Движение в прихожей', () => pulseMotion('motion.hall')],
    ['Движение в коридоре', () => pulseMotion('motion.corridor')],
    ['Открыть входную дверь', () => {
      home.set('lock.entrance', { locked: false }, 'sim');
      home.set('door.entrance', { open: true }, 'sim');
      setTimeout(() => home.set('door.entrance', { open: false }, 'sim'), 4000);
    }],
    ['Сработал дифавтомат ванной', () => actions.trip('q-bath')],
    ['Сбросить тревоги', () => {
      for (const d of home.devices) if (d.type === 'leak' || d.type === 'smoke') home.set(d.id, { alarm: false }, 'sim');
      home.set('valve.water', { open: true }, 'sim');
      home.notify('Тревоги сброшены, вода открыта', 'ok');
    }],
  ];
  const simEl = $('#sims');
  for (const [name, fn] of sims) {
    const b = h('button', 'chip', name);
    b.addEventListener('click', fn);
    simEl.append(b);
  }
  function pulseMotion(id) {
    home.set(id, { active: true }, 'sim');
    setTimeout(() => home.set(id, { active: false }, 'sim'), 3000);
  }

  // ---- вид ----
  $('#view-iso').addEventListener('click', () => actions.view('iso'));
  $('#view-top').addEventListener('click', () => actions.view('top'));
  $('#view-front').addEventListener('click', () => actions.view('front'));
  const wallsBtn = $('#walls');
  let wallsCut = true;
  actions.walls(1.1);
  wallsBtn.classList.add('active');
  wallsBtn.addEventListener('click', () => {
    wallsCut = !wallsCut;
    actions.walls(wallsCut ? 1.1 : 2.7);
    wallsBtn.classList.toggle('active', wallsCut);
  });
  const markersBtn = $('#markers');
  markersBtn.addEventListener('click', () => {
    document.body.classList.toggle('hide-markers');
    markersBtn.classList.toggle('active', !document.body.classList.contains('hide-markers'));
  });
  const timeInput = $('#time');
  const timeLabel = $('#time-label');
  timeInput.value = home.hours;
  timeLabel.textContent = fmtHours(home.hours);
  timeInput.addEventListener('input', () => home.setHours(parseFloat(timeInput.value)));
  const playBtn = $('#time-play');
  let playing = false;
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    playBtn.textContent = playing ? '❚❚' : '▶';
  });

  // ---- карточки устройств ----
  const panelTitle = $('#panel-title');
  const panelClimate = $('#panel-climate');
  const devicesEl = $('#devices');

  function selectRoom(id, focus) {
    selectedRoom = id;
    for (const [rid, row] of Object.entries(roomRows)) row.classList.toggle('active', rid === id);
    const room = home.rooms.find((r) => r.id === id);
    panelTitle.textContent = room.name;
    devicesEl.innerHTML = '';
    cards = {};
    const list = home.devices.filter((d) => d.room === id);
    if (!list.length) devicesEl.append(h('p', 'empty', 'Устройств нет'));
    for (const def of list) {
      const card = deviceCard(home, def);
      cards[def.id] = card;
      devicesEl.append(card.el);
    }
    syncClimate();
    if (focus) actions.focusRoom(id);
  }

  function syncClimate() {
    const c = home.climate[selectedRoom];
    panelClimate.innerHTML = `${ICONS.thermo}<b>${c.temp.toFixed(1)} °C</b><span>влажность ${Math.round(c.hum)}%</span>`;
  }

  function syncRooms() {
    for (const r of home.rooms) {
      const defs = home.devices.filter((d) => d.room === r.id);
      const active = defs.filter((d) => isActive(d, home.state[d.id])).length;
      const alarm = defs.some((d) => isAlarm(d, home.state[d.id]));
      const c = home.climate[r.id];
      const row = roomRows[r.id];
      $('.rr-meta', row).textContent = `${c.temp.toFixed(1)}° · ${active}/${defs.length}`;
      row.classList.toggle('alarm', alarm);
    }
  }

  function addLog(entry) {
    const row = h('div', `log-row log-${entry.level}`, `<time>${entry.time}</time><span>${entry.text}</span>`);
    logEl.prepend(row);
    while (logEl.children.length > 40) logEl.lastChild.remove();
  }

  home.on((e) => {
    if (e.type === 'device') {
      cards[e.id]?.sync(home.state[e.id]);
      syncRooms();
      const def = home.def(e.id);
      if (e.source !== 'rule' && e.source !== 'scene' && e.source !== 'power') home.notify(describe(def, e.state), isAlarm(def, e.state) ? 'alarm' : 'info', e.source);
    }
    if (e.type === 'power') cards[e.id]?.sync(home.state[e.id]);
    if (e.type === 'breaker') syncRooms();
    if (e.type === 'mode') $('#mode').textContent = MODE_NAMES[e.mode];
    if (e.type === 'time') { timeInput.value = e.hours; timeLabel.textContent = fmtHours(e.hours); }
    if (e.type === 'log') addLog(e.entry);
    if (e.type === 'rule') {
      const row = ruleRows[e.rule.id];
      row.classList.remove('fired'); void row.offsetWidth; row.classList.add('fired');
    }
  });

  $('#mode').textContent = MODE_NAMES[home.mode];
  selectRoom(selectedRoom);
  syncRooms();

  return {
    selectRoom,
    selectDevice(id) {
      const def = home.def(id);
      if (def.room !== selectedRoom) selectRoom(def.room);
      const card = cards[id];
      card?.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      card?.el.classList.remove('flash'); void card?.el.offsetWidth; card?.el.classList.add('flash');
    },
    // вызывается раз в секунду
    tick(dt) {
      if (playing) home.setHours((home.hours + dt * 0.25) % 24); // 15 игровых минут в секунду
      syncClimate();
      syncRooms();
    },
    get playing() { return playing; },
  };
}

function describe(def, s) {
  const n = def.name;
  switch (def.type) {
    case 'light': return `${n}: ${s.on ? `вкл, ${s.brightness}%` : 'выкл'}`;
    case 'curtain': return `${n}: ${s.position === 100 ? 'открыты' : s.position === 0 ? 'закрыты' : `${s.position}%`}`;
    case 'ac': return `${n}: ${s.on ? `${s.mode === 'heat' ? 'обогрев' : 'охлаждение'} до ${s.target} °C` : 'выкл'}`;
    case 'heating': return `${n}: ${s.on ? 'вкл' : 'выкл'}`;
    case 'leak': return `${n}: ${s.alarm ? 'ПРОТЕЧКА!' : 'сухо'}`;
    case 'smoke': return `${n}: ${s.alarm ? 'ДЫМ!' : 'норма'}`;
    case 'motion': return `${n}: ${s.active ? 'движение' : 'нет движения'}`;
    case 'contact': return `${n}: ${s.open ? 'открыта' : 'закрыта'}`;
    case 'lock': return `${n}: ${s.locked ? 'закрыт' : 'открыт'}`;
    case 'valve': return `${n}: ${s.open ? 'открыт' : 'перекрыт'}`;
    case 'camera': return `${n}: ${s.recording ? 'запись' : 'ожидание'}`;
    case 'washer': return `${n}: ${s.running ? (def.variant === 'dryer' ? 'сушка' : 'стирка') : 'остановлена'}`;
    case 'vacuum': return `${n}: ${s.running ? 'уборка' : 'на базе'}`;
    default: return `${n}: ${s.on ? 'вкл' : 'выкл'}`;
  }
}

function toggle(label, checked, onChange) {
  const el = h('label', 'switch', `<input type="checkbox"><i></i><span>${label}</span>`);
  const input = $('input', el);
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return { el, set: (v) => { input.checked = v; } };
}

function slider(min, max, value, onInput, suffix = '%') {
  const el = h('div', 'slider', `<input type="range" min="${min}" max="${max}" step="1"><output></output>`);
  const input = $('input', el);
  const out = $('output', el);
  const set = (v) => { input.value = v; out.textContent = `${v}${suffix}`; };
  set(value);
  input.addEventListener('input', () => { out.textContent = `${input.value}${suffix}`; onInput(parseInt(input.value, 10)); });
  return { el, set, input };
}

function deviceCard(home, def) {
  const el = h('div', `device device-${def.type}`);
  const head = h('div', 'device-head', `<span class="device-icon">${ICONS[def.type]}</span><span class="device-name">${def.name}</span><span class="device-status"></span>`);
  el.append(head);
  const body = h('div', 'device-body');
  el.append(body);
  const set = (patch) => home.set(def.id, patch, 'ui');
  const s0 = home.state[def.id];
  const syncers = [];
  const statusEl = $('.device-status', head);

  const addToggle = (label, key, invert = false) => {
    const t = toggle(label, invert ? !s0[key] : s0[key], (v) => set({ [key]: invert ? !v : v }));
    body.append(t.el);
    syncers.push((s) => t.set(invert ? !s[key] : s[key]));
  };
  const addButton = (label, fn) => {
    const b = h('button', 'chip', label);
    b.addEventListener('click', fn);
    body.append(b);
    return b;
  };

  switch (def.type) {
    case 'light': {
      addToggle('Включён', 'on');
      const sl = slider(5, 100, s0.brightness, (v) => set({ brightness: v, on: true }));
      body.append(sl.el);
      syncers.push((s) => { if (document.activeElement !== sl.input) sl.set(s.brightness); });
      break;
    }
    case 'curtain': {
      const sl = slider(0, 100, s0.position, (v) => set({ position: v }));
      body.append(sl.el);
      syncers.push((s) => { if (document.activeElement !== sl.input) sl.set(s.position); });
      addButton('Открыть', () => set({ position: 100 }));
      addButton('Закрыть', () => set({ position: 0 }));
      break;
    }
    case 'ac': {
      addToggle('Включён', 'on');
      const mode = h('div', 'segmented', '<button data-v="cool">Холод</button><button data-v="heat">Тепло</button>');
      mode.addEventListener('click', (e) => { const v = e.target.dataset.v; if (v) set({ mode: v, on: true }); });
      const temp = h('div', 'stepper', '<button data-d="-1">−</button><b></b><button data-d="1">+</button>');
      temp.addEventListener('click', (e) => {
        const d = parseInt(e.target.dataset.d, 10);
        if (d) set({ target: Math.min(30, Math.max(16, home.state[def.id].target + d)) });
      });
      body.append(mode, temp);
      syncers.push((s) => {
        for (const b of mode.children) b.classList.toggle('active', b.dataset.v === s.mode);
        $('b', temp).textContent = `${s.target} °C`;
      });
      break;
    }
    case 'heating': addToggle('Включён', 'on'); break;
    case 'leak': case 'smoke': {
      addButton('Имитировать', () => set({ alarm: true }));
      addButton('Сбросить', () => set({ alarm: false }));
      break;
    }
    case 'motion': {
      addButton('Имитировать движение', () => {
        set({ active: true });
        setTimeout(() => home.set(def.id, { active: false }, 'sim'), 3000);
      });
      break;
    }
    case 'contact': addToggle('Открыта', 'open'); break;
    case 'lock': addToggle('Закрыт', 'locked'); break;
    case 'valve': addToggle('Вода открыта', 'open'); break;
    case 'camera': addToggle('Запись', 'recording'); break;
    case 'tv': addToggle('Включён', 'on'); break;
    case 'washer': addToggle(def.variant === 'dryer' ? 'Сушка' : 'Стирка', 'running'); break;
    case 'vacuum': addToggle('Уборка', 'running'); break;
  }

  const sync = (s) => {
    for (const fn of syncers) fn(s);
    el.classList.toggle('is-on', isActive(def, s));
    el.classList.toggle('is-alarm', isAlarm(def, s));
    const powered = home.powered(def.id);
    el.classList.toggle('no-power', !powered);
    const f = home.feeder(def.id);
    statusEl.textContent = powered
      ? describe(def, s).split(': ').slice(1).join(': ')
      : `нет питания — ${f ? `автомат «${f.title}» ${f.rating}` : 'ввод'} отключён`;
  };
  sync(s0);
  return { el, sync };
}
