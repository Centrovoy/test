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

// Пол во всех жилых комнатах, коридоре, прихожей и кладовой.
const FLOOR = {
  brand: 'BerryAlloc', model: 'Chateau Walnut Brown (орех коричневый)', sku: '62002166 / 62002167',
  specs: 'бельгийский ламинат, 32 класс, укладка «ёлочкой» (два артикула — левые и правые планки), на клей Uzin MK 160',
  supplier: 'triopol.by', link: 'https://triopol.by/product/belgiyskiy-laminat-berryalloc-walnut-brown-oreh-korichnevyiy-62002166-62002167-chateau-32-klass-6031/',
};
const SRC_WC = 'По развёртке санузла (дизайн-проект)';
const SRC_LIGHT = 'По плану освещения (выполнен вариант 1)';
const SRC_SOCK = 'По плану розеток';
const SRC_KITCHEN = 'По развёртке кухни (дизайн-проект)';
const ORDER = 'Заказ-наряд № 13/07-1 от 13.07.2022';
const TILE = { brand: 'Уральский гранит', model: 'UF010 MR', specs: 'керамогранит 60 × 60 см', supplier: 'Керамокомплект — keramokomplekt.by', link: 'https://keramokomplekt.by/contact/' };
const DOORS_SHOP = { supplier: 'Urban Style Doors — instagram.com/urban_style_doors', link: 'https://www.instagram.com/urban_style_doors' };
const RUDENKO = { supplier: 'Студия Руденко (шторы, подушки) — instagram.com/studio.rudenko', link: 'https://www.instagram.com/studio.rudenko' };
const CLEAN = 'Химчистка мебели: Чисто Хата — instagram.com/chisto_hata';
const PAINT_MILK = { brand: 'Caparol', model: 'Samtex 10 E.L.F., Base 1', sku: 'цвет SIENA 30', specs: 'краска ВД-ВАЭ цветная, молочная; тара 10 л / 14 кг' };
const PAINT_GREEN = { brand: 'Caparol', model: 'Samtex 10 E.L.F., Base 3', sku: 'цвет TUNDRA 85', specs: 'краска ВД-ВАЭ цветная, зелёная (спальня за изголовьем и лоджия); тара 2,35 л' };
const SPOT_BULB = { brand: 'SAPRA', model: 'LM1095E', specs: 'LED, цоколь GU10, 9,5 Вт, 4000 K (нейтральный белый), 750 лм, 220–240 В', notes: 'Одинаковые во всех встроенных спотах квартиры (подтверждено владельцем); фото маркировки в документах' };
const WIRING = { brand: 'Schneider Electric', model: 'AtlasDesign, бежевый' };
const CABINET_FINISH = { specs: 'фасады окрашены RAL 9001 Cream, корпус — ДСП яркий серый' };

// Межкомнатные двери по заказ-наряду; сторона открытия — со стороны коридора.
const DOOR_ORDER = {
  bedroom: { n: 1, hole: '897 × 2080', wall: 135, leaf: '800 × 2010', open: 'от себя', price: '613,00', mech: 'магнитный замок AGB Polaris, 2 скрытые петли 3.0' },
  storage: { n: 2, hole: '894 × 2110', wall: 145, leaf: '800 × 2000', open: 'на себя', price: '513,00', mech: '2 скрытые петли AGB 3.0' },
  bath: { n: 3, hole: '780 × 2095', wall: 140, leaf: '700 × 2000', open: 'на себя', price: '513,00', mech: '2 скрытые петли AGB 3.0' },
  wc: { n: 4, hole: '700 × 2107', wall: 140, leaf: '600 × 2000', open: 'на себя', price: '513,00', mech: '2 скрытые петли AGB 3.0' },
  dressing: { n: 5, hole: '810 × 2095', wall: 140, leaf: '700 × 2000', open: 'на себя', price: '513,00', mech: '2 скрытые петли AGB 3.0' },
  kids: { n: 6, hole: '870 × 2112', wall: 145, leaf: '790 × 2010', open: 'от себя', price: '613,00', mech: '3 скрытые петли AGB 3.0' },
};

