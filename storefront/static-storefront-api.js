import { storefrontAuth } from "../shared/auth-client.js";
import { getPublicConfig } from "../shared/runtime-config.js";

const PHYSICAL_BASKET_TYPE = "physical";

export function installStaticStorefrontApi() {
  if (window.__pajulinaStaticStorefrontApi) return;
  const nativeFetch = window.fetch.bind(window);
  window.__pajulinaStaticStorefrontApi = true;

  window.fetch = async (input, init = {}) => {
    const requestUrl = requestToUrl(input);
    if (!requestUrl || requestUrl.origin !== window.location.origin || !requestUrl.pathname.startsWith("/api/storefront")) {
      return nativeFetch(input, init);
    }

    try {
      return await handleStorefrontRequest(requestUrl, init, nativeFetch);
    } catch (error) {
      return jsonResponse({ ok: false, status: error?.status || 502, error: error?.message || "Storefront request failed." }, error?.status || 502);
    }
  };
}

async function handleStorefrontRequest(url, init, nativeFetch) {
  const path = normalizePath(url.pathname);
  const method = String(init?.method || "GET").toUpperCase();

  if (path === "/api/storefront/session" && method === "GET") {
    return jsonResponse(await storefrontAuth.session());
  }

  if (path === "/api/storefront/products" && method === "GET") {
    return jsonResponse(await fetchProducts(url, nativeFetch));
  }

  const productReviewsId = matchPath(path, /^\/api\/storefront\/products\/([^/]+)\/reviews$/);
  if (productReviewsId) {
    if (method === "GET") return jsonResponse(await fetchProductReviews(productReviewsId, nativeFetch));
    if (method === "POST") return jsonResponse(await submitProductReview(productReviewsId, await readBody(init), nativeFetch));
    if (method === "PATCH" || method === "PUT") return jsonResponse(await updateProductComment(productReviewsId, await readBody(init), nativeFetch));
    if (method === "DELETE") return jsonResponse(await deleteProductComment(productReviewsId, await readBody(init), nativeFetch));
    return jsonResponse({ ok: false, error: "Unsupported product reviews method." }, 405);
  }

  const productId = matchPath(path, /^\/api\/storefront\/products\/([^/]+)$/);
  if (productId && method === "GET") {
    return jsonResponse(await fetchProduct(productId, nativeFetch));
  }

  if ((path === "/api/storefront/blogs" || path === "/api/storefront/blog") && method === "GET") {
    return jsonResponse(await fetchBlogs(url, nativeFetch));
  }

  const blogId = matchPath(path, /^\/api\/storefront\/blogs?\/([^/]+)$/);
  if (blogId && method === "GET") {
    return jsonResponse(await fetchBlog(blogId, nativeFetch));
  }

  if (path === "/api/storefront/shop/info" && method === "GET") {
    return jsonResponse(await fetchShopInfo(nativeFetch));
  }

  const profileType = matchPath(path, /^\/api\/storefront\/profiles\/([^/]+)$/);
  if (profileType && method === "GET") {
    return jsonResponse(await fetchProfile(profileType, nativeFetch));
  }

  if (path === "/api/storefront/basket" && method === "GET") {
    return jsonResponse(await fetchBasket(nativeFetch));
  }

  const basketProductId = matchPath(path, /^\/api\/storefront\/basket\/([^/]+)$/);
  if (basketProductId && (method === "PUT" || method === "DELETE")) {
    return jsonResponse(await mutateBasket(basketProductId, method, await readBody(init), nativeFetch));
  }

  if (path === "/api/storefront/orders" && method === "POST") {
    return jsonResponse(await checkoutPhysicalBasket(await readBody(init), nativeFetch));
  }

  if (path === "/api/storefront/quick-buy" && method === "POST") {
    return jsonResponse(await checkoutQuickBuy(await readBody(init), nativeFetch));
  }

  if (path === "/api/storefront/orders/history" && method === "GET") {
    return jsonResponse(await fetchOrderHistory(url, nativeFetch));
  }

  const orderId = matchPath(path, /^\/api\/storefront\/orders\/([^/]+)$/);
  if (orderId && method === "GET") {
    return jsonResponse(await fetchOrderDetail(orderId, nativeFetch));
  }

  if (path === "/api/storefront/newsletter" && method === "POST") {
    return jsonResponse(await subscribeNewsletter(await readBody(init), nativeFetch));
  }

  return jsonResponse({ ok: false, error: "Storefront API route not found." }, 404);
}

