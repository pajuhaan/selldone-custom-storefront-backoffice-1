# Selldone Custom Storefront and Backoffice

[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?logo=github&logoColor=white)](https://github.com/pajuhaan/selldone-custom-storefront-backoffice-1)

Build and self-host a custom storefront and backoffice dashboard on top of Selldone Cloud Commerce.

This open-source starter is for teams that want full control over their customer-facing storefront, admin UI, hosting, and deployment while keeping the hard commerce infrastructure in Selldone. Deploy it on your own server, connect it to a Selldone shop, and let Selldone handle the commerce engine, including shop data, products, orders, customers, inventory, checkout, payments, and ongoing platform updates.

![Custom Selldone storefront and backoffice preview](docs/images/storefront-backoffice-preview.png)
![Backoffice dashboard preview](docs/images/dashboard-preview.png)

## Why Use This

- Own the UI: customize the storefront and dashboard for your brand, workflow, and market.
- Deploy anywhere: run the app on your VPS, cloud VM, PaaS, container host, or internal infrastructure.
- Avoid commerce maintenance: Selldone remains the cloud commerce backend, so you do not have to rebuild or maintain complex commerce functionality.
- Use live Selldone data: the local server connects the storefront and backoffice dashboard to Selldone APIs.
- Customize with AI agents: use AI coding agents to adapt the storefront and dashboard to each brand, market, catalog, and operational workflow.
- Keep credentials safer: dashboard OAuth tokens are stored only in the local server session, not in browser storage.

## What Is Included

- Public storefront served at `/`
- Custom backoffice dashboard served at `/dashboard/`
- First-run setup flow served at `/setup/`
- Local Node server for routing, OAuth, sessions, API proxying, and static serving
- `.env.example` for distributable configuration

## How It Works

This project is the self-hosted application layer. Selldone stays responsible for the commerce platform.

- Storefront requests go through the local server and fetch shop/customer-facing commerce data from Selldone.
- Backoffice requests use Selldone OAuth with PKCE and fetch live management data from `api.selldone.com`.
- Runtime configuration lives in `.env`.
- On a fresh installation without a completed `.env`, the server redirects to `/setup/`.

## Selldone MCP and AI Agents

Selldone MCP connections let compatible AI agents work with Selldone-aware tools and context without asking merchants to manually pass around API credentials. Start from the Selldone MCP connections page: [selldone.com/mcp/connections](https://selldone.com/mcp/connections).

With an authorized MCP connection, an AI agent can help turn this starter into a brand-specific commerce application:

- Build or revise storefront sections around a brand's visual identity, catalog structure, content strategy, and customer journey.
- Create custom backoffice views for the merchant's actual workflows, such as order handling, product operations, customer support, or reporting.
- Update layouts, copy, components, styles, setup instructions, and integration code directly in this self-hosted project.
- Use Selldone as the cloud commerce source of truth while the agent focuses on the custom application layer.

MCP is optional. Without it, configure `.env` manually and continue editing the storefront and dashboard like any other Node-based web project.

## Run Locally

```bash
npm install
npm start
```

Open:

- Storefront: `http://localhost:5173/`
- Dashboard: `http://localhost:5173/dashboard/`
- Setup: `http://localhost:5173/setup/`

## Configuration

For open-source distribution, ship `.env.example` and let each deployment create its own `.env`.

Manual setup asks for:

- `CLIENT_ID`
- `SHOP_ID`
- Shop name and domain
- Storefront handle
- App base URL
- OAuth scopes

Automatic setup is supported when a Selldone MCP bridge creates or repairs the shop-bound dashboard OAuth client and returns `client_id` and `shop_id`. A standalone local server cannot call MCP by itself; connect an MCP-compatible agent through [Selldone MCP connections](https://selldone.com/mcp/connections) when agent-assisted setup or customization is needed.

## Project Layout

- `storefront/` - public shop UI served at `/`
- `dashboard/` - management dashboard served at `/dashboard/`
- `setup/` - first-run setup UI, `.env` reader/writer, and MCP onboarding instructions
- `server/` - routing, OAuth, backoffice API bridge, storefront proxy, static serving
- `docs/images/` - README and documentation images

## Deployment Notes

- Set `APP_BASE_URL` to the public URL of the deployed app.
- Configure the Selldone OAuth client redirect URL to match the deployed dashboard callback URL.
- Keep `.env` private and do not commit deployment secrets.
- Put the Node server behind HTTPS in production.
