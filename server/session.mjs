import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cookie, parseCookies } from "./http.mjs";

export const sessions = new Map();
export const oauthStates = new Map();
const STOREFRONT_SESSION_STORE =
  process.env.STOREFRONT_SESSION_STORE || join(process.cwd(), ".pajulina-storefront-sessions.json");
let persistedSessionsLoaded = false;

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

function loadPersistedStorefrontSessions() {
  if (persistedSessionsLoaded) return;
  persistedSessionsLoaded = true;
  if (!existsSync(STOREFRONT_SESSION_STORE)) return;

  try {
    const payload = JSON.parse(readFileSync(STOREFRONT_SESSION_STORE, "utf8"));
    const entries = payload?.sessions && typeof payload.sessions === "object" ? Object.entries(payload.sessions) : [];
    for (const [sid, session] of entries) {
      if (!sid || !session || session.context !== SESSION_CONTEXTS.STOREFRONT) continue;
      sessions.set(sid, {
        context: SESSION_CONTEXTS.STOREFRONT,
        tokens: session.tokens || null,
        oauth: session.oauth || null,
        createdAt: session.createdAt || Date.now(),
      });
    }
  } catch (error) {
    console.error(JSON.stringify({ level: "warn", source: "storefront_session_store", message: error.message }));
  }
}

export function persistStorefrontSessions() {
  loadPersistedStorefrontSessions();
  const storefrontSessions = {};
  for (const [sid, session] of sessions) {
    if (!sid || !session || session.context !== SESSION_CONTEXTS.STOREFRONT) continue;
    storefrontSessions[sid] = {
      context: SESSION_CONTEXTS.STOREFRONT,
      tokens: session.tokens || null,
      oauth: session.oauth || null,
      createdAt: session.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  }

  try {
    if (!Object.keys(storefrontSessions).length) {
      if (existsSync(STOREFRONT_SESSION_STORE)) unlinkSync(STOREFRONT_SESSION_STORE);
      return;
    }
    const tmpPath = `${STOREFRONT_SESSION_STORE}.tmp`;
    writeFileSync(tmpPath, JSON.stringify({ sessions: storefrontSessions }, null, 2));
    renameSync(tmpPath, STOREFRONT_SESSION_STORE);
  } catch (error) {
    console.error(JSON.stringify({ level: "warn", source: "storefront_session_store", message: error.message }));
  }
}

export function getSessionCookieName(context = SESSION_CONTEXTS.DASHBOARD) {
  return SESSION_COOKIE_NAMES[normalizeSessionContext(context)] || SESSION_COOKIE_NAMES[SESSION_CONTEXTS.DASHBOARD];
}

export function getExistingSession(req, context = SESSION_CONTEXTS.DASHBOARD) {
  loadPersistedStorefrontSessions();
  const contextName = normalizeSessionContext(context);
  const cookies = parseCookies(req);
  const sid = cookies[getSessionCookieName(contextName)];
  if (!sid) return null;

  const session = sessions.get(sid);
  if (!session || session.context !== contextName) return null;
  return session;
}

export function getSession(req, res, context = SESSION_CONTEXTS.DASHBOARD) {
  loadPersistedStorefrontSessions();
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
  if (!sid) return;
  const session = sessions.get(sid);
  sessions.delete(sid);
  if (session?.context === SESSION_CONTEXTS.STOREFRONT) {
    persistStorefrontSessions();
  }
}
