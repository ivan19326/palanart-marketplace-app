# Движарт: приложение на телефон

Проект уже работает как PWA и ставится с сайта:

- Android: `Chrome -> Установить приложение`
- iPhone: `Safari -> Поделиться -> На экран Домой`

## Вариант 1. PWA

Готово уже сейчас.

Ссылка:

- `https://ivan19326.github.io/palanart-marketplace-app/`

## Вариант 2. Android APK / Google Play через Bubblewrap

1. Установить Node.js и Android Studio.
2. В корне проекта выполнить:
   - `npm install`
   - `npm run twa:init`
   - `npm run twa:build`
3. Подписать APK/AAB и загрузить в Google Play Console.

Файл настроек:

- `twa-manifest.json`

## Вариант 3. Android + iPhone через Capacitor

1. Установить Node.js.
2. В корне проекта выполнить:
   - `npm install`
   - `npm run cap:add:android`
   - `npm run cap:add:ios`
   - `npm run cap:sync`
3. Открыть нативные проекты:
   - `npm run cap:open:android`
   - `npm run cap:open:ios`
4. Дальше собирать:
   - Android в Android Studio
   - iPhone в Xcode

Файл настроек:

- `capacitor.config.json`

## Что уже сделано

- единое имя приложения: `Движарт`
- PWA manifest
- service worker
- иконки
- HTTPS-публикация через GitHub Pages

