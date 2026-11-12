# Social Auth Edge Functions

Серверная реализация Telegram, VK ID, MAX и Яндекс ID находится в `_shared/social-auth.js`.

Google подключён через встроенные `signInWithOAuth` / `linkIdentity` Supabase Auth;
Client ID/Secret задаются в настройках Google provider, отдельная Edge Function не нужна.
Актуальный статус всех способов: [реальные проверки от 13.11.2026](../../docs/palanart-auth-live-2026-11-13.md).

Развёртывание девяти функций: `npm run supabase:functions:deploy`.

**Все 9 функций развёрнуты в `oimwiyncaxffcijqtmzf`. Приложения провайдеров и секреты ещё не настроены, реальные входы не проверены.**

Перед любыми изменениями БД: изучить действующую схему, получить резервный снимок, проверить SQL и advisors.

Актуальная настройка, callbacks, RLS и условия завершения: [отчёт](../../docs/palanart-auth-recovery-2026-10-26.md).