async function fetchProducts(url, nativeFetch) {
  const config = getPublicConfig();
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/products/all`);
  endpoint.searchParams.set("dir", url.searchParams.get("dir") || "*");
  endpoint.searchParams.set("offset", url.searchParams.get("offset") || "0");
  endpoint.searchParams.set("limit", clamp(url.searchParams.get("limit"), 1, 1500, 200));
  endpoint.searchParams.set("with_total", "true");
  endpoint.searchParams.set("with_category", "true");
  endpoint.searchParams.set("products_only", "false");
  endpoint.searchParams.set("categories_only", "false");
  endpoint.searchParams.set("with_parent", "true");
  endpoint.searchParams.set("with_page", "true");
  endpoint.searchParams.set("available", url.searchParams.get("available") || "true");
  endpoint.searchParams.set("surrounded", "false");
  endpoint.searchParams.set("sort", url.searchParams.get("sort") || "newest");
  if (url.searchParams.get("search")) endpoint.searchParams.set("search", url.searchParams.get("search"));
  const payload = await requestJson(endpoint, { nativeFetch });
  return decorateXapiPayload(payload, endpoint, "products");
}

async function fetchProduct(productId, nativeFetch) {
  const config = getPublicConfig();
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/products/${encodeURIComponent(productId)}/info`);
  const payload = await requestJson(endpoint, { nativeFetch, token: await storefrontAuth.getAccessToken(), optionalAuth: true });
  return {
    ...decorateXapiPayload(payload, endpoint, "product"),
    product: firstValue(payload.product, payload.data?.product, payload.result?.product, payload.payload?.product, payload.data, payload.result, payload.payload, payload),
  };
}

async function fetchProductReviews(productId, nativeFetch) {
  const safeId = String(productId || "").trim();
  if (!safeId) throw statusError("Product ID is required.", 422);

  const config = getPublicConfig();
  const productResult = await fetchProduct(safeId, nativeFetch).catch(() => null);
  const product = firstObject(
    productResult?.product,
    productResult?.data?.product,
    productResult?.result?.product,
    productResult?.payload?.product,
    productResult?.data?.data?.product,
    productResult?.data?.result?.product,
    productResult?.data?.payload?.product,
  );

  const embedded = buildProductArticleCommentsPayloadFromProduct(product, productResult, safeId);
  if (embedded) return embedded;

  const articleId = extractProductArticleId(product, productResult);
  const token = await storefrontAuth.getAccessToken().catch(() => "");
  const customerComments = token ? await fetchCustomerShopComments(safeId, articleId, token, nativeFetch).catch(() => null) : null;
  if (customerComments) return customerComments;

  return buildProductReviewFallbackPayload(product, safeId, config);
}

async function submitProductReview(productId, body, nativeFetch) {
  const token = await requireStorefrontToken();
  if (body?.user_rating && typeof body.user_rating === "object") {
    const config = getPublicConfig();
    const ratingEndpoint = xapiUrl(`/shops/@${shopHandle(config)}/products/${encodeURIComponent(productId)}/set-my-rating`);
    const rating = await requestJson(ratingEndpoint, { nativeFetch, token, method: "POST", body: { user_rating: body.user_rating } });
    if (!body.comment) return { ok: true, source: "storefront_xapi_review", rating };
  }

  if (!body?.comment) return { ok: true, source: "storefront_xapi_review" };
  const articleId = await resolveProductArticleId(productId, nativeFetch);
  if (!articleId) throw statusError("Selldone XAPI product detail did not return a product article id for comment submission.", 409);
  const commentEndpoint = xapiUrl(`/article/${encodeURIComponent(articleId)}/comment`);
  const comment = await requestJson(commentEndpoint, { nativeFetch, token, method: "POST", body: { body: body.comment } });
  return { ok: true, source: "storefront_xapi_review", comment };
}

