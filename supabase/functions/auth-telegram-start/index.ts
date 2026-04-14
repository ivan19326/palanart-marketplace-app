import { normalizeReturnTo, redirect, signAuthState } from "../_shared/marketplace-auth.ts";

const DEFAULT_SITE_URL = "https://ivan19326.github.io/palanart-marketplace-app/";

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

    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || DEFAULT_SITE_URL;
    const telegramLoginUrl = new URL("telegram-login.html", siteUrl);
    telegramLoginUrl.searchParams.set("state", state);
    telegramLoginUrl.searchParams.set("client_id", clientId);

    const response = redirect(telegramLoginUrl.toString());
    response.headers.set("set-cookie", cookie);
    return response;
  } catch (error) {
    return new Response((error as Error).message, { status: 500 });
  }
});
