# Подключение сервисной авторизации

Файлы:

- `C:\Users\KMO\Documents\Проект\marketplace_build\auth-config.js`
- `C:\Users\KMO\Documents\Проект\marketplace_build\auth-bridge.js`

## Что уже сделано

- клиентский кабинет умеет работать через `Supabase Auth`
- кабинет исполнителя умеет работать через `Supabase Auth`
- локальный режим пока сохранён как fallback
- при сервисном входе создаётся локальная запись клиента или исполнителя, чтобы не ломать текущую логику маркетплейса

## Как включить Supabase

Откройте:

- `C:\Users\KMO\Documents\Проект\marketplace_build\auth-config.js`

И замените на:

```js
window.PalanartAuthConfig = {
  mode: "supabase",
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  socialProviders: [
    { id: "google", label: "Google" }
  ]
};
```

## Что включить в Supabase

- `Auth -> Providers -> Google`
- `Auth -> URL Configuration`

Redirect URL для сайта:

```text
https://ivan19326.github.io/palanart-marketplace-app/user.html
https://ivan19326.github.io/palanart-marketplace-app/artist.html
```

## Важно

- текущая реализация уже готова под `Google`
- `VK` и `Telegram` потребуют отдельной настройки провайдера/бэкенда
- админка пока остаётся локальной через `admin@palan.market`
