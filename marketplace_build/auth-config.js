(function () {
  const base = {
    mode: "local",
    supabaseUrl: "",
    supabaseAnonKey: "",
    socialProviders: [
      { id: "google", label: "Google" }
    ]
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

  window.PalanartAuthConfig = Object.assign({}, base, saved, {
    socialProviders: providers
  });
})();
