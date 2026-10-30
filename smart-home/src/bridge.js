// Мост к Home Assistant (WebSocket API).
// Включается, если в config.js указаны url и token. Без них визуализация
// работает автономно, в режиме имитации.
//
// Связь «устройство визуализации ↔ entity_id» задаётся в config.js → entities.
// Из HA приходят state_changed и обновляют 3D-сцену; действия в интерфейсе
// превращаются в вызовы сервисов HA.

const toLocal = {
  light: (s) => ({ on: s.state === 'on', brightness: s.attributes.brightness ? Math.round((s.attributes.brightness / 255) * 100) : 80 }),
  curtain: (s) => ({ position: s.attributes.current_position ?? (s.state === 'open' ? 100 : 0) }),
  ac: (s) => ({ on: s.state !== 'off', mode: s.state === 'heat' ? 'heat' : 'cool', target: s.attributes.temperature ?? 22 }),
  heating: (s) => ({ on: s.state === 'on' || s.state === 'heat' }),
  leak: (s) => ({ alarm: s.state === 'on' }),
  smoke: (s) => ({ alarm: s.state === 'on' }),
  motion: (s) => ({ active: s.state === 'on' }),
  contact: (s) => ({ open: s.state === 'on' }),
  lock: (s) => ({ locked: s.state === 'locked' }),
  valve: (s) => ({ open: s.state === 'on' || s.state === 'open' }),
  camera: (s) => ({ recording: s.state === 'recording' }),
  tv: (s) => ({ on: s.state !== 'off' && s.state !== 'unavailable' }),
  washer: (s) => ({ running: s.state === 'on' }),
  vacuum: (s) => ({ running: s.state === 'cleaning' }),
};

function toService(type, entity, s) {
  const target = { entity_id: entity };
  switch (type) {
    case 'light': return s.on
      ? ['light', 'turn_on', { ...target, brightness_pct: s.brightness }]
      : ['light', 'turn_off', target];
    case 'curtain': return ['cover', 'set_cover_position', { ...target, position: s.position }];
    case 'ac': return s.on
      ? ['climate', 'set_temperature', { ...target, temperature: s.target, hvac_mode: s.mode }]
      : ['climate', 'turn_off', target];
    case 'lock': return ['lock', s.locked ? 'lock' : 'unlock', target];
    case 'valve': return ['switch', s.open ? 'turn_on' : 'turn_off', target];
    case 'vacuum': return ['vacuum', s.running ? 'start' : 'return_to_base', target];
    case 'tv': return ['media_player', s.on ? 'turn_on' : 'turn_off', target];
    case 'heating': case 'washer': return ['switch', (s.on ?? s.running) ? 'turn_on' : 'turn_off', target];
    default: return null; // датчики только читаются
  }
}

export function connectHomeAssistant(home, config) {
  if (!config?.url || !config?.token) return null;
  const byEntity = {};
  for (const [id, entity] of Object.entries(config.entities || {})) byEntity[entity] = id;

  let ws;
  let msgId = 1;
  const send = (msg) => ws?.readyState === 1 && ws.send(JSON.stringify({ id: msgId++, ...msg }));

  const apply = (entity, haState) => {
    const id = byEntity[entity];
    const def = id && home.def(id);
    if (!def || !haState) return;
    home.set(id, toLocal[def.type](haState), 'bridge');
  };

  const open = () => {
    ws = new WebSocket(config.url.replace(/^http/, 'ws') + '/api/websocket');
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'auth_required') ws.send(JSON.stringify({ type: 'auth', access_token: config.token }));
      else if (msg.type === 'auth_ok') {
        home.notify('Подключено к Home Assistant', 'ok', 'bridge');
        send({ type: 'get_states' });
        send({ type: 'subscribe_events', event_type: 'state_changed' });
      } else if (msg.type === 'auth_invalid') {
        home.notify('Home Assistant: неверный токен', 'alarm', 'bridge');
      } else if (msg.type === 'result' && Array.isArray(msg.result)) {
        for (const s of msg.result) apply(s.entity_id, s);
      } else if (msg.type === 'event') {
        const d = msg.event.data;
        apply(d.entity_id, d.new_state);
      }
    };
    ws.onclose = () => setTimeout(open, 5000);
  };
  open();

  // Действия пользователя → сервисы HA
  home.on((e) => {
    if (e.type !== 'device' || e.source === 'bridge' || e.source === 'sim') return;
    const entity = config.entities?.[e.id];
    const def = home.def(e.id);
    const call = entity && toService(def.type, entity, e.state);
    if (call) send({ type: 'call_service', domain: call[0], service: call[1], service_data: call[2] });
  });

  return { close: () => ws?.close() };
}
