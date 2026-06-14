import { STOREFRONT_SHOP_HANDLE, STOREFRONT_XAPI_BASE } from "./config.mjs";
import { readJsonBody, sendJson } from "./http.mjs";
import { ensureAccessToken } from "./auth.mjs";

const checkoutOrderCounter = { value: 0 };
const storefrontCheckoutOrders = new Map();

function firstArray(...values) {
  return values.find((value) => Array.isArray(value)) || [];
}

function firstNonNull(...values) {
  return values.find((value) => value !== null && value !== undefined);
}

export async function handleStorefrontApi(req, res, url, storefrontSession = null) {
  if (url.pathname === "/api/storefront/products" && req.method === "GET") {
    const result = await fetchStorefrontProducts(url);
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  const basketProductId = storefrontBasketProductIdFromApiPath(url.pathname);
  if (basketProductId && req.method === "PUT") {
    const payload = await readJsonBody(req).catch(() => ({}));
    const result = await addToStorefrontBasket(storefrontSession, basketProductId, payload);
    if (!result.ok) {
      sendJson(res, result.status || 502, {
        ok: false,
        source: "storefront_basket_update",
        error: result.error || "Unable to update basket",
        status: result.status,
        endpoint: result.endpoint,
        details: result.payload,
      });
      return true;
    }
    sendJson(res, 200, result.payload);
    return true;
  }

  if (basketProductId && req.method === "DELETE") {
    const payload = await readJsonBody(req).catch(() => ({}));
    const result = await removeFromStorefrontBasket(storefrontSession, basketProductId, payload);
    if (!result.ok) {
      sendJson(res, result.status || 502, {
        ok: false,
        source: "storefront_basket_remove",
        error: result.error || "Unable to remove basket item",
        status: result.status,
        endpoint: result.endpoint,
        details: result.payload,
      });
      return true;
    }
    sendJson(res, 200, result.payload);
    return true;
  }

  if (url.pathname === "/api/storefront/orders" && req.method === "POST") {
    const payload = await readJsonBody(req).catch(() => ({}));
    const orderId = `PJ-${String(++checkoutOrderCounter.value).padStart(4, "0")}`;
    const order = {
      orderId,
      createdAt: new Date().toISOString(),
      payload: payload || {},
      status: "received",
    };
    storefrontCheckoutOrders.set(orderId, order);
    sendJson(res, 200, {
      ok: true,
      source: "storefront",
      orderId,
      order,
    });
    return true;
  }

  if (url.pathname === "/api/storefront/shop/info" && req.method === "GET") {
    const result = await fetchStorefrontShopInfo();
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  const productId = storefrontProductIdFromApiPath(url.pathname);
  if (productId && req.method === "GET") {
    const result = await fetchStorefrontProduct(productId);
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  return false;
}

async function addToStorefrontBasket(session, productId, payload = {}) {
  const product = String(productId || "").trim();
  if (!product) {
    return { ok: false, status: 400, error: "Product ID is required." };
  }

  const token = await ensureStorefrontToken(session);
  if (!token) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/basket/${encodeURIComponent(product)}`);
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(normalizeStorefrontBasketPayload(payload)),
  });
  const payloadResponse = await readStorefrontResponsePayload(response);
  const storefrontError = detectStorefrontApiError(payloadResponse, response.status);

  if (!response.ok) {
    if (storefrontError) {
      return {
        ok: false,
        status: storefrontError.status,
        error: storefrontError.error,
        payload: payloadResponse,
        endpoint: publicStorefrontEndpoint(endpoint, "PUT"),
      };
    }

    return {
      ok: false,
      status: response.status,
      error: readStorefrontApiMessage(payloadResponse) || `${response.statusText || "Selldone storefront basket request failed."} (${response.status}).`,
      payload: payloadResponse,
      endpoint: publicStorefrontEndpoint(endpoint, "PUT"),
    };
  }

  if (storefrontError) {
    return {
      ok: false,
      status: storefrontError.status,
      error: storefrontError.error,
      payload: payloadResponse,
      endpoint: publicStorefrontEndpoint(endpoint, "PUT"),
    };
  }

  return {
    ok: true,
    status: response.status,
    payload: payloadResponse,
    endpoint: publicStorefrontEndpoint(endpoint, "PUT"),
  };
}

async function removeFromStorefrontBasket(session, productId, payload = {}) {
  const product = String(productId || "").trim();
  if (!product) {
    return { ok: false, status: 400, error: "Product ID is required." };
  }

  const token = await ensureStorefrontToken(session);
  if (!token) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/basket/${encodeURIComponent(product)}`);
  const hasPayloadBody = payload && typeof payload === "object" && Object.keys(payload).length > 0;
  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-Requested-With": "XMLHttpRequest",
      ...(hasPayloadBody ? { "Content-Type": "application/json" } : {}),
    },
    ...(hasPayloadBody ? { body: JSON.stringify(payload) } : {}),
  });
  const payloadResponse = await readStorefrontResponsePayload(response);
  const storefrontError = detectStorefrontApiError(payloadResponse, response.status);

  if (!response.ok) {
    if (storefrontError) {
      return {
        ok: false,
        status: storefrontError.status,
        error: storefrontError.error,
        payload: payloadResponse,
        endpoint: publicStorefrontEndpoint(endpoint, "DELETE"),
      };
    }

    return {
      ok: false,
      status: response.status,
      error: readStorefrontApiMessage(payloadResponse) || `${response.statusText || "Selldone storefront basket remove request failed."} (${response.status}).`,
      payload: payloadResponse,
      endpoint: publicStorefrontEndpoint(endpoint, "DELETE"),
    };
  }

  if (storefrontError) {
    return {
      ok: false,
      status: storefrontError.status,
      error: storefrontError.error,
      payload: payloadResponse,
      endpoint: publicStorefrontEndpoint(endpoint, "DELETE"),
    };
  }

  return {
    ok: true,
    status: response.status,
    payload: payloadResponse,
    endpoint: publicStorefrontEndpoint(endpoint, "DELETE"),
  };
}

