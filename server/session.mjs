import { randomBytes } from "node:crypto";
import { cookie, parseCookies } from "./http.mjs";

export const sessions = new Map();
export const oauthStates = new Map();

export function getSession(req, res) {
  const cookies = parseCookies(req);
  let sid = cookies.pajulina_dashboard_sid;
  if (!sid || !sessions.has(sid)) {
    sid = randomBytes(24).toString("hex");
    sessions.set(sid, { tokens: null });
    res.setHeader("Set-Cookie", cookie("pajulina_dashboard_sid", sid, { httpOnly: true }));
  }
  return sessions.get(sid);
}

export function destroySession(sid) {
  if (sid) sessions.delete(sid);
}
