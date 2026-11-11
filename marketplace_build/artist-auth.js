(function () {
  "use strict";
  const byId = function (id) { return document.getElementById(id); };
  const field = function (form, name) { return form.elements.namedItem(name); };
  const ui = window.PalanartArtistAuthUI;
  const bridge = window.PalanartAuthBridge && window.PalanartAuthBridge.protocolVersion === 2 ? window.PalanartAuthBridge : null;
  if (!ui) return;
  let busy = false, resetCooldown = 0, maxReady = false, maxTicket = "";
  function updateView() {
    if (!bridge) {
      byId("artist-auth-view").style.display = "grid";
      byId("artist-cabinet-view").style.display = "none";
      return;
    }
    ui.render();
    if (!busy) ui.renderMode();
    const pending = bridge.pendingMax("artist");
    if ((pending ? pending.ticket : "") !== maxTicket) {
      maxTicket = pending ? pending.ticket : ""; maxReady = false;
      byId("artist-max-auth-identity").textContent = "";
    }
    byId("artist-max-auth-panel").hidden = !pending;
    if (pending) byId("artist-max-auth-open").href = pending.url;
    const recovery = bridge.isRecovery() && MarketplaceStore.getCurrentArtist();
    byId("artist-password-update-form").hidden = !recovery;
    if (recovery) {
      byId("artist-auth-view").style.display = "none";
      byId("artist-cabinet-view").style.display = "none";
    }
  }
  async function run(button, action) {
    if (busy) return;
    busy = true; ui.message("");
    const buttons = Array.from(document.querySelectorAll('#artist-auth-view button, #artist-max-auth-panel button, #artist-password-update-form button, [data-artist-link], #artist-logout'));
    const states = buttons.map(function (item) { return item.disabled; });
    const label = button.textContent;
    buttons.forEach(function (item) { item.disabled = true; });
    button.textContent = "Подождите…"; button.setAttribute("aria-busy", "true");
    try {
      if (!bridge) throw new Error("Auth not loaded");
      const result = await action();
      if (!result.ok) ui.message(result.message || "Действие не выполнено. Повторите попытку.", "error");
      return result;
    } catch (_error) { ui.message("Сервис входа недоступен. Обновите страницу или повторите позже.", "error"); }
    finally {
      busy = false; buttons.forEach(function (item, index) { item.disabled = states[index]; });
      button.textContent = label; button.removeAttribute("aria-busy"); updateView();
    }
  }
  byId("artist-register-form").addEventListener("submit", function (event) {
    event.preventDefault(); const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries()); payload.photo = ui.registrationPhoto();
    run(form.querySelector('[type="submit"]'), async function () {
      const result = await bridge.signUpWithEmail("artist", payload);
      if (result.ok) {
        field(form, "password").value = "";
        field(byId("artist-login-form"), "email").value = payload.email;
        if (result.needsConfirmation) ui.message("Подтвердите e-mail по ссылке из письма. До подтверждения кабинет закрыт.", "success");
        else {
          const artist = MarketplaceStore.getCurrentArtist();
          if (artist && bridge.isAuthenticated(artist.authUserId)) ui.completeRegistration(payload, artist);
          ui.message("Аккаунт создан. Добро пожаловать в кабинет!", "success");
        }
      }
      return result;
    });
  });
  byId("artist-login-form").addEventListener("submit", function (event) {
    event.preventDefault(); const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    run(form.querySelector('[type="submit"]'), async function () {
      const result = await bridge.signInWithEmail("artist", payload);
      if (result.ok) { field(form, "password").value = ""; ui.message("Вы вошли в кабинет.", "success"); }
      return result;
    });
  });
  document.querySelectorAll("[data-artist-social], [data-artist-link]").forEach(function (button) {
    button.addEventListener("click", function () {
      run(button, function () { return bridge.signInWithSocial("artist", button.dataset.artistSocial || button.dataset.artistLink, Boolean(button.dataset.artistLink)); });
    });
  });
  byId("artist-forgot-password").addEventListener("click", function () {
    ui.message(""); byId("artist-login-form").hidden = true; byId("artist-password-reset-form").hidden = false;
    field(byId("artist-password-reset-form"), "email").value = field(byId("artist-login-form"), "email").value;
    field(byId("artist-password-reset-form"), "email").focus();
  });
  function showLogin() { byId("artist-password-reset-form").hidden = true; byId("artist-login-form").hidden = false; }
  byId("artist-back-to-login").addEventListener("click", function () {
    ui.message(""); showLogin(); field(byId("artist-login-form"), "email").focus();
  });
  byId("artist-password-reset-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (Date.now() < resetCooldown) return ui.message("Подождите минуту перед повторной отправкой письма.", "error");
    const form = event.currentTarget;
    run(form.querySelector('[type="submit"]'), async function () {
      const result = await bridge.resetPassword(field(form, "email").value, "artist");
      if (result.ok) { resetCooldown = Date.now() + 60000; ui.message(result.message, "success"); }
      return result;
    });
  });
  byId("artist-password-update-form").addEventListener("submit", function (event) {
    event.preventDefault(); const form = event.currentTarget;
    run(form.querySelector('[type="submit"]'), async function () {
      const result = await bridge.updatePassword(field(form, "password").value);
      if (result.ok) { field(form, "password").value = ""; ui.message("Пароль сохранён.", "success"); }
      return result;
    });
  });
  byId("artist-logout").addEventListener("click", function (event) {
    run(event.currentTarget, async function () {
      const result = await bridge.logout(); if (result.ok) ui.message("Вы вышли из аккаунта.", "success"); return result;
    });
  });
  byId("artist-max-auth-check").addEventListener("click", function (event) {
    run(event.currentTarget, async function () {
      const result = await bridge.claimMax(maxReady);
      if (result.ok && !result.redirecting) {
        maxReady = result.ready;
        byId("artist-max-auth-identity").textContent = result.ready
          ? "MAX подтвердил: " + result.name + ". Нажмите ещё раз, чтобы продолжить с этим аккаунтом."
          : "Подтверждение пока не получено. Завершите вход в MAX.";
      }
      return result;
    });
  });
  byId("artist-max-auth-cancel").addEventListener("click", function () { bridge.cancelMax(); maxReady = false; updateView(); });
  document.querySelectorAll("[data-artist-auth-focus]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault(); const target = byId(link.dataset.artistAuthFocus);
      if (target.id === "artist-login-form") showLogin();
      target.scrollIntoView({ behavior: "smooth", block: "center" }); target.querySelector("input").focus({ preventScroll: true });
    });
  });
  if (new URLSearchParams(location.search).has("error") || new URLSearchParams(location.hash.slice(1)).has("error")) {
    ui.message("Вход отменён, ссылка недействительна или устарела. Начните вход заново.", "error");
    history.replaceState(null, "", location.pathname);
  }
  updateView();
  if (bridge) bridge.init({ role: "artist", onSession: updateView, onRecovery: updateView,
    onError: function (message) { ui.message(message, "error"); updateView(); }
  }).catch(function () { ui.message("Сервис входа недоступен. Повторите позже.", "error"); updateView(); });
  else ui.message("Сервис входа не загрузился. Обновите страницу.", "error");
})();
