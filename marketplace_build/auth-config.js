(function () {
  const CONFIG_VERSION = 3;
  const base = {
    configVersion: CONFIG_VERSION,
    mode: "local",
    supabaseUrl: "https://jioakguorsfvjuzyclrg.supabase.co",
    supabaseAnonKey: "sb_publishable__wR9JFE18O3i_LyxMXhAfw__zhG1t_P",
    socialProviders: [
      { id: "google", label: "Google" },
      { id: "vk", label: "VK ID" },
      { id: "telegram", label: "Telegram" }
    ],
    externalProviderUrls: {
      vk: "https://jioakguorsfvjuzyclrg.supabase.co/functions/v1/auth-vk-start",
      telegram: "https://jioakguorsfvjuzyclrg.supabase.co/functions/v1/auth-telegram-start"
    }
  };

  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem("palanart_auth_config") || "{}");
  } catch (_error) {
    saved = {};
  }

  if (!saved || typeof saved !== "object" || Number(saved.configVersion || 0) < CONFIG_VERSION) {
    saved = {
      configVersion: CONFIG_VERSION,
      mode: base.mode,
      supabaseUrl: base.supabaseUrl,
      supabaseAnonKey: base.supabaseAnonKey,
      socialProviders: base.socialProviders.slice(),
      externalProviderUrls: Object.assign({}, base.externalProviderUrls)
    };
  }

  const providers = Array.isArray(saved.socialProviders)
    ? saved.socialProviders.filter(function (provider) {
        return provider && provider.id;
      })
    : base.socialProviders.slice();

  const externalProviderUrls = Object.assign({}, base.externalProviderUrls, saved.externalProviderUrls || {});
  const merged = Object.assign({}, base, saved, {
    configVersion: CONFIG_VERSION,
    mode: typeof saved.mode === "string" && saved.mode ? saved.mode : base.mode,
    supabaseUrl: typeof saved.supabaseUrl === "string" && saved.supabaseUrl.trim() ? saved.supabaseUrl.trim() : base.supabaseUrl,
    supabaseAnonKey: typeof saved.supabaseAnonKey === "string" && saved.supabaseAnonKey.trim() ? saved.supabaseAnonKey.trim() : base.supabaseAnonKey,
    externalProviderUrls: externalProviderUrls,
    socialProviders: providers
  });

  window.PalanartAuthConfig = merged;

  try {
    localStorage.setItem("palanart_auth_config", JSON.stringify(merged));
  } catch (_error) {
    // Ignore storage write failures; the in-memory config is enough for runtime.
  }
})();
