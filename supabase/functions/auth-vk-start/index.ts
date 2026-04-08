import { createPkcePair, getProviderCallbackUrl, normalizeReturnTo, signAuthState } from "../_shared/marketplace-auth.ts";

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const role = url.searchParams.get("role") || "client";
    const returnTo = normalizeReturnTo(url.searchParams.get("returnTo"));
    const clientId = Deno.env.get("VK_CLIENT_ID");
    if (!clientId) return new Response("Missing VK_CLIENT_ID", { status: 500 });
    const pkce = await createPkcePair();

    const state = await signAuthState({
      role,
      returnTo,
      verifier: pkce.verifier,
      provider: "vk",
      createdAt: Date.now(),
    });

    const authorizeUrl = new URL(Deno.env.get("VK_AUTHORIZE_URL") || "https://id.vk.com/authorize");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", getProviderCallbackUrl("vk"));
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("response_mode", "callback");
    authorizeUrl.searchParams.set("code_challenge", pkce.challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    authorizeUrl.searchParams.set("scope", Deno.env.get("VK_SCOPE") || "email");
    authorizeUrl.searchParams.set("state", state);

    const cookie = [
      `palanart_vk_state=${encodeURIComponent(state)}`,
      "Path=/functions/v1/auth-vk-callback",
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
