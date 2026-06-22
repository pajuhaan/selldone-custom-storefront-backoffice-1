import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), ".."));
const DIST_ROOT = join(ROOT, "dist");
const SOURCE_ROOTS = {
  storefront: join(ROOT, "storefront"),
  dashboard: join(ROOT, "dashboard"),
  shared: join(ROOT, "shared"),
  callback: join(ROOT, "callback"),
};

const SOURCE_MODE = !process.argv.includes("--dist");
const env = {
  ...(await readEnvFile(".env")),
  ...process.env,
};

const HOST = env.STATIC_DEV_HOST || "localhost";
const PORT = Number.parseInt(env.STATIC_DEV_PORT || env.PORT || "8788", 10);
const USE_PROXY = env.STATIC_DEV_PROXY === "1";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = createServer(async (request, response) => {
  try {
    setCorsHeaders(response);
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url || "/", requestOrigin(request));
    if (USE_PROXY && url.pathname.startsWith("/__selldone/")) {
      await proxySelldone(request, response, url);
      return;
    }

    if (SOURCE_MODE) {
      serveSourceFile(request, response, url);
    } else {
      serveDistFile(request, response, url);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Static dev server error.";
    sendJson(response, 500, { error: message });
  }
});

server.listen(PORT, HOST, () => {
  const mode = SOURCE_MODE ? "source" : "dist";
  const proxy = USE_PROXY ? "with Selldone proxy" : "without Selldone proxy";
  console.log(`Static dev server (${mode}, ${proxy}) running at http://${HOST}:${PORT}`);
});

function serveSourceFile(request, response, url) {
  const pathname = normalizeUrlPath(url.pathname);
  if (pathname === "/dashboard") {
    redirect(response, "/dashboard/");
    return;
  }
  if (pathname === "/callback") {
    redirect(response, "/callback/");
    return;
  }
  if (pathname.startsWith("/dashboard/")) {
    serveWithFallback(response, SOURCE_ROOTS.dashboard, pathname.slice("/dashboard/".length) || "index.html", "index.html");
    return;
  }
  if (pathname.startsWith("/shared/")) {
    serveFileOr404(response, SOURCE_ROOTS.shared, pathname.slice("/shared/".length));
    return;
  }
  if (pathname.startsWith("/callback/")) {
    serveWithFallback(response, SOURCE_ROOTS.callback, pathname.slice("/callback/".length) || "index.html", "index.html");
    return;
  }
  if (pathname.startsWith("/api/storefront/")) {
    sendJson(response, 501, {
      error: "Static storefront API is browser-intercepted in local static mode.",
      hint: "Load the storefront app so /api/storefront/* requests are handled by storefront/static-storefront-api.js.",
    });
    return;
  }
  serveWithFallback(response, SOURCE_ROOTS.storefront, pathname.slice(1) || "index.html", "index.html");
}

function serveDistFile(request, response, url) {
  const pathname = normalizeUrlPath(url.pathname);
  if (pathname === "/dashboard") {
    redirect(response, "/dashboard/");
    return;
  }
  if (pathname === "/callback") {
    redirect(response, "/callback/");
    return;
  }
  const requested = pathname.slice(1) || "index.html";
  if (serveExistingFile(response, DIST_ROOT, requested)) return;
  if (pathname.startsWith("/dashboard/")) {
    serveFileOr404(response, DIST_ROOT, "dashboard/index.html");
    return;
  }
  if (pathname.startsWith("/callback/")) {
    serveFileOr404(response, DIST_ROOT, "callback/index.html");
    return;
  }
  if (!extname(pathname)) {
    serveFileOr404(response, DIST_ROOT, "index.html");
    return;
  }
  sendText(response, 404, "text/plain; charset=utf-8", "Not found");
}

function serveWithFallback(response, root, requestedPath, fallbackPath) {
  if (serveExistingFile(response, root, requestedPath)) return;
  if (!extname(requestedPath)) {
    serveFileOr404(response, root, fallbackPath);
    return;
  }
  sendText(response, 404, "text/plain; charset=utf-8", "Not found");
}