async function updateProductComment(productId, body, nativeFetch) {
  const token = await requireStorefrontToken();
  const commentId = body?.comment_id || body?.id;
  if (!commentId) throw statusError("Comment ID is required.", 422);
  const endpoint = xapiUrl(`/comment/${encodeURIComponent(commentId)}`);
  const payload = await requestJson(endpoint, { nativeFetch, token, method: "PUT", body: { body: body.comment || "" } });
  return { ok: true, source: "storefront_xapi_comment_update", payload, productId };
}

async function deleteProductComment(productId, body, nativeFetch) {
  const token = await requireStorefrontToken();
  const commentId = body?.comment_id || body?.id;
  if (!commentId) throw statusError("Comment ID is required.", 422);
  const endpoint = xapiUrl(`/comment/${encodeURIComponent(commentId)}`);
  const payload = await requestJson(endpoint, { nativeFetch, token, method: "DELETE" });
  return { ok: true, source: "storefront_xapi_comment_delete", payload, productId };
}

async function resolveProductArticleId(productId, nativeFetch) {
  const productResult = await fetchProduct(productId, nativeFetch);
  const product = firstObject(productResult.product, productResult.data?.product, productResult);
  return extractProductArticleId(product, productResult);
}

async function fetchCustomerShopComments(productId, articleId, token, nativeFetch) {
  if (!token) return null;
  const config = getPublicConfig();
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/comments`);
  endpoint.searchParams.set("offset", "0");
  endpoint.searchParams.set("limit", "100");
  if (articleId) endpoint.searchParams.set("article_id", articleId);
  if (productId) endpoint.searchParams.set("product_id", productId);

  const payload = await requestJson(endpoint, { nativeFetch, token });
  const comments = firstCommentArray(
    payload.comments,
    payload.data?.comments,
    payload.result?.comments,
    payload.payload?.comments,
    payload.items,
    payload.data,
    payload.result?.data,
  ).filter((comment) => commentMatchesProductArticle(comment, productId, articleId));

  if (!comments.length) return null;
  return buildProductCommentsPayload({ ...payload, comments }, endpoint, "product_article_comments", productId, articleId);
}

function extractProductArticleId(product = null, payload = null) {
  const article = firstObject(
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
    payload?.product?.article_pack?.article,
    payload?.product?.articlePack?.article,
    payload?.data?.article,
    payload?.data?.product?.article,
    payload?.data?.product?.article_pack?.article,
    payload?.data?.product?.articlePack?.article,
    payload?.result?.article,
    payload?.result?.product?.article,
    payload?.result?.product?.article_pack?.article,
    payload?.result?.product?.articlePack?.article,
    payload?.payload?.article,
    payload?.payload?.product?.article,
    payload?.payload?.product?.article_pack?.article,
    payload?.payload?.product?.articlePack?.article,
  );
  return String(
    firstValue(
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
    ) || "",
  ).trim();
}

function buildProductArticleCommentsPayloadFromProduct(product = null, payload = null, productId = "") {
  const article = firstObject(
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
    payload?.product?.article_pack?.article,
    payload?.product?.articlePack?.article,
    payload?.data?.article,
    payload?.data?.product?.article,
    payload?.data?.product?.article_pack?.article,
    payload?.data?.product?.articlePack?.article,
    payload?.result?.article,
    payload?.result?.product?.article,
    payload?.result?.product?.article_pack?.article,
    payload?.result?.product?.articlePack?.article,
    payload?.payload?.article,
    payload?.payload?.product?.article,
    payload?.payload?.product?.article_pack?.article,
    payload?.payload?.product?.articlePack?.article,
  );
  const comments = firstCommentArray(
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
    payload?.product?.article_pack?.article?.comments,
    payload?.product?.article_pack?.article?.comments?.data,
    payload?.product?.article_pack?.article?.comments?.items,
    payload?.data?.product?.article?.comments,
    payload?.data?.product?.article?.comments?.data,
    payload?.data?.product?.article?.comments?.items,
    payload?.data?.product?.article_pack?.article?.comments,
    payload?.data?.product?.article_pack?.article?.comments?.data,
    payload?.data?.product?.article_pack?.article?.comments?.items,
  );

  if (!comments.length) return null;
  const config = getPublicConfig();
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/products/${encodeURIComponent(String(productId || "").trim())}/info`);
  return buildProductCommentsPayload({ comments }, endpoint, "product_article_comments", productId, extractProductArticleId(product, payload));
}

