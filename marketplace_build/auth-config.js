(function () {
  const base = {
    mode: "supabase",
    supabaseUrl: "https://jioakguorsfvjuzyclrg.supabase.co",
    supabaseAnonKey: "sb_publishable__wR9JFE18O3i_LyxMXhAfw__zhG1t_P",
    socialProviders: []
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
