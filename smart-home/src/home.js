// Состояние дома, сценарии и правила автоматизации.
import { DEVICES, ROOMS } from './plan.js';
import { DEFAULT_STATE } from './devices.js';
import { BREAKERS } from './panel.js';

// Что происходит с устройством, когда пропадает питание.
const POWER_OFF = {
  light: { on: false }, ac: { on: false }, tv: { on: false }, heating: { on: false },
  washer: { running: false }, camera: { recording: false },
};
const MAINS = BREAKERS.filter((b) => b.kind === 'main').map((b) => b.id);

export function createHome() {
  const listeners = new Set();
  const state = {};
  for (const d of DEVICES) state[d.id] = structuredClone(DEFAULT_STATE[d.type]);
  const climate = Object.fromEntries(ROOMS.map((r) => [r.id, { temp: r.temp, hum: r.hum }]));

  const home = {
    devices: DEVICES,
    rooms: ROOMS,
    state,
    climate,
    breakers: Object.fromEntries(BREAKERS.map((b) => [b.id, true])),
    mode: 'home',   // home | away | night
    hours: 13,
    log: [],

    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit(evt) { for (const fn of listeners) fn(evt); },

    get(id) { return state[id]; },
    def(id) { return DEVICES.find((d) => d.id === id); },

    // Автомат, от которого питается устройство (если он подписан на щитке).
    feeder(id) {
      return BREAKERS.find((b) => b.kind !== 'main' && b.devices.includes(id));
    },

    // Есть ли питание: включены оба вводных и автомат линии.
    powered(id) {
      if (MAINS.some((m) => !home.breakers[m])) return false;
      const f = home.feeder(id);
      return !f || home.breakers[f.id];
    },

    // Включить или отключить автомат. source: 'ui' | 'trip' (срабатывание) | 'rule'
    setBreaker(id, on, source = 'ui') {
      if (home.breakers[id] === on) return;
      home.breakers[id] = on;
      const b = BREAKERS.find((x) => x.id === id);
      if (!on) {
        for (const d of DEVICES) {
          if (!home.powered(d.id) && POWER_OFF[d.type]) home.set(d.id, POWER_OFF[d.type], 'power');
        }
      }
      home.emit({ type: 'breaker', id, on, source });
      for (const d of DEVICES) home.emit({ type: 'power', id: d.id });
      if (source !== 'trip') home.notify(`Щиток: ${b.title} (${b.rating}) — ${on ? 'включён' : 'отключён'}`, on ? 'ok' : 'info', source);
      runRules(home, { type: 'breaker', id, on, source, breaker: b });
    },

    // Единая точка изменения состояния. source: 'ui' | 'scene' | 'rule' | 'sim' | 'bridge' | 'power'
    set(id, patch, source = 'ui') {
      const prev = state[id];
      if (!prev) return;
      // без питания устройство не принимает команды (кроме отключения при обесточивании)
      if (source !== 'power' && source !== 'bridge' && !home.powered(id) && POWER_OFF[home.def(id)?.type]) return;
      const next = { ...prev, ...patch };
      if (JSON.stringify(prev) === JSON.stringify(next)) return;
      state[id] = next;
      home.emit({ type: 'device', id, prev, state: next, source });
      runRules(home, { type: 'device', id, prev, state: next, source });
    },

    setMode(mode, source = 'ui') {
      if (home.mode === mode) return;
      home.mode = mode;
      home.emit({ type: 'mode', mode, source });
    },

    setHours(h) {
      const prev = home.hours;
      home.hours = h;
      home.emit({ type: 'time', hours: h });
      runRules(home, { type: 'time', prev, hours: h });
    },

    notify(text, level = 'info', source = 'system') {
      const now = new Date();
      const entry = { text, level, source, time: now.toTimeString().slice(0, 8) };
      home.log.unshift(entry);
      home.log.length = Math.min(home.log.length, 60);
      home.emit({ type: 'log', entry });
    },

    runScene(id) {
      const sc = SCENES.find((s) => s.id === id);
      if (!sc) return;
      sc.run(home);
      home.notify(`Сценарий «${sc.name}» выполнен`, 'scene', 'scene');
    },
  };
  return home;
}

// ---------- сценарии ----------

const LIGHTS = DEVICES.filter((d) => d.type === 'light').map((d) => d.id);
const CURTAINS = DEVICES.filter((d) => d.type === 'curtain').map((d) => d.id);
const ACS = DEVICES.filter((d) => d.type === 'ac').map((d) => d.id);

const allLights = (home, patch) => LIGHTS.forEach((id) => home.set(id, patch, 'scene'));
const allCurtains = (home, position) => CURTAINS.forEach((id) => home.set(id, { position }, 'scene'));