function serveExistingFile(response, root, requestedPath) {
  const filePath = safeResolve(root, requestedPath);
  if (!filePath || !existsSync(filePath)) return false;
  const stat = statSync(filePath);
  if (!stat.isFile()) return false;
  response.writeHead(200, {
    "Content-Type": MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
  return true;
}

function serveFileOr404(response, root, requestedPath) {
  if (!serveExistingFile(response, root, requestedPath)) {
    sendText(response, 404, "text/plain; charset=utf-8", "Not found");
  }
}

async function proxySelldone(request, response, url) {
  const routes = [
    ["/__selldone/xapi", env.STOREFRONT_XAPI_REMOTE || "https://xapi.selldone.com"],
    ["/__selldone/api", env.API_REMOTE || "https://api.selldone.com"],
    ["/__selldone/auth", env.SELLDONE_REMOTE || "https://selldone.com"],
  ];
  const route = routes.find(([prefix]) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
  if (!route) {
    sendJson(response, 404, { error: "Unknown Selldone proxy route." });
    return;
  }

  const [prefix, targetBase] = route;
  const upstreamPath = url.pathname.slice(prefix.length) || "/";
  const upstreamUrl = `${String(targetBase).replace(/\/+$/, "")}${upstreamPath}${url.search}`;
  const body = ["GET", "HEAD"].includes(request.method || "GET") ? undefined : await readRequestBody(request);
  const headers = proxyRequestHeaders(request.headers, body);
  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
    ...(body ? { duplex: "half" } : {}),
  });

  const responseHeaders = proxyResponseHeaders(upstream.headers);
  setCorsHeaders(responseHeaders);
  response.writeHead(upstream.status, responseHeaders);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  const buffer = Buffer.from(await upstream.arrayBuffer());
  response.end(buffer);
}

function proxyRequestHeaders(sourceHeaders, body) {
  const blocked = new Set([
    "accept-encoding",
    "connection",
    "content-length",
    "host",
    "origin",
    "referer",
    "transfer-encoding",
  ]);
  const headers = {};
  for (const [key, value] of Object.entries(sourceHeaders)) {
    if (blocked.has(key.toLowerCase()) || value === undefined) continue;
    headers[key] = Array.isArray(value) ? value.join(", ") : String(value);
  }
  if (body) headers["content-length"] = String(body.length);
  return headers;
}

function proxyResponseHeaders(sourceHeaders) {
  const blocked = new Set([
    "content-encoding",
    "content-length",
    "connection",
    "transfer-encoding",
  ]);
  const headers = {};
  sourceHeaders.forEach((value, key) => {
    if (!blocked.has(key.toLowerCase())) headers[key] = value;
  });
  headers["Cache-Control"] = "no-store";
  return headers;
}

function readRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolveBody(Buffer.concat(chunks)));
    request.on("error", rejectBody);
  });
}

function redirect(response, location) {
  response.writeHead(308, { Location: location });
  response.end();
}

function sendText(response, status, contentType, text) {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  response.end(text);
}

function sendJson(response, status, payload) {
  sendText(response, status, "application/json; charset=utf-8", JSON.stringify(payload, null, 2));
}

function setCorsHeaders(target) {
  target.setHeader?.("Access-Control-Allow-Origin", "*");
  target.setHeader?.("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD");
  target.setHeader?.("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,X-Requested-With");
  if (!target.setHeader) {
    target["Access-Control-Allow-Origin"] = "*";
    target["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD";
    target["Access-Control-Allow-Headers"] = "Authorization,Content-Type,Accept,X-Requested-With";
  }
}

function normalizeUrlPath(pathname) {
  try {
    return decodeURIComponent(pathname || "/").replace(/\\/g, "/");
  } catch {
    return "/";
  }
}

function safeResolve(root, requestedPath) {
  const relative = normalize(String(requestedPath || "")).replace(/^(\.\.(?:[\\/]|$))+/, "");
  const filePath = resolve(root, relative);
  const rootPath = resolve(root);
  return filePath === rootPath || filePath.startsWith(`${rootPath}${sep}`) ? filePath : "";
}

function requestOrigin(request) {
  const host = request.headers.host || `${HOST}:${PORT}`;
  return `http://${host}`;
}

async function readEnvFile(name) {
  const path = join(ROOT, name);
  if (!existsSync(path)) return {};
  const text = await readFile(path, "utf8");
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    result[match[1]] = unquote(match[2]);
  }
  return result;
}

function unquote(value) {
  const text = String(value || "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).replaceAll("\\n", "\n").replaceAll('\\"', '"');
  }
  return text.replace(/\s+#.*$/, "");
}
