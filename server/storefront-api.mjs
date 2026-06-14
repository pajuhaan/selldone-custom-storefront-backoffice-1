import { STOREFRONT_SHOP_HANDLE, STOREFRONT_XAPI_BASE } from "./config.mjs";
import { readJsonBody, sendJson } from "./http.mjs";
import { ensureAccessToken } from "./auth.mjs";

const STOREFRONT_PHYSICAL_BASKET_TYPE = "physical";

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

  if (url.pathname === "/api/storefront/basket" && req.method === "GET") {
    const result = await fetchStorefrontBasket(storefrontSession, url);
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
    sendJson(res, 501, {
      ok: false,
      source: "storefront_checkout",
      error: "Selldone checkout is not connected yet. Basket operations are handled by Selldone XAPI; checkout needs a real Selldone gateway endpoint.",
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

async function fetchStorefrontBasket(session, url) {
  const token = await ensureStorefrontToken(session);
  if (!token) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const shopInfo = await fetchStorefrontShopInfoWithBaskets(token);
  if (!shopInfo.ok) {
    return {
      ok: false,
      source: "storefront_basket",
      status: shopInfo.status,
      error: shopInfo.error || "Unable to load Selldone basket.",
      endpoint: shopInfo.endpoint,
      details: shopInfo.payload,
    };
  }

  const physicalBasket = extractPhysicalBasketFromShopInfo(shopInfo.payload);
  const billResult = await fetchStorefrontBasketBill(token, STOREFRONT_PHYSICAL_BASKET_TYPE);
  const bill = billResult.ok ? extractStorefrontBillPayload(billResult.payload) || billResult.payload?.bill || null : null;

  return {
    ok: true,
    source: "storefront_basket",
    status: 200,
    type: STOREFRONT_PHYSICAL_BASKET_TYPE,
    endpoint: shopInfo.endpoint,
    basket: physicalBasket || { type: STOREFRONT_PHYSICAL_BASKET_TYPE, items: [], basket_items: [] },
    bill,
    shop: firstNonNull(shopInfo.payload?.shop, shopInfo.payload?.data?.shop, shopInfo.payload?.result?.shop, null),
  };
}

async function fetchStorefrontShopInfoWithBaskets(token) {
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/info`);
  return requestStorefrontBasketEndpoint(token, endpoint, STOREFRONT_PHYSICAL_BASKET_TYPE, "shop-info");
}

async function fetchStorefrontBasketBill(token, type) {
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/basket/${encodeURIComponent(type)}/bill`);
  return requestStorefrontBasketEndpoint(token, endpoint, type, "bill");
}

async function requestStorefrontBasketEndpoint(token, endpoint, type, label) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    const payload = await readStorefrontResponsePayload(response);
    const storefrontError = detectStorefrontApiError(payload, response.status);
    if (!response.ok || storefrontError) {
      return {
        ok: false,
        type,
        label,
        status: storefrontError?.status || response.status,
        error: storefrontError?.error || readStorefrontApiMessage(payload) || `${response.statusText || `Selldone storefront ${label} request failed.`} (${response.status}).`,
        payload,
        endpoint: publicStorefrontEndpoint(endpoint),
      };
    }

    return {
      ok: true,
      type,
      label,
      status: response.status,
      payload,
      endpoint: publicStorefrontEndpoint(endpoint),
    };
  } catch (error) {
    return {
      ok: false,
      type,
      label,
      status: 502,
      error: error.message || `Selldone storefront ${type} ${label} request failed.`,
      endpoint: publicStorefrontEndpoint(endpoint),
    };
  }
}

function extractStorefrontBasketPayload(payload = {}) {
  if (!payload || typeof payload !== "object") return null;
  return firstNonNull(
    payload?.basket,
    payload?.data?.basket,
    payload?.response?.basket,
    payload?.result?.basket,
    payload?.cart,
    payload?.data?.cart,
    payload?.response?.cart,
    payload?.result?.cart,
    payload?.payload?.basket,
    payload?.payload?.cart,
    Array.isArray(payload?.items) || Array.isArray(payload?.lines) || Array.isArray(payload?.basket_items) ? payload : null,
  );
}

function extractStorefrontBasketsPayload(payload = {}) {
  return firstArray(
    payload?.baskets,
    payload?.data?.baskets,
    payload?.result?.baskets,
    payload?.payload?.baskets,
    payload?.shop?.baskets,
    payload?.data?.shop?.baskets,
    payload?.result?.shop?.baskets,
  );
}

function extractPhysicalBasketFromShopInfo(payload = {}) {
  const baskets = extractStorefrontBasketsPayload(payload);
  const physical = baskets.find((basket) => String(basket?.type || basket?.product_type || "").trim().toLowerCase() === STOREFRONT_PHYSICAL_BASKET_TYPE);
  if (!physical) return null;
  const items = firstArray(physical?.items, physical?.lines, physical?.basket_items, physical?.data?.items, physical?.result?.items);
  return {
    ...physical,
    type: STOREFRONT_PHYSICAL_BASKET_TYPE,
    items,
    basket_items: items,
  };
}

