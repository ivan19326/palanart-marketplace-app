import { errorHtml, issueMarketplaceSession, redirect, verifyAuthState } from "../_shared/marketplace-auth.ts";

async function readBodyParams(request: Request): Promise<URLSearchParams> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await request.json().catch(() => null);
    return json && typeof json === "object"
      ? new URLSearchParams(Object.entries(json).map(([key, value]) => [key, String(value)]))
      : new URLSearchParams();
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    return new URLSearchParams(Array.from(form.entries()).map(([key, value]) => [key, String(value)]));
  }
  if (contentType.includes("multipart/form-data")) {
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
      // Fall through to the secondary state source when the first one is stale.
    }
  }
  if (fallback) {
    return await verifyAuthState(fallback);
  }
  return null;
}

function base64UrlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function parseJwtSections(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Telegram вернул некорректный id_token.");
  const [headerPart, payloadPart, signaturePart] = parts;
  return {
    header: JSON.parse(new TextDecoder().decode(base64UrlDecode(headerPart))) as Record<string, unknown>,
    payload: JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart))) as Record<string, unknown>,
    signingInput: new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    signature: base64UrlDecode(signaturePart),
  };
}

async function verifyTelegramIdToken(idToken: string): Promise<Record<string, unknown>> {
  const clientId = Deno.env.get("TELEGRAM_CLIENT_ID");
  if (!clientId) throw new Error("Missing TELEGRAM_CLIENT_ID");

  const { header, payload, signingInput, signature } = parseJwtSections(idToken);
  const kid = String(header.kid || "");
  if (!kid) throw new Error("Telegram id_token не содержит kid.");

  const response = await fetch("https://oauth.telegram.org/.well-known/jwks.json");
  if (!response.ok) throw new Error("Не удалось получить публичные ключи Telegram.");
  const jwks = await response.json();
  const jwk = Array.isArray(jwks.keys)
    ? jwks.keys.find((item: Record<string, unknown>) => item.kid === kid)
    : null;
  if (!jwk) throw new Error("Telegram public key not found.");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signingInput);
  if (!valid) throw new Error("Telegram id_token не прошёл криптографическую проверку.");

  if (String(payload.iss || "") !== "https://oauth.telegram.org") {
    throw new Error("Telegram вернул неверного издателя токена.");
  }

  if (String(payload.aud || "") !== clientId) {
    throw new Error("Telegram вернул токен для другого клиента.");
  }

  const expiresAt = Number(payload.exp || 0) * 1000;
  if (!expiresAt || expiresAt < Date.now()) {
    throw new Error("Telegram id_token уже истёк. Повторите вход.");
  }

  return payload;
}

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const bodyParams = await readBodyParams(request);
    const queryState = url.searchParams.get("state");
    const bodyState = bodyParams.get("state");
    const cookieState = getCookie(request, "palanart_telegram_state");
    const queryToken = url.searchParams.get("id_token");
    const bodyToken = bodyParams.get("id_token");
    const idToken = queryToken || bodyToken;
    const providerError =
      url.searchParams.get("error_description") ||
      url.searchParams.get("error") ||
      bodyParams.get("error_description") ||
      bodyParams.get("error");

    if (providerError) {
      return errorHtml("Telegram", `Вход остановлен провайдером: ${providerError}`);
    }

    if (!idToken) {
      return errorHtml(
        "Telegram",
        `Не хватает параметров callback. method=${request.method}; query_state=${Boolean(queryState)}; body_state=${Boolean(bodyState)}; cookie_state=${Boolean(cookieState)}; query_id_token=${Boolean(queryToken)}; body_id_token=${Boolean(bodyToken)}`,
      );
    }

    const decoded = await resolveDecodedState(
      cookieState || queryState || bodyState,
      queryState || bodyState || cookieState,
    );
    if (!decoded) {
      return errorHtml(
        "Telegram",
        `Invalid auth state. method=${request.method}; query_state=${Boolean(queryState)}; body_state=${Boolean(bodyState)}; cookie_state=${Boolean(cookieState)}; query_id_token=${Boolean(queryToken)}; body_id_token=${Boolean(bodyToken)}`,
      );
    }

    const claims = await verifyTelegramIdToken(idToken);
    const providerUserId = String(claims.sub || claims.id || "");
    if (!providerUserId) {
      return errorHtml("Telegram", "Telegram не вернул идентификатор пользователя.");
    }

    const authLink = await issueMarketplaceSession({
      provider: "telegram",
      providerUserId,
      name: String(claims.name || "Telegram user"),
      avatarUrl: String(claims.picture || ""),
      phone: String(claims.phone_number || ""),
      username: String(claims.preferred_username || ""),
    }, decoded.role, decoded.returnTo);

    const response = redirect(authLink);
    response.headers.set("set-cookie", clearStateCookie());
    return response;
  } catch (error) {
    return errorHtml("Telegram", (error as Error).message);
  }
});