function buildProductReviewFallbackPayload(product = null, productId = "", config = getPublicConfig()) {
  const rating = Number(firstValue(product?.rate, product?.rating, product?.review_rating, 0));
  const count = Number.parseInt(firstValue(product?.rate_count, product?.review_count, product?.reviews_count, product?.rateCount, 0), 10);
  const safeRating = Number.isFinite(rating) ? rating : 0;
  const safeCount = Number.isFinite(count) ? count : 0;
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/products/${encodeURIComponent(String(productId || "").trim())}/info`);
  return {
    ok: true,
    source: "storefront_xapi_product_article_comments",
    apiBaseUrl: config.STOREFRONT_XAPI_BASE,
    endpoint: publicEndpoint(endpoint),
    reviews: [],
    comments: [],
    review_stats: {
      count: safeCount,
      total: safeCount,
      total_count: safeCount,
      rating: safeRating,
      avg_rating: safeRating,
      average_rating: safeRating,
    },
  };
}

function buildProductCommentsPayload(payload = {}, endpoint, source = "product_article_comments", productId = "", articleId = "") {
  if (payload?.error === true || payload?.ok === false) return null;
  const comments = firstCommentArray(
    payload.reviews,
    payload.comments,
    payload.data?.reviews,
    payload.data?.comments,
    payload.result?.reviews,
    payload.result?.comments,
    payload.payload?.reviews,
    payload.payload?.comments,
    payload.items,
  );
  if (!comments.length) return null;
  return {
    ...payload,
    ok: true,
    source: `storefront_xapi_${source}`,
    apiBaseUrl: getPublicConfig().STOREFRONT_XAPI_BASE,
    endpoint: publicEndpoint(endpoint),
    reviews: comments,
    comments,
    review_stats: {
      count: comments.length,
      total: comments.length,
      total_count: comments.length,
      article_id: articleId || null,
      product_id: productId || null,
    },
  };
}

function commentMatchesProductArticle(comment = {}, productId = "", articleId = "") {
  const safeProductId = String(productId || "").trim();
  const safeArticleId = String(articleId || "").trim();
  const articleCandidates = [
    comment?.article_id,
    comment?.articleId,
    comment?.article?.id,
    comment?.article?.article_id,
    comment?.article?.articleId,
  ].map((value) => String(firstValue(value, "") || "").trim());
  const productCandidates = [
    comment?.product_id,
    comment?.productId,
    comment?.product?.id,
    comment?.product?.product_id,
    comment?.product?.productId,
    comment?.shop_product_id,
    comment?.shopProductId,
  ].map((value) => String(firstValue(value, "") || "").trim());

  if (safeArticleId && articleCandidates.includes(safeArticleId)) return true;
  if (safeProductId && productCandidates.includes(safeProductId)) return true;
  return false;
}

function firstCommentArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = firstArray(value.comments, value.data, value.items, value.records, value.list, value.results);
      if (nested.length) return nested;
    }
  }
  return [];
}

async function fetchBlogs(url, nativeFetch) {
  const config = getPublicConfig();
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/blogs`);
  endpoint.searchParams.set("offset", url.searchParams.get("offset") || "0");
  endpoint.searchParams.set("limit", clamp(url.searchParams.get("limit"), 1, 100, 24));
  if (url.searchParams.get("category")) endpoint.searchParams.set("category", url.searchParams.get("category"));
  if (url.searchParams.get("search")) endpoint.searchParams.set("search", url.searchParams.get("search"));
  const payload = await requestJson(endpoint, { nativeFetch });
  return decorateXapiPayload(payload, endpoint, "blogs");
}

