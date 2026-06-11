# Server Modules

- `config.mjs`: Selldone constants, OAuth scopes, shop id, endpoint definitions, and legacy token-store cleanup paths.
- `http.mjs`: Small HTTP helpers for JSON, redirects, cookies, request bodies, and HTML escaping.
- `token-store.mjs`: Legacy token cleanup helpers. OAuth tokens must not be persisted under `.auth/`.
- `session.mjs`: Browser session cookie handling and in-memory session state.
- `auth.mjs`: Selldone OAuth PKCE login, callback handling, token refresh, and consent prompt.
- `selldone-api.mjs`: Backoffice API calls, endpoint summaries, dashboard payloads, product edit/delete helpers, and profile avatar proxy.
- `storefront-api.mjs`: Public storefront product proxy, isolated from dashboard/backoffice API calls.
- `static.mjs`: Static file serving for `storefront/` at `/` and `dashboard/` at `/dashboard/`.
- `routes.mjs`: The request router that wires auth, dashboard API routes, storefront API routes, and static assets together.

Setup lives outside this folder in `setup/`. `server/routes.mjs` redirects first-run requests to `/setup/` until `.env` has `SETUP_COMPLETE=true`, `CLIENT_ID`, and `SHOP_ID`.
