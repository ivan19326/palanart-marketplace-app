import { errorHtml, fetchJson, getProviderCallbackUrl, issueMarketplaceSession, parseJwtPayload, redirect, verifyAuthState } from "../_shared/marketplace-auth.ts";

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
    if (providerError) return errorHtml("Telegram", `Вход остановлен провайдером: ${providerError}`);
    if (!state || !code) return errorHtml("Telegram", "Не хватает параметров callback.");

    const decoded = await verifyAuthState(state);
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
    if (!providerUserId) return errorHtml("Telegram", "Telegram не вернул идентификатор пользователя.");

    const authLink = await issueMarketplaceSession({
      provider: "telegram",
      providerUserId,
      name: String(claims.name || tokenData.user?.name || tokenData.user?.first_name || "Telegram user"),
      avatarUrl: String(claims.picture || tokenData.user?.photo_url || ""),
      phone: String(claims.phone_number || tokenData.user?.phone_number || ""),
      username: String(claims.preferred_username || tokenData.user?.username || ""),
    }, decoded.role, decoded.returnTo);

    return redirect(authLink);
  } catch (error) {
    return errorHtml("Telegram", (error as Error).message);
  }
});
