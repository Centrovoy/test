// Геометрия квартиры, снятая с плана (assets/plan.webp).
// Все координаты — в пикселях исходного плана, ось X вправо, ось Y вниз.
// Масштаб подобран по мебели и дверям: ~70 px = 1 м.
// Прямоугольники задаются как [x1, y1, x2, y2].

export const PX_PER_M = 70;
// высота потолка по дизайн-проекту (развёртка ванной): 2622 мм
export const CEILING = 2.62;
export const PLAN_CENTER = [617, 384];

// Перевод координат плана в метры сцены (центр квартиры — начало координат).
export const mx = (x) => (x - PLAN_CENTER[0]) / PX_PER_M;
export const mz = (y) => (y - PLAN_CENTER[1]) / PX_PER_M;

const W = (x1, y1, x2, y2) => ({ r: [x1, y1, x2, y2], kind: 'wall' });
// окна панорамные — от пола до потолка
const WIN = (x1, y1, x2, y2, sill = 0, head = 2.55) => ({ r: [x1, y1, x2, y2], kind: 'window', sill, head });
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
  W(390, 52, 400, 185), DOOR(390, 185, 400, 246), W(390, 246, 400, 263), // проёмы дверей — по заказ-наряду
  W(400, 176, 412, 183), DOOR(412, 176, 469, 183), W(469, 176, 525, 183),
  W(490, 52, 525, 143), W(490, 143, 497, 176), // в западной стене ванной — шкаф в нише 480×400
  W(525, 176, 557, 183), DOOR(557, 176, 612, 183), W(612, 176, 715, 183),
  W(712, 52, 722, 183),
  W(722, 176, 726, 183), DOOR(726, 176, 775, 183), W(775, 176, 828, 183), DOOR(828, 176, 885, 183),
  W(815, 52, 828, 183),
  W(885, 52, 897, 190), DOOR(885, 190, 897, 250), W(885, 250, 897, 263),
  W(810, 263, 890, 282),
  W(808, 495, 1085, 502),
  W(808, 502, 820, 518), DOOR(808, 518, 820, 581), W(808, 581, 850, 592), W(840, 592, 850, 712),
];