async function fetchBlog(blogId, nativeFetch) {
  const config = getPublicConfig();
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/blogs/${encodeURIComponent(blogId)}`);
  const payload = await requestJson(endpoint, { nativeFetch });
  return {
    ...decorateXapiPayload(payload, endpoint, "blog"),
    article: firstValue(payload.article, payload.blog, payload.data?.article, payload.data?.blog, payload.result?.article, payload.payload?.article, payload.data, payload.result, payload.payload, payload),
  };
}

async function fetchShopInfo(nativeFetch) {
  const config = getPublicConfig();
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/info`);
  const payload = await requestJson(endpoint, { nativeFetch, token: await storefrontAuth.getAccessToken(), optionalAuth: true });
  return decorateXapiPayload(payload, endpoint, "shop-info");
}

async function fetchProfile(type, nativeFetch) {
  const config = getPublicConfig();
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/profiles/${encodeURIComponent(type)}`);
  const payload = await requestJson(endpoint, { nativeFetch });
  const profile = firstValue(payload.profile, payload.data?.profile, payload.result?.profile, payload.payload?.profile, payload.data, payload.result, payload.payload, payload);
  return {
    ...decorateXapiPayload(payload, endpoint, "profile"),
    profile,
    body: firstValue(profile?.body, profile?.content, payload.body, payload.data?.body, ""),
  };
}

async function fetchBasket(nativeFetch) {
  const token = await requireStorefrontToken();
  const shopInfo = await fetchShopInfo(nativeFetch);
  const billResult = await fetchBasketBill(token, nativeFetch).catch(() => ({}));
  const basket = extractPhysicalBasket(shopInfo);
  const bill = extractBill(billResult);
  return { ok: true, source: "storefront_basket", shop: shopInfo.shop, basket: basket || { items: [], basket_items: [] }, bill, endpoint: shopInfo.endpoint };
}

async function mutateBasket(productId, method, body, nativeFetch) {
  const token = await requireStorefrontToken();
  const config = getPublicConfig();
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/basket/${encodeURIComponent(productId)}`);
  const payload = await requestJson(endpoint, {
    nativeFetch,
    token,
    method,
    body: method === "DELETE" ? body || {} : normalizeBasketPayload(body),
  });
  const refreshed = await fetchBasket(nativeFetch).catch(() => ({}));
  return {
    ok: true,
    source: method === "DELETE" ? "storefront_basket_remove" : "storefront_basket_update",
    payload,
    basket: extractPhysicalBasket(payload) || refreshed.basket,
    bill: extractBill(payload) || refreshed.bill,
    endpoint: publicEndpoint(endpoint, method),
  };
}

async function checkoutQuickBuy(body, nativeFetch) {
  if (!body?.product_id) throw statusError("Product ID is required for quick buy.", 422);
  const basketPayload = normalizeBasketPayload({
    count: body.count,
    currency: body.currency,
    variant_id: firstValue(body.variant_id, body.selected_variant_id, body.product_variant_id, ""),
  });
  await mutateBasket(body.product_id, "PUT", basketPayload, nativeFetch);
  return checkoutPhysicalBasket({ ...body, quick_buy: true }, nativeFetch);
}

