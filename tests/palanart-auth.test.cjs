const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, '');
function storage() {
  const values = new Map();
  return { getItem: (k) => values.get(k) || null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k), values };
}
const testUser = () => ({ id: '11111111-1111-4111-8111-111111111111', email: 'auth-test@example.invalid',
  created_at: '2026-01-01T00:00:00Z', identities: [{ provider: 'email' }], app_metadata: { provider: 'email' },
  user_metadata: { full_name: 'Тестовый заказчик', phone: '+79990000000', city: 'Казань' } });
const valid = { name: 'Тестовый заказчик', email: 'AUTH-TEST@example.invalid', phone: '+7 (999) 000-00-00', city: 'Казань', password: 'TestPassword123' };
function browser(hash = '') {
  const state = { user: testUser(), session: null, calls: [], redirects: [] };
  const auth = {
    getSession: async () => ({ data: { session: state.session }, error: null }),
    getUser: async () => { state.calls.push('verify'); return state.getUser ? state.getUser() : { data: { user: state.failVerify ? null : state.user }, error: state.failVerify ? { code: 'session_not_found' } : null }; },
    onAuthStateChange: (fn) => { state.onAuth = fn; return { data: { subscription: {} } }; },
    signUp: async (payload) => { state.calls.push(['signup', payload]); return state.signup || { data: { user: state.user, session: null }, error: null }; },
    signInWithPassword: async (payload) => { state.calls.push(['signin', payload]); if (state.signInError) return { error: state.signInError }; state.session = { user: state.user, access_token: 'TEST_ACCESS' }; return { data: { user: state.user, session: state.session }, error: null }; },
    resetPasswordForEmail: async (...args) => { state.calls.push(['reset', args]); return { error: null }; },
    updateUser: async (...args) => { state.calls.push(['update', args]); return { data: { user: state.user }, error: null }; },
    signOut: async () => { state.session = null; return { error: null }; }
  };
  const localStorage = storage(); localStorage.setItem('palanart_auth_config', JSON.stringify({ mode: 'local', configVersion: 999 }));
  const context = vm.createContext({ localStorage, sessionStorage: storage(), URL, URLSearchParams, AbortController,
    setTimeout, clearTimeout, console, history: { replaceState() {} },
    location: { href: 'https://palanart.github.io/user.html' + hash, origin: 'https://palanart.github.io', pathname: '/user.html', hash,
      assign: (url) => state.redirects.push(url) },
    supabase: { createClient: () => ({ auth }) },
    fetch: async (...args) => { state.calls.push(['fetch', args]); if (state.fetch) return state.fetch(...args); throw new Error('network unavailable'); }
  });
  context.window = context;
  for (const p of ['auth-config.js', 'marketplace-core.js', 'auth-bridge.js']) vm.runInContext(read('marketplace_build/' + p), context, { filename: p });
  return { state, context, bridge: context.PalanartAuthBridge, store: context.MarketplaceStore };
}
test('old saved local configuration cannot re-enable simulated authentication', async () => {
  const b = browser(); assert.equal(b.bridge.getMode(), 'supabase');
  assert.equal(b.context.PalanartAuthConfig.mode, 'supabase');
  for (const provider of ['telegram', 'vk', 'max', 'yandex']) {
    assert.equal((await b.bridge.signInWithSocial('client', provider)).ok, false);
  }
  assert.equal(b.store.getDb().users.length, 0); assert.equal(b.store.getCurrentUser(), null);
});
test('all registration fields are validated before the backend is called', async () => {
  for (const change of [{ name: ' ' }, { email: 'bad' }, { phone: '123' }, { city: '' }, { password: '1234567890' }, { password: 'short1' }]) {
    const b = browser(); assert.equal((await b.bridge.signUpWithEmail('client', { ...valid, ...change })).ok, false);
    assert.equal(b.state.calls.length, 0);
  }
});
test('unconfirmed signup cannot create a local session or enter a cabinet', async () => {
  const b = browser(); const result = await b.bridge.signUpWithEmail('client', valid);
  assert.equal(result.ok, true); assert.equal(result.needsConfirmation, true);
  assert.equal(b.store.getCurrentUser(), null); assert.equal(b.store.getDb().users.length, 0);
  const submitted = b.state.calls.find((v) => v[0] === 'signup')[1];
  assert.equal(submitted.email, valid.email.toLowerCase());
  assert.equal(submitted.options.emailRedirectTo, 'https://palanart.github.io/user.html');
  assert.equal(submitted.options.data.role, undefined);
});
test('duplicate signup is detected from the Auth response without account listing', async () => {
  const b = browser(); b.state.signup = { data: { user: { ...testUser(), identities: [] }, session: null }, error: null };
  const result = await b.bridge.signUpWithEmail('client', valid); assert.equal(result.ok, false);
  assert.match(result.message, /уже зарегистрирован/); assert.equal(b.store.getDb().users.length, 0);
});
test('login, logout and login preserve a legacy profile and history without storing the password', async () => {
  const b = browser(); const db = b.store.getDb();
  db.users.push({ id: 'legacy-client', email: valid.email.toLowerCase(), name: 'Старое имя', password: 'LEGACY_SECRET', savedProfiles: ['profile-1'], compareProfiles: [] });
  b.context.localStorage.setItem(b.store.DB_KEY, JSON.stringify(db));
  assert.equal((await b.bridge.signInWithEmail('client', valid)).ok, true);
  assert.equal(b.store.getCurrentUser().id, 'legacy-client');
  assert.deepEqual(Array.from(b.store.getCurrentUser().savedProfiles), ['profile-1']);
  assert.equal(b.store.getDb().users[0].password, undefined);
  assert.equal(b.store.getCurrentUser().authUserId, b.state.user.id);
  assert.ok(b.state.calls.includes('verify'));
  assert.equal((await b.bridge.logout()).ok, true); assert.equal(b.store.getCurrentUser(), null);
  b.state.user.email = 'changed-email@example.invalid';
  assert.equal((await b.bridge.signInWithEmail('client', valid)).ok, true);
  assert.equal(b.store.getDb().users.length, 1); assert.equal(b.store.getCurrentUser().id, 'legacy-client');
  assert.ok(!b.context.localStorage.getItem(b.store.DB_KEY).includes(valid.password));
});
test('forged or expired stored session is rejected by server verification', async () => {
  const b = browser(); b.state.session = { user: b.state.user, access_token: 'FORGED' }; b.state.failVerify = true;
  await assert.rejects(b.bridge.init({ role: 'client' }));
  assert.equal(b.store.getCurrentUser(), null); assert.equal(b.store.getDb().users.length, 0);
});
test('wrong password gives a useful message and never opens the cabinet', async () => {
  const b = browser(); b.state.signInError = { code: 'invalid_credentials' };
  const result = await b.bridge.signInWithEmail('client', valid);
  assert.equal(result.ok, false); assert.match(result.message, /Неверный e-mail или пароль/); assert.equal(b.store.getCurrentUser(), null);
});
test('password recovery uses an allowed callback and requires a verified recovery session', async () => {
  const b = browser(); assert.equal((await b.bridge.resetPassword(valid.email, 'client')).ok, true);
  const reset = b.state.calls.find((v) => v[0] === 'reset')[1];
  assert.equal(reset[1].redirectTo, 'https://palanart.github.io/user.html?recovery=1');
  assert.equal((await b.bridge.updatePassword('NewPassword123')).ok, false);
  const recovery = browser('#type=recovery'); recovery.state.session = { user: recovery.state.user, access_token: 'TEST_ACCESS' };
  await recovery.bridge.init({ role: 'client' });
  assert.equal((await recovery.bridge.updatePassword('NewPassword123')).ok, true);
  assert.equal(recovery.bridge.isRecovery(), false);
  assert.ok(!recovery.context.localStorage.getItem(recovery.store.DB_KEY).includes('NewPassword123'));
});
test('initializing customer auth preserves an existing admin session', async () => {
  const b = browser(); b.context.localStorage.setItem(b.store.SESSION_KEY, JSON.stringify({ type: 'admin', id: 'existing-admin' }));
  await b.bridge.init({ role: 'client' }); assert.equal(b.store.getSession().type, 'admin');
});
test('MAX initiation and claim never generate an account or put a secret in the redirect URL', async () => {
  const b = browser();
  b.state.fetch = async () => ({ ok: true, json: async () => ({ url: 'https://jioakguorsfvjuzyclrg.supabase.co/functions/v1/auth-max-start?ticket=' + 'a'.repeat(64), ticket: 'a'.repeat(64), claimSecret: 'b'.repeat(64) }) });
  assert.equal((await b.bridge.signInWithSocial('client', 'max')).pendingMax, true);
  assert.equal(b.state.redirects.length, 0); assert.equal(b.store.getDb().users.length, 0);
  assert.ok(!b.bridge.pendingMax().url.includes(b.bridge.pendingMax().secret));
});
test('all local JavaScript and inline HTML scripts parse', () => {
  for (const file of fs.readdirSync(path.join(root, 'marketplace_build'))) {
    if (file.endsWith('.js')) new vm.Script(read('marketplace_build/' + file), { filename: file });
    if (file.endsWith('.html')) for (const match of read('marketplace_build/' + file).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(match[1], { filename: file });
  }
});
test('a mixed cached release cannot invoke the old simulated bridge or open a cached cabinet', () => {
  const elements = new Map(); const messages = []; let renders = 0;
  const byId = (id) => {
    if (!elements.has(id)) elements.set(id, { style: {}, addEventListener() {}, textContent: '' });
    return elements.get(id);
  };
  const context = vm.createContext({ URLSearchParams, byId, document: { querySelectorAll: () => [] },
    MarketplaceStore: { getCurrentUser: () => ({ id: 'FORGED_LEGACY' }) },
    PalanartAuthBridge: { signInWithSocial() { throw new Error('Old bridge invoked'); } },
    location: { search: '', hash: '', pathname: '/user.html' }, history: { replaceState() {} },
    renderCabinet: () => { renders++; }, showMessage: (message) => messages.push(message)
  });
  context.window = context;
  vm.runInContext(read('marketplace_build/user-auth.js'), context);
  assert.equal(renders, 0); assert.equal(byId('cabinet-view').style.display, 'none');
  assert.equal(byId('auth-view').style.display, 'grid'); assert.match(messages[0], /Обновите страницу/);
});

// In-memory Auth/database adapters below exercise the real edge-function code;
// these tests are not a claim that an external provider or production DB works.
let activeAdmin;
globalThis.__palanartAdminFactory = () => activeAdmin;
const environment = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'TEST_ONLY',
  PUBLIC_SITE_URL: 'https://palanart.github.io/', ALLOWED_RETURN_ORIGINS: 'https://palanart.github.io',
  TELEGRAM_BOT_TOKEN: 'TEST_BOT_TOKEN', TELEGRAM_BOT_USERNAME: 'TestAuthBot', MAX_BOT_TOKEN: 'TEST_MAX_BOT', MAX_BOT_USERNAME: 'TestMaxBot', VK_CLIENT_ID: 'TEST_VK', YANDEX_CLIENT_ID: 'TEST_YANDEX', YANDEX_CLIENT_SECRET: 'TEST_ONLY' };
