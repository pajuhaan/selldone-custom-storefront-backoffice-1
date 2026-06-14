# AI Agent Guide

This project is a custom Selldone storefront plus backoffice dashboard. Follow these rules when editing it, and update this file whenever you learn and apply a new project convention.

## Core Architecture

- Storefront is served from `storefront/` at `/`.
- Backoffice dashboard is served from `dashboard/` at `/dashboard/`.
- First-run setup lives in `setup/` at `/setup/`.
- Local Node server code lives in `server/`.
- Keep runtime configuration in `.env`; keep distributable defaults in `.env.example`.
- Do not ask users for Selldone API keys, tokens, secrets, or shop ids when MCP/OAuth context can provide them.

## Selldone API Rules

- Dashboard management data must be fetched browser-side directly from `https://api.selldone.com`.
- Do not route dashboard feature reads/writes through local `/api/...` proxy endpoints unless the endpoint is only for app session/setup/auth.
- Do not use `xapi.selldone.com` for dashboard/backoffice features. `xapi` is storefront-only.
- The local server may expose `/api/session` so the dashboard can receive OAuth/session context and then call Selldone directly.
- Do not persist Selldone OAuth access or refresh tokens in browser storage, `.env`, `.auth/`, or any token-store file. Each browser/user session must complete its own OAuth login.
- The dashboard direct API client may hold the current access token only in memory for the active page runtime.
- Always use backoffice endpoint contracts from Selldone MCP or official endpoint metadata before adding a new feature endpoint.
- Preserve Selldone API request/response shapes. Normalize only inside feature modules for UI rendering.
- If a scope is missing, surface a reconnect-with-consent message rather than inventing fallback data.
- Storefront OAuth must stay separate from dashboard OAuth. Storefront scopes are limited to `profile`, `phone`, `address`, `user:profile:write`, `buy`, `order-history`, and `my-gift-cards`; do not add dashboard/backoffice scopes to storefront login.
- Storefront cart reads and mutations must go through local web-app endpoints, never direct browser XAPI calls. This shop sells physical products only, so `GET /api/storefront/basket` must load the physical basket from Selldone shop-info `baskets` and bill data; use `PUT /api/storefront/basket/{product_id}` with the final `count` to update an item. Only update client cart state after Selldone returns a successful physical basket/bill response.

## Selldone Image URL Standard

- All Selldone image/path values must be converted through the central helper in `dashboard/features/selldone-images.js`.
- Use `selldoneImagePathToUrl(...)` for raw path-to-url conversion.
- Use `resolveSelldoneRecordImage(...)` for records that may contain image fields.
- Do not create local one-off image resolvers in feature files.
- The helper must support Selldone underscore paths by converting underscores to slashes before fallback logic.
- Examples:
  - `gateway_8_Icon...jpeg` -> `https://cdn.selldone.com/app/gateway/8/Icon...jpeg`
  - `shops_14952_products_demo` -> `https://cdn.selldone.com/app/shops/14952/products/demo128.png`
  - `payments_stripe` -> `https://cdn.selldone.com/app/payments/stripe128.png`
- Storefront also imports this same helper. Keep storefront and dashboard image behavior consistent.

## Dashboard Code Organization

- Keep feature logic split under `dashboard/features/`.
- `dashboard/app.js` should mainly wire state, top-level rendering, and event bindings.
- New dashboard feature modules should export a `createXFeature(deps)` factory.
- Feature modules should own their own normalization, rendering, refresh actions, and UI error formatting.
- Avoid growing `app.js` with large feature-specific blocks.
- Existing feature examples:
  - `dashboard/features/customers.js`
  - `dashboard/features/messages.js`
  - `dashboard/features/payments.js`
  - `dashboard/features/selldone-direct.js`
  - `dashboard/features/selldone-images.js`

## UI And UX Rules

- Dashboard UI should be English.
- Use Bootstrap-compatible markup and Bootstrap Icons.
- Keep the visual direction modern, minimal, and operational: closer to Stripe/Gmail than a marketing landing page.
- Prefer compact, scannable dashboard layouts over oversized hero sections.
- Maintain light and dark mode compatibility.
- Use icon buttons for common toolbar actions, chips for status, dropdowns for menus, and clear empty states.
- Do not duplicate controls. For example, the user account menu belongs in the left sidebar profile, not also in the top-right toolbar.
- User menu in the sidebar must open upward as a dropup.
- The top chat icon opens customer contact/support tickets from Selldone contacts.
- Do not add an Export button back to the topbar unless explicitly requested.

## Current Dashboard Feature Contracts

- Products use `GET /shops/{shop_id}/products/all-admin`.
- Customers use `GET /shops/{shop_id}/customers` plus customer detail/update endpoints.
- Blog posts use Selldone article/blog endpoints from endpoint metadata:
  - `GET /shops/{shop_id}/blogs` returns the admin list field set and does not include the editable article body, slug, SEO title, description, or tags in the current API response.
  - `POST /article/shop-blog/edit` creates/updates a blog article and requires a non-empty `body`.
  - Do not open an existing post editor with an empty body. Fetch a full detail payload from a registered backoffice detail endpoint when available, or block editing with a clear message to avoid overwriting existing content.
  - Do not use the article SEO audit endpoint as the editor detail source; it does not reliably return editable article content.
- Notifications use the configured notifications endpoint.
- Customer messages/contact tickets use `GET /shops/{shop_id}/contacts` with `backoffice:support-tickets`.
- Payment gateways use:
  - `GET /shops/{shop_id}/gateways`
  - `GET /shops/{shop_id}/available-gateways/{currency}`
  - `POST /shops/{shop_id}/gateways/{gateway_code}`
  - `PUT /shops/{shop_id}/gateways/{gateway_code}/config`
  - `DELETE /shops/{shop_id}/gateways/{gateway_code}`
  - `GET /shops/{shop_id}/gateways/{gateway_code}/transactions`
- Gateway credentials must not be prefilled back into forms. Only send credentials if the user intentionally enters JSON.

## Setup Flow Rules

- Setup UI lives in `setup/`.
- Setup should be minimal, flat, black/white, and Apple-like.
- First-run setup must offer:
  - Manual env setup for client id/shop id and related config.
  - Automatic connection flow when MCP can create or return the OAuth client and shop id.
- After setup, config values required to run the store should be saved to `.env`.

## Verification

- Run syntax checks after JS changes:
  - `node --check dashboard/app.js`
  - `node --check dashboard/features/<feature>.js`
  - `node --check dashboard/features/selldone-direct.js`
  - `node --check storefront/app.js` when storefront changes
- Use lightweight HTTP checks against `http://localhost:5173/dashboard/` or relevant static files when the server is running.
- The in-app Browser may fail in this Windows sandbox with `windows sandbox failed: spawn setup refresh`; if that happens, rely on static, DOM, and HTTP checks and report the limitation.

## Git And Editing Hygiene

- The worktree may contain user changes. Do not revert unrelated files.
- Use focused patches and avoid broad refactors unless needed for the request.
- Do not commit `.env`, tokens, secrets, or generated local runtime files.
- If a new rule, Selldone API behavior, image conversion case, or UI convention is discovered and applied, update this `AGENT.md` in the same change.
