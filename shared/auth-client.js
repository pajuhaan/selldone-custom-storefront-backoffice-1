import { getDashboardEndpoints, getPublicConfig } from "./runtime-config.js";

const CONTEXTS = {
  DASHBOARD: "dashboard",
  STOREFRONT: "storefront",
};

const TOKEN_KEYS = {
  [CONTEXTS.DASHBOARD]: "pajulina_dashboard_oauth_tokens_v1",
  [CONTEXTS.STOREFRONT]: "pajulina_storefront_oauth_tokens_v1",
};

const STATE_KEY = "pajulina_oauth_state_v1";

export function createAuthClient(context) {
  const safeContext = normalizeContext(context);

  return {
    context: safeContext,
    buildLoginUrl: (next = "") => buildLoginUrl(safeContext, next),
    startLogin: async (next = "") => {
      window.location.assign(await buildLoginUrl(safeContext, next));
    },
    handleCallback,
    logout: (next = "") => logout(safeContext, next),
    getTokens: () => readTokens(safeContext),
    getAccessToken: () => getValidAccessToken(safeContext),
    session: () => buildSessionPayload(safeContext),
  };
}

export const dashboardAuth = createAuthClient(CONTEXTS.DASHBOARD);
export const storefrontAuth = createAuthClient(CONTEXTS.STOREFRONT);

export async function handleCallback() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stored = readState();

  if (!code || !state || !stored || stored.state !== state) {
    throw new Error("OAuth state mismatch.");
  }

  const config = getPublicConfig();
  const response = await fetch(`${config.SELLDONE_TOKEN_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.CLIENT_ID,
      redirect_uri: config.CALLBACK_URL,
      code,
      code_verifier: stored.verifier,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.message || payload.error || "Token exchange failed.");
  }

  writeTokens(stored.context, normalizeTokenPayload(payload));
  clearState();
  return {
    context: stored.context,
    next: sanitizeNext(stored.next, stored.context),
  };
}

async function buildLoginUrl(context, next = "") {
  const config = getPublicConfig();
  if (!config.CLIENT_ID) throw new Error("CLIENT_ID is missing from public runtime config.");
  const verifier = randomBase64Url(48);
  const state = randomBase64Url(24);
  const challenge = await pkceChallenge(verifier);
  const safeNext = sanitizeNext(next, context);
  writeState({ state, verifier, context, next: safeNext, createdAt: Date.now() });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.CLIENT_ID,
    redirect_uri: config.CALLBACK_URL,
    scope: context === CONTEXTS.STOREFRONT ? config.storefrontScopes.join(" ") : config.dashboardScopes.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: config.AUTH_PROMPT || "consent",
  });

  return `${config.SELLDONE_AUTH_BASE}/oauth/authorize?${params.toString()}`;
}

async function buildSessionPayload(context) {
  const config = getPublicConfig();
  const tokens = await getValidTokens(context);
  const authenticated = Boolean(tokens?.access_token);
  const accessToken = tokens?.access_token || "";
  const user = authenticated ? await loadUserProfile(context, accessToken).catch(() => fallbackUser()) : fallbackUser();

  return {
    authenticated,
    loginUrl: authenticated ? "" : await buildLoginUrl(context, defaultReturnFor(context)),
    logoutUrl: buildLogoutUrl(context),
    authPrompt: config.AUTH_PROMPT,
    shop: config.shop,
    user,
    scopes: context === CONTEXTS.STOREFRONT ? config.storefrontScopes : config.dashboardScopes,
    apiBaseUrl: config.API_BASE,
    xapiBaseUrl: config.STOREFRONT_XAPI_BASE,
    endpoints: getDashboardEndpoints(config.shopId),
    accessToken,
    tokenExpiresAt: Number(tokens?.expires_at || 0),
    tokenType: authenticated ? "Bearer" : "",
    sessionContext: context,
  };
}

async function getValidAccessToken(context) {
  const tokens = await getValidTokens(context);
  return tokens?.access_token || "";
}

async function getValidTokens(context) {
  const tokens = readTokens(context);
  if (!tokens?.access_token) return null;
  if (Date.now() < Number(tokens.expires_at || 0) - 60_000) return tokens;
  if (!tokens.refresh_token) {
    clearTokens(context);
    return null;
  }

  const config = getPublicConfig();
  const response = await fetch(`${config.SELLDONE_TOKEN_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.CLIENT_ID,
      refresh_token: tokens.refresh_token,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    clearTokens(context);
    return null;
  }

  const nextTokens = normalizeTokenPayload({
    ...payload,
    refresh_token: payload.refresh_token || tokens.refresh_token,
  });
  writeTokens(context, nextTokens);
  return nextTokens;
}

