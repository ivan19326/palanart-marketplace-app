import { errorHtml, fetchJson, getProviderCallbackUrl, issueMarketplaceSession, parseJwtPayload, redirect, verifyAuthState } from "../_shared/marketplace-auth.ts";

async function readBodyParams(request: Request): Promise<URLSearchParams> {
  const contentType = request.headers.get("content-type") || "";
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

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const bodyParams = await readBodyParams(request);
    const queryState = url.searchParams.get("state");
    const bodyState = bodyParams.get("state");
    const cookieState = getCookie(request, "palanart_telegram_state");
    const queryCode = url.searchParams.get("code");
    const bodyCode = bodyParams.get("code");
    const code = queryCode || bodyCode;
    const providerError =
      url.searchParams.get("error_description") ||
      url.searchParams.get("error") ||
      bodyParams.get("error_description") ||
      bodyParams.get("error");

    if (providerError) {
      return errorHtml("Telegram", `Вход остановлен провайдером: ${providerError}`);
    }

    if (!code) {
      return errorHtml(
        "Telegram",
        `Не хватает параметров callback. method=${request.method}; query_state=${Boolean(queryState)}; body_state=${Boolean(bodyState)}; cookie_state=${Boolean(cookieState)}; query_code=${Boolean(queryCode)}; body_code=${Boolean(bodyCode)}`,
      );
    }

    const decoded = await resolveDecodedState(cookieState || queryState || bodyState, queryState || bodyState || cookieState);
    if (!decoded) {
      return errorHtml(
        "Telegram",
        `Invalid auth state. method=${request.method}; query_state=${Boolean(queryState)}; body_state=${Boolean(bodyState)}; cookie_state=${Boolean(cookieState)}; query_code=${Boolean(queryCode)}; body_code=${Boolean(bodyCode)}`,
      );
    }

    const tokenUrl = Deno.env.get("TELEGRAM_TOKEN_URL") || "https://oauth.telegram.org/token";
    const tokenData = await fetchJson(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: Deno.env.get("TELEGRAM_CLIENT_ID") || "",
        client_secret: Deno.env.get("TELEGRAM_CLIENT_SECRET") || "",
        code,
        redirect_uri: getProviderCallbackUrl("telegram"),
        code_verifier: decoded.verifier || "",
      }),
    });

    const claims = tokenData.id_token ? parseJwtPayload(String(tokenData.id_token)) : {};
    const providerUserId = String(claims.sub || tokenData.user?.id || "");
    if (!providerUserId) {
      return errorHtml("Telegram", "Telegram не вернул идентификатор пользователя.");
    }

    const authLink = await issueMarketplaceSession({
      provider: "telegram",
      providerUserId,
      name: String(claims.name || tokenData.user?.name || tokenData.user?.first_name || "Telegram user"),
      avatarUrl: String(claims.picture || tokenData.user?.photo_url || ""),
      phone: String(claims.phone_number || tokenData.user?.phone_number || ""),
      username: String(claims.preferred_username || tokenData.user?.username || ""),
    }, decoded.role, decoded.returnTo);

    const response = redirect(authLink);
    response.headers.set("set-cookie", clearStateCookie());
    return response;
  } catch (error) {
    return errorHtml("Telegram", (error as Error).message);
  }
});
