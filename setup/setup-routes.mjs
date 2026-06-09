import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { reloadRuntimeConfig, ROOT } from "../server/config.mjs";
import { cookie, readJsonBody, redirect, sendJson } from "../server/http.mjs";
import { clearStoredTokens } from "../server/token-store.mjs";
import { DEFAULT_SCOPES, getRuntimeConfig, isSetupComplete, saveSetupEnv } from "./env.mjs";

const SETUP_PREFIX = "/setup";
const SETUP_PUBLIC_ROOT = join(ROOT, "setup", "public");

export function shouldRedirectToSetup(url) {
  return !isSetupComplete() && !url.pathname.startsWith(`${SETUP_PREFIX}`);
}

export async function handleSetupRoutes(req, res, url) {
  if (url.pathname === SETUP_PREFIX) {
    redirect(res, `${SETUP_PREFIX}/`);
    return true;
  }

  if (url.pathname === `${SETUP_PREFIX}/api/status` && req.method === "GET") {
    sendJson(res, 200, setupStatusPayload());
    return true;
  }

  if (url.pathname === `${SETUP_PREFIX}/api/manual` && req.method === "POST") {
    const body = await readJsonBody(req);
    const updates = setupUpdatesFromBody(body);
    const validation = validateSetupInput(updates);
    if (validation) {
      sendJson(res, 400, { ok: false, error: validation });
      return true;
    }
    const config = saveSetupEnv(updates);
    reloadRuntimeConfig();
    clearStoredTokens();
    redirectSetupSessionCookie(res);
    sendJson(res, 200, { ok: true, mode: "manual", config: publicConfig(config), next: "/auth/start" });
    return true;
  }

  if (url.pathname === `${SETUP_PREFIX}/api/auto` && req.method === "POST") {
    const body = await readJsonBody(req);
    const inferred = setupUpdatesFromMcpResult(body);
    if (inferred.CLIENT_ID && inferred.SHOP_ID) {
      const config = saveSetupEnv({
        ...setupUpdatesFromBody(body),
        ...inferred,
      });
      reloadRuntimeConfig();
      clearStoredTokens();
      redirectSetupSessionCookie(res);
      sendJson(res, 200, { ok: true, mode: "auto_mcp_result", config: publicConfig(config), next: "/auth/start" });
      return true;
    }
    sendJson(res, 409, {
      ok: false,
      code: "mcp_bridge_required",
      error: "Automatic client creation requires a Selldone MCP bridge or a pasted MCP client result. Standalone packages should use Manual setup.",
      mcp: mcpOnboardingGuide(),
      directApi: directApiOnboardingGuide(),
    });
    return true;
  }

  if (url.pathname.startsWith(`${SETUP_PREFIX}/`)) {
    serveSetupStatic(res, url.pathname.slice(SETUP_PREFIX.length) || "/");
    return true;
  }

  return false;
}

function serveSetupStatic(res, requestedPath) {
  const requested = requestedPath === "/" ? "/index.html" : requestedPath;
  const safePath = normalize(decodeURIComponent(requested)).replace(/^[/\\]+/, "").replace(/^(\.\.[/\\])+/, "");
  let filePath = join(SETUP_PUBLIC_ROOT, safePath);
  const allowedRoot = normalize(SETUP_PUBLIC_ROOT);

  if (!normalize(filePath).startsWith(allowedRoot) || !existsSync(filePath)) {
    filePath = join(SETUP_PUBLIC_ROOT, "index.html");
  }

  if (statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  const type =
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
    }[extname(filePath)] || "application/octet-stream";

  res.writeHead(200, { "Content-Type": type });
  createReadStream(filePath).pipe(res);
}

function setupStatusPayload() {
  const config = getRuntimeConfig();
  return {
    ok: true,
    setupComplete: isSetupComplete(),
    config: publicConfig(config),
    defaults: publicConfig({ ...config, ...getRuntimeConfig() }),
    mcp: mcpOnboardingGuide(),
    directApi: directApiOnboardingGuide(),
    notes: [
      "Manual setup writes CLIENT_ID and SHOP_ID to .env, then starts OAuth authentication.",
      "Automatic setup is possible through Selldone MCP. A standalone local server cannot call MCP unless a bridge posts the MCP result back to this setup API.",
    ],
  };
}

