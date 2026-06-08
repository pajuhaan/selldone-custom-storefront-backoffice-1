import { join } from "node:path";
import { DEFAULT_SCOPES, getRuntimeConfig, loadEnvFile } from "../setup/env.mjs";

loadEnvFile();

export const ROOT = process.cwd();
export let PORT;
export let SELLDONE_BASE;
export let API_BASE;
export let TOKEN_ENDPOINT;
export let AUTHORIZE_ENDPOINT;
export let AUTH_PROMPT;
export let CLIENT_ID;
export let SHOP_ID;
export let STOREFRONT_SHOP_HANDLE;
export let STOREFRONT_XAPI_BASE;
export let SCOPES;
export let SHOP;
export let ENDPOINTS;
export let PROFILE_ENDPOINT;

export function reloadRuntimeConfig() {
  const config = getRuntimeConfig();
  PORT = config.port;
  SELLDONE_BASE = config.SELLDONE_BASE;
  API_BASE = config.API_BASE;
  TOKEN_ENDPOINT = `${SELLDONE_BASE}/oauth/token`;
  AUTHORIZE_ENDPOINT = `${SELLDONE_BASE}/oauth/authorize`;
  AUTH_PROMPT = config.AUTH_PROMPT;
  CLIENT_ID = config.CLIENT_ID;
  SHOP_ID = config.shopId;
  STOREFRONT_SHOP_HANDLE = config.STOREFRONT_SHOP_HANDLE;
  STOREFRONT_XAPI_BASE = config.STOREFRONT_XAPI_BASE;
  SCOPES = config.scopes.length ? config.scopes : DEFAULT_SCOPES;
  SHOP = {
    id: SHOP_ID,
    name: config.SHOP_NAME,
    domain: config.SHOP_DOMAIN,
  };
  ENDPOINTS = buildEndpoints(SHOP_ID);
  PROFILE_ENDPOINT = {
    label: "Profile",
    path: "/profiles/me",
    query: {
      offset: 0,
      count: 1,
    },
  };
}

function buildEndpoints(shopId) {
  return {
    products: {
      label: "Products",
      path: `/shops/${shopId}/products/all-admin`,
      fallback: { products: [], total: 0 },
      query: {
        dir: "*",
        limit: 100,
        offset: 0,
        products_only: "true",
        with_total: "true",
        with_category: "true",
        with_product_variants: "true",
        sortBy: "updated_at",
        sortDesc: "true",
      },
    },
    categories: {
      label: "Categories",
      path: `/shops/${shopId}/categories`,
      fallback: { categories: [], total: 0 },
      query: {
        limit: 100,
        offset: 0,
        children: "true",
        parent: "true",
        sortBy: "id",
        sortDesc: "false",
      },
    },
    orders: {
      label: "Orders",
      path: `/shops/${shopId}/process-center/baskets-PHYSICAL`,
      fallback: { orders: [], total: 0, statuses: ["Open", "Reserved", "Payed", "COD", "Canceled"] },
      query: {
        offset: 0,
        limit: 50,
        sortBy: "created_at",
        sortDesc: "true",
        statuses: ["Open", "Reserved", "Payed", "COD", "Canceled"],
        with: ["items", "buyer", "payment"],
      },
    },
    customers: {
      label: "Customers",
      path: `/shops/${shopId}/customers`,
      fallback: { customers: [], total: 0 },
      query: {
        offset: 0,
        limit: 100,
        sortBy: "updated_at",
        sortDesc: "true",
      },
    },
    shopAnalytics: {
      label: "30-day shop analytics",
      path: `/shops/me/${shopId}`,
      fallback: { data: [], orderQue: [], avocadoQue: [] },
      query: {
        offset: 0,
        days: 30,
      },
    },
    blogs: {
      label: "Blog posts",
      path: `/shops/${shopId}/blogs`,
      fallback: { articles: [], total: 0 },
      query: {
        offset: 0,
        limit: 50,
        sortBy: "updated_at",
        sortDesc: "true",
      },
    },
    blogTimeline: {
      label: "Scheduled blog timeline",
      path: `/shops/${shopId}/timeline/articles`,
      fallback: { timeline: [] },
      query: {},
    },
    blogTags: {
      label: "Blog tags",
      path: `/shops/${shopId}/articles/tags`,
      fallback: { tags: [] },
      query: {},
    },
    notifications: {
      label: "Notifications",
      path: "/notifications",
      fallback: { notifications: [], total: 0 },
      query: {
        shop_id: shopId,
        offset: 0,
        limit: 20,
        mode: "new",
      },
    },
  };
}

reloadRuntimeConfig();

export const PRODUCT_UPDATE_FIELDS = new Set([
  "title",
  "title_en",
  "sku",
  "price",
  "currency",
  "discount",
  "commission",
  "status",
  "condition",
  "category_id",
  "brand",
  "warranty",
  "lead",
  "unit",
  "unit_float",
  "price_input",
  "pricing",
  "original",
  "return_warranty",
  "video",
  "price_label",
]);

export const ARTICLE_UPDATE_FIELDS = new Set([
  "article_id",
  "category",
  "cluster_id",
  "title",
  "body",
  "description",
  "image",
  "page_title",
  "slug",
  "lang",
  "private",
  "published",
  "schedule_at",
  "faqs",
  "structures",
]);

export const CUSTOMER_UPDATE_FIELDS = new Set([
  "name",
  "email",
  "phone",
  "level",
  "subscribed",
  "currency",
  "segments",
  "birthday",
  "sex",
  "country",
  "address",
  "billing",
  "notes",
]);

export const AUTH_DIR = join(ROOT, ".auth");
export const TOKEN_STORE = join(AUTH_DIR, "selldone-session.json");
