import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { PALETTE } from './palette.js';
import { WALLS, ROOMS, FURNITURE, CEILING, mx, mz, PX_PER_M } from './plan.js';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts });
const cache = new Map();
export const M = (color, opts) => {
  const key = color + JSON.stringify(opts || {});
  if (!cache.has(key)) cache.set(key, mat(color, opts));
  return cache.get(key);
};

// Коробка по прямоугольнику плана от высоты y0 до y1.
export function boxFromRect(r, y0, y1, material) {
  const [x1, z1, x2, z2] = r;
  const w = Math.max(Math.abs(x2 - x1) / PX_PER_M, 0.01);
  const d = Math.max(Math.abs(z2 - z1) / PX_PER_M, 0.01);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, y1 - y0, d), material);
  mesh.position.set(mx((x1 + x2) / 2), (y0 + y1) / 2, mz((z1 + z2) / 2));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const labels = new CSS2DRenderer();
  labels.domElement.className = 'labels-layer';
  container.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  const controls = new OrbitControls(camera, labels.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.45;
  controls.minDistance = 5;
  controls.maxDistance = 55;
  controls.target.set(0.6, 0, 0.5);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  const stage = { renderer, labels, scene, camera, controls, resize };
  setView(stage, 'iso', false);
  return stage;
}

const VIEWS = {
  iso: { pos: [7, 19, 21], target: [0.8, 0, 0.9] },
  top: { pos: [0.8, 30, 1.6], target: [0.8, 0, 0.9] },
  front: { pos: [-9, 11, 20], target: [0.8, 0, 0.9] },
};

export function setView(stage, name, animate = true, focus) {
  const v = VIEWS[name] || VIEWS.iso;
  const target = new THREE.Vector3(...(focus || v.target));
  const pos = new THREE.Vector3(...v.pos).sub(new THREE.Vector3(...v.target)).add(target);
  if (focus) pos.sub(target).multiplyScalar(0.55).add(target);
  if (!animate) {
    stage.camera.position.copy(pos);
    stage.controls.target.copy(target);
    stage.controls.update();
    return;
  }
  stage.tween = { from: stage.camera.position.clone(), to: pos, tFrom: stage.controls.target.clone(), tTo: target, t: 0 };
}

export function updateTween(stage, dt) {
  const tw = stage.tween;
  if (!tw) return;
  tw.t = Math.min(1, tw.t + dt * 1.6);
  const k = 1 - Math.pow(1 - tw.t, 3);
  stage.camera.position.lerpVectors(tw.from, tw.to, k);
  stage.controls.target.lerpVectors(tw.tFrom, tw.tTo, k);
  if (tw.t >= 1) stage.tween = null;
}

// ---------- окружение и время суток ----------

