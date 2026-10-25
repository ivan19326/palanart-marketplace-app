import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.1";

const encoder = new TextEncoder();
const providers = ["telegram", "vk", "max", "yandex"];
const labels = { telegram: "Telegram", vk: "VK ID", max: "MAX", yandex: "Яндекс ID" };
function env(name, fallback = "") { return Deno.env.get(name) || fallback; }
function required(name) { const value = env(name); if (!value) throw new Error("configuration"); return value; }
function site() { return env("PUBLIC_SITE_URL", "https://palanart.github.io/"); }
function origins() { return env("ALLOWED_RETURN_ORIGINS", new URL(site()).origin).split(",").map((s) => s.trim()); }
function adminClient() {
  return createClient(env("PROJECT_SUPABASE_URL") || required("SUPABASE_URL"),
    env("PROJECT_SUPABASE_SERVICE_ROLE_KEY") || required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } });
}
function baseUrl() { return (env("PROJECT_SUPABASE_URL") || required("SUPABASE_URL")).replace(/\/+$/, ""); }
function callbackUrl(provider) { return baseUrl() + "/functions/v1/auth-" + provider + "-callback"; }
function headers(request) {
  const result = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "Vary": "Origin" };
  const origin = request.headers.get("origin");
  if (origin && origins().includes(origin)) result["Access-Control-Allow-Origin"] = origin;
  result["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info";
  result["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
  return result;
}
function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers(request), "Content-Type": "application/json; charset=utf-8" } });
}
function escape(value) { return String(value).replace(/[&<>"']/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[s]); }
function failure(request, provider, reason = "") {
  const message = reason === "identity-linked"
    ? "Этот способ входа уже привязан к другому аккаунту. Войдите в него или обратитесь в поддержку."
    : reason === "expired" ? "Попытка входа устарела или уже использована. Начните вход заново."
    : "Вход не завершён. Сервис недоступен, не настроен или подтверждение было отменено. Попробуйте e-mail или обратитесь в поддержку PALANART.";
  if (request.method === "POST" && (request.headers.get("content-type") || "").includes("application/json")) return json(request, { message }, 400);
  return new Response(`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(labels[provider])} — PALANART</title><body><h1>${escape(labels[provider])}</h1><p>${escape(message)}</p><a href="${escape(new URL("user.html", site()).toString())}">Вернуться ко входу</a></body></html>`,
    { status: 400, headers: { ...headers(request), "Content-Type": "text/html; charset=utf-8" } });
}
export function normalizeReturnTo(input, role = "client") {
  const expected = new URL(role === "artist" ? "artist.html" : "user.html", site());
  if (!input) return expected.toString();
  const target = new URL(input);
  if (target.protocol !== "https:" || !origins().includes(target.origin) || target.username || target.password ||
      !/\/(user|artist)\.html$/.test(target.pathname)) throw new Error("return-origin");
  target.search = ""; target.hash = "";
  return target.toString();
}
export async function sha256(value) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))); }
function hex(bytes) { return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""); }
function random() { return hex(crypto.getRandomValues(new Uint8Array(32))); }
async function hmacBytes(keyBytes, value) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}
export function equal(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function uniqueParams(params) {
  const seen = new Set();
  for (const [key] of params) { if (seen.has(key)) throw new Error("duplicate-parameter"); seen.add(key); }
}
function checkDate(value) {
  const timestamp = Number(value) * 1000;
  if (!Number.isFinite(timestamp) || timestamp < Date.now() - 600000 || timestamp > Date.now() + 30000) throw new Error("expired");
}
export async function verifyTelegram(params, token) {
  uniqueParams(params);
  if (!/^\d+$/.test(params.get("id") || "")) throw new Error("identity");
  checkDate(params.get("auth_date"));
  const expectedHash = params.get("hash") || "";
  const allowed = new Set(["id", "first_name", "last_name", "username", "photo_url", "auth_date"]);
  for (const [key] of params) if (key !== "hash" && key !== "state" && !allowed.has(key)) throw new Error("unexpected-parameter");
  const data = Array.from(params).filter(([key]) => allowed.has(key)).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const secret = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token)));
  const actualHash = hex(await hmacBytes(secret, data.map(([key, value]) => key + "=" + value).join("\n")));
  if (!equal(actualHash, expectedHash)) throw new Error("signature");
  return Object.fromEntries(data);
}
export async function verifyMax(initData, token, expectedState) {
  if (typeof initData !== "string" || initData.length > 16000) throw new Error("payload");
  const params = new URLSearchParams(initData);
  uniqueParams(params);
  checkDate(params.get("auth_date"));
  if (!equal(params.get("start_param"), expectedState)) throw new Error("state");
  const data = Array.from(params).filter(([key]) => key !== "hash").sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const secret = await hmacBytes(encoder.encode("WebAppData"), token);
  const actualHash = hex(await hmacBytes(secret, data.map(([key, value]) => key + "=" + value).join("\n")));
  if (!equal(actualHash, params.get("hash") || "")) throw new Error("signature");
  const user = JSON.parse(params.get("user") || "null");
  if (!user || !/^\d+$/.test(String(user.id))) throw new Error("identity");
  return user;
}
function cookie(provider, value, age = 600) {
  return `__Host-palanart_${provider}=${value}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${age}`;
}
function readCookie(request, provider) {
  const key = `__Host-palanart_${provider}=`;
  return (request.headers.get("cookie") || "").split(";").map((s) => s.trim()).find((s) => s.startsWith(key))?.slice(key.length) || "";
}
function configured(provider) {
  if (!providers.includes(provider)) throw new Error("provider");
  if (provider === "telegram") { required("TELEGRAM_BOT_USERNAME"); if (!env("TELEGRAM_BOT_TOKEN", env("TELEGRAM_CLIENT_SECRET"))) throw new Error("configuration"); }
  if (provider === "vk") required("VK_CLIENT_ID");
  if (provider === "yandex") { required("YANDEX_CLIENT_ID"); required("YANDEX_CLIENT_SECRET"); }
  if (provider === "max") { required("MAX_BOT_TOKEN"); required("MAX_BOT_USERNAME"); }
}
async function loadFlow(admin, provider, state) {
  if (!/^[a-f0-9]{64}$/.test(state || "")) throw new Error("expired");
  const result = await admin.from("palanart_auth_flows").select("*").eq("token_hash", await sha256(state)).eq("provider", provider).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (result.error || !result.data) throw new Error("expired");
  return result.data;
}
async function pkceChallenge(verifier) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function redirect(request, location, setCookie) {
  const result = new Response(null, { status: 303, headers: { ...headers(request), Location: location } });
  if (setCookie) result.headers.set("Set-Cookie", setCookie);
  return result;
}
export async function handleStart(request, provider) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(request) });
  try {
    configured(provider);
    const admin = adminClient();
    if (request.method === "POST") {
      if (!origins().includes(request.headers.get("origin"))) return json(request, { message: "Источник запроса не разрешён." }, 403);
      if (Number(request.headers.get("content-length") || 0) > 4096) throw new Error("payload");
      const body = await request.json();
      const role = body.role === "artist" ? "artist" : "client";
      let userId = null;
      if (body.link) {
        const bearer = request.headers.get("authorization") || "";
        if (!bearer.startsWith("Bearer ")) throw new Error("authentication");
        const checked = await admin.auth.getUser(bearer.slice(7));
        if (checked.error || !checked.data.user) throw new Error("authentication");
        userId = checked.data.user.id;
      }
      const token = random();
      const pollSecret = provider === "max" ? random() : null;
      const inserted = await admin.from("palanart_auth_flows").insert({
        token_hash: await sha256(token), provider, role, return_to: normalizeReturnTo(body.returnTo, role),
        link_user_id: userId, verifier: ["vk", "yandex"].includes(provider) ? random() : null,
        poll_secret_hash: pollSecret ? await sha256(pollSecret) : null,
        expires_at: new Date(Date.now() + 600000).toISOString()
      });
      if (inserted.error) throw new Error("database");
      // Expired state is never reusable; cleanup contains no user accounts.
      await admin.from("palanart_auth_flows").delete().lt("expires_at", new Date().toISOString());
      return json(request, { url: baseUrl() + "/functions/v1/auth-" + provider + "-start?ticket=" + token,
        ...(pollSecret ? { ticket: token, claimSecret: pollSecret } : {}) });
    }
    if (request.method !== "GET") return json(request, { message: "Метод не поддерживается." }, 405);
    const state = new URL(request.url).searchParams.get("ticket");
    const flow = await loadFlow(admin, provider, state);
    const browserSecret = random();
    const bound = await admin.from("palanart_auth_flows").update({ browser_hash: await sha256(browserSecret) })
      .eq("token_hash", flow.token_hash).is("browser_hash", null).select("token_hash").maybeSingle();
    if (bound.error || !bound.data) throw new Error("expired");
    let target;
    if (provider === "telegram") {
      target = new URL("telegram-login.html", site());
      target.searchParams.set("state", state);
      target.searchParams.set("bot", required("TELEGRAM_BOT_USERNAME"));
    } else if (provider === "max") {
      // MAX has a documented mini-app identity flow, not a generic website OAuth endpoint.
      target = new URL("https://max.ru/" + encodeURIComponent(required("MAX_BOT_USERNAME")));
      target.searchParams.set("startapp", state);
    } else {
      target = new URL(provider === "vk" ? "https://id.vk.com/authorize" : "https://oauth.yandex.ru/authorize");
      target.searchParams.set("response_type", "code");
      target.searchParams.set("client_id", required(provider === "vk" ? "VK_CLIENT_ID" : "YANDEX_CLIENT_ID"));
      target.searchParams.set("redirect_uri", callbackUrl(provider));
      target.searchParams.set("state", state);
      if (["vk", "yandex"].includes(provider)) {
        target.searchParams.set("code_challenge", await pkceChallenge(flow.verifier));
        target.searchParams.set("code_challenge_method", "S256");
        if (provider === "vk") target.searchParams.set("scope", "email");
      }
    }
    return redirect(request, target.toString(), cookie(provider, browserSecret));
  } catch (error) { return failure(request, provider, error.message); }
}
async function fetchJson(url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error("provider-response");
  return data;
}
async function providerProfile(provider, params, flow, state) {
  if (provider === "telegram") {
    const user = await verifyTelegram(params, env("TELEGRAM_BOT_TOKEN", env("TELEGRAM_CLIENT_SECRET")));
    return { id: user.id, name: [user.first_name, user.last_name].filter(Boolean).join(" "), avatar: user.photo_url, username: user.username };
  }
  if (provider === "max") {
    const user = await verifyMax(params.get("initData"), required("MAX_BOT_TOKEN"), state);
    return { id: String(user.id), name: [user.first_name, user.last_name].filter(Boolean).join(" "), avatar: user.photo_url, username: user.username };
  }
  const code = params.get("code");
  if (!code || code.length > 4096) throw new Error("code");
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callbackUrl(provider) });
  if (provider === "yandex") {
    body.set("client_id", required("YANDEX_CLIENT_ID")); body.set("client_secret", required("YANDEX_CLIENT_SECRET"));
    body.set("code_verifier", flow.verifier);
    const token = await fetchJson("https://oauth.yandex.ru/token", { method: "POST", body });
    if (!token.access_token) throw new Error("token");
    const user = await fetchJson("https://login.yandex.ru/info?format=json", { headers: { Authorization: "OAuth " + token.access_token } });
    if (user.client_id && user.client_id !== required("YANDEX_CLIENT_ID")) throw new Error("audience");
    return { id: user.id, name: user.real_name || user.display_name || user.login,
      email: user.default_email, avatar: user.is_avatar_empty || !user.default_avatar_id ? "" : "https://avatars.yandex.net/get-yapic/" + encodeURIComponent(user.default_avatar_id) + "/islands-200" };
  }
  body.set("client_id", required("VK_CLIENT_ID")); body.set("code_verifier", flow.verifier);
  body.set("state", state);
  if (env("VK_CLIENT_SECRET")) body.set("client_secret", env("VK_CLIENT_SECRET"));
  const deviceId = params.get("device_id") || params.get("deviceId");
  if (!deviceId) throw new Error("device");
  body.set("device_id", deviceId);
  const token = await fetchJson("https://id.vk.com/oauth2/auth", { method: "POST", body });
  if (!token.access_token) throw new Error("token");
  // Read profile from the authenticated provider API; never trust an unverified JWT decode.
  const result = await fetchJson("https://id.vk.com/oauth2/user_info", { method: "POST", body: new URLSearchParams({ client_id: required("VK_CLIENT_ID"), access_token: token.access_token }) });
  const user = result.user;
  if (!user || String(user.user_id) !== String(token.user_id)) throw new Error("identity");
  return { id: String(user.user_id), name: [user.first_name, user.last_name].filter(Boolean).join(" "), email: user.email, phone: user.phone, avatar: user.avatar };
}
async function findLegacyUser(admin, provider, id) {
  const emails = [`${provider}_${id}@auth.dvizhart.local`, `${provider}_${id}@auth.palanart.local`];
  for (let page = 1; ; page++) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (result.error) throw new Error("database");
    const found = result.data.users.find((u) => emails.includes(u.email));
    if (found) return found;
    if (result.data.users.length < 200) return null;
  }
}
export async function resolveUser(admin, provider, profile, linkUserId) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(String(profile.id || ""))) throw new Error("identity");
  const mapped = await admin.from("palanart_external_identities").select("user_id").eq("provider", provider).eq("subject", String(profile.id)).maybeSingle();
  if (mapped.error) throw new Error("database");
  if (mapped.data && linkUserId && mapped.data.user_id !== linkUserId) throw new Error("identity-linked");
  let user;
  const id = mapped.data?.user_id || linkUserId;
  if (id) {
    const result = await admin.auth.admin.getUserById(id);
    if (result.error) throw new Error("database"); user = result.data.user;
  } else user = await findLegacyUser(admin, provider, String(profile.id));
  // Match only issuer + stable subject or an explicitly authenticated link request.
  // An unverified email supplied by a provider can never take over an email account.
  if (!user) {
    const email = `${provider}_${profile.id}@auth.palanart.local`;
    const result = await admin.auth.admin.createUser({ email, email_confirm: true,
      app_metadata: { provider, providers: [provider], palanart_role: "client" },
      user_metadata: { full_name: profile.name || labels[provider], phone: profile.phone || "", city: "",
        avatar_url: profile.avatar || "", contact_email: profile.email || "",
        telegram: provider === "telegram" && profile.username ? "@" + profile.username : "" }
    });
    if (result.error) {
      // A concurrent callback may have created the same stable Auth identity.
      user = await findLegacyUser(admin, provider, String(profile.id));
      if (!user) throw new Error("database");
    } else user = result.data.user;
  }
  if (!mapped.data) {
    const inserted = await admin.from("palanart_external_identities").insert({ provider, subject: String(profile.id), user_id: user.id });
    if (inserted.error) {
      const rechecked = await admin.from("palanart_external_identities").select("user_id").eq("provider", provider).eq("subject", String(profile.id)).maybeSingle();
      if (rechecked.error || !rechecked.data || rechecked.data.user_id !== user.id) throw new Error("identity-linked");
    }
  }
  const app = user.app_metadata || {};
  const updated = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...app, providers: Array.from(new Set([...(app.providers || []), provider])) }
  });
  if (updated.error) throw new Error("database");
  return user;
}
export async function handleCallback(request, provider) {
  try {
    configured(provider);
    if (!["GET", "POST"].includes(request.method)) return json(request, { message: "Метод не поддерживается." }, 405);
    const params = new URL(request.url).searchParams;
    if (request.method === "POST") {
      if (Number(request.headers.get("content-length") || 0) > 20000) throw new Error("payload");
      const body = new URLSearchParams(await request.text());
      for (const [key, value] of body) params.append(key, value);
    }
    uniqueParams(params);
    if (params.has("error")) throw new Error("cancelled");
    const state = params.get("state");
    const admin = adminClient();
    const flow = await loadFlow(admin, provider, state);
    const browser = readCookie(request, provider);
    // MAX starts in a separate webview. Signed start_param binds its login to state.
    // Linking an existing account additionally requires the original browser binding.
    if (provider !== "max") {
      if (!browser || !flow.browser_hash || !equal(await sha256(browser), flow.browser_hash)) throw new Error("browser-binding");
    }
    if (!flow.browser_hash) throw new Error("expired");
    const profile = await providerProfile(provider, params, flow, state);
    if (provider === "max") {
      // No session or account linking in the MAX webview. The initiating browser
      // must claim with its separate secret and explicitly confirm the identity.
      const approved = await admin.from("palanart_auth_flows").update({ verified_profile: profile })
        .eq("token_hash", flow.token_hash).is("verified_profile", null).select("token_hash").maybeSingle();
      if (approved.error || !approved.data) throw new Error("expired");
      return new Response('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MAX — PALANART</title><h1>MAX подтвердил вашу личность</h1><p>Вернитесь во вкладку PALANART, нажмите «Проверить подтверждение MAX» и подтвердите показанное имя.</p></html>',
        { headers: { ...headers(request), "Content-Type": "text/html; charset=utf-8" } });
    }
    const claimed = await admin.from("palanart_auth_flows").delete().eq("token_hash", flow.token_hash).select("token_hash").maybeSingle();
    if (claimed.error || !claimed.data) throw new Error("expired");
    const user = await resolveUser(admin, provider, profile, flow.link_user_id);
    const returnTo = normalizeReturnTo(flow.return_to, flow.role);
    const result = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email, options: { redirectTo: returnTo } });
    if (result.error || !result.data.properties?.action_link) throw new Error("session");
    return redirect(request, result.data.properties.action_link, cookie(provider, "", 0));
  } catch (error) { return failure(request, provider, error.message); }
}

