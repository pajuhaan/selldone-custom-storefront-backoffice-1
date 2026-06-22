# AI Agent Guide

This project is a fully static Selldone storefront plus browser-side dashboard. Follow these rules when editing it.

## Core Architecture

- Storefront source lives in `storefront/` and is served at `/`.
- Dashboard source lives in `dashboard/` and is served at `/dashboard/`.
- OAuth callback source lives in `callback/` and is served at `/callback/`.
- Shared browser modules live in `shared/`.
- Static production output is generated into `dist/` by `scripts/build-static.mjs`.
- `scripts/dev-static.mjs` is only a local development file server. Do not add production Node server behavior.
- Cloudflare Workers Static Assets must deploy `dist/` only through `wrangler deploy`. Do not deploy `.env`, logs, temp files, auth files, local browser profiles, or `dist/` source artifacts to git.

## Runtime Config

- Public runtime config is stored in HTML meta tags in `storefront/index.html`, `dashboard/index.html`, and `callback/index.html`.
- Do not add client secrets, API keys, refresh tokens, access tokens, MCP credentials, Cloudflare tokens, or private `.env` values to any public file.
- `.env` is only for local dev server settings such as `STATIC_DEV_PORT` and optional debug proxy settings.

## Selldone API Rules

- Storefront calls must go browser-direct to `https://xapi.selldone.com`.
- Dashboard/backoffice calls must go browser-direct to `https://api.selldone.com`.
- OAuth must use public-client PKCE against `https://selldone.com/oauth`; never use a client secret.
- Storefront and dashboard OAuth tokens must stay separate in localStorage:
  - `pajulina_storefront_oauth_tokens_v1`
  - `pajulina_dashboard_oauth_tokens_v1`
- Do not add Node-only API routes for production features.
- Existing storefront `/api/storefront/*` calls are browser-intercepted by `storefront/static-storefront-api.js` and translated to real XAPI requests.
- Storefront order history is physical-only and loads from XAPI `GET /shops/@{shop}/basket/orders-PHYSICAL` with the `order-history` scope.
- Storefront order detail loads from XAPI `GET /shops/@{shop}/baskets/{basket_id}` with the storefront customer token.
- Storefront cart reads and mutations must use real Selldone XAPI. This shop sells physical products only, so cart state must load the physical basket from shop-info `baskets` and bill data. Basket item updates use `PUT /shops/@{shop}/basket/{product_id}` with the final `count`.
- Storefront checkout is physical-only: save basket config, refresh physical bill, then call `POST /shops/@{shop}/basket/physical/buy/{gateway_code}`.
- Storefront Stripe checkout must read the publishable key dynamically from Selldone storefront shop info gateway data. Never hardcode Stripe keys.
- Product comments are article comments. Resolve the product article from `product.article_pack.article.id` or equivalent product info fields; do not use `/shops/@{shop}/products/{id}/reviews` as the primary XAPI path.

## Selldone Image URL Standard

- Use the central Selldone image helpers where present.
- Do not create local one-off image resolvers in feature files.
- Selldone underscore paths must be converted consistently, for example `shops_14952_products_demo` -> `https://cdn.selldone.com/app/shops/14952/products/demo128.png`.

## Dashboard Code Organization

- Keep dashboard feature logic split under `dashboard/features/`.
- `dashboard/app.js` should mainly wire state, top-level rendering, and event bindings.
- New dashboard feature modules should export a `createXFeature(deps)` factory.
- Do not grow `dashboard/app.js` with large feature-specific blocks.

## UI Rules

- Dashboard UI should be English.
- Use Bootstrap-compatible markup and Bootstrap Icons where the dashboard already uses them.
- Keep the visual direction modern, minimal, operational, and compact.
- Do not duplicate account controls; the user account menu belongs in the left sidebar profile.

## Git And Editing Hygiene

- The worktree may contain user changes. Do not revert unrelated files.
- Use focused patches and avoid broad refactors unless requested.
- Do not commit `.env`, tokens, secrets, generated `dist/`, logs, temp files, local auth files, or browser profile folders.
- When adding or deleting source files for this static package, stage the relevant source changes with git so they are not missed before deployment.
- If a new Selldone API behavior or project convention is discovered and applied, update this file in the same change.
