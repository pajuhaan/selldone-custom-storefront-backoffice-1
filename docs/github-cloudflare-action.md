# GitHub to Cloudflare Pages deployment

This repository includes `.github/workflows/cloudflare-pages.yml`.

It builds the static package with:

```bash
npm run build:static
```

Then deploys `dist/` to Cloudflare Pages with Wrangler.

## Required GitHub secrets

Set these in GitHub repository settings, not in source files:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

The API token must be allowed to deploy Cloudflare Pages for the target account.

## Required GitHub variable

```text
CLOUDFLARE_PAGES_PROJECT=selldone-shop-a1
```

## App configuration

The browser app reads public Selldone config from HTML meta tags in source files:

```text
storefront/index.html
dashboard/index.html
callback/index.html
```

Update those meta tags for another shop/domain before deploying a fork.

Do not add client secrets, refresh tokens, API keys, MCP credentials, or private Cloudflare tokens to HTML, JavaScript, examples, or repository variables that could be exposed to the browser.

## Custom domain

After the first successful Pages deployment, add `shop.niomatic.com` as a custom domain on the Cloudflare Pages project.

For this app, the Selldone OAuth redirect URI should be:

```text
https://shop.niomatic.com/callback/
```