export async function handleMaxClaim(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(request) });
  try {
    if (request.method !== "POST" || !origins().includes(request.headers.get("origin"))) return json(request, { message: "Источник запроса не разрешён." }, 403);
    const body = await request.json();
    if (!/^[a-f0-9]{64}$/.test(body.secret || "")) throw new Error("expired");
    const admin = adminClient();
    const flow = await loadFlow(admin, "max", body.ticket);
    if (!flow.poll_secret_hash || !equal(await sha256(body.secret), flow.poll_secret_hash)) throw new Error("expired");
    if (!flow.verified_profile) return json(request, { ready: false });
    if (!body.confirm) return json(request, { ready: true, name: flow.verified_profile.name || "Пользователь MAX" });
    const claimed = await admin.from("palanart_auth_flows").delete().eq("token_hash", flow.token_hash).select("token_hash").maybeSingle();
    if (claimed.error || !claimed.data) throw new Error("expired");
    const user = await resolveUser(admin, "max", flow.verified_profile, flow.link_user_id);
    const result = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email,
      options: { redirectTo: normalizeReturnTo(flow.return_to, flow.role) } });
    if (result.error || !result.data.properties?.action_link) throw new Error("session");
    return json(request, { url: result.data.properties.action_link });
  } catch (error) { return failure(request, "max", error.message); }
}
