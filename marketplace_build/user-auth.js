(function () {
  "use strict";
  const bridge = window.PalanartAuthBridge;
  let busy = false;
  let resetCooldown = 0;
  let maxReady = false;
  function field(form, name) { return form.elements.namedItem(name); }
  function updateView() {
    const pending = bridge && bridge.pendingMax();
    byId("max-auth-panel").hidden = !pending;
    if (pending) byId("max-auth-open").href = pending.url;
    const resetting = bridge && bridge.isRecovery() && MarketplaceStore.getCurrentUser();
    byId("password-update-form").hidden = !resetting;
    renderCabinet();
    const current = MarketplaceStore.getCurrentUser();
    const profileForm = byId("account-profile-form");
    if (current && !profileForm.contains(document.activeElement)) {
      ["name", "phone", "city"].forEach(function (name) { field(profileForm, name).value = current[name] || ""; });
    }
    if (resetting) {
      byId("auth-view").style.display = "none";
      byId("cabinet-view").style.display = "none";
    }
  }
  async function run(button, action) {
    if (busy) return;
    busy = true;
    const label = button.textContent;
    const buttons = Array.from(document.querySelectorAll(".auth-box button"));
    const disabled = buttons.map(function (item) { return item.disabled; });
    buttons.forEach(function (item) { item.disabled = true; });
    button.textContent = "Подождите…";
    button.setAttribute("aria-busy", "true");
    try {
      if (!bridge) throw new Error("Сервис входа не загрузился. Обновите страницу.");
      const result = await action();
      if (!result.ok) showMessage(result.message || "Действие не выполнено. Повторите попытку.", "error");
      return result;
    } catch (_error) {
      showMessage("Сервис входа недоступен. Обновите страницу или повторите попытку позже.", "error");
      return { ok: false };
    } finally {
      busy = false;
      buttons.forEach(function (item, i) { item.disabled = disabled[i]; });
      button.textContent = label;
      button.removeAttribute("aria-busy");
      updateView();
    }
  }
  byId("register-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    run(form.querySelector('[type="submit"]'), async function () {
      const result = await bridge.signUpWithEmail("client", payload);
      if (result.ok) {
        field(form, "password").value = "";
        field(byId("login-form"), "email").value = payload.email;
        showMessage(result.needsConfirmation ? "Откройте письмо и подтвердите e-mail по ссылке. До подтверждения вход в кабинет закрыт." : "Аккаунт создан. Добро пожаловать в кабинет!", "success");
      }
      return result;
    });
  });
  byId("login-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    run(form.querySelector('[type="submit"]'), async function () {
      const result = await bridge.signInWithEmail("client", payload);
      if (result.ok) { field(form, "password").value = ""; showMessage("Вы вошли в кабинет.", "success"); }
      return result;
    });
  });
  byId("forgot-password").addEventListener("click", function () {
    byId("password-reset-form").hidden = false;
    field(byId("password-reset-form"), "email").value = field(byId("login-form"), "email").value;
    field(byId("password-reset-form"), "email").focus();
  });
  byId("back-to-login").addEventListener("click", function () {
    byId("password-reset-form").hidden = true;
    field(byId("login-form"), "email").focus();
  });
  byId("password-reset-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (Date.now() < resetCooldown) return showMessage("Подождите минуту перед повторной отправкой письма.", "error");
    const form = event.currentTarget;
    run(form.querySelector('[type="submit"]'), async function () {
      const result = await bridge.resetPassword(field(form, "email").value, "client");
      if (result.ok) { resetCooldown = Date.now() + 60000; showMessage(result.message, "success"); }
      return result;
    });
  });
  byId("password-update-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    run(form.querySelector('[type="submit"]'), async function () {
      const result = await bridge.updatePassword(field(form, "password").value);
      if (result.ok) { field(form, "password").value = ""; showMessage("Пароль сохранён. Вы вошли в кабинет.", "success"); }
      return result;
    });
  });
  byId("logout-user").addEventListener("click", function (event) {
    run(event.currentTarget, async function () {
      const result = await bridge.logout();
      if (result.ok) showMessage("Вы вышли из аккаунта.", "success");
      return result;
    });
  });
  byId("account-profile-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    run(form.querySelector('[type="submit"]'), async function () {
      const result = await bridge.updateProfile(payload);
      if (result.ok) showMessage("Контакты сохранены.", "success");
      return result;
    });
  });
  document.querySelectorAll("[data-user-social], [data-user-link]").forEach(function (button) {
    button.addEventListener("click", function () {
      run(button, function () { return bridge.signInWithSocial("client", button.dataset.userSocial || button.dataset.userLink, Boolean(button.dataset.userLink)); });
    });
  });
  byId("max-auth-check").addEventListener("click", function (event) {
    run(event.currentTarget, async function () {
      const result = await bridge.claimMax(maxReady);
      if (result.ok && !result.redirecting) {
        maxReady = result.ready;
        byId("max-auth-identity").textContent = result.ready ? "MAX подтвердил: " + result.name + ". Нажмите ещё раз, чтобы продолжить с этим аккаунтом." : "Подтверждение ещё не получено. Откройте MAX и завершите вход.";
      }
      return result;
    });
  });
  byId("max-auth-cancel").addEventListener("click", function () { bridge.cancelMax(); maxReady = false; updateView(); });
  document.querySelectorAll("[data-auth-focus]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      const target = byId(link.dataset.authFocus);
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.querySelector("input").focus({ preventScroll: true });
    });
  });
  byId("detect-user-city").addEventListener("click", async function (event) {
    const button = event.currentTarget;
    if (!navigator.geolocation) return showMessage("Геолокация не поддерживается. Выберите город или введите его вручную.", "error");
    button.disabled = true;
    button.textContent = "Определяем город…";
    let timer;
    try {
      const position = await new Promise(function (resolve, reject) {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000, maximumAge: 300000 });
      });
      const controller = new AbortController();
      timer = setTimeout(function () { controller.abort(); }, 10000);
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.search = new URLSearchParams({ format: "jsonv2", lat: position.coords.latitude, lon: position.coords.longitude, "accept-language": "ru" }).toString();
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("lookup");
      const address = (await response.json()).address || {};
      const city = address.city || address.town || address.village || address.municipality;
      if (!city) throw new Error("city");
      field(byId("register-form"), "city").value = city;
      showMessage("Город определён: " + city + ". При необходимости измените его вручную.", "success");
    } catch (_error) {
      showMessage("Не удалось определить город. Разрешите геолокацию или выберите город из списка; можно ввести его вручную.", "error");
    } finally {
      clearTimeout(timer);
      button.disabled = false;
      button.textContent = "Определить город по геолокации";
    }
  });
  byId("export-browser-data").addEventListener("click", function () {
    try {
      const data = MarketplaceStore.getDb();
      const json = JSON.stringify(data, function (key, value) { return /password|token|secret/i.test(key) ? undefined : value; }, 2);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = "palanart-browser-history.json"; link.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      showMessage("Копия истории скачана. Пароли и ключи доступа в неё не включены.", "success");
    } catch (_error) { showMessage("Не удалось скачать историю. Проверьте разрешения браузера.", "error"); }
  });
  byId("user-auth-mode").textContent = "Вход по e-mail и паролю. Социальный вход доступен после подключения соответствующего сервиса владельцем PALANART.";
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  if (query.has("error") || hash.has("error")) {
    showMessage("Ссылка входа устарела, отменена или недействительна. Повторите вход или запросите восстановление пароля.", "error");
    history.replaceState(null, "", window.location.pathname);
  }
  updateView();
  if (bridge) bridge.init({ role: "client", onSession: updateView, onRecovery: updateView,
    onError: function (message) { showMessage(message, "error"); updateView(); }
  }).catch(function () { showMessage("Сервис входа недоступен. Попробуйте ещё раз позже.", "error"); updateView(); });
  else showMessage("Сервис входа не загрузился. Обновите страницу.", "error");
})();