// Помещения: прямоугольники пола, тип покрытия, точка для подписи, стартовые климат-данные.
export const ROOMS = [
  { id: 'kids', name: 'Детская', rects: [[52, 52, 390, 263]], floor: 'wood', label: [220, 170], temp: 23.4, hum: 44 },
  { id: 'dressing', name: 'Гардероб', rects: [[400, 52, 490, 176]], floor: 'wood', label: [445, 130], temp: 22.8, hum: 42 },
  { id: 'bath', name: 'Ванная', rects: [[525, 52, 712, 176]], floor: 'tile', label: [585, 100], temp: 24.6, hum: 61 },
  { id: 'wc', name: 'Санузел', rects: [[722, 52, 815, 176]], floor: 'tile', label: [760, 140], temp: 23.9, hum: 55 },
  { id: 'corridor', name: 'Коридор', rects: [[400, 183, 885, 263], [735, 263, 810, 282]], floor: 'wood', label: [640, 225], temp: 22.6, hum: 43 },
  { id: 'storage', name: 'Кладовая', rects: [[828, 52, 885, 183]], floor: 'wood', label: [856, 150], temp: 22.4, hum: 42 },
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
  // ванная — по развёртке из дизайн-проекта (1 мм = 0.07 px):
  // колонна 700×700 в углу, тумба 1000 со скосом вдоль ванны и накладной раковиной 600×340,
  // угловая асимметричная ванна 1600×1000 (узкий край 600), полотенцесушитель у двери,
  // шкаф в нише 480×400 в западной стене
  { type: 'washer', r: [525, 52, 574, 101] },
  { type: 'vanity', r: [574, 52, 644, 87] },
  { type: 'roundMirror', at: [609, 53.5], face: 's', rad: 0.42, y: 1.5, lit: true },
  { type: 'cornerBath', pts: [[712, 52], [712, 164], [642, 164], [670, 52]] },
  { type: 'towelRail', r: [625, 173, 659, 175], y0: 1.12, y1: 1.66 },
  { type: 'wardrobe', r: [497, 143, 525, 176], h: 2.6, color: 'vanity', panels: 'e', room: 'bath' },
  // санузел — по развёртке из дизайн-проекта: инсталляция 1000×300 (короб до 1200,
  // над ним шкаф с двумя дверцами), подвесной унитаз (h 400, ось в 450 мм от стены),
  // хозяйственный шкаф 900×400 до потолка, подвесная раковина 500×250×100 на высоте 900
  { type: 'cabinet', style: 'installation', r: [722, 52, 788, 74], h: 1.2, color: 'vanity' },
  { type: 'toilet', at: [752, 74], hung: true },
  { type: 'wardrobe', r: [788, 52, 815, 118], h: 2.6, color: 'vanity', panels: 'w' },
  { type: 'wallSink', r: [798, 135, 815, 167], y: 0.9 },
  // коридор
  // кладовая (она же комната пылесоса): стеллажи и база робота-пылесоса
  { type: 'wardrobe', r: [828, 55, 885, 95], h: 2.5, panels: 's', room: 'storage' },
  { type: 'wardrobe', r: [865, 95, 885, 150], h: 2.5, room: 'storage' },
  // кухня: колонна с духовкой и СВЧ слева, светлые низы, тауп верх с двумя витринами, чёрный фартук
  // по развёртке кухни: длинная сторона 3600 (угол 600, мойка 600, посудомойка 600,
  // ящики 900 + 900), верх — угол 300 + 150 + 7 × 450, две витрины; короткая сторона
  // 3200 (угол 600, варочная 1060, колонна духовка+СВЧ 600, холодильник 700, планка 240);
  // столешница 930, фартук 600, верхние шкафы 1070, колонны до 2600
  { type: 'kitchenRun', r: [897, 52, 1149, 94], showcases: [991.5, 1054.5], showcaseW: 31.5, dishwasher: [981, 1023] },
  { type: 'kitchenRun', r: [897, 94, 939, 161.5] },
  { type: 'tallUnit', r: [897, 161.5, 939, 201] },
  { type: 'fridge', r: [897, 201, 939, 247] },
  { type: 'filler', r: [897, 247, 939, 263] },
  { type: 'hob', at: [918, 128] },
  { type: 'sink', at: [960, 73] },
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
  { type: 'mirror', r: [735, 290, 738, 450], room: 'living' },
  { type: 'barCart', at: [757, 300], room: 'living' },
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
  { type: 'wardrobe', r: [808, 598, 840, 712], h: 2.6, panels: 'w', room: 'hall' },
  { type: 'bench', r: [738, 697, 798, 712] },
  { type: 'art', r: [742, 709.5, 794, 712], y0: 1.0, y1: 1.8 },

  // выключатели — по плану освещения (вариант 1); new — новые по проекту (h = 900),
  // остальные существующие; face — куда смотрит клавиша
  // выключатель кухни перенесён с колонны у окна на торец стены у колонны холодильника (150 мм от угла, h 900)
  { type: 'switch', at: [879.5, 282.5], face: 's', room: 'kitchen', label: 'у входа в кухню, на стене у колонны холодильника', new: true },
  { type: 'switch', at: [1084.5, 512], face: 'w', room: 'bedroom', label: 'у балконной двери' },
  { type: 'switch', at: [820.5, 510], face: 'e', room: 'bedroom', label: 'у входа в спальню' },
  { type: 'switch', at: [809.5, 268], face: 'w', room: 'corridor', label: 'на торце стены у кухни' },
  { type: 'switch', at: [795, 183.5], face: 's', room: 'corridor', label: 'у двери санузла' },
  { type: 'switch', at: [735.5, 274], face: 'e', room: 'corridor', label: 'на углу у прихожей' },
  { type: 'switch', at: [728, 600.5], face: 's', room: 'hall', label: 'у входной двери' },
  { type: 'switch', at: [628, 183.5], face: 's', room: 'corridor', label: 'у двери ванной' },
  { type: 'switch', at: [522, 262.5], face: 'n', room: 'corridor', label: 'напротив двери ванной' },
  { type: 'switch', at: [484, 183.5], face: 's', room: 'corridor', label: 'у двери гардероба', new: true },
  { type: 'switch', at: [389.5, 176], face: 'w', room: 'kids', label: 'у двери детской', new: true, gang: 2 },

  // розетки — по плану розеток; n — число постов в блоке, h — высота (м),
  // new — новые по проекту (на плане тёмно-синие), net — интернет-розетка
  { type: 'socket', at: [1093, 52.5], face: 's', room: 'kitchen', n: 1, h: 1.1, label: 'фартук у окна' },
  { type: 'socket', at: [1011, 52.5], face: 's', room: 'kitchen', n: 1, h: 1.1, label: 'фартук у мойки' },
  { type: 'socket', at: [897.5, 141], face: 'e', room: 'kitchen', n: 3, h: 1.1, label: 'фартук у варочной панели' },
  { type: 'socket', at: [897.5, 119], face: 'e', room: 'kitchen', n: 1, h: 0.7, new: true, label: 'под столешницей (техника), h 700' },
  { type: 'socket', at: [897.5, 133], face: 'e', room: 'kitchen', n: 1, h: 2.5, new: true, label: 'для вытяжки, h 2500' },
  { type: 'socket', at: [897.5, 186], face: 'e', room: 'kitchen', n: 1, h: 2.0, new: true, label: 'в колонне (СВЧ), h 2000' },
  { type: 'socket', at: [897.5, 196], face: 'e', room: 'kitchen', n: 2, h: 0.3, new: true, label: 'в колонне (духовка), h 300' },
  { type: 'socket', at: [1130, 262.5], face: 'n', room: 'kitchen', n: 1, h: 0.3, label: 'у обеденного стола, на колонне' },
  { type: 'socket', at: [1110, 282.5], face: 's', room: 'living', n: 2, h: 0.3, label: 'на колонне у окна (торшер)' },
  { type: 'socket', at: [835, 492.5], face: 'n', room: 'living', n: 1, h: 0.3, label: 'у стены спальни' },
  { type: 'socket', at: [1083, 528], face: 'w', room: 'bedroom', n: 2, h: 0.3, label: 'у балконной двери' },
  { type: 'socket', at: [1032, 528.5], face: 's', room: 'bedroom', n: 1, h: 0.3, label: 'у шкафа' },
  { type: 'socket', at: [970, 528.5], face: 's', room: 'bedroom', n: 2, h: 0.9, net: true, label: 'за ТВ' },
  { type: 'socket', at: [835, 545.5], face: 's', room: 'bedroom', n: 1, h: 0.3, label: 'у входа' },
  { type: 'socket', at: [1027, 699.5], face: 'n', room: 'bedroom', n: 1, h: 0.6, label: 'у тумбы справа' },
  { type: 'socket', at: [891, 699.5], face: 'n', room: 'bedroom', n: 1, h: 0.6, label: 'у тумбы слева' },
  { type: 'socket', at: [735.5, 566], face: 'e', room: 'hall', n: 1, h: 0.3, label: 'у входной двери' },
  { type: 'socket', at: [735.5, 586], face: 'e', room: 'hall', n: 2, h: 0.3, label: 'у входной двери, под выключателем' },
  { type: 'socket', at: [812, 183.5], face: 's', room: 'corridor', n: 1, h: 0.3, label: 'у двери санузла' },
  { type: 'socket', at: [645, 183.5], face: 's', room: 'corridor', n: 1, h: 0.3, label: 'у двери ванной' },
  { type: 'socket', at: [780, 175.5], face: 'n', room: 'wc', n: 2, h: 1.0, label: 'у двери' },
  { type: 'socket', at: [800, 52.5], face: 's', room: 'wc', n: 2, h: 1.0, label: 'в хозшкафу (водонагреватель)' },
  { type: 'socket', at: [560, 52.5], face: 's', room: 'bath', n: 2, h: 1.0, new: true, label: 'за колонной стиральная/сушильная, h 1000' },
  { type: 'socket', at: [588, 52.5], face: 's', room: 'bath', n: 2, h: 1.0, new: true, label: 'у раковины, h 1000' },
  { type: 'socket', at: [354, 262.5], face: 'n', room: 'kids', n: 2, h: 0.3, label: 'у двери' },
  { type: 'socket', at: [184, 262.5], face: 'n', room: 'kids', n: 3, h: 0.3, label: 'у письменного стола' },
  { type: 'socket', at: [163, 52.5], face: 's', room: 'kids', n: 4, h: 0.3, label: 'у дивана-кровати' },
];

