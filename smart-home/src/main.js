import * as THREE from 'three';
import {
  createStage, buildEnvironment, buildShell, buildFurniture, buildRoomLabels,
  applyTimeOfDay, setWallHeight, setView, updateTween,
} from './scene.js';
import { buildDevices, refreshMarker, isAlarm } from './devices.js';
import { createHome, climateTick } from './home.js';
import { createUI } from './ui.js';
import { createPanelUI } from './panelui.js';
import { openInventory } from './inventory.js';
import { createInventoryUI } from './inventoryui.js';
import { PANEL_LOCATION } from './panel.js';
import { ICONS } from './icons.js';
import { boxFromRect, M, CSS2DObject } from './scene.js';
import { connectHomeAssistant } from './bridge.js';
import { HA_CONFIG } from './config.js';
import { mx, mz } from './plan.js';
import { PALETTE } from './palette.js';

const ZONE_COLOR = '#3f8fe0';

const home = createHome();
const stage = createStage(document.getElementById('viewport'));
const env = buildEnvironment(stage);
const shell = buildShell(stage);
buildFurniture(stage);

let ui;
let panelUI;
const devices = buildDevices(stage, home.devices, (id) => ui.selectDevice(id));
const roomLabels = buildRoomLabels(stage, (id) => ui.selectRoom(id, true));

ui = createUI(home, {
  view: (name) => setView(stage, name),
  walls: (hgt) => setWallHeight(shell.walls, hgt),
  focusRoom: (id) => {
    const room = home.rooms.find((r) => r.id === id);
    setView(stage, 'iso', true, [mx(room.label[0]), 0, mz(room.label[1])]);
  },
  trip: (id) => panelUI.trip(id),
});

// ---- электрощиток: корпус на стене прихожей и маркер ----
{
  const L = PANEL_LOCATION;
  const box = boxFromRect(L.r, L.y0, L.y1, M('#f4f3f0', { roughness: 0.4 }));
  const door = boxFromRect([L.r[2], L.r[1] + 2, L.r[2] + 0.6, L.r[3] - 2], L.y0 + 0.05, L.y1 - 0.05, M('#2c3135', { roughness: 0.2, transparent: true, opacity: 0.6 }));
  stage.scene.add(box, door);
  const el = document.createElement('button');
  el.className = 'marker marker-panel';
  el.title = 'Электрощиток';
  el.innerHTML = ICONS.panel;
  el.addEventListener('click', (e) => { e.stopPropagation(); panelUI.open(true); });
  const marker = new CSS2DObject(el);
  marker.position.set(mx((L.r[0] + L.r[2]) / 2) + 0.15, L.y1 + 0.25, mz((L.r[1] + L.r[3]) / 2));
  stage.scene.add(marker);
}

// ---- подсветка линии выбранного автомата ----
const highlight = { rooms: new Set(), pins: [] };
function showCircuit(b) {
  for (const p of highlight.pins) stage.scene.remove(p);
  highlight.pins = [];
  // b — автомат щитка или запись паспорта: { rooms, points }
  highlight.rooms = new Set(b ? (b.kind === 'main' ? home.rooms.map((r) => r.id) : b.rooms) : []);
  if (!b) return;
  for (const [x, y, label] of b.points) {
    const el = document.createElement('div');
    el.className = 'zone-pin';
    el.textContent = label;
    const pin = new CSS2DObject(el);
    pin.position.set(mx(x), 1.0, mz(y));
    stage.scene.add(pin);
    highlight.pins.push(pin);
  }
}
panelUI = createPanelUI(home, { highlight: showCircuit });

// ---- паспорт квартиры ----
let inventoryUI = null;
openInventory().then((store) => {
  inventoryUI = createInventoryUI(home, store, {
    highlight: showCircuit,
    focusRoom: (id) => {
      const room = home.rooms.find((r) => r.id === id);
      setView(stage, 'iso', true, [mx(room.label[0]), 0, mz(room.label[1])]);
    },
  });
});
document.getElementById('room-inventory').addEventListener('click', () => inventoryUI?.open(true, { room: ui.room }));

for (const [id, entry] of Object.entries(devices)) {
  entry.impl.apply(home.state[id]);
  refreshMarker(entry, home.state[id], home.powered(id));
}

home.on((e) => {
  if (e.type === 'device') {
    const entry = devices[e.id];
    entry.impl.apply(e.state);
    refreshMarker(entry, e.state, home.powered(e.id));
  }
  if (e.type === 'power') refreshMarker(devices[e.id], home.state[e.id], home.powered(e.id));
  if (e.type === 'time') applyTimeOfDay(stage, env, e.hours, shell.glass);
});

applyTimeOfDay(stage, env, home.hours, shell.glass);
home.notify('Визуализация запущена. Режим имитации', 'ok');
if (connectHomeAssistant(home, HA_CONFIG)) home.notify('Подключение к Home Assistant…');

// Публичное API для отладки и внешних интеграций:
// window.smartHome.set('light.living', { on: true, brightness: 50 })
window.smartHome = home;

function syncRoomLabels(t) {
  for (const room of home.rooms) {
    const { el } = roomLabels[room.id];
    const c = home.climate[room.id];
    el.querySelector('.room-climate').textContent = `${c.temp.toFixed(1)}°`;
    const alarm = home.devices.some((d) => d.room === room.id && isAlarm(d, home.state[d.id]));
    el.classList.toggle('alarm', alarm);
    const lit = highlight.rooms.has(room.id);
    for (const f of shell.floors[room.id]) {
      f.material.emissive.set(alarm ? PALETTE.alarm : ZONE_COLOR);
      f.material.emissiveIntensity = alarm ? 0.25 + 0.2 * Math.sin(t * 5) : lit ? 0.28 + 0.08 * Math.sin(t * 3) : 0;
    }
  }
}

const clock = new THREE.Clock();
let secAcc = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  updateTween(stage, dt);
  stage.controls.update();
  for (const [id, entry] of Object.entries(devices)) entry.impl.tick?.(dt, home.state[id], t);
  secAcc += dt;
  if (secAcc >= 1) {
    climateTick(home, secAcc);
    ui.tick(secAcc);
    secAcc = 0;
  }
  syncRoomLabels(t);
  stage.renderer.render(stage.scene, stage.camera);
  stage.labels.render(stage.scene, stage.camera);
  requestAnimationFrame(frame);
}
frame();
