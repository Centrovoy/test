import * as THREE from 'three';
import { PALETTE as P } from './palette.js';
import { CEILING, PX_PER_M, VACUUM_PATH, mx, mz } from './plan.js';
import { M, boxFromRect, CSS2DObject } from './scene.js';
import { ICONS } from './icons.js';

export const DEFAULT_STATE = {
  light: { on: false, brightness: 80 },
  curtain: { position: 100 },
  ac: { on: false, mode: 'cool', target: 22 },
  heating: { on: false, target: 27 },
  leak: { alarm: false },
  smoke: { alarm: false },
  motion: { active: false },
  contact: { open: false },
  lock: { locked: true },
  valve: { open: true },
  camera: { recording: false },
  tv: { on: false },
  washer: { running: false },
  vacuum: { running: false },
};

// Активно ли устройство (для подсветки маркера и счётчиков).
export function isActive(def, s) {
  switch (def.type) {
    case 'light': case 'ac': case 'heating': case 'tv': return s.on;
    case 'curtain': return s.position < 100;
    case 'washer': case 'vacuum': return s.running;
    case 'camera': return s.recording;
    case 'motion': return s.active;
    case 'contact': return s.open;
    case 'lock': return !s.locked;
    case 'valve': return !s.open;
    default: return false;
  }
}

export function isAlarm(def, s) {
  return (def.type === 'leak' || def.type === 'smoke') && s.alarm;
}

const at = (def, y = 0) => new THREE.Vector3(mx(def.at[0]), y, mz(def.at[1]));

function pulseRing(color, radius) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.82, radius, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

function emissive(color, intensity = 0) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}

// ---------- построители устройств ----------

