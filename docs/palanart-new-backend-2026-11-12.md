# PALANART: новый backend — 12 ноября 2026

Создание нового проекта разрешено владельцем сообщением «делай», организация
выбрана ответом «1». Создан **PALANART**, ref `oimwiyncaxffcijqtmzf`, регион
`eu-central-1`, в организации `oyekcqetfnuzxdjttatv` с планом Free.
Платный тариф и платные дополнения не подключались.

- [Проект в Dashboard](https://supabase.com/dashboard/project/oimwiyncaxffcijqtmzf)
- API: `https://oimwiyncaxffcijqtmzf.supabase.co`
- Сайт: `https://palanart.github.io/`

**Полные регистрация, подтверждение почты и OAuth ещё не подтверждены.** Новый
backend работает, но приложения провайдеров, SMTP и URL-настройки Auth требуют
настройки. В Dashboard пока нет сессии владельца.

Прежний ref `jioakguorsfvjuzyclrg` не изменялся и не удалялся. Его владелец и
состояние не установлены. Старые серверные аккаунты в новую базу не переносились;
новый проект не восстанавливает их автоматически. Существующие локальные записи
и резервные копии сохранены.

## Что развёрнуто и проверено

Перед изменением новая база проверена: 0 Auth-пользователей, 0 Storage-объектов,
0 таблиц в `public`. Код до подключения сохранён в
`.palanart-auth-backups/2026-11-12/before-new-backend.zip`. Это резервная копия
локальных файлов, а не выгрузка недоступного прежнего сервера.

Применена миграция `20261112131542_palanart_auth_profiles.sql`:

- `palanart_profiles` — один профиль на UUID Auth; имя, контакты, город,
  защищённая роль, провайдеры и даты. Пароли хранятся только в Supabase Auth.
- `palanart_auth_flows` — одноразовые состояния и PKCE для внешнего входа.
- `palanart_external_identities` — соответствие провайдера и его stable subject
  существующему UUID; привязка не создаёт второй профиль.
- RLS включён на всех трёх таблицах. Пользователь может читать только свой
  профиль и менять имя, телефон и город; служебные таблицы доступны только серверу.
- Приватный триггер синхронизирует профиль из проверенной серверной записи Auth.
  Роль из редактируемого пользователем `user_metadata` не используется.

Развёрнуты все 9 функций: `auth-{vk,telegram,yandex,max}-{start,callback}` и
`auth-max-claim`. У callback нет требования пользовательского JWT до входа;
проверки подписи, state, PKCE и привязки к браузеру выполняет серверный код.
В пользовательском JavaScript находится только publishable key.

Проверки:

- **38 автоматических проверок**: 30 Auth и 8 консультанта; все прошли.
  Внешние провайдеры в них заменены адаптерами, это не реальный OAuth.
- `tests/palanart-auth-isolation.sql` выполнен на новой базе: собственная запись
  доступна, чужая недоступна; запрещены повышение роли и чтение служебных таблиц.
  Тестовые строки отменены транзакцией, постоянных аккаунтов тест не создаёт.
- Публичный Auth settings отвечает HTTP 200. E-mail включён, подтверждение
  включено (`mailer_autoconfirm=false`), Google пока выключен.
- Неверный пароль возвращает `invalid_credentials`, без сессии.
- Анонимное чтение всех трёх таблиц отклоняется HTTP 401.
- CORS разрешает `https://palanart.github.io`, посторонний origin не разрешён.
- Восемь start/callback возвращают HTTP 503 с состоянием «ещё не настроен»;
  неверный MAX claim отклонён HTTP 400. Это проверка развёртывания и отказов,
  а не успешных входов.
- Advisors не нашли ошибок/предупреждений безопасности. Два INFO о RLS без
  политик относятся к намеренно закрытым серверным таблицам; три INFO о ещё
  неиспользованных индексах ожидаемы на пустой базе.

Источники advisories: [закрытые таблицы без политик](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[неиспользованные индексы](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Что требуется для реального входа

Сначала войти в [Dashboard нового проекта](https://supabase.com/dashboard/project/oimwiyncaxffcijqtmzf)
под аккаунтом выбранной организации. Пароли, токены, Google Client Secret и
SMTP-пароль не отправлять в чат и не сохранять в публичном репозитории.

1. В [URL Configuration](https://supabase.com/dashboard/project/oimwiyncaxffcijqtmzf/auth/url-configuration)
   указать Site URL `https://palanart.github.io/` и разрешить ровно:
   - `https://palanart.github.io/user.html`
   - `https://palanart.github.io/user.html?recovery=1`
   - `https://palanart.github.io/artist.html`
   - `https://palanart.github.io/artist.html?recovery=1`
2. В Email Auth оставить подтверждение почты включённым, настроить серверную
   длину пароля не менее 10 символов и согласовать правила с формой.
   Подключить [production SMTP](https://supabase.com/dashboard/project/oimwiyncaxffcijqtmzf/auth/smtp).
   Встроенная почта Supabase отправляет только участникам организации и не
   подходит для публичной регистрации. Не отключать подтверждение ради тестов.
3. В [Google Auth Platform](https://console.cloud.google.com/auth/clients)
   подготовить Web client для PALANART: origin `https://palanart.github.io`,
   callback `https://oimwiyncaxffcijqtmzf.supabase.co/auth/v1/callback`,
   scopes `openid`, email, profile. Client ID/Secret внести в
   [Google provider](https://supabase.com/dashboard/project/oimwiyncaxffcijqtmzf/auth/providers?provider=Google).
   Для привязки из кабинета проверить и включить Manual Linking.
4. Ввести секреты остальных приложений в
   [Edge Function Secrets](https://supabase.com/dashboard/project/oimwiyncaxffcijqtmzf/functions/secrets):

| Способ | Нужные настройки | Callback / возврат |
| --- | --- | --- |
| VK ID | `VK_CLIENT_ID`, при необходимости `VK_CLIENT_SECRET`, доверенный redirect | `https://oimwiyncaxffcijqtmzf.supabase.co/functions/v1/auth-vk-callback` |
| Telegram | `TELEGRAM_BOT_USERNAME`, `TELEGRAM_BOT_TOKEN`; BotFather `/setdomain` → `palanart.github.io` | `https://oimwiyncaxffcijqtmzf.supabase.co/functions/v1/auth-telegram-callback` |
| MAX | `MAX_BOT_USERNAME`, `MAX_BOT_TOKEN`, мини-приложение | Mini-app URL `https://palanart.github.io/max-login.html`; серверные `auth-max-callback` и `auth-max-claim` |
| Яндекс ID | `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, права `login:info`, `login:email` | `https://oimwiyncaxffcijqtmzf.supabase.co/functions/v1/auth-yandex-callback` |

Функции по умолчанию используют сайт `https://palanart.github.io/` и серверные
переменные Supabase. Для старых ключей другого проекта переопределения не нужны.
Не подставлять старый service_role в новый проект.

После проверки SMTP и точных redirects переключить `emailConfirmationReady`
в `marketplace_build/auth-config.js` в `true`, обновить версию ресурсов и
повторить реальные тесты. Пока флаг `false`, регистрация и recovery не отправляют
письма на неподготовленные callback URL. Вход по паролю обращается к настоящему Auth.

Для каждого способа обязательны реальные вход, отмена, повторный вход, выход и
привязка без дублирования профиля. Для e-mail также регистрация → настоящее письмо →
подтверждение → кабинет и восстановление → письмо → новый пароль. Проверить оба
кабинета на опубликованном домене и доступ к профилю с другого аккаунта.

| Способ | Полный сценарий сейчас |
| --- | --- |
| E-mail и восстановление | ТРЕБУЕТ НАСТРОЙКИ: SMTP, redirects и реальные письма |
| Google | ТРЕБУЕТ НАСТРОЙКИ: OAuth-приложение и включение provider |
| VK ID | ТРЕБУЕТ НАСТРОЙКИ: приложение и секреты |
| Telegram | ТРЕБУЕТ НАСТРОЙКИ: бот, домен и секреты |
| MAX | ТРЕБУЕТ НАСТРОЙКИ: бот/мини-приложение и секреты |
| Яндекс ID | ТРЕБУЕТ НАСТРОЙКИ: приложение и секреты |

Документация: [Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[Auth redirects](https://supabase.com/docs/guides/auth/redirect-urls).

## Подтверждение публикации

- Проверенный код: `615466b`; сборка и 38 проверок прошли в
  [GitHub Actions](https://github.com/ivan19326/palanart-marketplace-app/actions/runs/43227246479).
- Публичная версия: `bf4e1ac`, ресурсы `20261112b`, service worker `palanart-cache-v28`;
  [развёртывание Pages успешно](https://github.com/palanart/palanart.github.io/actions/runs/43227300892).
  Все 8 изменённых публичных файлов получены по HTTPS и совпали с исходниками.
- В браузере открыта каноническая `https://palanart.github.io/user.html`.
  Подтверждена загрузка ресурсов `20261112b`: Google сообщает о выключенном
  provider; Telegram, VK ID, MAX и Яндекс показывают серверный ответ о недостающей
  настройке. После ответа кнопки доступны, кабинет не открывается.
- Неверные e-mail/пароль дают «Неверный e-mail или пароль». Заполненная регистрация
  блокируется до настройки подтверждений; recovery также не отправляет письмо,
  возврат ко входу восстанавливает фокус. Это ожидаемые проверки отказов.
- Страница исполнителя загружена: видны все пять социальных способов, Google
  запускает проверку и показывает тот же статус. Закрытые действия без сессии не
  проверялись. Существующие аккаунты и серверные пароли тестами не менялись.
- После браузерных проверок в новой базе по-прежнему 0 Auth-пользователей и
  0 профилей. Реальные письма и успешный OAuth остаются обязательными до завершения.

HTTP-результаты и хэши сохранены локально в
`.auth-test-output/new-backend-release-20261112.json`,
`.auth-test-output/new-project-initial-http-20261112.json` и
`.auth-test-output/new-project-functions-http-20261112.json`.