function setupUpdatesFromBody(body = {}) {
  const scopes = Array.isArray(body.scopes)
    ? body.scopes
    : typeof body.scopes === "string"
      ? body.scopes
      : DEFAULT_SCOPES;
  return {
    CLIENT_ID: body.clientId || body.client_id || body.CLIENT_ID,
    SHOP_ID: body.shopId || body.shop_id || body.SHOP_ID,
    SHOP_NAME: body.shopName || body.shop_name || body.SHOP_NAME,
    SHOP_DOMAIN: body.shopDomain || body.shop_domain || body.SHOP_DOMAIN,
    STOREFRONT_SHOP_HANDLE: body.storefrontShopHandle || body.storefront_shop_handle || body.STOREFRONT_SHOP_HANDLE,
    APP_BASE_URL: body.appBaseUrl || body.app_base_url || body.APP_BASE_URL,
    AUTH_PROMPT: body.authPrompt || body.auth_prompt || body.AUTH_PROMPT,
    SCOPES: Array.isArray(scopes) ? scopes.join(",") : scopes,
  };
}

function setupUpdatesFromMcpResult(body = {}) {
  const source = typeof body.mcpResult === "string" ? parseJsonSafe(body.mcpResult) : body.mcpResult || body;
  const client = source.client || source.oauth_client || source.data?.client || source.data || source.clients?.[0] || source;
  const shop = source.shop || source.current_shop || source;
  return {
    CLIENT_ID: client.client_id || client.clientId || client.id || source.client_id || source.clientId || source.id || "",
    SHOP_ID: shop.shop_id || shop.shopId || shop.id || source.shop_id || source.shopId || "",
    SHOP_NAME: shop.name || source.shop_name || source.shopName || "",
    SHOP_DOMAIN: shop.domain || source.shop_domain || source.shopDomain || "",
  };
}

function validateSetupInput(updates) {
  if (!String(updates.CLIENT_ID || "").trim()) return "Client ID is required.";
  if (!Number.isFinite(Number.parseInt(updates.SHOP_ID, 10))) return "Shop ID must be a number.";
  if (!String(updates.STOREFRONT_SHOP_HANDLE || "").trim()) return "Storefront shop handle is required.";
  return "";
}

function publicConfig(config) {
  return {
    clientId: config.CLIENT_ID,
    shopId: config.SHOP_ID || String(config.shopId || ""),
    shopName: config.SHOP_NAME,
    shopDomain: config.SHOP_DOMAIN,
    storefrontShopHandle: config.STOREFRONT_SHOP_HANDLE,
    appBaseUrl: config.APP_BASE_URL,
    callbackUrl: `${String(config.APP_BASE_URL || "").replace(/\/$/, "")}${config.CALLBACK_PATH || "/callback"}`,
    authPrompt: config.AUTH_PROMPT,
    scopes: Array.isArray(config.scopes) ? config.scopes : DEFAULT_SCOPES,
  };
}

function mcpOnboardingGuide() {
  return {
    tool: "Create or update a shop-bound dashboard OAuth client",
    endpointToolHint: "selldone_dashboard_oauth_client_upsert",
    currentMcpToolId: "mcp__codex_apps__selldone_mcp___pajulina___chatgp._a78aa80dbbb0",
    parameters: {
      confirm: true,
      app_type: "public_spa",
      name: "Pajulina Local Operations Dashboard",
      local_callback_urls: ["http://localhost:5173/callback", "http://127.0.0.1:5173/callback"],
      allow_development_wildcard_redirects: true,
      requested_scopes: ["profile", "backoffice:shop:read", "backoffice:shop:write", "backoffice:product:read", "backoffice:category:read", "backoffice:order:read", "backoffice:report:read", "articles"],
    },
    expectedResult: "client_id and shop_id. Save them to .env, then redirect the admin to /auth/start.",
  };
}

function directApiOnboardingGuide() {
  return {
    method: "POST",
    path: "/shops/{shop_id}/clients",
    baseUrl: "https://api.selldone.com",
    auth: "Authorization: Bearer <access_token> with backoffice:shop:write",
    body: {
      name: "Pajulina Local Operations Dashboard",
      redirect: "http://localhost:5173/callback,http://127.0.0.1:5173/callback",
      public_client: true,
    },
    limitation: "This direct API still requires an existing authenticated token, so it cannot bootstrap a first client without MCP or another trusted client.",
  };
}

function redirectSetupSessionCookie(res) {
  res.setHeader("Set-Cookie", cookie("pajulina_dashboard_sid", "", { maxAge: 0, httpOnly: true }));
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