function extractStorefrontBillPayload(payload = {}) {
  if (!payload || typeof payload !== "object") return null;
  return firstNonNull(
    payload?.bill,
    payload?.data?.bill,
    payload?.response?.bill,
    payload?.result?.bill,
    payload?.summary,
    payload?.data?.summary,
    payload?.response?.summary,
    payload?.result?.summary,
    payload?.payload?.bill,
    null,
  );
}

function combineStorefrontBasketResponses(results = []) {
  const items = [];
  const baskets = {};
  const bills = {};

  for (const result of results) {
    const basket = extractStorefrontBasketPayload(result.payload);
    const bill = extractStorefrontBillPayload(result.payload);
    if (basket && typeof basket === "object") {
      baskets[result.type] = basket;
      const basketItems = firstArray(basket?.items, basket?.lines, basket?.basket_items, basket?.data?.items, basket?.result?.items);
      basketItems.forEach((item) => {
        if (item && typeof item === "object") {
          items.push({ ...item, basket_type: item.basket_type || item.type || result.type });
        }
      });
    }
    if (bill && typeof bill === "object") {
      bills[result.type] = bill;
    }
  }

  const bill = aggregateStorefrontBills(bills);
  return {
    ok: true,
    source: "storefront_basket",
    status: 200,
    types: results.map((result) => result.type),
    endpoint: {
      method: "GET",
      url: `${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/basket/{type}/bill`,
    },
    basket: {
      items,
      basket_items: items,
      baskets,
    },
    bill,
    baskets,
    bills,
  };
}

function aggregateStorefrontBills(bills = {}) {
  const billEntries = Object.entries(bills).filter(([, bill]) => bill && typeof bill === "object");
  const summary = {
    baskets: bills,
  };
  const currency = firstNonNull(...billEntries.map(([, bill]) => firstNonNull(bill.currency, bill.currency_code, bill.currencyCode)));
  if (currency) summary.currency = currency;

  const subtotal = sumBillValues(billEntries, ["subtotal", "sub_total", "items_total", "total_items", "itemsCost", "products_price", "items_price"]);
  if (subtotal !== null) {
    summary.subtotal = subtotal;
    summary.sub_total = subtotal;
  }

  const total = sumBillValues(billEntries, ["total", "final_total", "grand_total", "payable", "amount", "pay_amount", "payment_amount", "to_pay"]);
  if (total !== null) {
    summary.total = total;
    summary.final_total = total;
  }

  const shipping = sumBillValues(billEntries, ["shipping", "shipping_cost", "delivery_cost", "delivery", "shipping_price"]);
  if (shipping !== null) {
    summary.shipping = shipping;
  }

  summary.can_pay = billEntries.length ? billEntries.every(([, bill]) => bill.can_pay !== false) : false;
  summary.can_cod = billEntries.some(([, bill]) => bill.can_cod === true);
  return summary;
}

