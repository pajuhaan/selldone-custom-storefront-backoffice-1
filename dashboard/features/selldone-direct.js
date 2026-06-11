const TOKEN_STORAGE_KEY = "pajulina_direct_access_token";

export function createSelldoneDirectClient({ requestSession, onAuthExpired }) {
  let session = null;

  function setSession(nextSession = {}) {
    session = nextSession;
    if (nextSession.accessToken) {
      sessionStorage.setItem(
        TOKEN_STORAGE_KEY,
        JSON.stringify({
          accessToken: nextSession.accessToken,
          expiresAt: nextSession.tokenExpiresAt || 0,
          apiBaseUrl: nextSession.apiBaseUrl,
        }),
      );
    }
  }

  async function refreshSession() {
    const nextSession = await requestSession();
    setSession(nextSession || {});
    if (!nextSession?.authenticated || !nextSession?.accessToken) {
      onAuthExpired?.("Your Selldone session expired.");
      return null;
    }
    return nextSession;
  }

  function getAccessToken() {
    if (session?.accessToken) return session.accessToken;
    try {
      const stored = JSON.parse(sessionStorage.getItem(TOKEN_STORAGE_KEY) || "{}");
      if (stored.accessToken) return stored.accessToken;
    } catch {
      return "";
    }
    return "";
  }

  function getApiBaseUrl() {
    return session?.apiBaseUrl || session?.apiBase || "https://api.selldone.com";
  }

  async function request(path, options = {}, canRetry = true) {
    const token = getAccessToken();
    if (!token) {
      const refreshed = await refreshSession();
      if (!refreshed?.accessToken) return null;
    }

    const url = buildApiUrl(getApiBaseUrl(), path, options.query || {});
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
      "X-Requested-With": "XMLHttpRequest",
      ...(options.headers || {}),
    };
    const init = {
      method: options.method || "GET",
      headers,
    };

    if (options.body !== undefined && options.body !== null) {
      headers["Content-Type"] = "application/json";
      init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const response = await fetch(url, init);
    if (response.status === 401 && canRetry) {
      const refreshed = await refreshSession();
      if (refreshed?.accessToken) return request(path, options, false);
    }

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.toLowerCase().includes("application/json");
    const payload = isJson ? await response.json().catch(() => ({})) : {};
    if (!response.ok) {
      const error = new Error(readApiMessage(payload) || `Selldone API failed: ${response.status}`);
      error.status = response.status;
      error.apiPath = path;
      error.apiPayload = payload;
      throw error;
    }
    return payload;
  }

  async function safeEndpoint(key, query = {}) {
    const endpoint = session?.endpoints?.[key];
    if (!endpoint) {
      return {
        ok: false,
        label: key,
        source: "direct",
        data: fallbackFor(key),
        error: { label: key, status: 404, message: `Endpoint "${key}" is not configured.` },
      };
    }

    try {
      return {
        ok: true,
        label: endpoint.label || key,
        source: "direct",
        data: await request(endpoint.path, { query: { ...(endpoint.query || {}), ...query } }),
      };
    } catch (error) {
      return {
        ok: false,
        label: endpoint.label || key,
        source: "direct",
        data: fallbackFor(key),
        error: {
          label: endpoint.label || key,
          status: error.status || 500,
          message: formatSelldoneError(error),
          code: getSelldoneErrorCode(error),
        },
      };
    }
  }

  async function safeRequest(label, fallbackData, task) {
    try {
      return {
        ok: true,
        label,
        source: "direct",
        data: await task(),
      };
    } catch (error) {
      return {
        ok: false,
        label,
        source: "direct",
        data: fallbackData,
        error: {
          label,
          status: error.status || 500,
          message: formatSelldoneError(error),
          code: getSelldoneErrorCode(error),
        },
      };
    }
  }

  function defaultGatewayCurrency() {
    const firstCurrency = Array.isArray(session?.shop?.currencies) ? session.shop.currencies[0] : "";
    return (
      session?.shop?.currency ||
      session?.shop?.default_currency ||
      firstCurrency?.code ||
      firstCurrency?.currency ||
      (typeof firstCurrency === "string" ? firstCurrency : "") ||
      "USD"
    );
  }

  async function loadDashboard() {
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
      contactsResult,
      gatewaysResult,
      availableGatewaysResult,
    ] = await Promise.all([
      safeEndpoint("products"),
      safeEndpoint("categories"),
      safeEndpoint("orders"),
      safeEndpoint("customers"),
      safeEndpoint("shopAnalytics"),
      safeEndpoint("blogs"),
      safeEndpoint("blogTimeline"),
      safeEndpoint("blogTags"),
      safeEndpoint("notifications"),
      safeRequest("Contacts", fallbackFor("contacts"), () => contacts({ offset: 0, limit: 20, sortBy: "updated_at", sortDesc: "true" })),
      safeRequest("Payment Gateways", fallbackFor("gateways"), () => gateways()),
      safeRequest("Available Gateways", fallbackFor("availableGateways"), () => availableGateways(defaultGatewayCurrency())),
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
    const contactsPayload = contactsResult.data;
    const gatewaysPayload = gatewaysResult.data;
    const availableGatewaysPayload = availableGatewaysResult.data;
    const categories = categoriesPayload.categories || categoriesPayload.folders || [];
    const customers = customerListFromPayload(customersPayload);
    const notifications = notificationsPayload.notifications || [];
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
      contactsResult,
      gatewaysResult,
      availableGatewaysResult,
    ]
      .filter((result) => !result.ok)
      .map((result) => result.error);

    return {
      fetchedAt: new Date().toISOString(),
      shop: session?.shop,
      apiBaseUrl: getApiBaseUrl(),
      source: "browser-direct",
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
      contacts: contactListFromPayload(contactsPayload),
      contactTotal: contactsPayload.total || contactListFromPayload(contactsPayload).length || 0,
      paymentGateways: gatewayListFromPayload(gatewaysPayload),
      availableGateways: gatewayListFromPayload(availableGatewaysPayload),
      gatewayCurrency: defaultGatewayCurrency(),
      gatewayTransactions: [],
      gatewayTransactionTotal: 0,
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

  async function loadProfile() {
    const payload = await request("/profiles/me", { query: { offset: 0, count: 1 } });
    const profile = normalizeUserProfile(payload, getApiBaseUrl());
    if (profile.id) {
      profile.avatarUrl = await loadProfileAvatar(profile.id).catch(() => "");
    }
    return profile;
  }

  async function loadProfileAvatar(profileId) {
    const response = await fetch(`${getApiBaseUrl()}/profile/image/${profileId}/avatar92.jpg`, {
      headers: {
        Accept: "image/*",
        Authorization: `Bearer ${getAccessToken()}`,
      },
    });
    if (!response.ok) return "";
    return URL.createObjectURL(await response.blob());
  }

  function customers(query = {}) {
    return endpointRequest("customers", query);
  }

  function customerDetail(customerId) {
    return request(`/shops/${session.shop.id}/customers/${customerId}`);
  }

  function updateCustomer(customerId, body) {
    return request(`/shops/${session.shop.id}/customers/${customerId}`, { method: "PUT", body });
  }

  function notifications(query = {}) {
    return endpointRequest("notifications", query);
  }

  function contacts(query = {}) {
    return request(`/shops/${session.shop.id}/contacts`, {
      query: { offset: 0, limit: 20, sortBy: "updated_at", sortDesc: "true", ...query },
    });
  }

  function gateways() {
    return request(`/shops/${session.shop.id}/gateways`);
  }

  function availableGateways(currency = defaultGatewayCurrency()) {
    return request(`/shops/${session.shop.id}/available-gateways/${encodeURIComponent(currency || "USD")}`);
  }

  function setGateway(gatewayCode, body) {
    return request(`/shops/${session.shop.id}/gateways/${encodeURIComponent(gatewayCode)}`, { method: "POST", body });
  }

  function setGatewayConfig(gatewayCode, body) {
    return request(`/shops/${session.shop.id}/gateways/${encodeURIComponent(gatewayCode)}/config`, { method: "PUT", body });
  }

  function deleteGateway(gatewayCode) {
    return request(`/shops/${session.shop.id}/gateways/${encodeURIComponent(gatewayCode)}`, { method: "DELETE" });
  }

  function gatewayTransactions(gatewayCode, query = {}) {
    return request(`/shops/${session.shop.id}/gateways/${encodeURIComponent(gatewayCode)}/transactions`, {
      query: { offset: 0, limit: 20, sortBy: "id", sortDesc: "true", ...query },
    });
  }

  function blogs(query = {}) {
    return endpointRequest("blogs", query);
  }

  async function saveBlogArticle(payload, tags = []) {
    const { tags: ignoredTags, ...articlePayload } = payload || {};
    const data = await request("/article/shop-blog/edit", {
      method: "POST",
      body: {
        ...articlePayload,
        shop_id: session.shop.id,
      },
    });
    const articleId = data?.article?.id || data?.id || articlePayload.article_id;
    let tagsResult = null;
    if (articleId && Array.isArray(tags)) {
      tagsResult = await request(`/shops/${session.shop.id}/articles/tags/${articleId}`, {
        method: "POST",
        body: { tags },
      });
    }
    return { data, tags: tagsResult };
  }

  function deleteBlogArticle(articleId) {
    return request(`/article/shop-blog/${articleId}`, { method: "DELETE" });
  }

  function updateProduct(productId, body) {
    return request(`/shops/${session.shop.id}/products/${productId}/edit`, { method: "PUT", body });
  }

  function deleteProduct(productId) {
    return request(`/shops/${session.shop.id}/products/${productId}/delete`, { method: "DELETE" });
  }

  function endpointRequest(key, query = {}) {
    const endpoint = session?.endpoints?.[key];
    if (!endpoint) throw new Error(`Endpoint "${key}" is not configured.`);
    return request(endpoint.path, { query: { ...(endpoint.query || {}), ...query } });
  }

  return {
    setSession,
    refreshSession,
    request,
    loadDashboard,
    loadProfile,
    customers,
    customerDetail,
    updateCustomer,
    notifications,
    contacts,
    gateways,
    availableGateways,
    setGateway,
    setGatewayConfig,
    deleteGateway,
    gatewayTransactions,
    blogs,
    saveBlogArticle,
    deleteBlogArticle,
    updateProduct,
    deleteProduct,
  };
}

function buildApiUrl(baseUrl, path, params = {}) {
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

function firstArray(...values) {
  return values.find((value) => Array.isArray(value)) || [];
}

function articleListFromPayload(payload = {}) {
  return firstArray(payload.articles, payload.blogs, payload.data, payload.items, payload.results);
}

function customerListFromPayload(payload = {}) {
  return firstArray(payload.customers, payload.data, payload.items, payload.results);
}

function contactListFromPayload(payload = {}) {
  return firstArray(payload.contacts, payload.data, payload.items, payload.results);
}

function gatewayListFromPayload(payload = {}) {
  return firstArray(payload.shop_gateways, payload.gateways, payload.data, payload.items, payload.results);
}

function fallbackFor(key) {
  return {
    products: { products: [], total: 0 },
    categories: { categories: [], total: 0 },
    orders: { orders: [], total: 0, statuses: ["Open", "Reserved", "Payed", "COD", "Canceled"] },
    customers: { customers: [], total: 0 },
    shopAnalytics: { data: [], orderQue: [], avocadoQue: [] },
    blogs: { articles: [], total: 0 },
    blogTimeline: { timeline: [] },
    blogTags: { tags: [] },
    notifications: { notifications: [], total: 0 },
    contacts: { contacts: [], total: 0 },
    gateways: { shop_gateways: [], data: [] },
    availableGateways: { gateways: [], data: [] },
  }[key] || {};
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

function isGoogleTwoFactorError(error) {
  return readApiMessage(error.apiPayload).toLowerCase().includes("google2fa") || String(error.message || "").toLowerCase().includes("google2fa");
}

function isTokenAccessDeniedError(error) {
  return Number(error.apiPayload?.code) === 201 || /does not have access|missing_scope|permission|forbidden/i.test(readApiMessage(error.apiPayload) || String(error.message || ""));
}

function formatSelldoneError(error) {
  if (isGoogleTwoFactorError(error)) return "Selldone requires Google 2FA verification for this backoffice endpoint.";
  if (isTokenAccessDeniedError(error)) return "Reconnect with consent to grant this Selldone backoffice section access.";
  return error.message || "Request failed";
}

function getSelldoneErrorCode(error) {
  if (isTokenAccessDeniedError(error)) return "selldone_token_access_denied";
  return isGoogleTwoFactorError(error) ? "selldone_google_2fa_required" : null;
}

function normalizeUserProfile(payload = {}, apiBaseUrl = "https://api.selldone.com") {
  const profile = payload.profile || (Array.isArray(payload.profiles) ? payload.profiles[0] : null) || {};
  const name = profile.name || profile.full_name || profile.title || "Selldone user";
  const email = profile.email || "";
  const id = Number(profile.id || 0);

  return {
    id,
    name,
    email,
    avatarUrl: id ? `${apiBaseUrl}/profile/image/${id}/avatar92.jpg` : "",
  };
}
