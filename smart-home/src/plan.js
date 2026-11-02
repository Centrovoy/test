// Геометрия квартиры, снятая с плана (assets/plan.webp).
// Все координаты — в пикселях исходного плана, ось X вправо, ось Y вниз.
// Масштаб подобран по мебели и дверям: ~70 px = 1 м.
// Прямоугольники задаются как [x1, y1, x2, y2].

export const PX_PER_M = 70;
export const CEILING = 2.7;
export const PLAN_CENTER = [617, 384];

// Перевод координат плана в метры сцены (центр квартиры — начало координат).
export const mx = (x) => (x - PLAN_CENTER[0]) / PX_PER_M;
export const mz = (y) => (y - PLAN_CENTER[1]) / PX_PER_M;

const W = (x1, y1, x2, y2) => ({ r: [x1, y1, x2, y2], kind: 'wall' });
// окна панорамные — от пола до потолка
const WIN = (x1, y1, x2, y2, sill = 0, head = 2.62) => ({ r: [x1, y1, x2, y2], kind: 'window', sill, head });
const DOOR = (x1, y1, x2, y2, head = 2.1) => ({ r: [x1, y1, x2, y2], kind: 'door', head });

export const WALLS = [
  // наружный контур
  W(38, 33, 1197, 52),
  W(38, 52, 52, 62), WIN(38, 62, 52, 253), W(38, 253, 52, 263),
  W(38, 263, 735, 282),
  W(685, 282, 735, 600), W(685, 600, 712, 615), DOOR(685, 615, 712, 690), W(685, 690, 712, 735),
  W(685, 712, 1197, 735),
  W(1180, 52, 1197, 62), WIN(1180, 62, 1197, 253), W(1180, 253, 1197, 263),
  W(1088, 263, 1197, 282),
  W(1180, 282, 1197, 292), WIN(1180, 292, 1197, 485), W(1180, 485, 1197, 507),
  W(1100, 495, 1197, 507),
  WIN(1185, 507, 1197, 712),
  W(1085, 495, 1100, 515), WIN(1085, 515, 1100, 700), W(1085, 700, 1100, 712),

  // перегородки
  W(390, 52, 400, 185), DOOR(390, 185, 400, 255), W(390, 255, 400, 263),
  W(400, 176, 412, 183), DOOR(412, 176, 452, 183), W(452, 176, 525, 183),
  W(490, 52, 525, 176),
  W(525, 176, 545, 183), DOOR(545, 176, 600, 183), W(600, 176, 715, 183),
  W(712, 52, 722, 183),
  W(722, 176, 728, 183), DOOR(728, 176, 770, 183), W(770, 176, 828, 183),
  W(815, 52, 828, 183),
  W(885, 52, 897, 190), DOOR(885, 190, 897, 250), W(885, 250, 897, 263),
  W(810, 263, 890, 282),
  W(808, 495, 1085, 502),
  W(808, 502, 820, 518), DOOR(808, 518, 820, 582), W(808, 582, 850, 592), W(840, 592, 850, 712),
];