function sumBillValues(billEntries = [], keys = []) {
  let total = 0;
  let found = false;
  for (const [, bill] of billEntries) {
    for (const key of keys) {
      const value = Number(bill?.[key]);
      if (Number.isFinite(value)) {
        total += value;
        found = true;
        break;
      }
    }
  }
  return found ? total : null;
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
    source.variantId,
    source.variant?.id,
    source.variant?.variant_id,
    source.variant?.variantId,
    source.variant?.product_variant_id,
    source.variant?.productVariantId,
    source.product_variant_id,
    source.productVariantId,
  ];
  const rawVariantId = rawVariantCandidates.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
  const variantId = Number.parseInt(rawVariantId, 10);
  const currency = String(source.currency || "").trim();
  return {
    count: Number.isFinite(count) && count > 0 ? count : 1,
    ...(currency ? { currency } : {}),
    variant_id: Number.isFinite(variantId) && variantId > 0 ? variantId : null,
    ...(source.preferences !== undefined ? { preferences: source.preferences } : {}),
    ...(source.vendor_product_id !== undefined ? { vendor_product_id: source.vendor_product_id } : {}),
    ...(source.price_id !== undefined ? { price_id: source.price_id } : {}),
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

function readStorefrontApiMessage(payload, visited = new WeakSet()) {
  if (payload == null) return "";
  if (typeof payload === "string") return payload.trim();
  if (typeof payload !== "object") return "";
  if (visited.has(payload)) return "";
  visited.add(payload);

  const candidateValues = [
    payload?.error_msg,
    payload?.error_description,
    payload?.message,
    payload?.error,
    payload?.error_message,
    payload?.reason,
    payload?.statusMessage,
    payload?.title,
  ];

  for (const candidate of candidateValues) {
    if (Array.isArray(candidate)) {
      const text = candidate
        .map((entry) => {
          if (typeof entry === "string") return entry.trim();
          if (entry && typeof entry === "object") return readStorefrontApiMessage(entry, visited);
          return String(entry || "").trim();
        })
        .filter(Boolean)
        .join(", ");
      if (text) return text;
      continue;
    }

    if (candidate == null) continue;
    if (typeof candidate === "boolean") {
      if (candidate) return "Request failed";
      continue;
    }
    if (typeof candidate === "object") {
      const nested = readStorefrontApiMessage(candidate, visited);
      if (nested) return nested;
      continue;
    }
    const text = String(candidate).trim();
    if (text) return text;
  }

  const nestedCandidates = [
    payload?.payload,
    payload?.data,
    payload?.result,
    payload?.response,
    payload?.basket,
    payload?.cart,
    payload?.bill,
    payload?.summary,
    payload?.items,
    payload?.lines,
    payload?.details,
  ];
  for (const nested of nestedCandidates) {
    if (!nested) continue;
    if (Array.isArray(nested)) {
      const text = nested
        .map((entry) => {
          if (typeof entry === "string") return entry.trim();
          if (entry && typeof entry === "object") return readStorefrontApiMessage(entry, visited);
          return String(entry || "").trim();
        })
        .filter(Boolean)
        .join(", ");
      if (text) return text;
      continue;
    }
    const nestedText = readStorefrontApiMessage(nested, visited);
    if (nestedText) return nestedText;
  }

  if (Array.isArray(payload?.errors)) {
    const lines = payload.errors
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") return readStorefrontApiMessage(item, visited);
        return String(item || "").trim();
      })
      .filter(Boolean);
    if (lines.length) return lines.join(", ");
  }

  return "";
}

function detectStorefrontApiError(payload, status = 0, visited = new WeakSet()) {
  if (!payload || typeof payload !== "object") return null;
  if (visited.has(payload)) return null;
  visited.add(payload);

  const rawStatus = Number.isFinite(Number(status)) && Number(status) > 0 ? Number(status) : 502;
  const responseStatus = rawStatus >= 400 ? rawStatus : 409;

  if (payload.ok === false || payload.success === false || payload.valid === false || payload.error === true) {
    return {
      status: responseStatus,
      error: readStorefrontApiMessage(payload) || `Selldone storefront request failed (${responseStatus}).`,
    };
  }

  const directFlags = [
    payload?.error_msg,
    payload?.error_message,
    payload?.error_description,
    payload?.reason,
    payload?.message,
    payload?.details,
  ];

  for (const flag of directFlags) {
    if (flag === null || flag === undefined || flag === false) continue;
    if (typeof flag === "boolean") {
      if (flag) {
        return {
          status: responseStatus,
          error: readStorefrontApiMessage(payload) || `Selldone storefront request failed (${responseStatus}).`,
        };
      }
      continue;
    }
    if (typeof flag === "string") {
      const text = flag.trim();
      if (text && isLikelyStorefrontErrorMessage(text)) {
        return {
          status: responseStatus,
          error: text,
        };
      }
      continue;
    }
    if (Array.isArray(flag)) {
      if (!flag.length) continue;
      const messages = [];
      for (const entry of flag) {
        if (typeof entry === "string") {
          const text = entry.trim();
          if (text && isLikelyStorefrontErrorMessage(text)) messages.push(text);
        } else if (entry && typeof entry === "object") {
          const nested = detectStorefrontApiError(entry, status, visited);
          if (nested) return nested;
        }
      }
      if (messages.length) {
        return {
          status: responseStatus,
          error: messages.join(", "),
        };
      }
      continue;
    }
    if (flag && typeof flag === "object") {
      const nested = detectStorefrontApiError(flag, status, visited);
      if (nested) return nested;
    }
  }

  if (Array.isArray(payload.errors) && payload.errors.length) {
    const details = payload.errors
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") return readStorefrontApiMessage(entry, visited);
        return String(entry || "");
      })
      .filter(Boolean)
      .join(", ");
    return {
      status: responseStatus,
      error: details || `Selldone storefront request failed (${responseStatus}).`,
    };
  }

  const nestedPayloads = [
    payload?.payload,
    payload?.data,
    payload?.result,
    payload?.response,
    payload?.basket,
    payload?.cart,
    payload?.bill,
    payload?.summary,
    payload?.items,
    payload?.lines,
    payload?.details,
  ];
  for (const nestedPayload of nestedPayloads) {
    if (!nestedPayload) continue;
    if (Array.isArray(nestedPayload)) {
      for (const entry of nestedPayload) {
        const nested = detectStorefrontApiError(entry, status, visited);
        if (nested) return nested;
      }
      continue;
    }

    const nested = detectStorefrontApiError(nestedPayload, status, visited);
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