export const SCENES = [
  {
    id: 'morning', name: 'Утро', hint: 'Шторы открыть, свет на кухне, тёплый пол',
    run(h) {
      h.setMode('home', 'scene');
      allCurtains(h, 100);
      h.set('light.kitchen', { on: true, brightness: 80 }, 'scene');
      h.set('light.bedroom', { on: true, brightness: 35 }, 'scene');
      h.set('light.bath', { on: true, brightness: 100 }, 'scene');
      h.set('heating.bath', { on: true }, 'scene');
    },
  },
  {
    id: 'away', name: 'Ухожу', hint: 'Всё выключить, замок, охрана, уборка',
    run(h) {
      allLights(h, { on: false });
      ACS.forEach((id) => h.set(id, { on: false }, 'scene'));
      h.set('tv.bedroom', { on: false }, 'scene');
      h.set('heating.bath', { on: false }, 'scene');
      h.set('door.entrance', { open: false }, 'scene');
      h.set('lock.entrance', { locked: true }, 'scene');
      h.set('camera.entrance', { recording: true }, 'scene');
      h.set('vacuum', { running: true }, 'scene');
      h.setMode('away', 'scene');
    },
  },
  {
    id: 'return', name: 'Я дома', hint: 'Свет в прихожей и гостиной, снять охрану',
    run(h) {
      h.setMode('home', 'scene');
      h.set('camera.entrance', { recording: false }, 'scene');
      h.set('vacuum', { running: false }, 'scene');
      h.set('light.hall', { on: true, brightness: 90 }, 'scene');
      h.set('light.living', { on: true, brightness: 70 }, 'scene');
      h.set('light.corridor', { on: true, brightness: 50 }, 'scene');
    },
  },
  {
    id: 'movie', name: 'Кино', hint: 'Спальня: шторы, приглушённый свет, ТВ',
    run(h) {
      h.set('curtain.bedroom', { position: 0 }, 'scene');
      h.set('light.bedroom', { on: false }, 'scene');
      h.set('light.bedside', { on: true, brightness: 15 }, 'scene');
      h.set('light.living', { on: false }, 'scene');
      h.set('light.kitchen', { on: false }, 'scene');
      h.set('light.dining', { on: false }, 'scene');
      h.set('tv.bedroom', { on: true }, 'scene');
    },
  },
  {
    id: 'night', name: 'Ночь', hint: 'Шторы закрыть, свет выкл., замок, 22 °C в спальне',
    run(h) {
      allLights(h, { on: false });
      allCurtains(h, 0);
      h.set('tv.bedroom', { on: false }, 'scene');
      h.set('lock.entrance', { locked: true }, 'scene');
      h.set('ac.bedroom', { on: true, mode: 'cool', target: 22 }, 'scene');
      h.setMode('night', 'scene');
    },
  },
  {
    id: 'evening', name: 'Вечер', hint: 'Тёплый свет в жилых комнатах',
    run(h) {
      h.setMode('home', 'scene');
      for (const [id, b] of [['light.living', 60], ['light.kitchen', 70], ['light.dining', 80], ['light.corridor', 40], ['light.hall', 50], ['light.kids', 70], ['light.bedside', 50]]) {
        h.set(id, { on: true, brightness: b }, 'scene');
      }
    },
  },
];

// ---------- правила автоматизации ----------
// Каждое правило: when(event, home) → bool, then(home, event). Можно отключать в UI.

const isNight = (h) => h.hours >= 22 || h.hours < 7;
const motionTimers = {};

