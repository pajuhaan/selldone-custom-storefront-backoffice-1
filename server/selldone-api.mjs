import { API_BASE, ARTICLE_UPDATE_FIELDS, ENDPOINTS, PRODUCT_UPDATE_FIELDS, PROFILE_ENDPOINT, SHOP, SHOP_ID } from "./config.mjs";
import { ensureAccessToken } from "./auth.mjs";
import { sendJson } from "./http.mjs";

const guardedBackofficeLogs = new Map();

export async function selldoneApi(session, path, params = {}) {
  return selldoneApiRequest(session, { path, query: params });
}

export async function selldoneApiRequest(session, { method = "GET", path, query = {}, body = null }, canRetry = true) {
  const token = await ensureAccessToken(session);
  if (!token) {
    const error = new Error("Authentication required");
    error.status = 401;
    throw error;
  }

  const url = buildApiUrl(API_BASE, path, query);
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "X-Requested-With": "XMLHttpRequest",
  };
  const init = { method, headers };

  if (body !== null && body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);

  if (response.status === 401 && canRetry) {
    session.tokens.expires_at = 0;
    const retryToken = await ensureAccessToken(session);
    if (retryToken) {
      return selldoneApiRequest(session, { method, path, query, body }, false);
    }
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(readApiMessage(payload) || `Selldone API failed: ${response.status}`);
    error.status = response.status;
    error.apiPath = path;
    error.apiPayload = payload;
    throw error;
  }
  assertUsablePayload(payload, path);
  return payload;
}

