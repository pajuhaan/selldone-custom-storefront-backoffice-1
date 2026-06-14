import { randomBytes } from "node:crypto";
import { cookie, parseCookies } from "./http.mjs";

export const sessions = new Map();
export const oauthStates = new Map();

export const SESSION_CONTEXTS = {
  DASHBOARD: "dashboard",
  STOREFRONT: "storefront",
};

export const SESSION_COOKIE_NAMES = {
  [SESSION_CONTEXTS.DASHBOARD]: "pajulina_dashboard_sid",
  [SESSION_CONTEXTS.STOREFRONT]: "pajulina_storefront_sid",
};

function normalizeSessionContext(context) {
  return String(context || "").toLowerCase() === SESSION_CONTEXTS.STOREFRONT ? SESSION_CONTEXTS.STOREFRONT : SESSION_CONTEXTS.DASHBOARD;
}

export function getSessionCookieName(context = SESSION_CONTEXTS.DASHBOARD) {
  return SESSION_COOKIE_NAMES[normalizeSessionContext(context)] || SESSION_COOKIE_NAMES[SESSION_CONTEXTS.DASHBOARD];
}

export function getExistingSession(req, context = SESSION_CONTEXTS.DASHBOARD) {
  const contextName = normalizeSessionContext(context);
  const cookies = parseCookies(req);
  const sid = cookies[getSessionCookieName(contextName)];
  if (!sid) return null;

  const session = sessions.get(sid);
  if (!session || session.context !== contextName) return null;
  return session;
}

export function getSession(req, res, context = SESSION_CONTEXTS.DASHBOARD) {
  const contextName = normalizeSessionContext(context);
  const cookies = parseCookies(req);
  let sid = cookies[getSessionCookieName(contextName)];
  if (!sid || !sessions.has(sid) || sessions.get(sid)?.context !== contextName) {
    sid = randomBytes(24).toString("hex");
    sessions.set(sid, { context: contextName, tokens: null, oauth: null, createdAt: Date.now() });
    res.setHeader("Set-Cookie", cookie(getSessionCookieName(contextName), sid, { httpOnly: true }));
  }

  const session = sessions.get(sid);
  if (session && !session.context) session.context = contextName;
  return session;
}

export function destroySession(sid) {
  if (sid) sessions.delete(sid);
}
