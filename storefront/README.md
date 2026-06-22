# Pajulina Storefront

Static English storefront for Pajulina Beauty.

Open it through the repository static dev server, not `file://`, so ES modules, OAuth callback routing, and browser-direct Selldone XAPI calls use a real origin.

```bash
npm run dev:static
```

Default URL:

```text
http://localhost:8788/
```

For port `5173`:

```powershell
$env:STATIC_DEV_PORT="5173"
npm run dev:static
```

The storefront is the canonical `/` route in production and in local dev.

Files:

- `index.html` - storefront shell, meta config, header, footer, cart drawer
- `styles.css` - responsive retail layout and visual system
- `app.js` - static app bootstrap
- `static-storefront-api.js` - browser-side adapter from local `/api/storefront/*` calls to Selldone XAPI
- `app-core.js` and feature modules - catalog, product detail, cart, checkout, account, blog, and profile UI