async function checkoutPhysicalBasket(body, nativeFetch) {
  const token = await requireStorefrontToken();
  const shopInfo = await fetchShopInfo(nativeFetch);
  const basket = extractPhysicalBasket(shopInfo);
  const basketId = firstValue(basket?.id, basket?.basket_id, "");
  if (!basketId) throw statusError("Your physical Selldone basket is empty.", 422);

  const config = getPublicConfig();
  const checkout = normalizeCheckoutPayload(body);
  const configEndpoint = xapiUrl(`/shops/@${shopHandle(config)}/baskets/${encodeURIComponent(String(basketId))}/config`);
  const configPayload = await requestJson(configEndpoint, { nativeFetch, token, method: "PUT", body: checkout });
  const billPayload = await fetchBasketBill(token, nativeFetch).catch(() => configPayload);
  const bill = extractBill(billPayload) || extractBill(configPayload) || {};
  const gateway = resolveGateway(body.gateway_code, bill, shopInfo);
  const gatewayCode = gatewayCodeFrom(gateway);
  if (!gatewayCode) throw statusError("No available Selldone payment gateway was found for this physical basket.", 422);

  const buyEndpoint = xapiUrl(`/shops/@${shopHandle(config)}/basket/${PHYSICAL_BASKET_TYPE}/buy/${encodeURIComponent(gatewayCode)}`);
  const payment = await requestJson(buyEndpoint, {
    nativeFetch,
    token,
    method: "POST",
    body: {
      code: firstValue(basket.code, checkout.code, null),
      amount_check: amountCheck(bill, body),
      amount: amountCheck(bill, body),
      currency: firstValue(checkout.currency, bill.currency, body?.totals?.currency, null),
      return_url: firstValue(body.return_url, `${window.location.origin}${window.location.pathname}#order-success`),
      back_url: firstValue(body.back_url, `${window.location.origin}${window.location.pathname}#checkout`),
    },
  });

  return normalizeCheckoutResult({ gatewayCode, gateway, basket, bill, config: configPayload, payment, endpoint: publicEndpoint(buyEndpoint, "POST") });
}

async function fetchBasketBill(token, nativeFetch) {
  const config = getPublicConfig();
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/basket/${PHYSICAL_BASKET_TYPE}/bill`);
  return requestJson(endpoint, { nativeFetch, token });
}

async function fetchOrderHistory(url, nativeFetch) {
  const token = await requireStorefrontToken();
  const config = getPublicConfig();
  const type = String(url.searchParams.get("type") || "PHYSICAL").toUpperCase();
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/basket/orders-${encodeURIComponent(type)}`);
  endpoint.searchParams.set("limit", clamp(url.searchParams.get("limit"), 1, 100, 40));
  endpoint.searchParams.set("offset", url.searchParams.get("offset") || "0");
  const payload = await requestJson(endpoint, { nativeFetch, token });
  const orders = firstArray(payload.orders, payload.baskets, payload.data?.orders, payload.data?.baskets, payload.result?.orders, payload.payload?.orders);
  return { ...decorateXapiPayload(payload, endpoint, "order_history"), orders, count: orders.length, total: firstValue(payload.total, orders.length) };
}

async function fetchOrderDetail(orderId, nativeFetch) {
  const token = await requireStorefrontToken();
  const config = getPublicConfig();
  const endpoint = xapiUrl(`/shops/@${shopHandle(config)}/baskets/${encodeURIComponent(orderId)}`);
  const payload = await requestJson(endpoint, { nativeFetch, token });
  return {
    ...decorateXapiPayload(payload, endpoint, "order_detail"),
    basketId: orderId,
    basket: firstValue(payload.basket, payload.order, payload.data?.basket, payload.data?.order, payload.data, payload.result, payload.payload, payload),
  };
}