export const RULES = [
  {
    id: 'leak', name: 'Протечка → перекрыть воду',
    desc: 'Любой датчик протечки перекрывает кран и шлёт уведомление',
    enabled: true,
    when: (e, h) => e.type === 'device' && h.def(e.id)?.type === 'leak' && e.state.alarm && !e.prev.alarm,
    then(h, e) {
      h.set('valve.water', { open: false }, 'rule');
      h.set('washer.bath', { running: false }, 'rule');
      h.notify(`Протечка: ${roomName(h, e.id)}. Кран воды перекрыт`, 'alarm', 'rule');
    },
  },
  {
    id: 'smoke', name: 'Дым → свет, шторы, отключить климат',
    desc: 'Датчик дыма включает весь свет, открывает шторы и выключает кондиционеры',
    enabled: true,
    when: (e, h) => e.type === 'device' && h.def(e.id)?.type === 'smoke' && e.state.alarm && !e.prev.alarm,
    then(h) {
      allLights(h, { on: true, brightness: 100 });
      CURTAINS.forEach((id) => h.set(id, { position: 100 }, 'rule'));
      ACS.forEach((id) => h.set(id, { on: false }, 'rule'));
      h.set('lock.entrance', { locked: false }, 'rule');
      h.notify('Обнаружен дым на кухне! Замок открыт для эвакуации', 'alarm', 'rule');
    },
  },
  {
    id: 'motion-light', name: 'Движение → свет',
    desc: 'В коридоре и прихожей свет по движению (ночью — 15%), гаснет через 20 с',
    enabled: true,
    when: (e, h) => e.type === 'device' && h.def(e.id)?.type === 'motion' && h.mode !== 'away',
    then(h, e) {
      const light = e.id === 'motion.hall' ? 'light.hall' : 'light.corridor';
      clearTimeout(motionTimers[light]);
      if (e.state.active) {
        h.set(light, { on: true, brightness: isNight(h) ? 15 : 90 }, 'rule');
      } else {
        motionTimers[light] = setTimeout(() => h.set(light, { on: false }, 'rule'), 20000);
      }
    },
  },
  {
    id: 'security', name: 'Охрана: дверь или движение',
    desc: 'В режиме «Не дома» открытие двери или движение — тревога и запись камеры',
    enabled: true,
    when: (e, h) => h.mode === 'away' && e.type === 'device' &&
      ((e.id === 'door.entrance' && e.state.open) || (h.def(e.id)?.type === 'motion' && e.state.active)),
    then(h, e) {
      h.set('camera.entrance', { recording: true }, 'rule');
      h.set('light.hall', { on: true, brightness: 100 }, 'rule');
      h.notify(`Охрана: ${h.def(e.id).name.toLowerCase()} — сработка! Идёт запись`, 'alarm', 'rule');
    },
  },
  {
    id: 'unlock-hall', name: 'Замок открыт → свет в прихожей',
    desc: 'При открытии замка вечером включается свет в прихожей',
    enabled: true,
    when: (e, h) => e.type === 'device' && e.id === 'lock.entrance' && !e.state.locked && e.prev.locked && (h.hours >= 17 || h.hours < 8),
    then(h) { h.set('light.hall', { on: true, brightness: 80 }, 'rule'); },
  },
  {
    id: 'sunset', name: 'Закат → закрыть шторы',
    desc: 'В 20:00 шторы закрываются, в 7:00 — открываются',
    enabled: true,
    when: (e) => e.type === 'time' && (crossed(e.prev, e.hours, 20) || crossed(e.prev, e.hours, 7)),
    then(h, e) {
      const open = crossed(e.prev, e.hours, 7);
      CURTAINS.forEach((id) => h.set(id, { position: open ? 100 : 0 }, 'rule'));
      h.notify(open ? 'Рассвет: шторы открыты' : 'Закат: шторы закрыты', 'info', 'rule');
    },
  },
  {
    id: 'breaker-trip', name: 'Сработал автомат → уведомление',
    desc: 'При срабатывании дифавтомата — тревога с названием линии; если сработала линия ванной, стирка останавливается',
    enabled: true,
    when: (e) => e.type === 'breaker' && !e.on && e.source === 'trip',
    then(h, e) {
      const what = e.breaker.kind === 'rcbo' ? 'Дифавтомат (утечка тока)' : 'Автомат';
      h.notify(`${what}: «${e.breaker.title}» ${e.breaker.rating} отключился`, 'alarm', 'rule');
    },
  },
  {
    id: 'bedroom-climate', name: 'Жарко в спальне → кондиционер',
    desc: 'Если в спальне выше 25 °C — кондиционер на 23 °C',
    enabled: true,
    when: (e, h) => e.type === 'climate' && e.room === 'bedroom' && h.climate.bedroom.temp > 25 && !h.get('ac.bedroom').on,
    then(h) {
      h.set('ac.bedroom', { on: true, mode: 'cool', target: 23 }, 'rule');
      h.notify('В спальне выше 25 °C — включён кондиционер', 'info', 'rule');
    },
  },
];

// Время «прошло» через отметку mark при движении вперёд (с учётом перехода через полночь).
function crossed(a, b, mark) {
  if (b >= a) return a < mark && mark <= b;
  if (a - b < 12) return false; // слайдер сдвинули назад
  return mark > a || mark <= b;
}

function roomName(h, deviceId) {
  const d = h.def(deviceId);
  return h.rooms.find((r) => r.id === d.room)?.name.toLowerCase() || '';
}

export function runRules(home, event) {
  for (const rule of RULES) {
    if (!rule.enabled) continue;
    let ok = false;
    try { ok = rule.when(event, home); } catch { ok = false; }
    if (ok) {
      home.emit({ type: 'rule', rule });
      rule.then(home, event);
    }
  }
}

// ---------- имитация климата ----------
// Медленная физика: кондиционер тянет температуру к уставке, тёплый пол греет ванную,
// без них комната стремится к «наружной» (днём теплее).
export function climateTick(home, dt) {
  for (const room of home.rooms) {
    const c = home.climate[room.id];
    const ac = home.devices.find((d) => d.type === 'ac' && d.room === room.id);
    const heat = home.devices.find((d) => d.type === 'heating' && d.room === room.id);
    let target = room.temp + 1.5 * Math.sin(((home.hours - 9) / 24) * Math.PI * 2);
    let rate = 0.004;
    if (ac && home.state[ac.id].on) { target = home.state[ac.id].target; rate = 0.03; }
    if (heat && home.state[heat.id].on) { target = Math.max(target, 26.5); rate = 0.02; }
    const prev = c.temp;
    c.temp += (target - c.temp) * rate * dt;
    if (Math.abs(prev - c.temp) > 0.0005) runRules(home, { type: 'climate', room: room.id });
  }
}