export function buildApiUrl(baseUrl, path, params = {}) {
  const url = new URL(`${baseUrl}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(`${key}[]`, item));
    } else if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });
  return url;
}

export function sanitizeProductUpdatePayload(payload = {}) {
  const next = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (!PRODUCT_UPDATE_FIELDS.has(key) || value === undefined || value === null) return;
    if (typeof value === "string" && !value.trim()) return;
    next[key] = normalizeProductFieldValue(key, value);
  });
  return next;
}

export function sanitizeArticleUpdatePayload(payload = {}) {
  const next = {};
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (!ARTICLE_UPDATE_FIELDS.has(key) || value === undefined || value === null) return;
    if (typeof value === "string" && !value.trim() && !["image", "schedule_at", "slug", "page_title", "description"].includes(key)) return;
    const normalized = normalizeArticleFieldValue(key, value);
    if (normalized !== undefined) next[key] = normalized;
  });
  return next;
}

function normalizeProductFieldValue(key, value) {
  if (["price", "discount", "commission"].includes(key)) {
    return Number(value || 0);
  }
  if (["lead", "category_id"].includes(key)) {
    return Number.parseInt(value, 10);
  }
  if (["unit_float", "original", "return_warranty"].includes(key)) {
    return Boolean(value);
  }
  return value;
}

function normalizeArticleFieldValue(key, value) {
  if (["article_id", "cluster_id"].includes(key)) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? number : undefined;
  }
  if (key === "category") {
    if (value === "" || value === null || value === undefined) return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }
  if (["private", "published"].includes(key)) {
    return Boolean(value);
  }
  if (["faqs", "structures"].includes(key)) {
    return Array.isArray(value) ? value : [];
  }
  return typeof value === "string" ? value.trim() : value;
}

export function productIdFromApiPath(pathname) {
  const match = pathname.match(/^\/api\/products\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function articleIdFromApiPath(pathname) {
  const match = pathname.match(/^\/api\/blogs\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function articleListFromPayload(payload = {}) {
  return firstArray(payload.articles, payload.blogs, payload.data, payload.items, payload.results);
}

function firstArray(...values) {
  return values.find((value) => Array.isArray(value)) || [];
}

function assertUsablePayload(payload, path) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
  const hasData =
    payload.success === true ||
    Array.isArray(payload.products) ||
    Array.isArray(payload.articles) ||
    Array.isArray(payload.timeline) ||
    Array.isArray(payload.tags) ||
    Array.isArray(payload.notifications) ||
    Array.isArray(payload.categories) ||
    Array.isArray(payload.folders) ||
    Array.isArray(payload.orders) ||
    payload.product ||
    payload.article ||
    payload.category ||
    payload.order;
  if (!hasData && (payload.message || payload.error)) {
    const error = new Error(readApiMessage(payload) || "Selldone returned an unusable response");
    error.status = isTwoFactorGuard(payload) ? 502 : isTokenAccessDeniedPayload(payload) ? 403 : 500;
    error.apiPath = path;
    error.apiPayload = payload;
    throw error;
  }
}

function isTwoFactorGuard(payload) {
  return readApiMessage(payload).toLowerCase().includes("google2fa");
}

function readApiMessage(payload) {
  if (payload?.error_msg) return String(payload.error_msg);
  if (payload?.error_description) return String(payload.error_description);
  const message = payload?.message || payload?.error;
  if (Array.isArray(message)) return message.join(", ");
  if (message && typeof message === "object") return JSON.stringify(message);
  if (typeof message === "boolean") return message ? "Request failed" : "";
  return String(message || "");
}

function isTokenAccessDeniedPayload(payload) {
  return Number(payload?.code) === 201 || /does not have access|missing_scope|permission|forbidden/i.test(readApiMessage(payload));
}

async function safeSelldoneApi(session, label, path, params, fallback) {
  try {
    return { ok: true, label, source: "backoffice", data: await selldoneApi(session, path, params) };
  } catch (error) {
    const status = error.status || 500;
    const message = formatSelldoneError(error);
    logSelldoneApiIssue(label, path, status, error);

    if (status === 401) {
      throw error;
    }

    return {
      ok: false,
      label,
      source: "backoffice",
      data: fallback,
      error: { label, status, message, code: getSelldoneErrorCode(error) },
    };
  }
}

function formatSelldoneError(error) {
  if (isGoogleTwoFactorError(error)) {
    return "Selldone requires Google 2FA verification for this backoffice endpoint.";
  }
  if (isTokenAccessDeniedError(error)) {
    return "Reconnect with consent to grant this Selldone backoffice section access.";
  }
  return error.message || "Request failed";
}

function getSelldoneErrorCode(error) {
  if (isTokenAccessDeniedError(error)) return "selldone_token_access_denied";
  return isGoogleTwoFactorError(error) ? "selldone_google_2fa_required" : null;
}

function isGoogleTwoFactorError(error) {
  return isTwoFactorGuard(error.apiPayload) || String(error.message || "").toLowerCase().includes("google2fa");
}

function isTokenAccessDeniedError(error) {
  return isTokenAccessDeniedPayload(error.apiPayload) || /does not have access|missing_scope|permission|forbidden/i.test(String(error.message || ""));
}

function logSelldoneApiIssue(label, path, status, error) {
  const isTwoFactor = isGoogleTwoFactorError(error);
  const logEntry = {
    level: isTwoFactor ? "warn" : "error",
    source: isTwoFactor ? "selldone_backoffice_guard" : "selldone_api",
    label,
    status,
    path: error.apiPath || path,
    message: isTwoFactor ? "Selldone requires Google 2FA verification for this backoffice endpoint." : error.message,
    payload: error.apiPayload || null,
  };

  if (isTwoFactor && shouldSkipGuardLog(logEntry.path)) {
    return;
  }

  const log = isTwoFactor ? console.warn : console.error;
  log(JSON.stringify(logEntry));
}

function shouldSkipGuardLog(path) {
  const now = Date.now();
  const previous = guardedBackofficeLogs.get(path) || 0;
  guardedBackofficeLogs.set(path, now);
  return now - previous < 60_000;
}

export async function dashboardPayload(session) {
  const [
    productsResult,
    categoriesResult,
    ordersResult,
    analyticsResult,
    blogsResult,
    blogTimelineResult,
    blogTagsResult,
    notificationsResult,
  ] = await Promise.all([
    callProductsEndpoint(session),
    callCategoriesEndpoint(session),
    callDashboardEndpoint(session, ENDPOINTS.orders),
    callDashboardEndpoint(session, ENDPOINTS.shopAnalytics),
    callBlogsEndpoint(session),
    callBlogTimelineEndpoint(session),
    callBlogTagsEndpoint(session),
    callNotificationsEndpoint(session),
  ]);
  const productsPayload = productsResult.data;
  const categoriesPayload = categoriesResult.data;
  const ordersPayload = ordersResult.data;
  const analyticsPayload = analyticsResult.data;
  const blogsPayload = blogsResult.data;
  const blogTimelinePayload = blogTimelineResult.data;
  const blogTagsPayload = blogTagsResult.data;
  const notificationsPayload = notificationsResult.data;
  const errors = [
    productsResult,
    categoriesResult,
    ordersResult,
    analyticsResult,
    blogsResult,
    blogTimelineResult,
    blogTagsResult,
    notificationsResult,
  ]
    .filter((result) => !result.ok)
    .map((result) => result.error);
  const categories = categoriesPayload.categories || categoriesPayload.folders || [];
  const notifications = notificationsPayload.notifications || [];

  return {
    fetchedAt: new Date().toISOString(),
    shop: SHOP,
    apiBaseUrl: API_BASE,
    errors,
    products: productsPayload.products || [],
    productTotal: productsPayload.total || 0,
    categories,
    categoryTotal: categoriesPayload.total || categories.length,
    orders: ordersPayload.orders || [],
    totalOrders: ordersPayload.total || 0,
    orderStatuses: ordersPayload.statuses || ["Open", "Reserved", "Payed", "COD", "Canceled"],
    articles: articleListFromPayload(blogsPayload),
    articleTotal: blogsPayload.total || articleListFromPayload(blogsPayload).length || 0,
    blogTimeline: articleListFromPayload({ articles: blogTimelinePayload.timeline, ...blogTimelinePayload }),
    blogTags: blogTagsPayload.tags || [],
    notifications,
    notificationTotal: notificationsPayload.total || notifications.length,
    analytics: {
      window: { days: 30, offset: 0 },
      data: analyticsPayload.data || [],
      orderQue: analyticsPayload.orderQue || [],
      avocadoQue: analyticsPayload.avocadoQue || [],
      shop: analyticsPayload.shop || null,
      raw: analyticsPayload,
    },
  };
}

export async function callProductsEndpoint(session) {
  return callDashboardEndpoint(session, ENDPOINTS.products);
}

export async function callBlogsEndpoint(session) {
  return callDashboardEndpoint(session, ENDPOINTS.blogs);
}

export async function callNotificationsEndpoint(session, query = {}) {
  return callDashboardEndpoint(session, {
    ...ENDPOINTS.notifications,
    query: {
      ...ENDPOINTS.notifications.query,
      ...query,
    },
  });
}

async function callBlogTimelineEndpoint(session) {
  return callDashboardEndpoint(session, ENDPOINTS.blogTimeline);
}

async function callBlogTagsEndpoint(session) {
  return callDashboardEndpoint(session, ENDPOINTS.blogTags);
}

async function callCategoriesEndpoint(session) {
  return callDashboardEndpoint(session, ENDPOINTS.categories);
}

function callDashboardEndpoint(session, endpoint) {
  return safeSelldoneApi(session, endpoint.label, endpoint.path, endpoint.query, endpoint.fallback);
}

export async function userProfilePayload(session) {
  try {
    const payload = await selldoneApi(session, PROFILE_ENDPOINT.path, PROFILE_ENDPOINT.query);
    return normalizeUserProfile(payload);
  } catch (error) {
    const isAuthError = error.status === 401 || error.status === 403;
    if (isAuthError) throw error;
    logSelldoneApiIssue(PROFILE_ENDPOINT.label, PROFILE_ENDPOINT.path, error.status || 500, error);
    return fallbackUserProfile();
  }
}

function normalizeUserProfile(payload = {}) {
  const profile = payload.profile || (Array.isArray(payload.profiles) ? payload.profiles[0] : null) || {};
  const name = profile.name || profile.full_name || profile.title || "Selldone user";
  const email = profile.email || "";
  const id = Number(profile.id || 0);

  return {
    id,
    name,
    email,
    avatarUrl: `/api/profile/avatar?id=${encodeURIComponent(id || 0)}`,
  };
}

export function fallbackUserProfile() {
  return {
    id: 0,
    name: "Selldone user",
    email: "",
    avatarUrl: "/api/profile/avatar?id=0",
  };
}

export async function sendProfileAvatar(req, res, session, url) {
  const token = await ensureAccessToken(session);
  if (!token) {
    sendJson(res, 401, { error: "Authentication required" });
    return;
  }

  const profileId = Number(url.searchParams.get("id") || 0);
  const avatarUrl = `${API_BASE}/profile/image/${Number.isFinite(profileId) ? profileId : 0}/avatar92.jpg`;
  const response = await fetch(avatarUrl, {
    headers: {
      Accept: "image/*",
      Authorization: `Bearer ${token}`,
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  res.writeHead(response.ok ? 200 : 404, {
    "Content-Type": response.headers.get("content-type") || "image/png",
    "Cache-Control": "private, max-age=300",
  });
  res.end(buffer);
}

export function publicEndpointConfig() {
  return Object.fromEntries(
    Object.entries(ENDPOINTS).map(([key, endpoint]) => [
      key,
      {
        label: endpoint.label,
        method: "GET",
        url: buildApiUrl(API_BASE, endpoint.path, endpoint.query).toString(),
        path: endpoint.path,
        query: endpoint.query,
      },
    ]),
  );
}