// Акцентные стены: тонкие панели поверх стен.
export const ACCENTS = [
  // детская: стена за диваном-кроватью — фреска
  { r: [52, 52, 330, 54.5], color: 'wallKids' },
  { r: [850, 709, 1085, 712], color: 'wallOlive' },
  // лоджия — зелёная, как стена за изголовьем (Caparol TUNDRA 85)
  { r: [1100, 507, 1185, 509.5], color: 'wallOlive' },
  { r: [1100, 709.5, 1185, 712], color: 'wallOlive' },
  { r: [820, 492, 1085, 495], color: 'wallpaper', trim: true },
];

// Устройства умного дома.
// at — точка на плане, h — высота установки (м).
export const DEVICES = [
  // освещение
  // точки света — по плану освещения (выполнен вариант 1); spots — встроенные споты
  { id: 'light.kids', type: 'light', room: 'kids', name: 'Люстра', at: [225, 153], style: 'ring' },
  { id: 'light.dressing', type: 'light', room: 'dressing', name: 'Споты', at: [443, 130], spots: [[457, 109], [457, 152], [429, 109], [429, 152]] },
  { id: 'light.bath', type: 'light', room: 'bath', name: 'Споты', at: [637, 110], spots: [[684, 92], [653, 129], [621, 92], [590, 129]] },
  { id: 'light.wc', type: 'light', room: 'wc', name: 'Споты', at: [761, 123], spots: [[761, 99], [761, 147]] },
  { id: 'light.corridor', type: 'light', room: 'corridor', name: 'Споты', at: [627, 213], spots: [[785, 213], [680, 213], [575, 213], [469, 213]] },
  { id: 'light.kitchen', type: 'light', room: 'kitchen', name: 'Споты на кухне', at: [1030, 150], spots: [[1131, 115], [1061, 115], [992, 115], [992, 178], [992, 241]] },
  { id: 'light.dining', type: 'light', room: 'kitchen', name: 'Подвес над столом', at: [1100, 182], pendant: true },
  { id: 'light.living', type: 'light', room: 'living', name: 'Люстра', at: [1005, 341], style: 'chandelier' },
  { id: 'light.hall', type: 'light', room: 'hall', name: 'Споты', at: [782, 490], spots: [[782, 332], [782, 437], [782, 542], [782, 648]] },
  { id: 'light.bedroom', type: 'light', room: 'bedroom', name: 'Люстра', at: [967, 571], style: 'ring' },
  { id: 'light.bedside', type: 'light', room: 'bedroom', name: 'Подвесы у кровати', at: [961, 682], style: 'bedside' },
  { id: 'light.loggia', type: 'light', room: 'loggia', name: 'Бра', at: [1142, 600] },
  { id: 'light.kids-spots', type: 'light', room: 'kids', name: 'Споты', at: [245, 153], spots: [[350, 107], [350, 200], [140, 107], [140, 200]] },
  { id: 'light.kids-desk', type: 'light', room: 'kids', name: 'Подсветка стола', at: [110, 258], style: 'strip', strip: [80, 259, 175, 261], y: 1.8 },
  { id: 'light.storage', type: 'light', room: 'storage', name: 'Свет', at: [854, 140], spots: [[854, 140]] },
  { id: 'light.counter', type: 'light', room: 'kitchen', name: 'Подсветка столешницы', at: [1030, 78], style: 'strip', strip: [899, 76, 1153, 78], y: 1.48, seed: false },
  { id: 'light.floorlamp', type: 'light', room: 'living', name: 'Торшер', at: [1098, 290], style: 'floor' },

  // шторы
  { id: 'curtain.kids', type: 'curtain', room: 'kids', name: 'Шторы', r: [55, 62, 62, 253], axis: 'z', color: 'curtainKids' },
  { id: 'curtain.kitchen', type: 'curtain', room: 'kitchen', name: 'Шторы', r: [1170, 105, 1177, 253], axis: 'z' },
  { id: 'curtain.living', type: 'curtain', room: 'living', name: 'Шторы', r: [1170, 292, 1177, 485], axis: 'z' },
  { id: 'curtain.bedroom', type: 'curtain', room: 'bedroom', name: 'Шторы', r: [1075, 515, 1082, 700], axis: 'z', color: 'curtainBedroom', single: 'end' },

  // климат
  { id: 'ac.kids', type: 'ac', room: 'kids', name: 'Кондиционер', at: [388, 220], face: 'w' },
  { id: 'ac.living', type: 'ac', room: 'living', name: 'Кондиционер', at: [1137, 492], face: 'n' },
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
  { id: 'washer.bath', type: 'washer', room: 'bath', name: 'Стиральная машина', at: [550, 80], front: 101 },
  { id: 'dryer.bath', type: 'washer', variant: 'dryer', room: 'bath', name: 'Сушильная машина', at: [550, 80], front: 101 },
  { id: 'vacuum', type: 'vacuum', room: 'storage', name: 'Робот-пылесос', at: [848, 168] },
];

// Маршрут робота-пылесоса (точки плана).
export const VACUUM_PATH = [
  [848, 168], [848, 222], [790, 240], [790, 300], [850, 310], [1080, 300], [1160, 390], [1090, 430], [870, 430], [850, 310],
  [1000, 270], [980, 240], [1000, 120], [1170, 120], [1170, 240], [1030, 240], [960, 270],
  [880, 300], [790, 300], [790, 240], [848, 222], [848, 168],
];