async function subscribeNewsletter(body, nativeFetch) {
  const config = getPublicConfig();
  const streamKey = String(config.STOREFRONT_NEWSLETTER_STREAM_ACCESS_KEY || "").trim();
  const email = String(body?.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw statusError("Enter a valid email address.", 422);
  if (!streamKey) {
    throw statusError("Newsletter stream access key is not configured for static deployment.", 501);
  }
  const endpoint = xapiUrl(`/shops/${encodeURIComponent(String(config.SHOP_ID))}/audience/${encodeURIComponent(streamKey)}`);
  const payload = await requestJson(endpoint, {
    nativeFetch,
    method: "POST",
    body: { email, name: body?.name || "", tags: ["newsletter", "special_offers"] },
  });
  return { ok: true, source: "storefront_newsletter", payload, endpoint: publicEndpoint(endpoint, "POST") };
}

async function requestJson(endpoint, { nativeFetch, token = "", optionalAuth = false, method = "GET", body = null } = {}) {
  const headers = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== null && body !== undefined) headers["Content-Type"] = "application/json";

  const response = await nativeFetch(endpoint.toString(), {
    method,
    headers,
    body: body !== null && body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (optionalAuth && (response.status === 401 || response.status === 403)) return payload;
    throw statusError(readApiMessage(payload) || `Selldone XAPI failed (${response.status}).`, response.status, payload);
  }
  return payload;
}

async function requireStorefrontToken() {
  const token = await storefrontAuth.getAccessToken();
  if (!token) throw statusError("Authentication required.", 401);
  return token;
}

function normalizeBasketPayload(body = {}) {
  const count = Math.max(0, Number.parseInt(firstValue(body.count, body.quantity, 0), 10) || 0);
  const payload = { ...body, count };
  const variantId = firstValue(body.variant_id, body.product_variant_id, body.selected_variant_id, "");
  if (variantId) payload.variant_id = variantId;
  return payload;
}

function normalizeCheckoutPayload(body = {}) {
  return {
    receiver_info: body.receiver_info || body.customer || {},
    delivery_info: body.delivery_info || body.shipping || {},
    billing: body.billing || body.billing_info || body.customer || {},
    form: body.form || {},
    guest_email: body.guest_email || body.customer?.email || "",
    currency: body.currency || body.totals?.currency || "",
    return_url: body.return_url || `${window.location.origin}${window.location.pathname}#order-success`,
    back_url: body.back_url || `${window.location.origin}${window.location.pathname}#checkout`,
  };
}

function normalizeCheckoutResult({ gatewayCode, gateway, basket, bill, config, payment, endpoint }) {
  const targetId = firstValue(payment.target_id, payment.targetId, payment.order_id, payment.orderId, payment.basket_id, payment.basketId, payment.id, null);
  const link = firstValue(payment.link, payment.url, payment.redirect, payment.redirect_url, payment.order_url, null);
  const method = String(firstValue(payment.method, link ? "GET" : "", "")).trim().toUpperCase();
  const stripe = /stripe/i.test(String(gatewayCode || gateway?.code || gateway?.gateway || ""));
  const publicKey = firstValue(gateway?.public?.key, gateway?.public?.publishable_key, gateway?.public_key, gateway?.publishable_key, "");
  return {
    ok: true,
    source: "storefront_checkout",
    gatewayCode,
    gateway: gateway || { code: gatewayCode, title: gatewayCode },
    stripe: stripe ? { publishableKey: publicKey } : null,
    completed: Boolean(payment.payed_by_gift_card || payment.free_order || payment.cod || payment.dir || targetId),
    orderId: targetId,
    basket,
    bill,
    config,
    payment,
    endpoint,
    redirect: link ? { url: link, method: method || "GET", fields: payment.fields || payment.params || payment.pack || {} } : null,
    pending: Boolean(payment.pending || payment.waiting || payment.need_payment),
  };
}

function resolveGateway(requestedGateway, bill = {}, shopPayload = {}) {
  const gateways = firstArray(
    bill.gateways,
    bill.payment_gateways,
    shopPayload.gateways,
    shopPayload.shop?.gateways,
    shopPayload.data?.shop?.gateways,
    shopPayload.payload?.shop?.gateways,
  );
  const requested = String(requestedGateway || "").trim();
  if (requested && requested.toLowerCase() !== "auto") {
    return gateways.find((gateway) => gatewayCodeFrom(gateway) === requested) || { code: requested };
  }
  return gateways.find((gateway) => /stripe/i.test(gatewayCodeFrom(gateway))) || gateways.find((gateway) => gatewayCodeFrom(gateway)) || {};
}

function gatewayCodeFrom(gateway = {}) {
  return String(firstValue(gateway.code, gateway.gateway_code, gateway.gateway, gateway.name, gateway.type, "")).trim();
}

function extractPhysicalBasket(payload = {}) {
  const baskets = firstArray(payload.baskets, payload.data?.baskets, payload.result?.baskets, payload.payload?.baskets, payload.shop?.baskets, payload.data?.shop?.baskets);
  const physical = baskets.find((basket) => String(firstValue(basket.type, basket.product_type, "")).toLowerCase() === PHYSICAL_BASKET_TYPE);
  return firstObject(physical, payload.basket, payload.data?.basket, payload.result?.basket, payload.payload?.basket);
}

function extractBill(payload = {}) {
  return firstObject(payload.bill, payload.data?.bill, payload.result?.bill, payload.payload?.bill, payload.summary, payload.data?.summary);
}

function amountCheck(bill = {}, body = {}) {
  const parsed = Number(
    firstValue(
      bill.sum,
      bill.total,
      bill.final_total,
      bill.payable,
      bill.amount,
      body?.totals?.total,
      body?.bill?.total,
      body?.bill?.sum,
      body?.amount,
      body?.amount_check,
      0,
    ),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function decorateXapiPayload(payload = {}, endpoint, source) {
  const products = firstArray(payload.products, payload.data?.products, payload.result?.products, payload.payload?.products, payload.payload?.data?.products);
  const folders = firstArray(payload.folders, payload.categories, payload.data?.folders, payload.data?.categories, payload.result?.folders);
  const blogs = firstArray(payload.articles, payload.blogs, payload.data?.articles, payload.data?.blogs, payload.result?.articles, payload.result?.blogs);
  return {
    ...payload,
    ok: payload.ok !== false,
    source: `storefront_xapi_${source}`,
    apiBaseUrl: getPublicConfig().STOREFRONT_XAPI_BASE,
    endpoint: publicEndpoint(endpoint),
    products,
    folders,
    categories: folders,
    blogs,
    articles: blogs,
    total: firstValue(payload.total, payload.data?.total, payload.result?.total, products.length || blogs.length || folders.length),
  };
}

function xapiUrl(path) {
  const config = getPublicConfig();
  return new URL(`${config.STOREFRONT_XAPI_BASE}${path}`, window.location.origin);
}

function shopHandle(config = getPublicConfig()) {
  const raw = firstValue(
    config.STOREFRONT_SHOP_HANDLE,
    readMetaContent("pajulina-storefront-shop-handle"),
    readMetaContent("shop-name"),
  );
  const normalized = String(raw || "").trim().replace(/^@+/, "");
  if (!normalized) throw statusError("Storefront shop handle is missing from public config/meta.", 500);
  return encodeURIComponent(normalized);
}

function readMetaContent(name) {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") || "";
}

function publicEndpoint(endpoint, method = "GET") {
  return { method, url: endpoint.toString() };
}

function requestToUrl(input) {
  try {
    return new URL(typeof input === "string" ? input : input?.url, window.location.origin);
  } catch {
    return null;
  }
}

async function readBody(init = {}) {
  if (!init.body) return {};
  if (typeof init.body === "string") {
    try {
      return JSON.parse(init.body);
    } catch {
      return {};
    }
  }
  if (init.body instanceof FormData) return Object.fromEntries(init.body.entries());
  return init.body || {};
}

function jsonResponse(payload, status = 200) {
  const finalStatus = payload?.status && payload.status >= 400 ? payload.status : status;
  return new Response(JSON.stringify(payload), {
    status: finalStatus,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function matchPath(path, pattern) {
  const match = path.match(pattern);
  return match ? decodeURIComponent(match[1]) : "";
}

function normalizePath(path) {
  const value = String(path || "/").replace(/\/+$/, "");
  return value || "/";
}

function clamp(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return String(fallback);
  return String(Math.min(max, Math.max(min, number)));
}

function firstArray(...values) {
  return values.find((value) => Array.isArray(value)) || [];
}

function firstObject(...values) {
  return values.find((value) => value && typeof value === "object" && !Array.isArray(value)) || {};
}

function firstValue(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== "") ?? "";
}

function readApiMessage(payload) {
  if (payload?.error_msg) return String(payload.error_msg);
  if (payload?.error_description) return String(payload.error_description);
  const message = payload?.message || payload?.error;
  if (Array.isArray(message)) return message.join(", ");
  if (message && typeof message === "object") return JSON.stringify(message);
  return String(message || "");
}

function statusError(message, status = 500, payload = null) {
  const error = new Error(message);
  error.status = status;
  error.payload = payload;
  return error;
}




