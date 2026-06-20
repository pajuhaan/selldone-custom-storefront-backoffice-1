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

  if (pathname === "/api/storefront/orders/history" && req.method === "GET") {
    const result = await fetchStorefrontOrderHistory(storefrontSession, url);
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
    return String(firstNonNull(entry.id, "")).trim() === needle || String(firstNonNull(entry.slug, "")).trim() === needle;
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

  return {
    ...result,
    article,
  };
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