async function loadUserProfile(context, accessToken) {
  const config = getPublicConfig();
  const baseUrl = context === CONTEXTS.STOREFRONT ? config.STOREFRONT_XAPI_BASE : config.API_BASE;
  const path = context === CONTEXTS.STOREFRONT ? "/me" : "/profiles/me?offset=0&count=1";
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return fallbackUser();

  const profile = firstObject(
    payload.profile,
    payload.customer?.profile,
    payload.customer,
    payload.user,
    payload.data?.profile,
    payload.data?.user,
    Array.isArray(payload.profiles) ? payload.profiles[0] : null,
    payload,
  );
  const id = firstValue(profile?.user_id, profile?.userId, profile?.id, payload?.user_id, payload?.id, 0);
  const name = firstValue(profile?.name, profile?.full_name, payload?.name, payload?.profile?.name, "");
  const email = firstValue(profile?.email, payload?.email, payload?.profile?.email, "");
  const avatar = id ? `${config.SELLDONE_BASE}/users/${encodeURIComponent(String(id))}/profile/avatar/small` : firstValue(profile?.avatar, profile?.photo, "");
  return {
    ...profile,
    id,
    user_id: id,
    name: name || email || "Selldone user",
    email,
    avatar,
    avatar_url: avatar,
    avatarUrl: avatar,
  };
}

function logout(context, next = "") {
  clearTokens(context);
  clearState();
  const target = sanitizeNext(next, context);
  window.location.assign(target);
}

function buildLogoutUrl(context) {
  return `#logout-${context}`;
}

function normalizeTokenPayload(payload = {}) {
  return {
    ...payload,
    expires_at: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };
}

function readTokens(context) {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEYS[normalizeContext(context)]) || "null");
  } catch {
    return null;
  }
}

function writeTokens(context, tokens) {
  localStorage.setItem(TOKEN_KEYS[normalizeContext(context)], JSON.stringify(tokens || null));
}

function clearTokens(context) {
  localStorage.removeItem(TOKEN_KEYS[normalizeContext(context)]);
}

function readState() {
  try {
    return JSON.parse(sessionStorage.getItem(STATE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeState(state) {
  sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function clearState() {
  sessionStorage.removeItem(STATE_KEY);
}

function normalizeContext(context) {
  return String(context || "").toLowerCase() === CONTEXTS.STOREFRONT ? CONTEXTS.STOREFRONT : CONTEXTS.DASHBOARD;
}

function defaultReturnFor(context) {
  return context === CONTEXTS.STOREFRONT ? "/" : "/dashboard/#overview";
}

function sanitizeNext(next, context) {
  const fallback = defaultReturnFor(context);
  const raw = String(next || "").trim() || fallback;
  if (raw.startsWith("javascript:") || raw.startsWith("data:")) return fallback;
  try {
    const resolved = new URL(raw, window.location.origin);
    if (resolved.origin !== window.location.origin) return fallback;
    if (resolved.pathname === "/callback" || resolved.pathname === "/callback/") return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash || ""}`;
  } catch {
    return fallback;
  }
}

function fallbackUser() {
  return { id: 0, name: "Selldone user", email: "", avatar: "", avatarUrl: "" };
}

function firstObject(...values) {
  return values.find((value) => value && typeof value === "object" && !Array.isArray(value)) || {};
}

function firstValue(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== "") || "";
}

function randomBase64Url(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function pkceChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
