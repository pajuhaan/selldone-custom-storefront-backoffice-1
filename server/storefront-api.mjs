import { SHOP_ID, STOREFRONT_SHOP_HANDLE, STOREFRONT_XAPI_BASE } from "./config.mjs";
import { readJsonBody, sendJson } from "./http.mjs";
import { ensureAccessToken } from "./auth.mjs";

const STOREFRONT_PHYSICAL_BASKET_TYPE = "physical";
const STOREFRONT_NEWSLETTER_STREAM_ACCESS_KEY =
  process.env.STOREFRONT_NEWSLETTER_STREAM_ACCESS_KEY || "STREAM-KEY-14952-web-BIRFnzrzoJEDqVaBK71REBGg";

function firstArray(...values) {
  return values.find((value) => Array.isArray(value)) || [];
}

function firstNonNull(...values) {
  return values.find((value) => value !== null && value !== undefined);
}

function normalizeStorefrontApiPath(pathname) {
  const path = String(pathname || "").trim();
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "");
}

export async function handleStorefrontApi(req, res, url, storefrontSession = null) {
  const pathname = normalizeStorefrontApiPath(url.pathname);

  if (pathname === "/api/storefront/products" && req.method === "GET") {
    const result = await fetchStorefrontProducts(url);
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  if ((pathname === "/api/storefront/blogs" || pathname === "/api/storefront/blog") && req.method === "GET") {
    const result = await fetchStorefrontBlogs(url);
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  if (pathname === "/api/storefront/newsletter") {
    if (req.method !== "POST") {
      sendJson(res, 405, {
        ok: false,
        source: "storefront_newsletter",
        error: "Newsletter signup requires a POST request.",
        method: req.method,
      });
      return true;
    }

    const payload = await readJsonBody(req).catch(() => ({}));
    const result = await subscribeStorefrontNewsletter(payload);
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  const blogId = storefrontBlogIdFromApiPath(pathname);
  if (blogId && req.method === "GET") {
    const result = await fetchStorefrontBlog(blogId, url);
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  const productReviewsProductId = storefrontProductReviewsFromApiPath(pathname);
  if (productReviewsProductId) {
    if (req.method === "GET") {
      const result = await fetchStorefrontProductReviews(productReviewsProductId, storefrontSession);
      sendJson(res, result.ok ? 200 : result.status || 502, result);
      return true;
    }

    if (req.method === "POST") {
      const payload = await readJsonBody(req).catch(() => ({}));
      const result = await submitStorefrontProductReview(productReviewsProductId, storefrontSession, payload);
      sendJson(res, result.ok ? 200 : result.status || 502, result);
      return true;
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const payload = await readJsonBody(req).catch(() => ({}));
      const result = await updateStorefrontProductComment(productReviewsProductId, storefrontSession, payload);
      sendJson(res, result.ok ? 200 : result.status || 502, result);
      return true;
    }

    if (req.method === "DELETE") {
      const payload = await readJsonBody(req).catch(() => ({}));
      const result = await deleteStorefrontProductComment(productReviewsProductId, storefrontSession, payload);
      sendJson(res, result.ok ? 200 : result.status || 502, result);
      return true;
    }

    sendJson(res, 405, {
      ok: false,
      source: "storefront_product_reviews",
      error: "Product reviews endpoint accepts only GET, POST, PATCH, PUT, and DELETE requests.",
      method: req.method,
    });
    return true;
  }

  if (pathname === "/api/storefront/basket" && req.method === "GET") {
    const result = await fetchStorefrontBasket(storefrontSession, url);
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  const basketProductId = storefrontBasketProductIdFromApiPath(pathname);
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

  if (pathname === "/api/storefront/orders" && req.method === "POST") {
    const payload = await readJsonBody(req).catch(() => ({}));
    const result = await checkoutStorefrontPhysicalBasket(storefrontSession, payload, req);
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  if (pathname === "/api/storefront/quick-buy" && req.method === "POST") {
    const payload = await readJsonBody(req).catch(() => ({}));
    const result = await checkoutStorefrontQuickBuy(storefrontSession, payload, req);
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  if (pathname === "/api/storefront/orders/history" && req.method === "GET") {
    const result = await fetchStorefrontOrderHistory(storefrontSession, url);
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  if (pathname.startsWith("/api/storefront/orders/") && req.method === "GET") {
    const basketId = decodeURIComponent(pathname.slice("/api/storefront/orders/".length)).trim();
    const result = await fetchStorefrontOrderDetail(storefrontSession, basketId);
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  if (pathname === "/api/storefront/shop/info" && req.method === "GET") {
    const result = await fetchStorefrontShopInfo();
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  const profileType = storefrontProfileTypeFromApiPath(pathname);
  if (profileType && req.method === "GET") {
    const result = await fetchStorefrontProfile(profileType);
    sendJson(res, result.ok ? 200 : result.status || 502, result);
    return true;
  }

  const productId = storefrontProductIdFromApiPath(pathname);
  if (productId && req.method === "GET") {
    const result = await fetchStorefrontProduct(productId, storefrontSession);
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

async function checkoutStorefrontPhysicalBasket(session, payload = {}, req = null) {
  const token = await ensureStorefrontToken(session);
  if (!token) {
    return { ok: false, source: "storefront_checkout", status: 401, error: "Authentication required" };
  }

  const shopInfo = await fetchStorefrontShopInfoWithBaskets(token);
  if (!shopInfo.ok) {
    return {
      ok: false,
      source: "storefront_checkout",
      status: shopInfo.status || 502,
      error: shopInfo.error || "Unable to load Selldone checkout basket.",
      endpoint: shopInfo.endpoint,
      details: shopInfo.payload,
    };
  }

  const basket = extractPhysicalBasketFromShopInfo(shopInfo.payload);
  const items = firstArray(basket?.items, basket?.basket_items, basket?.lines);
  if (!basket?.id || !items.length) {
    return {
      ok: false,
      source: "storefront_checkout",
      status: 409,
      error: "Your physical Selldone basket is empty.",
      details: { basket },
    };
  }

  const checkout = normalizeStorefrontCheckoutPayload(payload);
  if (!checkout.receiver_info.name || !checkout.receiver_info.phone || !checkout.receiver_info.address) {
    return {
      ok: false,
      source: "storefront_checkout",
      status: 400,
      error: "Receiver name, phone, and address are required.",
    };
  }

  const configEndpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/baskets/${encodeURIComponent(String(basket.id))}/config`);
  const configResult = await requestStorefrontAuthorizedEndpoint(token, configEndpoint, {
    method: "PUT",
    label: "checkout-config",
    body: {
      receiver_info: checkout.receiver_info,
      delivery_info: checkout.delivery_info,
      billing: checkout.billing,
      form: checkout.form,
      guest_email: checkout.guest_email,
    },
  });
  if (!configResult.ok) {
    return {
      ok: false,
      source: "storefront_checkout",
      status: configResult.status || 502,
      error: configResult.error || "Unable to save Selldone checkout details.",
      endpoint: configResult.endpoint,
      details: configResult.payload,
    };
  }

  const configBill = extractStorefrontBillPayload(configResult.payload);
  const billResult = await fetchStorefrontBasketBill(token, STOREFRONT_PHYSICAL_BASKET_TYPE);
  if (!billResult.ok && !configBill) {
    return {
      ok: false,
      source: "storefront_checkout",
      status: billResult.status || 502,
      error: billResult.error || "Unable to calculate Selldone checkout bill.",
      endpoint: billResult.endpoint,
      details: billResult.payload,
    };
  }

  const bill = extractStorefrontBillPayload(billResult.payload) || configBill || {};
  if (bill?.can_pay === false) {
    return {
      ok: false,
      source: "storefront_checkout",
      status: 409,
      error: readStorefrontApiMessage(bill) || "Selldone says this basket cannot be paid yet.",
      bill,
      basket,
    };
  }

  const gatewayCode = resolveStorefrontCheckoutGateway(checkout.gateway_code, bill, shopInfo.payload);
  if (!gatewayCode) {
    return {
      ok: false,
      source: "storefront_checkout",
      status: 409,
      error: "No available Selldone payment gateway was found for this physical basket.",
      bill,
      basket,
    };
  }
  const gateway = findStorefrontGatewayByCode(gatewayCode, shopInfo.payload);

  const buyEndpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/basket/${encodeURIComponent(STOREFRONT_PHYSICAL_BASKET_TYPE)}/buy/${encodeURIComponent(gatewayCode)}`);
  const buyResult = await requestStorefrontAuthorizedEndpoint(token, buyEndpoint, {
    method: "POST",
    label: "checkout-buy",
    body: {
      code: basket.code || checkout.code || null,
      amount_check: checkout.amount_check ?? checkoutAmountCheck(bill, payload),
      delivery_price: checkoutDeliveryPrice(bill),
      currency: checkout.currency || firstNonNull(bill.currency, basket.currency, payload?.totals?.currency, null),
      return: checkout.return_url || storefrontReturnUrl(req),
      gift_cards: checkout.gift_cards,
      selected_variant_id: checkout.selected_variant_id,
      ...(checkout.params && typeof checkout.params === "object" ? checkout.params : {}),
    },
  });

  if (!buyResult.ok) {
    return {
      ok: false,
      source: "storefront_checkout",
      status: buyResult.status || 502,
      error: buyResult.error || "Selldone checkout payment request failed.",
      endpoint: buyResult.endpoint,
      details: buyResult.payload,
      bill,
      basket,
    };
  }

  return normalizeStorefrontCheckoutResult({
    gatewayCode,
    gateway,
    basket,
    bill,
    config: configResult.payload,
    payment: buyResult.payload,
    endpoint: buyResult.endpoint,
  });
}

async function checkoutStorefrontQuickBuy(session, payload = {}, req = null) {
  const source = payload && typeof payload === "object" ? payload : {};
  const product = source.product && typeof source.product === "object" ? source.product : {};
  const productId = String(firstNonNull(source.product_id, source.productId, product.id, source.item_id, source.itemId, "") || "").trim();
  if (!productId) {
    return {
      ok: false,
      source: "storefront_quick_buy",
      status: 400,
      error: "Product ID is required for quick buy.",
    };
  }

  const count = Number.parseInt(firstNonNull(source.count, product.count, 1), 10);
  const basketPayload = normalizeStorefrontBasketPayload({
    count: Number.isFinite(count) && count > 0 ? count : 1,
    currency: firstNonNull(source.currency, product.currency, source.totals?.currency, ""),
    variant_id: firstNonNull(source.variant_id, source.variantId, source.selected_variant_id, source.selectedVariantId, product.variant_id, product.variantId, null),
    product_variant_id: firstNonNull(source.product_variant_id, source.productVariantId, product.product_variant_id, product.productVariantId, null),
    preferences: source.preferences,
    vendor_product_id: source.vendor_product_id,
    price_id: source.price_id,
  });

  const basketUpdate = await addToStorefrontBasket(session, productId, basketPayload);
  if (!basketUpdate.ok) {
    return {
      ok: false,
      source: "storefront_quick_buy",
      status: basketUpdate.status || 502,
      error: basketUpdate.error || "Unable to prepare Selldone quick buy basket.",
      endpoint: basketUpdate.endpoint,
      details: basketUpdate.payload,
      quickBuy: {
        productId,
        count: basketPayload.count,
        variant_id: basketPayload.variant_id,
      },
    };
  }

  const checkoutPayload = {
    ...source,
    selected_variant_id: basketPayload.variant_id,
    params: {
      ...(source.params && typeof source.params === "object" ? source.params : {}),
      quick_buy: true,
      quick_buy_product_id: productId,
      quick_buy_count: basketPayload.count,
      ...(basketPayload.variant_id ? { quick_buy_variant_id: basketPayload.variant_id } : {}),
    },
  };
  const checkoutResult = await checkoutStorefrontPhysicalBasket(session, checkoutPayload, req);
  if (!checkoutResult.ok) {
    return {
      ...checkoutResult,
      source: "storefront_quick_buy",
      basketUpdate: basketUpdate.payload,
      quickBuy: {
        productId,
        count: basketPayload.count,
        variant_id: basketPayload.variant_id,
      },
    };
  }

  return {
    ...checkoutResult,
    source: "storefront_quick_buy",
    basketUpdate: basketUpdate.payload,
    quickBuy: {
      productId,
      count: basketPayload.count,
      variant_id: basketPayload.variant_id,
    },
  };
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

async function requestStorefrontAuthorizedEndpoint(token, endpoint, { method = "GET", body = null, label = "request" } = {}) {
  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Requested-With": "XMLHttpRequest",
        ...(body !== null ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== null ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await readStorefrontResponsePayload(response);
    const storefrontError = detectStorefrontApiError(payload, response.status);
    if (!response.ok || storefrontError) {
      return {
        ok: false,
        status: storefrontError?.status || response.status,
        error: storefrontError?.error || readStorefrontApiMessage(payload) || `${response.statusText || `Selldone storefront ${label} failed.`} (${response.status}).`,
        payload,
        endpoint: publicStorefrontEndpoint(endpoint, method),
      };
    }
    return {
      ok: true,
      status: response.status,
      payload,
      endpoint: publicStorefrontEndpoint(endpoint, method),
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error.message || `Selldone storefront ${label} failed.`,
      endpoint: publicStorefrontEndpoint(endpoint, method),
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

function normalizeStorefrontCheckoutPayload(payload = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const customer = source.customer && typeof source.customer === "object" ? source.customer : {};
  const receiver = source.receiver_info && typeof source.receiver_info === "object" ? source.receiver_info : {};
  const delivery = source.delivery_info && typeof source.delivery_info === "object" ? source.delivery_info : {};
  const shipping = source.shipping && typeof source.shipping === "object" ? source.shipping : {};
  const billingSource = source.billing && typeof source.billing === "object" ? source.billing : {};
  const name = String(firstNonNull(receiver.name, receiver.fullName, customer.fullName, customer.name, "")).trim();
  const email = String(firstNonNull(receiver.email, customer.email, source.guest_email, "")).trim();
  const phone = String(firstNonNull(receiver.phone, customer.phone, "")).trim();
  const address = String(firstNonNull(receiver.address, customer.address, "")).trim();
  const city = String(firstNonNull(receiver.city, customer.city, "")).trim();
  const state = String(firstNonNull(receiver.state, customer.state, "")).trim();
  const country = String(firstNonNull(receiver.country, customer.country, "US")).trim();
  const postal = String(firstNonNull(receiver.postal, receiver.postal_code, customer.postal, customer.postalCode, "")).trim();
  const note = String(firstNonNull(receiver.message, customer.note, source.note, "")).trim();

  const receiverInfo = {
    ...receiver,
    name,
    phone,
    email,
    address,
    city,
    state,
    country,
    postal,
    postal_code: postal,
    message: note,
  };

  const deliveryInfo = {
    ...delivery,
    delivery_type: firstNonNull(delivery.delivery_type, delivery.type, shipping.type, shipping.code, shipping.key, "standard"),
    transportation_id: firstNonNull(delivery.transportation_id, shipping.id, shipping.transportation_id, null),
    name: firstNonNull(delivery.name, shipping.name, shipping.title, null),
  };

  const billing = Object.keys(billingSource).length
    ? billingSource
    : {
        name,
        phone,
        email,
        address,
        city,
        state,
        country,
        postal,
        postal_code: postal,
        custom: false,
        business: false,
      };

  return {
    receiver_info: receiverInfo,
    delivery_info: deliveryInfo,
    billing,
    form: source.form && typeof source.form === "object" ? source.form : note ? { note } : {},
    guest_email: email || null,
    gateway_code: String(firstNonNull(source.gateway_code, source.gatewayCode, source.payment?.gateway_code, source.payment?.gatewayCode, source.payment_method, source.paymentMethod, "")).trim(),
    currency: String(firstNonNull(source.currency, source.totals?.currency, "")).trim(),
    return_url: String(firstNonNull(source.return_url, source.returnUrl, source.return, "")).trim(),
    amount_check: Number.isFinite(Number(source.amount_check)) ? Number(source.amount_check) : null,
    gift_cards: Array.isArray(source.gift_cards) ? source.gift_cards : [],
    selected_variant_id: Number.isFinite(Number(source.selected_variant_id)) ? Number(source.selected_variant_id) : null,
    params: source.params && typeof source.params === "object" ? source.params : null,
    code: String(firstNonNull(source.code, "")).trim() || null,
  };
}

function resolveStorefrontCheckoutGateway(requestedGateway, bill = {}, shopPayload = {}) {
  const requested = String(requestedGateway || "").trim();
  if (requested && requested !== "auto") return requested;
  const currency = String(firstNonNull(bill.currency, bill.currency_code, "")).trim();
  const gateways = extractStorefrontGateways(shopPayload);
  const eligible = gateways.filter((gateway) => {
    if (!gateway || typeof gateway !== "object") return false;
    if (gateway.enable === false || gateway.enabled === false || gateway.active === false) return false;
    const gatewayCurrency = String(firstNonNull(gateway.currency, gateway.currency_code, "")).trim();
    if (currency && gatewayCurrency && gatewayCurrency !== currency) return false;
    return !gateway.cod;
  });
  const stripeGateway = eligible.find((gateway) => isStripeGateway(gatewayCodeFromPayload(gateway), gateway));
  return firstNonNull(gatewayCodeFromPayload(stripeGateway), ...eligible.map(gatewayCodeFromPayload), bill?.can_cod === true ? "cod" : null);
}

function gatewayCodeFromPayload(gateway = {}) {
  const code = firstNonNull(gateway.code, gateway.gateway_code, gateway.gatewayCode, gateway.name, gateway.type, gateway.id, null);
  return code === null || code === undefined ? null : String(code).trim();
}

function extractStorefrontGateways(payload = {}) {
  return firstArray(
    payload?.gateways,
    payload?.shop?.gateways,
    payload?.data?.shop?.gateways,
    payload?.result?.shop?.gateways,
    payload?.payload?.shop?.gateways,
  );
}

function findStorefrontGatewayByCode(code, payload = {}) {
  const target = String(code || "").trim().toLowerCase();
  return extractStorefrontGateways(payload).find((gateway) => String(gatewayCodeFromPayload(gateway) || "").trim().toLowerCase() === target) || null;
}

function isStripeGateway(code, gateway = {}) {
  const text = [
    code,
    gateway?.code,
    gateway?.name,
    gateway?.title,
    gateway?.gateway_code,
    gateway?.gatewayCode,
    gateway?.type,
  ].map((value) => String(value || "").toLowerCase()).join(" ");
  return text.includes("stripe");
}

function gatewayPublicKey(gateway = {}) {
  return String(firstNonNull(
    gateway?.public?.key,
    gateway?.public?.publishable_key,
    gateway?.public?.publishableKey,
    gateway?.public_key,
    gateway?.publishable_key,
    gateway?.publishableKey,
    gateway?.stripe_public_key,
    gateway?.stripePublishableKey,
    "",
  ) || "").trim();
}

function checkoutAmountCheck(bill = {}, payload = {}) {
  const amount = firstNonNull(
    bill.sum,
    bill.total,
    bill.final_total,
    bill.payable,
    bill.amount,
    bill.pay_amount,
    bill.payment_amount,
    bill.to_pay,
    payload?.totals?.total,
    0,
  );
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

function checkoutDeliveryPrice(bill = {}) {
  const price = firstNonNull(bill.delivery_price, bill.shipping, bill.shipping_cost, bill.delivery_cost, bill.transportation_price, 0);
  const parsed = Number(price);
  return Number.isFinite(parsed) ? parsed : 0;
}

function storefrontReturnUrl(req = null) {
  const host = req?.headers?.host || "localhost:5173";
  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  return `${proto}://${host}/#checkout`;
}

function normalizeStorefrontCheckoutResult({ gatewayCode, gateway, basket, bill, config, payment, endpoint }) {
  const payload = payment && typeof payment === "object" ? payment : {};
  const targetId = firstNonNull(payload.target_id, payload.targetId, payload.order_id, payload.orderId, payload.basket_id, payload.basketId, payload.id, null);
  const completed = Boolean(payload.payed_by_gift_card || payload.free_order || payload.cod || payload.dir || targetId);
  const link = firstNonNull(payload.link, payload.url, payload.redirect, payload.redirect_url, payload.order_url, null);
  const method = String(firstNonNull(payload.method, link ? "GET" : "", "")).trim().toUpperCase();
  const stripe = isStripeGateway(gatewayCode, gateway);
  const publicKey = gatewayPublicKey(gateway);
  return {
    ok: true,
    source: "storefront_checkout",
    status: 200,
    gatewayCode,
    gateway: gateway ? {
      code: gatewayCode,
      title: firstNonNull(gateway.title, gateway.name, gatewayCode),
      stripe,
      publicKey,
      public: gateway.public || null,
    } : { code: gatewayCode, title: gatewayCode, stripe, publicKey },
    stripe: stripe ? {
      publishableKey: publicKey,
    } : null,
    completed,
    orderId: targetId,
    basket,
    bill,
    config,
    payment: payload,
    endpoint,
    redirect: link
      ? {
          url: link,
          method: method || "GET",
          fields: payload.fields || payload.params || payload.pack || {},
        }
      : null,
    pending: payload.que || payload.interval_check ? {
      que: payload.que || null,
      interval_check: payload.interval_check || null,
      transaction_id: firstNonNull(payload.transaction_id, payload.transactionId, payload.que?.id, null),
    } : null,
  };
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
  const deliveryInfo = source.delivery_info && typeof source.delivery_info === "object" ? source.delivery_info : null;
  const shipping = source.shipping && typeof source.shipping === "object" ? source.shipping : null;
  const shippingKey = String(firstNonNull(source.shipping_key, source.shippingKey, deliveryInfo?.shipping_key, deliveryInfo?.key, shipping?.shipping_key, shipping?.key, "") || "").trim();
  return {
    count: Number.isFinite(count) && count > 0 ? count : 1,
    ...(currency ? { currency } : {}),
    variant_id: Number.isFinite(variantId) && variantId > 0 ? variantId : null,
    ...(source.preferences !== undefined || deliveryInfo || shippingKey
      ? {
          preferences: {
            ...(source.preferences && typeof source.preferences === "object" ? source.preferences : {}),
            ...(deliveryInfo ? { storefront_delivery: deliveryInfo } : {}),
            ...(shippingKey ? { storefront_shipping_key: shippingKey } : {}),
          },
        }
      : {}),
    ...(deliveryInfo ? { delivery_info: deliveryInfo } : {}),
    ...(shipping ? { shipping } : {}),
    ...(shippingKey ? { shipping_key: shippingKey } : {}),
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

async function fetchStorefrontProduct(productId, storefrontSession = null) {
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/products/${encodeURIComponent(productId)}/info`);
  const token = await ensureStorefrontToken(storefrontSession).catch(() => null);
  if (token) {
    const authorizedResult = await requestStorefrontAuthorizedEndpoint(token, endpoint, { method: "GET", label: "product" });
    if (authorizedResult.ok) {
      return normalizeStorefrontProductInfoResult(authorizedResult.payload, endpoint, authorizedResult.status, true);
    }
    if (![401, 403].includes(authorizedResult.status || 0)) {
      return {
        ok: false,
        source: "storefront_xapi",
        status: authorizedResult.status || 502,
        endpoint: authorizedResult.endpoint || publicStorefrontEndpoint(endpoint),
        error: authorizedResult.error || "Selldone product detail request failed.",
        payload: authorizedResult.payload,
      };
    }
  }
  return requestStorefrontXapi(endpoint, "product");
}

function normalizeStorefrontProductInfoResult(payload = {}, endpoint, status = 200, authenticated = false) {
  return {
    ok: true,
    source: "storefront_xapi",
    apiBaseUrl: STOREFRONT_XAPI_BASE,
    endpoint: publicStorefrontEndpoint(endpoint),
    authenticated,
    products: [],
    folders: [],
    total: firstNonNull(payload?.total, payload?.data?.total, payload?.result?.total, payload?.payload?.total, 0),
    product: firstNonNull(payload?.product, payload?.data?.product, payload?.result?.product, payload?.payload?.product, null),
    articles: [],
    blogs: [],
    last_articles: [],
    popular: [],
    categories: [],
    interest: [],
    transportations: [],
    data: payload,
    payload,
    status,
  };
}

async function fetchStorefrontProductReviews(productId, storefrontSession = null) {
  const safeId = String(productId || "").trim();
  if (!safeId) {
    return {
      ok: false,
      source: "storefront_product_reviews",
      status: 400,
      error: "Product ID is required to load Selldone reviews.",
    };
  }

  const token = await ensureStorefrontToken(storefrontSession).catch(() => null);

  const productResult = await fetchStorefrontProduct(safeId, storefrontSession).catch(() => null);
  const cachedProduct = productResult?.ok
    ? firstNonNull(
        productResult.product,
        productResult.payload?.product,
        productResult.data?.product,
        productResult.result?.product,
        productResult.payload?.data?.product,
        productResult.payload?.result?.product,
        productResult.payload?.payload?.product,
        null,
      )
    : null;

  const articleCommentsPayload = buildStorefrontArticleCommentsPayloadFromProduct(cachedProduct, productResult?.payload, safeId);
  if (articleCommentsPayload) {
    return articleCommentsPayload;
  }

  const articleId = extractStorefrontProductArticleId(cachedProduct, productResult?.payload);
  const customerShopCommentsPayload = token ? await fetchStorefrontCustomerShopComments(token, safeId, articleId) : null;
  if (customerShopCommentsPayload) {
    return customerShopCommentsPayload;
  }

  if (articleId) {
    const fetchedArticleCommentsPayload = await fetchStorefrontProductArticleComments(articleId, safeId, token);
    if (fetchedArticleCommentsPayload) {
      return fetchedArticleCommentsPayload;
    }
  }

  const candidatePaths = ["reviews", "comments"];
  let lastFailure = null;

  for (const key of candidatePaths) {
    const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/products/${encodeURIComponent(safeId)}/${key}`);

    const tokenResult = token ? await requestStorefrontAuthorizedEndpoint(token, endpoint, { method: "GET", label: "product-reviews" }) : null;
    if (tokenResult?.ok) {
      return normalizeStorefrontReviewsResult(tokenResult.payload, endpoint, tokenResult.status, "product_reviews");
    }
    if (tokenResult && ![401, 403, 404, 405].includes(tokenResult.status || 0)) {
      return {
        ok: false,
        source: "storefront_product_reviews",
        status: tokenResult.status || 502,
        endpoint: tokenResult.endpoint || publicStorefrontEndpoint(endpoint),
        error: tokenResult.error || "Selldone product review request failed.",
        payload: tokenResult.payload,
      };
    }
    if (tokenResult && tokenResult.status) {
      lastFailure = {
        status: tokenResult.status,
        endpoint: tokenResult.endpoint,
        error: tokenResult.error,
        payload: tokenResult.payload,
      };
    }

    const publicResult = await requestStorefrontXapi(endpoint, "product_reviews");
    if (publicResult.ok) {
      return normalizeStorefrontReviewsResult(publicResult.payload, endpoint, publicResult.status, "product_reviews");
    }
    if ([401, 403, 404, 405].includes(publicResult.status || 0)) {
      lastFailure = {
        status: publicResult.status,
        endpoint: publicResult.endpoint,
        error: publicResult.error,
      };
      continue;
    }
    if (![404, 405].includes(publicResult.status || 0)) {
      return {
        ok: false,
        source: "storefront_product_reviews",
        status: publicResult.status || 502,
        endpoint: publicResult.endpoint,
        error: publicResult.error || "Selldone product review request failed.",
      };
      }
  }

  const fallbackPayload = buildStorefrontReviewFallbackPayloadFromProduct(cachedProduct, safeId);
  if (fallbackPayload) {
    return fallbackPayload;
  }

  const status = Number.isFinite(lastFailure?.status) ? Number(lastFailure.status) : 404;
  return {
    ok: false,
    source: "storefront_product_reviews",
    status,
    endpoint: lastFailure?.endpoint || publicStorefrontEndpoint(
      new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/products/${encodeURIComponent(safeId)}/reviews`),
    ),
    error: lastFailure?.error || "Selldone product review endpoint is not available for this storefront.",
    payload: lastFailure?.payload,
  };
}

async function submitStorefrontProductReview(productId, storefrontSession, payload = {}) {
  const safeId = String(productId || "").trim();
  if (!safeId) {
    return {
      ok: false,
      source: "storefront_product_review_submit",
      status: 400,
      error: "Product ID is required to submit a Selldone review.",
    };
  }

  const token = await ensureStorefrontToken(storefrontSession);
  if (!token) {
    return {
      ok: false,
      source: "storefront_product_review_submit",
      status: 401,
      error: "Authentication required to post a Selldone review.",
    };
  }

  const userRatingPayload = firstNonNull(payload?.user_rating, payload?.userRating, null);
  const mode = String(firstNonNull(payload?.mode, payload?.review_mode, payload?.reviewMode, "") || "")
    .trim()
    .toLowerCase();
  const comment = String(firstNonNull(payload?.comment, payload?.text, payload?.body, "") || "").trim();
  const hasUserRatingPayload = Boolean(
    userRatingPayload &&
      typeof userRatingPayload === "object" &&
      !Array.isArray(userRatingPayload) &&
      Object.keys(userRatingPayload).length,
  );
  if ((mode === "comment" || !hasUserRatingPayload) && comment) {
    return submitStorefrontProductCommentOnly(safeId, storefrontSession, token, comment);
  }
  const rating = Number.parseFloat(
    firstNonNull(
      typeof userRatingPayload === "object" && userRatingPayload && !Array.isArray(userRatingPayload) ? Object.values(userRatingPayload)[0] : null,
      payload?.rating,
      payload?.rate,
      payload?.score,
      0,
    ),
  );
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    if (comment) {
      return submitStorefrontProductCommentOnly(safeId, storefrontSession, token, comment);
    }
    return {
      ok: false,
      source: "storefront_product_review_submit",
      status: 422,
      error: "A rating from 1 to 5 is required to post a product review.",
    };
  }

  const productResult = await fetchStorefrontProduct(safeId);
  if (!productResult.ok) {
    return {
      ok: false,
      source: "storefront_product_review_submit",
      status: productResult.status || 502,
      endpoint: productResult.endpoint,
      error: productResult.error || "Selldone product detail is required before submitting a product rating.",
      payload: productResult.payload,
    };
  }

  const product = firstNonNull(
    productResult.product,
    productResult.data?.product,
    productResult.data?.data?.product,
    productResult.data?.result?.product,
    productResult.data?.payload?.product,
    null,
  );
  const normalizedUserRating = normalizeStorefrontProductUserRating(userRatingPayload, rating, product);
  if (!Object.keys(normalizedUserRating).length) {
    return {
      ok: false,
      source: "storefront_product_review_submit",
      status: 409,
      endpoint: productResult.endpoint,
      error: "This Selldone product does not expose rating criteria for storefront rating submission.",
      payload: {
        product_id: safeId,
        ratings: firstArray(product?.ratings),
      },
    };
  }

  const body = { user_rating: normalizedUserRating };
  if (comment) body.comment = comment;
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/products/${encodeURIComponent(safeId)}/set-my-rating`);
  const result = await requestStorefrontAuthorizedEndpoint(token, endpoint, {
    method: "POST",
    label: "product-review-submit",
    body,
  });
  if (result.ok) {
    return {
      ok: true,
      source: "storefront_product_review_submit",
      status: result.status,
      endpoint: result.endpoint,
      titleFieldAccepted: false,
      payload: result.payload,
    };
  }

  return {
    ok: false,
    source: "storefront_product_review_submit",
    status: result.status || 502,
    endpoint: result.endpoint,
    error: result.error || "Selldone product rating submit request failed.",
    payload: result.payload,
  };
}

async function submitStorefrontProductCommentOnly(productId, storefrontSession, token, comment) {
  const safeId = String(productId || "").trim();
  const productResult = await fetchStorefrontProduct(safeId, storefrontSession);
  if (!productResult.ok) {
    return {
      ok: false,
      source: "storefront_product_comment_submit",
      status: productResult.status || 502,
      endpoint: productResult.endpoint,
      error: productResult.error || "Selldone product detail is required before submitting a product comment.",
      payload: productResult.payload,
    };
  }

  const product = firstNonNull(
    productResult.product,
    productResult.data?.product,
    productResult.data?.data?.product,
    productResult.data?.result?.product,
    productResult.data?.payload?.product,
    productResult.payload?.product,
    productResult.payload?.data?.product,
    null,
  );
  const articleId = extractStorefrontProductArticleId(product, productResult.payload);
  if (!articleId) {
    return {
      ok: false,
      source: "storefront_product_comment_submit",
      status: 409,
      endpoint: productResult.endpoint,
      error: "Selldone XAPI product detail did not return a product article id for comment submission.",
      payload: {
        product_id: safeId,
        article: firstNonNull(product?.article, product?.product_article, product?.article_pack?.article, product?.articlePack?.article, null),
      },
    };
  }

  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/article/${encodeURIComponent(articleId)}/comment`);
  const result = await requestStorefrontAuthorizedEndpoint(token, endpoint, {
    method: "POST",
    label: "product-article-comment-submit",
    body: { body: comment },
  });
  if (result.ok) {
    return {
      ok: true,
      source: "storefront_product_comment_submit",
      status: result.status,
      endpoint: result.endpoint,
      payload: result.payload,
    };
  }

  return {
    ok: false,
    source: "storefront_product_comment_submit",
    status: result.status || 502,
    endpoint: result.endpoint,
    error: result.error || "Selldone product article comment submit request failed.",
    payload: result.payload,
  };
}

async function updateStorefrontProductComment(productId, storefrontSession, payload = {}) {
  const safeId = String(productId || "").trim();
  const commentId = String(firstNonNull(payload?.comment_id, payload?.commentId, payload?.review_id, payload?.reviewId, "") || "").trim();
  const comment = String(firstNonNull(payload?.comment, payload?.text, payload?.body, "") || "").trim();
  if (!safeId || !commentId) {
    return {
      ok: false,
      source: "storefront_product_comment_update",
      status: 400,
      error: "Product ID and comment ID are required to update a Selldone product comment.",
    };
  }
  if (!comment) {
    return {
      ok: false,
      source: "storefront_product_comment_update",
      status: 422,
      error: "Comment body is required to update a Selldone product comment.",
    };
  }

  const token = await ensureStorefrontToken(storefrontSession);
  if (!token) {
    return {
      ok: false,
      source: "storefront_product_comment_update",
      status: 401,
      error: "Authentication required to update a Selldone product comment.",
    };
  }

  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/comment/${encodeURIComponent(commentId)}`);
  const result = await requestStorefrontAuthorizedEndpoint(token, endpoint, {
    method: "PUT",
    label: "product-article-comment-update",
    body: { body: comment },
  });
  if (result.ok) {
    return {
      ok: true,
      source: "storefront_product_comment_update",
      status: result.status,
      endpoint: result.endpoint,
      payload: result.payload,
    };
  }

  return {
    ok: false,
    source: "storefront_product_comment_update",
    status: result.status || 502,
    endpoint: result.endpoint,
    error: result.error || "Selldone product article comment update request failed.",
    payload: result.payload,
  };
}

async function deleteStorefrontProductComment(productId, storefrontSession, payload = {}) {
  const safeId = String(productId || "").trim();
  const commentId = String(firstNonNull(payload?.comment_id, payload?.commentId, payload?.review_id, payload?.reviewId, "") || "").trim();
  if (!safeId || !commentId) {
    return {
      ok: false,
      source: "storefront_product_comment_delete",
      status: 400,
      error: "Product ID and comment ID are required to delete a Selldone product comment.",
    };
  }

  const token = await ensureStorefrontToken(storefrontSession);
  if (!token) {
    return {
      ok: false,
      source: "storefront_product_comment_delete",
      status: 401,
      error: "Authentication required to delete a Selldone product comment.",
    };
  }

  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/comment/${encodeURIComponent(commentId)}`);
  const result = await requestStorefrontAuthorizedEndpoint(token, endpoint, {
    method: "DELETE",
    label: "product-article-comment-delete",
  });
  if (result.ok) {
    return {
      ok: true,
      source: "storefront_product_comment_delete",
      status: result.status,
      endpoint: result.endpoint,
      payload: result.payload,
    };
  }

  return {
    ok: false,
    source: "storefront_product_comment_delete",
    status: result.status || 502,
    endpoint: result.endpoint,
    error: result.error || "Selldone product article comment delete request failed.",
    payload: result.payload,
  };
}

function extractStorefrontProductArticleId(product = null, payload = null) {
  const article = firstNonNull(
    product?.article,
    product?.product_article,
    product?.productArticle,
    product?.article_data,
    product?.articleData,
    product?.article_pack?.article,
    product?.articlePack?.article,
    product?.blog,
    payload?.article,
    payload?.product?.article,
    payload?.data?.article,
    payload?.data?.product?.article,
    payload?.result?.article,
    payload?.result?.product?.article,
    payload?.payload?.article,
    payload?.payload?.product?.article,
    null,
  );
  return String(
    firstNonNull(
      product?.article_id,
      product?.articleId,
      product?.product_article_id,
      product?.productArticleId,
      typeof product?.blog === "object" ? null : product?.blog,
      typeof product?.article === "object" ? null : product?.article,
      typeof product?.product_article === "object" ? null : product?.product_article,
      article?.id,
      article?.article_id,
      article?.articleId,
      payload?.article_id,
      payload?.articleId,
      typeof payload?.blog === "object" ? null : payload?.blog,
      typeof payload?.article === "object" ? null : payload?.article,
      payload?.product?.article_id,
      payload?.product?.articleId,
      typeof payload?.product?.blog === "object" ? null : payload?.product?.blog,
      typeof payload?.product?.article === "object" ? null : payload?.product?.article,
      payload?.data?.article_id,
      payload?.data?.articleId,
      payload?.data?.product?.article_id,
      payload?.data?.product?.articleId,
      typeof payload?.data?.product?.blog === "object" ? null : payload?.data?.product?.blog,
      typeof payload?.data?.product?.article === "object" ? null : payload?.data?.product?.article,
      payload?.result?.article_id,
      payload?.result?.articleId,
      payload?.result?.product?.article_id,
      payload?.result?.product?.articleId,
      typeof payload?.result?.product?.blog === "object" ? null : payload?.result?.product?.blog,
      typeof payload?.result?.product?.article === "object" ? null : payload?.result?.product?.article,
      "",
    ) || "",
  ).trim();
}

function normalizeStorefrontProductUserRating(userRatingPayload, rating, product = null) {
  const requestedRatings =
    userRatingPayload && typeof userRatingPayload === "object" && !Array.isArray(userRatingPayload)
      ? Object.fromEntries(
          Object.entries(userRatingPayload)
            .map(([key, value]) => [String(key || "").trim(), Number.parseFloat(value)])
            .filter(([key, value]) => key && Number.isFinite(value) && value >= 1 && value <= 5),
        )
      : {};
  const criteria = firstArray(product?.ratings, product?.rating_items, product?.ratingItems, product?.rating_options, product?.ratingOptions);
  const criterionIds = criteria
    .map((entry) => String(firstNonNull(entry?.id, entry?.rating_id, entry?.ratingId, "") || "").trim())
    .filter(Boolean);
  const allowedIds = new Set(criterionIds);
  const matchedRatings = Object.fromEntries(Object.entries(requestedRatings).filter(([key]) => allowedIds.has(key)));
  if (Object.keys(matchedRatings).length) return matchedRatings;

  return Object.fromEntries(criterionIds.map((criterionId) => [criterionId, rating]));
}

function buildStorefrontArticleCommentsPayloadFromProduct(product = null, payload = null, productId = "") {
  const article = firstNonNull(
    product?.article,
    product?.product_article,
    product?.productArticle,
    product?.article_data,
    product?.articleData,
    product?.article_pack?.article,
    product?.articlePack?.article,
    product?.blog,
    payload?.article,
    payload?.product?.article,
    payload?.data?.article,
    payload?.data?.product?.article,
    payload?.result?.article,
    payload?.result?.product?.article,
    payload?.payload?.article,
    payload?.payload?.product?.article,
    null,
  );
  const comments = firstStorefrontCommentArray(
    article?.comments,
    article?.comments?.data,
    article?.comments?.items,
    article?.comments?.comments,
    article?.comments?.records,
    article?.comments?.list,
    article?.data?.comments,
    article?.data?.comments?.data,
    article?.data?.comments?.items,
    article?.result?.comments,
    article?.result?.comments?.data,
    article?.result?.comments?.items,
    article?.payload?.comments,
    article?.payload?.comments?.data,
    article?.payload?.comments?.items,
    article?.comment_list,
    article?.commentList,
    article?.article_comments,
    article?.articleComments,
    payload?.comments,
    payload?.comments?.data,
    payload?.comments?.items,
    payload?.data?.comments,
    payload?.data?.comments?.data,
    payload?.data?.comments?.items,
    payload?.result?.comments,
    payload?.result?.comments?.data,
    payload?.result?.comments?.items,
    payload?.payload?.comments,
    payload?.payload?.comments?.data,
    payload?.payload?.comments?.items,
    payload?.product?.article?.comments,
    payload?.product?.article?.comments?.data,
    payload?.product?.article?.comments?.items,
    payload?.data?.product?.article?.comments,
    payload?.data?.product?.article?.comments?.data,
    payload?.data?.product?.article?.comments?.items,
    payload?.result?.product?.article?.comments,
    payload?.result?.product?.article?.comments?.data,
    payload?.result?.product?.article?.comments?.items,
    payload?.payload?.product?.article?.comments,
    payload?.payload?.product?.article?.comments?.data,
    payload?.payload?.product?.article?.comments?.items,
    [],
  );
  if (!comments.length) return null;
  const articleId = extractStorefrontProductArticleId(product, payload);
  return normalizeStorefrontReviewsResult(
    {
      comments,
      review_stats: {
        count: comments.length,
        total: comments.length,
        total_count: comments.length,
      },
    },
    new URL(`${STOREFRONT_XAPI_BASE}/article/${encodeURIComponent(articleId || String(productId || "").trim())}/comment`),
    200,
    "product_article_comments",
  );
}

async function fetchStorefrontCustomerShopComments(token, productId = "", articleId = "") {
  if (!token) return null;

  const safeProductId = String(productId || "").trim();
  const safeArticleId = String(articleId || "").trim();
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/comments`);
  endpoint.searchParams.set("offset", "0");
  endpoint.searchParams.set("limit", "100");
  if (safeArticleId) endpoint.searchParams.set("article_id", safeArticleId);
  if (safeProductId) endpoint.searchParams.set("product_id", safeProductId);

  const result = await requestStorefrontAuthorizedEndpoint(token, endpoint, {
    method: "GET",
    label: "customer-shop-comments",
  });
  if (!result?.ok) return null;

  const comments = firstStorefrontCommentArray(
    result.payload?.comments,
    result.payload?.data?.comments,
    result.payload?.result?.comments,
    result.payload?.payload?.comments,
    result.payload?.items,
    result.payload?.data,
    result.payload?.result?.data,
    [],
  ).filter((comment) => storefrontCommentMatchesProductArticle(comment, safeProductId, safeArticleId));

  if (!comments.length) return null;

  return normalizeStorefrontReviewsResult(
    {
      ...result.payload,
      comments,
      review_stats: {
        count: comments.length,
        total: comments.length,
        total_count: comments.length,
        article_id: safeArticleId || null,
        product_id: safeProductId || null,
      },
    },
    endpoint,
    result.status,
    "product_article_comments",
  );
}

function storefrontCommentMatchesProductArticle(comment = {}, productId = "", articleId = "") {
  const safeProductId = String(productId || "").trim();
  const safeArticleId = String(articleId || "").trim();
  const articleCandidates = [
    comment?.article_id,
    comment?.articleId,
    comment?.article?.id,
    comment?.article?.article_id,
    comment?.article?.articleId,
  ].map((value) => String(firstNonNull(value, "") || "").trim());
  const productCandidates = [
    comment?.product_id,
    comment?.productId,
    comment?.product?.id,
    comment?.product?.product_id,
    comment?.product?.productId,
    comment?.shop_product_id,
    comment?.shopProductId,
  ].map((value) => String(firstNonNull(value, "") || "").trim());

  if (safeArticleId && articleCandidates.includes(safeArticleId)) return true;
  if (safeProductId && productCandidates.includes(safeProductId)) return true;
  return false;
}

async function fetchStorefrontProductArticleComments(articleId, productId, token = null) {
  const safeArticleId = String(articleId || "").trim();
  if (!safeArticleId) return null;

  const endpoints = [
    new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/blogs/${encodeURIComponent(safeArticleId)}`),
    new URL(`${STOREFRONT_XAPI_BASE}/article/${encodeURIComponent(safeArticleId)}`),
    new URL(`${STOREFRONT_XAPI_BASE}/articles/${encodeURIComponent(safeArticleId)}`),
    new URL(`${STOREFRONT_XAPI_BASE}/article/${encodeURIComponent(safeArticleId)}/comments`),
    new URL(`${STOREFRONT_XAPI_BASE}/articles/${encodeURIComponent(safeArticleId)}/comments`),
    new URL(`${STOREFRONT_XAPI_BASE}/article/product/${encodeURIComponent(safeArticleId)}`),
    new URL(`${STOREFRONT_XAPI_BASE}/article/product/${encodeURIComponent(safeArticleId)}/comments`),
  ];

  for (const endpoint of endpoints) {
    const authorizedResult = token
      ? await requestStorefrontAuthorizedEndpoint(token, endpoint, { method: "GET", label: "product-article-comments" })
      : null;
    if (authorizedResult?.ok) {
      const normalized = normalizeStorefrontArticleCommentsResult(authorizedResult.payload, endpoint, authorizedResult.status, productId, safeArticleId);
      if (normalized) return normalized;
    }

    if (authorizedResult && ![401, 403, 404, 405].includes(authorizedResult.status || 0)) {
      continue;
    }

    const publicResult = await requestStorefrontXapi(endpoint, "product_article_comments");
    if (!publicResult.ok) continue;

    const normalized = normalizeStorefrontArticleCommentsResult(publicResult.payload, endpoint, publicResult.status, productId, safeArticleId);
    if (normalized) return normalized;
  }

  return null;
}

function normalizeStorefrontArticleCommentsResult(payload = {}, endpoint, status = 200, productId = "", articleId = "") {
  const product = firstNonNull(
    payload?.product,
    payload?.data?.product,
    payload?.result?.product,
    payload?.payload?.product,
    null,
  );
  const embedded = buildStorefrontArticleCommentsPayloadFromProduct(product, payload, productId);
  if (embedded) {
    return {
      ...embedded,
      endpoint: publicStorefrontEndpoint(endpoint),
      status,
      payload,
    };
  }

  const comments = firstStorefrontCommentArray(
    payload?.comment,
    payload?.comments,
    payload?.comments?.data,
    payload?.comments?.items,
    payload?.comments?.comments,
    payload?.data?.comment,
    payload?.data?.comments,
    payload?.data?.comments?.data,
    payload?.data?.comments?.items,
    payload?.result?.comment,
    payload?.result?.comments,
    payload?.result?.comments?.data,
    payload?.result?.comments?.items,
    payload?.payload?.comment,
    payload?.payload?.comments,
    payload?.payload?.comments?.data,
    payload?.payload?.comments?.items,
    [],
  );

  if (!comments.length) return null;

  return normalizeStorefrontReviewsResult(
    {
      comments,
      review_stats: {
        count: comments.length,
        total: comments.length,
        total_count: comments.length,
        article_id: articleId,
      },
    },
    endpoint,
    status,
    "product_article_comments",
  );
}

function firstStorefrontCommentArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = firstArray(value.comments, value.data, value.items, value.records, value.list, value.results);
      if (nested.length) return nested;
    }
  }
  return [];
}

function buildStorefrontReviewFallbackPayloadFromProduct(product = null, productId = "") {
  if (!product || typeof product !== "object") return null;
  const reviewCount = parseInt(firstNonNull(product.rate_count, product.review_count, product.reviews_count, product.rateCount, 0), 10);
  if (!Number.isFinite(reviewCount) && !Number.isFinite(Number(product.rate)) && !Number.isFinite(Number(product.rating))) {
    return null;
  }
  const rating = parseFloat(firstNonNull(product.rate, product.rating, product.review_rating, 0));
  const count = Number.isFinite(reviewCount) ? reviewCount : 0;
  return normalizeStorefrontReviewsResult(
    {
      review_stats: {
        count,
        total: count,
        total_count: count,
        rating,
        avg_rating: rating,
        average_rating: rating,
      },
      reviews: [],
    },
    new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/products/${encodeURIComponent(String(productId || "").trim())}/reviews`),
    200,
    "product_reviews",
  );
}

function normalizeStorefrontReviewsResult(payload = {}, endpoint, status = 200, source = "product_reviews") {
  const reviews = firstArray(
    payload?.reviews,
    payload?.data?.reviews,
    payload?.result?.reviews,
    payload?.payload?.reviews,
    payload?.data?.comments,
    payload?.result?.comments,
    payload?.payload?.comments,
    payload?.comments,
    payload?.items,
    payload?.result?.items,
    payload?.payload?.items,
    [],
  );
  const summary = firstNonNull(
    payload?.review_stats,
    payload?.reviewStats,
    payload?.stats,
    payload?.summary,
    payload?.data?.review_stats,
    payload?.data?.reviewStats,
    payload?.data?.stats,
    payload?.data?.summary,
    payload?.payload?.review_stats,
    payload?.payload?.reviewStats,
    payload?.payload?.stats,
    payload?.payload?.summary,
    null,
  );

  const count = Number.parseInt(
    firstNonNull(
      summary?.count,
      summary?.total,
      summary?.total_count,
      payload?.count,
      payload?.total,
      reviews.length,
      0,
    ),
    10,
  );

  return {
    ok: true,
    source: `storefront_${source}`,
    status,
    endpoint: publicStorefrontEndpoint(endpoint),
    reviews,
    review_stats: summary,
    reviewStats: summary,
    count,
    payload,
  };
}

async function fetchStorefrontOrderHistory(session, url) {
  const requestedType = String(url.searchParams.get("type") || "PHYSICAL").trim().toUpperCase();
  const type = requestedType === "PHYSICAL" ? "PHYSICAL" : "PHYSICAL";
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/basket/orders-${encodeURIComponent(type)}`);
  const limit = clampInteger(url.searchParams.get("limit"), 1, 100, 40);
  const offset = clampInteger(url.searchParams.get("offset"), 0, 100000, 0);

  endpoint.searchParams.set("limit", String(limit));
  endpoint.searchParams.set("offset", String(offset));

  try {
    const token = await ensureStorefrontToken(session);
    if (!token) {
      return {
        ok: false,
        source: "storefront_order_history",
        status: 401,
        endpoint: publicStorefrontEndpoint(endpoint),
        error: "Authentication required to load Selldone order history.",
      };
    }

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
        source: "storefront_order_history",
        status: storefrontError?.status || response.status,
        endpoint: publicStorefrontEndpoint(endpoint),
        error: storefrontError?.error || readStorefrontApiMessage(payload) || `${response.statusText || "Selldone order history request failed"} (${response.status}).`,
        payload,
      };
    }

    const orders = firstArray(
      payload?.orders,
      payload?.baskets,
      payload?.items,
      payload?.data?.orders,
      payload?.data?.baskets,
      payload?.data?.items,
      payload?.result?.orders,
      payload?.result?.baskets,
      payload?.payload?.orders,
      payload?.payload?.baskets,
    );

    return {
      ok: true,
      source: "storefront_order_history",
      apiBaseUrl: STOREFRONT_XAPI_BASE,
      endpoint: publicStorefrontEndpoint(endpoint),
      type,
      count: orders.length,
      total: firstNonNull(payload?.total, payload?.data?.total, payload?.result?.total, payload?.payload?.total, orders.length),
      orders,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      source: "storefront_order_history",
      status: 502,
      endpoint: publicStorefrontEndpoint(endpoint),
      error: error?.message || "Selldone order history request failed.",
    };
  }
}

async function fetchStorefrontOrderDetail(session, basketId) {
  const safeBasketId = String(basketId || "").trim();
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/baskets/${encodeURIComponent(safeBasketId)}`);

  if (!safeBasketId) {
    return {
      ok: false,
      source: "storefront_order_detail",
      status: 400,
      endpoint: publicStorefrontEndpoint(endpoint),
      error: "Basket id is required to load Selldone order details.",
    };
  }

  try {
    const token = await ensureStorefrontToken(session);
    if (!token) {
      return {
        ok: false,
        source: "storefront_order_detail",
        status: 401,
        endpoint: publicStorefrontEndpoint(endpoint),
        error: "Authentication required to load Selldone order details.",
      };
    }

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
        source: "storefront_order_detail",
        status: storefrontError?.status || response.status,
        endpoint: publicStorefrontEndpoint(endpoint),
        error: storefrontError?.error || readStorefrontApiMessage(payload) || `${response.statusText || "Selldone order detail request failed"} (${response.status}).`,
        payload,
      };
    }

    return {
      ok: true,
      source: "storefront_order_detail",
      apiBaseUrl: STOREFRONT_XAPI_BASE,
      endpoint: publicStorefrontEndpoint(endpoint),
      basketId: safeBasketId,
      basket: firstNonNull(payload?.basket, payload?.order, payload?.data?.basket, payload?.data?.order, payload?.result?.basket, payload?.payload?.basket, payload?.data, payload?.result, payload?.payload, payload),
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      source: "storefront_order_detail",
      status: 502,
      endpoint: publicStorefrontEndpoint(endpoint),
      error: error?.message || "Selldone order detail request failed.",
    };
  }
}

async function fetchStorefrontBlogs(url) {
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/blogs`);
  const limit = clampInteger(url.searchParams.get("limit"), 1, 100, 24);
  const offset = clampInteger(url.searchParams.get("offset"), 0, 100000, 0);

  endpoint.searchParams.set("offset", offset);
  endpoint.searchParams.set("limit", limit);

  const category = String(url.searchParams.get("category") || "").trim();
  const search = String(url.searchParams.get("search") || "").trim();
  if (category && category !== "all") endpoint.searchParams.set("category", category);
  if (search) endpoint.searchParams.set("search", search);

  return requestStorefrontXapi(endpoint, "blogs");
}

async function fetchStorefrontBlog(articleId, url) {
  const listUrl = new URL(url);
  listUrl.searchParams.set("limit", "100");
  listUrl.searchParams.set("offset", "0");
  const result = await fetchStorefrontBlogs(listUrl);
  if (!result.ok) return result;

  const rawNeedle = String(articleId || "").trim();
  const needle = (() => {
    try {
      return decodeURIComponent(rawNeedle);
    } catch {
      return rawNeedle;
    }
  })();
  const article = firstArray(result.articles, result.blogs, result.data?.articles, result.data?.blogs).find((entry) => {
    if (!entry || typeof entry !== "object") return false;
    return [
      entry.id,
      entry.slug,
      entry.parent_id,
      entry.parent?.id,
      entry.blog_id,
      entry.blogId,
    ].some((value) => String(firstNonNull(value, "")).trim() === needle);
  });

  if (!article) {
    return {
      ok: false,
      source: "storefront_xapi",
      status: 404,
      endpoint: result.endpoint,
      error: "Blog article was not found in Selldone storefront blogs.",
      articles: result.articles || [],
    };
  }

  const detail = await fetchStorefrontBlogDetail(article);
  if (!detail.ok) {
    return {
      ...detail,
      summary: article,
    };
  }

  return {
    ...result,
    source: "storefront_xapi_blog_detail",
    endpoint: detail.endpoint,
    article: {
      ...article,
      ...detail.article,
    },
    summary: article,
    detail: detail.payload,
  };
}

function extractStorefrontBlogDetailArticle(payload = {}) {
  return firstNonNull(
    payload?.article,
    payload?.data?.article,
    payload?.result?.article,
    payload?.payload?.article,
    payload?.payload?.data?.article,
    payload?.data?.payload?.article,
    payload?.audit?.article,
    payload?.seo?.article,
    null,
  );
}

function storefrontBlogDetailContent(article = {}) {
  const nestedArticle = article?.article && typeof article.article === "object" ? article.article : {};
  return String(firstNonNull(
    article?.body,
    article?.content,
    article?.html,
    article?.text,
    article?.article_body,
    article?.body_html,
    article?.content_html,
    nestedArticle?.body,
    nestedArticle?.content,
    nestedArticle?.html,
    "",
  ) || "").trim();
}

async function fetchStorefrontBlogDetail(summaryArticle = {}) {
  const blogId = firstNonNull(
    summaryArticle?.parent_id,
    summaryArticle?.parent?.id,
    summaryArticle?.blog_id,
    summaryArticle?.blogId,
    summaryArticle?.id,
    summaryArticle?.article_id,
    summaryArticle?.articleId,
    "",
  );
  if (!blogId) {
    return {
      ok: false,
      source: "storefront_xapi_blog_detail",
      status: 400,
      error: "Blog id is required for Selldone detail fetch.",
    };
  }

  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/blogs/${encodeURIComponent(String(blogId))}`);
  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    const payload = await readStorefrontResponsePayload(response);
    const explicitError = payload?.error || payload?.error_msg || payload?.error_message;
    if (!response.ok || explicitError) {
      return {
        ok: false,
        source: "storefront_xapi_blog_detail",
        status: response.status,
        endpoint: publicStorefrontEndpoint(endpoint),
        error: readStorefrontApiMessage(payload) || `${response.statusText || "Selldone article detail request failed"} (${response.status}).`,
        payload,
      };
    }

    const article = extractStorefrontBlogDetailArticle(payload);
    if (!article || !storefrontBlogDetailContent(article)) {
      return {
        ok: false,
        source: "storefront_xapi_blog_detail",
        status: 502,
        endpoint: publicStorefrontEndpoint(endpoint),
        error: "Selldone article detail response did not include full article content.",
        payload,
      };
    }

    return {
      ok: true,
      source: "storefront_xapi_blog_detail",
      endpoint: publicStorefrontEndpoint(endpoint),
      payload,
      article,
    };
  } catch (error) {
    return {
      ok: false,
      source: "storefront_xapi_blog_detail",
      status: 502,
      endpoint: publicStorefrontEndpoint(endpoint),
      error: error?.message || "Selldone article detail request failed.",
    };
  }
}

async function fetchStorefrontShopInfo() {
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/info`);
  return requestStorefrontXapi(endpoint, "shop-info");
}

async function fetchStorefrontProfile(type) {
  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/@${STOREFRONT_SHOP_HANDLE}/profiles/${encodeURIComponent(type)}`);
  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    const payload = await readStorefrontResponsePayload(response);
    const storefrontError = detectStorefrontApiError(payload, response.status);

    if (!response.ok || storefrontError) {
      return {
        ok: false,
        source: "storefront_xapi",
        status: storefrontError?.status || response.status,
        endpoint: publicStorefrontEndpoint(endpoint),
        error: storefrontError?.error || readStorefrontApiMessage(payload) || `${response.statusText || "Selldone storefront profile request failed"} (${response.status}).`,
        payload,
      };
    }

    const profile = firstNonNull(payload?.profile, payload?.data?.profile, payload?.result?.profile, payload?.payload?.profile, payload?.data, payload?.result, payload?.payload, payload);
    return {
      ok: true,
      source: "storefront_xapi",
      apiBaseUrl: STOREFRONT_XAPI_BASE,
      endpoint: publicStorefrontEndpoint(endpoint),
      type,
      profile,
      body: firstNonNull(profile?.body, profile?.content, payload?.body, payload?.data?.body, payload?.result?.body, payload?.payload?.body, ""),
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      source: "storefront_xapi",
      status: 502,
      endpoint: publicStorefrontEndpoint(endpoint),
      error: error?.message || "Selldone storefront profile request failed.",
    };
  }
}

function normalizeStorefrontShopInfoPayload(payload) {
  const shop = firstNonNull(
    payload?.shop,
    payload?.data?.shop,
    payload?.result?.shop,
    payload?.payload?.shop,
    payload?.data,
    payload?.result,
    payload?.payload,
    null,
  );
  const profile = firstNonNull(
    shop?.profile,
    shop?.shop_profile,
    shop?.info,
    shop?.profile_data,
    payload?.profile,
    payload?.data?.profile,
    payload?.result?.profile,
    payload?.payload?.profile,
    null,
  );

  return {
    shop,
    profile,
    shopInfo: payload,
  };
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
      ...(label === "shop-info" ? normalizeStorefrontShopInfoPayload(payload) : {}),
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
      article: firstNonNull(payload?.article, payload?.blog, payload?.data?.article, payload?.data?.blog, payload?.result?.article, payload?.result?.blog, payload?.payload?.article, payload?.payload?.blog, null),
      articles: firstArray(
        payload?.articles,
        payload?.blogs,
        payload?.data?.articles,
        payload?.data?.blogs,
        payload?.result?.articles,
        payload?.result?.blogs,
        payload?.payload?.articles,
        payload?.payload?.blogs,
        payload?.payload?.data?.articles,
        payload?.payload?.data?.blogs,
        payload?.data?.payload?.articles,
        payload?.data?.payload?.blogs,
        payload?.items,
        payload?.data?.items,
        payload?.result?.items,
        payload?.payload?.items,
      ),
      blogs: firstArray(
        payload?.blogs,
        payload?.articles,
        payload?.data?.blogs,
        payload?.data?.articles,
        payload?.result?.blogs,
        payload?.result?.articles,
        payload?.payload?.blogs,
        payload?.payload?.articles,
        payload?.items,
      ),
      last_articles: firstArray(payload?.last_articles, payload?.data?.last_articles, payload?.result?.last_articles, payload?.payload?.last_articles),
      popular: firstArray(payload?.popular, payload?.data?.popular, payload?.result?.popular, payload?.payload?.popular),
      categories: firstArray(payload?.categories, payload?.data?.categories, payload?.result?.categories, payload?.payload?.categories),
      interest: firstArray(payload?.interest, payload?.data?.interest, payload?.result?.interest, payload?.payload?.interest),
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

async function subscribeStorefrontNewsletter(payload = {}) {
  const email = String(payload?.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, source: "storefront_newsletter", status: 422, error: "Enter a valid email address." };
  }

  const streamKey = String(STOREFRONT_NEWSLETTER_STREAM_ACCESS_KEY || "").trim();
  if (!streamKey) {
    return {
      ok: false,
      source: "storefront_newsletter",
      status: 500,
      error: "Newsletter stream access key is not configured.",
    };
  }

  const body = {
    email,
    subscribed: true,
    source: String(payload?.source || "storefront_footer").trim() || "storefront_footer",
    page: String(payload?.page || "").trim() || null,
    tags: ["newsletter", "special_offers"],
  };

  const endpoint = new URL(`${STOREFRONT_XAPI_BASE}/shops/${encodeURIComponent(String(SHOP_ID))}/audience/${encodeURIComponent(streamKey)}`);
  const publicEndpoint = { ...publicStorefrontEndpoint(endpoint), method: "POST" };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(body),
    });
    const responsePayload = await readStorefrontResponsePayload(response);
    const storefrontError = detectStorefrontApiError(responsePayload, response.status);

    if (!response.ok || storefrontError) {
      return {
        ok: false,
        source: "storefront_newsletter",
        status: storefrontError?.status || response.status,
        endpoint: publicEndpoint,
        error: storefrontError?.error || readStorefrontApiMessage(responsePayload) || `${response.statusText || "Selldone newsletter request failed."} (${response.status}).`,
        payload: responsePayload,
      };
    }

    return {
      ok: true,
      source: "storefront_newsletter",
      endpoint: publicEndpoint,
      message: readStorefrontApiMessage(responsePayload) || "You're signed up for news and special offers.",
      payload: responsePayload,
    };
  } catch (error) {
    return {
      ok: false,
      source: "storefront_newsletter",
      status: 502,
      endpoint: publicEndpoint,
      error: error?.message || "Selldone newsletter request failed.",
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

function storefrontProductReviewsFromApiPath(pathname) {
  const match = pathname.match(/^\/api\/storefront\/products\/([^/]+)\/reviews$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function storefrontBlogIdFromApiPath(pathname) {
  const match = pathname.match(/^\/api\/storefront\/blogs?\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function storefrontBasketProductIdFromApiPath(pathname) {
  const match = pathname.match(/^\/api\/storefront\/basket\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function storefrontProfileTypeFromApiPath(pathname) {
  const match = String(pathname || "").match(/^\/api\/storefront\/profiles\/([^/]+)$/);
  if (!match) return null;
  const type = decodeURIComponent(match[1]);
  return ["privacy", "terms", "about-us", "contact-us"].includes(type) ? type : null;
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
