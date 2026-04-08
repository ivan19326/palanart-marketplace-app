import {
  errorHtml,
  fetchJson,
  getProviderCallbackUrl,
  issueMarketplaceSession,
  parseJwtPayload,
  redirect,
  verifyAuthState,
} from "../_shared/marketplace-auth.ts";

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const deviceId = url.searchParams.get("device_id") || url.searchParams.get("deviceId") || "";
    const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
    if (providerError) {
      return errorHtml("VK ID", `Вход остановлен провайдером: ${providerError}`);
    }
    if (!state || !code) {
      return errorHtml("VK ID", "Не хватает параметров callback.");
    }

    const decoded = await verifyAuthState(state);
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
    const userId = String(
      tokenData.user_id ||
      userData.user_id ||
      userData.id ||
      claims.sub ||
      "",
    );
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

    return redirect(authLink);
  } catch (error) {
    return errorHtml("VK ID", (error as Error).message);
  }
});
