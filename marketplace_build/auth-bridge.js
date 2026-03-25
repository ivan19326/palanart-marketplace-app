(function () {
  const config = window.PalanartAuthConfig || {};
  let clientPromise = null;
  let authSubscription = null;

  function isSupabaseMode() {
    return String(config.mode || "local").toLowerCase() === "supabase";
  }

  function isConfigured() {
    return Boolean(config.supabaseUrl && config.supabaseAnonKey);
  }

  function getMode() {
    return isSupabaseMode() && isConfigured() ? "supabase" : "local";
  }

  function canUseProvider(provider) {
    return Array.isArray(config.socialProviders) && config.socialProviders.some(function (item) { return item.id === provider; });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const existing = document.querySelector('script[data-auth-src="' + src + '"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        if (window.supabase && window.supabase.createClient) resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.authSrc = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function ensureClient() {
    if (!isSupabaseMode() || !isConfigured()) return Promise.resolve(null);
    if (!clientPromise) {
      clientPromise = loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2").then(function () {
        if (!window.supabase || !window.supabase.createClient) throw new Error("Supabase client load failed");
        return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      });
    }
    return clientPromise;
  }

  function externalPayload(sessionUser, role) {
    const meta = sessionUser.user_metadata || {};
    return {
      name: meta.full_name || meta.name || sessionUser.email || "",
      email: sessionUser.email || "",
      phone: meta.phone || "",
      city: meta.city || "",
      telegram: meta.telegram || "",
      photo: meta.avatar_url || meta.picture || ""
    };
  }

  function syncMarketplaceSession(role, sessionUser) {
    if (!sessionUser || !window.MarketplaceStore) return null;
    if (role === "artist") {
      return window.MarketplaceStore.ensureExternalArtistAccount(externalPayload(sessionUser, role));
    }
    return window.MarketplaceStore.ensureExternalUserAccount(externalPayload(sessionUser, role));
  }

  async function init(options) {
    const role = options && options.role ? options.role : "client";
    if (getMode() !== "supabase") {
      if (options && options.onMode) options.onMode("local");
      return { mode: "local" };
    }
    const client = await ensureClient();
    if (options && options.onMode) options.onMode("supabase");
    const result = await client.auth.getSession();
    if (result.data && result.data.session && result.data.session.user) {
      syncMarketplaceSession(role, result.data.session.user);
      if (options && options.onSession) options.onSession(result.data.session);
    }
    if (!authSubscription) {
      authSubscription = client.auth.onAuthStateChange(function (_event, session) {
        if (session && session.user) syncMarketplaceSession(role, session.user);
        if (!session && window.MarketplaceStore) window.MarketplaceStore.logout();
        if (options && options.onSession) options.onSession(session || null);
      });
    }
    return { mode: "supabase", client: client };
  }

  async function signUpWithEmail(role, payload) {
    const client = await ensureClient();
    const response = await client.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        emailRedirectTo: window.location.href.split("#")[0],
        data: {
          full_name: payload.name || "",
          phone: payload.phone || "",
          city: payload.city || "",
          role: role
        }
      }
    });
    if (response.error) return { ok: false, message: response.error.message };
    if (response.data && response.data.user) {
      syncMarketplaceSession(role, response.data.user);
    }
    return { ok: true, data: response.data };
  }

  async function signInWithEmail(role, payload) {
    const client = await ensureClient();
    const response = await client.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    });
    if (response.error) return { ok: false, message: response.error.message };
    if (response.data && response.data.user) {
      syncMarketplaceSession(role, response.data.user);
    }
    return { ok: true, data: response.data };
  }

  async function signInWithSocial(role, provider) {
    if (!canUseProvider(provider)) return { ok: false, message: "Провайдер пока не включён в конфиге." };
    const client = await ensureClient();
    const response = await client.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.href.split("#")[0] + "?auth_role=" + encodeURIComponent(role)
      }
    });
    if (response.error) return { ok: false, message: response.error.message };
    return { ok: true };
  }

  async function logout() {
    if (getMode() === "supabase") {
      const client = await ensureClient();
      await client.auth.signOut();
    }
    if (window.MarketplaceStore) window.MarketplaceStore.logout();
    return { ok: true };
  }

  window.PalanartAuthBridge = {
    getMode: getMode,
    isConfigured: isConfigured,
    canUseProvider: canUseProvider,
    init: init,
    signUpWithEmail: signUpWithEmail,
    signInWithEmail: signInWithEmail,
    signInWithSocial: signInWithSocial,
    logout: logout
  };
})();
