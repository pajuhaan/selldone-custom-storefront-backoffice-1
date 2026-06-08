import { STOREFRONT_SHOP_HANDLE, STOREFRONT_XAPI_BASE } from "./config.mjs";
import { sendJson } from "./http.mjs";

export async function handleStorefrontApi(req, res, url) {
  if (url.pathname === "/api/storefront/products" && req.method === "GET") {
    const result = await fetchStorefrontProducts(url);
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
  endpoint.searchParams.set("available", url.searchParams.get("available") || "false");
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

async function requestStorefrontXapi(endpoint, label) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        source: "storefront_xapi",
        status: response.status,
        endpoint: publicStorefrontEndpoint(endpoint),
        error: readStorefrontApiMessage(payload) || `Selldone storefront ${label} request failed.`,
        payload,
      };
    }

    return {
      ok: true,
      source: "storefront_xapi",
      apiBaseUrl: STOREFRONT_XAPI_BASE,
      endpoint: publicStorefrontEndpoint(endpoint),
      products: Array.isArray(payload.products) ? payload.products : [],
      folders: Array.isArray(payload.folders) ? payload.folders : [],
      total: payload.total || 0,
      product: payload.product || null,
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

function publicStorefrontEndpoint(endpoint) {
  return {
    method: "GET",
    url: endpoint.toString(),
  };
}

function storefrontProductIdFromApiPath(pathname) {
  const match = pathname.match(/^\/api\/storefront\/products\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function readStorefrontApiMessage(payload) {
  const message = payload?.error_msg || payload?.error_description || payload?.message || payload?.error;
  if (Array.isArray(message)) return message.join(", ");
  if (message && typeof message === "object") return JSON.stringify(message);
  return String(message || "");
}
