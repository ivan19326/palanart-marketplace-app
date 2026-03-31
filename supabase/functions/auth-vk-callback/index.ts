import { errorHtml, fetchJson, getProviderCallbackUrl, issueMarketplaceSession, redirect, verifyAuthState } from "../_shared/marketplace-auth.ts";

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
    if (providerError) return errorHtml("VK ID", `Вход остановлен провайдером: ${providerError}`);
    if (!state || !code) return errorHtml("VK ID", "Не хватает параметров callback.");

    const decoded = await verifyAuthState(state);
    const tokenUrl = new URL(Deno.env.get("VK_TOKEN_URL") || "https://oauth.vk.com/access_token");
    tokenUrl.searchParams.set("client_id", Deno.env.get("VK_CLIENT_ID") || "");
    tokenUrl.searchParams.set("client_secret", Deno.env.get("VK_CLIENT_SECRET") || "");
    tokenUrl.searchParams.set("redirect_uri", getProviderCallbackUrl("vk"));
    tokenUrl.searchParams.set("code", code);
    if (decoded.verifier) tokenUrl.searchParams.set("code_verifier", decoded.verifier);

    const tokenData = await fetchJson(tokenUrl.toString());
    const accessToken = tokenData.access_token;
    const userId = tokenData.user_id || tokenData.user?.id;
    if (!accessToken || !userId) return errorHtml("VK ID", "VK не вернул access token или user id.");

    const profileUrl = new URL(Deno.env.get("VK_USERINFO_URL") || "https://api.vk.com/method/users.get");
    profileUrl.searchParams.set("user_ids", String(userId));
    profileUrl.searchParams.set("fields", "photo_200,city,screen_name");
    profileUrl.searchParams.set("access_token", accessToken);
    profileUrl.searchParams.set("v", "5.199");

    const profileData = await fetchJson(profileUrl.toString());
    const profile = Array.isArray(profileData.response) ? profileData.response[0] : null;
    if (!profile) return errorHtml("VK ID", "VK не вернул профиль пользователя.");

    const authLink = await issueMarketplaceSession({
      provider: "vk",
      providerUserId: String(profile.id || userId),
      name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "VK user",
      avatarUrl: profile.photo_200 || "",
      email: tokenData.email || "",
      city: profile.city?.title || "",
      username: profile.screen_name || "",
    }, decoded.role, decoded.returnTo);

    return redirect(authLink);
  } catch (error) {
    return errorHtml("VK ID", (error as Error).message);
  }
});
