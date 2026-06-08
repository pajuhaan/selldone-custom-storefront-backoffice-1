import { API_BASE, AUTH_PROMPT, SCOPES, SHOP, SHOP_ID } from "./config.mjs";
import { ensureAccessToken, handleCallback, startAuth } from "./auth.mjs";
import { clearStoredTokens } from "./token-store.mjs";
import { destroySession, getSession } from "./session.mjs";
import { cookie, getOrigin, parseCookies, readJsonBody, redirect, sendJson } from "./http.mjs";
import {
  articleIdFromApiPath,
  articleListFromPayload,
  callBlogsEndpoint,
  callProductsEndpoint,
  dashboardPayload,
  fallbackUserProfile,
  productIdFromApiPath,
  publicEndpointConfig,
  sanitizeArticleUpdatePayload,
  sanitizeProductUpdatePayload,
  selldoneApiRequest,
  sendProfileAvatar,
  userProfilePayload,
} from "./selldone-api.mjs";
import { serveStatic } from "./static.mjs";
import { handleStorefrontApi } from "./storefront-api.mjs";
import { handleSetupRoutes, shouldRedirectToSetup } from "../setup/setup-routes.mjs";

export function createRequestHandler() {
  return async (req, res) => {
    const url = new URL(req.url, getOrigin(req));

    try {
      if (url.pathname.startsWith("/setup")) {
        if (await handleSetupRoutes(req, res, url)) return;
      }

      if (shouldRedirectToSetup(url)) {
        redirect(res, "/setup/");
        return;
      }

      if (url.pathname === "/auth/start") {
        await startAuth(req, res);
        return;
      }

      if (url.pathname === "/callback") {
        await handleCallback(req, res, url);
        return;
      }

      if (url.pathname === "/auth/logout") {
        const cookies = parseCookies(req);
        destroySession(cookies.pajulina_dashboard_sid);
        clearStoredTokens();
        redirect(res, "/dashboard/", { "Set-Cookie": cookie("pajulina_dashboard_sid", "", { maxAge: 0, httpOnly: true }) });
        return;
      }

      if (url.pathname === "/api/session") {
        const session = getSession(req, res);
        let authenticated = false;
        let user = fallbackUserProfile();
        try {
          authenticated = Boolean(await ensureAccessToken(session));
          if (authenticated) {
            user = await userProfilePayload(session);
          }
        } catch {
          authenticated = false;
        }
        sendJson(res, 200, {
          authenticated,
          loginUrl: "/auth/start",
          authPrompt: AUTH_PROMPT,
          shop: SHOP,
          user,
          scopes: SCOPES,
        });
        return;
      }

      if (url.pathname === "/api/profile/avatar") {
        const session = getSession(req, res);
        await sendProfileAvatar(req, res, session, url);
        return;
      }

      if (url.pathname === "/api/debug/endpoints") {
        sendJson(res, 200, {
          apiBaseUrl: API_BASE,
          authorization: "Bearer token is sent server-side only",
          endpoints: publicEndpointConfig(),
        });
        return;
      }

      if (url.pathname.startsWith("/api/storefront/")) {
        if (await handleStorefrontApi(req, res, url)) return;
        sendJson(res, 404, { error: "Storefront API route not found" });
        return;
      }

      if (url.pathname === "/api/products") {
        const session = getSession(req, res);
        const token = await ensureAccessToken(session);
        if (!token) {
          sendJson(res, 401, { error: "Authentication required" });
          return;
        }
        const result = await callProductsEndpoint(session);
        sendJson(res, result.ok ? 200 : result.error.status || 502, {
          ok: result.ok,
          source: result.source,
          apiBaseUrl: API_BASE,
          endpoint: publicEndpointConfig().products,
          count: Array.isArray(result.data.products) ? result.data.products.length : 0,
          total: result.data.total || 0,
          products: result.data.products || [],
          error: result.error || null,
        });
        return;
      }

      if (url.pathname === "/api/blogs" && req.method === "GET") {
        const session = getSession(req, res);
        const token = await ensureAccessToken(session);
        if (!token) {
          sendJson(res, 401, { error: "Authentication required" });
          return;
        }
        const result = await callBlogsEndpoint(session);
        sendJson(res, result.ok ? 200 : result.error.status || 502, {
          ok: result.ok,
          source: result.source,
          apiBaseUrl: API_BASE,
          endpoint: publicEndpointConfig().blogs,
          count: articleListFromPayload(result.data).length,
          total: result.data.total || articleListFromPayload(result.data).length || 0,
          articles: articleListFromPayload(result.data),
          error: result.error || null,
        });
        return;
      }

      if (url.pathname === "/api/blogs" && req.method === "POST") {
        const session = getSession(req, res);
        const token = await ensureAccessToken(session);
        if (!token) {
          sendJson(res, 401, { error: "Authentication required" });
          return;
        }
        const rawPayload = await readJsonBody(req);
        const tags = sanitizeArticleTags(rawPayload.tags);
        const payload = sanitizeArticleUpdatePayload(rawPayload);
        if (!payload.title || !payload.body) {
          sendJson(res, 400, { error: "Article title and body are required." });
          return;
        }
        const result = await saveBlogArticle(session, payload, tags);
        sendJson(res, 200, {
          ok: true,
          source: "backoffice",
          apiBaseUrl: API_BASE,
          endpoint: {
            method: "POST",
            path: "/article/shop-blog/edit",
          },
          ...result,
        });
        return;
      }

      const apiProductId = productIdFromApiPath(url.pathname);
      if (apiProductId && req.method === "PUT") {
        const session = getSession(req, res);
        const token = await ensureAccessToken(session);
        if (!token) {
          sendJson(res, 401, { error: "Authentication required" });
          return;
        }
        const payload = sanitizeProductUpdatePayload(await readJsonBody(req));
        if (!Object.keys(payload).length) {
          sendJson(res, 400, { error: "No editable product fields were provided." });
          return;
        }
        const data = await selldoneApiRequest(session, {
          method: "PUT",
          path: `/shops/${SHOP_ID}/products/${apiProductId}/edit`,
          body: payload,
        });
        sendJson(res, 200, {
          ok: true,
          source: "backoffice",
          apiBaseUrl: API_BASE,
          endpoint: {
            method: "PUT",
            path: `/shops/${SHOP_ID}/products/${apiProductId}/edit`,
          },
          data,
        });
        return;
      }

      if (apiProductId && req.method === "DELETE") {
        const session = getSession(req, res);
        const token = await ensureAccessToken(session);
        if (!token) {
          sendJson(res, 401, { error: "Authentication required" });
          return;
        }
        const data = await selldoneApiRequest(session, {
          method: "DELETE",
          path: `/shops/${SHOP_ID}/products/${apiProductId}/delete`,
        });
        sendJson(res, 200, {
          ok: true,
          source: "backoffice",
          apiBaseUrl: API_BASE,
          endpoint: {
            method: "DELETE",
            path: `/shops/${SHOP_ID}/products/${apiProductId}/delete`,
          },
          data,
        });
        return;
      }

      const apiArticleId = articleIdFromApiPath(url.pathname);
      if (apiArticleId && req.method === "PUT") {
        const session = getSession(req, res);
        const token = await ensureAccessToken(session);
        if (!token) {
          sendJson(res, 401, { error: "Authentication required" });
          return;
        }
        const rawPayload = await readJsonBody(req);
        const tags = sanitizeArticleTags(rawPayload.tags);
        const payload = sanitizeArticleUpdatePayload({ ...rawPayload, article_id: apiArticleId });
        if (!payload.title || !payload.body) {
          sendJson(res, 400, { error: "Article title and body are required." });
          return;
        }
        const result = await saveBlogArticle(session, payload, tags);
        sendJson(res, 200, {
          ok: true,
          source: "backoffice",
          apiBaseUrl: API_BASE,
          endpoint: {
            method: "POST",
            path: "/article/shop-blog/edit",
          },
          ...result,
        });
        return;
      }

      if (apiArticleId && req.method === "DELETE") {
        const session = getSession(req, res);
        const token = await ensureAccessToken(session);
        if (!token) {
          sendJson(res, 401, { error: "Authentication required" });
          return;
        }
        const data = await selldoneApiRequest(session, {
          method: "DELETE",
          path: `/article/shop-blog/${apiArticleId}`,
        });
        sendJson(res, 200, {
          ok: true,
          source: "backoffice",
          apiBaseUrl: API_BASE,
          endpoint: {
            method: "DELETE",
            path: `/article/shop-blog/${apiArticleId}`,
          },
          data,
        });
        return;
      }

      if (url.pathname === "/api/dashboard") {
        const session = getSession(req, res);
        const token = await ensureAccessToken(session);
        if (!token) {
          sendJson(res, 401, { error: "Authentication required" });
          return;
        }
        sendJson(res, 200, await dashboardPayload(session));
        return;
      }

      serveStatic(req, res, url);
    } catch (error) {
      const status = error.status || 500;
      console.error(
        JSON.stringify({
          level: "error",
          source: "dashboard_server",
          status,
          path: url.pathname,
          message: error.message,
          apiPath: error.apiPath || null,
        }),
      );
      sendJson(res, status, { error: error.message || "Dashboard server error" });
    }
  };
}

async function saveBlogArticle(session, payload, tags) {
  const data = await selldoneApiRequest(session, {
    method: "POST",
    path: "/article/shop-blog/edit",
    body: {
      ...payload,
      shop_id: SHOP_ID,
    },
  });
  const articleId = data?.article?.id || data?.id || payload.article_id;
  let tagsResult = null;
  if (articleId && Array.isArray(tags)) {
    tagsResult = await selldoneApiRequest(session, {
      method: "POST",
      path: `/shops/${SHOP_ID}/articles/tags/${articleId}`,
      body: { tags },
    });
  }

  return { data, tags: tagsResult };
}

function sanitizeArticleTags(value) {
  const source = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : [];
  return Array.from(new Set(source.map((item) => String(item || "").trim()).filter(Boolean))).slice(0, 24);
}
