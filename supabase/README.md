# Supabase Edge Functions for Social Auth

This folder contains the server-side layer for real `VK ID` and `Telegram`
social login. The static site on GitHub Pages cannot safely store provider
secrets, so the OAuth exchange and session issuing happen here.

## Functions

- `auth-vk-start`
- `auth-vk-callback`
- `auth-telegram-start`
- `auth-telegram-callback`

## Required environment variables

Common:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_STATE_SECRET`
- `PUBLIC_SITE_URL`
- `ALLOWED_RETURN_ORIGINS`

VK:

- `VK_CLIENT_ID`
- `VK_CLIENT_SECRET`
- `VK_AUTHORIZE_URL` (optional, default `https://oauth.vk.com/authorize`)
- `VK_TOKEN_URL` (optional, default `https://oauth.vk.com/access_token`)

Telegram:

- `TELEGRAM_CLIENT_ID`
- `TELEGRAM_CLIENT_SECRET`
- `TELEGRAM_AUTHORIZE_URL` (optional, default `https://oauth.telegram.org/auth`)
- `TELEGRAM_TOKEN_URL` (optional, default `https://oauth.telegram.org/token`)

## CLI setup on this laptop

1. Create `supabase/functions/.env.local` from `.env.example`
2. Put your personal access token into the environment:
   - `setx SUPABASE_ACCESS_TOKEN "<your-token>"`
3. Link the project:
   - `npm run supabase:link`
4. Deploy functions:
   - `npm run supabase:functions:deploy`

The repo already contains `supabase/config.toml` with `verify_jwt = false`
for public auth entry points.

## What the flow does

1. The frontend opens `/functions/v1/auth-vk-start` or
   `/functions/v1/auth-telegram-start`.
2. The function signs `role`, `returnTo`, and PKCE data into `state`.
3. The provider redirects back to the callback function.
4. The callback exchanges the `code` for tokens and fetches the user profile.
5. A synthetic Supabase Auth user is created or updated.
6. The callback generates a Supabase magic link and redirects the browser into
   a real Supabase session.

## Frontend defaults

If `VK auth URL` or `Telegram auth URL` are empty in the admin panel, the site
now defaults to:

- `${SUPABASE_URL}/functions/v1/auth-vk-start`
- `${SUPABASE_URL}/functions/v1/auth-telegram-start`

## Recommended return origins

For the current public site:

- `https://ivan19326.github.io`

## After deployment

Add the deployed function URLs into the provider dashboards if they ask for
callback URLs:

- `https://<project-ref>.supabase.co/functions/v1/auth-vk-callback`
- `https://<project-ref>.supabase.co/functions/v1/auth-telegram-callback`
