import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { PALETTE } from './palette.js';
import { WALLS, ROOMS, FURNITURE, ACCENTS, CEILING, mx, mz, PX_PER_M } from './plan.js';

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

  // акцентные стены (обои, окраска) — тонкие панели поверх стен
  for (const a of ACCENTS) {
    const m = boxFromRect(a.r, 0, CEILING - 0.01, [M(PALETTE[a.color]), M(PALETTE[a.color]), capMat, M(PALETTE[a.color]), M(PALETTE[a.color]), M(PALETTE[a.color])]);
    m.userData.full = { y0: 0, y1: CEILING - 0.01 };
    walls.push(m);
    group.add(m);
  }

  // полы: паркет «ёлочкой» в жилых комнатах, плитка в мокрых зонах
  const herring = herringboneTexture();
  const tileTex = tileTexture();
  const floors = {};
  for (const room of ROOMS) {
    floors[room.id] = [];
    for (const r of room.rects) {
      const w = Math.abs(r[2] - r[0]) / PX_PER_M;
      const d = Math.abs(r[3] - r[1]) / PX_PER_M;
      let material;
      if (room.floor === 'wood') {
        const map = herring.clone();
        map.repeat.set(w / 1.2, d / 1.2);
        map.needsUpdate = true;
        material = new THREE.MeshStandardMaterial({ map, roughness: 0.55 });
      } else {
        const map = tileTex.clone();
        map.repeat.set(w / 1.2, d / 1.2);
        map.needsUpdate = true;
        material = new THREE.MeshStandardMaterial({ map, color: room.floor === 'loggia' ? PALETTE.floorLoggia : '#ffffff', roughness: 0.45 });
      }
      material.emissive = new THREE.Color(PALETTE.alarm);
      material.emissiveIntensity = 0;
      const f = boxFromRect(r, -0.03, 0, material);
      f.castShadow = false;
      f.userData.room = room.id;
      floors[room.id].push(f);
      group.add(f);
    }
  }

  stage.scene.add(group);
  return { group, walls, floors, glass };
}

// ---------- процедурные текстуры ----------

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

// детерминированный «случайный» генератор, чтобы рисунок не менялся между запусками
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function herringboneTexture() {
  return canvasTexture(256, (ctx, S) => {
    const W = 32, H = 16;
    const rand = rng(7);
    const base = new THREE.Color(PALETTE.floorWood);
    for (let c = 0; c < S / W; c++) {
      const x0 = c * W;
      const even = c % 2 === 0;
      for (let k = -4; k < S / H + 4; k++) {
        const y0 = k * H;
        const col = base.clone().offsetHSL(0, 0, (rand() - 0.5) * 0.035);
        ctx.fillStyle = `#${col.getHexString()}`;
        ctx.strokeStyle = PALETTE.floorWoodLine;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        if (even) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + W, y0 - W); ctx.lineTo(x0 + W, y0 - W + H); ctx.lineTo(x0, y0 + H); }
        else { ctx.moveTo(x0, y0 - W); ctx.lineTo(x0 + W, y0); ctx.lineTo(x0 + W, y0 + H); ctx.lineTo(x0, y0 - W + H); }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  });
}

function tileTexture() {
  return canvasTexture(256, (ctx, S) => {
    ctx.fillStyle = PALETTE.floorTile;
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= S; i += S / 2) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
    }
  });
}

