# Pajulina Storefront

Standalone English storefront prototype for Pajulina Beauty.

Open this storefront through the local Node server (not `file://`), especially when live Selldone storefront data is needed.

Use the repository server:

```bash
npm start
```

Then open:

```text
http://localhost:5173/
```

`/storefront/` is kept as a legacy-compatible route, but `/` is the canonical storefront path.

This keeps SDK/cookie flows valid and avoids origin issues that can appear when opening HTML directly.

It loads products and category list through Selldone storefront XAPI. Mock products are not rendered; if the live catalog request fails, the storefront shows a live-data error state.

Files:

- `index.html` - storefront shell, header, footer, cart drawer
- `styles.css` - responsive retail layout and visual system
- `app.js` - home, catalog, product detail, filters, cart interactions
- `assets/` - generated bitmap assets used by the storefront
