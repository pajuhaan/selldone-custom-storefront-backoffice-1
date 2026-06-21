import { createHash, randomBytes } from "node:crypto";
import { AUTHORIZE_ENDPOINT, AUTH_PROMPT, CLIENT_ID, SCOPES, TOKEN_ENDPOINT } from "./config.mjs";
import { escapeHtml, getOrigin, redirect, sendHtml } from "./http.mjs";
import { SESSION_CONTEXTS, getExistingSession, getSession, oauthStates, persistStorefrontSessions } from "./session.mjs";

function base64Url(buffer) {
  return Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createChallenge(verifier) {
  return base64Url(createHash("sha256").update(verifier).digest());
}

export function sanitizeAuthReturnRoute(req, nextRoute) {
  const origin = getOrigin(req);
  if (!nextRoute || typeof nextRoute !== "string") return "";
  const trimmed = nextRoute.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) return "";

  try {
    const resolved = new URL(trimmed, origin);
    if (resolved.origin !== origin) return "";
    if (resolved.pathname === "/callback") return "";
    if (resolved.pathname.startsWith("/api/")) return "";
    if (resolved.pathname === "/auth/start" && !resolved.hash && !resolved.searchParams.has("next")) return "";
    return `${resolved.pathname}${resolved.search}${resolved.hash || ""}`;
  } catch {
    return "";
  }
}

function splitScopeString(scopes) {
  return String(scopes || SCOPES || "")
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export async function startAuth(req, res, requestedScopes = null) {
  return startAuthForContext(req, res, requestedScopes, SESSION_CONTEXTS.DASHBOARD);
}

export async function startAuthForStorefront(req, res, requestedScopes = null) {
  return startAuthForContext(req, res, requestedScopes, SESSION_CONTEXTS.STOREFRONT);
}

export async function startAuthForContext(req, res, requestedScopes = null, sessionContext = SESSION_CONTEXTS.DASHBOARD) {
  const scopes = requestedScopes && requestedScopes.length ? requestedScopes : SCOPES;
  const session = getSession(req, res, sessionContext);
  const state = randomBytes(18).toString("hex");
  const verifier = base64Url(randomBytes(48));
  const redirectUri = `${getOrigin(req)}/callback`;
  const requestUrl = new URL(req.url, getOrigin(req));
  const next = sanitizeAuthReturnRoute(req, requestUrl.searchParams.get("next"));

  session.context = sessionContext;
  session.oauth = { state, verifier, redirectUri, next, context: sessionContext };
  if (sessionContext === SESSION_CONTEXTS.STOREFRONT) persistStorefrontSessions();
  oauthStates.set(state, { verifier, redirectUri, next, context: sessionContext, createdAt: Date.now() });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: splitScopeString(scopes).join(" "),
    state,
    code_challenge: createChallenge(verifier),
    code_challenge_method: "S256",
    prompt: AUTH_PROMPT,
  });

  redirect(res, `${AUTHORIZE_ENDPOINT}?${params.toString()}`);
}

export async function handleCallback(req, res, url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateData = oauthStates.get(state);
  const sessionCandidates = [];
  const requestedContext = stateData?.context || "";
  if (requestedContext) {
    sessionCandidates.push(requestedContext);
  } else {
    sessionCandidates.push(SESSION_CONTEXTS.STOREFRONT, SESSION_CONTEXTS.DASHBOARD);
  }

  let session = null;
  for (const context of sessionCandidates) {
    const existingSession = getExistingSession(req, context);
    if (existingSession?.oauth?.state === state) {
      session = existingSession;
      break;
    }
  }

  if (!session && stateData?.context) {
    session = getSession(req, res, stateData.context);
  }

  const oauth = session?.oauth?.state === state ? session.oauth : stateData;

  if (!code || !state || !oauth || !session) {
    sendHtml(res, 400, "<h1>OAuth state mismatch</h1>");
    return;
  }

  try {
    session.tokens = await exchangeToken({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: oauth.redirectUri,
      code,
      code_verifier: oauth.verifier,
    });
    delete session.oauth;
    if (session.context === SESSION_CONTEXTS.STOREFRONT) persistStorefrontSessions();
    oauthStates.delete(state);
    const fallback = session.context === SESSION_CONTEXTS.STOREFRONT ? "/" : "/dashboard/#overview";
    const redirectAfterAuth = sanitizeAuthReturnRoute(req, oauth.next) || fallback;
    redirect(res, redirectAfterAuth);
  } catch (error) {
    sendHtml(res, 502, `<h1>Selldone OAuth failed</h1><p>${escapeHtml(error.message)}</p>`);
  }
}

async function exchangeToken(params) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.message || payload.error || "Token exchange failed");
  }
  return {
    ...payload,
    expires_at: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };
}

export async function ensureAccessToken(session) {
  if (!session.tokens?.access_token) {
    return null;
  }

  if (Date.now() < Number(session.tokens.expires_at || 0) - 60_000) {
    return session.tokens.access_token;
  }

  if (!session.tokens.refresh_token) {
    session.tokens = null;
    if (session.context === SESSION_CONTEXTS.STOREFRONT) persistStorefrontSessions();
    return null;
  }

  try {
    const previousRefreshToken = session.tokens.refresh_token;
    const refreshedTokens = await exchangeToken({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: session.tokens.refresh_token,
    });
    session.tokens = {
      ...refreshedTokens,
      refresh_token: refreshedTokens.refresh_token || previousRefreshToken,
    };
    if (session.context === SESSION_CONTEXTS.STOREFRONT) persistStorefrontSessions();
  } catch {
    session.tokens = null;
    if (session.context === SESSION_CONTEXTS.STOREFRONT) persistStorefrontSessions();
    const authError = new Error("Selldone session expired. Please sign in again.");
    authError.status = 401;
    throw authError;
  }

  return session.tokens.access_token;
}
