import { createPkcePair, getProviderCallbackUrl, normalizeReturnTo, redirect, signAuthState } from "../_shared/marketplace-auth.ts";

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const role = url.searchParams.get("role") || "client";
    const returnTo = normalizeReturnTo(url.searchParams.get("returnTo"));
    const clientId = Deno.env.get("VK_CLIENT_ID");
    if (!clientId) return new Response("Missing VK_CLIENT_ID", { status: 500 });

    const { verifier, challenge } = await createPkcePair();
    const state = await signAuthState({
      role,
      returnTo,
      verifier,
      provider: "vk",
      createdAt: Date.now(),
    });

    const authorizeUrl = new URL(Deno.env.get("VK_AUTHORIZE_URL") || "https://oauth.vk.com/authorize");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", getProviderCallbackUrl("vk"));
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "email");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    authorizeUrl.searchParams.set("v", "5.199");

    return redirect(authorizeUrl.toString());
  } catch (error) {
    return new Response((error as Error).message, { status: 500 });
  }
});
