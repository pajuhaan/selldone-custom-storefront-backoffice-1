import { API_BASE, ARTICLE_UPDATE_FIELDS, CUSTOMER_UPDATE_FIELDS, ENDPOINTS, PRODUCT_UPDATE_FIELDS, PROFILE_ENDPOINT, SELLDONE_BASE, SHOP, SHOP_ID } from "./config.mjs";
import { ensureAccessToken } from "./auth.mjs";
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

export function sanitizeCustomerUpdatePayload(payload = {}) {
  const next = {};
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (!CUSTOMER_UPDATE_FIELDS.has(key) || value === undefined || value === null) return;
    const normalized = normalizeCustomerFieldValue(key, value);
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

function normalizeCustomerFieldValue(key, value) {
  if (["subscribed"].includes(key)) return Boolean(value);
  if (["address", "billing"].includes(key)) return normalizeAddressPayload(value);
  if (key === "segments") {
    const source = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : [];
    return Array.from(new Set(source.map((item) => String(item || "").trim()).filter(Boolean))).slice(0, 24);
  }
  if (key === "level") {
    const level = String(value || "").trim().toUpperCase();
    return ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"].includes(level) ? level : undefined;
  }
  if (key === "sex") {
    const sex = String(value || "").trim();
    return ["Male", "Female"].includes(sex) ? sex : undefined;
  }
  if (key === "birthday") {
    const text = String(value || "").trim();
    return text || undefined;
  }
  const text = typeof value === "string" ? value.trim() : value;
  return text === "" ? undefined : text;
}

function normalizeAddressPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const allowed = ["address", "country", "state", "city", "message", "name", "no", "phone", "postal", "unit"];
  const next = {};
  allowed.forEach((key) => {
    const field = value[key];
    if (field === undefined || field === null) return;
    const text = String(field).trim();
    if (text) next[key] = text;
  });
  if (value.location && typeof value.location === "object") {
    const lat = Number(value.location.lat);
    const lng = Number(value.location.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) next.location = { lat, lng };
  }
  return Object.keys(next).length ? next : undefined;
}