// Ковёр в гостиной: чёрно-белая геометрия из полукругов.
function geoRugTexture() {
  const tex = canvasTexture(512, (ctx, S) => {
    const n = 4, c = S / n;
    const rand = rng(11);
    ctx.fillStyle = PALETTE.rugLight;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * c, y = j * c;
      const kind = Math.floor(rand() * 4);
      const dark = rand() > 0.3 ? PALETTE.rugDark : '#6b6b6b';
      ctx.fillStyle = dark;
      ctx.beginPath();
      if (kind === 0) ctx.arc(x + c / 2, y + c, c / 2, Math.PI, 0);
      else if (kind === 1) ctx.arc(x + c / 2, y, c / 2, 0, Math.PI);
      else if (kind === 2) { ctx.rect(x, y, c / 2, c); }
      else ctx.arc(x, y + c / 2, c / 2, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    }
  });
  return tex;
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

const gold = () => M(P.gold, { metalness: 0.85, roughness: 0.3 });
const showcaseMat = () => new THREE.MeshStandardMaterial({ color: P.showcase, emissive: P.showcase, emissiveIntensity: 0.9, roughness: 0.6 });

// Витрина: чёрная рама, подсвеченные полки. face — сторона, куда смотрит фасад (n/s/e/w).
function showcase(r, h, face) {
  const g = new THREE.Group();
  g.add(boxFromRect(r, 0, h, M(P.wall)));
  const [x1, z1, x2, z2] = r;
  const frame = {
    n: [x1 + 1, z1 - 0.4, x2 - 1, z1 + 2],
    s: [x1 + 1, z2 - 2, x2 - 1, z2 + 0.4],
    e: [x2 - 2, z1 + 1, x2 + 0.4, z2 - 1],
    w: [x1 - 0.4, z1 + 1, x1 + 2, z2 - 1],
  }[face];
  g.add(boxFromRect(frame, 0.08, h - 0.04, M(P.black, { roughness: 0.4 })));
  const inset = {
    n: [x1 + 3, z1 - 0.8, x2 - 3, z1 + 4],
    s: [x1 + 3, z2 - 4, x2 - 3, z2 + 0.8],
    e: [x2 - 4, z1 + 3, x2 + 0.8, z2 - 3],
    w: [x1 - 0.8, z1 + 3, x1 + 4, z2 - 3],
  }[face];
  g.add(boxFromRect(inset, 0.15, h - 0.12, showcaseMat()));
  for (let y = 0.6; y < h - 0.2; y += 0.42) g.add(boxFromRect(inset, y, y + 0.025, M(P.black)));
  return g;
}

const builders = {
  rug: (f) => {
    let material;
    if (f.style === 'geo') {
      const map = geoRugTexture();
      const { w, d } = rectSize(f.r);
      map.repeat.set(w / 1.6, d / 1.6);
      material = new THREE.MeshStandardMaterial({ map, roughness: 1 });
    } else material = M(P.rugLight, { roughness: 1 });
    const m = boxFromRect(f.r, 0, 0.012, material);
    m.castShadow = false;
    return m;
  },
  cabinet: (f) => {
    const g = new THREE.Group();
    if (f.style === 'console') {
      // чёрный поднос-столик на золотых скрещенных ножках
      g.add(boxFromRect(f.r, f.h - 0.06, f.h, M(P.black, { roughness: 0.5 })));
      const { w, d, cx, cz } = rectSize(f.r);
      for (const s of [-1, 1]) {
        const leg = roundedBox(0.02, f.h * 1.15, 0.02, gold());
        leg.position.set(cx + s * w * 0.3, f.h / 2, cz);
        leg.rotation.z = s * 0.5;
        g.add(leg);
      }
      return g;
    }
    g.add(boxFromRect(f.r, 0.08, f.h, M(f.color ? P[f.color] : P.cabinet)));
    g.add(boxFromRect(f.r, 0, 0.08, M(P.dark)));
    return g;
  },
  wardrobe: (f) => boxFromRect(f.r, 0, f.h, M(f.color ? P[f.color] : P.cabinet, { roughness: 0.6 })),
  showcase: (f) => showcase(f.r, f.h || 2.4, f.face),
  bench: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0.4, 0.46, M(P.cabinet)));
    const [x1, z1, x2, z2] = f.r;
    const tall = z2 - z1 > x2 - x1;
    const a = tall ? [x1 + 2, z1 + 3, x2 - 2, z1 + 12] : [x1 + 3, z1 + 2, x1 + 12, z2 - 2];
    const b = tall ? [x1 + 2, z2 - 12, x2 - 2, z2 - 3] : [x2 - 12, z1 + 2, x2 - 3, z2 - 2];
    g.add(boxFromRect(a, 0, 0.4, M(P.bench)), boxFromRect(b, 0, 0.4, M(P.bench)));
    return g;
  },
  desk: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0.72, 0.76, M(P.cabinet)));
    const { w, d, cx, cz } = rectSize(f.r);
    for (const sx of [-1, 1]) {
      const leg = roundedBox(0.03, 0.72, d - 0.06, gold());
      leg.position.set(cx + sx * (w / 2 - 0.04), 0.36, cz);
      g.add(leg);
    }
    return g;
  },
  table: (f) => {
    // обеденный стол: белый мрамор, золотое основание
    const g = new THREE.Group();
    const { w, d, cx, cz } = rectSize(f.r);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 40), M(P.marble, { roughness: 0.25 }));
    top.scale.set(w, 1, d);
    top.position.set(cx, 0.75, cz);
    top.castShadow = true;
    g.add(top);
    for (const s of [-1, 1]) {
      const leg = roundedBox(0.04, 0.72, d * 0.5, gold());
      leg.position.set(cx + s * w * 0.22, 0.36, cz);
      g.add(leg);
    }
    return g;
  },
  chair: (f) => {
    const g = new THREE.Group();
    const color = f.color ? P[f.color] : P.olive;
    const seat = roundedBox(0.44, 0.07, 0.44, M(color, { roughness: 1 }));
    seat.position.y = 0.46;
    const back = roundedBox(0.44, 0.3, 0.06, M(color, { roughness: 1 }));
    back.position.set(0, 0.72, -0.2);
    g.add(seat, back);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = roundedBox(0.02, 0.46, 0.02, gold());
      leg.position.set(sx * 0.19, 0.23, sz * 0.19);
      g.add(leg);
    }
    // спинкой к столу не ставим: стул смотрит на центр стола, если он задан
    if (f.face) g.rotation.y = f.face;
    g.position.set(mx(f.at[0]), 0, mz(f.at[1]));
    return g;
  },
  armchair: (f) => {
    const g = new THREE.Group();
    if (f.style === 'round') {
      // круглое кресло из серого велюра с золотым кантом
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.4, 0.42, 40), M(P.velvetGrey, { roughness: 1 }));
      base.position.y = 0.21;
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.415, 0.012, 8, 48), gold());
      band.rotation.x = Math.PI / 2; band.position.y = 0.16;
      const back = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.38, 40, 1, true, Math.PI * 0.25, Math.PI * 1.5), M(P.velvetGrey, { roughness: 1, side: THREE.DoubleSide }));
      back.position.y = 0.6;
      const pillow = roundedBox(0.45, 0.28, 0.12, M('#6b6563', { roughness: 1 }));
      pillow.position.set(0, 0.58, 0.18);
      for (const m of [base, back, pillow]) m.castShadow = true;
      g.add(base, band, back, pillow);
      g.rotation.y = f.rot ?? Math.PI * 0.75;
    } else {
      // белое кресло-качалка на золотых полозьях
      const seat = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), M('#f3f2ef', { roughness: 1, side: THREE.DoubleSide }));
      seat.rotation.x = Math.PI * 0.85;
      seat.position.y = 0.6;
      seat.castShadow = true;
      g.add(seat);
      for (const s of [-1, 1]) {
        const rail = roundedBox(0.02, 0.02, 0.8, gold());
        rail.position.set(s * 0.25, 0.05, 0);
        g.add(rail);
      }
      g.rotation.y = f.rot ?? -Math.PI * 0.75;
    }
    g.position.set(mx(f.at[0]), 0, mz(f.at[1]));
    return g;
  },
  sofa: (f) => {
    // светлый диван со стёгаными валиками на золотых ножках
    const g = new THREE.Group();
    const r = f.r;
    const mat = M(P.sofa, { roughness: 1 });
    g.add(boxFromRect([r[0], r[1], r[2], r[3]], 0.12, 0.42, mat));
    for (let i = 0; i < 3; i++) {
      const y0 = 0.42 + i * 0.14;
      g.add(boxFromRect([r[0], r[1], r[2], r[1] + 16], y0, y0 + 0.13, mat));
    }
    for (const side of [[r[0], r[1], r[0] + 13, r[3]], [r[2] - 13, r[1], r[2], r[3]]]) {
      g.add(boxFromRect(side, 0.42, 0.56, mat), boxFromRect(side, 0.57, 0.68, mat));
    }
    const seatW = (r[2] - r[0] - 26) / 3;
    for (let i = 0; i < 3; i++) {
      const x = r[0] + 13 + seatW * i;
      g.add(boxFromRect([x + 1, r[1] + 16, x + seatW - 1, r[3] - 2], 0.42, 0.52, mat));
    }
    // подушки с принтом
    g.add(boxFromRect([r[0] + 18, r[1] + 16, r[0] + 46, r[1] + 22], 0.52, 0.85, M('#e7d9c9')));
    g.add(boxFromRect([r[2] - 46, r[1] + 16, r[2] - 18, r[1] + 22], 0.52, 0.85, M('#e7d9c9')));
    const { w, d, cx, cz } = rectSize(r);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = roundedBox(0.03, 0.12, 0.03, gold());
      leg.position.set(cx + sx * (w / 2 - 0.08), 0.06, cz + sz * (d / 2 - 0.08));
      g.add(leg);
    }
    return g;
  },
  bed: (f) => {
    const g = new THREE.Group();
    const r = f.r;
    const frame = f.color ? P[f.color] : P.headboard;
    g.add(boxFromRect(r, 0.05, 0.34, M(frame, { roughness: 1 })));
    g.add(boxFromRect([r[0] + 2, r[1] + 2, r[2] - 2, r[3] - 2], 0.34, 0.54, M(P.linen)));
    const isE = f.head === 'e';
    // покрывало
    const blanket = isE ? [r[0] + 1, r[1] + 1, r[2] - 38, r[3] - 1] : [r[0] + 1, r[1] + 1, r[2] - 1, r[3] - 38];
    g.add(boxFromRect(blanket, 0.54, 0.6, M('#e1e0dc', { roughness: 1 })));
    if (isE) {
      g.add(boxFromRect([r[2] - 34, r[1] + 8, r[2] - 6, r[3] - 8], 0.54, 0.66, M('#ffffff')));
      g.add(boxFromRect([r[2] - 4, r[1] - 2, r[2] + 4, r[3] + 2], 0, 0.95, M(frame, { roughness: 1 })));
    } else {
      const mid = (r[0] + r[2]) / 2;
      g.add(boxFromRect([r[0] + 8, r[3] - 34, mid - 3, r[3] - 6], 0.54, 0.68, M('#ffffff')));
      g.add(boxFromRect([mid + 3, r[3] - 34, r[2] - 8, r[3] - 6], 0.54, 0.68, M('#ffffff')));
      g.add(boxFromRect([r[0] + 20, r[3] - 40, r[2] - 20, r[3] - 33], 0.54, 0.66, M('#9a928a')));
    }
    return g;
  },
  // мягкое изголовье с вертикальной стёжкой во всю стену
  headboard: (f) => {
    const g = new THREE.Group();
    const [x1, z1, x2, z2] = f.r;
    const n = Math.round((x2 - x1) / 12);
    for (let i = 0; i < n; i++) {
      const a = x1 + ((x2 - x1) * i) / n;
      const b = x1 + ((x2 - x1) * (i + 1)) / n;
      g.add(boxFromRect([a + 0.5, z1, b - 0.5, z2], 0, 1.2, M(P.headboard, { roughness: 1 })));
    }
    return g;
  },
  roundTable: (f) => {
    const g = new THREE.Group();
    const rad = f.rad / PX_PER_M;
    if (f.style === 'white') {
      // тумба-цилиндр белая на золотом цоколе
      const body = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.5, 32), M('#f6f5f2'));
      body.position.y = 0.3; body.castShadow = true;
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.9, rad * 0.9, 0.05, 32), gold());
      plinth.position.y = 0.025;
      g.add(body, plinth);
    } else {
      // золотая столешница на чёрной «вазе»
      const top = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.03, 40), gold());
      top.position.y = f.h ?? 0.48; top.castShadow = true;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16), gold());
      neck.position.y = (f.h ?? 0.48) - 0.07;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.45, rad * 0.55, (f.h ?? 0.48) - 0.12, 24), M(P.black, { roughness: 0.6 }));
      base.position.y = ((f.h ?? 0.48) - 0.12) / 2; base.castShadow = true;
      g.add(top, neck, base);
    }
    g.position.set(mx(f.at[0]), 0, mz(f.at[1]));
    return g;
  },
  plant: (f) => {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.35, 20), M(P.ceramic));
    pot.position.y = 0.175; pot.castShadow = true;
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), M(P.plant, { flatShading: true }));
    leaves.position.y = 0.75; leaves.scale.set(1, 1.35, 1); leaves.castShadow = true;
    g.add(pot, leaves);
    g.position.set(mx(f.at[0]), 0, mz(f.at[1]));
    return g;
  },
  kitchenRun: (f) => {
    const g = new THREE.Group();
    const [x1, z1, x2, z2] = f.r;
    const wide = x2 - x1 > z2 - z1;
    g.add(boxFromRect(f.r, 0.1, 0.86, M(P.kitchenLow, { roughness: 0.5 })));
    g.add(boxFromRect(f.r, 0, 0.1, M(P.black)));
    g.add(boxFromRect([x1 - 1, z1 - 1, x2 + 1, z2 + 1], 0.86, 0.9, M(P.worktop, { roughness: 0.3 })));
    // чёрный фартук
    const splash = wide ? [x1, z1, x2, z1 + 2] : [x1, z1, x1 + 2, z2];
    g.add(boxFromRect(splash, 0.9, 1.5, M(P.worktop, { roughness: 0.2 })));
    // верхние шкафы (тауп) с двумя подсвеченными витринами
    const upper = wide ? [x1, z1, x2, z1 + 25] : [x1, z1, x1 + 25, z2];
    g.add(boxFromRect(upper, 1.5, 2.45, M(P.kitchenHigh, { roughness: 0.6 })));
    if (wide) {
      for (const sx of f.showcases || []) {
        g.add(boxFromRect([sx, z1 + 2, sx + 30, z1 + 25.8], 1.52, 2.43, M(P.black)));
        g.add(boxFromRect([sx + 2, z1 + 25.5, sx + 28, z1 + 26.3], 1.55, 2.4, showcaseMat()));
      }
      // подсветка рабочей зоны
      g.add(boxFromRect([x1 + 2, z1 + 22, x2 - 2, z1 + 24], 1.48, 1.5, showcaseMat()));
    }
    return g;
  },
  tallUnit: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0, 2.45, M(P.kitchenHigh, { roughness: 0.6 })));
    const { cx, cz } = rectSize(f.r);
    const oven = roundedBox(0.04, 0.55, 0.55, M(P.black, { roughness: 0.2 }));
    oven.position.set(cx + 0.33, 0.95, cz);
    const mw = roundedBox(0.04, 0.38, 0.55, M(P.black, { roughness: 0.2 }));
    mw.position.set(cx + 0.33, 1.5, cz);
    g.add(oven, mw);
    return g;
  },
  fridge: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0, 2.45, M(P.kitchenHigh, { roughness: 0.6 })));
    const { cx, cz } = rectSize(f.r);
    const handle = roundedBox(0.02, 0.6, 0.02, gold());
    handle.position.set(cx + 0.35, 1.2, cz + 0.2);
    g.add(handle);
    return g;
  },
  hob: (f) => {
    const m = roundedBox(0.52, 0.01, 0.5, M(P.black, { roughness: 0.15 }));
    m.position.set(mx(f.at[0]), 0.905, mz(f.at[1]));
    return m;
  },
  sink: (f) => {
    const m = roundedBox(0.5, 0.012, 0.4, M('#2a2a2a', { roughness: 0.3 }));
    m.position.set(mx(f.at[0]), 0.905, mz(f.at[1]));
    return m;
  },
  vanity: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0.35, 0.82, M(P.vanity)));
    // рифлёный фасад
    const [x1, z1, x2, z2] = f.r;
    const wide = x2 - x1 > z2 - z1;
    const n = 10;
    for (let i = 0; i < n; i++) {
      if (wide) { const a = x1 + ((x2 - x1) * i) / n; g.add(boxFromRect([a + 0.6, z2, a + (x2 - x1) / n - 0.6, z2 + 1], 0.37, 0.8, M(P.vanity))); }
      else { const a = z1 + ((z2 - z1) * i) / n; g.add(boxFromRect([x1 - 1, a + 0.3, x1, a + (z2 - z1) / n - 0.3], 0.37, 0.8, M(P.vanity))); }
    }
    g.add(boxFromRect([x1 + 3, z1 + 3, x2 - 3, z2 - 3], 0.82, 0.88, M(P.ceramic, { roughness: 0.15 })));
    return g;
  },
  bathtub: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0, 0.56, M(P.ceramic, { roughness: 0.2 })));
    g.add(boxFromRect([f.r[0] + 6, f.r[1] + 6, f.r[2] - 6, f.r[3] - 6], 0.4, 0.565, M('#e3edf0', { roughness: 0.08 })));
    // шторка
    g.add(boxFromRect([f.r[0] - 1, f.r[1], f.r[0] + 1, f.r[3]], 0.6, 2.2, M(P.curtainKids, { roughness: 1 })));
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
    g.add(boxFromRect(f.r, 0, 1.75, M(P.vanity)));
    const [x1, z1, x2, z2] = f.r;
    g.add(boxFromRect([x1 + 2, z1 + 2, x2 - 2, z2 + 0.5], 0.02, 0.85, M(P.ceramic)));
    g.add(boxFromRect([x1 + 2, z1 + 2, x2 - 2, z2 + 0.5], 0.89, 1.7, M(P.ceramic)));
    // рифлёный шкаф над колонной
    g.add(boxFromRect(f.r, 1.75, 2.45, M(P.vanity)));
    return g;
  },
  media: (f) => {
    // ТВ-зона: по краям — витрины с подсветкой, в центре — стена с обоями и низкая тумба
    const g = new THREE.Group();
    const r = f.r;
    g.add(boxFromRect([r[0] + 85, r[1] + 22, r[2] - 70, r[3]], 0, 2.6, M(P.wallpaper)));
    g.add(boxFromRect([r[0] + 85, r[1] + 22, r[0] + 86.5, r[3]], 0, 2.6, gold()));
    g.add(boxFromRect([r[2] - 71.5, r[1] + 22, r[2] - 70, r[3]], 0, 2.6, gold()));
    g.add(boxFromRect([r[0] + 100, r[1] + 8, r[2] - 85, r[1] + 22], 0.12, 0.48, M(P.black, { roughness: 0.4 })));
    g.add(showcase([r[0], r[1], r[0] + 85, r[3]], 2.55, 'n'));
    g.add(showcase([r[2] - 70, r[1], r[2], r[3]], 2.55, 'n'));
    return g;
  },
  mirror: (f) => {
    const g = new THREE.Group();
    g.add(boxFromRect(f.r, 0.05, 2.55, M(P.mirror, { metalness: 0.9, roughness: 0.08 })));
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
