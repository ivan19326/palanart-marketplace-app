# PALANART: все способы входа — статус 12 ноября 2026

**Реальная регистрация и вход пока не восстановлены.** Настроенный проект
`jioakguorsfvjuzyclrg.supabase.co` возвращает NXDOMAIN у Google и Cloudflare DNS.
Подключённый Supabase показывает `projects: []`, запрос прежнего ref отклонён по
правам. В доступных локальных `.env` и переменных процесса нового адреса не найдено.
В актуальной удалённой конфигурации `origin/main` указан тот же ref.
Это не доказывает удаления проекта; его состояние должен подтвердить владелец.

## Что исправлено и что проверено

| Способ | Исправление | Полный реальный сценарий |
| --- | --- | --- |
| Google | Добавлен для заказчика, подключены существовавшие кнопки исполнителя. Штатный `signInWithOAuth`, отдельная привязка через `linkIdentity`, точный возврат в нужный кабинет. Проверка публичных Auth settings до перенаправления | ТРЕБУЕТ НАСТРОЙКИ: backend и Google OAuth |
| VK ID | Сохранён подготовленный серверный code exchange с приватным PKCE verifier, проверкой state и профилем из API VK. Общие обработчики клиента и исполнителя блокируют повторные отправки | ТРЕБУЕТ НАСТРОЙКИ: backend, приложение VK ID, Edge Functions |
| Telegram | Сохранён настоящий виджет и серверная проверка подписи, времени и одноразового state; обработка ошибок обоих кабинетов | ТРЕБУЕТ НАСТРОЙКИ: backend, бот, домен, Edge Functions |
| MAX | Добавлен в кабинет исполнителя, включая возврат в исходную вкладку и подтверждение имени. Новая попытка сбрасывает прежнее подтверждение; выход удаляет ожидающий секрет. Попытки разделены по кабинету | ТРЕБУЕТ НАСТРОЙКИ: backend, бот/мини-приложение, Edge Functions |
| Яндекс ID | Добавлен в кабинет исполнителя; сохранён подготовленный серверный OAuth + PKCE | ТРЕБУЕТ НАСТРОЙКИ: backend, приложение Яндекс ID, Edge Functions |
| E-mail и восстановление | Исполнителю добавлены recovery-формы и новый пароль, состояния загрузки и блокировка повторной отправки. Старые локальные методы исполнителя закрыты для новых регистраций/входа. Старые записи не очищаются | ТРЕБУЕТ НАСТРОЙКИ: backend, Email Auth, SMTP и реальные письма |

Привязка всех пяти социальных способов доступна из проверенного кабинета. Для
Google и остальных привязок повторно проверяется действующая Auth-сессия. Кабинет
не открывается на основании одного браузерного токена. Клиент не объединяет
серверные аккаунты по непроверенному e-mail; штатное связывание Google выполняет
Supabase Auth. Уже существующие отдельные серверные аккаунты автоматически не
переносятся друг в друга.

У исполнителя сохраняется прежний локальный id и связанная карточка после
проверенного входа. Сведения о провайдере и дате регистрации синхронизируются в
кэше; кэш не является серверной базой и не заменяет её проверку. Сообщения об
ошибках исполнителя выводятся с экранированием HTML.

## Настройка владельцем существующего backend

