import { createPkcePair, getProviderCallbackUrl, normalizeReturnTo, signAuthState } from "../_shared/marketplace-auth.ts";

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const role = url.searchParams.get("role") || "client";
    const returnTo = normalizeReturnTo(url.searchParams.get("returnTo"));
    const clientId = Deno.env.get("TELEGRAM_CLIENT_ID");
    if (!clientId) return new Response("Missing TELEGRAM_CLIENT_ID", { status: 500 });

    const { verifier, challenge } = await createPkcePair();
    const state = await signAuthState({
      role,
      returnTo,
      verifier,
      provider: "telegram",
      createdAt: Date.now(),
    });

    const authorizeUrl = new URL(Deno.env.get("TELEGRAM_AUTHORIZE_URL") || "https://oauth.telegram.org/auth");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", getProviderCallbackUrl("telegram"));
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "openid profile");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    const cookie = [
      `palanart_telegram_state=${encodeURIComponent(state)}`,
      "Path=/functions/v1/auth-telegram-callback",
      "HttpOnly",
      "Secure",
      "SameSite=None",
      "Max-Age=900",
    ].join("; ");

    return new Response(null, {
      status: 302,
      headers: {
        location: authorizeUrl.toString(),
        "set-cookie": cookie,
      },
    });
  } catch (error) {
    return new Response((error as Error).message, { status: 500 });
  }
});
