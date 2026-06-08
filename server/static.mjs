import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { ROOT } from "./config.mjs";

const DASHBOARD_PREFIX = "/dashboard";
const STOREFRONT_PREFIX = "/storefront";
const DASHBOARD_ROOT = join(ROOT, "dashboard");
const STOREFRONT_ROOT = join(ROOT, "storefront");

export function serveStatic(req, res, url) {
  if (url.pathname === DASHBOARD_PREFIX) {
    res.writeHead(308, { Location: `${DASHBOARD_PREFIX}/` });
    res.end();
    return;
  }
  if (url.pathname === STOREFRONT_PREFIX) {
    res.writeHead(308, { Location: `${STOREFRONT_PREFIX}/` });
    res.end();
    return;
  }

  const isDashboard = url.pathname.startsWith(`${DASHBOARD_PREFIX}/`);
  const isLegacyStorefront = url.pathname.startsWith(`${STOREFRONT_PREFIX}/`);
  const staticRoot = isDashboard ? DASHBOARD_ROOT : STOREFRONT_ROOT;
  const requestedPath = isDashboard
    ? url.pathname.slice(DASHBOARD_PREFIX.length) || "/"
    : isLegacyStorefront
      ? url.pathname.slice(STOREFRONT_PREFIX.length) || "/"
      : url.pathname;
  serveFromRoot(res, staticRoot, requestedPath);
}

function serveFromRoot(res, staticRoot, requestedPath) {
  const requested = requestedPath === "/" ? "/index.html" : requestedPath;
  const safePath = normalize(decodeURIComponent(requested)).replace(/^[/\\]+/, "").replace(/^(\.\.[/\\])+/, "");
  let filePath = join(staticRoot, safePath);
  const allowedRoot = normalize(staticRoot);

  if (!normalize(filePath).startsWith(allowedRoot) || !existsSync(filePath)) {
    const fallback = join(staticRoot, "index.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(fallback));
    return;
  }

  if (statSync(filePath).isDirectory()) {
    const indexPath = join(filePath, "index.html");
    if (existsSync(indexPath)) {
      filePath = indexPath;
    } else {
      res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
      res.end("Forbidden");
      return;
    }
  }

  const type = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".svg": "image/svg+xml",
  }[extname(filePath)] || "application/octet-stream";

  res.writeHead(200, { "Content-Type": type });
  createReadStream(filePath).pipe(res);
}
