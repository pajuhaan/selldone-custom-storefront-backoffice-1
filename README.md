# Pajulina Selldone Shop

Local Selldone shop workspace with a public storefront and a Bootstrap-based backoffice dashboard.

Run it locally:

```bash
npm start
```

Open:

- Storefront: `http://localhost:5173/`
- Dashboard: `http://localhost:5173/dashboard/`
- Setup: `http://localhost:5173/setup/`

The dashboard uses Selldone OAuth with PKCE, stores tokens only in the local server session, and fetches live backoffice data from `api.selldone.com`.

Setup and packaging:

- Runtime configuration is stored in `.env`.
- This project includes current Pajulina defaults in `.env`.
- For a distributable package, ship `.env.example`; on first run without a completed `.env`, the server redirects to `/setup/`.
- Manual setup asks for `CLIENT_ID`, `SHOP_ID`, shop name/domain, storefront handle, app base URL, and scopes.
- Automatic setup is supported when a Selldone MCP bridge creates or repairs the shop-bound dashboard OAuth client and returns `client_id` and `shop_id`. A standalone local server cannot call MCP by itself.

Project layout:

- `storefront/` - public shop UI served at `/`
- `dashboard/` - management dashboard served at `/dashboard/`
- `setup/` - first-run setup UI, `.env` reader/writer, and MCP onboarding instructions
- `server/` - routing, OAuth, backoffice API bridge, storefront proxy, static serving
