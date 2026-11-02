// Начальный список «паспорта квартиры»: всё, что известно по плану, фото
// интерьера и щитка. Пустые поля (бренд, модель, артикул, размеры, где купить)
// заполняются в интерфейсе. Этот список используется, только пока своих
// записей ещё нет.
import { ROOMS, FURNITURE, DEVICES, WALLS, CEILING, PX_PER_M } from './plan.js';
import { BREAKERS } from './panel.js';

export const CATEGORIES = [
  ['finish', 'Отделка: пол, стены, потолок'],
  ['windows', 'Окна, стёкла, фурнитура'],
  ['doors', 'Двери, замки, доводчики'],
  ['heating', 'Отопление и терморегуляторы'],
  ['plumbing', 'Сантехника'],
  ['appliances', 'Бытовая техника'],
  ['climate', 'Климат и вентиляция'],
  ['lighting', 'Светильники и лампы'],
  ['electric', 'Электрика: щиток, розетки, выключатели'],
  ['network', 'Интернет и связь'],
  ['smart', 'Умный дом и безопасность'],
  ['furniture', 'Мебель'],
  ['textile', 'Шторы, карнизы, текстиль'],
  ['decor', 'Декор'],
];

// Поля карточки (порядок = порядок в форме).
export const FIELDS = [
  ['name', 'Название'],
  ['place', 'Где именно'],
  ['brand', 'Бренд'],
  ['model', 'Модель'],
  ['sku', 'Артикул'],
  ['specs', 'Характеристики (размер, цоколь, мощность, цвет…)'],
  ['qty', 'Количество'],
  ['supplier', 'Где купить / мастер'],
  ['link', 'Ссылка'],
  ['price', 'Цена'],
  ['purchased', 'Дата покупки'],
  ['warranty', 'Гарантия до'],
  ['notes', 'Заметки'],
];

