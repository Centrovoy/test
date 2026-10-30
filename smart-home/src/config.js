// Подключение к Home Assistant (необязательно).
// Заполните url и token (долгоживущий токен из профиля HA), чтобы сцена
// показывала реальные состояния устройств. Оставьте пустыми — будет имитация.
export const HA_CONFIG = {
  url: '',      // например 'http://homeassistant.local:8123'
  token: '',
  entities: {
    'light.kids': 'light.detskaia',
    'light.kitchen': 'light.kukhnia',
    'light.dining': 'light.stol',
    'light.living': 'light.gostinaia',
    'light.bedroom': 'light.spalnia',
    'light.hall': 'light.prikhozhaia',
    'light.corridor': 'light.koridor',
    'light.bath': 'light.vannaia',
    'light.wc': 'light.sanuzel',
    'curtain.living': 'cover.shtory_gostinaia',
    'curtain.bedroom': 'cover.shtory_spalnia',
    'curtain.kitchen': 'cover.shtory_kukhnia',
    'curtain.kids': 'cover.shtory_detskaia',
    'ac.living': 'climate.gostinaia',
    'ac.bedroom': 'climate.spalnia',
    'ac.kids': 'climate.detskaia',
    'leak.bath': 'binary_sensor.protechka_vannaia',
    'leak.wc': 'binary_sensor.protechka_sanuzel',
    'leak.kitchen': 'binary_sensor.protechka_kukhnia',
    'smoke.kitchen': 'binary_sensor.dym_kukhnia',
    'motion.hall': 'binary_sensor.dvizhenie_prikhozhaia',
    'motion.corridor': 'binary_sensor.dvizhenie_koridor',
    'door.entrance': 'binary_sensor.vkhodnaia_dver',
    'lock.entrance': 'lock.vkhodnaia_dver',
    'valve.water': 'switch.kran_vody',
    'vacuum': 'vacuum.robot',
    'tv.living': 'media_player.tv',
  },
};