// Уточнения из чертежей: дополняют записи, собранные по плану.
const PATCHES = {
  'bath.ceiling': { specs: 'высота 2622 мм', notes: SRC },
  'bath.vanity': { specs: 'длина 1000 мм, скос тумбы параллелен скосу ванны; под накладную раковину 600 × 340', notes: SRC },
  'bath.washer-2': { name: 'Ниша-колонна под стиральную и сушильную машины со шкафом', specs: '700 × 700 мм; стиральная 0–900, сушильная 900–1722, шкаф 1722–2622 мм', notes: SRC },
  'bath.wardrobe': { specs: '480 × 400 мм, высота 2622 мм, в нише стены у двери', notes: SRC },
  'kitchen.kitchenRun': { name: 'Кухня: длинная сторона (у окна)', specs: '3600 мм: угол 600, мойка 600, посудомойка 600, ящики 900 + 900; верх: угол 300 + 150 + 7 × 450, 2 витрины со стеклом; столешница h 930, фартук 600, верх 1070 мм; ручки — профиль Gola', notes: SRC_KITCHEN },
  'kitchen.kitchenRun-2': { name: 'Кухня: короткая сторона (варочная)', specs: 'угол 600, модуль под варочную 1060 мм; ручки — профиль Gola', notes: SRC_KITCHEN },
  'kitchen.tallUnit': { specs: '600 мм, высота 2600 мм: духовой шкаф и СВЧ', notes: SRC_KITCHEN },
  'kitchen.fridge-2': { specs: '700 мм, ниша до 2100 мм + антресоль 500 мм', notes: SRC_KITCHEN },
  'kitchen.filler': { name: 'Торцевая планка кухни', specs: '240 мм, во всю высоту 2600 мм', notes: SRC_KITCHEN },
  'kitchen.ceiling': { specs: 'высота 2622 мм' },
  // поставщики и материалы, указанные владельцем (личные телефоны мастеров — только в базе артефакта)
  'bath.floor': TILE, 'bath.walltile': TILE, 'wc.floor': TILE, 'wc.walltile': TILE,
  'living.fixture': { brand: 'Odeon Light', model: 'Focco' },
  'kitchen.table': { name: 'Обеденный стол (столешница из керамогранита, золотое основание)', supplier: 'Grant Stone — instagram.com/grant_stone.by', link: 'https://www.instagram.com/grant_stone.by' },
  'kids.desk': { name: 'Письменный стол с тремя ящиками', specs: '1600 × 700 мм, высота 750 мм, царга 160 мм с тремя ящиками; кремовый, П-образные опоры из золотого металла; стоит над радиатором', notes: 'Договор № 28/06/23 от 28.06.2023, приложение 1 (эскиз); проект — ИП Ращеня А. А.' },
  'storage.fixture': { name: 'Свет: светильник', brand: 'Eleganz', model: 'встраиваемый потолочный, безрамочный круглый', specs: '36 Вт, 3000 K, встроенный светодиод', qty: '1', link: 'https://ozon.by/t/5DVAYsV', supplier: 'Ozon' },
  'storage.bulb': { name: 'Свет: лампы', brand: '', model: '', specs: 'не требуются — светодиоды встроены в светильник Eleganz', qty: '', notes: '' },
  'bath.drain': { name: 'Сифон для ванны', brand: 'McAlpine', model: 'MRB12', specs: 'хром, с прочисткой снаружи, слив-перелив', link: 'https://ozon.by/t/zLJsaq6', supplier: 'Ozon' },
  'bath.mirrorled': { name: 'Подсветка зеркала: блок питания', brand: 'Ecola', model: 'блок питания 100 Вт 220–12 В IP67', specs: 'для светодиодной ленты подсветки зеркала', link: 'https://ozon.by/t/9oKMQ81', supplier: 'Ozon' },
  'kids.thermo': { brand: 'ZEISSLER', model: 'Термоголовка 6–28 °C, белая', specs: 'жидкостная, резьба M30 × 1,5, регулировка 6–28 °C, рабочее давление 10 бар', price: '25,72 BYN' },
  'hall.wardrobe': CABINET_FINISH, 'bedroom.wardrobe': CABINET_FINISH,
  'bedroom.roundTable': { name: 'Прикроватная тумба слева', brand: 'Hi!moon', model: 'Журнальный столик «Мира» в эмали', qty: '1', place: 'слева от кровати', supplier: 'himoon.shop', price: '483–761 $ (зависит от размера)', at: [883, 682] },
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
      add(r.id, 'finish', 'floor', 'Ламинат «ёлочка»', { ...FLOOR, at });
      add(r.id, 'finish', 'skirting', 'Плинтус', { at });
    } else if (r.floor === 'tile') {
      add(r.id, 'finish', 'floor', 'Керамогранит пола', { specs: 'бежевый', at });
      add(r.id, 'finish', 'walltile', 'Керамогранит стен', { specs: 'бежевый', at });
      add(r.id, 'finish', 'grout', 'Затирка швов', { at });
    } else {
      add(r.id, 'finish', 'floor', 'Покрытие пола', { at });
    }
    // стены: молочный SIENA 30 везде, зелёный TUNDRA 85 — на лоджии и за изголовьем в спальне
    const extra = { bedroom: '; стена за изголовьем — зелёная, отдельная позиция', living: '; за диваном — обои с золотыми линиями' }[r.id] || '';
    if (r.floor !== 'tile') add(r.id, 'finish', 'paint', 'Краска стен', r.id === 'loggia' ? { ...PAINT_GREEN, at } : { ...PAINT_MILK, specs: PAINT_MILK.specs + extra, at });
    if (r.id === 'bedroom') add(r.id, 'finish', 'paint-accent', 'Краска стены за изголовьем', { ...PAINT_GREEN, place: 'стена за изголовьем кровати', at: [960, 705] });
    add(r.id, 'finish', 'ceiling', 'Потолок натяжной тканевый', { at });
    if (r.id === 'kids') add(r.id, 'finish', 'fresco', 'Фреска на стене', { place: 'стена за диваном-кроватью', at: [190, 55] });
  }
  add('hall', 'finish', 'floorglue', 'Клей для пола', {
    brand: 'Uzin', model: 'MK 160', specs: 'силановый клей для паркета, ведро 16 кг', place: 'Под ламинатом во всех комнатах с «ёлочкой»',
    supplier: 'evroparket.by', link: 'https://evroparket.by/klei-parket/uzin-mk-160-silanovyj-klej-dlya-parketa-16kg-more', at: [760, 450],
  });
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
  const doorNames = { hall: 'Входная дверь', kids: 'Дверь в детскую', dressing: 'Дверь в гардероб', bath: 'Дверь в ванную', wc: 'Дверь в санузел', kitchen: 'Дверь на кухню', bedroom: 'Дверь в спальню', storage: 'Дверь в кладовую' };
  for (const d of WALLS.filter((x) => x.kind === 'door')) {
    const [x1, y1, x2, y2] = d.r;
    const c = center(d.r);
    const room = x1 === 685 ? 'hall' : x1 === 390 ? 'kids' : x1 === 412 ? 'dressing' : x1 === 557 ? 'bath' : x1 === 726 ? 'wc' : x1 === 828 ? 'storage' : x1 === 885 ? 'kitchen' : 'bedroom';
    const name = doorNames[room];
    const size = `проём ${m(Math.max(x2 - x1, y2 - y1))} × ${d.head.toFixed(2)} м`;
    const o = DOOR_ORDER[room];
    if (o) {
      const open = o.open === 'от себя' ? 'открывается от себя (из коридора внутрь)' : 'открывается на себя (в коридор)';
      add(room, 'doors', 'door', `${name}: полотно и коробка`, {
        model: 'ФГ (гладкая)', specs: `полотно ${o.leaf} мм, проём ${o.hole} мм, толщина стены ${o.wall} мм; цвет П127; ${open}; наличники: 4 стандартных + 1 шириной 10 см (у колонны)`,
        price: o.price, place: o.open, at: c, notes: `${ORDER}, строка ${o.n}`, ...DOORS_SHOP,
      });
      add(room, 'doors', 'handle', `${name}: механизм и петли`, { specs: o.mech, qty: '', at: c, notes: `${ORDER}, строка ${o.n}`, ...DOORS_SHOP });
    } else {
      add(room, 'doors', 'door', `${name}: полотно и коробка`, { specs: size, at: c });
      add(room, 'doors', 'handle', `${name}: ручка, защёлка, петли`, { at: c });
    }
    if (room === 'hall') {
      add(room, 'doors', 'closer', 'Входная дверь: доводчик', { at: c });
      add(room, 'doors', 'cylinder', 'Входная дверь: личинка замка', { at: c });
      add(room, 'doors', 'peephole', 'Входная дверь: глазок', { at: c });
    }
  }

  add('corridor', 'doors', 'extension', 'Доборы дверные', { specs: '2100 × 100 мм, комплекты на все 6 межкомнатных дверей', qty: '6', price: '80,00 за комплект (всего 480,00)', at: [640, 222], notes: ORDER, ...DOORS_SHOP });

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
  pl('kitchen', 'sink', 'Кухонная мойка', [960, 73], { place: 'Над модулем 600 рядом с угловым', brand: 'BLANCO', model: 'DALAGO 6', specs: 'искусственный камень Silgranit, цвет чёрный' });
  pl('kitchen', 'mixer', 'Кухонный смеситель', [962, 62]);
  pl('kitchen', 'disposer', 'Измельчитель пищевых отходов', [962, 85]);

  // ---- бытовая техника ----
  const ap = (room, key, name, at, extra) => add(room, 'appliances', key, name, { at, ...extra });
  ap('kitchen', 'hob', 'Варочная панель', [918, 128], { place: 'Над модулем 1060 мм' });
  ap('kitchen', 'oven', 'Духовой шкаф', [918, 181], { place: 'Колонна 600, нижний' });
  ap('kitchen', 'microwave', 'Микроволновая печь встроенная', [918, 181], { place: 'Колонна 600, над духовкой' });
  ap('kitchen', 'hood', 'Вытяжка встроенная', [918, 128], { place: 'В верхнем шкафу над варочной панелью' });
  ap('kitchen', 'dishwasher', 'Посудомоечная машина встраиваемая', [1002, 73], { specs: 'ширина 600 мм (по факту; в проекте было 450)', place: 'Рядом с мойкой' });
  ap('kitchen', 'fridge', 'Холодильник встраиваемый', [918, 224], { specs: 'ниша 700 мм, высота до 2100 мм', notes: 'Высоту ниши отрегулировать после покупки холодильника (по развёртке)' });
  ap('kitchen', 'coffee', 'Кофемашина', [1150, 75]);
  ap('bath', 'washer', 'Стиральная машина', [550, 80], { brand: 'Bosch', place: 'Колонна, нижний ярус (0–900 мм)' });
  ap('bath', 'dryer', 'Сушильная машина', [550, 80], { brand: 'Bosch', place: 'Колонна, над стиральной машиной (900–1722 мм)' });
  ap('bedroom', 'tv', 'Телевизор', [970, 512], { place: 'На комоде' });
  ap('storage', 'vacuum', 'Робот-пылесос', [848, 168]);
  ap('storage', 'vacuumdock', 'База робота-пылесоса', [848, 178], { place: 'Кладовая (комната пылесоса)' });

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
      : { chandelier: 'хрустальная люстра с золотым кольцом', ring: 'кольцевая люстра', bedside: 'подвесы-шары у кровати', panel: 'круглая встраиваемая панель', floor: 'торшер', strip: `LED-лента, высота ${d.y} м` }[d.style]
      || `встроенные споты${n ? ` × ${n}` : ''}`;
    add(d.room, 'lighting', 'fixture', `${d.name}: светильник`, { specs: style, qty: n ? String(n) : '1', at: d.at, deviceId: d.id, notes: d.spots || d.style === 'floor' || d.style === 'strip' ? SRC_LIGHT : '' });
    add(d.room, 'lighting', 'bulb', d.style === 'strip' ? `${d.name}: лента и блок питания` : `${d.name}: лампы`, { specs: 'цоколь, мощность, цветовая температура', ...(n ? SPOT_BULB : {}), qty: n ? String(n) : '', at: d.at });
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
  // розетки — каждый блок на своём месте по плану розеток
  for (const f of FURNITURE.filter((x) => x.type === 'socket')) {
    const kind = f.n === 1 ? 'Розетка' : `Блок розеток × ${f.n}`;
    add(f.room, 'electric', 'wallsocket', `${kind} ${f.label.replace(/, h \d+$/, '')}${f.net ? ' + интернет' : ''}`, {
      ...WIRING,
      at: f.at, place: f.label, qty: String(f.n),
      specs: `${f.new ? 'новая по проекту' : 'существующая'}, высота ${Math.round(f.h * 1000)} мм`,
      notes: SRC_SOCK,
    });
  }
  add('storage', 'electric', 'sockets', 'Розетки', { ...WIRING, qty: '', at: [856, 120], notes: 'На плане розеток не показаны; кладовка есть в подписи автомата «Кухня»' });
  // выключатели — каждый на своём месте по плану освещения
  for (const f of FURNITURE.filter((x) => x.type === 'switch')) {
    add(f.room, 'electric', 'wallswitch', `Выключатель ${f.label}${f.gang === 2 ? ' (двухклавишный)' : ''}`, {
      ...WIRING,
      at: f.at, place: f.label, specs: f.new ? 'новый по проекту, высота 900 мм' : 'существующий',
      ...(f.room === 'kitchen' ? { specs: 'перенесён с колонны у окна; высота 900 мм, 150 мм от угла стены' } : {}),
      notes: 'По плану освещения (выполнен вариант 1)',
    });
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
    add(d.room, 'textile', 'curtain', d.single ? 'Штора (одно полотно)' : 'Шторы', { at: c, specs: d.room === 'bedroom' ? 'оливково-коричневые' : d.room === 'kids' ? 'светлые' : 'золотисто-горчичные', ...RUDENKO });
    add(d.room, 'textile', 'motor', 'Электрокарниз (мотор, профиль, бегунки)', { at: c, deviceId: d.id });
    add(d.room, 'textile', 'tulle', 'Тюль', { at: c, ...RUDENKO });
  }

  // ---- мебель и декор ----
  const furnName = (f, room) => {
    switch (f.type) {
      case 'bed': return ['furniture', 'Кровать двуспальная'];
      case 'daybed': return ['furniture', 'Диван-кровать (розовый велюр)'];
      case 'desk': return ['furniture', 'Письменный стол'];
      case 'chair': return ['furniture', room === 'kitchen' ? 'Стул обеденный (оливковый велюр, золотые ножки)' : 'Стул'];
      case 'cabinet': return ['furniture', f.style === 'console' ? 'Консоль (чёрный поднос, золотые ножки)' : room === 'wc' ? 'Короб инсталляции и шкаф над ним' : 'Тумба'];
      case 'wardrobe': return ['furniture', room === 'dressing' ? 'Стеллаж гардеробной' : room === 'wc' ? 'Хозяйственный шкаф' : room === 'bath' ? 'Шкаф в нише стены' : room === 'storage' ? 'Стеллаж кладовой' : 'Шкаф'];
      case 'rug': return ['textile', f.style === 'geo' ? 'Ковёр чёрно-белый геометрический' : 'Ковёр'];
      case 'armchair': return ['furniture', f.style === 'round' ? 'Кресло круглое (серый велюр, золотой кант)' : room === 'kids' ? 'Кресло-качалка' : 'Кресло'];
      case 'vanity': return ['furniture', 'Тумба под раковину (рифлёный фасад)'];
      case 'kitchenRun': return ['furniture', f.showcases ? 'Кухонный гарнитур: верхние шкафы с витринами, нижние модули' : 'Кухонный гарнитур: угловая часть'];
      case 'tallUnit': return ['furniture', 'Колонна под духовку и СВЧ'];
      case 'fridge': return ['furniture', 'Колонна под холодильник'];
      case 'filler': return ['furniture', 'Торцевая планка кухни'];
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
      case 'cornerBath': case 'towelRail': case 'wallSink': case 'switch': case 'socket': case 'toilet': case 'hob': case 'sink': return ['', null];
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

  const OZ = (link, extra) => ({ supplier: 'Ozon', link, ...extra });
  add('hall', 'smart', 'doorbell', 'Дверной звонок', OZ('https://ozon.by/t/dweU2Lr', { place: 'у входной двери', at: [700, 640] }));
  add('bath', 'plumbing', 'aerator', 'Аэратор для смесителя', OZ('https://ozon.by/product/beskorpusnoy-aerator-dlya-smesitelya-s-rezboy-m18-3sht-klyuch-2163378362/', { specs: 'бескорпусной, резьба M18; комплект 3 шт + ключ', place: 'смесители раковин в ванной и в туалете', qty: '3', at: [609, 58] }));
  add('kitchen', 'plumbing', 'waterfilter', 'Фильтр питьевой воды: картриджи', OZ('https://ozon.by/t/sXGdkok', { brand: 'Atoll', model: 'набор картриджей № 107 STDA', place: 'под кухонной мойкой (уточнить)', at: [960, 80] }));
  add('kitchen', 'furniture', 'hinge-overlay', 'Мебельные петли для накладных дверей', OZ('https://ozon.by/t/l1kDXOA', { brand: 'BLUM', model: '71B3550 CLIP TOP BLUMOTION', sku: '71B3550 + планка 173L6100', specs: 'открывание 110°, встроенный доводчик, ответная планка 173L6100 под саморез', qty: '4', place: 'корпусная мебель (какие шкафы — уточнить)', at: [1020, 80] }));
  add('kitchen', 'furniture', 'hinge-inset', 'Мебельные петли для вкладных дверей', OZ('https://ozon.by/t/V2BoB4x', { brand: 'BLUM', model: '71B3750 CLIP TOP BLUMOTION', sku: '71B3750 + планка 173L6100', specs: 'внутренние / вкладные, открывание 110°, встроенный доводчик, с заглушками, планка 173L6100 под саморез', qty: '2', place: 'корпусная мебель (какие шкафы — уточнить)', at: [1020, 80] }));
  add('kitchen', 'lighting', 'ledamp', 'LED-подсветка кухни: усилитель', OZ('https://ozon.by/product/usilitel-odnotsvetnyy-5-24v-150-720w-30a-single-amplifier-1614498319/', { model: 'Single Amplifier, одноцветный', specs: '5–24 В, 150–720 Вт, 30 А', at: [1030, 90] }));
  add('kitchen', 'lighting', 'ledpwm', 'LED-подсветка кухни: фильтр ШИМ', OZ('https://ozon.by/t/D42YM7Y', { specs: '20 А', at: [1030, 90] }));
  add('living', 'textile', 'pillows', 'Декоративные подушки', { place: 'диван в гостиной, кровати в спальне и детской', qty: '', at: [1000, 430], ...RUDENKO });
  add('bedroom', 'furniture', 'nightstand-right', 'Прикроватная тумба справа', { place: 'справа от кровати', specs: 'белая, рифлёная, на золотом цоколе', at: [1039, 682] });
  for (const id of ['living.sofa', 'living.armchair', 'kids.daybed', 'kids.armchair', 'bedroom.bed', 'bedroom.headboard', 'kitchen.chair', 'loggia.armchair']) {
    const it = items.find((x) => x.id === id);
    if (it) it.notes = it.notes ? `${it.notes}; ${CLEAN}` : CLEAN;
  }
  for (const it of items) {
    it.at = it.at ? it.at.map((v) => Math.round(v)) : null;
    Object.assign(it, PATCHES[it.id] || {});
  }
  return items;
}

export const CEILING_HEIGHT = CEILING;
