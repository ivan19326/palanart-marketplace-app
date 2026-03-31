# Social auth functions

These Edge Functions are the real backend layer for:

- `VK ID`
- `Telegram`

Deploy them with the Supabase CLI after setting the required environment
variables listed in `/supabase/README.md`.

## Suggested commands

```bash
supabase functions deploy auth-vk-start
supabase functions deploy auth-vk-callback
supabase functions deploy auth-telegram-start
supabase functions deploy auth-telegram-callback
```

From this repository you can also use:

```bash
npm run supabase:functions:serve
npm run supabase:functions:deploy
```

## Default frontend URLs

When the site knows only `SUPABASE_URL`, it now automatically routes:

- `VK ID` -> `${SUPABASE_URL}/functions/v1/auth-vk-start`
- `Telegram` -> `${SUPABASE_URL}/functions/v1/auth-telegram-start`
