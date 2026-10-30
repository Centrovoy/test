import * as THREE from 'three';
import {
  createStage, buildEnvironment, buildShell, buildFurniture, buildRoomLabels,
  applyTimeOfDay, setWallHeight, setView, updateTween,
} from './scene.js';
import { buildDevices, refreshMarker, isAlarm } from './devices.js';
import { createHome, climateTick } from './home.js';
import { createUI } from './ui.js';
import { connectHomeAssistant } from './bridge.js';
import { HA_CONFIG } from './config.js';
import { mx, mz } from './plan.js';

const home = createHome();
const stage = createStage(document.getElementById('viewport'));
const env = buildEnvironment(stage);
const shell = buildShell(stage);
buildFurniture(stage);

let ui;
const devices = buildDevices(stage, home.devices, (id) => ui.selectDevice(id));
const roomLabels = buildRoomLabels(stage, (id) => ui.selectRoom(id, true));

ui = createUI(home, {
  view: (name) => setView(stage, name),
  walls: (hgt) => setWallHeight(shell.walls, hgt),
  focusRoom: (id) => {
    const room = home.rooms.find((r) => r.id === id);
    setView(stage, 'iso', true, [mx(room.label[0]), 0, mz(room.label[1])]);
  },
});

for (const [id, entry] of Object.entries(devices)) {
  entry.impl.apply(home.state[id]);
  refreshMarker(entry, home.state[id]);
}

home.on((e) => {
  if (e.type === 'device') {
    const entry = devices[e.id];
    entry.impl.apply(e.state);
    refreshMarker(entry, e.state);
  }
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
    for (const f of shell.floors[room.id]) f.material.emissiveIntensity = alarm ? 0.25 + 0.2 * Math.sin(t * 5) : 0;
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
