(function () {
  // Public deployment settings. Browser-saved settings from the simulated auth release are ignored.
  window.PalanartAuthConfig = Object.freeze({
    configVersion: 7,
    mode: "supabase",
    supabaseUrl: "https://oimwiyncaxffcijqtmzf.supabase.co",
    supabaseAnonKey: "sb_publishable_qosHXZ_Op8I8JThZAHathg_oVbAGhNy",
    // Enable after SMTP and the exact confirmation/recovery redirects are verified.
    emailConfirmationReady: false,
    socialProviders: [
      { id: "google", label: "Google" },
      { id: "telegram", label: "Telegram" }, { id: "vk", label: "VK ID" },
      { id: "max", label: "MAX" }, { id: "yandex", label: "Яндекс ID" }
    ]
  });
})();
