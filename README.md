# Selldone Static Storefront and Dashboard

A fully static Selldone storefront plus browser-side dashboard for Cloudflare Pages.

Selldone remains the commerce backend. This repository only ships static HTML, CSS, and JavaScript:

- Storefront: `/`
- Dashboard: `/dashboard/`
- OAuth callback: `/callback/`
- Static build output: `dist/`

There is no production Node server. The local Node script is only a development file server.

## Project layout

- `storefront/` - public storefront source served at `/`
- `dashboard/` - dashboard source served at `/dashboard/`
- `callback/` - Selldone OAuth callback page served at `/callback/`
- `shared/` - shared browser modules used by storefront, dashboard, and callback
- `scripts/build-static.mjs` - creates Cloudflare Pages output in `dist/`
- `scripts/dev-static.mjs` - local static file server for development only
- `.github/workflows/cloudflare-pages.yml` - optional GitHub Actions deploy to Cloudflare Pages
- `wrangler.toml` - Cloudflare Pages output config

## Runtime configuration

Public browser-safe configuration is stored in the `<meta>` tags at the top of:

- `storefront/index.html`
- `dashboard/index.html`
- `callback/index.html`

Do not put secrets in HTML, JavaScript, docs, or examples. This static app must never contain client secrets, API tokens, refresh tokens, MCP credentials, or private Cloudflare tokens.

## Local development

```bash
npm install
npm run dev:static
```

Default local URL:

```text
http://localhost:8788/
```

For port `5173`:

```powershell
$env:STATIC_DEV_PORT="5173"
npm run dev:static
```

Open:

- `http://localhost:5173/`
- `http://localhost:5173/dashboard/`
- `http://localhost:5173/callback/`

## Static build

```bash
npm run build:static
```

The deployable output is written to `dist/`. Do not commit `dist/`; Cloudflare/GitHub builds it from source.

## Cloudflare Pages

Cloudflare Pages settings:

- Build command: `npm run build:static`
- Build output directory: `dist`
- Production domain: `shop.niomatic.com`
- OAuth callback URL: `https://shop.niomatic.com/callback/`

The build writes Cloudflare `_redirects` and `_headers` into `dist/` so `/dashboard/`, `/callback/`, and hash routes work as static pages.

## API model

- Storefront reads and writes directly to `https://xapi.selldone.com` from the browser.
- Dashboard/backoffice calls go directly to `https://api.selldone.com` from the browser.
- OAuth authorize/token calls use `https://selldone.com/oauth` with public-client PKCE.
- Storefront and dashboard tokens are stored separately in browser localStorage.

## Deploy from GitHub

The included workflow builds `dist/` and deploys it with Wrangler. Required GitHub secrets:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

Required GitHub variable:

```text
CLOUDFLARE_PAGES_PROJECT=selldone-shop-a1
```

See `docs/github-cloudflare-action.md` and `docs/static-cloudflare-pages.md`.