// Помещения: прямоугольники пола, тип покрытия, точка для подписи, стартовые климат-данные.
export const ROOMS = [
  { id: 'kids', name: 'Детская', rects: [[52, 52, 390, 263]], floor: 'wood', label: [220, 170], temp: 23.4, hum: 44 },
  { id: 'dressing', name: 'Гардероб', rects: [[400, 52, 490, 176]], floor: 'wood', label: [445, 130], temp: 22.8, hum: 42 },
  { id: 'bath', name: 'Ванная', rects: [[525, 52, 712, 176]], floor: 'tile', label: [585, 100], temp: 24.6, hum: 61 },
  { id: 'wc', name: 'Санузел', rects: [[722, 52, 815, 176]], floor: 'tile', label: [760, 140], temp: 23.9, hum: 55 },
  { id: 'corridor', name: 'Коридор', rects: [[400, 183, 885, 263], [735, 263, 810, 282]], floor: 'wood', label: [640, 225], temp: 22.6, hum: 43 },
  { id: 'kitchen', name: 'Кухня-столовая', rects: [[897, 52, 1180, 263]], floor: 'wood', label: [1010, 200], temp: 23.1, hum: 46 },
  { id: 'living', name: 'Гостиная', rects: [[808, 263, 1180, 495]], floor: 'wood', label: [1000, 300], temp: 23.0, hum: 45 },
  { id: 'hall', name: 'Прихожая', rects: [[712, 282, 808, 712]], floor: 'wood', label: [760, 560], temp: 22.1, hum: 41 },
  { id: 'bedroom', name: 'Спальня', rects: [[820, 502, 1085, 712]], floor: 'wood', label: [960, 535], temp: 24.8, hum: 47 },
  { id: 'loggia', name: 'Лоджия', rects: [[1100, 507, 1185, 712]], floor: 'loggia', label: [1142, 560], temp: 19.5, hum: 52 },
];

// Мебель. type определяет, как объект строится в scene.js.
// Внешний вид и расстановка — по фотографиям интерьера.
export const FURNITURE = [
  // детская: шкафы и дверь на восточной стене, розовая кровать вдоль северной стены,
  // круглое зеркало над тумбой, лампа с перьями и кресло-качалка у двери
  { type: 'wardrobe', r: [330, 55, 390, 182], h: 2.6, panels: 'w' },
  { type: 'daybed', r: [85, 55, 235, 125] },
  { type: 'cabinet', r: [240, 55, 285, 82], h: 0.6 },
  { type: 'vase', at: [262, 66], y: 0.6 },
  { type: 'roundMirror', at: [262, 53], face: 's', rad: 0.42, y: 1.45 },
  { type: 'desk', r: [72, 222, 180, 263] },
  { type: 'chair', at: [118, 205], color: 'cabinet' },
  { type: 'rug', r: [110, 135, 320, 225], style: 'soft' },
  { type: 'featherLamp', at: [318, 248] },
  { type: 'armchair', at: [258, 214], rot: -Math.PI * 0.65 },
  // гардероб
  { type: 'wardrobe', r: [400, 55, 490, 92], h: 2.5 },
  { type: 'wardrobe', r: [455, 92, 490, 170], h: 2.5 },
  // ванная: колонна стиральная+сушильная машины, рифлёная тумба с круглым зеркалом, ванна со шторкой
  { type: 'washer', r: [528, 57, 577, 105] },
  { type: 'vanity', r: [577, 55, 640, 92] },
  { type: 'roundMirror', at: [608, 53.5], face: 's', rad: 0.42, y: 1.5, lit: true },
  { type: 'bathtub', r: [640, 57, 710, 174] },
  // санузел
  { type: 'cabinet', r: [722, 55, 785, 75], h: 1.15, color: 'vanity' },
  { type: 'toilet', at: [748, 98] },
  { type: 'wardrobe', r: [785, 55, 815, 118], h: 2.2, color: 'vanity' },
  { type: 'vanity', r: [790, 122, 815, 152] },
  // коридор
  { type: 'wardrobe', r: [828, 85, 885, 132], h: 2.5, panels: 's' },
  { type: 'wardrobe', r: [865, 132, 885, 180], h: 2.5 },
  // кухня: колонна с духовкой и СВЧ слева, светлые низы, тауп верх с двумя витринами, чёрный фартук
  { type: 'kitchenRun', r: [897, 55, 1155, 97], showcases: [990, 1080] },
  { type: 'kitchenRun', r: [897, 97, 945, 175] },
  { type: 'tallUnit', r: [897, 175, 945, 222] },
  { type: 'fridge', r: [897, 222, 945, 263] },
  { type: 'hob', at: [920, 140] },
  { type: 'sink', at: [962, 76] },
  // столовая: овальный мраморный стол на золотом основании, оливковые стулья, букет
  { type: 'table', r: [1040, 152, 1160, 206] },
  { type: 'vase', at: [1100, 179], y: 0.77, flowers: true },
  { type: 'chair', at: [1072, 138] }, { type: 'chair', at: [1128, 138] },
  { type: 'chair', at: [1072, 222], face: Math.PI }, { type: 'chair', at: [1128, 222], face: Math.PI },
  // гостиная: диван спинкой к стене с обоями, консоль у окна, круглое кресло у колонны,
  // золотые столики на ч/б ковре, витрина в стене у кухни, зеркальная стена и барная тележка
  { type: 'rug', r: [868, 318, 1088, 438], style: 'geo' },
  { type: 'sofa', r: [900, 440, 1080, 492], back: 's' },
  { type: 'roundTable', at: [985, 388], rad: 22, h: 0.48 },
  { type: 'roundTable', at: [1028, 398], rad: 17, h: 0.4 },
  { type: 'armchair', at: [1132, 318], style: 'round', rot: -Math.PI * 0.2 },
  { type: 'cabinet', r: [1100, 466, 1160, 492], h: 0.75, style: 'console' },
  { type: 'showcase', r: [822, 282, 878, 293], h: 2.6, face: 's' },
  { type: 'mirror', r: [735, 290, 738, 450] },
  { type: 'barCart', at: [757, 300] },
  { type: 'plant', at: [868, 472], big: true },
  // спальня: изголовье во всю стену у оливковой стены, белые рифлёные тумбы,
  // комод с ТВ и шкаф вдоль перегородки
  { type: 'headboard', r: [860, 700, 1065, 712] },
  { type: 'bed', r: [905, 562, 1018, 700], head: 's' },
  { type: 'roundTable', at: [883, 682], rad: 15, style: 'white' },
  { type: 'roundTable', at: [1039, 682], rad: 15, style: 'white' },
  { type: 'wardrobe', r: [822, 502, 878, 545], h: 2.6, panels: 's' },
  { type: 'dresser', r: [878, 502, 1065, 528] },
  // лоджия
  { type: 'armchair', at: [1145, 655] },
  { type: 'plant', at: [1165, 530] },
  // прихожая: белые шкафы с золотыми ручками, зелёная скамья и картина в торце
  { type: 'wardrobe', r: [808, 598, 840, 712], h: 2.6, panels: 'w' },
  { type: 'bench', r: [738, 697, 798, 712] },
  { type: 'art', r: [742, 709.5, 794, 712], y0: 1.0, y1: 1.8 },
];