const build = {
  light(def) {
    // Светильники как на фото: хрустальная люстра с золотым кольцом (гостиная),
    // золотое кольцо (спальни), стеклянные шары на золотых подвесах (столовая),
    // встроенные споты (остальные помещения).
    const g = new THREE.Group();
    const goldMat = M(P.gold, { metalness: 0.85, roughness: 0.3 });
    const glowMat = emissive(P.lightWarm, 0);
    const style = def.pendant ? 'pendant' : def.style || 'spot';
    let y = CEILING - 0.02;
    if (style === 'chandelier') {
      y = 2.05;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 40, 1, true), goldMat);
      ring.material.side = THREE.DoubleSide;
      ring.position.y = y + 0.1;
      const crystals = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.3, 40, 1, true), glowMat);
      crystals.material.side = THREE.DoubleSide;
      crystals.position.y = y - 0.05;
      g.add(ring, crystals);
    } else if (style === 'ring') {
      y = 2.2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 10, 48), glowMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.012, 8, 48), goldMat);
      ring2.rotation.x = Math.PI / 2.6;
      ring2.position.y = y + 0.05;
      g.add(ring, ring2);
    } else if (style === 'pendant') {
      y = 1.6;
      for (const [dx, dz, s] of [[-0.35, 0, 0.13], [0.35, 0.05, 0.13], [-0.2, 0.12, 0.08], [0.18, -0.1, 0.09]]) {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(s, 20, 14), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, roughness: 0.05 }));
        ball.position.set(dx, y, dz);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), glowMat);
        bulb.position.copy(ball.position);
        g.add(ball, bulb);
      }
      for (const dx of [-0.35, 0.35]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, CEILING - y), goldMat);
        rod.position.set(dx, (CEILING + y) / 2 + 0.06, 0);
        g.add(rod);
      }
    } else {
      // три встроенных спота
      for (const dx of [-0.5, 0, 0.5]) {
        const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), glowMat);
        spot.position.set(dx, y, 0);
        g.add(spot);
      }
    }
    const lamp = new THREE.PointLight(P.lightWarm, 0, 7.5, 1.6);
    lamp.position.set(0, style === 'spot' ? CEILING - 0.35 : y - 0.15, 0);
    g.add(lamp);
    g.position.copy(at(def));
    return {
      group: g,
      markerY: y + 0.3,
      apply(s) {
        const k = s.on ? s.brightness / 100 : 0;
        lamp.intensity = 7 * k;
        glowMat.emissiveIntensity = 2.2 * k;
        glowMat.color.set(s.on ? P.lightWarm : '#e9e6e0');
      },
    };
  },

  curtain(def) {
    const g = new THREE.Group();
    const [x1, z1, x2, z2] = def.r;
    const len = (z2 - z1) / PX_PER_M;
    const geo = new THREE.BoxGeometry(0.06, 2.4, 1);
    const mat = M(P[def.color || 'curtain'], { roughness: 0.75, metalness: def.color ? 0 : 0.15 });
    const left = new THREE.Mesh(geo, mat);
    const right = new THREE.Mesh(geo, mat);
    for (const m of [left, right]) { m.castShadow = true; m.position.y = 1.3; }
    const rail = boxFromRect([x1, z1, x2, z2], 2.52, 2.55, M(P.metal));
    g.add(left, right, rail);
    const cx = mx((x1 + x2) / 2);
    const zA = mz(z1), zB = mz(z2);
    let cur = 1;
    return {
      group: g,
      markerPos: new THREE.Vector3(cx, 2.3, (zA + zB) / 2),
      apply() {},
      tick(dt, s) {
        const target = s.position / 100;
        cur += (target - cur) * Math.min(1, dt * 2.5);
        const w = Math.max(0.15, (len / 2) * (1 - cur) + 0.15);
        left.scale.z = w; right.scale.z = w;
        left.position.set(cx, 1.3, zA + w / 2);
        right.position.set(cx, 1.3, zB - w / 2);
      },
    };
  },

  ac(def) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.22), M('#fbfbfa', { roughness: 0.3 }));
    body.castShadow = true;
    const ledMat = emissive(P.cool, 0);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.01), ledMat);
    led.position.set(0, -0.06, 0.115);
    g.add(body, led);
    // «поток воздуха» — полупрозрачные ленты, уходящие от блока
    const waves = [];
    const waveMat = new THREE.MeshBasicMaterial({ color: P.cool, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.12), waveMat.clone());
      w.rotation.x = -Math.PI / 3;
      g.add(w);
      waves.push(w);
    }
    g.position.copy(at(def, 2.35));
    if (def.face === 's') g.position.z += 0.13;
    if (def.face === 'w') { g.rotation.y = -Math.PI / 2; g.position.x -= 0.13; }
    let phase = 0;
    return {
      group: g,
      markerY: 2.75,
      apply(s) {
        const c = s.mode === 'heat' ? P.heat : P.cool;
        ledMat.color.set(c); ledMat.emissive.set(c);
        ledMat.emissiveIntensity = s.on ? 2 : 0;
        for (const w of waves) w.material.color.set(c);
      },
      tick(dt, s) {
        phase = (phase + dt * 0.6) % 1;
        waves.forEach((w, i) => {
          const p = (phase + i / waves.length) % 1;
          w.position.set(0, -0.2 - p * 0.9, 0.2 + p * 1.2);
          w.scale.x = 1 + p * 0.8;
          w.material.opacity = s.on ? 0.35 * (1 - p) : 0;
        });
      },
    };
  },

  heating(def) {
    const mat = new THREE.MeshBasicMaterial({ color: P.heat, transparent: true, opacity: 0, depthWrite: false });
    const m = boxFromRect(def.r, 0.002, 0.006, mat);
    m.castShadow = false;
    const [x1, z1, x2, z2] = def.r;
    return {
      group: m,
      markerPos: new THREE.Vector3(mx((x1 + x2) / 2), 0.3, mz((z1 + z2) / 2)),
      apply() {},
      tick(dt, s, t) { mat.opacity = s.on ? 0.22 + 0.08 * Math.sin(t * 2) : 0; },
    };
  },

  leak(def) {
    const g = new THREE.Group();
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 20), M('#ffffff'));
    puck.position.y = 0.0125;
    const puddleMat = new THREE.MeshStandardMaterial({ color: P.water, transparent: true, opacity: 0.55, roughness: 0.05 });
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 40), puddleMat);
    puddle.rotation.x = -Math.PI / 2; puddle.position.y = 0.004; puddle.scale.setScalar(0.001);
    const ring = pulseRing(P.alarm, 0.5);
    ring.position.y = 0.01;
    g.add(puck, puddle, ring);
    g.position.copy(at(def));
    return {
      group: g,
      markerY: 0.45,
      apply() {},
      tick(dt, s, t) {
        const target = s.alarm ? 0.45 : 0.001;
        puddle.scale.setScalar(THREE.MathUtils.lerp(puddle.scale.x, target, Math.min(1, dt * 1.5)));
        const p = (t * 0.8) % 1;
        ring.scale.setScalar(0.3 + p * 1.4);
        ring.material.opacity = s.alarm ? 0.9 * (1 - p) : 0;
      },
    };
  },

  smoke(def) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 24), M('#ffffff'));
    body.position.y = CEILING - 0.03;
    const ledMat = emissive(P.alarm, 0);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.015), ledMat);
    led.position.y = CEILING - 0.06;
    const puffs = [];
    const puffMat = new THREE.MeshStandardMaterial({ color: '#8d8d8d', transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < 10; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), puffMat.clone());
      p.userData.seed = Math.random();
      g.add(p); puffs.push(p);
    }
    const ring = pulseRing(P.alarm, 0.8);
    ring.position.y = 0.01;
    g.add(body, led, ring);
    g.position.copy(at(def));
    // точка возгорания — варочная панель
    const src = new THREE.Vector3(mx(920), 0.95, mz(140)).sub(g.position);
    return {
      group: g,
      markerY: CEILING + 0.15,
      apply() {},
      tick(dt, s, t) {
        ledMat.emissiveIntensity = s.alarm ? (Math.sin(t * 10) > 0 ? 3 : 0) : 0;
        const p = (t * 0.8) % 1;
        ring.scale.setScalar(0.3 + p * 1.4);
        ring.material.opacity = s.alarm ? 0.9 * (1 - p) : 0;
        puffs.forEach((m) => {
          const k = (t * 0.25 + m.userData.seed) % 1;
          m.position.set(src.x + Math.sin(m.userData.seed * 20 + t) * 0.4 * k + 0.3 * k * 3, src.y + k * 1.6, src.z + Math.cos(m.userData.seed * 13) * 0.4 * k);
          m.scale.setScalar(0.4 + k * 1.6);
          m.material.opacity = s.alarm ? 0.35 * Math.sin(Math.PI * k) : 0;
        });
      },
    };
  },

  motion(def) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.06), M('#ffffff'));
    body.position.y = 2.3;
    const coneMat = new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.3, 32, 1, true), coneMat);
    cone.position.y = 1.15;
    g.add(body, cone);
    g.position.copy(at(def));
    return {
      group: g,
      markerY: 2.6,
      apply() {},
      tick(dt, s, t) { coneMat.opacity = s.active ? 0.14 + 0.06 * Math.sin(t * 6) : 0; },
    };
  },

  contact(def) {
    // полотно входной двери с петлёй у верхнего края проёма
    const pivot = new THREE.Group();
    const leafLen = (690 - 615) / PX_PER_M;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.08, leafLen), M(P.cabinet, { roughness: 0.5 }));
    leaf.position.set(0, 1.04, leafLen / 2);
    leaf.castShadow = true;
    pivot.add(leaf);
    pivot.position.set(mx(708), 0, mz(615));
    let cur = 0;
    return {
      group: pivot,
      markerPos: new THREE.Vector3(mx(700), 2.3, mz(652)),
      apply() {},
      tick(dt, s) {
        const target = s.open ? -Math.PI * 0.5 : 0;
        cur += (target - cur) * Math.min(1, dt * 3);
        pivot.rotation.y = cur;
      },
    };
  },

  lock(def) {
    const ledMat = emissive(P.ok, 1.5);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.06), ledMat);
    m.position.copy(at(def, 1.05));
    return {
      group: m,
      markerY: 1.5,
      apply(s) {
        const c = s.locked ? P.ok : P.alarm;
        ledMat.color.set(c); ledMat.emissive.set(c);
      },
    };
  },

  valve(def) {
    const g = new THREE.Group();
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 12), M(P.metal, { metalness: 0.8, roughness: 0.3 }));
    pipe.rotation.z = Math.PI / 2;
    const leverMat = emissive(P.ok, 0.6);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.04), leverMat);
    lever.position.y = 0.06;
    g.add(pipe, lever);
    g.position.copy(at(def, 0.35));
    return {
      group: g,
      markerY: 0.8,
      apply(s) {
        lever.rotation.y = s.open ? 0 : Math.PI / 2;
        const c = s.open ? P.ok : P.alarm;
        leverMat.color.set(c); leverMat.emissive.set(c);
      },
    };
  },

  camera(def) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.16), M('#ffffff'));
    const ledMat = emissive(P.alarm, 0);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.015), ledMat);
    led.position.set(0, 0.03, -0.09);
    const fovMat = new THREE.MeshBasicMaterial({ color: '#7cc4ff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const fov = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 4, 1, true), fovMat);
    fov.rotation.x = -Math.PI / 2 - 0.5;
    fov.position.set(0, -0.5, -1.0);
    const aim = new THREE.Group();
    aim.add(body, led, fov);
    aim.rotation.y = -0.6;
    g.add(aim);
    g.position.copy(at(def, 2.45));
    return {
      group: g,
      markerY: 2.75,
      apply() {},
      tick(dt, s, t) {
        ledMat.emissiveIntensity = s.recording && Math.sin(t * 5) > 0 ? 3 : 0;
        fovMat.opacity = s.recording ? 0.12 : 0;
      },
    };
  },

  tv(def) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.84, 0.04), M(P.dark, { roughness: 0.3 }));
    const screenMat = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#4a7bd1', emissiveIntensity: 0, roughness: 0.2 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.39, 0.78), screenMat);
    screen.rotation.y = Math.PI;
    screen.position.z = -0.021;
    const glow = new THREE.PointLight('#7aa7ff', 0, 4, 2);
    glow.position.set(0, 0, -0.6);
    g.add(frame, screen, glow);
    g.position.set(mx(def.at[0]), 1.2, mz(477) - 0.03);
    return {
      group: g,
      markerY: 0.75,
      apply() {},
      tick(dt, s, t) {
        const k = s.on ? 1 : 0;
        screenMat.emissive.setHSL((0.6 + 0.1 * Math.sin(t * 0.7)) % 1, 0.6, 0.5);
        screenMat.emissiveIntensity = 1.6 * k;
        glow.intensity = 1.5 * k * (0.8 + 0.2 * Math.sin(t * 3));
      },
    };
  },

  washer(def) {
    const g = new THREE.Group();
    const drumMat = emissive(P.water, 0);
    const drum = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 10, 30), drumMat);
    const glassDisc = new THREE.Mesh(new THREE.CircleGeometry(0.13, 30), new THREE.MeshStandardMaterial({ color: '#2b3a44', roughness: 0.1 }));
    glassDisc.position.z = -0.001;
    const spin = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.005), M('#c9d6de'));
    spin.add(blade);
    g.add(drum, glassDisc, spin);
    g.position.set(mx(def.at[0]), 0.45, mz(105) + 0.01);
    return {
      group: g,
      markerY: 2.1 - 0.45,
      apply() {},
      tick(dt, s) {
        drumMat.emissiveIntensity = s.running ? 1.4 : 0;
        if (s.running) spin.rotation.z += dt * 12;
      },
    };
  },

  vacuum(def) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.09, 32), M('#f7f7f5', { roughness: 0.3 }));
    body.position.y = 0.05; body.castShadow = true;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 20), M(P.dark));
    top.position.set(0, 0.1, -0.06);
    const ledMat = emissive(P.ok, 0);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.01), ledMat);
    led.position.set(0, 0.07, -0.17);
    g.add(body, top, led);
    const dock = boxFromRect([748, 326, 772, 334], 0, 0.12, M(P.dark));
    const pts = VACUUM_PATH.map(([x, y]) => new THREE.Vector3(mx(x), 0, mz(y)));
    const lens = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); lens.push(l); total += l; }
    let dist = 0;
    const root = new THREE.Group();
    root.add(g, dock);
    g.position.copy(pts[0]);
    const pointAt = (d) => {
      let acc = 0;
      for (let i = 0; i < lens.length; i++) {
        if (acc + lens[i] >= d) return { p: pts[i].clone().lerp(pts[i + 1], (d - acc) / lens[i]), dir: pts[i + 1].clone().sub(pts[i]) };
        acc += lens[i];
      }
      return { p: pts[0].clone(), dir: new THREE.Vector3(1, 0, 0) };
    };
    return {
      group: root,
      follow: g,
      markerY: 0.45,
      apply() {},
      tick(dt, s) {
        ledMat.emissiveIntensity = s.running ? 2 : 0;
        // в работе — едет по маршруту, при остановке — возвращается на базу по маршруту
        const atDock = dist < 0.01 || dist > total - 0.01;
        if (s.running || !atDock) {
          dist = (dist + dt * 0.45) % total;
          if (!s.running && dist > total - 0.02) dist = 0;
          const { p, dir } = pointAt(dist);
          g.position.copy(p);
          g.rotation.y = Math.atan2(dir.x, dir.z);
        }
      },
    };
  },
};

// Создаёт 3D-объекты и маркеры для всех устройств.
export function buildDevices(stage, defs, onMarkerClick) {
  const map = {};
  for (const def of defs) {
    const impl = build[def.type](def);
    stage.scene.add(impl.group);

    const el = document.createElement('button');
    el.className = `marker marker-${def.type}`;
    el.title = def.name;
    el.innerHTML = ICONS[def.type] || ICONS.light;
    el.addEventListener('click', (e) => { e.stopPropagation(); onMarkerClick(def.id); });
    const marker = new CSS2DObject(el);
    if (impl.markerPos) marker.position.copy(impl.markerPos);
    else marker.position.set(mx(def.at[0]), impl.markerY ?? 2.8, mz(def.at[1]));
    (impl.follow || stage.scene).add(marker);
    if (impl.follow) marker.position.set(0, impl.markerY, 0);

    map[def.id] = { def, impl, marker, el };
  }
  return map;
}

export function refreshMarker(entry, state) {
  const { def, el } = entry;
  el.classList.toggle('is-on', isActive(def, state));
  el.classList.toggle('is-alarm', isAlarm(def, state));
  if (def.type === 'lock') el.innerHTML = state.locked ? ICONS.lock : ICONS.unlock;
}
