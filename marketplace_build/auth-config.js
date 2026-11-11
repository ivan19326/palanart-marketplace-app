(function () {
  // Public deployment settings. Browser-saved settings from the simulated auth release are ignored.
  window.PalanartAuthConfig = Object.freeze({
    configVersion: 6,
    mode: "supabase",
    supabaseUrl: "https://jioakguorsfvjuzyclrg.supabase.co",
    supabaseAnonKey: "sb_publishable__wR9JFE18O3i_LyxMXhAfw__zhG1t_P",
    socialProviders: [
      { id: "google", label: "Google" },
      { id: "telegram", label: "Telegram" }, { id: "vk", label: "VK ID" },
      { id: "max", label: "MAX" }, { id: "yandex", label: "Яндекс ID" }
    ]
  });
})();