export function buildEnvironment(stage) {
  const { scene } = stage;
  const hemi = new THREE.HemisphereLight('#ffffff', '#b9a98f', 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3e0', 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), M(PALETTE.ground));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  scene.add(ground);

  return { hemi, sun, ground };
}

const skyDay = new THREE.Color('#e9edf0');
const skyDusk = new THREE.Color('#d9c3b0');
const skyNight = new THREE.Color('#1b1f2a');

// hours: 0..24. Возвращает «дневность» 0..1.
export function applyTimeOfDay(stage, env, hours, glassMat) {
  const t = (hours - 6) / 14; // 6:00 рассвет, 20:00 закат
  const daylight = THREE.MathUtils.clamp(Math.sin(Math.PI * t), 0, 1);
  const elev = Math.max(0.12, daylight) * 1.2;
  const az = Math.PI * (0.15 + t);
  env.sun.position.set(Math.cos(az) * 18, 4 + Math.sin(elev) * 20, Math.sin(az) * 10 + 8);
  env.sun.intensity = 0.25 + 2.3 * daylight;
  env.sun.color.set(daylight < 0.35 ? '#ffc58f' : '#fff3e0');
  env.hemi.intensity = 0.18 + 1.0 * daylight;

  const bg = daylight > 0.3
    ? skyDusk.clone().lerp(skyDay, (daylight - 0.3) / 0.7)
    : skyNight.clone().lerp(skyDusk, daylight / 0.3);
  stage.scene.background = bg;
  env.ground.material.color.set(PALETTE.ground).multiplyScalar(0.35 + 0.65 * daylight);
  if (glassMat) glassMat.emissiveIntensity = 0.05 + 0.25 * daylight;
  stage.renderer.toneMappingExposure = 0.95 + 0.25 * (1 - daylight);
  return daylight;
}

// ---------- стены, полы ----------

export function buildShell(stage) {
  const group = new THREE.Group();
  const wallMat = M(PALETTE.wall);
  const capMat = M(PALETTE.wallCap);
  const glass = new THREE.MeshStandardMaterial({
    color: PALETTE.glass, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1,
    emissive: PALETTE.glass, emissiveIntensity: 0.2,
  });
  const frameMat = M(PALETTE.frame);
  // у бокса стороны: +x,-x,+y,-y,+z,-z — верх (срез) делаем тёмным
  const wallMats = [wallMat, wallMat, capMat, wallMat, wallMat, wallMat];

  const walls = [];
  const addWall = (r, y0, y1) => {
    const m = boxFromRect(r, y0, y1, wallMats);
    m.userData.full = { y0, y1 };
    walls.push(m);
    group.add(m);
  };

  for (const w of WALLS) {
    if (w.kind === 'wall') addWall(w.r, 0, CEILING);
    if (w.kind === 'door') addWall(w.r, w.head, CEILING);
    if (w.kind === 'window') {
      addWall(w.r, 0, w.sill);
      addWall(w.r, w.head, CEILING);
      const [x1, z1, x2, z2] = w.r;
      const thin = Math.abs(x2 - x1) < Math.abs(z2 - z1);
      const mid = thin ? (x1 + x2) / 2 : null;
      const midZ = thin ? null : (z1 + z2) / 2;
      const glassRect = thin ? [mid - 1, z1, mid + 1, z2] : [x1, midZ - 1, x2, midZ + 1];
      const g = boxFromRect(glassRect, w.sill, w.head, glass);
      g.castShadow = false;
      group.add(g);
      // подоконник и импосты
      const sill = boxFromRect(w.r, w.sill - 0.02, w.sill + 0.02, frameMat);
      group.add(sill);
      const len = thin ? z2 - z1 : x2 - x1;
      const n = Math.max(1, Math.round(len / 75));
      for (let i = 1; i < n; i++) {
        const p = (thin ? z1 : x1) + (len * i) / n;
        const rr = thin ? [x1 + 3, p - 1.5, x2 - 3, p + 1.5] : [p - 1.5, z1 + 3, p + 1.5, z2 - 3];
        group.add(boxFromRect(rr, w.sill, w.head, frameMat));
      }
    }
  }

  // полы
  const floorMats = {
    wood: M(PALETTE.floorWood, { roughness: 0.7 }),
    tile: M(PALETTE.floorTile, { roughness: 0.5 }),
    loggia: M(PALETTE.floorLoggia),
  };
  const floors = {};
  for (const room of ROOMS) {
    floors[room.id] = [];
    for (const r of room.rects) {
      const f = boxFromRect(r, -0.03, 0, floorMats[room.floor]);
      f.castShadow = false;
      f.userData.room = room.id;
      floors[room.id].push(f);
      group.add(f);
    }
  }

  stage.scene.add(group);
  return { group, walls, floors, glass };
}

// Режим «срез стен»: стены обрезаются до заданной высоты, чтобы было видно комнаты.
export function setWallHeight(walls, h) {
  for (const w of walls) {
    const { y0, y1 } = w.userData.full;
    const top = Math.min(y1, h);
    if (top <= y0 + 0.001) { w.visible = false; continue; }
    w.visible = true;
    w.scale.y = (top - y0) / (y1 - y0);
    w.position.y = (y0 + top) / 2;
  }
}

// ---------- мебель ----------

const P = PALETTE;

function roundedBox(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function rectSize(r) {
  return { w: Math.abs(r[2] - r[0]) / PX_PER_M, d: Math.abs(r[3] - r[1]) / PX_PER_M, cx: mx((r[0] + r[2]) / 2), cz: mz((r[1] + r[3]) / 2) };
}

const builders = {
  rug: (f) => { const m = boxFromRect(f.r, 0, 0.012, M(P.rug)); m.castShadow = false; return m; },
  cabinet: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0.08, f.h, M(P.cabinet)));
    g.add(boxFromRect(f.r, 0, 0.08, M(P.woodDark)));
    return g;
  },
  wardrobe: (f) => boxFromRect(f.r, 0, f.h, M(P.cabinet)),
  desk: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0.72, 0.76, M(P.wood)));
    const { w, d, cx, cz } = rectSize(f.r);
    for (const sx of [-1, 1]) {
      const leg = roundedBox(0.04, 0.72, d - 0.06, M(P.dark));
      leg.position.set(cx + sx * (w / 2 - 0.04), 0.36, cz);
      g.add(leg);
    }
    return g;
  },
  table: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0.72, 0.76, M(P.wood)));
    const { w, d, cx, cz } = rectSize(f.r);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = roundedBox(0.05, 0.72, 0.05, M(P.woodDark));
      leg.position.set(cx + sx * (w / 2 - 0.08), 0.36, cz + sz * (d / 2 - 0.08));
      g.add(leg);
    }
    return g;
  },
  chair: (f) => {
    const g = new THREE.Group();
    const seat = roundedBox(0.42, 0.05, 0.42, M(P.textileAccent));
    seat.position.y = 0.45;
    const back = roundedBox(0.42, 0.4, 0.05, M(P.textileAccent));
    back.position.set(0, 0.68, -0.2);
    g.add(seat, back);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = roundedBox(0.03, 0.45, 0.03, M(P.dark));
      leg.position.set(sx * 0.18, 0.225, sz * 0.18);
      g.add(leg);
    }
    g.position.set(mx(f.at[0]), 0, mz(f.at[1]));
    return g;
  },
  armchair: (f) => {
    const g = new THREE.Group();
    const base = roundedBox(0.8, 0.42, 0.8, M(P.textile));
    base.position.y = 0.21;
    const back = roundedBox(0.8, 0.45, 0.18, M(P.textile));
    back.position.set(0, 0.62, -0.31);
    const a1 = roundedBox(0.14, 0.22, 0.8, M(P.textile));
    a1.position.set(-0.33, 0.52, 0);
    const a2 = a1.clone(); a2.position.x = 0.33;
    g.add(base, back, a1, a2);
    g.rotation.y = -Math.PI * 0.75;
    g.position.set(mx(f.at[0]), 0, mz(f.at[1]));
    return g;
  },
  sofa: (f) => {
    const g = new THREE.Group();
    const r = f.r;
    g.add(boxFromRect(r, 0.08, 0.42, M(P.textile)));
    g.add(boxFromRect([r[0], r[1], r[2], r[1] + 14], 0.42, 0.82, M(P.textile)));
    g.add(boxFromRect([r[0], r[1], r[0] + 12, r[3]], 0.42, 0.62, M(P.textile)));
    g.add(boxFromRect([r[2] - 12, r[1], r[2], r[3]], 0.42, 0.62, M(P.textile)));
    const seatW = (r[2] - r[0] - 24) / 3;
    for (let i = 0; i < 3; i++) {
      const x = r[0] + 12 + seatW * i;
      g.add(boxFromRect([x + 1, r[1] + 14, x + seatW - 1, r[3] - 2], 0.42, 0.52, M(P.textile, { roughness: 1 })));
    }
    g.add(boxFromRect(r, 0, 0.08, M(P.dark)));
    return g;
  },
  bed: (f) => {
    const g = new THREE.Group();
    const r = f.r;
    g.add(boxFromRect(r, 0.05, 0.32, M(P.wood)));
    g.add(boxFromRect([r[0] + 2, r[1] + 2, r[2] - 2, r[3] - 2], 0.32, 0.52, M(P.linen)));
    // одеяло и подушки
    const isE = f.head === 'e';
    const blanket = isE ? [r[0] + 2, r[1] + 1, r[2] - 40, r[3] - 1] : [r[0] + 1, r[1] + 2, r[2] - 1, r[3] - 40];
    g.add(boxFromRect(blanket, 0.52, 0.58, M(P.textileAccent)));
    if (isE) {
      g.add(boxFromRect([r[2] - 34, r[1] + 8, r[2] - 6, r[3] - 8], 0.52, 0.64, M('#ffffff')));
      g.add(boxFromRect([r[2] - 4, r[1], r[2] + 2, r[3]], 0, 0.9, M(P.woodDark)));
    } else {
      const mid = (r[0] + r[2]) / 2;
      g.add(boxFromRect([r[0] + 8, r[3] - 34, mid - 3, r[3] - 6], 0.52, 0.66, M('#ffffff')));
      g.add(boxFromRect([mid + 3, r[3] - 34, r[2] - 8, r[3] - 6], 0.52, 0.66, M('#ffffff')));
    }
    return g;
  },
  headboard: (f) => boxFromRect(f.r, 0, 1.15, M(P.textile)),
  roundTable: (f) => {
    const g = new THREE.Group();
    const rad = f.rad / PX_PER_M;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.04, 32), M(P.wood));
    top.position.y = 0.48; top.castShadow = true;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.46, 12), M(P.dark));
    leg.position.y = 0.23; leg.castShadow = true;
    g.add(top, leg);
    g.position.set(mx(f.at[0]), 0, mz(f.at[1]));
    return g;
  },
  plant: (f) => {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.35, 20), M(P.ceramic));
    pot.position.y = 0.175; pot.castShadow = true;
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), M(P.plant, { flatShading: true }));
    leaves.position.y = 0.7; leaves.scale.set(1, 1.3, 1); leaves.castShadow = true;
    g.add(pot, leaves);
    g.position.set(mx(f.at[0]), 0, mz(f.at[1]));
    return g;
  },
  kitchenRun: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0.1, 0.86, M(P.cabinet)));
    g.add(boxFromRect(f.r, 0, 0.1, M(P.dark)));
    g.add(boxFromRect([f.r[0] - 1, f.r[1] - 1, f.r[2] + 1, f.r[3] + 1], 0.86, 0.9, M(P.worktop, { roughness: 0.4 })));
    // верхние шкафы вдоль стены
    const [x1, z1, x2, z2] = f.r;
    const wide = x2 - x1 > z2 - z1;
    const upper = wide ? [x1, z1, x2, z1 + 25] : [x1, z1, x1 + 25, z2];
    g.add(boxFromRect(upper, 1.5, 2.3, M(P.cabinet)));
    return g;
  },
  tallUnit: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0, 2.3, M(P.cabinet)));
    const { cx, cz } = rectSize(f.r);
    const oven = roundedBox(0.04, 0.5, 0.55, M(P.dark, { roughness: 0.3 }));
    oven.position.set(cx + 0.33, 1.0, cz);
    const mw = roundedBox(0.04, 0.35, 0.55, M(P.dark, { roughness: 0.3 }));
    mw.position.set(cx + 0.33, 1.5, cz);
    g.add(oven, mw);
    return g;
  },
  fridge: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0, 2.3, M(P.cabinet)));
    const { cx, cz } = rectSize(f.r);
    const handle = roundedBox(0.03, 0.5, 0.03, M(P.metal, { metalness: 0.8, roughness: 0.3 }));
    handle.position.set(cx + 0.36, 1.2, cz + 0.2);
    g.add(handle);
    return g;
  },
  hob: (f) => {
    const m = roundedBox(0.52, 0.01, 0.5, M(P.dark, { roughness: 0.2 }));
    m.position.set(mx(f.at[0]), 0.905, mz(f.at[1]));
    return m;
  },
  sink: (f) => {
    const m = roundedBox(0.5, 0.012, 0.4, M(P.metal, { metalness: 0.7, roughness: 0.3 }));
    m.position.set(mx(f.at[0]), 0.905, mz(f.at[1]));
    return m;
  },
  vanity: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0.4, 0.82, M(P.wood)));
    g.add(boxFromRect([f.r[0] + 4, f.r[1] + 4, f.r[2] - 4, f.r[3] - 4], 0.82, 0.88, M(P.ceramic, { roughness: 0.2 })));
    return g;
  },
  bathtub: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0, 0.56, M(P.ceramic, { roughness: 0.25 })));
    g.add(boxFromRect([f.r[0] + 6, f.r[1] + 6, f.r[2] - 6, f.r[3] - 6], 0.4, 0.565, M('#e2eef2', { roughness: 0.1 })));
    return g;
  },
  toilet: (f) => {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.4, 24), M(P.ceramic, { roughness: 0.2 }));
    bowl.scale.z = 1.35; bowl.position.set(0, 0.2, 0.05); bowl.castShadow = true;
    g.add(bowl);
    g.position.set(mx(f.at[0]), 0, mz(f.at[1]));
    return g;
  },
  washer: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0, 0.85, M(P.ceramic)));
    g.add(boxFromRect(f.r, 0.87, 1.72, M(P.ceramic)));
    return g;
  },
  media: (f) => {
    const g = new THREE.Group();
    const r = f.r;
    // низкая тумба по центру и стеллажи по краям
    g.add(boxFromRect([r[0] + 85, r[1] + 10, r[2] - 70, r[3]], 0.1, 0.5, M(P.wood)));
    g.add(boxFromRect([r[0], r[1], r[0] + 85, r[3]], 0, 2.3, M(P.cabinet)));
    g.add(boxFromRect([r[2] - 70, r[1], r[2], r[3]], 0, 2.3, M(P.cabinet)));
    g.add(boxFromRect([r[0] + 85, r[1] + 22, r[2] - 70, r[3]], 0.5, 2.3, M(P.wall)));
    return g;
  },
};

export function buildFurniture(stage) {
  const group = new THREE.Group();
  for (const f of FURNITURE) {
    const b = builders[f.type];
    if (b) group.add(b(f));
  }
  stage.scene.add(group);
  return group;
}

// ---------- подписи комнат ----------

export function buildRoomLabels(stage, onClick) {
  const map = {};
  for (const room of ROOMS) {
    const el = document.createElement('button');
    el.className = 'room-label';
    el.innerHTML = `<span class="room-name">${room.name}</span><span class="room-climate"></span>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); onClick(room.id); });
    const obj = new CSS2DObject(el);
    obj.position.set(mx(room.label[0]), 0.05, mz(room.label[1]));
    stage.scene.add(obj);
    map[room.id] = { obj, el };
  }
  return map;
}

export { CSS2DObject };
