(function () {
  "use strict";
  const config = window.PalanartAssistantConfig || {};
  if (!config.enabled || !config.endpoint) return;
  let endpoint;
  try {
    endpoint = new URL(config.endpoint);
    const local = ["localhost", "127.0.0.1"].includes(location.hostname) &&
      ["localhost", "127.0.0.1"].includes(endpoint.hostname);
    if (endpoint.protocol !== "https:" && !(local && endpoint.protocol === "http:")) return;
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== "/v1/chat") return;
  } catch (_error) { return; }
  const root = document.createElement("div");
  root.className = "palanart-assistant";
  root.innerHTML = '<button type="button" class="pa-launcher" aria-expanded="false" aria-controls="pa-chat">Помощник PALANART</button>' +
    '<section id="pa-chat" class="pa-chat" role="dialog" aria-label="Консультант PALANART" hidden>' +
    '<header><strong>Консультант PALANART</strong><button type="button" class="pa-close" aria-label="Закрыть консультанта">×</button></header>' +
    '<p class="pa-notice">Ответы ИИ могут содержать ошибки. Цены и даты уточняйте у исполнителя. Не отправляйте пароли и личные данные. Текст вопроса передаётся OpenAI для ответа.</p>' +
    '<div class="pa-messages" role="log" aria-live="polite" aria-relevant="additions" tabindex="0" aria-label="Диалог"></div>' +
    '<p class="pa-status" role="status" aria-live="polite"></p>' +
    '<form><label for="pa-question">Ваш вопрос</label><textarea id="pa-question" name="question" maxlength="1500" rows="3" required placeholder="Например: нужен ведущий в Чебоксарах"></textarea>' +
    '<div class="pa-actions"><button type="submit">Отправить</button><button type="button" class="pa-clear">Новый диалог</button></div></form></section>';
  document.body.appendChild(root);
  const launcher = root.querySelector(".pa-launcher"), panel = root.querySelector(".pa-chat");
  const form = root.querySelector("form"), input = root.querySelector("textarea"), send = root.querySelector('[type="submit"]');
  const status = root.querySelector(".pa-status"), messages = root.querySelector(".pa-messages"), clear = root.querySelector(".pa-clear");
  let turns = [], busy = false;
  function setOpen(open) {
    panel.hidden = !open; launcher.setAttribute("aria-expanded", String(open));
    if (open) input.focus(); else launcher.focus();
  }
  function message(text, role, profiles) {
    const item = document.createElement("div"); item.className = "pa-message pa-message--" + role;
    const label = document.createElement("strong"); label.textContent = role === "user" ? "Вы" : "Помощник";
    const content = document.createElement("p"); content.textContent = text;
    item.append(label, content);
    (profiles || []).slice(0, 3).forEach(function (profile) {
      try {
        const url = new URL(profile.url);
        if (url.origin !== "https://palanart.github.io" || url.pathname !== "/index.html" || !url.searchParams.has("profile")) return;
        const link = document.createElement("a"); link.href = url.toString();
        link.textContent = profile.name + " — " + profile.city + (profile.priceFrom ? ", от " + profile.priceFrom + " ₽" : "");
        item.appendChild(link);
      } catch (_error) { /* Ignore malformed links. */ }
    });
    messages.appendChild(item); messages.scrollTop = messages.scrollHeight;
  }
  launcher.addEventListener("click", function () { setOpen(panel.hidden); });
  root.querySelector(".pa-close").addEventListener("click", function () { setOpen(false); });
  panel.addEventListener("keydown", function (event) { if (event.key === "Escape") setOpen(false); });
  clear.addEventListener("click", function () { turns = []; messages.textContent = ""; status.textContent = ""; input.value = ""; input.focus(); });
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const question = input.value.trim();
    if (busy || !question || question.length > 1500) return;
    busy = true; send.disabled = true; clear.disabled = true; input.readOnly = true;
    send.setAttribute("aria-busy", "true"); status.textContent = "Готовлю ответ…";
    const controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 30000);
    const history = turns.slice(-4).map(function (turn) { return { role: turn.role, content: turn.content.slice(0, 1000) }; });
    const requestMessages = history.concat({ role: "user", content: question });
    try {
      const response = await fetch(endpoint.toString(), { method: "POST", credentials: "omit", signal: controller.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: requestMessages }) });
      const result = await response.json();
      if (!response.ok) { status.textContent = typeof result.message === "string" ? result.message : "Ответ не получен. Повторите позже."; return; }
      if (typeof result.answer !== "string" || !result.answer.trim()) throw new Error("Empty response");
      message(question, "user"); message(result.answer, "assistant", result.profiles);
      turns = requestMessages.concat({ role: "assistant", content: result.answer });
      input.value = ""; status.textContent = "Ответ готов.";
    } catch (_error) { status.textContent = "Не удалось получить ответ. Вопрос сохранён в поле — повторите позже."; }
    finally {
      clearTimeout(timer); busy = false; send.disabled = false; clear.disabled = false; input.readOnly = false;
      send.removeAttribute("aria-busy"); if (!panel.hidden) input.focus();
    }
  });
})();
