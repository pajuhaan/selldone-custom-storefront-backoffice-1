# Setup Flow

The setup module owns first-run configuration.

Routes:

- `GET /setup/` - minimal setup UI.
- `GET /setup/api/status` - current defaults, setup state, and MCP/direct API guide.
- `POST /setup/api/manual` - saves manual values to `.env`.
- `POST /setup/api/auto` - accepts current/default `clientId` and `shopId` values or a pasted MCP result containing `client_id` and `shop_id`; otherwise returns the MCP request contract.

Manual setup writes these values to `.env`:

- `CLIENT_ID`
- `SHOP_ID`
- `SHOP_NAME`
- `SHOP_DOMAIN`
- `STOREFRONT_SHOP_HANDLE`
- `APP_BASE_URL`
- `SCOPES`
- Selldone base URLs and setup metadata

Automatic Selldone MCP path:

Use the connected Selldone MCP tool for creating/updating a shop-bound dashboard OAuth client:

```json
{
  "confirm": true,
  "app_type": "public_spa",
  "name": "Pajulina Local Operations Dashboard",
  "local_callback_urls": [
    "http://localhost:5173/callback",
    "http://127.0.0.1:5173/callback"
  ],
  "allow_development_wildcard_redirects": true,
  "requested_scopes": [
    "profile",
    "backoffice:shop:read",
    "backoffice:shop:write",
    "backoffice:product:read",
    "backoffice:category:read",
    "backoffice:order:read",
    "backoffice:report:read",
    "articles"
  ]
}
```

The current MCP tool name in this Codex environment is:

`mcp__codex_apps__selldone_mcp___pajulina___chatgp._a78aa80dbbb0`

Direct Selldone API fallback:

- `POST https://api.selldone.com/shops/{shop_id}/clients`
- Scope required: `backoffice:shop:write`
- Body:

```json
{
  "name": "Pajulina Local Operations Dashboard",
  "redirect": "http://localhost:5173/callback,http://127.0.0.1:5173/callback",
  "public_client": true
}
```

The direct API cannot bootstrap the very first client without an existing access token. That is why MCP or manual entry is required for first-run standalone packages.
