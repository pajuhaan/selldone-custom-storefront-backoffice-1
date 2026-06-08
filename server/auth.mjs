import { createHash, randomBytes } from "node:crypto";
import { AUTHORIZE_ENDPOINT, AUTH_PROMPT, CLIENT_ID, SCOPES, TOKEN_ENDPOINT } from "./config.mjs";
import { escapeHtml, getOrigin, redirect, sendHtml } from "./http.mjs";
import { getSession, oauthStates } from "./session.mjs";
import { clearStoredTokens, cloneTokens, getStoredTokens, saveStoredTokens } from "./token-store.mjs";

function base64Url(buffer) {
  return Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createChallenge(verifier) {
  return base64Url(createHash("sha256").update(verifier).digest());
}

export async function startAuth(req, res) {
  const session = getSession(req, res);
  const state = randomBytes(18).toString("hex");
  const verifier = base64Url(randomBytes(48));
  const redirectUri = `${getOrigin(req)}/callback`;

  session.oauth = { state, verifier, redirectUri };
  oauthStates.set(state, { verifier, redirectUri, createdAt: Date.now() });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    state,
    code_challenge: createChallenge(verifier),
    code_challenge_method: "S256",
    prompt: AUTH_PROMPT,
  });

  redirect(res, `${AUTHORIZE_ENDPOINT}?${params.toString()}`);
}

export async function handleCallback(req, res, url) {
  const session = getSession(req, res);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauth = session.oauth?.state === state ? session.oauth : oauthStates.get(state);

  if (!code || !state || !oauth) {
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
    saveStoredTokens(session.tokens);
    delete session.oauth;
    oauthStates.delete(state);
    redirect(res, "/dashboard/#overview");
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
  const storedTokens = getStoredTokens();
  if (!session.tokens && storedTokens?.access_token) {
    session.tokens = cloneTokens(storedTokens);
  }

  if (!session.tokens?.access_token) {
    return null;
  }

  if (Date.now() < Number(session.tokens.expires_at || 0) - 60_000) {
    return session.tokens.access_token;
  }

  if (!session.tokens.refresh_token) {
    session.tokens = null;
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
    saveStoredTokens(session.tokens);
  } catch {
    session.tokens = null;
    clearStoredTokens();
    const authError = new Error("Selldone session expired. Please sign in again.");
    authError.status = 401;
    throw authError;
  }

  return session.tokens.access_token;
}
