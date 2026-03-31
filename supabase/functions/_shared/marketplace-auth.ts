import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_SITE_URL = "https://ivan19326.github.io/palanart-marketplace-app/";

function mustEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function optionalEnv(name: string, fallback = ""): string {
  return Deno.env.get(name) || fallback;
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64UrlEncode(bytes);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(new Uint8Array(digest));
  return { verifier, challenge };
}

type AuthState = {
  role: string;
  returnTo: string;
  verifier?: string;
  provider: "vk" | "telegram";
  createdAt: number;
};

export async function signAuthState(payload: AuthState): Promise<string> {
  const secret = mustEnv("AUTH_STATE_SECRET");
  const json = JSON.stringify(payload);
  const encoded = base64UrlEncode(json);
  const signature = await hmac(encoded, secret);
  return `${encoded}.${signature}`;
}

export async function verifyAuthState(token: string): Promise<AuthState> {
  const secret = mustEnv("AUTH_STATE_SECRET");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Invalid auth state");
  const expected = await hmac(payload, secret);
  if (expected !== signature) throw new Error("Invalid auth state signature");
  const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as AuthState;
  if (!decoded.createdAt || Date.now() - decoded.createdAt > 15 * 60 * 1000) {
    throw new Error("Auth state expired");
  }
  return decoded;
}

export function getProviderCallbackUrl(provider: "vk" | "telegram"): string {
  const base = mustEnv("SUPABASE_URL").replace(/\/+$/, "");
  return `${base}/functions/v1/auth-${provider}-callback`;
}

export function normalizeReturnTo(input: string | null): string {
  const fallback = optionalEnv("PUBLIC_SITE_URL", DEFAULT_SITE_URL);
  if (!input) return fallback;
  try {
    const target = new URL(input);
    const allowed = (optionalEnv("ALLOWED_RETURN_ORIGINS", new URL(fallback).origin))
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!allowed.includes(target.origin)) return fallback;
    return target.toString();
  } catch (_error) {
    return fallback;
  }
}

export function errorHtml(title: string, message: string): Response {
  const body = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>${title}</title><body style="font-family:Arial,sans-serif;background:#0b1220;color:#fff;padding:32px"><h1>${title}</h1><p>${message}</p></body></html>`;
  return new Response(body, { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });
}

export function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

export function createServiceClient() {
  return createClient(mustEnv("SUPABASE_URL"), mustEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findUserByEmail(email: string) {
  const admin = createServiceClient();
  let page = 1;
  while (page < 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((user) => user.email === email);
    if (found) return found;
    if (!data.users.length) break;
    page += 1;
  }
  return null;
}

export type ExternalProfile = {
  provider: "vk" | "telegram";
  providerUserId: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  city?: string;
  username?: string;
};

export async function issueMarketplaceSession(profile: ExternalProfile, role: string, returnTo: string): Promise<string> {
  const admin = createServiceClient();
  const syntheticEmail = `${profile.provider}_${profile.providerUserId}@auth.palanart.local`;
  const metadata = {
    provider: profile.provider,
    provider_id: profile.providerUserId,
    full_name: profile.name || syntheticEmail,
    name: profile.name || syntheticEmail,
    avatar_url: profile.avatarUrl || "",
    phone: profile.phone || "",
    city: profile.city || "",
    telegram: profile.username && profile.provider === "telegram" ? `@${profile.username}` : "",
    contact_email: profile.email || "",
    role,
  };

  const existing = await findUserByEmail(syntheticEmail);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
      user_metadata: Object.assign({}, existing.user_metadata || {}, metadata),
    });
    if (error) throw error;
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
  }

  const finalReturnTo = normalizeReturnTo(returnTo);
  const separator = finalReturnTo.includes("?") ? "&" : "?";
  const redirectTo = `${finalReturnTo}${separator}auth_role=${encodeURIComponent(role)}`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: syntheticEmail,
    options: { redirectTo },
  });
  if (error) throw error;
  const actionLink = data.properties?.action_link;
  if (!actionLink) throw new Error("Unable to generate auth action link");
  return actionLink;
}

export async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const response = await fetch(url, init);
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_error) {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

export function parseJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length < 2) return {};
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));
  } catch (_error) {
    return {};
  }
}