export function productIdFromApiPath(pathname) {
  const match = pathname.match(/^\/api\/products\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function articleIdFromApiPath(pathname) {
  const match = pathname.match(/^\/api\/blogs\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function customerIdFromApiPath(pathname) {
  const match = pathname.match(/^\/api\/customers\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function articleListFromPayload(payload = {}) {
  return firstArray(payload.articles, payload.blogs, payload.data, payload.items, payload.results);
}

export function customerListFromPayload(payload = {}) {
  return firstArray(payload.customers, payload.data, payload.items, payload.results);
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
    Array.isArray(payload.customers) ||
    Array.isArray(payload.categories) ||
    Array.isArray(payload.folders) ||
    Array.isArray(payload.orders) ||
    payload.product ||
    payload.customer ||
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
    customersResult,
    analyticsResult,
    blogsResult,
    blogTimelineResult,
    blogTagsResult,
    notificationsResult,
  ] = await Promise.all([
    callProductsEndpoint(session),
    callCategoriesEndpoint(session),
    callDashboardEndpoint(session, ENDPOINTS.orders),
    callCustomersEndpoint(session),
    callDashboardEndpoint(session, ENDPOINTS.shopAnalytics),
    callBlogsEndpoint(session),
    callBlogTimelineEndpoint(session),
    callBlogTagsEndpoint(session),
    callNotificationsEndpoint(session),
  ]);
  const productsPayload = productsResult.data;
  const categoriesPayload = categoriesResult.data;
  const ordersPayload = ordersResult.data;
  const customersPayload = customersResult.data;
  const analyticsPayload = analyticsResult.data;
  const blogsPayload = blogsResult.data;
  const blogTimelinePayload = blogTimelineResult.data;
  const blogTagsPayload = blogTagsResult.data;
  const notificationsPayload = notificationsResult.data;
  const errors = [
    productsResult,
    categoriesResult,
    ordersResult,
    customersResult,
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
  const customers = customerListFromPayload(customersPayload);

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
    customers,
    customerTotal: customersPayload.total || customers.length,
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

export async function callCustomersEndpoint(session, query = {}) {
  return callDashboardEndpoint(session, {
    ...ENDPOINTS.customers,
    query: {
      ...ENDPOINTS.customers.query,
      ...query,
    },
  });
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
  const profileCandidates = [
    payload?.profile,
    payload?.user,
    payload?.customer,
    Array.isArray(payload?.profiles) ? payload.profiles[0] : null,
  ].filter((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate));

  const profile = profileCandidates[0] || {};
  const firstName = String(profile.first_name || profile.firstName || "").trim();
  const lastName = String(profile.last_name || profile.lastName || "").trim();
  const fullName = String(
    profile.name || profile.full_name || profile.title || `${firstName} ${lastName}`.trim() || ""
  ).trim();
  const name = fullName || "Selldone user";
  const email = String(profile.email || "").trim();
  const id = Number(profile.id || profile.profile_id || profile.user_id || 0);
  const avatarUserId = Number(profile.user_id || profile.id || profile.profile_id || 0);
  const city =
    String(profile.city || profile.city_name || profile.address?.city || profile.billing?.city || profile.state || "").trim() || "";
  const address = String(
    profile.address ||
      profile.billing?.address ||
      profile.location?.address ||
      profile.address1 ||
      profile.address_line ||
      ""
  ).trim();

  return {
    id,
    name,
    email,
    firstName,
    lastName,
    phone: String(profile.phone || "").trim(),
    username: String(profile.username || "").trim(),
    address,
    city,
    avatarUrl:
      Number.isFinite(avatarUserId) && avatarUserId > 0
        ? userAvatarUrl(avatarUserId, "small")
        : "",
  };
}

export function fallbackUserProfile() {
  return {
    id: 0,
    name: "Selldone user",
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    username: "",
    address: "",
    city: "",
    avatarUrl: "",
  };
}

export async function sendProfileAvatar(req, res, session, url, fallbackSession = null) {
  const userId = Number(url.searchParams.get("user_id") || url.searchParams.get("id"));
  if (!Number.isFinite(userId) || userId <= 0) {
    res.writeHead(400, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    res.end("Missing or invalid user id");
    return;
  }

  const token = await resolveAvatarAccessToken(session, fallbackSession);
  if (!token) {
    res.writeHead(401, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    res.end("Authentication required");
    return;
  }

  const avatarId = Math.trunc(userId);
  const size = normalizeAvatarSize(url.searchParams.get("size") || "small");
  const candidates = [
    userAvatarUrl(avatarId, size),
    `${API_BASE}/users/${avatarId}/profile/avatar/${size}`,
    `${API_BASE}/profile/image/${avatarId}/avatar${size === "big" ? "192" : "92"}.jpg`,
    `${API_BASE}/profile/image/${avatarId}/avatar92.jpg`,
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: {
          Accept: "image/*",
          Authorization: `Bearer ${token}`,
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (!response.ok) {
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      res.writeHead(200, {
        "Content-Type": response.headers.get("content-type") || "image/png",
        "Cache-Control": "private, max-age=300",
      });
      res.end(buffer);
      return;
    } catch {
      continue;
    }
  }

  res.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "private, max-age=30",
  });
  res.end("Avatar not found");
}

async function resolveAvatarAccessToken(session, fallbackSession) {
  const token = await safeGetAccessToken(session);
  if (token) return token;
  if (!fallbackSession) return null;
  return safeGetAccessToken(fallbackSession);
}

async function safeGetAccessToken(session) {
  try {
    return await ensureAccessToken(session);
  } catch {
    return null;
  }
}

function normalizeAvatarSize(value) {
  const size = String(value || "").trim().toLowerCase();
  if (size === "big") return "big";
  return "small";
}

function userAvatarUrl(userId, size = "small") {
  const avatarId = Math.trunc(Number(userId || 0));
  if (!Number.isFinite(avatarId) || avatarId <= 0) return "";
  const normalizedSize = normalizeAvatarSize(size);
  return `${SELLDONE_BASE}/users/${avatarId}/profile/avatar/${normalizedSize}`;
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
