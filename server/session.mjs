import { randomBytes } from "node:crypto";
import { cookie, parseCookies } from "./http.mjs";
import { cloneTokens, getStoredTokens } from "./token-store.mjs";

export const sessions = new Map();
export const oauthStates = new Map();

export function getSession(req, res) {
  const cookies = parseCookies(req);
  let sid = cookies.pajulina_dashboard_sid;
  if (!sid || !sessions.has(sid)) {
    sid = randomBytes(24).toString("hex");
    sessions.set(sid, { tokens: cloneTokens(getStoredTokens()) });
    res.setHeader("Set-Cookie", cookie("pajulina_dashboard_sid", sid, { httpOnly: true }));
  }
  const session = sessions.get(sid);
  const storedTokens = getStoredTokens();
  if (!session.tokens && storedTokens?.access_token) {
    session.tokens = cloneTokens(storedTokens);
  }
  return session;
}

export function destroySession(sid) {
  if (sid) sessions.delete(sid);
}