async function ensureStorefrontToken(session) {
  try {
    return await ensureAccessToken(session);
  } catch {
    return null;
  }
}

function normalizeStorefrontBasketPayload(payload = {}) {
  const source = typeof payload === "object" && payload !== null ? payload : {};
  const count = Number.parseInt(source.count, 10);
  const rawVariantCandidates = [
    source.variant_id,
    source.product_variant_id,
    source.variantId,
    source.variant?.id,
    source.variant?.variant_id,
    source.variant?.product_variant_id,
  ];
  const rawVariantId = rawVariantCandidates.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
  const variantId = Number.parseInt(rawVariantId, 10);
  const currency = String(source.currency || "").trim();
  return {
    count: Number.isFinite(count) && count > 0 ? count : 1,
    ...(currency ? { currency } : {}),
    ...(Number.isFinite(variantId) && variantId > 0 ? { variant_id: variantId } : {}),
  };
}

async function fetchStorefrontProducts(url) {
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/products/all`);
  const limit = clampInteger(url.searchParams.get("limit"), 1, 250, 200);
  const offset = clampInteger(url.searchParams.get("offset"), 0, 100000, 0);

  endpoint.searchParams.set("dir", url.searchParams.get("dir") || "*");
  endpoint.searchParams.set("offset", offset);
  endpoint.searchParams.set("limit", limit);
  endpoint.searchParams.set("with_total", "true");
  endpoint.searchParams.set("with_category", "true");
  endpoint.searchParams.set("products_only", "false");
  endpoint.searchParams.set("categories_only", "false");
  endpoint.searchParams.set("with_parent", "true");
  endpoint.searchParams.set("with_page", "true");
  endpoint.searchParams.set("available", url.searchParams.get("available") || "true");
  endpoint.searchParams.set("surrounded", "false");
  endpoint.searchParams.set("sort", url.searchParams.get("sort") || "newest");

  const search = url.searchParams.get("search");
  if (search) endpoint.searchParams.set("search", search);

  return requestStorefrontXapi(endpoint, "products");
}

async function fetchStorefrontProduct(productId) {
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/products/${encodeURIComponent(productId)}/info`);
  return requestStorefrontXapi(endpoint, "product");
}

