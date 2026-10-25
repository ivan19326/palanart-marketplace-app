(function () {
  "use strict";
  const config = window.PalanartAuthConfig || {};
  let clientPromise, subscription;
  let verifiedUser = null;
  let authGeneration = 0;
  let eventSequence = 0;
  let recovery = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
  let activeOptions = {};
  const providerNames = { telegram: "Telegram", vk: "VK ID", max: "MAX", yandex: "Яндекс ID" };
  const networkMessage = "Не удалось связаться с сервисом входа. Проверьте соединение и повторите попытку. Если ошибка повторяется, сообщите поддержке PALANART.";
  function getMode() { return "supabase"; }
  function isConfigured() { return Boolean(config.supabaseUrl && config.supabaseAnonKey); }
  function canUseProvider(provider) { return Object.hasOwn(providerNames, provider) && isConfigured(); }
  function getSetupMessage() { return isConfigured() ? "" : "Сервис входа ещё не настроен владельцем PALANART."; }
  function returnUrl(role, reset) {
    const url = new URL(role === "artist" ? "artist.html" : "user.html", window.location.href);
    if (reset) url.searchParams.set("recovery", "1");
    return url.toString();
  }
  function errorMessage(error) {
    const messages = {
      invalid_credentials: "Неверный e-mail или пароль.",
      email_not_confirmed: "Подтвердите e-mail по ссылке из письма. Затем войдите в кабинет.",
      user_already_exists: "Этот e-mail уже зарегистрирован. Войдите или восстановите пароль.",
      email_exists: "Этот e-mail уже зарегистрирован. Войдите или восстановите пароль.",
      weak_password: "Пароль слишком простой. Используйте не менее 10 символов, буквы и цифры.",
      same_password: "Новый пароль должен отличаться от предыдущего.",
      over_email_send_rate_limit: "Письма отправляются слишком часто. Подождите несколько минут.",
      over_request_rate_limit: "Слишком много попыток. Подождите несколько минут.",
      email_address_not_authorized: "Отправка писем ещё не настроена владельцем PALANART. Обратитесь в поддержку.",
      signup_disabled: "Регистрация временно отключена владельцем PALANART.",
      otp_expired: "Ссылка устарела или уже использована. Запросите новое письмо.",
      session_not_found: "Сессия закончилась. Войдите ещё раз.",
      user_banned: "Доступ к аккаунту ограничен. Обратитесь в поддержку."
    };
    return messages[error && error.code] || (error && error.safeMessage) || networkMessage;
  }
  async function request(input, init) {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 15000);
    try { return await fetch(input, Object.assign({}, init, { signal: controller.signal })); }
    finally { clearTimeout(timer); }
  }
  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      const timer = setTimeout(function () { script.remove(); reject(new Error("SDK timeout")); }, 12000);
      script.src = "vendor/supabase-2.117.1.js";
      script.onload = function () { clearTimeout(timer); resolve(); };
      script.onerror = function () { clearTimeout(timer); script.remove(); reject(new Error("SDK unavailable")); };
      document.head.appendChild(script);
    });
  }
  async function ensureClient() {
    if (!isConfigured()) throw { safeMessage: getSetupMessage() };
    if (!clientPromise) {
      clientPromise = loadSdk().then(function () {
        return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
          global: { fetch: request }
        });
      }).catch(function (error) { clientPromise = null; throw error; });
    }
    return clientPromise;
  }
  function syncUser(role, user) {
    if (!window.MarketplaceStore || window.MarketplaceStore.authProtocolVersion !== 2) throw { safeMessage: "Обновите страницу, чтобы загрузить актуальную версию кабинета." };
    verifiedUser = user;
    if (!window.MarketplaceStore) return;
    const meta = user.user_metadata || {};
    const payload = {
      authUserId: user.id, name: meta.full_name || meta.name || user.email || "Заказчик",
      email: user.email || "", phone: meta.phone || "", city: meta.city || "",
      telegram: meta.telegram || "", photo: meta.avatar_url || meta.picture || "",
      createdAt: user.created_at, provider: (user.app_metadata || {}).provider || "email",
      providers: (user.app_metadata || {}).providers || ["email"]
    };
    const result = role === "artist"
      ? window.MarketplaceStore.ensureExternalArtistAccount(payload)
      : window.MarketplaceStore.ensureExternalUserAccount(payload);
    if (!result || !result.ok) throw { safeMessage: "Вход подтверждён, но кабинет не удалось открыть. Освободите место в браузере и повторите вход." };
  }
  async function validateSession(role) {
    const generation = authGeneration;
    const client = await ensureClient();
    const response = await client.auth.getSession();
    if (response.error) throw response.error;
    if (!response.data.session) {
      verifiedUser = null;
      if (window.MarketplaceStore) window.MarketplaceStore.clearExternalSession();
      return null;
    }
    // A browser-stored session alone never grants access; verify it with Auth.
    const checked = await client.auth.getUser();
    if (generation !== authGeneration) return null;
    if (checked.error || !checked.data.user) {
      verifiedUser = null;
      if (window.MarketplaceStore) window.MarketplaceStore.clearExternalSession();
      throw checked.error || new Error("Invalid session");
    }
    syncUser(role, checked.data.user);
    return response.data.session;
  }
  function notifyError(error) { if (activeOptions.onError) activeOptions.onError(errorMessage(error)); }
  async function init(options) {
    activeOptions = options || {};
    const role = activeOptions.role || "client";
    if (window.MarketplaceStore) window.MarketplaceStore.clearExternalSession();
    if (activeOptions.onMode) activeOptions.onMode("supabase");
    const client = await ensureClient();
    if (!subscription) {
      subscription = client.auth.onAuthStateChange(function (event, session) {
        const sequence = ++eventSequence;
        if (event === "SIGNED_OUT") authGeneration++;
        if (event === "PASSWORD_RECOVERY") recovery = true;
        // Auth callbacks run under the SDK auth lock: defer further auth calls.
        setTimeout(async function () {
          if (sequence !== eventSequence) return;
          try {
            if (event === "SIGNED_OUT" || !session) {
              verifiedUser = null;
              if (window.MarketplaceStore) window.MarketplaceStore.clearExternalSession();
            } else await validateSession(activeOptions.role || role);
            if (activeOptions.onRecovery && recovery && verifiedUser) activeOptions.onRecovery();
            if (activeOptions.onSession) activeOptions.onSession(verifiedUser ? session : null);
          } catch (error) { notifyError(error); }
        }, 0);
      });
    }
    const session = await validateSession(role);
    if (recovery && verifiedUser && activeOptions.onRecovery) activeOptions.onRecovery();
    if (activeOptions.onSession) activeOptions.onSession(session);
    return { mode: "supabase" };
  }
  function validatePassword(password) {
    return typeof password !== "string" || password.length < 10 || password.length > 128 || !/\p{L}/u.test(password) || !/\d/.test(password)
      ? "Используйте пароль от 10 до 128 символов, содержащий буквы и цифры." : "";
  }
  function validateContacts(payload) {
    if (String(payload.name || "").trim().length < 2) return "Укажите имя (не менее двух символов).";
    const phone = String(payload.phone || "").replace(/[\s()+.\-]/g, "");
    if (!/^\d{10,15}$/.test(phone)) return "Укажите телефон: от 10 до 15 цифр, можно с кодом страны.";
    if (String(payload.city || "").trim().length < 2) return "Выберите город или введите его вручную.";
    return "";
  }
  function validateRegistration(payload) {
    const contacts = validateContacts(payload);
    if (contacts) return contacts;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email || "").trim())) return "Укажите корректный e-mail.";
    return validatePassword(payload.password);
  }
  async function updateProfile(payload) {
    if (!verifiedUser) return { ok: false, message: "Сначала войдите в аккаунт." };
    const validation = validateContacts(payload);
    if (validation) return { ok: false, message: validation };
    try {
      const client = await ensureClient();
      const response = await client.auth.updateUser({ data: {
        full_name: payload.name.trim(), phone: payload.phone.trim(), city: payload.city.trim()
      } });
      if (response.error) throw response.error;
      if (!await validateSession(activeOptions.role || "client")) throw { safeMessage: "Сессия закончилась. Войдите ещё раз." };
      return { ok: true };
    } catch (error) { return { ok: false, message: errorMessage(error) }; }
  }
  async function signUpWithEmail(role, payload) {
    const validation = validateRegistration(payload);
    if (validation) return { ok: false, message: validation };
    try {
      const client = await ensureClient();
      const response = await client.auth.signUp({
        email: payload.email.trim().toLowerCase(), password: payload.password,
        options: { emailRedirectTo: returnUrl(role), data: {
          full_name: payload.name.trim(), phone: payload.phone.trim(), city: payload.city.trim()
        } }
      });
      if (response.error) throw response.error;
      if (response.data.user && Array.isArray(response.data.user.identities) && !response.data.user.identities.length) {
        return { ok: false, message: "Возможно, этот e-mail уже зарегистрирован. Войдите или восстановите пароль." };
      }
      if (response.data.session && !await validateSession(role)) throw { safeMessage: "Вход прерван. Повторите попытку." };
      return { ok: true, data: response.data, needsConfirmation: !response.data.session };
    } catch (error) { return { ok: false, message: errorMessage(error) }; }
  }
  async function signInWithEmail(role, payload) {
    try {
      const client = await ensureClient();
      const response = await client.auth.signInWithPassword({ email: String(payload.email || "").trim().toLowerCase(), password: payload.password });
      if (response.error) throw response.error;
      if (!await validateSession(role)) throw { safeMessage: "Вход прерван. Повторите попытку." };
      return { ok: true, data: response.data };
    } catch (error) { return { ok: false, message: errorMessage(error) }; }
  }
  async function resetPassword(email, role) {
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim())) return { ok: false, message: "Укажите корректный e-mail." };
      const client = await ensureClient();
      const response = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: returnUrl(role, true) });
      if (response.error) throw response.error;
      return { ok: true, message: "Если аккаунт с этим e-mail существует, письмо со ссылкой для восстановления будет отправлено. Проверьте также папку «Спам»." };
    } catch (error) { return { ok: false, message: errorMessage(error) }; }
  }
  async function updatePassword(password) {
    const validation = validatePassword(password);
    if (validation) return { ok: false, message: validation };
    if (!verifiedUser || !recovery) return { ok: false, message: "Сначала откройте ссылку из письма для восстановления пароля." };
    try {
      const client = await ensureClient();
      const response = await client.auth.updateUser({ password: password });
      if (response.error) throw response.error;
      recovery = false;
      history.replaceState(null, "", window.location.pathname);
      return { ok: true };
    } catch (error) { return { ok: false, message: errorMessage(error) }; }
  }
  async function signInWithSocial(role, provider, link) {
    if (!canUseProvider(provider)) return { ok: false, message: "Этот способ входа ещё не настроен." };
    try {
      const endpoint = config.supabaseUrl + "/functions/v1/auth-" + provider + "-start";
      let accessToken = "";
      if (link) {
        if (!verifiedUser) return { ok: false, message: "Для привязки сначала войдите в свой аккаунт." };
        const client = await ensureClient();
        const session = await client.auth.getSession();
        accessToken = session.data.session ? session.data.session.access_token : "";
      }
      const response = await request(endpoint, {
        method: "POST", headers: Object.assign({ "Content-Type": "application/json", apikey: config.supabaseAnonKey },
          accessToken ? { Authorization: "Bearer " + accessToken } : {}),
        body: JSON.stringify({ role: role, returnTo: returnUrl(role), link: Boolean(link) })
      });
      const data = await response.json();
      if (!response.ok || !data.url) return { ok: false, message: data.message || providerNames[provider] + ": вход ещё не настроен владельцем PALANART." };
      const target = new URL(data.url);
      if (target.origin !== new URL(config.supabaseUrl).origin) throw new Error("Unexpected auth origin");
      if (provider === "max" && data.claimSecret && data.ticket) {
        sessionStorage.setItem("palanart_max_pending", JSON.stringify({ url: target.toString(), ticket: data.ticket,
          secret: data.claimSecret, link: Boolean(link), createdAt: Date.now() }));
        return { ok: true, pendingMax: true };
      }
      window.location.assign(target.toString());
      return { ok: true, redirecting: true };
    } catch (_error) { return { ok: false, message: providerNames[provider] + ": сервис входа недоступен или ещё не настроен. Попробуйте e-mail или обратитесь в поддержку." }; }
  }
  async function logout() {
    authGeneration++;
    verifiedUser = null;
    if (window.MarketplaceStore) window.MarketplaceStore.clearExternalSession();
    try {
      const client = await ensureClient();
      const response = await client.auth.signOut({ scope: "local" });
      if (response.error) throw response.error;
      verifiedUser = null;
      recovery = false;
      if (window.MarketplaceStore) window.MarketplaceStore.logout();
      return { ok: true };
    } catch (error) { return { ok: false, message: errorMessage(error) }; }
  }
  function pendingMax() {
    try {
      const value = JSON.parse(sessionStorage.getItem("palanart_max_pending") || "null");
      if (!value || value.createdAt < Date.now() - 600000 || new URL(value.url).origin !== new URL(config.supabaseUrl).origin) return null;
      return value;
    } catch (_error) { return null; }
  }
  async function claimMax(confirm) {
    try {
      const pending = pendingMax();
      if (!pending) return { ok: false, message: "Попытка входа MAX устарела. Начните вход заново." };
      const response = await request(config.supabaseUrl + "/functions/v1/auth-max-claim", {
        method: "POST", headers: { "Content-Type": "application/json", apikey: config.supabaseAnonKey },
        body: JSON.stringify({ ticket: pending.ticket, secret: pending.secret, confirm: Boolean(confirm) })
      });
      const data = await response.json();
      if (!response.ok) return { ok: false, message: data.message || "Не удалось подтвердить вход MAX." };
      if (confirm && data.url) {
        const target = new URL(data.url);
        if (target.origin !== new URL(config.supabaseUrl).origin) throw new Error("Unexpected auth origin");
        sessionStorage.removeItem("palanart_max_pending");
        window.location.assign(target.toString());
        return { ok: true, redirecting: true };
      }
      return { ok: true, ready: Boolean(data.ready), name: data.name };
    } catch (_error) { return { ok: false, message: "Сервис входа MAX недоступен. Повторите попытку позже." }; }
  }
  window.PalanartAuthBridge = {
    protocolVersion: 2,
    getMode: getMode, isConfigured: isConfigured, canUseProvider: canUseProvider, getSetupMessage: getSetupMessage,
    init: init, signUpWithEmail: signUpWithEmail, signInWithEmail: signInWithEmail, signInWithSocial: signInWithSocial,
    resetPassword: resetPassword, updatePassword: updatePassword, updateProfile: updateProfile, isRecovery: function () { return recovery; },
    isAuthenticated: function (id) { return Boolean(verifiedUser && verifiedUser.id === id); },
    validateRegistration: validateRegistration, logout: logout,
    pendingMax: pendingMax, claimMax: claimMax, cancelMax: function () { sessionStorage.removeItem("palanart_max_pending"); }
  };
})();
