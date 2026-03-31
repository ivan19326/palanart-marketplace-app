(function () {
  const base = {
    mode: "supabase",
    supabaseUrl: "https://jioakguorsfvjuzyclrg.supabase.co",
    supabaseAnonKey: "sb_publishable__wR9JFE18O3i_LyxMXhAfw__zhG1t_P",
    socialProviders: [
      { id: "google", label: "Google" },
      { id: "vk", label: "VK ID" },
      { id: "telegram", label: "Telegram" }
    ],
    externalProviderUrls: {
      vk: "",
      telegram: ""
    }
  };

  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem("palanart_auth_config") || "{}");
  } catch (_error) {
    saved = {};
  }

  const providers = Array.isArray(saved.socialProviders) && saved.socialProviders.length
    ? saved.socialProviders
    : base.socialProviders;

  const externalProviderUrls = Object.assign({}, base.externalProviderUrls, saved.externalProviderUrls || {});

  window.PalanartAuthConfig = Object.assign({}, base, saved, {
    externalProviderUrls: externalProviderUrls,
    socialProviders: providers
  });
})();
