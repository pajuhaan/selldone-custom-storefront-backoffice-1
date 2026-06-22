# Static Cloudflare Workers Deployment

This package deploys as static assets on Cloudflare Workers. No Node server or tunnel is required for production.

Cloudflare Workers Builds settings:

- Project name: `selldone-shop-a1`
- Build command: `npm run build:static`
- Deploy command: `npx wrangler deploy`
- Non-production branch deploy command: `npx wrangler versions upload`
- Path: `/`
- Production domain: `shop.niomatic.com`
- OAuth callback URL: `https://shop.niomatic.com/callback/`

## Runtime config

Public browser-safe config lives in HTML meta tags, not in a generated public env file:

- `storefront/index.html`
- `dashboard/index.html`
- `callback/index.html`

Keep these values public only: shop handle, shop id, client id, public domains, API bases, and route paths.

Never add client secrets, private API keys, access tokens, refresh tokens, MCP credentials, Cloudflare tokens, or `.env` values to static files.

## Output structure

`npm run build:static` writes:

- `dist/index.html` for the storefront
- `dist/dashboard/index.html` for the dashboard
- `dist/callback/index.html` for OAuth callback handling
- `dist/shared/*` for shared browser modules
`wrangler.toml` points Workers Static Assets at `./dist/` and uses `not_found_handling = "single-page-application"` for client-side routes.

## Local development

- Source static server: `npm run dev:static`
- Built static preview: `npm run preview:static`
- Default URL: `http://localhost:8788`
- Optional port override: `STATIC_DEV_PORT=5173`

The local server is only a file server. Storefront XAPI requests go directly to `https://xapi.selldone.com` unless `STATIC_DEV_PROXY=1` is explicitly set for debugging.

## Token storage

- Storefront OAuth tokens: `pajulina_storefront_oauth_tokens_v1`
- Dashboard OAuth tokens: `pajulina_dashboard_oauth_tokens_v1`

## API routing

- Storefront calls go directly to `https://xapi.selldone.com`.
- Dashboard/backoffice calls go directly to `https://api.selldone.com`.
- OAuth authorize/token calls use `https://selldone.com/oauth` with PKCE and no client secret.
