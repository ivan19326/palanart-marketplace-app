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
    return Array.isArray(config.socialProviders) && config.socialProviders.some(function (item) {
      return item.id === provider;
    });
  }

  function providerLabel(provider) {
    const labels = { google: "Google", vk: "VK ID", telegram: "Telegram" };
    return labels[provider] || provider;
  }

  function defaultExternalProviderUrl(provider) {
    if (!config.supabaseUrl) return "";
    const base = String(config.supabaseUrl).replace(/\/+$/, "");
    return base + "/functions/v1/auth-" + provider + "-start";
  }

  function externalProviderUrl(provider) {
    const urls = config.externalProviderUrls || {};
    const explicit = typeof urls[provider] === "string" ? urls[provider].trim() : "";
    return explicit || defaultExternalProviderUrl(provider);
  }

  function getSetupMessage() {
    if (!isSupabaseMode()) return "Соцвход пока выключен. Включите режим Supabase в админке.";
    if (!isConfigured()) return "Соцвход еще не настроен. Добавьте Supabase URL и publishable key в админке.";
    return "";
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

  function externalPayload(sessionUser) {
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
      return window.MarketplaceStore.ensureExternalArtistAccount(externalPayload(sessionUser));
    }
    return window.MarketplaceStore.ensureExternalUserAccount(externalPayload(sessionUser));
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
    if (getMode() !== "supabase") {
      return { ok: false, message: getSetupMessage() || "Сервисный вход пока не настроен." };
    }

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
    if (response.data && response.data.user) syncMarketplaceSession(role, response.data.user);
    return { ok: true, data: response.data };
  }

  async function signInWithEmail(role, payload) {
    if (getMode() !== "supabase") {
      return { ok: false, message: getSetupMessage() || "Сервисный вход пока не настроен." };
    }

    const client = await ensureClient();
    const response = await client.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    });

    if (response.error) return { ok: false, message: response.error.message };
    if (response.data && response.data.user) syncMarketplaceSession(role, response.data.user);
    return { ok: true, data: response.data };
  }

  async function signInWithSocial(role, provider) {
    if (getMode() !== "supabase") {
      return { ok: false, message: getSetupMessage() || "Соцвход пока не настроен." };
    }

    if (!canUseProvider(provider)) {
      return { ok: false, message: providerLabel(provider) + " пока не включен в настройках входа." };
    }

    if (provider !== "google") {
      const externalUrl = externalProviderUrl(provider);
      if (!externalUrl) {
        return {
          ok: false,
          message: providerLabel(provider) + " показан в интерфейсе, но внешний auth-слой еще не подключен. Добавьте URL провайдера в админке или используйте вход по e-mail."
        };
      }

      const url = new URL(externalUrl, window.location.origin);
      url.searchParams.set("role", role);
      url.searchParams.set("returnTo", window.location.href.split("#")[0]);
      window.location.href = url.toString();
      return { ok: true };
    }

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
    getSetupMessage: getSetupMessage,
    init: init,
    signUpWithEmail: signUpWithEmail,
    signInWithEmail: signInWithEmail,
    signInWithSocial: signInWithSocial,
    logout: logout
  };
})();
