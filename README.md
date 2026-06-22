# Selldone Static Storefront and Dashboard

[![GitHub Repository](https://img.shields.io/badge/GitHub-View%20on%20GitHub-181717?logo=github&logoColor=white)](https://github.com/pajuhaan/selldone-custom-storefront-backoffice-1)

A fully static Selldone storefront plus browser-side dashboard for Cloudflare Workers Static Assets.

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
- `wrangler.toml` - Cloudflare Workers Static Assets config

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

## Cloudflare Workers

Cloudflare Workers Builds settings:

- Build command: `npm run build:static`
- Deploy command: `npx wrangler deploy`
- Non-production branch deploy command: `npx wrangler versions upload`
- Path: `/`
- Production domain: `shop.niomatic.com`
- OAuth callback URL: `https://shop.niomatic.com/callback/`

`wrangler.toml` deploys `dist/` with Workers Static Assets. `/dashboard/` and `/callback/` are real directory index pages, and unknown client routes fall back to the SPA shell.

## API model

- Storefront reads and writes directly to `https://xapi.selldone.com` from the browser.
- Dashboard/backoffice calls go directly to `https://api.selldone.com` from the browser.
- OAuth authorize/token calls use `https://selldone.com/oauth` with public-client PKCE.
- Storefront and dashboard tokens are stored separately in browser localStorage.

## Deploy from GitHub through Cloudflare

Use Cloudflare Workers Builds connected to this GitHub repository. The Cloudflare build form should use:

```text
Project name: selldone-shop-a1
Build command: npm run build:static
Deploy command: npx wrangler deploy
Non-production branch deploy command: npx wrangler versions upload
Path: /
```

See `docs/static-cloudflare-pages.md`.
