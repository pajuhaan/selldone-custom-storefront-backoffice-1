import { API_BASE, SHOP_ID } from "../config.mjs";
import { ensureAccessToken } from "../auth.mjs";
import { getSession } from "../session.mjs";
import { readJsonBody, sendJson } from "../http.mjs";
import {
  callCustomersEndpoint,
  customerIdFromApiPath,
  customerListFromPayload,
  publicEndpointConfig,
  sanitizeCustomerUpdatePayload,
  selldoneApiRequest,
} from "../selldone-api.mjs";

export async function handleCustomerRoutes(req, res, url) {
  if (url.pathname === "/api/customers" && req.method === "GET") {
    const session = getSession(req, res);
    const token = await ensureAccessToken(session);
    if (!token) {
      sendJson(res, 401, { error: "Authentication required" });
      return true;
    }

    const limit = clampNumber(url.searchParams.get("limit"), 1, 200, 100);
    const offset = clampNumber(url.searchParams.get("offset"), 0, Number.MAX_SAFE_INTEGER, 0);
    const query = {
      limit,
      offset,
      sortBy: url.searchParams.get("sortBy") || "updated_at",
      sortDesc: url.searchParams.get("sortDesc") === "false" ? "false" : "true",
    };
    const search = String(url.searchParams.get("search") || "").trim();
    if (search) query.search = search.slice(0, 255);

    const result = await callCustomersEndpoint(session, query);
    const customers = customerListFromPayload(result.data);
    sendJson(res, result.ok ? 200 : result.error.status || 502, {
      ok: result.ok,
      source: result.source,
      apiBaseUrl: API_BASE,
      endpoint: publicEndpointConfig().customers,
      count: customers.length,
      total: result.data.total || customers.length,
      customers,
      error: result.error || null,
    });
    return true;
  }

  const apiCustomerId = customerIdFromApiPath(url.pathname);
  if (apiCustomerId && req.method === "GET") {
    const session = getSession(req, res);
    const token = await ensureAccessToken(session);
    if (!token) {
      sendJson(res, 401, { error: "Authentication required" });
      return true;
    }

    const data = await selldoneApiRequest(session, {
      method: "GET",
      path: `/shops/${SHOP_ID}/customers/${apiCustomerId}`,
    });
    sendJson(res, 200, {
      ok: true,
      source: "backoffice",
      apiBaseUrl: API_BASE,
      endpoint: {
        method: "GET",
        path: `/shops/${SHOP_ID}/customers/${apiCustomerId}`,
      },
      customer: data.customer || data,
      data,
    });
    return true;
  }

  if (apiCustomerId && req.method === "PUT") {
    const session = getSession(req, res);
    const token = await ensureAccessToken(session);
    if (!token) {
      sendJson(res, 401, { error: "Authentication required" });
      return true;
    }

    const payload = sanitizeCustomerUpdatePayload(await readJsonBody(req));
    if (!Object.keys(payload).length) {
      sendJson(res, 400, { error: "No editable customer fields were provided." });
      return true;
    }

    const data = await selldoneApiRequest(session, {
      method: "PUT",
      path: `/shops/${SHOP_ID}/customers/${apiCustomerId}`,
      body: payload,
    });
    sendJson(res, 200, {
      ok: true,
      source: "backoffice",
      apiBaseUrl: API_BASE,
      endpoint: {
        method: "PUT",
        path: `/shops/${SHOP_ID}/customers/${apiCustomerId}`,
      },
      customer: data.customer || data,
      data,
    });
    return true;
  }

  return false;
}

function clampNumber(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
