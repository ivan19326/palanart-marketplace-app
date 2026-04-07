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

  const providerMap = new Map();
  base.socialProviders.forEach(function (provider) {
    providerMap.set(provider.id, provider);
  });
  if (Array.isArray(saved.socialProviders)) {
    saved.socialProviders.forEach(function (provider) {
      if (provider && provider.id) providerMap.set(provider.id, provider);
    });
  }
  const providers = Array.from(providerMap.values());

  const externalProviderUrls = Object.assign({}, base.externalProviderUrls, saved.externalProviderUrls || {});

  window.PalanartAuthConfig = Object.assign({}, base, saved, {
    externalProviderUrls: externalProviderUrls,
    socialProviders: providers
  });
})();