// Акцентные стены: тонкие панели поверх стен.
export const ACCENTS = [
  { r: [52, 52, 330, 54.5], color: 'wallKids' },
  { r: [52, 260.5, 350, 263], color: 'wallKids' },
  { r: [850, 709, 1085, 712], color: 'wallOlive' },
  { r: [820, 492, 1085, 495], color: 'wallpaper', trim: true },
];

// Устройства умного дома.
// at — точка на плане, h — высота установки (м).
export const DEVICES = [
  // освещение
  { id: 'light.kids', type: 'light', room: 'kids', name: 'Люстра', at: [220, 160], style: 'ring' },
  { id: 'light.dressing', type: 'light', room: 'dressing', name: 'Свет', at: [440, 135] },
  { id: 'light.bath', type: 'light', room: 'bath', name: 'Свет', at: [610, 120] },
  { id: 'light.wc', type: 'light', room: 'wc', name: 'Свет', at: [760, 120] },
  { id: 'light.corridor', type: 'light', room: 'corridor', name: 'Споты', at: [640, 222] },
  { id: 'light.kitchen', type: 'light', room: 'kitchen', name: 'Споты на кухне', at: [970, 150] },
  { id: 'light.dining', type: 'light', room: 'kitchen', name: 'Подвес над столом', at: [1100, 180], pendant: true },
  { id: 'light.living', type: 'light', room: 'living', name: 'Люстра', at: [990, 385], style: 'chandelier' },
  { id: 'light.hall', type: 'light', room: 'hall', name: 'Свет', at: [760, 620] },
  { id: 'light.bedroom', type: 'light', room: 'bedroom', name: 'Люстра', at: [960, 600], style: 'ring' },
  { id: 'light.bedside', type: 'light', room: 'bedroom', name: 'Подвесы у кровати', at: [961, 682], style: 'bedside' },
  { id: 'light.loggia', type: 'light', room: 'loggia', name: 'Бра', at: [1142, 600] },

  // шторы
  { id: 'curtain.kids', type: 'curtain', room: 'kids', name: 'Шторы', r: [55, 62, 62, 253], axis: 'z', color: 'curtainKids' },
  { id: 'curtain.kitchen', type: 'curtain', room: 'kitchen', name: 'Шторы', r: [1170, 105, 1177, 253], axis: 'z' },
  { id: 'curtain.living', type: 'curtain', room: 'living', name: 'Шторы', r: [1170, 292, 1177, 485], axis: 'z' },
  { id: 'curtain.bedroom', type: 'curtain', room: 'bedroom', name: 'Шторы', r: [1075, 515, 1082, 700], axis: 'z', color: 'curtainBedroom', single: 'end' },

  // климат
  { id: 'ac.kids', type: 'ac', room: 'kids', name: 'Кондиционер', at: [388, 220], face: 'w' },
  { id: 'ac.living', type: 'ac', room: 'living', name: 'Кондиционер', at: [1175, 440], face: 'w' },
  { id: 'ac.bedroom', type: 'ac', room: 'bedroom', name: 'Кондиционер', at: [822, 550], face: 'e' },
  { id: 'heating.bath', type: 'heating', room: 'bath', name: 'Тёплый пол', r: [528, 108, 640, 174] },

  // датчики
  { id: 'leak.bath', type: 'leak', room: 'bath', name: 'Датчик протечки', at: [552, 112] },
  { id: 'leak.wc', type: 'leak', room: 'wc', name: 'Датчик протечки', at: [770, 110] },
  { id: 'leak.kitchen', type: 'leak', room: 'kitchen', name: 'Датчик протечки', at: [962, 90] },
  { id: 'smoke.kitchen', type: 'smoke', room: 'kitchen', name: 'Датчик дыма', at: [1010, 120] },
  { id: 'motion.corridor', type: 'motion', room: 'corridor', name: 'Датчик движения', at: [500, 255] },
  { id: 'motion.hall', type: 'motion', room: 'hall', name: 'Датчик движения', at: [722, 520] },
  { id: 'door.entrance', type: 'contact', room: 'hall', name: 'Входная дверь', at: [700, 652] },

  // безопасность и техника
  { id: 'lock.entrance', type: 'lock', room: 'hall', name: 'Умный замок', at: [716, 640] },
  { id: 'valve.water', type: 'valve', room: 'wc', name: 'Кран воды', at: [728, 68] },
  { id: 'camera.entrance', type: 'camera', room: 'hall', name: 'Камера', at: [800, 700] },
  { id: 'tv.bedroom', type: 'tv', room: 'bedroom', name: 'Телевизор', at: [970, 503] },
  { id: 'washer.bath', type: 'washer', room: 'bath', name: 'Стиральная машина', at: [552, 80] },
  { id: 'vacuum', type: 'vacuum', room: 'living', name: 'Робот-пылесос', at: [760, 345] },
];

// Маршрут робота-пылесоса (точки плана).
export const VACUUM_PATH = [
  [760, 345], [850, 310], [1080, 300], [1160, 390], [1090, 430], [870, 430], [850, 310],
  [1000, 270], [980, 240], [1000, 120], [1170, 120], [1170, 240], [1030, 240], [960, 270],
  [880, 300], [760, 345],
];