Сначала открыть [прежний проект](https://supabase.com/dashboard/project/jioakguorsfvjuzyclrg)
в аккаунте владельца PALANART. Подтвердить состояние и правильную организацию.
Если найден другой действующий проект — сообщить его URL/ref и подключить именно
его в Codex. Не отправлять ключи/пароли в чат. Новый проект без отдельного
подтверждения не создаётся. План восстановления и варианты состояний:
[аудит backend](palanart-backend-audit-2026-10-26.md).

После восстановления доступа получить бэкап Auth, прикладных схем и Storage,
исследовать существующие таблицы/политики и сопоставить их с подготовленным SQL.
SQL и Edge Functions в действующем Supabase в этой работе не применялись.
Роли и ограничения доступа нужно проверять по существующей серверной схеме;
выбор клиентского кабинета сам по себе не даёт серверных привилегий.

Site URL: `https://palanart.github.io/`. В разрешённых redirects должны быть:

- `https://palanart.github.io/user.html`
- `https://palanart.github.io/user.html?recovery=1`
- `https://palanart.github.io/artist.html`
- `https://palanart.github.io/artist.html?recovery=1`

| Провайдер | Где задать настройки | Callback при восстановлении прежнего ref |
| --- | --- | --- |
| Google | [Google Auth Platform](https://console.cloud.google.com/auth/clients): Web client, origin `https://palanart.github.io`, права `openid`, email, profile. Client ID и Client Secret внести в [Supabase Google provider](https://supabase.com/dashboard/project/jioakguorsfvjuzyclrg/auth/providers?provider=Google). Для привязки включить Manual Linking после проверки политики аккаунтов | `https://jioakguorsfvjuzyclrg.supabase.co/auth/v1/callback` |
| VK ID | Web-приложение с доверенным Redirect URI, `VK_CLIENT_ID` и при необходимости `VK_CLIENT_SECRET` в Edge Function Secrets | `https://jioakguorsfvjuzyclrg.supabase.co/functions/v1/auth-vk-callback` |
| Telegram | Подтвердить владение ботом; токен и username — в Edge Function Secrets, BotFather `/setdomain` → `palanart.github.io` | `https://jioakguorsfvjuzyclrg.supabase.co/functions/v1/auth-telegram-callback` |
| MAX | Подтвердить бот/мини-приложение; токен и username — в Edge Function Secrets; URL мини-приложения `https://palanart.github.io/max-login.html` | `auth-max-callback` и `auth-max-claim` на том же `/functions/v1/` |
| Яндекс ID | OAuth-приложение, права `login:info`, `login:email`; `YANDEX_CLIENT_ID` и `YANDEX_CLIENT_SECRET` в Edge Function Secrets | `https://jioakguorsfvjuzyclrg.supabase.co/functions/v1/auth-yandex-callback` |

Google использует встроенный Supabase Auth, отдельной `auth-google-*` Edge Function
нет. Секрет Google не должен попадать в `auth-config.js` или HTML. Для других
четырёх провайдеров подготовлены девять функций из `supabase/functions/`.

## Подтверждённые проверки и ограничения

- 28 автоматических проверок Auth и 8 проверок консультанта: всего **36**, все прошли.
  Включены Google OAuth/linking, неверные redirect URL, отключённый Google,
  сохранение прежней карточки исполнителя, запрет локального пароля, смена/выход
  из попытки MAX, повторное подтверждение новой попытки, подписи и PKCE.
  Auth/провайдеры в этих проверках заменены тестовыми адаптерами; это не живой OAuth.
- В локальном браузере загружены формы заказчика и исполнителя; видны пять
  социальных способов. Google запускает запрос с состоянием загрузки.
- Дальнейшая браузерная проверка остановлена инструментом: он не смог уверенно
  определить текущий URL окна Chrome для проверки безопасности. Обход не выполнялся.
- Полные реальные регистрация → подтверждение → кабинет → выход → повторный вход,
  recovery-письмо и пять внешних провайдеров **не проверены**. Они обязательны
  после восстановления backend и настройки приложений на основном домене.
- Серверные пользовательские записи не изменялись. Локальная резервная копия кода
  до правки: `.palanart-auth-backups/2026-11-11/before-all-providers.zip`.
  Серверный бэкап недоступен до восстановления проекта.

Источники: [Google в Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google),
[связывание аккаунтов](https://supabase.com/docs/guides/auth/auth-identity-linking),
[MAX: подпись данных](https://dev.max.ru/docs/webapps/validation),
[Яндекс: OAuth + PKCE](https://yandex.ru/dev/id/doc/ru/codes/code-url).
