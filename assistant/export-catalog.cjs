const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const values = new Map();
// Isolated memory storage: never read a visitor's localStorage or any database.
const context = vm.createContext({ console, localStorage: {
  getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key)
}, location: { hostname: 'palanart.github.io', origin: 'https://palanart.github.io', protocol: 'https:' } });
context.window = context;
vm.runInContext(fs.readFileSync(path.join(root, 'marketplace_build/marketplace-core.js'), 'utf8'), context);
const store = context.MarketplaceStore;
const text = (value, length) => String(value || '').slice(0, length);
const profiles = store.getProfiles().slice(0, 30).map(profile => ({
  id: text(profile.id, 100), name: text(profile.name, 100), title: text(profile.title, 160), city: text(profile.city, 100),
  categories: profile.categories.map(store.categoryLabel), priceFrom: Number(profile.priceFrom) || 0,
  description: text(profile.description, 400), languages: profile.languages.slice(0, 8)
}));
const knowledge = { source: 'Published PALANART repository catalogue snapshot', exportedAt: new Date().toISOString(),
  facts: [
    'PALANART помогает найти исполнителей для мероприятий. Каталог: https://palanart.github.io/index.html#catalog.',
    'Кабинет заказчика: https://palanart.github.io/user.html. Кабинет исполнителя: https://palanart.github.io/artist.html.',
    'Регистрация заказчика запрашивает имя, e-mail, телефон, город и пароль. Восстановление открывается кнопкой «Забыли пароль?».',
    'Реальные регистрация и социальный вход пока не подтверждены: прежний Supabase недоступен на момент аудита 26.10.2026. Это не live health check.',
    'Консультант не читает кабинет и не отправляет заявки. Может подготовить текст, который посетитель использует самостоятельно.',
    'Данные каталога — снимок опубликованных профилей, могут устареть. Свободные даты и итоговую цену нужно уточнить у исполнителя.'
  ], profiles };
const content = JSON.stringify(knowledge, null, 2) + '\n';
if (content.length > 24000) throw new Error('Public catalogue context exceeds limit');
fs.writeFileSync(path.join(__dirname, 'public-knowledge.json'), content);
console.log('Exported public profiles:', profiles.length);
