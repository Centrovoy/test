// Электрощиток квартиры (по фотографии щитка).
// Подписи взяты с наклеек на щитке; наклейка относится к автомату, над или под
// которым она приклеена.
//
// kind: 'main' — вводной выключатель, 'rcbo' — дифавтомат 30 мА, 'mcb' — автомат.
// modules — ширина в модулях DIN.
// lines — подписи линий: { text, icon } (icon: socket | light | both | appliance | ac | net | fan | hood).
// rooms — помещения модели, которые питает линия (подсветка на 3D).
// devices — устройства модели, которые теряют питание при отключении.
// points — где на плане стоят потребители (метки на 3D).

export const PANEL = [
  {
    row: 'Верхний ряд',
    breakers: [
      {
        id: 'q-in-c50', kind: 'main', rating: 'C50', poles: 2, modules: 2, brand: 'Legrand RX³',
        title: 'Ввод', lines: [{ text: 'Ввод', icon: 'power' }],
        rooms: [], devices: ['*'], points: [],
      },
      {
        id: 'q-hob', kind: 'rcbo', rating: 'C32', modules: 2, brand: 'Legrand RX³',
        title: 'Варочная панель', lines: [{ text: 'Варочная панель', icon: 'appliance' }],
        rooms: ['kitchen'], devices: [], points: [[920, 140, 'Варочная панель']],
      },
      {
        id: 'q-boiler', kind: 'rcbo', rating: 'C32', modules: 2, brand: 'Legrand RX³',
        title: 'Водонагреватель С/У', lines: [{ text: 'Водонагрев С/У', icon: 'appliance' }],
        rooms: ['wc'], devices: [], points: [[800, 88, 'Водонагреватель']],
      },
      {
        id: 'q-kitchen', kind: 'rcbo', rating: 'C25', modules: 2, brand: 'Legrand RX³',
        title: 'Кухня',
        lines: [
          { text: 'Кухня: розетки и свет', icon: 'both' },
          { text: 'Фартук + вытяжка', icon: 'socket' },
          { text: 'Микроволновка', icon: 'appliance' },
          { text: 'Несущая стена кухни/гостиной, кладовка', icon: 'socket' },
        ],
        rooms: ['kitchen', 'living', 'storage'],
        devices: ['light.kitchen', 'light.dining', 'light.counter'],
        points: [[1000, 80, 'Фартук'], [1080, 75, 'Вытяжка'], [921, 198, 'Микроволновка'], [870, 290, 'Розетки, несущая стена'], [856, 120, 'Кладовая']],
      },
      {
        id: 'q-bedroom', kind: 'rcbo', rating: 'C25', modules: 2, brand: 'Legrand RX³',
        title: 'Спальня, коридор',
        lines: [
          { text: 'Спальня: розетки и свет', icon: 'both' },
          { text: 'Коридор: розетки и свет, пр. вход', icon: 'both' },
          { text: 'Кладовая (комната пылесоса): свет', icon: 'light' },
        ],
        rooms: ['bedroom', 'corridor', 'hall', 'storage'],
        devices: ['light.bedroom', 'light.bedside', 'tv.bedroom', 'curtain.bedroom', 'light.corridor', 'light.hall', 'light.storage'],
        points: [[970, 512, 'ТВ'], [883, 682, 'Розетка у кровати'], [640, 240, 'Коридор'], [760, 650, 'Прихожая'], [854, 140, 'Кладовая']],
      },
    ],
  },
  {
    row: 'Средний ряд',
    breakers: [
      {
        id: 'q-bath', kind: 'rcbo', rating: 'C20', modules: 2, brand: 'Legrand RX³',
        title: 'Ванная, санузел',
        lines: [
          { text: 'Ванная: розетки и свет', icon: 'both' },
          { text: 'Стиральная машина', icon: 'appliance' },
          { text: 'Сушильная машина', icon: 'appliance' },
          { text: 'Санузел: свет', icon: 'light' },
          { text: 'Вентиляция', icon: 'fan' },
          { text: 'Коридор возле С/У: розетки', icon: 'socket' },
        ],
        rooms: ['bath', 'wc'],
        devices: ['light.bath', 'light.wc', 'washer.bath', 'dryer.bath'],
        points: [[552, 80, 'Стиральная и сушильная'], [608, 70, 'Зеркало'], [770, 70, 'Вентиляция'], [700, 240, 'Розетки у С/У']],
      },
      {
        id: 'q-dishwasher', kind: 'rcbo', rating: 'C16', modules: 2, brand: 'Legrand DX³',
        title: 'Посудомойка, измельчитель',
        lines: [
          { text: 'Посудомойка', icon: 'appliance' },
          { text: 'Измельчитель', icon: 'appliance' },
        ],
        rooms: ['kitchen'], devices: [], points: [[1010, 80, 'Посудомойка'], [962, 76, 'Измельчитель']],
      },
      {
        id: 'q-oven', kind: 'rcbo', rating: 'C16', modules: 2, brand: 'Legrand RX³',
        title: 'Духовка', lines: [{ text: 'Духовка', icon: 'appliance' }],
        rooms: ['kitchen'], devices: [], points: [[921, 205, 'Духовка']],
      },
      {
        id: 'q-kids', kind: 'rcbo', rating: 'C16', modules: 2, brand: 'Legrand RX³',
        title: 'Детская',
        lines: [
          { text: 'Детская: розетки', icon: 'socket' },
          { text: 'Детская: свет', icon: 'light' },
        ],
        rooms: ['kids'], devices: ['light.kids', 'light.kids-spots', 'light.kids-desk', 'curtain.kids'],
        points: [[150, 240, 'Розетки у стола'], [260, 66, 'Розетка у кровати']],
      },
      {
        id: 'q-hood', kind: 'rcbo', rating: 'C10', modules: 2, brand: 'Legrand RX³',
        title: 'Вытяжка, розетка санузла',
        lines: [
          { text: 'Вытяжка', icon: 'hood' },
          { text: 'Санузел: розетка', icon: 'socket' },
        ],
        rooms: ['kitchen', 'wc'], devices: [], points: [[920, 70, 'Вытяжка'], [800, 140, 'Розетка']],
      },
    ],
  },
  {
    row: 'Нижний ряд',
    breakers: [
      {
        id: 'q-lowvolt', kind: 'mcb', rating: 'C16', modules: 1, brand: 'Legrand RX³',
        title: 'Слабо\u00ADточка', lines: [{ text: 'Слаботочка: роутер, хаб', icon: 'net' }],
        rooms: [], devices: ['camera.entrance'], points: [[790, 640, 'Слаботочный щит']],
      },
      {
        id: 'q-ac-kids', kind: 'mcb', rating: 'C16', modules: 1, brand: 'Legrand RX³',
        title: 'Конди\u00ADционер дет\u00ADской', lines: [{ text: 'Кондиционер: детская', icon: 'ac' }],
        rooms: ['kids'], devices: ['ac.kids'], points: [],
      },
      {
        id: 'q-ac-main', kind: 'mcb', rating: 'C16', modules: 1, brand: 'Legrand RX³',
        title: 'Конди\u00ADционеры спальни и гости\u00ADной', lines: [{ text: 'Кондиционер: спальня, гостиная', icon: 'ac' }],
        rooms: ['bedroom', 'living'], devices: ['ac.bedroom', 'ac.living'], points: [],
      },
      {
        id: 'q-in-63', kind: 'main', rating: '63A', poles: 2, modules: 2, brand: 'GE',
        title: 'Вводной выключатель', lines: [{ text: 'Ввод', icon: 'power' }],
        rooms: [], devices: ['*'], points: [],
      },
    ],
  },
];

// Устройства модели, которых нет ни в одной подписи щитка.
export const UNLABELED = ['light.living', 'light.loggia', 'light.dressing'];

export const BREAKERS = PANEL.flatMap((r) => r.breakers);

// Где висит щиток: прихожая, стена у входной двери (между зеркалом и дверью).
export const PANEL_LOCATION = { r: [736, 542, 741, 592], y0: 1.25, y1: 2.0 };
