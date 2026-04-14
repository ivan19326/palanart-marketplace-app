import { errorHtml, issueMarketplaceSession, redirect, verifyAuthState } from "../_shared/marketplace-auth.ts";

async function readBodyParams(request: Request): Promise<URLSearchParams> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await request.json().catch(() => null);
    return json && typeof json === "object"
      ? new URLSearchParams(Object.entries(json).map(([key, value]) => [key, String(value)]))
      : new URLSearchParams();
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    return new URLSearchParams(Array.from(form.entries()).map(([key, value]) => [key, String(value)]));
  }
  return new URLSearchParams();
}

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function clearStateCookie(): string {
  return [
    "palanart_telegram_state=",
    "Path=/functions/v1/auth-telegram-callback",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Max-Age=0",
  ].join("; ");
}

async function resolveDecodedState(primary: string | null, fallback: string | null) {
  if (primary) {
    try {
      return await verifyAuthState(primary);
    } catch {
      // Try fallback source next.
    }
  }
  if (fallback) {
    return await verifyAuthState(fallback);
  }
  return null;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyTelegramWidgetPayload(payload: URLSearchParams): Promise<Record<string, string>> {
  const hash = payload.get("hash") || "";
  const authDate = payload.get("auth_date") || "";
  const userId = payload.get("id") || "";
  if (!hash || !authDate || !userId) {
    throw new Error("Telegram не вернул обязательные параметры входа.");
  }

  const botToken = Deno.env.get("TELEGRAM_CLIENT_SECRET");
  if (!botToken) throw new Error("Missing TELEGRAM_CLIENT_SECRET");

  const secretBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(botToken)));
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const dataEntries = Array.from(payload.entries())
    .filter(([key, value]) => key !== "hash" && key !== "state" && value)
    .sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = dataEntries.map(([key, value]) => `${key}=${value}`).join("\n");
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(dataCheckString)),
  );

  if (toHex(signature) !== hash) {
    throw new Error("Telegram вернул данные с неверной подписью.");
  }

  const authDateMs = Number(authDate) * 1000;
  if (!authDateMs || authDateMs < Date.now() - 15 * 60 * 1000) {
    throw new Error("Вход через Telegram уже устарел. Повторите попытку.");
  }

  return Object.fromEntries(dataEntries);
}

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const bodyParams = await readBodyParams(request);
    const queryState = url.searchParams.get("state");
    const bodyState = bodyParams.get("state");
    const cookieState = getCookie(request, "palanart_telegram_state");
    const providerError =
      url.searchParams.get("error_description") ||
      url.searchParams.get("error") ||
      bodyParams.get("error_description") ||
      bodyParams.get("error");

    if (providerError) {
      return errorHtml("Telegram", `Вход остановлен провайдером: ${providerError}`);
    }

    const decoded = await resolveDecodedState(
      bodyState || queryState || cookieState,
      cookieState || queryState || bodyState,
    );
    if (!decoded) {
      return errorHtml(
        "Telegram",
        `Invalid auth state. method=${request.method}; query_state=${Boolean(queryState)}; body_state=${Boolean(bodyState)}; cookie_state=${Boolean(cookieState)}`,
      );
    }

    const payload = Array.from(bodyParams.entries()).length ? bodyParams : url.searchParams;
    const claims = await verifyTelegramWidgetPayload(payload);
    const providerUserId = String(claims.id || "");
    if (!providerUserId) {
      return errorHtml("Telegram", "Telegram не вернул идентификатор пользователя.");
    }

    const displayName = [claims.first_name || "", claims.last_name || ""].join(" ").trim() || "Telegram user";
    const authLink = await issueMarketplaceSession({
      provider: "telegram",
      providerUserId,
      name: displayName,
      avatarUrl: String(claims.photo_url || ""),
      username: String(claims.username || ""),
    }, decoded.role, decoded.returnTo);

    const response = redirect(authLink);
    response.headers.set("set-cookie", clearStateCookie());
    return response;
  } catch (error) {
    return errorHtml("Telegram", (error as Error).message);
  }
});