globalThis.Deno = { env: { get: (name) => environment[name] } };
const serverPromise = import('data:text/javascript;base64,' + Buffer.from(read('supabase/functions/_shared/social-auth.js').replace(/^import[^\n]+/, 'const createClient = globalThis.__palanartAdminFactory;')).toString('base64'));
function signedTelegram(overrides = {}) {
  const data = { id: '1234567', first_name: 'Тест', auth_date: String(Math.floor(Date.now() / 1000)), ...overrides };
  const text = Object.entries(data).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + '=' + v).join('\n');
  const key = crypto.createHash('sha256').update(environment.TELEGRAM_BOT_TOKEN).digest();
  return new URLSearchParams({ ...data, hash: crypto.createHmac('sha256', key).update(text).digest('hex') });
}
function signedMax(state, overrides = {}) {
  const data = { user: JSON.stringify({ id: 7654321, first_name: 'MAX Тест' }), auth_date: String(Math.floor(Date.now() / 1000)), start_param: state, ...overrides };
  const text = Object.entries(data).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + '=' + v).join('\n');
  const key = crypto.createHmac('sha256', 'WebAppData').update(environment.MAX_BOT_TOKEN).digest();
  return new URLSearchParams({ ...data, hash: crypto.createHmac('sha256', key).update(text).digest('hex') }).toString();
}
class Query {
  constructor(admin, table) { this.admin = admin; this.table = table; this.filters = []; this.operation = 'select'; }
  select() { return this; }
  eq(key, value) { this.filters.push((r) => r[key] === value); return this; }
  gt(key, value) { this.filters.push((r) => r[key] > value); return this; }
  lt(key, value) { this.filters.push((r) => r[key] < value); return this; }
  is(key, value) { this.filters.push((r) => (r[key] ?? null) === value); return this; }
  insert(row) { this.operation = 'insert'; this.row = row; return this; }
  update(row) { this.operation = 'update'; this.row = row; return this; }
  delete() { this.operation = 'delete'; return this; }
  result(single = false) {
    const rows = this.admin.tables[this.table] ||= [];
    if (this.operation === 'insert') {
      if (this.table === 'palanart_external_identities' && rows.some((r) => r.provider === this.row.provider && r.subject === this.row.subject)) return { error: { code: '23505' }, data: null };
      rows.push({ ...this.row }); return { error: null, data: null };
    }
    const matches = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.operation === 'update') matches.forEach((r) => Object.assign(r, this.row));
    if (this.operation === 'delete') this.admin.tables[this.table] = rows.filter((r) => !matches.includes(r));
    return { error: null, data: single ? matches[0] || null : matches };
  }
  maybeSingle() { return Promise.resolve(this.result(true)); }
  then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); }
}
function fakeAdmin() {
  const admin = { tables: {}, users: [], links: [], from: (table) => new Query(admin, table), auth: {
    getUser: async () => ({ data: { user: admin.users[0] || testUser() }, error: null }),
    admin: {
      listUsers: async () => ({ data: { users: admin.users }, error: null }),
      getUserById: async (id) => ({ data: { user: admin.users.find((u) => u.id === id) }, error: null }),
      createUser: async (payload) => { const user = { ...payload, id: crypto.randomUUID() }; admin.users.push(user); return { data: { user }, error: null }; },
      updateUserById: async (id, payload) => { const user = admin.users.find((u) => u.id === id); Object.assign(user, payload); return { data: { user }, error: null }; },
      generateLink: async (payload) => { admin.links.push(payload); return { data: { properties: { action_link: 'https://test.supabase.co/auth/v1/verify?token=TEST_SINGLE_USE' } }, error: null }; }
    }
  } };
  return admin;
}
test('Telegram and MAX reject tampering, duplicate fields, expired and future assertions', async () => {
  const server = await serverPromise;
  assert.equal((await server.verifyTelegram(signedTelegram(), environment.TELEGRAM_BOT_TOKEN)).id, '1234567');
  const tampered = signedTelegram(); tampered.set('id', '999999');
  await assert.rejects(server.verifyTelegram(tampered, environment.TELEGRAM_BOT_TOKEN));
  const duplicate = signedTelegram(); duplicate.append('id', '1234567');
  await assert.rejects(server.verifyTelegram(duplicate, environment.TELEGRAM_BOT_TOKEN));
  for (const auth_date of ['1', String(Math.floor(Date.now() / 1000) + 3600)]) await assert.rejects(server.verifyTelegram(signedTelegram({ auth_date }), environment.TELEGRAM_BOT_TOKEN));
  assert.equal((await server.verifyMax(signedMax('a'.repeat(64)), environment.MAX_BOT_TOKEN, 'a'.repeat(64))).id, 7654321);
  await assert.rejects(server.verifyMax(signedMax('a'.repeat(64)), environment.MAX_BOT_TOKEN, 'b'.repeat(64)));
  await assert.rejects(server.verifyMax(signedMax('a'.repeat(64)) + '&hash=forged', environment.MAX_BOT_TOKEN, 'a'.repeat(64)));
});
test('external return origins and protocol tricks are rejected', async () => {
  const server = await serverPromise;
  for (const target of ['https://evil.example/user.html', 'http://palanart.github.io/user.html', 'https://palanart.github.io/admin.html', 'https://user:secret@palanart.github.io/user.html']) assert.throws(() => server.normalizeReturnTo(target));
  assert.equal(server.normalizeReturnTo('https://palanart.github.io/user.html?token=bad#fragment'), 'https://palanart.github.io/user.html');
});
async function startFlow(server, provider, link = false) {
  const started = await server.handleStart(new Request('https://test.supabase.co/start', { method: 'POST', headers: { origin: 'https://palanart.github.io', 'Content-Type': 'application/json', ...(link ? { authorization: 'Bearer TEST_AUTH' } : {}) }, body: JSON.stringify({ role: 'client', returnTo: 'https://palanart.github.io/user.html', link }) }), provider);
  assert.equal(started.status, 200); const data = await started.json();
  const launched = await server.handleStart(new Request(data.url), provider);
  assert.equal(launched.status, 303);
  return { ...data, state: new URL(data.url).searchParams.get('ticket'), cookie: launched.headers.get('set-cookie').split(';')[0], location: launched.headers.get('location') };
}
test('real Telegram handler enforces browser binding and one-time callback consumption', async () => {
  const server = await serverPromise; activeAdmin = fakeAdmin();
  const flow = await startFlow(server, 'telegram');
  const params = signedTelegram(); params.set('state', flow.state);
  const denied = await server.handleCallback(new Request('https://test.supabase.co/callback?' + params), 'telegram');
  assert.equal(denied.status, 400); assert.equal(activeAdmin.users.length, 0);
  const callback = () => server.handleCallback(new Request('https://test.supabase.co/callback?' + params, { headers: { cookie: flow.cookie } }), 'telegram');
  assert.equal((await callback()).status, 303); assert.equal(activeAdmin.users.length, 1); assert.equal(activeAdmin.links.length, 1);
  assert.equal((await callback()).status, 400); assert.equal(activeAdmin.users.length, 1);
});
test('MAX webview cannot create a session or link an account until original browser confirmation', async () => {
  const server = await serverPromise; activeAdmin = fakeAdmin(); activeAdmin.users.push(testUser());
  const flow = await startFlow(server, 'max', true);
  const response = await server.handleCallback(new Request('https://test.supabase.co/callback', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ state: flow.state, initData: signedMax(flow.state) }) }), 'max');
  assert.equal(response.status, 200); assert.equal(activeAdmin.links.length, 0); assert.equal((activeAdmin.tables.palanart_external_identities || []).length, 0);
  const claim = async (secret, confirm) => server.handleMaxClaim(new Request('https://test.supabase.co/claim', { method: 'POST', headers: { origin: 'https://palanart.github.io', 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket: flow.state, secret, confirm }) }));
  assert.equal((await claim('c'.repeat(64), true)).status, 400); assert.equal(activeAdmin.links.length, 0);
  const ready = await (await claim(flow.claimSecret, false)).json(); assert.equal(ready.ready, true);
  assert.equal(activeAdmin.links.length, 0);
  assert.equal((await claim(flow.claimSecret, true)).status, 200);
  assert.equal(activeAdmin.tables.palanart_external_identities[0].user_id, testUser().id);
  assert.equal(activeAdmin.users.length, 1); assert.equal(activeAdmin.links[0].email, testUser().email);
  assert.equal((await claim(flow.claimSecret, true)).status, 400);
});
test('one provider identity cannot be silently transferred to a different account', async () => {
  const server = await serverPromise; const admin = fakeAdmin();
  admin.users.push(testUser()); admin.tables.palanart_external_identities = [{ provider: 'vk', subject: '12345', user_id: testUser().id }];
  await assert.rejects(server.resolveUser(admin, 'vk', { id: '12345', email: testUser().email }, 'different-account'), /identity-linked/);
  assert.equal(admin.users.length, 1);
});
test('CORS preflight permits only configured site origins', async () => {
  const server = await serverPromise;
  const good = await server.handleStart(new Request('https://test.supabase.co/start', { method: 'OPTIONS', headers: { origin: 'https://palanart.github.io' } }), 'vk');
  assert.equal(good.headers.get('access-control-allow-origin'), 'https://palanart.github.io');
  const bad = await server.handleStart(new Request('https://test.supabase.co/start', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), 'vk');
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
});
test('VK and Yandex callbacks exchange codes with private PKCE verifiers and authenticated profile APIs', async () => {
  const server = await serverPromise;
  const originalFetch = globalThis.fetch;
  try {
    for (const provider of ['vk', 'yandex']) {
      activeAdmin = fakeAdmin(); const calls = [];
      const flow = await startFlow(server, provider);
      const stored = activeAdmin.tables.palanart_auth_flows[0];
      const authUrl = new URL(flow.location);
      assert.equal(authUrl.searchParams.get('state'), flow.state);
      assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
      assert.ok(!flow.location.includes(stored.verifier));
      globalThis.fetch = async (url, init) => {
        calls.push({ url, init });
        const data = url.endsWith('/oauth2/auth') ? { access_token: 'TEST_ACCESS', user_id: '12345' }
          : url.endsWith('/oauth2/user_info') ? { user: { user_id: '12345', first_name: 'VK Тест' } }
          : url.endsWith('/token') ? { access_token: 'TEST_ACCESS' }
          : { id: '12345', real_name: 'Яндекс Тест', client_id: environment.YANDEX_CLIENT_ID };
        return { ok: true, json: async () => data };
      };
      const callback = new URL('https://test.supabase.co/callback');
      callback.search = new URLSearchParams({ state: flow.state, code: 'TEST_CODE', device_id: 'TEST_DEVICE' });
      const result = await server.handleCallback(new Request(callback, { headers: { cookie: flow.cookie } }), provider);
      assert.equal(result.status, 303); assert.equal(activeAdmin.users.length, 1);
      assert.equal(calls[0].init.body.get('code_verifier'), stored.verifier);
      assert.equal(activeAdmin.tables.palanart_external_identities[0].provider, provider);
    }
  } finally { globalThis.fetch = originalFetch; }
});
test('signing out invalidates an in-flight session verification', async () => {
  const b = browser(); let complete;
  b.state.getUser = () => new Promise((resolve) => { complete = resolve; });
  const login = b.bridge.signInWithEmail('client', valid);
  while (!complete) await new Promise((resolve) => setImmediate(resolve));
  await b.bridge.logout(); complete({ data: { user: b.state.user }, error: null });
  assert.equal((await login).ok, false); assert.equal(b.store.getCurrentUser(), null); assert.equal(b.store.getDb().users.length, 0);
});