async function fetchStorefrontShopInfo() {
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/info`);
  return requestStorefrontXapi(endpoint, "shop-info");
}

async function requestStorefrontXapi(endpoint, label) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    const payload = await readStorefrontResponsePayload(response);

    if (!response.ok) {
      return {
        ok: false,
        source: "storefront_xapi",
        status: response.status,
        endpoint: publicStorefrontEndpoint(endpoint),
        error: readStorefrontApiMessage(payload) || `${response.statusText || "Selldone storefront request failed"} (${response.status}).`,
        payload,
      };
    }

    return {
      ok: true,
      source: "storefront_xapi",
      apiBaseUrl: STOREFRONT_XAPI_BASE,
      endpoint: publicStorefrontEndpoint(endpoint),
      products: firstArray(
        payload?.products,
        payload?.data?.products,
        payload?.result?.products,
        payload?.payload?.products,
        payload?.payload?.data?.products,
        payload?.data?.payload?.products,
        payload?.items,
        payload?.data?.items,
        payload?.result?.items,
        payload?.payload?.items,
      ),
      folders: firstArray(
        payload?.folders,
        payload?.data?.folders,
        payload?.result?.folders,
        payload?.payload?.folders,
        payload?.payload?.data?.folders,
        payload?.result?.data?.folders,
      ),
      total: firstNonNull(payload?.total, payload?.data?.total, payload?.result?.total, payload?.payload?.total, 0),
      product: firstNonNull(payload?.product, payload?.data?.product, payload?.result?.product, payload?.payload?.product, null),
      transportations: firstArray(
        payload?.transportations,
        payload?.shop?.transportations,
        payload?.data?.transportations,
        payload?.data?.shop?.transportations,
        payload?.payload?.transportations,
        payload?.payload?.shop?.transportations,
        payload?.result?.transportations,
      ),
      data: payload,
    };
  } catch (error) {
    return {
      ok: false,
      source: "storefront_xapi",
      status: 502,
      endpoint: publicStorefrontEndpoint(endpoint),
      error: error.message || `Selldone storefront ${label} request failed.`,
    };
  }
}

async function readStorefrontResponsePayload(response) {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
      message: text,
    };
  }
}

function publicStorefrontEndpoint(endpoint, method = "GET") {
  return {
    method,
    url: endpoint.toString(),
  };
}

function storefrontProductIdFromApiPath(pathname) {
  const match = pathname.match(/^\/api\/storefront\/products\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function storefrontBasketProductIdFromApiPath(pathname) {
  const match = pathname.match(/^\/api\/storefront\/basket\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function readStorefrontApiMessage(payload) {
  const candidateValues = [
    payload?.error_msg,
    payload?.error_description,
    payload?.message,
    payload?.error,
    payload?.error_message,
    payload?.reason,
    payload?.statusMessage,
    payload?.payload?.error_msg,
    payload?.payload?.error_description,
    payload?.payload?.message,
    payload?.payload?.error,
    payload?.payload?.error_message,
    payload?.payload?.reason,
    payload?.payload?.title,
  ];

  for (const candidate of candidateValues) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
        .join(", ");
    }
    if (candidate != null) {
      const text = String(candidate).trim();
      if (text) return text;
    }
  }

  if (Array.isArray(payload?.errors)) {
    const lines = payload.errors
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") return readStorefrontApiMessage(item);
        return String(item || "").trim();
      })
      .filter(Boolean);
    if (lines.length) return lines.join(", ");
  }

  if (typeof payload === "string") {
    const text = payload.trim();
    return text;
  }

  if (payload && typeof payload === "object") {
    return JSON.stringify(payload);
  }

  return "";
}

function detectStorefrontApiError(payload, status = 0) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const responseStatus = Number.isFinite(Number(status)) && Number(status) > 0 ? Number(status) : 502;
  const directFlags = [
    payload.ok,
    payload.success,
    payload.valid,
    payload?.error,
    payload?.error_msg,
    payload?.error_message,
    payload?.error_description,
    payload?.reason,
    payload?.message,
    payload?.details,
  ];

  for (const flag of directFlags) {
    if (flag === false) {
      return {
        status: responseStatus,
        error: readStorefrontApiMessage(payload) || `Selldone storefront request failed (${responseStatus}).`,
      };
    }
    if (typeof flag === "string" && flag.trim() && isLikelyStorefrontErrorMessage(flag)) {
      return {
        status: responseStatus,
        error: flag.trim(),
      };
    }
    if (Array.isArray(flag)) {
      if (!flag.length) continue;
      const details = flag
        .map((entry) => {
          if (typeof entry === "string") return entry;
          if (entry && typeof entry === "object") return readStorefrontApiMessage(entry);
          return String(entry || "");
        })
        .filter(Boolean)
        .join(", ");
      return {
        status: responseStatus,
        error: details || `Selldone storefront request failed (${responseStatus}).`,
      };
    }
    if (flag && typeof flag === "object") {
      const nested = detectStorefrontApiError(flag, status);
      if (nested) return nested;
    }
  }

  if (Array.isArray(payload.errors) && payload.errors.length) {
    const details = payload.errors
      .map((entry) => (typeof entry === "string" ? entry : readStorefrontApiMessage(entry)))
      .filter(Boolean)
      .join(", ");
    return {
      status: responseStatus,
      error: details || `Selldone storefront request failed (${responseStatus}).`,
    };
  }

  const nestedPayload = payload.payload;
  if (nestedPayload && typeof nestedPayload === "object") {
    const nested = detectStorefrontApiError(nestedPayload, status);
    if (nested) return nested;
  }

  const candidateMessage = String(
    payload?.error_msg ||
      payload?.error_message ||
      payload?.error_description ||
      payload?.reason ||
      payload?.message ||
      payload?.title ||
      "",
  ).trim();
  if (candidateMessage && isLikelyStorefrontErrorMessage(candidateMessage)) {
    return {
      status: responseStatus,
      error: candidateMessage,
    };
  }

  return null;
}

function isLikelyStorefrontErrorMessage(message = "") {
  const normalized = String(message).trim().toLowerCase();
  if (!normalized) return false;
  if (/\bok\b|success/.test(normalized) && normalized.length <= 30) return false;

  return [
    "error",
    "failed",
    "invalid",
    "incorrect",
    "removed",
    "not available",
    "not found",
    "no longer",
    "forbidden",
    "permission",
    "expired",
    "unauthor",
    "not authorized",
    "does not",
    "missing scope",
    "please log",
    "login first",
  ].some((token) => normalized.includes(token));
}