const inRect = ([x, y], [x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2;
const roomAt = (pt) => ROOMS.find((r) => r.rects.some((rc) => inRect(pt, rc)))?.id || 'hall';
const center = (r) => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
const m = (px) => (px / PX_PER_M).toFixed(2);
const SRC = 'По развёртке ванной комнаты (дизайн-проект)';
const SRC_WC = 'По развёртке санузла (дизайн-проект)';
const SRC_LIGHT = 'По плану освещения (выполнен вариант 1)';

// Уточнения из чертежей: дополняют записи, собранные по плану.
const PATCHES = {
  'bath.ceiling': { specs: 'высота 2622 мм', notes: SRC },
  'bath.vanity': { specs: 'длина 1000 мм, скос тумбы параллелен скосу ванны; под накладную раковину 600 × 340', notes: SRC },
  'bath.washer-2': { name: 'Ниша-колонна под стиральную и сушильную машины со шкафом', specs: '700 × 700 мм; стиральная 0–900, сушильная 900–1722, шкаф 1722–2622 мм', notes: SRC },
  'bath.wardrobe': { specs: '480 × 400 мм, высота 2622 мм, в нише стены у двери', notes: SRC },
  'wc.ceiling': { specs: 'высота 2622 мм', notes: SRC_WC },
  'wc.cabinet': { specs: '1000 × 300 мм; короб инсталляции 0–1200, шкаф с двумя дверцами 1200–2622 мм', notes: SRC_WC },
  'wc.wardrobe': { specs: '900 × 400 мм, высота 2622 мм, в углу у раковины', notes: SRC_WC },
};

export function buildSeed() {
  const items = [];
  const counters = {};
  const add = (room, cat, key, name, extra = {}) => {
    counters[`${room}.${key}`] = (counters[`${room}.${key}`] || 0) + 1;
    const n = counters[`${room}.${key}`];
    items.push({
      id: `${room}.${key}${n > 1 ? `-${n}` : ''}`,
      room, category: cat, name,
      place: '', brand: '', model: '', sku: '', specs: '', qty: '1',
      supplier: '', link: '', price: '', purchased: '', warranty: '', notes: '',
      ...extra,
    });
  };

  // ---- отделка ----
  for (const r of ROOMS) {
    const at = r.label;
    if (r.floor === 'wood') {
      add(r.id, 'finish', 'floor', 'Паркет «ёлочка»', { specs: 'тёмный орех', at });
      add(r.id, 'finish', 'skirting', 'Плинтус', { at });
    } else if (r.floor === 'tile') {
      add(r.id, 'finish', 'floor', 'Керамогранит пола', { specs: 'бежевый', at });
      add(r.id, 'finish', 'walltile', 'Керамогранит стен', { specs: 'бежевый', at });
      add(r.id, 'finish', 'grout', 'Затирка швов', { at });
    } else {
      add(r.id, 'finish', 'floor', 'Покрытие пола', { at });
    }
    const wall = { kids: 'пыльно-розовый', bedroom: 'светлый тёплый серый; стена за изголовьем — оливковая', living: 'светлый тёплый серый; за диваном — обои с золотыми линиями' }[r.id];
    if (r.floor !== 'tile') add(r.id, 'finish', 'paint', 'Краска стен', { specs: wall || 'светлый тёплый серый', at });
    add(r.id, 'finish', 'ceiling', 'Потолок', { at });
  }
  add('living', 'finish', 'wallpaper', 'Обои с золотыми линиями (стена за диваном)', { at: [950, 490] });
  add('living', 'finish', 'trim', 'Золотые профили-молдинги по краям обоев', { qty: '2', at: [820, 490] });

  // ---- окна ----
  const windowRoom = (r) => roomAt(center(r).map((v, i) => v + (i === 0 ? (r[0] < 100 ? 20 : -20) : 0)));
  for (const w of WALLS.filter((x) => x.kind === 'window')) {
    const [x1, y1, x2, y2] = w.r;
    const len = Math.max(x2 - x1, y2 - y1);
    const room = w.r[0] === 1085 ? 'bedroom' : windowRoom(w.r);
    const size = `${m(len)} × ${(w.head - w.sill).toFixed(2)} м (по модели, уточнить замером)`;
    const at = center(w.r);
    const label = room === 'bedroom' ? 'Балконный блок (окно + дверь)' : room === 'loggia' ? 'Остекление лоджии' : 'Окно в пол';
    add(room, 'windows', 'frame', `${label}: рама`, { specs: size, at });
    add(room, 'windows', 'glass', `${label}: стеклопакеты`, { specs: 'формула стеклопакета — на дистанционной рамке', at });
    add(room, 'windows', 'hardware', `${label}: фурнитура (ручки, петли, уплотнитель)`, { at });
    add(room, 'windows', 'sill', `${label}: подоконник / откосы`, { at });
  }

  // ---- двери ----
  const doorNames = { hall: 'Входная дверь', kids: 'Дверь в детскую', dressing: 'Дверь в гардероб', bath: 'Дверь в ванную', wc: 'Дверь в санузел', kitchen: 'Дверь на кухню', bedroom: 'Дверь в спальню' };
  for (const d of WALLS.filter((x) => x.kind === 'door')) {
    const [x1, y1, x2, y2] = d.r;
    const c = center(d.r);
    const room = x1 === 685 ? 'hall' : x1 === 390 ? 'kids' : x1 === 412 ? 'dressing' : x1 === 557 ? 'bath' : x1 === 726 ? 'wc' : x1 === 885 ? 'kitchen' : 'bedroom';
    const name = doorNames[room];
    const size = `проём ${m(Math.max(x2 - x1, y2 - y1))} × ${d.head.toFixed(2)} м`;
    add(room, 'doors', 'door', `${name}: полотно и коробка`, { specs: size, at: c });
    add(room, 'doors', 'handle', `${name}: ручка, защёлка, петли`, { at: c });
    if (room === 'hall') {
      add(room, 'doors', 'closer', 'Входная дверь: доводчик', { at: c });
      add(room, 'doors', 'cylinder', 'Входная дверь: личинка замка', { at: c });
      add(room, 'doors', 'peephole', 'Входная дверь: глазок', { at: c });
    }
  }

  // ---- отопление ----
  for (const [room, at] of [['kids', [70, 160]], ['kitchen', [1165, 180]], ['living', [1165, 400]], ['bedroom', [1070, 560]]]) {
    add(room, 'heating', 'radiator', 'Радиатор', { at, notes: room === 'kids' || room === 'kitchen' ? 'Проверить наличие и место' : '' });
    add(room, 'heating', 'thermo', 'Терморегулятор (термоголовка) радиатора', { at });
  }
  add('bath', 'heating', 'towel', 'Полотенцесушитель', { at: [642, 174], place: 'Стена с дверью, в 200 мм от двери', specs: 'лесенка, высота ≈ 1120–1660 мм от пола', notes: SRC });
  add('bath', 'heating', 'floorheat', 'Тёплый пол: нагревательный мат/кабель', { at: [585, 140] });
  add('bath', 'heating', 'floorthermo', 'Тёплый пол: терморегулятор', { at: [600, 170] });

  // ---- сантехника ----
  const pl = (room, key, name, at, extra) => add(room, 'plumbing', key, name, { at, ...extra });
  pl('bath', 'tub', 'Ванна угловая асимметричная', [690, 105], { specs: '1600 × 1000 мм, узкий край 600 мм, высота борта 600 мм', notes: SRC });
  pl('bath', 'tubmixer', 'Смеситель ванны с душевой стойкой', [705, 110], { specs: 'душевая стойка, высота 2200 мм', notes: SRC });
  pl('bath', 'curtainrod', 'Карниз и шторка для ванны', [656, 108], { place: 'Вдоль скошенного края ванны' });
  pl('bath', 'basin', 'Раковина накладная', [609, 70], { specs: '600 × 340 × 110 мм', notes: SRC });
  pl('bath', 'basinmixer', 'Смеситель раковины', [609, 58]);
  pl('bath', 'mirror', 'Круглое зеркало с подсветкой', [609, 55]);
  pl('bath', 'drain', 'Сифоны и выпуски', [609, 80]);
  pl('wc', 'install', 'Инсталляция', [755, 63], { specs: 'зона 1000 мм вдоль стены, глубина 300 мм, короб до 1200 мм', notes: SRC_WC });
  pl('wc', 'toilet', 'Унитаз подвесной', [752, 92], { specs: 'высота 400 мм, ось в 450 мм от стены', notes: SRC_WC });
  pl('wc', 'flush', 'Кнопка смыва', [755, 74], { specs: 'на коробе инсталляции, ≈ 1000 мм от пола' });
  pl('wc', 'basin', 'Раковина подвесная', [806, 151], { specs: '500 × 250 × 100 мм, верх на высоте 900 мм', notes: SRC_WC });
  pl('wc', 'basinmixer', 'Смеситель раковины', [812, 151]);
  pl('wc', 'boiler', 'Водонагреватель', [800, 88], { notes: 'Автомат «Водонагреватель С/У» C32' });
  pl('wc', 'filters', 'Фильтры грубой очистки, счётчики воды, редуктор', [740, 70]);
  pl('kitchen', 'sink', 'Кухонная мойка', [962, 76]);
  pl('kitchen', 'mixer', 'Кухонный смеситель', [962, 62]);
  pl('kitchen', 'disposer', 'Измельчитель пищевых отходов', [962, 85]);

  // ---- бытовая техника ----
  const ap = (room, key, name, at, extra) => add(room, 'appliances', key, name, { at, ...extra });
  ap('kitchen', 'hob', 'Варочная панель', [920, 140]);
  ap('kitchen', 'oven', 'Духовой шкаф', [921, 205]);
  ap('kitchen', 'microwave', 'Микроволновая печь встроенная', [921, 190]);
  ap('kitchen', 'hood', 'Вытяжка', [920, 70]);
  ap('kitchen', 'dishwasher', 'Посудомоечная машина', [1010, 80]);
  ap('kitchen', 'fridge', 'Холодильник', [921, 243]);
  ap('kitchen', 'coffee', 'Кофемашина', [1150, 75]);
  ap('bath', 'washer', 'Стиральная машина', [550, 80], { brand: 'Bosch', place: 'Колонна, нижний ярус (0–900 мм)' });
  ap('bath', 'dryer', 'Сушильная машина', [550, 80], { brand: 'Bosch', place: 'Колонна, над стиральной машиной (900–1722 мм)' });
  ap('bedroom', 'tv', 'Телевизор', [970, 512], { place: 'На комоде' });
  ap('living', 'vacuum', 'Робот-пылесос', [760, 345]);
  ap('hall', 'vacuumdock', 'База робота-пылесоса', [760, 330]);

  // ---- климат ----
  for (const d of DEVICES.filter((x) => x.type === 'ac')) {
    add(d.room, 'climate', 'ac', 'Кондиционер: внутренний блок', { at: d.at, deviceId: d.id });
    add(d.room, 'climate', 'acout', 'Кондиционер: наружный блок', { at: d.at });
    add(d.room, 'climate', 'acfilter', 'Кондиционер: фильтры', { at: d.at });
  }
  add('wc', 'climate', 'fan', 'Вытяжной вентилятор', { at: [770, 70] });
  add('bath', 'climate', 'fan', 'Вытяжной вентилятор', { at: [620, 70] });

  // ---- свет ----
  for (const d of DEVICES.filter((x) => x.type === 'light' && x.seed !== false)) {
    const n = d.spots?.length;
    const style = d.pendant ? 'подвес из стеклянных шаров'
      : { chandelier: 'хрустальная люстра с золотым кольцом', ring: 'кольцевая люстра', bedside: 'подвесы-шары у кровати', floor: 'торшер', strip: `LED-лента, высота ${d.y} м` }[d.style]
      || `встроенные споты${n ? ` × ${n}` : ''}`;
    add(d.room, 'lighting', 'fixture', `${d.name}: светильник`, { specs: style, qty: n ? String(n) : '1', at: d.at, deviceId: d.id, notes: d.spots || d.style === 'floor' || d.style === 'strip' ? SRC_LIGHT : '' });
    add(d.room, 'lighting', 'bulb', d.style === 'strip' ? `${d.name}: лента и блок питания` : `${d.name}: лампы`, { specs: 'цоколь, мощность, цветовая температура', qty: n ? String(n) : '', at: d.at });
  }
  add('kitchen', 'lighting', 'ledwork', 'Подсветка рабочей зоны: LED-лента и блок питания', { at: [1030, 90] });
  add('kitchen', 'lighting', 'ledshowcase', 'Подсветка витрин кухни: LED-лента и блок питания', { at: [1040, 70] });
  add('living', 'lighting', 'ledshowcase', 'Подсветка витрины: LED-лента и блок питания', { at: [850, 290] });
  add('kids', 'lighting', 'floorlamp', 'Торшер с перьями: лампа', { at: [318, 248] });
  add('bath', 'lighting', 'mirrorled', 'Подсветка зеркала: LED и блок питания', { at: [608, 55] });

  // ---- электрика ----
  add('hall', 'electric', 'panel', 'Электрощиток (корпус)', { brand: 'Hager', model: 'VF, IP30', at: [738, 567] });
  for (const b of BREAKERS) {
    const kind = { main: 'вводной', rcbo: 'дифавтомат 30 мА, тип ELE', mcb: 'автомат' }[b.kind];
    add('hall', 'electric', `brk-${b.id}`, `Щиток: ${b.title.replace(/­/g, '')}`, {
      brand: b.brand.startsWith('Legrand') ? 'Legrand' : b.brand,
      model: `${b.brand.replace(/^Legrand /, '')} ${b.rating}${b.poles ? ` ${b.poles}P` : ''}`.trim(),
      specs: kind, place: 'Электрощиток', at: [738, 567],
      notes: `Линии: ${b.lines.map((l) => l.text).join('; ')}`,
    });
  }
  for (const r of ROOMS.filter((x) => x.id !== 'loggia')) {
    add(r.id, 'electric', 'sockets', 'Розетки', { qty: '', at: r.label });
    add(r.id, 'electric', 'switches', 'Выключатели', { qty: '', at: r.label });
  }

  // ---- связь ----
  add('hall', 'network', 'lvpanel', 'Слаботочный щит', { at: [790, 640], notes: 'Питание: автомат «Слаботочка» C16' });
  add('hall', 'network', 'ont', 'Модем / оптический терминал провайдера', { at: [790, 640] });
  add('hall', 'network', 'router', 'Wi-Fi роутер', { at: [790, 640] });
  add('hall', 'network', 'switch', 'Коммутатор / патч-корды', { at: [790, 640] });
  add('hall', 'network', 'hub', 'Хаб умного дома (Zigbee / Wi-Fi)', { at: [790, 640] });
  add('hall', 'network', 'provider', 'Провайдер: договор и тариф', { at: [790, 640] });

  // ---- умный дом ----
  const smartName = { leak: 'Датчик протечки', smoke: 'Датчик дыма', motion: 'Датчик движения', contact: 'Датчик открытия двери', lock: 'Умный замок', valve: 'Кран перекрытия воды с электроприводом', camera: 'Камера', heating: 'Тёплый пол (управление)' };
  for (const d of DEVICES.filter((x) => smartName[x.type])) {
    add(d.room, 'smart', d.type, smartName[d.type], { at: d.at || center(d.r), deviceId: d.id, specs: ['leak', 'smoke', 'motion', 'contact'].includes(d.type) ? 'тип батарейки' : '' });
  }

  // ---- шторы ----
  for (const d of DEVICES.filter((x) => x.type === 'curtain')) {
    const c = center(d.r);
    add(d.room, 'textile', 'curtain', d.single ? 'Штора (одно полотно)' : 'Шторы', { at: c, specs: d.room === 'bedroom' ? 'оливково-коричневые' : d.room === 'kids' ? 'светлые' : 'золотисто-горчичные' });
    add(d.room, 'textile', 'motor', 'Электрокарниз (мотор, профиль, бегунки)', { at: c, deviceId: d.id });
    add(d.room, 'textile', 'tulle', 'Тюль', { at: c });
  }

  // ---- мебель и декор ----
  const furnName = (f, room) => {
    switch (f.type) {
      case 'bed': return ['furniture', 'Кровать двуспальная'];
      case 'daybed': return ['furniture', 'Диван-кровать (розовый велюр)'];
      case 'desk': return ['furniture', 'Письменный стол'];
      case 'chair': return ['furniture', room === 'kitchen' ? 'Стул обеденный (оливковый велюр, золотые ножки)' : 'Стул'];
      case 'cabinet': return ['furniture', f.style === 'console' ? 'Консоль (чёрный поднос, золотые ножки)' : room === 'wc' ? 'Короб инсталляции и шкаф над ним' : 'Тумба'];
      case 'wardrobe': return ['furniture', room === 'dressing' ? 'Стеллаж гардеробной' : room === 'wc' ? 'Хозяйственный шкаф' : room === 'bath' ? 'Шкаф в нише стены' : 'Шкаф'];
      case 'rug': return ['textile', f.style === 'geo' ? 'Ковёр чёрно-белый геометрический' : 'Ковёр'];
      case 'armchair': return ['furniture', f.style === 'round' ? 'Кресло круглое (серый велюр, золотой кант)' : room === 'kids' ? 'Кресло-качалка' : 'Кресло'];
      case 'vanity': return ['furniture', 'Тумба под раковину (рифлёный фасад)'];
      case 'kitchenRun': return ['furniture', f.showcases ? 'Кухонный гарнитур: верхние шкафы с витринами, нижние модули' : 'Кухонный гарнитур: угловая часть'];
      case 'tallUnit': return ['furniture', 'Колонна под духовку и СВЧ'];
      case 'fridge': return ['furniture', 'Колонна под холодильник'];
      case 'table': return ['furniture', 'Обеденный стол (мрамор, золотое основание)'];
      case 'sofa': return ['furniture', 'Диван светлый на золотых ножках'];
      case 'roundTable': return ['furniture', f.style === 'white' ? 'Прикроватная тумба (белая, рифлёная)' : 'Журнальный столик (золото, чёрное основание)'];
      case 'showcase': return ['furniture', 'Витрина в стене (чёрная рама, стекло)'];
      case 'mirror': return ['finish', 'Зеркальные панели на стене'];
      case 'barCart': return ['furniture', 'Барная тележка'];
      case 'plant': return ['decor', 'Растение в кашпо'];
      case 'headboard': return ['furniture', 'Мягкое изголовье во всю стену'];
      case 'dresser': return ['furniture', 'Комод (кремовый, золотые ручки)'];
      case 'bench': return ['furniture', 'Скамья (зелёные опоры)'];
      case 'art': return ['decor', 'Картина «Тропическая птица»'];
      case 'roundMirror': return ['decor', room === 'bath' ? null : 'Круглое зеркало в золотой раме'];
      case 'featherLamp': return ['decor', 'Торшер с перьями'];
      case 'washer': return ['furniture', 'Ниша-колонна под стиральную и сушильную машины со шкафом'];
      case 'vase': return ['decor', null];
      case 'cornerBath': case 'towelRail': case 'wallSink': case 'toilet': case 'hob': case 'sink': return ['', null];
      default: return ['furniture', null];
    }
  };
  const seen = {};
  for (const f of FURNITURE) {
    const at = f.at || (f.r ? center(f.r) : f.pts[0]);
    const room = f.room || roomAt(at);
    const [cat, name] = furnName(f, room);
    if (!name) continue;
    const key = `${room}|${name}`;
    if (seen[key]) { seen[key].qty = String(Number(seen[key].qty) + 1); continue; }
    add(room, cat, f.type, name, { at, specs: f.r ? `${m(Math.abs(f.r[2] - f.r[0]))} × ${m(Math.abs(f.r[3] - f.r[1]))} м по плану` : '' });
    seen[key] = items[items.length - 1];
  }

  for (const it of items) {
    it.at = it.at ? it.at.map((v) => Math.round(v)) : null;
    Object.assign(it, PATCHES[it.id] || {});
  }
  return items;
}

export const CEILING_HEIGHT = CEILING;
