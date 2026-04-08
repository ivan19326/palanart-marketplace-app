import {
  errorHtml,
  fetchJson,
  getProviderCallbackUrl,
  issueMarketplaceSession,
  parseJwtPayload,
  verifyAuthState,
} from "../_shared/marketplace-auth.ts";

async function resolveDecodedState(primary: string, fallback: string): Promise<Awaited<ReturnType<typeof verifyAuthState>>> {
  try {
    return await verifyAuthState(primary);
  } catch (_primaryError) {
    if (fallback && fallback !== primary) {
      return await verifyAuthState(fallback);
    }
    throw _primaryError;
  }
}

async function readBodyParams(request: Request): Promise<URLSearchParams> {
  if (request.method === "GET" || request.method === "HEAD") {
    return new URLSearchParams();
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return new URLSearchParams(await request.text());
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const params = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") {
        params.set(key, value);
      }
    }
    return params;
  }

  return new URLSearchParams();
}

function readCookie(request: Request, name: string): string {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return "";
}

function clearStateCookie(): string {
  return [
    "palanart_vk_state=",
    "Path=/functions/v1/auth-vk-callback",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Max-Age=0",
  ].join("; ");
}

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const bodyParams = await readBodyParams(request.clone());
    const cookieState = readCookie(request, "palanart_vk_state");
    const queryState = url.searchParams.get("state") || bodyParams.get("state");
    const state = cookieState || queryState;
    const code = url.searchParams.get("code") || bodyParams.get("code");
    const deviceId = url.searchParams.get("device_id") ||
      url.searchParams.get("deviceId") ||
      bodyParams.get("device_id") ||
      bodyParams.get("deviceId") ||
      "";
    const providerError = url.searchParams.get("error_description") ||
      url.searchParams.get("error") ||
      bodyParams.get("error_description") ||
      bodyParams.get("error");

    if (providerError) {
      return errorHtml("VK ID", `Вход остановлен провайдером: ${providerError}`);
    }

    if (!state || !code) {
      const debug = [
        `method=${request.method}`,
        `query_state=${Boolean(url.searchParams.get("state"))}`,
        `body_state=${Boolean(bodyParams.get("state"))}`,
        `cookie_state=${Boolean(cookieState)}`,
        `query_code=${Boolean(url.searchParams.get("code"))}`,
        `body_code=${Boolean(bodyParams.get("code"))}`,
      ].join("; ");

      return new Response(
        `<!doctype html><html lang="ru"><meta charset="utf-8"><title>VK ID</title><body style="font-family:Arial,sans-serif;background:#0b1220;color:#fff;padding:32px"><h1>VK ID</h1><p>Неверное состояние аутентификации</p><p style="opacity:.8">${debug}</p></body></html>`,
        {
          status: 400,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "set-cookie": clearStateCookie(),
          },
        },
      );
    }

    const decoded = await resolveDecodedState(state, queryState);
    const tokenUrl = Deno.env.get("VK_TOKEN_URL") || "https://id.vk.com/oauth2/auth";
    const tokenBody = new URLSearchParams();
    tokenBody.set("grant_type", "authorization_code");
    tokenBody.set("client_id", Deno.env.get("VK_CLIENT_ID") || "");
    tokenBody.set("client_secret", Deno.env.get("VK_CLIENT_SECRET") || "");
    tokenBody.set("redirect_uri", getProviderCallbackUrl("vk"));
    tokenBody.set("code", code);
    if (deviceId) tokenBody.set("device_id", deviceId);
    if (decoded.verifier) tokenBody.set("code_verifier", decoded.verifier);

    const tokenData = await fetchJson(tokenUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: tokenBody.toString(),
    });

    const accessToken = tokenData.access_token;
    const userData = tokenData.user || {};
    const claims = typeof tokenData.id_token === "string" ? parseJwtPayload(tokenData.id_token) : {};
    const userId = String(tokenData.user_id || userData.user_id || userData.id || claims.sub || "");

    if (!accessToken || !userId) {
      return errorHtml("VK ID", "VK ID не вернул access token или user id.");
    }

    const firstName = String(claims.given_name || userData.first_name || "");
    const lastName = String(claims.family_name || userData.last_name || "");
    const fullName = String(
      claims.name ||
        [firstName, lastName].filter(Boolean).join(" ") ||
        userData.name ||
        "VK user",
    );
    const avatarUrl = String(claims.picture || userData.avatar || userData.avatar_url || "");
    const email = String(claims.email || tokenData.email || userData.email || "");
    const phone = String(claims.phone_number || userData.phone || "");
    const city = String(userData.city?.title || userData.city || "");
    const username = String(userData.screen_name || userData.domain || "");

    const authLink = await issueMarketplaceSession({
      provider: "vk",
      providerUserId: userId,
      name: fullName,
      avatarUrl,
      email,
      phone,
      city,
      username,
    }, decoded.role, decoded.returnTo);

    return new Response(null, {
      status: 302,
      headers: {
        location: authLink,
        "set-cookie": clearStateCookie(),
      },
    });
  } catch (error) {
    return errorHtml("VK ID", (error as Error).message);
  }
});
