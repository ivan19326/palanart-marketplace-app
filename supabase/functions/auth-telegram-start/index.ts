import { getProviderCallbackUrl, normalizeReturnTo, signAuthState } from "../_shared/marketplace-auth.ts";

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const role = url.searchParams.get("role") || "client";
    const returnTo = normalizeReturnTo(url.searchParams.get("returnTo"));
    const clientId = Deno.env.get("TELEGRAM_CLIENT_ID");
    if (!clientId) return new Response("Missing TELEGRAM_CLIENT_ID", { status: 500 });
    const state = await signAuthState({
      role,
      returnTo,
      provider: "telegram",
      createdAt: Date.now(),
    });

    const cookie = [
      `palanart_telegram_state=${encodeURIComponent(state)}`,
      "Path=/functions/v1/auth-telegram-callback",
      "HttpOnly",
      "Secure",
      "SameSite=None",
      "Max-Age=900",
    ].join("; ");

    const callbackUrl = getProviderCallbackUrl("telegram");
    const body = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Telegram | Паланарт</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top, #1d2a44 0%, #0b1220 52%, #070b14 100%);
        color: #fff;
        font-family: Arial, sans-serif;
      }
      .panel {
        width: min(460px, calc(100vw - 32px));
        padding: 32px;
        border-radius: 28px;
        background: rgba(14, 21, 35, 0.92);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      h1 { margin: 0 0 12px; font-size: 32px; }
      p { margin: 0 0 18px; color: rgba(255,255,255,0.78); line-height: 1.5; }
      #telegram-login-host { min-height: 54px; display: flex; justify-content: center; }
      .hint { margin-top: 16px; font-size: 14px; color: rgba(255,255,255,0.62); }
      .error { margin-top: 16px; color: #ff8e8e; }
    </style>
  </head>
  <body>
    <main class="panel">
      <h1>Вход через Telegram</h1>
      <p>Подтвердите вход через Telegram. После подтверждения мы автоматически вернём вас обратно в Паланарт.</p>
      <div id="telegram-login-host"></div>
      <div id="telegram-error" class="error" hidden></div>
      <div class="hint">Если окно входа не открылось само, нажмите кнопку Telegram ниже.</div>
    </main>
    <form id="telegram-complete" action="${callbackUrl}" method="post" hidden>
      <input type="hidden" name="state" value="${state}">
      <input type="hidden" name="id_token" id="telegram-id-token">
    </form>
    <script>
      window.telegramLoginComplete = function (payload) {
        if (!payload || !payload.id_token) {
          var error = document.getElementById("telegram-error");
          error.hidden = false;
          error.textContent = "Telegram не вернул id_token. Повторите вход ещё раз.";
          return;
        }
        document.getElementById("telegram-id-token").value = payload.id_token;
        document.getElementById("telegram-complete").submit();
      };

      window.telegramLoginError = function (payload) {
        var error = document.getElementById("telegram-error");
        error.hidden = false;
        error.textContent = (payload && payload.error) ? String(payload.error) : "Не удалось завершить вход через Telegram.";
      };
    </script>
    <script async src="https://oauth.telegram.org/js/telegram-login.js?3"
      data-client-id="${clientId}"
      data-size="large"
      data-radius="14"
      data-lang="ru"
      data-request-access="write"
      data-onauth="telegramLoginComplete"
      data-onerror="telegramLoginError"
      data-userpic="false"></script>
  </body>
</html>`;

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "set-cookie": cookie,
      },
    });
  } catch (error) {
    return new Response((error as Error).message, { status: 500 });
  }
});
