(function () {
  "use strict";
  const provider = document.body.dataset.provider;
  const error = document.getElementById("provider-error");
  const widget = document.getElementById("provider-widget");
  const params = new URLSearchParams(window.location.search);
  const base = window.PalanartAuthConfig.supabaseUrl;
  let submitted = false;
  function submit(values) {
    if (submitted) return;
    submitted = true;
    const form = document.createElement("form");
    form.method = "post";
    form.action = base + "/functions/v1/auth-" + provider + "-callback";
    Object.keys(values).forEach(function (name) {
      const input = document.createElement("input");
      input.type = "hidden"; input.name = name; input.value = values[name]; form.appendChild(input);
    });
    document.body.appendChild(form);
    error.textContent = "Проверяем вход…";
    form.submit();
  }
  if (provider === "telegram") {
    const state = params.get("state") || "";
    const bot = params.get("bot") || "";
    if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-zA-Z0-9_]{5,32}$/.test(bot)) {
      error.textContent = "Не хватает параметров входа. Вернитесь назад и начните вход заново.";
      return;
    }
    window.palanartTelegramLogin = function (user) {
      if (!user || !user.id || !user.hash || !user.auth_date) {
        error.textContent = "Telegram не подтвердил вход. Повторите попытку.";
        return;
      }
      const values = { state: state };
      ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"].forEach(function (key) {
        // Do not add absent optional keys: that changes the provider's signature.
        if (Object.hasOwn(user, key)) values[key] = String(user[key]);
      });
      submit(values);
    };
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", bot);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-lang", "ru");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-onauth", "palanartTelegramLogin(user)");
    script.onerror = function () { error.textContent = "Не удалось загрузить Telegram. Попробуйте вход по e-mail."; };
    widget.appendChild(script);
  } else if (provider === "max") {
    const initData = window.WebApp && window.WebApp.initData;
    if (!initData) {
      error.textContent = "Откройте мини-приложение через кнопку MAX на странице входа PALANART.";
      return;
    }
    const state = new URLSearchParams(initData).get("start_param") || "";
    if (!/^[a-f0-9]{64}$/.test(state)) {
      error.textContent = "Попытка входа недействительна. Начните вход через MAX заново.";
      return;
    }
    const button = document.createElement("button");
    button.className = "primary-btn"; button.type = "button"; button.textContent = "Подтвердить вход через MAX";
    button.addEventListener("click", function () { button.disabled = true; submit({ state: state, initData: initData }); });
    widget.appendChild(button);
  }
})();
