import { selldoneImagePathToUrl } from "/dashboard/features/selldone-images.js?v=storefront-cart-image-20260614b";
import { renderHomePage as renderHomePageModule } from "./home-page.js?v=storefront-product-article-wide-20260621";
import { renderProductPage as renderProductPageModule } from "./product-page.js?v=storefront-product-article-wide-20260621";
import { renderUserMenu } from "./user-menu.js?v=storefront-product-article-wide-20260621";
import { renderAccountProfileOverviewPage } from "./account-profile.js?v=storefront-product-article-wide-20260621";
import { renderOrderHistoryPage } from "./order-history.js?v=storefront-product-article-wide-20260621";
import { renderOrderDetailPage } from "./order-detail.js?v=storefront-product-article-wide-20260621";
import { createStorefrontPayments } from "./payments.js?v=storefront-product-article-wide-20260621";
import { createStorefrontQuickBuy } from "./quick-buy.js?v=storefront-product-article-wide-20260621";

const SPRITE_COLUMNS = 4;
const SPRITE_ROWS = 4;
const CART_KEY = "pajulina_storefront_cart_v1";
const STOREFRONT_ACCESS_TOKEN_KEY = "pajulina_storefront_access_token";
const STOREFRONT_TOKEN_EXPIRES_AT_KEY = "pajulina_storefront_access_token_expires_at";
const DATA_SOURCE = {
  xapi: "xapi",
};
const XAPI_PRODUCT_LIMIT = 200;
const BLOG_LIMIT = 24;

const heroSlides = [
  {
    image: "assets/cosmetic-hero-ritual.png",
    position: "50% 50%",
    accent: "#1f8f3a",
    eyebrow: "Pajulina cosmetic shop",
    title: "Glow rituals, edited beautifully",
    body: "Fresh skin care, soft color, and everyday essentials curated for a clean routine.",
    cta: "Shop skin care",
    href: "#shop?category=skincare",
  },
  {
    image: "assets/cosmetic-hero-discounts.png",
    position: "58% 50%",
    accent: "#e4b900",
    eyebrow: "Member beauty deals",
    title: "Save on the icons in your routine",
    body: "Discounted beauty finds with premium skin, makeup, and gifting picks in one edit.",
    cta: "Shop discounts",
    href: "#shop?discount=1",
  },
  {
    image: "assets/cosmetic-hero-routine.png",
    position: "54% 50%",
    accent: "#2aa36b",
    eyebrow: "Routine order",
    title: "Cream pots first, eye essentials last",
    body: "Start with skin-focused jars, move into tubes, then finish with refined eye products.",
    cta: "Explore the edit",
    href: "#shop",
  },
];

const shadePalette = [
  "#f8d2b1",
  "#f0bf94",
  "#e8ad82",
  "#d99b72",
  "#c88357",
  "#b77045",
  "#a66338",
  "#8d4b2a",
  "#6d351e",
  "#ffd9c8",
  "#f8c8b6",
  "#edae9d",
  "#d98d7d",
  "#b76a5f",
  "#8f473e",
  "#efb7a1",
  "#f4a9b8",
  "#dc6c86",
  "#bf4866",
  "#98344e",
  "#f6caca",
  "#e5969e",
  "#c95768",
  "#a23249",
  "#6f2535",
  "#f7dfc7",
  "#e9c39a",
  "#d1a06d",
  "#b17b46",
  "#7f512d",
  "#efe3d8",
  "#d7c4b5",
  "#b89d88",
  "#8b6d5d",
  "#4f382f",
  "#243d70",
];

const state = {
  cart: readCart(),
  cartLineDetails: {},
  cartSummary: null,
  activeCategory: "all",
  activeDiscountOnly: false,
  activeSort: "featured",
  search: "",
  activeMedia: null,
  activeShade: 0,
  activeProductVariantSelections: {},
  activeProductShippingSelection: {},
  activeProductId: null,
  activeCheckoutShippingKey: "",
  products: [],
  categoryCards: [],
  folders: [],
  shopTransportations: [],
  shopTransportationsLoaded: false,
  shopTransportationsLoading: false,
  dataSource: DATA_SOURCE.xapi,
  productsLoaded: false,
  isLoading: true,
  loadError: null,
  sessionLoaded: false,
  sessionLoading: false,
  sessionAuthenticated: false,
  sessionLoginUrl: "/auth/storefront/start",
  sessionUser: {},
  accountMenuOpen: false,
  categoryMenuOpen: false,
  pageLoading: false,
  pageLoadingCount: 0,
  checkoutSubmitting: false,
  quickBuy: {
    productId: "",
    variantKey: "",
    quantity: 1,
    addressIndex: 0,
    editingAddress: false,
    submitting: false,
  },
  stripeLoading: false,
  cartLoaded: false,
  cartLoading: false,
  cartLoadError: "",
  cartUpdatingKeys: new Set(),
  storefrontShopInfo: null,
  checkoutGatewayCode: "",
  stripePublishableKey: "",
  xapiEndpoint: null,
  blogs: [],
  blogCategories: [],
  blogTotal: 0,
  blogsLoaded: false,
  blogsLoading: false,
  blogsLoadError: "",
  activeProductGallery: [],
  activeHeroSlide: 0,
};

let shopTransportationsRequest = null;

const els = {
  app: document.getElementById("app"),
  cartDrawer: document.querySelector("[data-cart-drawer]"),
  cartItems: document.querySelector("[data-cart-items]"),
  cartCount: document.querySelector("[data-cart-count]"),
  cartTitle: document.querySelector("[data-cart-title]"),
  cartSubtotal: document.querySelector("[data-cart-subtotal]"),
  cartShipping: document.querySelector("[data-cart-shipping]"),
  cartShippingRow: document.querySelector("[data-cart-shipping-row]"),
  cartDiscount: document.querySelector("[data-cart-discount]"),
  cartDiscountRow: document.querySelector("[data-cart-discount-row]"),
  cartTax: document.querySelector("[data-cart-tax]"),
  cartTaxRow: document.querySelector("[data-cart-tax-row]"),
  cartTotal: document.querySelector("[data-cart-total]"),
  cartSummaryNote: document.querySelector("[data-cart-summary-note]"),
  searchInput: document.querySelector("[data-site-search]"),
  primaryLinks: document.querySelector("[data-primary-links]"),
  accountButton: document.querySelector("[data-account-button]"),
  accountControl: document.querySelector("[data-account-control]"),
  accountMenu: document.querySelector("[data-account-menu]"),
  categoryMenu: document.querySelector("[data-category-menu]"),
  categoryMenuList: document.querySelector("[data-category-menu-list]"),
  pageLoading: document.querySelector("[data-page-loading]"),
  cartCheckoutButton: document.querySelector("[data-cart-checkout]"),
};

function setPageLoading(active) {
  state.pageLoadingCount = Math.max(0, state.pageLoadingCount + (active ? 1 : -1));
  state.pageLoading = state.pageLoadingCount > 0;
  els.pageLoading?.classList.toggle("is-active", state.pageLoading);
  els.pageLoading?.setAttribute("aria-hidden", String(!state.pageLoading));
}

function shouldTrackFetch(input) {
  const rawUrl = typeof input === "string" ? input : input?.url;
  if (!rawUrl) return false;
  try {
    const url = new URL(rawUrl, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith("/api/");
  } catch {
    return String(rawUrl).startsWith("/api/");
  }
}

function installPageLoadingFetchTracker() {
  if (window.__pajulinaPageLoadingFetchTracker) return;
  const nativeFetch = window.fetch.bind(window);
  window.__pajulinaPageLoadingFetchTracker = true;
  window.fetch = async (...args) => {
    const tracked = shouldTrackFetch(args[0]);
    if (tracked) setPageLoading(true);
    try {
      return await nativeFetch(...args);
    } finally {
      if (tracked) setPageLoading(false);
    }
  };
}

installPageLoadingFetchTracker();

function spritePosition(index) {
  const col = index % SPRITE_COLUMNS;
  const row = Math.floor(index / SPRITE_COLUMNS) % SPRITE_ROWS;
  const x = col === 0 ? "0%" : col === SPRITE_COLUMNS - 1 ? "100%" : `${((col / (SPRITE_COLUMNS - 1)) * 100).toFixed(3)}%`;
  const y = row === 0 ? "0%" : row === SPRITE_ROWS - 1 ? "100%" : `${((row / (SPRITE_ROWS - 1)) * 100).toFixed(3)}%`;
  return `--sprite-x:${x};--sprite-y:${y};`;
}

function renderSprite(index, className = "product-sprite") {
  return `<span class="${className}" style="${spritePosition(index)}"></span>`;
}

function formatPrice(value, currency = "$") {
  const safe = Number(value);
  const amount = (Number.isFinite(safe) ? safe : 0).toFixed(2);
  const unit = String(currency || "$").trim();
  if (!unit || unit === "$") return `$${amount}`;
  return `${amount} ${escapeHtml(unit)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback = null) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickNumeric(source, candidates = [], fallback = 0) {
  if (!source || typeof source !== "object") return fallback;
  const fields = Array.isArray(candidates) ? candidates : [candidates];

  for (const field of fields) {
    const candidate = String(field || "").trim();
    if (!candidate) continue;

    let value = source;
    const parts = candidate.split(".");
    for (const key of parts) {
      if (value && Object.prototype.hasOwnProperty.call(value, key)) {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }

    const parsed = toNumber(value, NaN);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function firstNonNull(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") return value;
    const text = String(value).trim();
    if (text !== "") return text;
  }
  return "";
}

function asSafeCategory(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  return raw || "misc";
}

function toSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeCategoryCardSource(rawCategory, index = 0) {
  const imageSource = firstNonNull(
    rawCategory?.image,
    rawCategory?.icon,
    rawCategory?.banner,
    rawCategory?.logo,
    rawCategory?.icon_file,
    rawCategory?.image_file,
    rawCategory?.path,
    rawCategory?.files?.[0]?.path,
  );
  if (typeof imageSource === "number") return imageSource;
  if (imageSource && typeof imageSource === "string") {
    const mapped = pickImagePath(imageSource, { scope: "categories", shopId: rawCategory?.shop_id || rawCategory?.shop?.id });
    return mapped || imageSource;
  }
  return toNumber(rawCategory?.image_index, rawCategory?.icon_index, rawCategory?.sprite_index, index % (SPRITE_COLUMNS * SPRITE_ROWS));
}

function normalizeCategoryCard(rawCategory, index = 0) {
  const key = asSafeCategory(
    firstNonNull(
      rawCategory?.slug,
      rawCategory?.category_slug,
      rawCategory?.key,
      rawCategory?.name,
      rawCategory?.title,
      rawCategory?.label,
      rawCategory?.category_name,
      rawCategory?.id,
    ),
  );
  const label = firstNonNull(rawCategory?.title, rawCategory?.name, rawCategory?.label, rawCategory?.category_name, key);
  if (!key || !label) return null;

  return {
    key,
    label,
    image: normalizeCategoryCardSource(rawCategory, index),
  };
}

function buildCategoryCardsFromFolders(rawFolders = []) {
  const list = [];
  if (!Array.isArray(rawFolders)) return list;

  const visit = (entry, index = 0) => {
    if (entry === null || entry === undefined) return;
    if (Array.isArray(entry)) {
      entry.forEach((item, itemIndex) => visit(item, itemIndex));
      return;
    }

    const normalized = normalizeCategoryCard(entry, index);
    if (normalized) list.push(normalized);

    if (Array.isArray(entry.children)) {
      entry.children.forEach((child, childIndex) => visit(child, list.length + childIndex));
    }
  };

  rawFolders.forEach((entry, index) => visit(entry, index));
  return list;
}

function buildCategoryCardsFromProducts(rawProducts = []) {
  const map = new Map();

  rawProducts.forEach((item, index) => {
    const key = asSafeCategory(item?.category);
    if (!key || map.has(key)) return;
    map.set(key, {
      key,
      label: titleCase(key),
      image: index % (SPRITE_COLUMNS * SPRITE_ROWS),
    });
  });

  return Array.from(map.values());
}

function getCategoryCards() {
  return state.categoryCards;
}

function hasProductDiscount(item = {}) {
  const price = Number(item.price || 0);
  const original = Number(item.original || item.originalPrice || 0);
  return Number.isFinite(original) && Number.isFinite(price) && original > price;
}

function productMerchPriority(item = {}) {
  const source = `${item.key || ""} ${item.label || ""} ${item.title || ""} ${item.category || ""}`.toLowerCase();
  const priority = [
    ["skincare", "skin", "cream", "serum", "glow"],
    ["makeup", "lip", "beauty", "cosmetic"],
    ["hair", "shampoo", "conditioner"],
    ["fragrance", "perfume", "scent"],
  ];
  const index = priority.findIndex((group) => group.some((word) => source.includes(word)));
  return index >= 0 ? index : priority.length;
}

function sortByMerchPriority(list = []) {
  return [...list].sort((a, b) => productMerchPriority(a) - productMerchPriority(b));
}

function sortCategoryCards(cards = []) {
  return [...cards].sort(
    (a, b) =>
      productMerchPriority({ key: a.key, label: a.label, title: a.label, category: a.key }) -
      productMerchPriority({ key: b.key, label: b.label, title: b.label, category: b.key }),
  );
}

function isCategoryAvailable(value) {
  const normalized = asSafeCategory(value);
  if (!normalized || normalized === "all") return true;
  return getCategoryCards().some(([key]) => asSafeCategory(key) === normalized);
}

function sanitizeActiveCategory() {
  if (!isCategoryAvailable(state.activeCategory)) {
    state.activeCategory = "all";
  }
}

function pickImagePath(value, options = {}) {
  if (typeof value !== "string") return null;
  return selldoneImagePathToUrl(value, options) || null;
}

function normalizeImageCandidate(candidate, options = {}) {
  const shopId = firstNonNull(options?.shopId, candidate?.shop_id, candidate?.shop?.id);

  if (candidate === null || candidate === undefined) return null;
  if (typeof candidate === "number") return candidate;
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (!trimmed) return null;
    return pickImagePath(trimmed, { scope: "products", shopId }) || null;
  }
  if (typeof candidate === "object") {
    return normalizeImageCandidate(
      firstNonNull(
        candidate.icon,
        candidate.image,
        candidate.path,
        candidate.url,
        candidate.filename,
        candidate.photo,
        candidate.cover,
        candidate.icon_file,
        candidate.file,
      ),
      { ...options, shopId: firstNonNull(shopId, options?.shopId) },
    );
  }

  return null;
}

function extractImages(rawProduct) {
  const collected = [];
  const pushImage = (entry) => {
    const normalized = normalizeImageCandidate(entry, { shopId: rawProduct?.shop_id || rawProduct?.shop?.id });
    if (normalized === null || normalized === undefined) return;
    if (Array.isArray(normalized)) return;
    if (collected.some((item) => (typeof item === "number" && typeof normalized === "number" ? item === normalized : item === normalized))) {
      return;
    }
    collected.push(normalized);
  };

  [
    rawProduct?.icon,
    rawProduct?.image,
    rawProduct?.thumbnail,
    rawProduct?.banner,
    rawProduct?.file,
    rawProduct?.files?.[0]?.path,
    rawProduct?.files?.[0]?.icon,
    rawProduct?.files?.[0]?.image,
    rawProduct?.icon_file,
  ].forEach(pushImage);

  if (Array.isArray(rawProduct?.images)) {
    rawProduct.images.forEach(pushImage);
  }
  if (Array.isArray(rawProduct?.productVariants)) {
    rawProduct.productVariants.forEach((variant) => pushImage(variant?.image));
  }
  if (Array.isArray(rawProduct?.product_variants)) {
    rawProduct.product_variants.forEach((variant) => pushImage(variant?.image));
  }
  if (Array.isArray(rawProduct?.variants)) {
    rawProduct.variants.forEach((variant) => pushImage(variant?.image));
  }
  if (Array.isArray(rawProduct?.images_arr)) {
    rawProduct.images_arr.forEach(pushImage);
  }

  return Array.from(new Set(collected));
}

function productProsSeed(product = {}) {
  const source = `${product?.id || ""}|${product?.title || ""}|${product?.category || ""}|${product?.subcategory || ""}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
}

function pickProsText(list = [], seed = 1, offset = 0) {
  if (!Array.isArray(list) || !list.length) return "";
  return list[(seed + offset) % list.length];
}

function normalizeProductPros(rawPros, product = {}) {
  const labels = ["Summary", "Details", "How To Use", "Ingredients", "Shipping & Coupon Restrictions"];
  if (Array.isArray(rawPros)) {
    const normalized = rawPros
      .map((entry, index) => {
        if (typeof entry === "string") {
          const [maybeTitle, ...rest] = entry.split(":");
          const body = rest.join(":").trim();
          return {
            title: body ? maybeTitle.trim() : labels[index] || `Note ${index + 1}`,
            body: body || entry.trim(),
          };
        }
        if (entry && typeof entry === "object") {
          return {
            title: String(firstNonNull(entry.title, entry.name, entry.key, labels[index] || `Note ${index + 1}`)).trim(),
            body: String(firstNonNull(entry.body, entry.text, entry.description, entry.value, entry.content, "")).trim(),
          };
        }
        return null;
      })
      .filter((entry) => entry?.title && entry?.body);
    if (normalized.length) return normalized;
  }

  if (rawPros && typeof rawPros === "object") {
    const normalized = Object.entries(rawPros)
      .map(([title, body]) => ({
        title: titleCase(title),
        body: String(body || "").trim(),
      }))
      .filter((entry) => entry.title && entry.body);
    if (normalized.length) return normalized;
  }

  if (typeof rawPros === "string" && rawPros.trim()) {
    return [{ title: "Details", body: rawPros.trim() }];
  }

  return generateProductPros(product);
}

function generateProductPros(product = {}) {
  const seed = productProsSeed(product);
  const title = String(product.title || "This product").trim();
  const category = titleCase(firstNonNull(product.subcategory, product.category, "beauty"));
  const categoryLower = String(firstNonNull(product.subcategory, product.category, "")).toLowerCase();
  const finish = pickProsText(["fresh", "polished", "soft-focus", "clean", "everyday", "radiant"], seed, 1);
  const texture = pickProsText(["lightweight", "silky", "comforting", "smooth", "blendable", "layer-friendly"], seed, 2);
  const mood = pickProsText(["morning routine", "daily touch-up", "weekend edit", "gift-ready ritual", "minimal routine", "glow routine"], seed, 3);
  const productFamily = categoryLower.includes("skin")
    ? "skin care"
    : categoryLower.includes("lip")
      ? "lip color"
      : categoryLower.includes("foundation")
        ? "complexion"
        : categoryLower.includes("sun")
          ? "sun care"
          : categoryLower.includes("fragrance")
            ? "fragrance"
            : "beauty";

  return [
    {
      title: "Summary",
      body: `${title} is a ${finish} ${productFamily} pick made for a ${mood}, with a ${texture} feel and a finish that stays easy to wear.`,
    },
    {
      title: "Details",
      body: `${category} performance with a curated Pajulina feel: balanced payoff, clean presentation, and packaging suited for daily use or gifting.`,
    },
    {
      title: "How To Use",
      body: pickProsText(
        [
          "Apply a small amount first, then build gradually until the finish looks even and comfortable.",
          "Use after your base routine and layer only where you want extra polish or glow.",
          "Start at the center of the face or target area, blend outward, and reapply as needed during the day.",
          "Use clean fingertips, a brush, or a sponge depending on the finish you prefer.",
        ],
        seed,
        4,
      ),
    },
    {
      title: "Ingredients",
      body: pickProsText(
        [
          "Ingredient lists may vary by batch. Check the product packaging for the most current formula before use.",
          "Made for a comfortable beauty routine. Review the package label if you have sensitivities or ingredient restrictions.",
          "Formula details can change over time. Always confirm ingredients on the item label before applying.",
          "Designed for daily cosmetic use. Patch test when trying a new product or shade for the first time.",
        ],
        seed,
        5,
      ),
    },
    {
      title: "Shipping & Coupon Restrictions",
      body: pickProsText(
        [
          "Ships as a physical Pajulina item. Standard shipping, pickup, and eligible promotions apply unless the cart says otherwise.",
          "Available for physical delivery. Some coupons, bundles, or regional shipping methods may be limited at checkout.",
          "Eligible for standard storefront checkout. Final delivery cost and promotion availability are confirmed by Selldone in the cart.",
          "Packed for safe delivery. Shipping options, COD, and discounts are calculated live before payment.",
        ],
        seed,
        6,
      ),
    },
  ];
}

function renderProductProsAccordion(item = {}, description = "") {
  const pros = normalizeProductPros(item.pros, { ...item, description });
  const withSummary = pros.length ? pros : generateProductPros(item);
  return withSummary.map((entry, index) => accordionItem(entry.title, entry.body, index === 0)).join("");
}

function mapProduct(raw) {
  if (!raw || typeof raw !== "object") return null;

  const badgeCandidate = firstNonNull(
    raw.badge,
    Array.isArray(raw.badges) ? raw.badges[0] : "",
    raw.offer_label,
    raw.tag,
  );
  const categorySource = raw.category || raw.main_category || raw.folder || raw.categories?.[0];
  const categoryValue = asSafeCategory(
    toSlug(firstNonNull(categorySource?.slug, categorySource?.name, categorySource?.title, categorySource?.category_name, raw.category_id, raw.category)),
  );
  const subcategoryValue = asSafeCategory(
    toSlug(firstNonNull(categorySource?.name, categorySource?.title, raw.subcategory, raw.section)),
  );
  const images = extractImages(raw);
  const catalogVariants = Array.isArray(raw.product_variants) && raw.product_variants.length > 0 ? raw.product_variants : [];
  const mappedVariants = normalizeProductVariants(
    catalogVariants.length
      ? catalogVariants
      : Array.isArray(raw.variants) && raw.variants.length > 0
        ? raw.variants
        : Array.isArray(raw.productVariants) && raw.productVariants.length > 0
          ? raw.productVariants
          : [],
    raw,
  );
  const price = toNumber(firstNonNull(raw.price, raw.final_price, raw.sale_price, raw.priced_value, raw.list_price), 0);
  const originalCandidate = firstNonNull(raw.original, raw.regular_price, raw.compare_at_price, raw.base_price, raw.list_price);
  const discount = toNumber(raw.discount, 0);
  const colors = toNumber(raw.colors_count || raw.color_count || (Array.isArray(mappedVariants) ? mappedVariants.length : 0), 1);
  const rating = toNumber(raw.rate || raw.rate_avg || raw.rating || raw.rate_count, 0);
  const reviews = Math.max(0, parseInt(firstNonNull(raw.rate_count, raw.review_count, raw.reviews_count, 0), 10) || 0);
  const title = firstNonNull(raw.title, raw.name, raw.product_name, raw.title_en, raw.name_en, `Product ${raw.id || "Unknown"}`);
  const brand = firstNonNull(raw.brand, raw.brand_name, raw.seller, raw.supplier_name, raw.vendor?.name, raw.vendor_name);
  const productId = firstNonNull(raw.id, raw.product_id, raw.sku, raw.code);
  if (!productId) return null;

  let resolvedOriginal = toNumber(originalCandidate, NaN);
  if (!Number.isFinite(resolvedOriginal) && discount > 0 && price > 0) {
    resolvedOriginal = price / (1 - Math.min(99.9, Math.max(0, discount)) / 100);
  }
  if (!Number.isFinite(resolvedOriginal)) resolvedOriginal = 0;

  return {
    source: DATA_SOURCE.xapi,
    id: String(productId),
    shopId: firstNonNull(raw.shop_id, raw.shop?.id, raw.shopId),
    title,
    brand,
    category: categoryValue,
    subcategory: subcategoryValue,
    price: toNumber(price, 0),
    currency: firstNonNull(raw.currency, raw.currency_code, "$"),
    original: resolvedOriginal || null,
    image: firstNonNull(
      images[0],
      normalizeImageCandidate(raw.image, { shopId: raw.shop_id || raw.shop?.id }),
      normalizeImageCandidate(raw.icon, { shopId: raw.shop_id || raw.shop?.id }),
      normalizeImageCandidate(raw.thumbnail, { shopId: raw.shop_id || raw.shop?.id }),
      normalizeImageCandidate(raw.banner, { shopId: raw.shop_id || raw.shop?.id }),
      normalizeImageCandidate(raw.file, { shopId: raw.shop_id || raw.shop?.id }),
      0,
    ),
    images,
    badge: badgeCandidate || (discount > 0 ? "Sale" : ""),
    discount,
    colors: Math.max(1, Math.min(12, toNumber(colors, 1))),
    rating: Math.max(0, Math.min(5, rating)),
    reviews,
    sku: raw.sku || `PJ-${raw.id || ""}`,
    type: firstNonNull(raw.type, raw.product_type, raw.kind, ""),
    files: Array.isArray(raw.files) ? raw.files : [],
    file: raw.file,
    includes: Array.isArray(raw.includes) ? raw.includes : [],
    sells: Array.isArray(raw.sells) ? raw.sells : [],
    extraPricings: Array.isArray(raw.extra_pricings) ? raw.extra_pricings : Array.isArray(raw.extraPricings) ? raw.extraPricings : [],
    crossSells: firstNonNull(raw.cross_sells, raw.crossSells, raw.cross_sell, raw.crossSell, raw.related_products, raw.relatedProducts, raw.recommended_products, raw.recommendedProducts, []),
    createdAt: raw.created_at || raw.createdAt || null,
    updatedAt: raw.updated_at || raw.updatedAt || null,
    description: firstNonNull(
      raw.description,
      raw.summary,
      "A polished daily essential designed for fresh color, smooth wear, and an easy beauty routine.",
    ),
    article: firstNonNull(
      raw.article,
      raw.product_article,
      raw.productArticle,
      raw.article_data,
      raw.articleData,
      raw.article_pack?.article,
      raw.articlePack?.article,
      raw.blog,
      raw.data?.article,
      raw.payload?.article,
      raw.product?.article,
      raw.data?.product?.article,
      raw.payload?.product?.article,
      null,
    ),
    article_title: firstNonNull(
      raw.article_title,
      raw.articleTitle,
      raw.article?.title,
      raw.product_article?.title,
      raw.article_pack?.article?.title,
      raw.articlePack?.article?.title,
      raw.data?.article?.title,
      raw.payload?.article?.title,
      raw.product?.article?.title,
      raw.data?.product?.article?.title,
      raw.payload?.product?.article?.title,
      null,
    ),
    article_body_html: firstNonNull(
      raw.article_body_html,
      raw.articleBodyHtml,
      raw.article_html,
      raw.articleHtml,
      raw.body_html,
      raw.bodyHtml,
      raw.content_html,
      raw.contentHtml,
      raw.article?.body_html,
      raw.article?.bodyHtml,
      raw.article?.content_html,
      raw.article?.contentHtml,
      raw.product_article?.body_html,
      raw.product_article?.content_html,
      raw.article_pack?.article?.body_html,
      raw.article_pack?.article?.content_html,
      raw.articlePack?.article?.body_html,
      raw.articlePack?.article?.content_html,
      raw.data?.article?.body_html,
      raw.data?.article?.content_html,
      raw.payload?.article?.body_html,
      raw.payload?.article?.content_html,
      raw.product?.article?.body_html,
      raw.product?.article?.content_html,
      raw.data?.product?.article?.body_html,
      raw.data?.product?.article?.content_html,
      raw.payload?.product?.article?.body_html,
      raw.payload?.product?.article?.content_html,
      null,
    ),
    article_body: firstNonNull(
      raw.article_body,
      raw.articleBody,
      raw.article_text,
      raw.articleText,
      raw.article?.body,
      raw.article?.article_body,
      raw.article?.content,
      raw.article?.text,
      raw.product_article?.body,
      raw.product_article?.content,
      raw.article_pack?.article?.body,
      raw.article_pack?.article?.content,
      raw.articlePack?.article?.body,
      raw.articlePack?.article?.content,
      raw.data?.article?.body,
      raw.data?.article?.content,
      raw.payload?.article?.body,
      raw.payload?.article?.content,
      raw.product?.article?.body,
      raw.product?.article?.content,
      raw.data?.product?.article?.body,
      raw.data?.product?.article?.content,
      raw.payload?.product?.article?.body,
      raw.payload?.product?.article?.content,
      null,
    ),
    pros: normalizeProductPros(firstNonNull(raw.pros, raw.product_pros, raw.productPros, raw.features, null), {
      id: String(productId),
      title,
      category: categoryValue,
      subcategory: subcategoryValue,
      brand,
      description: firstNonNull(raw.description, raw.summary, ""),
    }),
    rate: raw.rate,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    productVariants: catalogVariants.length ? catalogVariants : Array.isArray(raw.productVariants) ? raw.productVariants : [],
    variants: mappedVariants,
    folder: categorySource,
  };
}

function normalizeProductVariants(rawVariants = [], rawProduct = null) {
  const productId = String(firstNonNull(rawProduct?.id, rawProduct?.product_id, rawProduct?.code, "product"));
  const list = Array.isArray(rawVariants) ? rawVariants : [];
  const fallbackVariants = Array.isArray(rawProduct?.product_variants) ? rawProduct.product_variants : [];
  const fallbackByIndex = fallbackVariants.length > 0 && fallbackVariants.length === list.length;

  return list
    .map((rawVariant, index) => {
      if (!rawVariant || typeof rawVariant !== "object") return null;
      const fallbackVariant = fallbackByIndex ? fallbackVariants[index] : null;
      const variant = {
        ...rawVariant,
        ...(fallbackVariant && typeof fallbackVariant === "object"
          ? (() => {
              const variantId = parseStorefrontVariantId(firstNonNull(rawVariant.variant_id, rawVariant.product_variant_id, rawVariant.variantId, rawVariant.id));
              const fallbackVariantId = parseStorefrontVariantId(
                firstNonNull(fallbackVariant.variant_id, fallbackVariant.product_variant_id, fallbackVariant.id, fallbackVariant.variantId),
              );
              if (variantId || !fallbackVariantId) return {};
              return {
                id: fallbackVariantId ? String(fallbackVariantId) : rawVariant.id,
                variant_id: firstNonNull(rawVariant.variant_id, fallbackVariant.variant_id, fallbackVariant.id),
                product_variant_id: firstNonNull(rawVariant.product_variant_id, fallbackVariant.product_variant_id, fallbackVariant.id),
              };
            })()
          : {}),
      };
      const variantId = firstNonNull(variant.id, variant.variant_id, variant.sku, variant.code, variant.name, variant.title);
      const key = String(firstNonNull(variantId, `${productId}-${index}`)).trim();
      const color = firstNonNull(variant.color, variant.colour, variant.hex, variant.color_code, variant.colour_code, variant.swatch_color);
      const optionEntries = extractVariantOptionEntries({ ...variant, __swatchColor: color ? String(color).trim() : "" });
      return {
        ...variant,
        __index: index,
        __key: `${productId}:${key}`,
        __swatchColor: color ? String(color).trim() : "",
        __options: optionEntries,
        __optionMap: Object.fromEntries(optionEntries.map((option) => [option.key, option.value])),
        __optionLabels: Object.fromEntries(optionEntries.map((option) => [option.key, option.label])),
        __optionDisplays: Object.fromEntries(optionEntries.map((option) => [option.key, option.display])),
      };
    })
    .filter(Boolean);
}

function getItemVariants(item) {
  return Array.isArray(item?.variants) ? item.variants : [];
}

function cleanVariantOptionValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return String(firstNonNull(value.value, value.name, value.title, value.label, value.code, value.hex, value.id, "")).trim();
  }
  return String(value).trim();
}

function variantOptionValueKey(value) {
  return cleanVariantOptionValue(value).toLowerCase();
}

function normalizeVariantOptionKey(label) {
  const text = String(label || "").trim().toLowerCase();
  const slug = toSlug(text);
  if (!slug) return "";
  if (/(colour|color|hex|swatch|رنگ)/i.test(text)) return "color";
  if (/(size|سایز|اندازه)/i.test(text)) return "size";
  if (/(volume|capacity|ml|milliliter|حجم)/i.test(text)) return "volume";
  if (/(weight|gram|gr|g$|وزن)/i.test(text)) return "weight";
  if (/(material|جنس)/i.test(text)) return "material";
  if (/(scent|fragrance|perfume|بو|رایحه)/i.test(text)) return "scent";
  if (/(flavo[u]?r|taste|طعم)/i.test(text)) return "flavor";
  if (/(pack|package|bundle|پک|بسته)/i.test(text)) return "pack";
  if (/(style|model|مدل)/i.test(text)) return "style";
  return slug;
}

function variantOptionLabel(key) {
  const labels = {
    color: "Color",
    size: "Size",
    volume: "Volume",
    weight: "Weight",
    material: "Material",
    scent: "Scent",
    flavor: "Flavor",
    pack: "Pack",
    style: "Style",
  };
  return labels[key] || titleCase(key);
}

function extractVariantOptionEntries(variant = {}) {
  const entries = [];
  const seen = new Set();
  const pushOption = (rawKey, rawLabel, rawValue, rawSwatch = "") => {
    const key = normalizeVariantOptionKey(rawKey || rawLabel);
    const display = cleanVariantOptionValue(rawValue);
    if (!key || !display) return;
    const signature = `${key}:${variantOptionValueKey(display)}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    entries.push({
      key,
      label: rawLabel || variantOptionLabel(key),
      value: variantOptionValueKey(display),
      display,
      swatch: cleanVariantOptionValue(rawSwatch),
    });
  };

  pushOption("color", "Color", firstNonNull(variant.color, variant.colour, variant.color_name, variant.colour_name, variant.hex, variant.color_code, variant.colour_code, variant.swatch_color), firstNonNull(variant.__swatchColor, variant.hex, variant.color_code, variant.colour_code, variant.swatch_color));
  pushOption("size", "Size", firstNonNull(variant.size, variant.size_name, variant.option_size));
  pushOption("volume", "Volume", firstNonNull(variant.volume, variant.volume_name, variant.capacity, variant.ml));
  pushOption("weight", "Weight", firstNonNull(variant.weight, variant.weight_name, variant.g, variant.gr));
  pushOption("material", "Material", firstNonNull(variant.material, variant.material_name));
  pushOption("scent", "Scent", firstNonNull(variant.scent, variant.fragrance, variant.perfume));
  pushOption("flavor", "Flavor", firstNonNull(variant.flavor, variant.flavour, variant.taste));
  pushOption("pack", "Pack", firstNonNull(variant.pack, variant.package, variant.bundle));
  pushOption("style", "Style", firstNonNull(variant.style, variant.model));

  const optionSources = [variant.options, variant.option, variant.attributes, variant.attribute, variant.properties, variant.property, variant.specs, variant.specifications, variant.values, variant.variant_options];
  optionSources.forEach((source) => {
    if (!source) return;
    if (Array.isArray(source)) {
      source.forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const label = firstNonNull(entry.label, entry.title, entry.name, entry.key, entry.type, entry.attribute, entry.option, "");
        const value = firstNonNull(entry.value, entry.val, entry.text, entry.title_value, entry.name_value, entry.label_value, entry.code, entry.name, "");
        pushOption(label, variantOptionLabel(normalizeVariantOptionKey(label)), value, firstNonNull(entry.color, entry.hex, entry.swatch, entry.swatch_color, ""));
      });
      return;
    }
    if (typeof source === "object") {
      Object.entries(source).forEach(([key, value]) => {
        pushOption(key, variantOptionLabel(normalizeVariantOptionKey(key)), value, value?.color || value?.hex || value?.swatch || "");
      });
    }
  });

  return entries;
}

function variantOptionMap(variant) {
  if (!variant || typeof variant !== "object") return {};
  if (variant.__optionMap && typeof variant.__optionMap === "object") return variant.__optionMap;
  return Object.fromEntries(extractVariantOptionEntries(variant).map((option) => [option.key, option.value]));
}

function variantMatchesOptions(variant, options = {}) {
  const map = variantOptionMap(variant);
  return Object.entries(options)
    .filter(([, value]) => String(value || "").trim())
    .every(([key, value]) => map[key] === variantOptionValueKey(value));
}

function variantKeyValue(variant) {
  return String(firstNonNull(variant?.__key, variant?.__index, variant?.id, variant?.variant_id, variant?.sku, variant?.code, "") || "");
}

function storedVariantSelection(productId) {
  const selected = productId ? state.activeProductVariantSelections[productId] : null;
  if (selected && typeof selected === "object") {
    return {
      variantKey: String(selected.variantKey || ""),
      options: selected.options && typeof selected.options === "object" ? selected.options : {},
    };
  }
  return {
    variantKey: String(selected || ""),
    options: {},
  };
}

function activeProductVariant(item) {
  const productId = String(item?.id || "").trim();
  const variants = getItemVariants(item);
  if (!variants.length) return null;

  const selected = storedVariantSelection(productId);
  if (selected.variantKey) {
    const byKey = variants.find((variant) => variantKeyValue(variant) === selected.variantKey);
    if (byKey) return byKey;

    const byIndex = Number(selected.variantKey);
    if (Number.isInteger(byIndex) && variants[byIndex]) {
      return variants[byIndex];
    }
  }

  if (selected.options && Object.keys(selected.options).length) {
    const byOptions = variants.find((variant) => variantMatchesOptions(variant, selected.options));
    if (byOptions) return byOptions;
  }

  return variants[0] || null;
}

function setActiveProductVariantSelection(productId, variant) {
  const id = String(productId || "").trim();
  if (!id || !variant || typeof variant !== "object") {
    if (id) delete state.activeProductVariantSelections[id];
    return;
  }

  const key = variantKeyValue(variant) || firstNonNull(variant.name, variant.title);
  if (!key) return;
  state.activeProductVariantSelections[id] = {
    variantKey: String(key),
    options: variantOptionMap(variant),
  };
}

function selectProductVariantOption(productId, optionKey, optionValue) {
  const id = String(productId || "").trim();
  const item = getProductById(id);
  const variants = getItemVariants(item);
  if (!id || !variants.length) return null;

  const current = activeProductVariant(item) || variants[0];
  const currentSelection = storedVariantSelection(id);
  const nextOptions = {
    ...variantOptionMap(current),
    ...currentSelection.options,
    [optionKey]: variantOptionValueKey(optionValue),
  };
  const nextVariant =
    variants.find((variant) => variantMatchesOptions(variant, nextOptions)) ||
    variants.find((variant) => variantMatchesOptions(variant, { [optionKey]: optionValue })) ||
    current;

  state.activeProductVariantSelections[id] = {
    variantKey: variantKeyValue(nextVariant),
    options: {
      ...nextOptions,
      ...variantOptionMap(nextVariant),
    },
  };
  return nextVariant;
}

function variantPrimaryImage(variant) {
  return firstNonNull(
    variant?.image,
    variant?.icon,
    variant?.path,
    variant?.url,
    variant?.filename,
    variant?.photo,
    variant?.cover,
  );
}

function isColorLike(value) {
  const color = String(value || "").trim();
  if (!color) return false;

  return (
    /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) ||
    /^(rgba?|hsla?)\(/i.test(color) ||
    /^[a-zA-Z]+$/.test(color)
  );
}

function variantSwatchColor(variant) {
  return String(
    firstNonNull(
      variant?.__swatchColor,
      variant?.color,
      variant?.colour,
      variant?.hex,
      variant?.color_code,
      variant?.colour_code,
      variant?.swatch_color,
    ) || "",
  ).trim();
}

function variantLabel(variant, index = 0) {
  const color = variantSwatchColor(variant);
  const named = firstNonNull(
    variant?.title,
    variant?.name,
    variant?.label,
    variant?.option_name,
    variant?.size_name,
    variant?.volume_name,
  );
  const extra = firstNonNull(variant?.volume, variant?.size, variant?.weight, variant?.capacity, variant?.ml, variant?.g, variant?.gr);
  const fallback = firstNonNull(variant?.sku, variant?.code, variant?.id);
  return firstNonNull(
    color && extra ? `${color} / ${extra}` : "",
    named || "",
    color,
    extra,
    fallback,
    `Variant ${index + 1}`,
  );
}

function isTechnicalColorValue(value) {
  const color = String(value || "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) || /^(rgba?|hsla?)\(/i.test(color);
}

function safeVariantSwatchColor(value) {
  const color = String(value || "").trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return color;
  if (/^[a-zA-Z]+$/.test(color)) return color;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(color)) return color;
  return "";
}

function variantOptionDisplayValue(option = {}, variant = {}) {
  if (option.key !== "color") return cleanVariantOptionValue(option.display);
  const namedColor = firstNonNull(
    variant?.color_name,
    variant?.colour_name,
    variant?.color_title,
    variant?.colour_title,
    variant?.color_label,
    variant?.colour_label,
  );
  const namedColorText = cleanVariantOptionValue(namedColor);
  if (namedColorText) return namedColorText;
  const display = cleanVariantOptionValue(option.display);
  return isTechnicalColorValue(display) ? "" : display;
}

function variantDetailEntries(variant, index = 0) {
  if (!variant || typeof variant !== "object") return [];
  const options = (Array.isArray(variant.__options) && variant.__options.length ? variant.__options : extractVariantOptionEntries(variant))
    .map((option) => ({
      label: option.label || variantOptionLabel(option.key),
      display: variantOptionDisplayValue(option, variant),
      key: option.key,
      swatch: option.key === "color"
        ? safeVariantSwatchColor(firstNonNull(option.swatch, variant?.__swatchColor, variant?.hex, variant?.color_code, variant?.colour_code, variant?.swatch_color, variant?.color, variant?.colour, ""))
        : "",
    }))
    .filter((option) => option.display || option.swatch);
  const seen = new Set();
  const uniqueOptions = options.filter((option) => {
    const signature = `${option.key}:${String(option.display).toLowerCase()}:${String(option.swatch).toLowerCase()}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
  if (uniqueOptions.length) return uniqueOptions;
  const fallback = cleanVariantOptionValue(variantLabel(variant, index));
  if (!fallback || isTechnicalColorValue(fallback)) return [];
  return [{ label: "Variant", display: fallback, key: "variant" }];
}

function variantDetailsText(variant, index = 0) {
  return variantDetailEntries(variant, index)
    .map((entry) => `${entry.label}: ${entry.display}`)
    .join(" / ");
}

function variantDetailsMarkup(variant, index = 0, className = "variant-detail-list") {
  const entries = variantDetailEntries(variant, index);
  if (!entries.length) return "";
  return `
    <dl class="${escapeHtml(className)}">
      ${entries.map((entry) => {
        const swatch = entry.swatch ? `<span class="variant-detail-swatch" style="--variant-swatch:${escapeHtml(entry.swatch)}" aria-hidden="true"></span>` : "";
        return `<div>${swatch}<dt>${escapeHtml(entry.label)}</dt>${entry.display ? `<dd>${escapeHtml(entry.display)}</dd>` : ""}</div>`;
      }).join("")}
    </dl>
  `;
}

function variantChipLabel(variant, index = 0) {
  const label = variantLabel(variant, index);
  return label.length > 10 ? `${label.slice(0, 8)}…` : label;
}

function resolveVariantPrice(variant, fallback = 0) {
  if (!variant || typeof variant !== "object") return toNumber(fallback, 0);
  const price = toNumber(
    firstNonNull(
      variant.price,
      variant.final_price,
      variant.sale_price,
      variant.priced_value,
      variant.list_price,
      variant.regular_price,
      variant.base_price,
    ),
    NaN,
  );
  if (Number.isFinite(price) && price > 0) return price;
  const fallbackValue = toNumber(fallback, 0);
  return fallbackValue > 0 ? fallbackValue : 0;
}

function resolveVariantOriginalPrice(variant, fallbackPrice = 0, fallbackOriginal = 0) {
  if (!variant || typeof variant !== "object") return toNumber(fallbackOriginal, 0);

  const original = toNumber(
    firstNonNull(
      variant.original,
      variant.original_price,
      variant.regular_price,
      variant.compare_at_price,
      variant.base_price,
      variant.list_price,
    ),
    NaN,
  );
  if (Number.isFinite(original) && original > 0) return original;

  const discount = toNumber(variant.discount, 0);
  if (discount > 0 && Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
    return fallbackPrice / (1 - Math.min(99.9, Math.max(0, discount)) / 100);
  }

  return toNumber(fallbackOriginal, 0);
}

function buildVariantOptionGroups(variants = []) {
  const groups = new Map();
  variants.forEach((variant) => {
    const options = Array.isArray(variant.__options) && variant.__options.length ? variant.__options : extractVariantOptionEntries(variant);
    options.forEach((option) => {
      if (!groups.has(option.key)) {
        groups.set(option.key, {
          key: option.key,
          label: option.label || variantOptionLabel(option.key),
          values: new Map(),
        });
      }
      const group = groups.get(option.key);
      if (!group.values.has(option.value)) {
        group.values.set(option.value, {
          value: option.value,
          display: option.display,
          swatch: option.swatch,
          variants: [],
        });
      }
      group.values.get(option.value).variants.push(variant);
    });
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      values: Array.from(group.values.values()),
    }))
    .filter((group) => group.values.length > 1);
}

function renderVariantFallbackButtons(variants, productId, selectedVariant) {
  const activeKey = variantKeyValue(selectedVariant);
  return `
    <div class="shade-grid" role="group" aria-label="Select variant">
      ${variants
        .map((variant) => {
          const key = variantKeyValue(variant);
          const isActive = key && activeKey ? key === activeKey : variant === selectedVariant;
          const color = variantSwatchColor(variant);
          if (isColorLike(color)) {
            return `
              <button class="shade-dot ${isActive ? "is-active" : ""}" type="button" data-variant-product="${escapeHtml(productId)}" data-variant-key="${escapeHtml(key)}" aria-label="${escapeHtml(variantLabel(variant, variant.__index || 0))}">
                <span style="--shade:${escapeHtml(color)}"></span>
              </button>
            `;
          }

          const fullLabel = variantLabel(variant, variant.__index || 0);
          const label = variantChipLabel(variant, variant.__index || 0);
          return `
            <button class="shade-dot ${isActive ? "is-active" : ""}" type="button" data-variant-product="${escapeHtml(productId)}" data-variant-key="${escapeHtml(key)}" aria-label="${escapeHtml(fullLabel)}">
              <span class="shade-dot-label" title="${escapeHtml(fullLabel)}">${escapeHtml(label)}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderVariantOptionGroups(variants, productId, selectedVariant) {
  const groups = buildVariantOptionGroups(variants);
  if (!groups.length) return renderVariantFallbackButtons(variants, productId, selectedVariant);

  const selection = storedVariantSelection(productId);
  const selectedOptions = {
    ...variantOptionMap(selectedVariant),
    ...selection.options,
  };

  return `
    <div class="variant-option-groups">
      ${groups
        .map((group) => `
          <div class="variant-option-group">
            <div class="variant-option-head">
              <strong>${escapeHtml(group.label || variantOptionLabel(group.key))}</strong>
              <span>${escapeHtml(group.key === "color" && selectedOptions[group.key] ? "Selected" : group.values.find((entry) => entry.value === selectedOptions[group.key])?.display || "Choose one")}</span>
            </div>
            <div class="variant-option-values" role="group" aria-label="Select ${escapeHtml(group.label || group.key)}">
              ${group.values
                .map((option) => {
                  const nextOptions = { ...selectedOptions, [group.key]: option.value };
                  const isAvailable =
                    variants.some((variant) => variantMatchesOptions(variant, nextOptions)) ||
                    variants.some((variant) => variantMatchesOptions(variant, { [group.key]: option.value }));
                  const isActive = selectedOptions[group.key] === option.value;
                  const swatch = option.swatch || (group.key === "color" ? option.display : "");
                  const colorMarkup = group.key === "color" && isColorLike(swatch)
                    ? `<span class="variant-option-swatch" style="--shade:${escapeHtml(swatch)}"></span>`
                    : "";
                  const textMarkup = group.key === "color" && colorMarkup ? "" : `<span>${escapeHtml(option.display)}</span>`;
                  return `
                    <button
                      class="variant-option-button ${group.key === "color" ? "variant-option-button--color" : ""} ${isActive ? "is-active" : ""}"
                      type="button"
                      data-variant-option-product="${escapeHtml(productId)}"
                      data-variant-option-name="${escapeHtml(group.key)}"
                      data-variant-option-value="${escapeHtml(option.value)}"
                      aria-pressed="${isActive ? "true" : "false"}"
                      ${isAvailable ? "" : "disabled"}
                    >
                      ${colorMarkup}
                      ${textMarkup}
                    </button>
                  `;
                })
                .join("")}
            </div>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function renderVariantSection(item) {
  const variants = getItemVariants(item);
  if (!variants.length) {
    const colors = Math.max(1, Math.min(12, toNumber(item.colors, 1)));
    const shadeList = shadePalette.slice(0, Math.min(Math.max(colors, 1), shadePalette.length));
    return `
      <section class="shade-section">
        <div class="shade-head">
          <div>
            <strong>Color: ${shadeName(state.activeShade)}</strong>
            <span class="shade-count">${colors} shades</span>
          </div>
          <button class="text-link" type="button">Find your shade</button>
        </div>
        <div class="shade-grid" role="group" aria-label="Select shade">
          ${shadeList
            .map(
              (shade, index) => `
                <button class="shade-dot ${index === state.activeShade ? "is-active" : ""}" type="button" data-shade="${index}" aria-label="${shadeName(index)}">
                  <span style="--shade:${shade}"></span>
                </button>
              `,
            )
            .join("")}
        </div>
      </section>
    `;
  }

  const productId = String(item?.id || "").trim();
  const selectedVariant = activeProductVariant(item);
  const heading = selectedVariant ? variantLabel(selectedVariant, selectedVariant?.__index || 0) : "Choose variant";

  return `
    <section class="shade-section">
      <div class="shade-head">
        <div>
          <strong>Selected: ${escapeHtml(heading)}</strong>
          <span class="shade-count">${variants.length} ${variants.length === 1 ? "variant" : "variants"}</span>
        </div>
      </div>
      ${renderVariantOptionGroups(variants, productId, selectedVariant)}
    </section>
  `;
}

function renderProductImage(item, className = "product-sprite", media = null) {
  const target = media == null ? item?.image : media;
  const source = normalizeImageCandidate(target, { shopId: firstNonNull(item?.shopId, item?.shop_id) });
  if (typeof source === "number") return renderSprite(source, className);
  if (typeof source === "string" && source.trim()) {
    return `<img class="${className}" src="${escapeHtml(source)}" alt="${escapeHtml(item?.title || "Product image")}" loading="lazy" />`;
  }
  return renderSprite(toNumber(item?.image, 0), className);
}

function getProductsForUi() {
  return state.products;
}

function productTotal() {
  return getProductsForUi().length;
}

function getProductById(productId) {
  const needle = String(productId || "").trim();
  if (!needle) return null;
  return (
    getProductsForUi().find((entry) => {
      if (!entry || typeof entry !== "object") return false;
      return (
        String(entry.id || "").trim() === needle ||
        String(entry.product_id || "").trim() === needle ||
        String(entry.sku || "").trim() === needle ||
        String(entry.code || "").trim() === needle
      );
    }) || null
  );
}

function syncRouteSearch(query) {
  state.search = query.get("search") || "";
  state.activeCategory = query.get("category") || "all";
  state.activeDiscountOnly = ["1", "true", "yes"].includes(String(query.get("discount") || "").toLowerCase());
  if (els.searchInput) els.searchInput.value = state.search;
  closeMobileMenu();
}

function responseProducts(payload) {
  const products = firstArray(
    payload?.products,
    payload?.data?.products,
    payload?.data?.data?.products,
    payload?.data?.response?.products,
    payload?.result?.products,
    payload?.result?.data?.products,
    payload?.result?.response?.products,
    payload?.payload?.products,
    payload?.payload?.data?.products,
    payload?.payload?.result?.products,
    payload?.payload?.response?.products,
    payload?.data?.payload?.products,
    payload?.items,
    payload?.data?.items,
    payload?.result?.items,
    payload?.payload?.items,
    payload?.payload?.data?.items,
    payload?.result?.data?.items,
    payload?.data,
  );
  if (products.length) return products;

  const singleProduct = firstNonNull(
    payload?.product,
    payload?.data?.product,
    payload?.result?.product,
    payload?.payload?.product,
    payload?.payload?.data?.product,
    payload?.result?.data?.product,
    payload?.response?.product,
    payload?.response?.data?.product,
    payload?.data?.response?.product,
    payload?.result?.response?.product,
    payload?.payload?.response?.product,
    payload?.payload?.response?.product,
  );
  return singleProduct ? [singleProduct] : [];
}

function responseArticles(payload) {
  return firstArray(
    payload?.articles,
    payload?.blogs,
    payload?.data?.articles,
    payload?.data?.blogs,
    payload?.result?.articles,
    payload?.result?.blogs,
    payload?.payload?.articles,
    payload?.payload?.blogs,
    payload?.payload?.data?.articles,
    payload?.payload?.data?.blogs,
    payload?.data?.payload?.articles,
    payload?.data?.payload?.blogs,
    payload?.items,
    payload?.data?.items,
    payload?.result?.items,
    payload?.payload?.items,
  );
}

function responseBlogCategories(payload) {
  return firstArray(
    payload?.categories,
    payload?.data?.categories,
    payload?.result?.categories,
    payload?.payload?.categories,
    payload?.data?.payload?.categories,
  );
}

function normalizeBlogImage(rawArticle, index = 0) {
  const imageSource = firstNonNull(
    rawArticle?.image,
    rawArticle?.cover,
    rawArticle?.thumbnail,
    rawArticle?.photo,
    rawArticle?.icon,
    rawArticle?.banner,
    rawArticle?.file,
    rawArticle?.files?.[0]?.path,
    rawArticle?.files?.[0]?.url,
  );

  if (typeof imageSource === "string") {
    const direct = imageSource.trim();
    if (!direct) return index % (SPRITE_COLUMNS * SPRITE_ROWS);
    return pickImagePath(direct, { scope: "blogs", shopId: rawArticle?.shop_id || rawArticle?.shop?.id }) ||
      pickImagePath(direct, { scope: "articles", shopId: rawArticle?.shop_id || rawArticle?.shop?.id }) ||
      direct;
  }

  const normalized = normalizeImageCandidate(imageSource, { shopId: rawArticle?.shop_id || rawArticle?.shop?.id });
  return normalized ?? index % (SPRITE_COLUMNS * SPRITE_ROWS);
}

function truthyFlag(value) {
  return value === true || value === 1 || String(value || "").trim().toLowerCase() === "true";
}

function falseyFlag(value) {
  return value === false || value === 0 || String(value || "").trim().toLowerCase() === "false";
}

function extractBlogArticleContent(rawArticle = {}, fallbackArticle = null) {
  const article = rawArticle || {};
  const nestedArticle = fallbackArticle || (article.article && typeof article.article === "object" ? article.article : {});
  return String(firstNonNull(
    article.body,
    article.content,
    article.html,
    article.text,
    article.article_body,
    article.raw_body,
    article.body_html,
    article.content_html,
    nestedArticle.body,
    nestedArticle.content,
    nestedArticle.html,
    nestedArticle.text,
    nestedArticle.article_body,
    nestedArticle.body_html,
    nestedArticle.content_html,
    "",
  )).trim();
}

function mapBlogArticle(raw, index = 0) {
  if (!raw || typeof raw !== "object") return null;
  const id = firstNonNull(raw.id, raw.article_id, raw.articleId, raw.code, raw.slug);
  const title = String(firstNonNull(raw.title, raw.name, raw.heading, "")).trim();
  if (!id || !title) return null;

  const parent = raw.parent && typeof raw.parent === "object" ? raw.parent : {};
  const categorySource = firstNonNull(raw.category, raw.category_name, raw.category_slug, raw.blog_category, parent.category, parent.category_id, "");
  const author = raw.user && typeof raw.user === "object"
    ? firstNonNull(raw.user.name, raw.user.username, raw.user.profile?.name, "")
    : firstNonNull(raw.author, raw.writer, "");
  const description = String(firstNonNull(raw.description, raw.summary, raw.excerpt, raw.subtitle, "")).trim();
  const content = extractBlogArticleContent(raw);

  return {
    ...raw,
    id: String(id),
    slug: String(firstNonNull(raw.slug, toSlug(title), id)).trim(),
    title,
    description,
    content,
    image: normalizeBlogImage(raw, index),
    category: categorySource ? String(categorySource).trim() : "Beauty Notes",
    author: String(author || "Pajulina").trim(),
    createdAt: firstNonNull(raw.created_at, raw.createdAt, raw.published_at, raw.publishedAt, raw.date, ""),
    updatedAt: firstNonNull(raw.updated_at, raw.updatedAt, ""),
    published: !falseyFlag(raw.published),
    private: truthyFlag(raw.private),
  };
}

function blogArticleHasFullContent(article = {}) {
  return Boolean(extractBlogArticleContent(article));
}

function applyStorefrontBlogs(payload) {
  const rawArticles = responseArticles(payload);
  state.blogs = rawArticles.map(mapBlogArticle).filter((article) => article && article.published && !article.private);
  state.blogCategories = responseBlogCategories(payload);
  state.blogTotal = toInteger(firstNonNull(payload?.total, payload?.data?.total, state.blogs.length), state.blogs.length) || state.blogs.length;
  state.blogsLoadError = "";
  state.blogsLoaded = true;
  return true;
}

async function fetchStorefrontBlogsViaProxy() {
  const response = await fetch(`/api/storefront/blogs?limit=${BLOG_LIMIT}`, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Local Selldone blog proxy failed with status ${response.status}.`);
  }
  return payload;
}

async function fetchStorefrontBlogArticleViaProxy(articleId) {
  const target = String(articleId || "").trim();
  if (!target) return null;
  const response = await fetch(`/api/storefront/blogs/${encodeURIComponent(target)}`, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Local Selldone blog article proxy failed with status ${response.status}.`);
  }
  return payload;
}

function upsertBlogArticle(rawArticle) {
  const mapped = mapBlogArticle(rawArticle, state.blogs.length);
  if (!mapped) return null;
  const nextBlogs = [...state.blogs];
  const index = nextBlogs.findIndex((entry) => String(entry.id) === String(mapped.id) || String(entry.slug) === String(mapped.slug));
  if (index >= 0) {
    nextBlogs[index] = {
      ...nextBlogs[index],
      ...mapped,
      content: mapped.content || nextBlogs[index].content || "",
    };
  } else {
    nextBlogs.unshift(mapped);
  }
  state.blogs = nextBlogs;
  return index >= 0 ? state.blogs[index] : mapped;
}

async function ensureBlogArticleLoaded(articleId) {
  const existing = findBlogArticle(articleId);
  if (existing?.content) return existing;

  try {
    const payload = await fetchStorefrontBlogArticleViaProxy(articleId);
    const article = firstNonNull(
      payload?.article,
      payload?.blog,
      payload?.data?.article,
      payload?.data?.blog,
      payload?.result?.article,
      payload?.result?.blog,
      payload?.payload?.article,
      payload?.payload?.blog,
      payload?.payload?.data?.article,
      payload?.payload?.data?.blog,
      payload?.data?.payload?.article,
      payload?.data?.payload?.blog,
      responseArticles(payload).find((entry) => {
        const needle = String(articleId || "").trim();
        return [
          entry?.id,
          entry?.slug,
          entry?.parent_id,
          entry?.parent?.id,
          entry?.blog_id,
          entry?.blogId,
        ].some((value) => String(firstNonNull(value, "")).trim() === needle);
      }),
      null,
    );
    const mapped = upsertBlogArticle(article);
    if (blogArticleHasFullContent(mapped)) return mapped;
    state.blogsLoadError = "Selldone did not return the full article content for this post.";
    return mapped || existing || null;
  } catch (error) {
    console.warn("Selldone blog article detail fetch failed:", error);
    state.blogsLoadError = `Could not load Selldone blog post content. ${error.message || ""}`.trim();
    return existing || null;
  }
}

async function ensureBlogsLoaded(force = false) {
  if (!force && state.blogsLoaded) return;
  if (state.blogsLoading) return;
  state.blogsLoading = true;
  state.blogsLoadError = "";
  try {
    const payload = await fetchStorefrontBlogsViaProxy();
    applyStorefrontBlogs(payload);
  } catch (error) {
    state.blogs = [];
    state.blogCategories = [];
    state.blogTotal = 0;
    state.blogsLoaded = true;
    state.blogsLoadError = `Could not load Selldone blog posts. ${error.message || ""}`.trim();
    console.error("Selldone blog load failed:", error);
  } finally {
    state.blogsLoading = false;
  }
}

function blogArticleUrl(article) {
  const key = firstNonNull(article?.parent_id, article?.parent?.id, article?.blog_id, article?.blogId, article?.slug, article?.id, "");
  return `#blog/${encodeURIComponent(String(key))}`;
}

function blogArticleDate(article) {
  const value = firstNonNull(article?.createdAt, article?.created_at, article?.published_at, "");
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
}

function renderBlogImage(article, className = "blog-card-media") {
  if (typeof article?.image === "number") {
    return `<div class="${className}">${renderSprite(article.image, "blog-sprite")}</div>`;
  }
  if (typeof article?.image === "string" && article.image.trim()) {
    return `<div class="${className}"><img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title || "Blog image")}" loading="lazy" /></div>`;
  }
  return `<div class="${className} blog-card-media--fallback"><span>Pajulina Notes</span></div>`;
}

function renderBlogCard(article, options = {}) {
  const compact = Boolean(options.compact);
  return `
    <article class="blog-card ${compact ? "blog-card--compact" : ""}">
      <a href="${blogArticleUrl(article)}" aria-label="${escapeHtml(article.title)}">
        ${renderBlogImage(article)}
      </a>
      <div class="blog-card-copy">
        <div class="blog-meta">
          <span>${escapeHtml(article.category || "Beauty Notes")}</span>
          ${blogArticleDate(article) ? `<span>${escapeHtml(blogArticleDate(article))}</span>` : ""}
        </div>
        <h2><a href="${blogArticleUrl(article)}">${escapeHtml(article.title)}</a></h2>
        <p>${escapeHtml(blogArticleSummary(article))}</p>
        <a class="text-link" href="${blogArticleUrl(article)}">Read article</a>
      </div>
    </article>
  `;
}

function blogCategoryLabel(rawCategory) {
  if (!rawCategory || typeof rawCategory !== "object") return String(rawCategory || "").trim();
  return String(firstNonNull(rawCategory.title, rawCategory.name, rawCategory.label, rawCategory.slug, rawCategory.id, "")).trim();
}

function renderBlogCategoryChips(activeCategory = "all") {
  const labels = Array.from(new Set(state.blogCategories.map(blogCategoryLabel).filter(Boolean)));
  if (!labels.length) return "";
  return `
    <div class="filter-bar blog-filter-bar" role="group" aria-label="Filter blog posts">
      <a class="filter-chip ${activeCategory === "all" ? "is-active" : ""}" href="#blog">All</a>
      ${labels
        .map((label) => {
          const key = toSlug(label) || label;
          return `<a class="filter-chip ${activeCategory === key ? "is-active" : ""}" href="#blog?category=${encodeURIComponent(key)}">${escapeHtml(label)}</a>`;
        })
        .join("")}
    </div>
  `;
}

function sanitizeArticleHtml(rawHtml) {
  const value = String(rawHtml || "").trim();
  if (!value) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<article>${value}</article>`, "text/html");
  doc.querySelectorAll("script, style, iframe, object, embed, form, input, button").forEach((node) => node.remove());
  doc.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const content = String(attribute.value || "").trim().toLowerCase();
      if (name.startsWith("on") || content.startsWith("javascript:") || name === "style") {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return doc.body.firstElementChild?.innerHTML || "";
}

function renderBlogBody(article) {
  const content = sanitizeArticleHtml(extractBlogArticleContent(article));
  if (content) return content;
  const fallback = String(state.blogsLoadError || "").trim() || "The complete article body is not available from Selldone yet.";
  return `<p>${escapeHtml(fallback)}</p>`;
}

function blogArticleSummary(article, maxLength = 160) {
  const bodyText = String(extractBlogArticleContent(article) || "").trim();
  if (!bodyText) return "Read the latest Pajulina storefront update.";
  const plain = bodyText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, Math.max(0, maxLength)).trim()}...`;
}

function findBlogArticle(articleId) {
  const rawNeedle = String(articleId || "").trim();
  const needle = (() => {
    try {
      return decodeURIComponent(rawNeedle);
    } catch {
      return rawNeedle;
    }
  })();
  if (!needle) return null;
  return state.blogs.find((article) => [
    article.id,
    article.slug,
    article.parent_id,
    article.parent?.id,
    article.blog_id,
    article.blogId,
  ].some((value) => String(firstNonNull(value, "")).trim() === needle)) || null;
}

function renderBlogTeaserSection() {
  const items = state.blogs.slice(0, 3);
  if (!items.length) return "";
  return `
    <section class="section blog-preview-section">
      <div class="section-head">
        <div>
          <h2>Latest beauty notes</h2>
          <p>Fresh updates, routines, and selling ideas from Pajulina.</p>
        </div>
        <a class="text-link" href="#blog">View all posts</a>
      </div>
      <div class="blog-preview-grid">
        ${items.map((article) => renderBlogCard(article, { compact: true })).join("")}
      </div>
    </section>
  `;
}

function renderHomeBlogImage(article) {
  if (typeof article?.image === "number") {
    return renderSprite(article.image, "blog-sprite");
  }
  if (typeof article?.image === "string" && article.image.trim()) {
    return `<img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title || "Blog image")}" loading="lazy" />`;
  }
  return `<span class="home-blog-fallback">Pajulina Notes</span>`;
}

function renderHomeBlogTile(article) {
  const date = blogArticleDate(article);
  const description = blogArticleSummary(article, 120);
  return `
    <article class="home-blog-tile">
      <a class="home-blog-media" href="${blogArticleUrl(article)}" aria-label="${escapeHtml(article.title)}">
        ${renderHomeBlogImage(article)}
      </a>
      <div class="home-blog-copy">
        <div class="blog-meta">
          <span>${escapeHtml(article.category || "Beauty Notes")}</span>
          ${date ? `<span>${escapeHtml(date)}</span>` : ""}
        </div>
        <h3><a href="${blogArticleUrl(article)}">${escapeHtml(article.title)}</a></h3>
        <p>${escapeHtml(description)}</p>
      </div>
    </article>
  `;
}

function renderHomeBlogBand() {
  const items = state.blogs.slice(0, 4);
  const loadMessage = state.blogsLoadError || "Blog posts are loading from Selldone.";
  return `
    <section class="section" id="journal">
      <div class="home-blog-band ${items.length ? "" : "home-blog-band--empty"}">
        <div class="home-blog-lead">
          <span class="eyebrow">Pajulina journal</span>
          <h2>Latest beauty notes</h2>
          <p>${items.length ? "Fresh routines, product stories, and store updates from the Selldone blog." : escapeHtml(loadMessage)}</p>
          <a class="pill-button light" href="#blog">${items.length ? "View all posts" : "Open blog"}</a>
        </div>
        ${items.map((article) => renderHomeBlogTile(article)).join("")}
      </div>
    </section>
  `;
}

function responseFolders(payload) {
  return firstArray(
    payload?.folders,
    payload?.data?.folders,
    payload?.result?.folders,
    payload?.payload?.folders,
    payload?.payload?.data?.folders,
    payload?.payload?.result?.folders,
    payload?.data?.data?.folders,
    payload?.categories,
    payload?.data?.categories,
    payload?.result?.categories,
    payload?.payload?.categories,
    payload?.payload?.data?.categories,
    payload?.payload?.result?.categories,
  );
}

function responseTransportations(payload) {
  if (Array.isArray(payload)) return payload;
  return firstArray(
    payload?.transportations,
    payload?.shop?.transportations,
    payload?.data?.transportations,
    payload?.data?.data?.transportations,
    payload?.data?.shop?.transportations,
    payload?.result?.transportations,
    payload?.result?.shop?.transportations,
    payload?.result?.data?.transportations,
    payload?.payload?.transportations,
    payload?.payload?.shop?.transportations,
    payload?.payload?.data?.transportations,
    payload?.payload?.data?.shop?.transportations,
    payload?.payload?.result?.transportations,
    payload?.payload?.result?.data?.transportations,
    payload?.result?.data?.shop?.transportations,
  );
}

function normalizeShopTransportations(list) {
  const raw = Array.isArray(list) ? list : [];
  const activeTransportations = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const type = String(item.type || "").trim();
      if (!type || item.enable === false) return null;
      const normalized = {
        ...item,
        type,
        sod: type.toLowerCase() === "pickup" ? false : item.sod,
        const: type.toLowerCase() === "pickup" ? 10 : item.const,
      };
      return normalized;
    })
    .filter(Boolean);

  const priority = (item) => {
    const type = String(item.type || "").trim().toLowerCase();
    if (type === "motorbike") return 0;
    if (type === "pickup") return 1;
    return 2;
  };

  return activeTransportations.sort((a, b) => {
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    return String(a.type || "").localeCompare(String(b.type || ""));
  });
}

function transportTitle(transport) {
  const type = String(transport?.type || "").trim().toLowerCase();
  if (type === "motorbike") return transport?.sod ? "Same Day" : "Delivery";
  if (type === "pickup") return "Pickup";
  if (type === "shipping") return "Shipping";
  return titleCase(type || "delivery");
}

function transportTypeValue(transport) {
  return String(transport?.type || "").trim().toLowerCase();
}

function transportDescription(transport) {
  const type = transportTypeValue(transport);
  const currency = String(transport?.currency || "USD").trim();
  const cost = calculateTransportCost(transport);
  const freeShipping = transport?.free_shipping === true || transport?.free_shipping === 1;
  const freeLimit = toNumber(transport?.free_shipping_limit, 0);

  if (type === "pickup") {
    if (freeShipping) return "Free pickup";
    return `${formatPrice(cost, currency)} pickup`;
  }

  if (freeShipping && freeLimit > 0) return `Free on ${formatPrice(freeLimit, currency)}+ orders`;
  if (freeShipping) return "Free shipping";
  if (cost > 0) return `${formatPrice(cost, currency)} shipping`;
  return transport?.sod ? "Same-day delivery" : "Delivery";
}

function deliveryCost(transport, orderSubtotal = 0) {
  const type = transportTypeValue(transport);
  const freeShipping = transport?.free_shipping === true || transport?.free_shipping === 1;
  const freeLimit = toNumber(transport?.free_shipping_limit, 0);
  if (type === "pickup") return 10;
  if (freeShipping && freeLimit > 0 && orderSubtotal >= freeLimit) return 0;
  if (freeShipping) return 0;
  return toNumber(transport?.const, 0);
}

function calculateTransportCost(transport, orderSubtotal = 0) {
  return Math.max(0, deliveryCost(transport, orderSubtotal));
}

function transportSelectionKey(transport, fallback = "shipping") {
  if (!transport || typeof transport !== "object") return "";
  return firstNonNull(
    transport.key,
    transport.code,
    transport.id,
    transport.option_id,
    transport.value,
    `${String(transportTypeValue(transport) || fallback)}-${String(transport.currency || "USD").toLowerCase()}`,
  );
}

function pickTransportByKey(transportations, key) {
  const target = String(key || "").trim();
  if (!target) return null;
  const normalized = normalizeShopTransportations(transportations);
  return normalized.find((transport) => String(transportSelectionKey(transport)) === target) || null;
}

function transportationSelectionExists(transportations, key) {
  return pickTransportByKey(transportations, key) !== null;
}

function resolveCheckoutTransport(transportations = [], selectedKey = "") {
  const normalized = normalizeShopTransportations(transportations);
  if (!normalized.length) return null;

  const selected = pickTransportByKey(normalized, selectedKey);
  if (selected) return selected;

  const fallbackType = String(selectedKey || "").replace(/-default$/, "").trim().toLowerCase();
  if (fallbackType) {
    const byType = normalized.find((transport) => String(transportTypeValue(transport) || "").trim().toLowerCase() === fallbackType);
    if (byType) return byType;
  }

  return normalized.find((transport) => String(transportTypeValue(transport) || "").trim().toLowerCase() === "shipping") || normalized[0] || null;
}

function renderDeliveryCards(transportations = [], options = {}) {
  const normalized = normalizeShopTransportations(transportations);
  const productId = firstNonNull(options.productId, "");
  const context = String(options.context || options.scope || "").trim().toLowerCase();
  const selected = options.selectedKey || "";
  if (!normalized.length) {
    const shipActive = selected === "shipping-default" || !selected;
    const pickupActive = selected === "pickup-default";
    const motorActive = selected === "motorbike-default";
    return `
      <div class="delivery-cards">
        <button type="button" class="delivery-card ${shipActive ? "is-active" : ""}" data-delivery-option data-delivery-key="shipping-default" data-delivery-type="shipping" data-delivery-context="${context}" data-delivery-product="${productId}">
          <strong>Ship</strong><span>Free on $45 orders</span>
        </button>
        <button type="button" class="delivery-card ${pickupActive ? "is-active" : ""}" data-delivery-option data-delivery-key="pickup-default" data-delivery-type="pickup" data-delivery-context="${context}" data-delivery-product="${productId}">
          <strong>Pickup</strong><span>Ready in store</span>
        </button>
        <button type="button" class="delivery-card ${motorActive ? "is-active" : ""}" data-delivery-option data-delivery-key="motorbike-default" data-delivery-type="motorbike" data-delivery-context="${context}" data-delivery-product="${productId}">
          <strong>Same Day</strong><span>Local delivery</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="delivery-cards">
      ${normalized
        .map(
          (transport, index) => {
            const normalizedType = String(transport?.type || "").trim().toLowerCase();
            const shippingKey = transportSelectionKey(transport, `fallback-${index}`);
            const isActive = selected && shippingKey === selected;
            return `
              <button
                type="button"
                class="delivery-card ${isActive ? "is-active" : ""}"
                data-delivery-option
                data-delivery-context="${context}"
                data-delivery-key="${escapeHtml(shippingKey)}"
                data-delivery-type="${escapeHtml(normalizedType)}"
                data-delivery-cost="${calculateTransportCost(transport)}"
                data-delivery-currency="${escapeHtml(String(transport?.currency || "USD"))}"
                data-delivery-title="${escapeHtml(transportTitle(transport))}"
                data-delivery-index="${index}"
                data-delivery-product="${productId}"
              >
                <strong>${escapeHtml(transportTitle(transport))}</strong>
                <span>${escapeHtml(transportDescription(transport))}</span>
              </button>
            `;
          },
        )
        .join("")}
    </div>
  `;
}

function firstArray(...values) {
  return values.find((value) => Array.isArray(value)) || [];
}

function metaContent(name, fallback = "") {
  return document.querySelector(`meta[name="${name}"]`)?.content || fallback;
}

function applyXapiCatalog(payload, sourceLabel = "xapi") {
  const rawProducts = responseProducts(payload);
  const mappedProducts = rawProducts.map(mapProduct).filter(Boolean);
  state.products = mappedProducts;
  state.folders = responseFolders(payload);
  const foldersCategoryCards = sortCategoryCards(buildCategoryCardsFromFolders(state.folders)).map((item) => [item.key, item.label, item.image]);
  const productCategoryCards = sortCategoryCards(buildCategoryCardsFromProducts(mappedProducts)).map((item) => [item.key, item.label, item.image]);
  state.categoryCards = foldersCategoryCards.length > 0 ? foldersCategoryCards : productCategoryCards;
  sanitizeActiveCategory();
  state.dataSource = DATA_SOURCE.xapi;
  state.loadError = null;
  state.productsLoaded = true;
  state.xapiEndpoint = payload?.endpoint?.url || payload?.endpoint || sourceLabel;
  return true;
}

async function fetchXapiProductsViaProxy() {
  const response = await fetch(`/api/storefront/products?limit=${XAPI_PRODUCT_LIMIT}`, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Local Selldone XAPI proxy failed with status ${response.status}.`);
  }
  return payload;
}

async function fetchXapiProducts() {
  const payload = await fetchXapiProductsViaProxy();
  return applyXapiCatalog(payload, "proxy");
}

async function fetchXapiProductDetail(productId) {
  if (!productId) return null;

  try {
    const proxyResponse = await fetch(`/api/storefront/products/${encodeURIComponent(String(productId))}`, {
      headers: { Accept: "application/json" },
    }).catch(() => null);
    if (!proxyResponse?.ok) {
      const details = await proxyResponse?.json().catch(() => ({}));
      throw new Error(details?.error || details?.message || `Selldone proxy product detail failed with status ${proxyResponse?.status || "unknown"}.`);
    }
    const response = await proxyResponse.json().catch(() => null);
    if (!response) return null;
    const payload = firstNonNull(
      response?.product,
      response?.data?.product,
      response?.data?.response?.product,
      response?.response?.product,
      response?.result?.product,
      response?.result?.response?.product,
      response?.payload?.product,
      response?.payload?.response?.product,
      response?.payload?.data?.product,
      response?.data,
      response,
    );
    const mapped = mapProduct(payload);
    if (!mapped) return null;

    const nextProducts = [...state.products];
    const index = nextProducts.findIndex((entry) => String(entry.id) === String(mapped.id));
    if (index >= 0) nextProducts[index] = mapped;
    else nextProducts.unshift(mapped);
    state.products = nextProducts;
    return mapped;
  } catch (error) {
    console.warn("Selldone XAPI product detail fetch failed:", error);
    return null;
  }
}

async function fetchXapiShopTransportationsViaProxy() {
  const response = await fetch("/api/storefront/shop/info", {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Local Selldone XAPI shop info request failed with status ${response.status}.`);
  }
  return payload;
}

async function fetchXapiShopTransportations() {
  const payload = await fetchXapiShopTransportationsViaProxy();
  return responseTransportations(payload);
}

async function ensureShopTransportationsLoaded() {
  if (state.shopTransportationsLoaded) return state.shopTransportations;
  if (shopTransportationsRequest) return shopTransportationsRequest;

  state.shopTransportationsLoading = true;
  shopTransportationsRequest = (async () => {
    try {
      const transportations = await fetchXapiShopTransportations();
      state.shopTransportations = normalizeShopTransportations(transportations);
      return state.shopTransportations;
    } catch (error) {
      console.warn("Selldone XAPI shop transportations load failed:", error);
      state.shopTransportations = [];
      return [];
    } finally {
      state.shopTransportationsLoaded = true;
      state.shopTransportationsLoading = false;
    }
  })();

  try {
    return await shopTransportationsRequest;
  } finally {
    shopTransportationsRequest = null;
  }
}

function normalizeGallery(item, activeVariant = null) {
  const list = [];
  const seen = new Set();
  const shopId = firstNonNull(item?.shop_id, item?.shop?.id, item?.shopId);

  const pushMedia = (candidate) => {
    if (candidate === null || candidate === undefined) return;
    if (typeof candidate === "number") {
      const key = `n:${candidate}`;
      if (seen.has(key)) return;
      seen.add(key);
      list.push(candidate);
      return;
    }
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (!trimmed) return;
      const normalized = pickImagePath(trimmed, { scope: "products", shopId }) || trimmed;
      const key = `s:${normalized}`;
      if (seen.has(key)) return;
      seen.add(key);
      list.push(normalized);
      return;
    }
    if (typeof candidate === "object") {
      const source = firstNonNull(
        candidate.icon,
        candidate.image,
        candidate.path,
        candidate.url,
        candidate.filename,
        candidate.photo,
        candidate.cover,
        candidate.icon_file,
        candidate.file,
      );
      if (source) pushMedia(source);
    }
  };

  if (activeVariant && typeof activeVariant === "object") {
    pushMedia(activeVariant.image);
    pushMedia(activeVariant.icon);
    pushMedia(activeVariant.path);
    pushMedia(activeVariant.url);
    pushMedia(activeVariant.filename);
    pushMedia(activeVariant.photo);
    pushMedia(activeVariant.cover);
    if (Array.isArray(activeVariant.images)) {
      activeVariant.images.forEach(pushMedia);
    }
    if (Array.isArray(activeVariant.files)) {
      activeVariant.files.forEach(pushMedia);
    }
  }

  pushMedia(item?.image);
  pushMedia(item?.icon);
  pushMedia(item?.thumbnail);
  pushMedia(item?.banner);
  pushMedia(item?.file);
  pushMedia(item?.icon_file);
  pushMedia(item?.image_file);
  if (Array.isArray(item?.files)) item.files.forEach(pushMedia);
  if (Array.isArray(item?.images_arr)) item.images_arr.forEach(pushMedia);
  if (Array.isArray(item?.images)) item.images.forEach(pushMedia);

  return list;
}

function formatOrderCurrency(entries) {
  return firstNonNull(entries[0]?.item?.currency, "$");
}

function formatOrderLineTotal(entries) {
  return entries.reduce((sum, entry) => sum + entry.linePrice * entry.qty, 0);
}

async function fetchSessionStatus(force = false) {
  if (state.sessionLoaded && !force && !state.sessionLoading) return state.sessionAuthenticated;
  if (state.sessionLoading) {
    while (state.sessionLoading) {
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    return state.sessionAuthenticated;
  }

  state.sessionLoading = true;
  try {
    const response = await fetch("/api/storefront/session", { headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.authenticated === undefined) {
      state.sessionAuthenticated = false;
      state.sessionUser = {};
      clearStorefrontSessionTokens();
      state.accountMenuOpen = false;
      clearStorefrontCartState({ loaded: true });
    } else {
      state.sessionAuthenticated = Boolean(payload.authenticated);
      state.sessionUser = payload.user && typeof payload.user === "object" ? payload.user : {};
      clearStorefrontSessionTokens();

      if (!state.sessionAuthenticated) {
        clearStorefrontSessionTokens();
        state.sessionUser = {};
        state.accountMenuOpen = false;
        clearStorefrontCartState({ loaded: true });
      }
      const loginUrl = firstNonNull(payload.loginUrl, "/auth/storefront/start");
      state.sessionLoginUrl = loginUrl === "/auth/start" ? "/auth/storefront/start" : loginUrl;
    }
    state.sessionLoaded = true;
    return state.sessionAuthenticated;
  } catch (error) {
    state.sessionLoaded = true;
    state.sessionAuthenticated = false;
    state.sessionUser = {};
    clearStorefrontSessionTokens();
    state.accountMenuOpen = false;
    return false;
  } finally {
    state.sessionLoading = false;
  }
}

async function initializeStorefrontSession(options = {}) {
  const force = Boolean(options.force);
  const hydrateCart = options.hydrateCart !== false;
  const authenticated = await fetchSessionStatus(force);
  updateAccountButton();
  if (authenticated && hydrateCart) {
    await hydrateStorefrontCart(force);
  } else {
    renderCart();
  }
  updateAccountButton();
  return authenticated;
}

function storefrontReturnRoute(override = "") {
  const target = String(override || "").trim();
  if (target) {
    return target.startsWith("/") ? target : `/${target}`;
  }
  return `${window.location.pathname}${window.location.search || ""}${window.location.hash || ""}`;
}

function clearStorefrontSessionState() {
  state.sessionAuthenticated = false;
  state.sessionUser = {};
  state.accountMenuOpen = false;
  clearStorefrontSessionTokens();
  clearStorefrontCartState({ loaded: true });
}

function userDisplayName(user = {}) {
  const firstName = firstNonNull(user?.firstName, user?.first_name, "");
  const lastName = firstNonNull(user?.lastName, user?.last_name, "");
  const combined = firstName ? firstNonNull(`${firstName} ${lastName}`.trim(), firstName) : "";
  return firstNonNull(user?.name, combined, user?.email, user?.phone, user?.username, user?.shop_name, "");
}

function userInitials(user = {}) {
  const fullName = String(userDisplayName(user) || "").trim();
  const username = String(firstNonNull(user?.username, user?.email, "") || "").trim();
  const source = fullName || username || "U";
  const parts = source.split(/\s+/).filter(Boolean);
  const base = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.[0] || "U";
  return base.toUpperCase();
}

function resolveUserAvatarUrl(user = {}, size = "small") {
  const avatarCandidate = firstNonNull(
    user?.avatarUrl,
    user?.avatar_url,
    user?.profileImage,
    user?.profile_image,
    user?.image,
    user?.photo,
    user?.avatar,
    user?.picture,
    user?.photo_url,
    user?.image_url,
    user?.icon,
    user?.avatarId,
  );
  if (!avatarCandidate) return "";
  if (typeof avatarCandidate === "string") {
    const source = avatarCandidate.trim();
    return source || "";
  }
  if (typeof avatarCandidate === "number") {
    const avatarId = Math.trunc(avatarCandidate);
    if (avatarId <= 0) return "";
    return storefrontUserAvatarUrl(avatarId, size);
  }
  if (typeof avatarCandidate === "object") {
    return firstNonNull(
      avatarCandidate?.url,
      avatarCandidate?.src,
      avatarCandidate?.path,
      avatarCandidate?.image,
      avatarCandidate?.photo,
      avatarCandidate?.avatar,
    );
  }
  return "";
}

function storefrontUserAvatarUrl(userId, size = "small") {
  const avatarId = Math.trunc(Number(userId || 0));
  if (!Number.isFinite(avatarId) || avatarId <= 0) return "";
  const serviceUrl = metaContent("service-url", "https://selldone.com").replace(/\/+$/, "");
  const normalizedSize = size === "big" ? "big" : "small";
  return `${serviceUrl}/users/${avatarId}/profile/avatar/${normalizedSize}`;
}

function buildAccountLoginUrl(nextRoute = "") {
  const loginUrl = state.sessionLoginUrl || "/auth/storefront/start";
  const loginReturnRoute = storefrontReturnRoute(nextRoute);
  try {
    const target = new URL(loginUrl, window.location.origin);
    target.searchParams.set("next", loginReturnRoute);
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return `${loginUrl}${loginUrl.includes("?") ? "&" : "?"}next=${encodeURIComponent(loginReturnRoute)}`;
  }
}

function buildAccountLogoutUrl() {
  const logoutReturnRoute = `${window.location.pathname}${window.location.search || ""}${window.location.hash || ""}`;
  try {
    const target = new URL("/auth/storefront/logout", window.location.origin);
    target.searchParams.set("next", logoutReturnRoute);
    return `${target.pathname}${target.search}`;
  } catch {
    return `/auth/storefront/logout?next=${encodeURIComponent(logoutReturnRoute)}`;
  }
}

function renderAccountMenu() {
  return renderUserMenu({
    state,
    els,
    escapeHtml,
    firstNonNull,
    userDisplayName,
    userInitials,
    resolveUserAvatarUrl,
    buildAccountLogoutUrl,
  });
}

async function renderAccountProfilePage(section = "profile") {
  if (!state.sessionAuthenticated) {
    await fetchSessionStatus(true);
  }

  if (!state.sessionAuthenticated) {
    els.app.innerHTML = `
      <div class="page-shell">
        <nav class="breadcrumbs" aria-label="Account path">
          <a href="#home">Home</a><span>/</span><strong>Account</strong>
        </nav>
        <section class="section">
          <div class="checkout-panel">
            <h1>Account</h1>
            <p class="product-meta">Please log in to view your account.</p>
            <div class="account-profile-actions">
              <button type="button" class="black-button" data-account-menu-login>Log in</button>
            </div>
          </div>
        </section>
      </div>
    `;
    return;
  }

  const rawAccountSection = String(section || "profile").trim();
  const [accountPath, accountQuery = ""] = rawAccountSection.split("?");
  const accountSection = accountPath.toLowerCase();
  const orderDetailPathMatch = rawAccountSection.match(/^orders\/(.+)$/i);
  const orderDetailId = orderDetailPathMatch?.[1] || (accountSection === "orders" ? new URLSearchParams(accountQuery).get("detail") : "");
  if (orderDetailId) {
    await renderOrderDetailPage({
      orderId: decodeURIComponent(orderDetailId),
      state,
      els,
      escapeHtml,
      firstArrayValue,
      firstNonNull,
      formatPrice,
      showToast,
    });
    return;
  }

  if (accountSection === "orders" || accountSection === "history") {
    await renderOrderHistoryPage({
      state,
      els,
      escapeHtml,
      firstArrayValue,
      firstNonNull,
      formatPrice,
      showToast,
    });
    return;
  }

  await renderAccountProfileOverviewPage({
    state,
    els,
    hydrateStorefrontCart,
    cartEntries,
    formatOrderCurrency,
    cartTotalsSummary,
    formatOrderLineTotal,
    firstNonNull,
    formatPrice,
    escapeHtml,
    buildAccountLogoutUrl,
    userDisplayName,
    resolveUserAvatarUrl,
    userInitials,
  });
}

function checkoutBillMessages(bill = {}) {
  const messages = [];
  const visited = new WeakSet();
  const pushMessage = (value) => {
    const text = String(value || "").trim();
    if (!text || messages.includes(text)) return;
    messages.push(text);
  };
  const collect = (value) => {
    if (value == null || value === false) return;
    if (typeof value === "string" || typeof value === "number") {
      pushMessage(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    [
      value.message,
      value.error,
      value.error_msg,
      value.error_message,
      value.warning,
      value.notice,
      value.reason,
      value.description,
      value.status_message,
      value.statusMessage,
      value.title,
    ].forEach(collect);
    [value.messages, value.errors, value.warnings, value.alerts, value.notifications, value.details].forEach(collect);
  };

  collect(bill?.messages);
  collect(bill?.errors);
  collect(bill?.warnings);
  collect(bill?.message);
  collect(bill?.error);
  collect(bill?.error_msg);
  collect(bill?.error_message);
  collect(bill?.notice);
  collect(bill?.reason);
  if (bill?.can_pay === false && !messages.length) {
    pushMessage(firstNonNull(bill?.payment_error, bill?.reject_reason, bill?.status_message, "Selldone says this basket cannot be paid yet."));
  }
  return messages.slice(0, 4);
}

function checkoutLineItem(entry = {}) {
  const item = entry.item || {};
  const variant = entry.variant || null;
  const qty = Math.max(1, toInteger(entry.qty, 1) || 1);
  const linePrice = toNumber(entry.linePrice, item.price || 0);
  const productHref = `#product/${encodeURIComponent(String(item.id || entry.productId || ""))}`;
  const activeMedia = variantPrimaryImage(variant) || item.image;
  const currency = firstNonNull(item.currency, "$");
  const variantMarkup = variantDetailsMarkup(variant, variant?.__index || 0, "checkout-variant-details");
  return `
    <article class="checkout-line-item">
      <a class="checkout-line-media checkout-line-link" href="${productHref}" aria-label="${escapeHtml(item.title || "Product")}">
        ${renderProductImage(item, "thumbnail-sprite", activeMedia)}
      </a>
      <div>
        <h4><a class="checkout-title-link" href="${productHref}">${escapeHtml(item.title || "Product")}</a></h4>
        ${variantMarkup}
        <p>${escapeHtml(`${qty} ${qty === 1 ? "item" : "items"}`)}</p>
      </div>
      <div class="checkout-line-pricing">
        <span>${escapeHtml(`${qty} x ${formatPrice(linePrice, currency)}`)}</span>
        <strong>${formatPrice(linePrice * qty, currency)}</strong>
      </div>
    </article>
  `;
}

function submitRedirectForm(url, method = "POST", fields = {}) {
  const target = String(url || "").trim();
  if (!target) return;
  const form = document.createElement("form");
  form.method = String(method || "POST").toUpperCase() === "GET" ? "GET" : "POST";
  form.action = target;
  form.style.display = "none";
  Object.entries(fields && typeof fields === "object" ? fields : {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = typeof value === "string" ? value : JSON.stringify(value);
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

async function renderCheckoutPage() {
  await ensureProductsForPage();
  if (state.sessionAuthenticated) {
    await hydrateStorefrontCart(true);
  }
  const entries = cartEntries();
  if (!entries.length) {
    renderLiveCatalogEmptyState("Your bag is empty", "Add at least one item before starting checkout.");
    return;
  }

  const transportations = await ensureShopTransportationsLoaded();
  const selectedTransport = resolveCheckoutTransport(transportations, state.activeCheckoutShippingKey);
  const selectedKey = transportSelectionKey(selectedTransport || transportations?.[0], "shipping-default");
  state.activeCheckoutShippingKey = selectedKey;
  const shippingCards = renderDeliveryCards(transportations, { selectedKey, context: "checkout" });

  const currency = formatOrderCurrency(entries);
  const cartTotals = cartTotalsSummary(entries);
  const subtotal = Number.isFinite(cartTotals.subtotal) ? cartTotals.subtotal : formatOrderLineTotal(entries);
  const hasQuotedBillShipping = Number.isFinite(cartTotals.shipping) && cartTotals.shipping >= 0;
  const shippingCost = hasQuotedBillShipping ? cartTotals.shipping : calculateTransportCost(selectedTransport, subtotal);
  const shippingLabel = selectedTransport ? transportDescription(selectedTransport) : "Delivery";
  const discountAmount = Number.isFinite(cartTotals.discounts) ? cartTotals.discounts : 0;
  const taxAmount = Number.isFinite(cartTotals.tax) ? cartTotals.tax : 0;
  const payableShipping = Number.isFinite(shippingCost) && shippingCost > 0 ? shippingCost : 0;
  const total = Number.isFinite(cartTotals.total) ? cartTotals.total : Math.max(0, subtotal - discountAmount + taxAmount + payableShipping);
  const cartCurrency = cartTotals.currency || currency;
  const displayCurrency = cartCurrency || currency;
  const shippingText = Number.isFinite(shippingCost)
    ? `${formatPrice(Math.max(0, shippingCost), displayCurrency)} (${escapeHtml(shippingLabel)})`
    : `Calculated after address (${escapeHtml(shippingLabel)})`;
  const discountText = `-${formatPrice(discountAmount, displayCurrency)}`;
  const taxLabel = cartTotals.taxIncluded ? "Tax (included)" : "Tax";
  const taxText = formatPrice(Math.max(0, taxAmount), displayCurrency);
  const bill = state.cartSummary && typeof state.cartSummary === "object" ? state.cartSummary : {};
  const canPay = bill?.can_pay !== false;
  const billMessages = checkoutBillMessages(bill);
  const customer = state.sessionUser || {};
  const customerName = userDisplayName(customer);
  const formAction = checkoutSubmitLabel(bill);

  els.app.innerHTML = `
    <div class="page-shell">
      <nav class="breadcrumbs" aria-label="Checkout path">
        <a href="#shop">Shop</a><span>/</span><strong>Checkout</strong>
      </nav>

      <section class="checkout-page section">
        <div class="checkout-grid">
          <section class="checkout-form-box">
            <div class="checkout-panel">
              <h1>Checkout</h1>
              <p class="product-meta">Review order and shipping details before placing your order.</p>
              <section class="delivery-section">
                <h2 class="product-meta">Pickup and delivery options</h2>
                ${shippingCards}
              </section>
              <section class="delivery-section">
                <h2 class="product-meta">Payment</h2>
                ${renderCheckoutPaymentOptions(bill, cartCurrency || currency)}
                ${billMessages.length ? `<div class="checkout-status ${canPay ? "" : "checkout-status--error"}">${billMessages.map((message) => `<p>${escapeHtml(message)}</p>`).join("")}</div>` : ""}
              </section>
              <form class="checkout-form-fields" data-checkout-form>
                <label>
                  <span>Full name</span>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value="${escapeHtml(customerName)}"
                    placeholder="J. Doe"
                  />
                </label>
                <label>
                  <span>Phone</span>
                  <input type="tel" name="phone" required value="${escapeHtml(customer.phone || "")}" placeholder="+1 000 000 0000" />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" name="email" required value="${escapeHtml(customer.email || "")}" placeholder="you@example.com" />
                </label>
                <div class="checkout-field-row">
                  <label>
                    <span>Country</span>
                    <input type="text" name="country" required value="${escapeHtml(customer.country || "US")}" placeholder="US" />
                  </label>
                  <label>
                    <span>State</span>
                    <input type="text" name="state" value="${escapeHtml(customer.state || "")}" placeholder="State" />
                  </label>
                </div>
                <label>
                  <span>Address</span>
                  <textarea name="address" required rows="3" placeholder="Street, building, neighborhood">${escapeHtml(customer.address || "")}</textarea>
                </label>
                <div class="checkout-field-row">
                  <label>
                    <span>City</span>
                    <input type="text" name="city" required value="${escapeHtml(customer.city || "")}" placeholder="City" />
                  </label>
                  <label>
                    <span>Postal code</span>
                    <input type="text" name="postal" value="${escapeHtml(customer.postal || customer.postal_code || "")}" placeholder="Postal code" />
                  </label>
                </div>
                <label>
                  <span>Note</span>
                  <textarea name="note" rows="3" placeholder="Delivery note (optional)"></textarea>
                </label>
                <button
                  class="black-button"
                  type="submit"
                  data-checkout-submit
                  data-checkout-state="${state.sessionAuthenticated ? "enabled" : "locked"}"
                  ${state.sessionAuthenticated && canPay && !state.checkoutSubmitting ? "" : "disabled"}
                >
                  ${escapeHtml(formAction)}
                </button>
              </form>
              ${state.sessionAuthenticated ? "" : `<p class="checkout-login-note">You must be logged in to place this order.</p><button class="text-link" type="button" data-checkout-login>Log in</button>`}
            </div>
          </section>

          <aside class="checkout-summary-box">
            <h2>Order summary</h2>
            <div class="checkout-summary-list">
              ${entries.map((entry) => checkoutLineItem(entry)).join("")}
            </div>
            <div class="checkout-summary-total">
              <div><span>Subtotal</span><strong>${formatPrice(subtotal, displayCurrency)}</strong></div>
              <div><span>Shipping</span><strong>${shippingText}</strong></div>
              ${discountAmount > 0 ? `<div><span>Discounts</span><strong>${discountText}</strong></div>` : ""}
              ${Number.isFinite(cartTotals.tax) ? `<div><span>${taxLabel}</span><strong>${taxText}</strong></div>` : ""}
              <div class="checkout-summary-total-final"><span>Total</span><strong>${formatPrice(total, displayCurrency)}</strong></div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  `;
}

async function handleCheckoutSubmit(event) {
  event.preventDefault();
  const form = event.target.closest("[data-checkout-form]");
  if (!form) return;

  if (!state.sessionAuthenticated) {
    await fetchSessionStatus(true);
    if (!state.sessionAuthenticated) {
      showToast("Please log in before placing an order");
      navigateToAccount();
      return;
    }
  }

  if (state.checkoutSubmitting) return;

  const entries = cartEntries();
  if (!entries.length) {
    showToast("Your bag is empty");
    setHash("shop");
    return;
  }

  const transportations = await ensureShopTransportationsLoaded();
  const selectedTransport = resolveCheckoutTransport(transportations, state.activeCheckoutShippingKey);
  const selectedShippingKey = transportSelectionKey(selectedTransport || transportations?.[0], "shipping-default") || "shipping-default";
  state.activeCheckoutShippingKey = selectedShippingKey;
  const cartTotals = cartTotalsSummary(entries);
  const subtotal = Number.isFinite(cartTotals.subtotal) ? cartTotals.subtotal : formatOrderLineTotal(entries);
  const hasQuotedBillShipping = Number.isFinite(cartTotals.shipping) && cartTotals.shipping >= 0;
  const shippingCost = hasQuotedBillShipping ? cartTotals.shipping : calculateTransportCost(selectedTransport, subtotal);
  const discountAmount = Number.isFinite(cartTotals.discounts) ? cartTotals.discounts : 0;
  const taxAmount = Number.isFinite(cartTotals.tax) ? cartTotals.tax : 0;
  const taxShippingAmount = Number.isFinite(cartTotals.taxShipping) ? cartTotals.taxShipping : 0;
  const payableShipping = Number.isFinite(shippingCost) && shippingCost > 0 ? shippingCost : 0;
  const currency = cartTotals.currency || formatOrderCurrency(entries);
  const total = Number.isFinite(cartTotals.total) ? cartTotals.total : Math.max(0, subtotal - discountAmount + taxAmount + payableShipping);
  const formData = Object.fromEntries(new FormData(form));
  const gatewayCode = String(formData.gatewayCode || state.checkoutGatewayCode || "auto").trim();

  const payload = {
    gateway_code: gatewayCode,
    currency,
    return_url: `${window.location.origin}${window.location.pathname}${window.location.search || ""}#order-success`,
    customer: {
      fullName: String(formData.fullName || "").trim(),
      phone: String(formData.phone || "").trim(),
      email: String(formData.email || "").trim(),
      country: String(formData.country || "").trim(),
      state: String(formData.state || "").trim(),
      address: String(formData.address || "").trim(),
      city: String(formData.city || "").trim(),
      postal: String(formData.postal || "").trim(),
      note: String(formData.note || "").trim(),
    },
    receiver_info: {
      name: String(formData.fullName || "").trim(),
      phone: String(formData.phone || "").trim(),
      email: String(formData.email || "").trim(),
      country: String(formData.country || "").trim(),
      state: String(formData.state || "").trim(),
      address: String(formData.address || "").trim(),
      city: String(formData.city || "").trim(),
      postal: String(formData.postal || "").trim(),
      postal_code: String(formData.postal || "").trim(),
      message: String(formData.note || "").trim(),
    },
    billing: {
      name: String(formData.fullName || "").trim(),
      phone: String(formData.phone || "").trim(),
      email: String(formData.email || "").trim(),
      country: String(formData.country || "").trim(),
      state: String(formData.state || "").trim(),
      address: String(formData.address || "").trim(),
      city: String(formData.city || "").trim(),
      postal: String(formData.postal || "").trim(),
      postal_code: String(formData.postal || "").trim(),
      custom: false,
      business: false,
    },
    delivery_info: {
      delivery_type: firstNonNull(selectedTransport?.type, selectedTransport?.code, selectedShippingKey),
      transportation_id: firstNonNull(selectedTransport?.id, selectedTransport?.transportation_id, null),
      name: firstNonNull(selectedTransport?.name, selectedTransport?.title, selectedShippingKey),
    },
    form: {
      note: String(formData.note || "").trim(),
    },
    guest_email: String(formData.email || "").trim(),
    amount_check: Number(total.toFixed(2)),
    totals: {
      subtotal: Number(subtotal.toFixed(2)),
      shipping: Number((Number.isFinite(shippingCost) ? shippingCost : 0).toFixed(2)),
      discounts: Number(discountAmount.toFixed(2)),
      tax: Number(taxAmount.toFixed(2)),
      tax_shipping: Number(taxShippingAmount.toFixed(2)),
      tax_included: Boolean(cartTotals.taxIncluded),
      total: Number(total.toFixed(2)),
      currency,
    },
    shipping: selectedTransport || null,
    shipping_key: selectedShippingKey,
    items: entries.map(({ item, qty, variant, linePrice }) => ({
      id: item.id,
      title: item.title,
      variant: variant ? {
        key: variant.__key || variant.__index || variant.id || variant.sku || variant.code || "",
        label: variantLabel(variant, variant.__index || 0),
      } : null,
      qty,
      price: linePrice,
      total: linePrice * qty,
    })),
  };

  const submitButton = form.querySelector("[data-checkout-submit]");
  state.checkoutSubmitting = true;
  submitButton?.setAttribute("disabled", "disabled");
  submitButton && (submitButton.textContent = "Processing checkout...");

  try {
    const response = await fetch("/api/storefront/orders", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => null);
    const result = await response?.json().catch(() => ({}));

    if (!response || !response.ok || result?.ok === false) {
      throw new Error(extractStorefrontErrorMessage(result, response?.status || 0));
    }

    if (await handleStripeCheckoutResult(result, payload)) return;

    if (result.redirect?.url) {
      checkoutSuccessUrlFor(result, payload);
      showToast("Redirecting to payment...");
      submitRedirectForm(result.redirect.url, result.redirect.method, result.redirect.fields);
      return;
    }

    if (result.pending) {
      showToast("Payment is pending. Please complete it in Selldone.");
      state.checkoutSubmitting = false;
      renderLiveCatalogEmptyState("Payment pending", "Selldone created a pending payment for this order. Complete the payment to finalize checkout.");
      return;
    }

    const orderId = firstNonNull(result.orderId, result.order_id, result?.payment?.target_id, result?.payment?.basket_id, result?.basket?.id, "");
    if (!result.completed && !orderId) {
      state.checkoutSubmitting = false;
      throw new Error("Selldone returned an interactive payment step that this storefront cannot render yet. Choose COD if available, or enable a redirect-based gateway.");
    }

    showToast(orderId ? `Order ${orderId} placed successfully` : "Checkout completed");
    await completeStorefrontOrder(result, payload);
  } catch (error) {
    state.checkoutSubmitting = false;
    if (submitButton) {
      submitButton.removeAttribute("disabled");
      submitButton.textContent = checkoutSubmitLabel(state.cartSummary || {});
    }
    showToast(error?.message || "Checkout service is not available right now. Please try again shortly.");
    await hydrateStorefrontCart(true);
  }
}

function filterChip(category, label) {
  return `<button class="filter-chip ${state.activeCategory === category ? "is-active" : ""}" type="button" data-filter="${category}">${label}</button>`;
}

function discountFilterChip() {
  return `<button class="filter-chip ${state.activeDiscountOnly ? "is-active" : ""}" type="button" data-discount-filter="toggle">Discounts</button>`;
}

function getFilteredProducts() {
  let list = [...getProductsForUi()];
  if (state.activeDiscountOnly) {
    list = list.filter(hasProductDiscount);
  }
  if (state.activeCategory && state.activeCategory !== "all") {
    list = list.filter((item) => {
      const subcategory = String(item.subcategory || "").toLowerCase();
      if (state.activeCategory === "foundation") return subcategory.includes("foundation");
      if (state.activeCategory === "lipstick") return subcategory.includes("lip");
      if (state.activeCategory === "sunscreen") return subcategory.includes("sunscreen");
      return item.category === state.activeCategory;
    });
  }
  if (state.search) {
    const query = state.search.toLowerCase();
    list = list.filter((item) =>
      `${item.brand || ""} ${item.title || ""} ${item.category || ""} ${item.subcategory || ""}`.toLowerCase().includes(query),
    );
  }
  if (state.activeSort === "featured") list = sortByMerchPriority(list);
  if (state.activeSort === "price-low") list.sort((a, b) => a.price - b.price);
  if (state.activeSort === "price-high") list.sort((a, b) => b.price - a.price);
  if (state.activeSort === "rating") list.sort((a, b) => b.rating - a.rating);
  if (state.activeSort === "new") list.sort((a, b) => Number(b.badge === "New") - Number(a.badge === "New"));
  return list;
}

function shopHeading() {
  if (state.search) return `Search results for "${state.search}"`;
  if (state.activeDiscountOnly && (!state.activeCategory || state.activeCategory === "all")) return "Discounted Beauty";
  if (!state.activeCategory || state.activeCategory === "all") return "Pajulina Beauty";
  return `${state.activeDiscountOnly ? "Discounted " : ""}${titleCase(state.activeCategory)} at Pajulina`;
}

function eventTile(title, body, pos) {
  return `
    <article class="event-tile">
      <div class="event-image" style="--hero-pos:${pos}"></div>
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
      </div>
    </article>
  `;
}

function featureCard(title, body, pos, image = "") {
  const imageStyle = image ? `--story-image:url('${escapeHtml(image)}');` : "";
  return `
    <article class="feature-card">
      <div class="feature-image" style="--hero-pos:${pos};${imageStyle}"></div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </article>
  `;
}

function storyCard(title, body, pos, tall = false, image = "") {
  const imageStyle = image ? `--story-image:url('${escapeHtml(image)}');` : "";
  return `
    <article class="story-card">
      <div class="story-image ${tall ? "tall" : ""}" style="--hero-pos:${pos};${imageStyle}"></div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </article>
  `;
}

function categoryCard(key, label, image) {
  const href = ["lipstick", "foundation", "sunscreen"].includes(key) ? `#shop?category=${key}` : `#shop?category=${key}`;
  const media = renderCategoryMedia(image);
  return `
    <a class="category-card" href="${href}">
      <span class="category-media">${media}</span>
      <span>${escapeHtml(label)}</span>
    </a>
  `;
}

function renderCategoryMedia(media) {
  if (typeof media === "number") {
    return renderSprite(media, "category-sprite");
  }
  if (typeof media === "string" && media.trim()) {
    const source = pickImagePath(media, { scope: "categories" }) || media;
    if (source && typeof source === "string" && source.trim()) {
      return `<img class="category-sprite" src="${escapeHtml(source)}" alt="category image" loading="lazy" />`;
    }
    return renderSprite(0, "category-sprite");
  }
  return renderSprite(0, "category-sprite");
}

function accordionItem(title, body, open = false) {
  return `
    <div class="accordion-item ${open ? "is-open" : ""}">
      <button type="button" data-accordion-toggle>
        <span>${escapeHtml(title)}</span><span aria-hidden="true">+</span>
      </button>
      <div class="accordion-body">${escapeHtml(body)}</div>
    </div>
  `;
}

function miniProduct(item) {
  if (!item) return "";
  const rating = toNumber(item.rating, 0);
  const href = `#product/${encodeURIComponent(String(item.id || ""))}`;
  return `
    <div class="mini-product">
      <a class="mini-media mini-product-link" href="${href}" aria-label="${escapeHtml(item.title)}">
        ${renderProductImage(item, "thumbnail-sprite")}
      </a>
      <div>
        <h4><a class="mini-product-title-link" href="${href}">${escapeHtml(item.title)}</a></h4>
        <p>${escapeHtml(item.brand)}</p>
        <span class="rating"><span class="stars">*****</span>${rating.toFixed(1)}</span>
      </div>
      <strong>${formatPrice(item.price, item.currency)}</strong>
    </div>
  `;
}

function routineStep(label, item) {
  if (!item) return "";
  const href = `#product/${encodeURIComponent(String(item.id || ""))}`;
  const original = toNumber(item.original, 0);
  const price = toNumber(item.price, 0);
  const discount = toNumber(item.discount, 0);
  const dealLabel = item.crossSellLabel || item.offerLabel || (discount > 0 ? `${discount}% off` : "");
  return `
    <div class="routine-step">
      <a class="mini-media routine-step-media" href="${href}" aria-label="${escapeHtml(item.title)}">
        ${renderProductImage(item, "thumbnail-sprite")}
      </a>
      <div>
        <span class="routine-step-label">${escapeHtml(label)}</span>
        <h4><a class="routine-step-title-link" href="${href}">${escapeHtml(item.title)}</a></h4>
        <p>
          ${escapeHtml(item.brand || "Pajulina")} · ${formatPrice(price, item.currency)}
          ${original && original > price ? `<s>${formatPrice(original, item.currency)}</s>` : ""}
          ${dealLabel ? `<em>${escapeHtml(dealLabel)}</em>` : ""}
        </p>
      </div>
    </div>
  `;
}

function reviewBar(label, value) {
  return `
    <div class="bar-row">
      <span>${label}</span>
      <span class="bar-track"><span class="bar-fill" style="--value:${value}%"></span></span>
      <span>${value}%</span>
    </div>
  `;
}

function shadeName(index) {
  const names = [
    "Fair Warm",
    "Fair Neutral",
    "Light Peach",
    "Light Golden",
    "Medium Sand",
    "Medium Olive",
    "Tan Honey",
    "Tan Amber",
    "Deep Cocoa",
  ];
  return names[index % names.length];
}

function titleCase(value) {
  return String(value || "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clearStorefrontSessionTokens() {
  localStorage.removeItem(STOREFRONT_ACCESS_TOKEN_KEY);
  localStorage.removeItem(STOREFRONT_TOKEN_EXPIRES_AT_KEY);
}

function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
}

function cartLineKey(productId, variantKey = "") {
  const product = String(productId || "").trim();
  const variant = String(variantKey || "").trim();
  if (!product) return "";
  if (!variant) return product;
  return `${product}::${variant}`;
}

function parseCartLineKey(cartLineKeyValue) {
  const raw = String(cartLineKeyValue || "").trim();
  const delimiter = "::";
  const at = raw.indexOf(delimiter);
  if (at < 0) return { productId: raw, variantKey: "" };

  const productId = raw.slice(0, at);
  const variantKey = raw.slice(at + delimiter.length);
  return { productId, variantKey };
}

function cartLineVariant(item, rawVariantKey = "") {
  const variants = getItemVariants(item);
  if (!variants.length) return null;

  const key = String(rawVariantKey || "").trim();
  const candidates = variants
    .filter(Boolean)
    .map((variant) => ({
      variant,
      score: firstNonNull(
        variant.__key,
        variant.__index,
        variant.id,
        variant.variant_id,
        variant.sku,
        variant.code,
        variant.title,
        variant.name,
      ),
    }));

  if (!key) {
    return activeProductVariant(item) || candidates[0]?.variant || null;
  }

  const exact = candidates.find((entry) => String(entry.score) === key);
  if (exact) return exact.variant;

  const byIndex = Number(key);
  if (Number.isInteger(byIndex) && candidates[byIndex]) {
    return candidates[byIndex].variant;
  }

  const compactKey = rawVariantKey.includes(":") ? String(rawVariantKey).split(":").pop() : key;
  if (compactKey.includes("-")) {
    const numericSuffix = Number.parseInt(compactKey.split("-").pop(), 10);
    if (Number.isInteger(numericSuffix) && variants[numericSuffix]) {
      return variants[numericSuffix];
    }
  }
  const compactIndex = Number.parseInt(compactKey, 10);
  if (Number.isInteger(compactIndex) && variants[compactIndex]) {
    return variants[compactIndex];
  }

  return activeProductVariant(item) || candidates[0]?.variant || null;
}

function basketLineVariantPayload(line = {}) {
  const source =
    line?.variant && typeof line.variant === "object"
      ? line.variant
      : line?.product_variant && typeof line.product_variant === "object"
        ? line.product_variant
        : line?.productVariant && typeof line.productVariant === "object"
          ? line.productVariant
          : line?.variation && typeof line.variation === "object"
            ? line.variation
            : line?.selected_variant && typeof line.selected_variant === "object"
              ? line.selected_variant
              : null;
  const variant = source ? { ...source } : {};
  const assign = (key, ...values) => {
    const value = firstNonNull(...values);
    if (value === null || value === undefined || value === "") return;
    variant[key] = value;
  };

  assign("id", line?.variant_id, line?.variantId, line?.product_variant_id, line?.productVariantId, variant.id);
  assign("variant_id", line?.variant_id, line?.variantId, line?.product_variant_id, line?.productVariantId, variant.variant_id);
  assign("title", line?.variant_title, line?.variantTitle, line?.variation_title, line?.variationTitle, variant.title);
  assign("name", line?.variant_name, line?.variantName, line?.variation_name, line?.variationName, variant.name);
  assign("color", line?.color, line?.colour, line?.color_code, line?.colour_code, variant.color);
  assign("color_name", line?.color_name, line?.colour_name, line?.colorTitle, line?.colourTitle, variant.color_name);
  assign("size", line?.size, line?.size_name, line?.option_size, variant.size);
  assign("volume", line?.volume, line?.volume_name, line?.capacity, line?.ml, variant.volume);
  assign("weight", line?.weight, line?.weight_name, line?.g, line?.gr, variant.weight);
  assign("scent", line?.scent, line?.fragrance, line?.perfume, variant.scent);
  assign("pack", line?.pack, line?.package, line?.bundle, variant.pack);
  assign("style", line?.style, line?.model, variant.style);
  assign("options", line?.options, line?.option, line?.attributes, line?.properties, line?.variant_options, variant.options);

  return Object.keys(variant).length ? variant : null;
}

function mergeCartLineVariant(baseVariant = null, basketVariant = null, lineKey = "") {
  if (!basketVariant || typeof basketVariant !== "object") return baseVariant;
  const merged = {
    ...(baseVariant && typeof baseVariant === "object" ? baseVariant : {}),
    ...basketVariant,
  };
  merged.__index = firstNonNull(baseVariant?.__index, basketVariant.__index, 0);
  merged.__key = firstNonNull(baseVariant?.__key, basketVariant.__key, lineKey);
  merged.__swatchColor = firstNonNull(
    baseVariant?.__swatchColor,
    basketVariant.__swatchColor,
    basketVariant.hex,
    basketVariant.color_code,
    basketVariant.colour_code,
    basketVariant.swatch_color,
    basketVariant.color,
    basketVariant.colour,
    "",
  );
  const optionEntries = extractVariantOptionEntries(merged);
  if (optionEntries.length) {
    merged.__options = optionEntries;
    merged.__optionMap = Object.fromEntries(optionEntries.map((option) => [option.key, option.value]));
    merged.__optionLabels = Object.fromEntries(optionEntries.map((option) => [option.key, option.label]));
    merged.__optionDisplays = Object.fromEntries(optionEntries.map((option) => [option.key, option.display]));
  }
  return merged;
}

function resolveCartLineVariantMatch(item, rawVariantKey = "") {
  const variants = getItemVariants(item);
  const key = String(rawVariantKey || "").trim();
  if (!key) return { variant: null, matched: false };

  const candidates = variants
    .filter(Boolean)
    .map((variant) => ({
      variant,
      score: firstNonNull(
        variant.__key,
        variant.__index,
        variant.id,
        variant.variant_id,
        variant.sku,
        variant.code,
        variant.title,
        variant.name,
      ),
    }));

  const exact = candidates.find((entry) => String(entry.score) === key);
  if (exact) return { variant: exact.variant, matched: true };
  const compactKey = rawVariantKey.includes(":") ? String(rawVariantKey).split(":").pop() : key;
  if (compactKey.includes("-")) {
    const numericSuffix = Number.parseInt(compactKey.split("-").pop(), 10);
    if (Number.isInteger(numericSuffix) && variants[numericSuffix]) {
      return { variant: variants[numericSuffix], matched: true };
    }
  }
  const compactIndex = Number.parseInt(compactKey, 10);
  if (Number.isInteger(compactIndex) && variants[compactIndex]) {
    return { variant: variants[compactIndex], matched: true };
  }
  return { variant: null, matched: false };
}

function resolveStorefrontVariantId(variant = null) {
  if (!variant || typeof variant !== "object") return null;

  const direct = parseStorefrontVariantId(
    firstNonNull(
      variant.variant_id,
      variant.product_variant_id,
      variant.productVariantId,
      variant.variantId,
      variant.id,
    ),
  );
  if (direct !== null) return direct;
  return parseStorefrontVariantIdFromCompoundKey(variant.__key);
}

function parseStorefrontVariantIdFromCompoundKey(value = "") {
  const candidate = String(value || "").trim();
  if (!candidate) return null;
  const compact = candidate.includes(":") ? candidate.split(":").pop() : candidate;
  const finalCandidate = compact.includes("-") ? compact.split("-").pop() : compact;
  return parseStorefrontVariantId(finalCandidate);
}

function parseStorefrontVariantId(value = null) {
  const candidate = String(value || "").trim();
  if (!/^(?:[1-9]\d*)$/.test(candidate)) return null;
  const parsed = Number.parseInt(candidate, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isStorefrontVariantIdInList(variants = [], rawVariantId = null) {
  const target = parseStorefrontVariantId(rawVariantId);
  if (!Number.isFinite(target)) return false;
  const targetText = String(target);
  const list = Array.isArray(variants) ? variants : getItemVariants(variants);
  return list.some(
    (entry) =>
      String(parseStorefrontVariantId(
        firstNonNull(
          entry?.variant_id,
          entry?.product_variant_id,
          entry?.variantId,
          entry?.productVariantId,
          entry?.id,
        ),
      ) || parseStorefrontVariantIdFromCompoundKey(entry?.__key) || "") === targetText,
  );
}

async function resolveCartLineVariantForStorefront(item, variantKey = "") {
  const rawItem = item && typeof item === "object" ? item : null;
  if (!rawItem) return { item: null, selected: null, variantId: null };

  const normalizedKey = String(variantKey || "").trim();
  const rawKeyMatch = resolveCartLineVariantMatch(rawItem, normalizedKey);
  const rawVariants = getItemVariants(rawItem);
  let selected = cartLineVariant(rawItem, variantKey);
  let variantId = resolveStorefrontVariantId(selected);
  let keyMatched = normalizedKey ? rawKeyMatch.matched : true;
  const rawHasMultiVariants = rawVariants.length > 1;
  const rawVariantIdMatch = variantId !== null ? isStorefrontVariantIdInList(rawVariants, variantId) : false;
  const shouldRefresh =
    rawItem?.id &&
    state.dataSource === DATA_SOURCE.xapi &&
    (
      (rawHasMultiVariants && !variantId) ||
      (variantId && !rawVariantIdMatch && rawHasMultiVariants) ||
      (normalizedKey && !rawKeyMatch.matched)
    );

  if (shouldRefresh) {
    const refreshedItem = await fetchXapiProductDetail(String(rawItem.id));
    if (refreshedItem) {
      selected = cartLineVariant(refreshedItem, variantKey);
      variantId = resolveStorefrontVariantId(selected);
      const refreshedMatch = resolveCartLineVariantMatch(refreshedItem, normalizedKey);
      keyMatched = normalizedKey ? refreshedMatch.matched : true;
      return { item: refreshedItem, selected, variantId, keyMatched };
    }
  }

  return { item: rawItem, selected, variantId, keyMatched };
}

function firstArrayValue(...values) {
  return values.find((value) => Array.isArray(value)) || [];
}

const ORDER_SUCCESS_STORAGE_KEY = "pajulina:last-checkout-order";
let orderSuccessCountdownTimer = null;

function checkoutResultOrderId(result = {}, requestPayload = {}, paymentIntent = null) {
  return String(firstNonNull(
    result?.orderId,
    result?.order_id,
    result?.payment?.target_id,
    result?.payment?.targetId,
    result?.payment?.order_id,
    result?.payment?.orderId,
    result?.payment?.basket_id,
    result?.payment?.basketId,
    result?.basket?.id,
    result?.basket?.basket_id,
    result?.basket?.basketId,
    result?.basket?.code,
    requestPayload?.order_id,
    requestPayload?.orderId,
    requestPayload?.basket_id,
    requestPayload?.basketId,
    paymentIntent?.metadata?.order_id,
    paymentIntent?.metadata?.orderId,
    paymentIntent?.metadata?.basket_id,
    paymentIntent?.metadata?.basketId,
    "",
  ) || "").trim();
}

function rememberCheckoutOrder(orderId = "") {
  const id = String(orderId || "").trim();
  if (!id) return;
  try {
    window.sessionStorage?.setItem(ORDER_SUCCESS_STORAGE_KEY, JSON.stringify({ orderId: id, at: Date.now() }));
  } catch {
    // Ignore restricted storage modes.
  }
}

function rememberedCheckoutOrderId() {
  try {
    const raw = window.sessionStorage?.getItem(ORDER_SUCCESS_STORAGE_KEY) || "";
    const payload = JSON.parse(raw || "{}");
    const orderId = String(payload?.orderId || "").trim();
    const age = Date.now() - Number(payload?.at || 0);
    return orderId && age < 1000 * 60 * 60 ? orderId : "";
  } catch {
    return "";
  }
}

function checkoutSuccessUrlFor(result = {}, requestPayload = {}, paymentIntent = null) {
  const orderId = checkoutResultOrderId(result, requestPayload, paymentIntent);
  rememberCheckoutOrder(orderId);
  const query = orderId ? `?order=${encodeURIComponent(orderId)}` : "";
  return `${window.location.origin}${window.location.pathname}${window.location.search || ""}#order-success${query}`;
}

function clearOrderSuccessTimer() {
  if (!orderSuccessCountdownTimer) return;
  window.clearInterval(orderSuccessCountdownTimer);
  orderSuccessCountdownTimer = null;
}

async function completeStorefrontOrder(result = {}, requestPayload = {}, paymentIntent = null) {
  const orderId = checkoutResultOrderId(result, requestPayload, paymentIntent);
  rememberCheckoutOrder(orderId);
  closeCart();
  state.cart = {};
  state.cartSummary = null;
  state.cartLoaded = false;
  saveCart();
  renderCart();
  await hydrateStorefrontCart(true).catch(() => false);
  state.cart = {};
  state.cartSummary = null;
  state.cartLoaded = true;
  saveCart();
  renderCart();
  state.checkoutSubmitting = false;
  state.activeCheckoutShippingKey = "";
  setHash("order-success", orderId ? { order: orderId } : null);
  return true;
}

const {
  checkoutSubmitLabel,
  handleStripeCheckoutResult,
  renderCheckoutPaymentOptions,
} = createStorefrontPayments({
  state,
  firstArrayValue,
  firstNonNull,
  escapeHtml,
  showToast,
  renderLiveCatalogEmptyState,
  checkoutSuccessUrl: checkoutSuccessUrlFor,
  onPaymentComplete: completeStorefrontOrder,
});

const {
  closeQuickBuy,
  handleQuickBuySubmit,
  openQuickBuy,
  refreshQuickBuy,
  setQuickBuyAddressIndex,
  toggleQuickBuyAddressEditing,
  updateQuickBuyQuantity,
} = createStorefrontQuickBuy({
  state,
  DATA_SOURCE,
  getProductById,
  fetchXapiProductDetail,
  fetchSessionStatus,
  navigateToAccount,
  addToCart,
  hydrateStorefrontCart,
  ensureShopTransportationsLoaded,
  renderDeliveryCards,
  transportSelectionKey,
  resolveCheckoutTransport,
  calculateTransportCost,
  activeProductVariant,
  resolveCartLineVariantForStorefront,
  resolveStorefrontVariantId,
  getItemVariants,
  resolveVariantPrice,
  resolveVariantOriginalPrice,
  cartEntries,
  cartTotalsSummary,
  formatPrice,
  renderProductImage,
  variantDetailsMarkup,
  renderCheckoutPaymentOptions,
  handleStripeCheckoutResult,
  checkoutSuccessUrl: checkoutSuccessUrlFor,
  completeStorefrontOrder,
  firstNonNull,
  escapeHtml,
  toNumber,
  showToast,
  renderLiveCatalogEmptyState,
});

function variantKeyFromBasketLine(line = {}, item = null) {
  const variants = getItemVariants(item);
  const directVariantId = firstNonNull(
    line?.variant_id,
    line?.variantId,
    line?.product_variant_id,
    line?.variant?.id,
    line?.variant?.variant_id,
  );

  if (variants.length && directVariantId) {
    const target = String(directVariantId);
    const matched = variants.find((variant) =>
      firstNonNull(
        variant.id,
        variant.variant_id,
        variant.sku,
        variant.code,
        variant.__key,
        variant.__index,
      ) === target,
    );
    if (matched) {
      return firstNonNull(
        matched.__key,
        matched.__index,
        matched.id,
        matched.sku,
        matched.code,
        matched.title,
      );
    }
  }

  return firstNonNull(
    line?.variant?.__key,
    line?.variant_key,
    line?.variantKey,
    line?.sku,
    line?.code,
    line?.variant?.id,
    directVariantId,
    line?.variant?.sku,
    line?.variant?.code,
  );
}

function basketLineEntries(payload = {}) {
  const basket = payload && typeof payload === "object" ? payload : null;
  return firstArrayValue(
    basket?.items,
    basket?.lines,
    basket?.basket_items,
    basket?.data?.items,
    basket?.result?.items,
    basket?.payload?.items,
    basket?.payload?.basket_items,
  );
}

function upsertStorefrontProduct(product) {
  const mapped = mapProduct(product);
  if (!mapped?.id) return null;
  const index = state.products.findIndex((entry) => String(entry.id) === String(mapped.id));
  if (index >= 0) {
    state.products[index] = { ...state.products[index], ...mapped };
  } else {
    state.products.push(mapped);
  }
  return mapped;
}

async function ensureBasketProductsAvailable(basket = {}) {
  const entries = basketLineEntries(basket);
  const missingIds = new Set();

  entries.forEach((line) => {
    const product = firstNonNull(line?.product, line?.item, line?.product_data, line?.data?.product);
    const mapped = product && typeof product === "object" ? upsertStorefrontProduct(product) : null;
    const productId = firstNonNull(
      mapped?.id,
      line?.product_id,
      line?.productId,
      line?.product?.id,
      line?.product?.product_id,
      line?.id,
      line?.sku,
    );
    if (productId && !getProductById(String(productId))) {
      missingIds.add(String(productId));
    }
  });

  if (!missingIds.size) return;
  await Promise.all(Array.from(missingIds).slice(0, 20).map((productId) => fetchXapiProductDetail(productId).catch(() => null)));
}

function syncCartFromBasketPayload(payload = {}) {
  const basket = payload && typeof payload === "object" ? payload : null;
  const entries = basketLineEntries(basket);

  const nextCart = {};
  const nextCartLineDetails = {};
  entries.forEach((line) => {
    const productId = firstNonNull(
      line?.product_id,
      line?.productId,
      line?.product?.id,
      line?.product?.product_id,
      line?.id,
      line?.sku,
    );
    if (!productId) return;

    const qty = toNumber(firstNonNull(line?.count, line?.qty, line?.quantity, line?.quantity_value), 0);
    if (!Number.isFinite(qty) || qty <= 0) return;

    const item = getProductById(String(productId));
    if (item) {
      const basketImage = normalizeImageCandidate(
        firstNonNull(
          line?.image,
          line?.icon,
          line?.path,
          line?.url,
          line?.photo,
          line?.product?.image,
          line?.product?.icon,
          line?.product?.path,
          line?.product?.images?.[0],
          line?.variant?.image,
          line?.variant?.icon,
          line?.variant?.path,
        ),
        { shopId: firstNonNull(item.shopId, item.shop_id, line?.shop_id, line?.product?.shop_id) },
      );
      if (basketImage) {
        item.image = basketImage;
        item.images = Array.from(new Set([basketImage, ...(Array.isArray(item.images) ? item.images : [])]));
      }
    }
    const variantKey = variantKeyFromBasketLine(line, item);
    const key = cartLineKey(String(productId), variantKey);
    if (!key) return;
    nextCart[key] = qty;
    const basketVariant = basketLineVariantPayload(line);
    if (basketVariant) {
      nextCartLineDetails[key] = { variant: basketVariant };
    }
  });

  state.cart = nextCart;
  state.cartLineDetails = nextCartLineDetails;
  state.cartSummary = basket?.bill && typeof basket.bill === "object" ? basket.bill : null;
  state.cartLoaded = true;
  state.cartLoadError = "";
}

function syncCartSummary(payload = null) {
  if (payload && typeof payload === "object") {
    state.cartSummary = payload;
    return;
  }
  state.cartSummary = null;
}

function clearStorefrontCartState({ loaded = false } = {}) {
  state.cart = {};
  state.cartLineDetails = {};
  state.cartSummary = null;
  state.cartLoaded = loaded;
  state.cartLoading = false;
  state.cartLoadError = "";
  state.cartUpdatingKeys.clear();
  saveCart();
  renderCart();
}

async function hydrateStorefrontCart(force = false) {
  if (!state.sessionAuthenticated) {
    clearStorefrontCartState({ loaded: true });
    return false;
  }
  if (state.cartLoading) {
    while (state.cartLoading) {
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    return state.cartLoaded && !state.cartLoadError;
  }
  if (state.cartLoaded && !force) return true;

  state.cartLoading = true;
  state.cartLoadError = "";
  renderCart();

  try {
    const response = await fetch("/api/storefront/basket", {
      headers: { Accept: "application/json" },
    });
    const result = await response.json().catch(() => ({}));
    const basket = extractStorefrontBasketResponse(result);
    const bill = extractStorefrontBillResponse(result);
    const hasError = !response.ok || hasStorefrontBasketError(result, response.status) || result?.ok === false;
    const errorMessage = extractStorefrontErrorMessage(result, response.status);
    const authErrorHint = /please log|login first|not authorized|unauthor|token|authorization|session/i.test(errorMessage);

    if (hasError) {
      if (response.status === 401 || response.status === 403 || authErrorHint) {
        clearStorefrontSessionState();
        updateAccountButton();
      }
      state.cartLoadError = errorMessage;
      state.cartLoaded = false;
      return false;
    }

    await ensureBasketProductsAvailable(basket || {});
    state.storefrontShopInfo = result?.shop && typeof result.shop === "object" ? result.shop : state.storefrontShopInfo;
    syncCartFromBasketPayload(basket || { items: [] });
    syncCartSummary(bill);
    saveCart();
    return true;
  } catch {
    state.cartLoadError = "Could not load your Selldone bag.";
    state.cartLoaded = false;
    return false;
  } finally {
    state.cartLoading = false;
    renderCart();
  }
}

function extractStorefrontBasketResponse(payload = {}) {
  if (!payload || typeof payload !== "object") return null;
  const basket = firstNonNull(
    payload?.basket,
    payload?.data?.basket,
    payload?.response?.basket,
    payload?.result?.basket,
    payload?.cart,
    payload?.data?.cart,
    payload?.response?.cart,
    payload?.result?.cart,
    payload?.payload?.basket,
    payload?.payload?.cart,
    null,
  );
  if (basket) return basket;
  if (Array.isArray(payload?.items) || Array.isArray(payload?.lines) || Array.isArray(payload?.basket_items)) {
    return payload;
  }
  return null;
}

function extractStorefrontBillResponse(payload = {}) {
  if (!payload || typeof payload !== "object") return null;
  return firstNonNull(
    payload?.bill,
    payload?.data?.bill,
    payload?.response?.bill,
    payload?.result?.bill,
    payload?.summary,
    payload?.data?.summary,
    payload?.response?.summary,
    payload?.result?.summary,
    payload?.payload?.bill,
    null,
  );
}

function extractStorefrontErrorMessage(payload = {}, status = 0) {
  const message = firstStorefrontErrorMessage(payload, status, new WeakSet());
  return message || (status ? `Selldone cart API error (${status}).` : "Could not add item to Selldone cart.");
}

function isLikelyStorefrontErrorMessage(message = "") {
  const normalized = String(message).trim().toLowerCase();
  if (!normalized) return false;
  if (/\bok\b|success/.test(normalized) && normalized.length <= 30) return false;

  return [
    "error",
    "failed",
    "invalid",
    "incorrect",
    "removed",
    "not available",
    "not found",
    "no longer",
    "forbidden",
    "permission",
    "expired",
    "unauthor",
    "not authorized",
    "does not",
    "missing scope",
    "please log",
    "login first",
  ].some((token) => normalized.includes(token));
}

function hasStorefrontBasketError(payload = {}, status = 0) {
  return hasStorefrontBasketErrorValue(payload, status, new WeakSet());
}

function isStorefrontCartAuthError(status = 0, message = "") {
  return status === 401 || status === 403 || /please log|login first|not authorized|unauthor|token|authorization|session/i.test(message);
}

function storefrontCartRequestBody(item, selectedVariantId, count) {
  const body = {
    count: Math.max(0, Number.parseInt(count, 10) || 0),
    currency: firstNonNull(item?.currency, "$"),
  };
  if (selectedVariantId) {
    body.variant_id = selectedVariantId;
  }
  return body;
}

async function requestStorefrontCartMutation(productId, requestBody = {}, method = "PUT") {
  try {
    const response = await fetch(`/api/storefront/basket/${encodeURIComponent(String(productId))}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json().catch(() => ({}));
    const basket = extractStorefrontBasketResponse(result);
    const bill = extractStorefrontBillResponse(result);
    const hasError = !response.ok || hasStorefrontBasketError(result, response.status) || result?.ok === false;
    const errorMessage = extractStorefrontErrorMessage(result, response.status);

    if (hasError) {
      if (isStorefrontCartAuthError(response.status, errorMessage)) {
        clearStorefrontSessionState();
        updateAccountButton();
      }
      return { ok: false, status: response.status, error: errorMessage, result };
    }

    return { ok: true, status: response.status, result, basket, bill };
  } catch {
    return { ok: false, status: 0, error: "Failed to update Selldone cart. Please try again." };
  }
}

async function applyStorefrontCartMutation(mutation) {
  if (!mutation?.ok) return false;
  if (mutation.basket) {
    await ensureBasketProductsAvailable(mutation.basket);
    syncCartFromBasketPayload(mutation.basket);
    syncCartSummary(mutation.bill);
    saveCart();
    renderCart();
    return true;
  }
  return hydrateStorefrontCart(true);
}

function firstStorefrontErrorMessage(payload = {}, status = 0, visited = new WeakSet()) {
  if (!payload || typeof payload !== "object") {
    return status ? `Selldone cart API error (${status}).` : "";
  }
  if (visited.has(payload)) return "";
  visited.add(payload);

  const candidates = [
    payload?.error_msg,
    payload?.error_description,
    payload?.message,
    payload?.error,
    payload?.error_message,
    payload?.reason,
    payload?.title,
    payload?.statusMessage,
    payload?.details,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const entry of candidate) {
        const nested = typeof entry === "string" ? entry.trim() : firstStorefrontErrorMessage(entry, 0, visited);
        if (nested) return nested;
      }
      continue;
    }
    if (typeof candidate === "string") {
      const text = candidate.trim();
      if (text) return text;
    }
    if (candidate && typeof candidate === "object") {
      const nested = firstStorefrontErrorMessage(candidate, 0, visited);
      if (nested) return nested;
    }
  }

  const nestedPayloads = [
    payload?.payload,
    payload?.data,
    payload?.result,
    payload?.response,
    payload?.bill,
    payload?.cart,
    payload?.basket,
    payload?.summary,
    payload?.items,
    payload?.lines,
    payload?.errors,
  ];
  for (const nestedPayload of nestedPayloads) {
    if (!nestedPayload) continue;
    if (Array.isArray(nestedPayload)) {
      for (const entry of nestedPayload) {
        const nested = firstStorefrontErrorMessage(entry, 0, visited);
        if (nested) return nested;
      }
      continue;
    }
    const nested = firstStorefrontErrorMessage(nestedPayload, 0, visited);
    if (nested) return nested;
  }

  return "";
}

function hasStorefrontBasketErrorValue(payload = {}, status = 0, visited = new WeakSet()) {
  if (!payload || typeof payload !== "object") return status >= 400;
  if (visited.has(payload)) return false;
  visited.add(payload);

  if (payload?.ok === false || payload?.success === false || payload?.valid === false || payload?.error === true) {
    return true;
  }

  const directFlags = [
    payload?.error_msg,
    payload?.error_message,
    payload?.error_description,
    payload?.reason,
    payload?.message,
    payload?.details,
  ];

  for (const flag of directFlags) {
    if (flag === null || flag === undefined || flag === false) continue;
    if (typeof flag === "boolean") {
      if (flag) return true;
      continue;
    }
    if (typeof flag === "string" && flag.trim()) return isLikelyStorefrontErrorMessage(flag);
    if (Array.isArray(flag)) {
      const hasErrorEntry = flag.some((entry) => {
        if (typeof entry === "string") return isLikelyStorefrontErrorMessage(entry);
        if (entry && typeof entry === "object") return hasStorefrontBasketErrorValue(entry, 0, visited);
        return false;
      });
      if (hasErrorEntry) return true;
      continue;
    }
    if (flag && typeof flag === "object" && hasStorefrontBasketErrorValue(flag, 0, visited)) {
      return true;
    }
  }

  if (Array.isArray(payload?.errors)) {
    for (const errorEntry of payload.errors) {
      if (typeof errorEntry === "string") {
        if (isLikelyStorefrontErrorMessage(errorEntry)) return true;
      } else if (hasStorefrontBasketErrorValue(errorEntry, 0, visited)) {
        return true;
      }
    }
  }

  const nestedPayloads = [
    payload?.payload,
    payload?.data,
    payload?.result,
    payload?.response,
    payload?.bill,
    payload?.cart,
    payload?.basket,
    payload?.summary,
    payload?.items,
    payload?.lines,
    payload?.details,
  ];
  for (const nestedPayload of nestedPayloads) {
    if (!nestedPayload) continue;
    if (Array.isArray(nestedPayload)) {
      for (const entry of nestedPayload) {
        if (hasStorefrontBasketErrorValue(entry, 0, visited)) return true;
      }
      continue;
    }
    if (hasStorefrontBasketErrorValue(nestedPayload, 0, visited)) return true;
  }

  return false;
}

function sumNumericFields(source, candidates = []) {
  const values = candidates
    .map((key) => pickNumeric(source, [key], NaN))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return NaN;
  return values.reduce((sum, value) => sum + value, 0);
}

function cartTotalsSummary(entries = []) {
  const localSubtotal = entries.reduce((sum, entry) => sum + entry.linePrice * entry.qty, 0);
  const localCurrency = firstNonNull(entries[0]?.item?.currency, "$");
  const summary = state.cartSummary && typeof state.cartSummary === "object" ? state.cartSummary : null;
  const summarySubtotal = summary ? pickNumeric(summary, ["items_price", "subtotal", "sub_total", "items_total", "total_items", "itemsCost", "products_price", "basket_price"], localSubtotal) : localSubtotal;
  const summaryTotal = summary ? pickNumeric(summary, ["sum", "total", "final_total", "grand_total", "payable", "amount", "pay_amount", "payment_amount", "to_pay", "price"], NaN) : NaN;
  const currency = firstNonNull(summary?.currency, summary?.currency_code, localCurrency);
  const shipping = summary ? pickNumeric(summary, ["delivery_price", "shipping", "shipping_cost", "delivery_cost", "delivery", "shipping_price", "transportation_price"], NaN) : NaN;
  const aggregateDiscount = summary ? pickNumeric(summary, ["total_discount", "discount_total", "discounts_total", "basket_discount", "discount"], NaN) : NaN;
  const componentDiscount = summary ? sumNumericFields(summary, ["items_discount", "products_discount", "cross_selling_discount", "offer", "offer_discount", "discount_code", "coupon", "coupon_discount", "club", "club_discount", "lottery", "lottery_discount"]) : NaN;
  const discounts = Number.isFinite(aggregateDiscount) ? Math.abs(aggregateDiscount) : Number.isFinite(componentDiscount) ? Math.abs(componentDiscount) : 0;
  const productTax = summary ? pickNumeric(summary, ["tax", "vat", "value_added_tax"], NaN) : NaN;
  const taxShipping = summary ? pickNumeric(summary, ["tax_shipping", "shipping_tax", "delivery_tax"], NaN) : NaN;
  const aggregateTax = summary ? pickNumeric(summary, ["tax_total", "total_tax", "taxes"], NaN) : NaN;
  const componentTax = sumNumericFields({ productTax, taxShipping }, ["productTax", "taxShipping"]);
  const tax = Number.isFinite(aggregateTax) ? aggregateTax : componentTax;
  const taxIncluded = Boolean(summary && ["tax_included", "taxIncluded", "included_tax", "vat_included"].some((key) => {
    const value = summary[key];
    return value === true || value === 1 || String(value || "").toLowerCase() === "true";
  }));
  const effectiveShipping = Number.isFinite(shipping) && shipping > 0 ? shipping : 0;
  const fallbackTotal = Math.max(0, summarySubtotal - discounts + (Number.isFinite(tax) ? tax : 0) + effectiveShipping);
  return {
    subtotal: summarySubtotal,
    total: Number.isFinite(summaryTotal) ? summaryTotal : fallbackTotal,
    currency,
    shipping,
    discounts,
    tax: Number.isFinite(tax) ? Math.max(0, tax) : NaN,
    taxShipping: Number.isFinite(taxShipping) ? Math.max(0, taxShipping) : 0,
    taxIncluded,
    hasSummary: Boolean(summary),
  };
}

function cartEntries() {
  return Object.entries(state.cart)
    .map(([rawKey, qty]) => {
      const { productId, variantKey } = parseCartLineKey(rawKey);
      const item = getProductById(productId);
      if (!item || !qty || qty <= 0) return null;

      const baseVariant = cartLineVariant(item, variantKey);
      const basketVariant = state.cartLineDetails?.[rawKey]?.variant || null;
      const variant = mergeCartLineVariant(baseVariant, basketVariant, rawKey);
      const variantPrice = resolveVariantPrice(variant, item.price);
      return {
        lineKey: String(rawKey),
        productId,
        variantKey,
        item,
        variant,
        qty,
        linePrice: variantPrice,
      };
    })
    .filter((entry) => entry !== null);
}

function addToCart(productId, variantKey = "", options = {}) {
  return addToCartAsync(productId, variantKey, options);
}

async function addToCartAsync(productId, variantKey = "", options = {}) {
  const openBag = options.openBag !== false;
  const successToast = typeof options.successToast === "string" ? options.successToast : "Added to bag";
  let itemId = String(productId || "").trim();
  if (!itemId) {
    itemId = String(state.activeProductId || "").trim();
  }
  if (!itemId) {
    showToast("Product ID unknown.");
    return { ok: false };
  }

  let item = getProductById(itemId);
  if (!item && state.dataSource === DATA_SOURCE.xapi) {
    item = await fetchXapiProductDetail(itemId);
  }
  if (!item) {
    showToast("Product is not available.");
    return { ok: false };
  }
  const resolvedVariant = await resolveCartLineVariantForStorefront(item, variantKey);
  item = resolvedVariant.item || item;
  const selected = resolvedVariant.selected;
  const selectedVariantId = resolvedVariant.variantId;
  const keyMatched = resolvedVariant.keyMatched !== false;
  const itemVariants = getItemVariants(item);
  const hasVariants = itemVariants.length > 0;

  const lineKey = cartLineKey(
    item.id,
    firstNonNull(
      selected?.__key,
      selected?.__index,
      selected?.id,
      selected?.variant_id,
      selected?.sku,
      selected?.code,
      variantKey,
    ),
  );
  if (!lineKey) return { ok: false };

  if (!keyMatched && itemVariants.length > 1) {
    showToast("This selected variant is no longer available. Please reselect an option.");
    return { ok: false };
  }

  if (selected && !selectedVariantId && hasVariants) {
    showToast("This selected variant is not valid anymore. Please reselect an option.");
    return { ok: false };
  }

  if (hasVariants && selectedVariantId && !isStorefrontVariantIdInList(itemVariants, selectedVariantId)) {
    showToast("This selected variant is not available anymore. Please reselect an option.");
    return { ok: false };
  }

  if (!state.sessionAuthenticated) {
    await fetchSessionStatus(true);
    if (!state.sessionAuthenticated) {
      showToast("Please log in before adding to cart.");
      return { ok: false };
    }
  }

  if (!state.cartLoaded) {
    const loaded = await hydrateStorefrontCart(true);
    if (!loaded) {
      showToast(state.cartLoadError || "Could not load your Selldone bag before updating it.");
      return { ok: false };
    }
  }

  const nextCount = Math.max(1, toNumber(state.cart[lineKey], 0) + 1);
  const requestBody = storefrontCartRequestBody(item, selectedVariantId, nextCount);
  state.cartUpdatingKeys.add(lineKey);
  renderCart();

  const mutation = await requestStorefrontCartMutation(item.id, requestBody, "PUT");
  state.cartUpdatingKeys.delete(lineKey);

  if (!mutation.ok) {
    renderCart();
    showToast(mutation.error || "Could not add item to Selldone cart.");
    return { ok: false };
  }

  const synced = await applyStorefrontCartMutation(mutation);
  if (!synced) {
    renderCart();
    showToast(state.cartLoadError || "Selldone did not return basket details.");
    return { ok: false };
  }

  if (selected) {
    setActiveProductVariantSelection(item.id, selected);
  }

  if (openBag) openCart();
  if (successToast) showToast(successToast);
  return { ok: true, item, selected, selectedVariantId, lineKey, count: nextCount };
}

async function setCartQuantity(lineKey, quantity) {
  const key = String(lineKey || "").trim();
  if (!key) return;
  if (state.cartUpdatingKeys.has(key)) return;

  if (!state.sessionAuthenticated) {
    await fetchSessionStatus(true);
    if (!state.sessionAuthenticated) {
      showToast("Please log in before updating your bag.");
      return;
    }
  }

  const nextCount = Math.max(0, Math.min(99, Number.parseInt(quantity, 10) || 0));
  const { productId, variantKey } = parseCartLineKey(key);
  let item = getProductById(productId);
  if (!item && state.dataSource === DATA_SOURCE.xapi) {
    item = await fetchXapiProductDetail(productId);
  }
  if (!item) {
    showToast("Product is not available.");
    return;
  }

  const resolvedVariant = await resolveCartLineVariantForStorefront(item, variantKey);
  item = resolvedVariant.item || item;
  const selected = resolvedVariant.selected;
  const selectedVariantId = resolvedVariant.variantId;
  const itemVariants = getItemVariants(item);
  if (selected && !selectedVariantId && itemVariants.length) {
    showToast("This selected variant is not valid anymore. Please reselect an option.");
    return;
  }

  const requestBody = storefrontCartRequestBody(item, selectedVariantId, nextCount);
  state.cartUpdatingKeys.add(key);
  renderCart();

  const mutation = await requestStorefrontCartMutation(item.id, requestBody, nextCount > 0 ? "PUT" : "DELETE");
  state.cartUpdatingKeys.delete(key);

  if (!mutation.ok) {
    renderCart();
    showToast(mutation.error || "Could not update your Selldone bag.");
    return;
  }

  const synced = await applyStorefrontCartMutation(mutation);
  if (!synced) {
    renderCart();
    showToast(state.cartLoadError || "Could not refresh your Selldone bag.");
    return;
  }

  showToast(nextCount > 0 ? "Bag updated" : "Removed from bag");
}

function updateQuantity(lineKey, delta) {
  const key = String(lineKey || "").trim();
  if (!key) return;
  const current = toNumber(state.cart[key], 0);
  return setCartQuantity(key, current + Number(delta || 0));
}

function renderCart() {
  const entries = cartEntries();
  const count = entries.reduce((sum, entry) => sum + entry.qty, 0);
  const totals = cartTotalsSummary(entries);
  const currency = totals.currency || "$";
  const hasShipping = Number.isFinite(totals.shipping);
  const hasDiscount = Number.isFinite(totals.discounts) && totals.discounts > 0;
  const hasTax = Number.isFinite(totals.tax);
  const displayTotal = Number.isFinite(totals.total) ? totals.total : totals.subtotal;
  const shippingText = hasShipping
    ? totals.shipping >= 0
      ? formatPrice(totals.shipping, currency)
      : "Calculated after address"
    : "Calculated at checkout";
  const isMutating = state.cartUpdatingKeys.size > 0;
  const statusMarkup = [
    state.cartLoading ? `<p class="cart-status" role="status">Syncing your Selldone bag...</p>` : "",
    state.cartLoadError ? `<p class="cart-status cart-status--error" role="alert">${escapeHtml(state.cartLoadError)}</p>` : "",
  ].join("");

  els.cartCount.textContent = String(count);
  els.cartTitle.textContent = state.cartLoading && !state.cartLoaded ? "Syncing bag" : `${count} ${count === 1 ? "item" : "items"}`;
  els.cartSubtotal.textContent = formatPrice(totals.subtotal, currency);
  if (els.cartShipping) els.cartShipping.textContent = shippingText;
  if (els.cartShippingRow) els.cartShippingRow.hidden = !hasShipping;
  if (els.cartDiscount) els.cartDiscount.textContent = `-${formatPrice(totals.discounts, currency)}`;
  if (els.cartDiscountRow) els.cartDiscountRow.hidden = !hasDiscount;
  if (els.cartTax) els.cartTax.textContent = `${formatPrice(Math.max(0, totals.tax), currency)}${totals.taxIncluded ? " included" : ""}`;
  if (els.cartTaxRow) els.cartTaxRow.hidden = !hasTax;
  if (els.cartTotal) els.cartTotal.textContent = formatPrice(displayTotal, currency);
  if (els.cartSummaryNote) {
    els.cartSummaryNote.textContent = state.cartLoading
      ? "Checking live prices and availability."
      : totals.hasSummary
        ? "Totals are synced from Selldone."
        : state.sessionAuthenticated
          ? "Totals will update after Selldone sync."
          : "Log in to sync your Selldone bag.";
  }
  if (els.cartCheckoutButton) {
    els.cartCheckoutButton.disabled = !entries.length || state.cartLoading || isMutating;
  }

  const itemsMarkup = entries.length
    ? entries
        .map(({ lineKey, item, qty, variant, linePrice }) => {
          const isUpdating = state.cartUpdatingKeys.has(lineKey);
          const disabled = isUpdating || state.cartLoading ? "disabled" : "";
          const activeMedia = firstNonNull(
            variant?.image,
            variant?.icon,
            variant?.path,
            variant?.url,
            variant?.filename,
            variant?.photo,
            item.image,
            item.images?.[0],
          );
          const productHref = `#product/${encodeURIComponent(String(item.id))}`;
          const variantMarkup = variantDetailsMarkup(variant, variant?.__index || 0, "cart-variant-details");
          return `
            <article class="cart-item ${isUpdating ? "is-updating" : ""}">
              <a class="cart-item-media cart-item-link" href="${productHref}" data-cart-product-link>${renderProductImage(item, "thumbnail-sprite", activeMedia)}</a>
              <div class="cart-item-copy">
                <h3><a class="cart-item-title-link" href="${productHref}" data-cart-product-link>${escapeHtml(item.title)}</a></h3>
                <p>${escapeHtml(item.brand)}</p>
                ${variantMarkup}
                <div class="cart-item-prices">
                  <strong>${formatPrice(linePrice, item.currency)}</strong>
                  <span>${formatPrice(linePrice * qty, item.currency)} line total</span>
                </div>
                <button class="cart-remove" type="button" data-cart-remove-key="${escapeHtml(lineKey)}" ${disabled}>Remove</button>
              </div>
              <div class="qty-stepper" aria-label="Quantity controls">
                <button type="button" data-cart-key="${escapeHtml(lineKey)}" data-delta="-1" aria-label="Decrease quantity" ${disabled}>-</button>
                <input class="qty-input" type="number" min="1" max="99" inputmode="numeric" value="${qty}" data-cart-quantity="${escapeHtml(lineKey)}" aria-label="Quantity for ${escapeHtml(item.title)}" ${disabled} />
                <button type="button" data-cart-key="${escapeHtml(lineKey)}" data-delta="1" aria-label="Increase quantity" ${disabled}>+</button>
                ${isUpdating ? `<span class="cart-item-sync">Syncing</span>` : ""}
              </div>
            </article>
          `;
        })
        .join("")
    : `<p class="cart-empty">${state.cartLoading ? "Loading your bag..." : "Your bag is ready for something beautiful."}</p>`;

  els.cartItems.innerHTML = `${statusMarkup}${itemsMarkup}`;
}

function openCart() {
  els.cartDrawer.classList.add("is-open");
  els.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
  if (state.sessionAuthenticated && !state.cartLoaded && !state.cartLoading) {
    void hydrateStorefrontCart();
  }
}

function closeCart() {
  els.cartDrawer.classList.remove("is-open");
  els.cartDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1500);
}

function setHash(value, params = null) {
  const target = String(value || "home").replace(/^#/, "");
  const query = params && typeof params === "object"
    ? new URLSearchParams(Object.entries(params).filter(([, paramValue]) => paramValue !== undefined && paramValue !== null && String(paramValue) !== "")).toString()
    : "";
  const next = `${target}${query ? `?${query}` : ""}`;
  if (window.location.hash.replace(/^#/, "") === next) {
    route();
    return;
  }
  window.location.hash = next;
}

function parseHash() {
  const raw = decodeURIComponent(window.location.hash.replace(/^#/, "") || "home");
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const routeName = parts[0] || "home";
  return {
    raw,
    route: routeName,
    id: parts[1] || "",
    section: `${parts.slice(1).join("/")}${query ? `?${query}` : ""}`,
    query,
    params: new URLSearchParams(query),
  };
}

function productCard(item, compact = false) {
  const price = toNumber(item.price, 0);
  const original = toNumber(item.original, 0);
  const rating = toNumber(item.rating, 0);
  const reviews = toNumber(item.reviews, 0);
  const colors = toNumber(item.colors, 1);
  const sale = original > 0 && original > price;
  const productVariantKey = firstNonNull(
    activeProductVariant(item)?.__key,
    activeProductVariant(item)?.__index,
    activeProductVariant(item)?.id,
    activeProductVariant(item)?.variant_id,
    activeProductVariant(item)?.sku,
    activeProductVariant(item)?.code,
  );
  return `
    <article class="product-card ${compact ? "deal-card" : ""}">
      <a class="product-media" href="#product/${item.id}" aria-label="${escapeHtml(item.title)}">
        ${item.badge ? `<span class="badge">${escapeHtml(item.badge)}</span>` : ""}
        ${renderProductImage(item)}
      </a>
      <div class="product-copy">
        <span class="shade-count">${colors} ${colors === 1 ? "color" : "colors"}</span>
        <strong class="brand">${escapeHtml(item.brand)}</strong>
        <a class="product-title" href="#product/${item.id}">${escapeHtml(item.title)}</a>
        <div class="rating"><span class="stars">*****</span><span>${rating.toFixed(1)} (${reviews.toLocaleString()})</span></div>
        <div class="price-line">
          <span class="${sale ? "sale-price" : ""}">${formatPrice(price, item.currency)}</span>
          ${sale ? `<s>${formatPrice(original, item.currency)}</s>` : ""}
        </div>
        <button class="add-button" type="button" data-add-to-cart-product="${item.id}" data-variant-key="${escapeHtml(productVariantKey || "")}">Add to bag</button>
      </div>
    </article>
  `;
}

async function ensureProductsForPage() {
  if (!state.productsLoaded || !state.products.length) {
    await fetchXapiProducts();
  }
}

function renderDataStatus() {
  if (state.isLoading) {
    return `<p class="mini-note" role="status">Fetching latest products from Selldone...</p>`;
  }
  if (state.loadError) {
    return `<p class="mini-note" role="status">${escapeHtml(state.loadError)}</p>`;
  }
  if (state.dataSource === DATA_SOURCE.xapi) {
    return `<p class="mini-note" role="status">Showing ${productTotal()} live products from Selldone XAPI.</p>`;
  }
  return `<p class="mini-note" role="status">Waiting for Selldone XAPI catalog.</p>`;
}

function productTimeValue(item) {
  const value = Date.parse(item?.createdAt || item?.updatedAt || "");
  return Number.isFinite(value) ? value : toNumber(item?.id, 0);
}

function homeDeals(products, limit, offset = 0) {
  const discounted = sortByMerchPriority(products.filter(hasProductDiscount));
  const source = discounted.length >= offset + 1 ? discounted : sortByMerchPriority(products);
  return source.slice(offset, offset + limit);
}

function homeRecommended(products, limit) {
  return [...products]
    .sort(
      (a, b) =>
        productMerchPriority(a) - productMerchPriority(b) ||
        toNumber(b.rating, 0) - toNumber(a.rating, 0) ||
        toNumber(b.reviews, 0) - toNumber(a.reviews, 0),
    )
    .slice(0, limit);
}

function homeNewProducts(products, limit) {
  return [...products]
    .sort((a, b) => productMerchPriority(a) - productMerchPriority(b) || productTimeValue(b) - productTimeValue(a))
    .slice(0, limit);
}

function renderProductSection(title, subtitle, items, className) {
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        <a class="text-link" href="#shop">Shop all</a>
      </div>
      <div class="${className}">
        ${items.map((item) => productCard(item)).join("")}
      </div>
    </section>
  `;
}

function renderDealStrip(title, items) {
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${items.length} items</p>
        </div>
        <a class="text-link" href="#shop">Shop all deals</a>
      </div>
      <div class="deal-row">
        ${items.map((item) => productCard(item, true)).join("")}
      </div>
    </section>
  `;
}



function renderHomePage() {
  return renderHomePageModule({
    state,
    els,
    heroSlides,
    escapeHtml,
    getProductsForUi,
    renderLiveCatalogEmptyState,
    homeDeals,
    homeRecommended,
    homeNewProducts,
    renderDataStatus,
    renderProductSection,
    renderDealStrip,
    eventTile,
    featureCard,
    renderBlogTeaserSection,
    renderHomeBlogBand,
    storyCard,
    getCategoryCards,
    categoryCard,
  });
}

async function renderShopPage() {
  await ensureProductsForPage();
  syncRouteSearch(parseHash().params);
  const products = getFilteredProducts();
  els.app.innerHTML = `
    <div class="page-shell">
      ${renderDataStatus()}
      <nav class="breadcrumbs" aria-label="Breadcrumbs">
        <a href="#home">Home</a><span>/</span><span>Makeup</span><span>/</span><span>Face</span><span>/</span><strong>Featured Beauty</strong>
      </nav>
      <section class="shop-hero">
        <div class="shop-hero-copy">
          <span class="eyebrow">Discover the refreshed</span>
          <h1>Pajulina Beauty Collection</h1>
          <p>Cruelty free beauty with clean ingredients, fresh color, and everyday ease.</p>
        </div>
        <div class="shop-hero-image" style="--shop-hero-image:url('assets/shop-hero-fresh.png')" role="img" aria-label="Pajulina beauty collection products"></div>
      </section>

      <section class="section-tight">
        <div class="editorial-row">
          ${featureCard("Glossy lips, soft cheeks", "Color that feels light and fresh.", "50% 52%", "assets/shop-glossy-lips.png")}
          ${featureCard("Beauty, assembled", "Routine-ready favorites for every bag.", "50% 50%", "assets/shop-beauty-assembled.png")}
          ${featureCard("Face the summer", "SPF, tint, and glow for warm days.", "50% 50%", "assets/shop-face-summer.png")}
          ${featureCard("Gifts that glow", "Little luxuries, easy to love.", "50% 50%", "assets/shop-gifts-glow.png")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h1>${shopHeading()}</h1>
            <p>${products.length} items</p>
          </div>
        </div>
        <div class="shop-toolbar">
          ${(() => {
            const chips = [["all", "All"], ...getCategoryCards().map(([key, label]) => [key, label])];
            return `<div class="filter-bar" role="group" aria-label="Filter by category">
              ${discountFilterChip()}
              ${chips.map(([key, label]) => filterChip(key, label)).join("")}
            </div>`;
          })()}
          <select class="sort-select" aria-label="Sort products" data-sort-select>
            <option value="featured" ${state.activeSort === "featured" ? "selected" : ""}>Sort by Featured</option>
            <option value="price-low" ${state.activeSort === "price-low" ? "selected" : ""}>Price: low to high</option>
            <option value="price-high" ${state.activeSort === "price-high" ? "selected" : ""}>Price: high to low</option>
            <option value="rating" ${state.activeSort === "rating" ? "selected" : ""}>Top rated</option>
            <option value="new" ${state.activeSort === "new" ? "selected" : ""}>New arrivals</option>
          </select>
        </div>
        <div class="shop-grid">
          ${products.map((item) => productCard(item)).join("")}
        </div>
        <div class="load-more">
          <span>You are viewing ${products.length} of ${productTotal()} items</span>
          <button class="black-button" type="button">Load more</button>
        </div>
      </section>
    </div>
  `;
}

async function renderProductPage(productId) {
  return renderProductPageModule({
    productId,
    state,
    DATA_SOURCE,
    els,
    getProductById,
    fetchXapiProductDetail,
    ensureProductsForPage,
    productNeedsStorefrontDetail,
    renderLiveCatalogEmptyState,
    ensureShopTransportationsLoaded,
    firstNonNull,
    transportSelectionKey,
    transportationSelectionExists,
    renderDeliveryCards,
    activeProductVariant,
    resolveVariantPrice,
    toNumber,
    resolveVariantOriginalPrice,
    normalizeGallery,
    renderVariantSection,
    getProductsForUi,
    escapeHtml,
    titleCase,
    renderProductImage,
    formatPrice,
    renderProductProsAccordion,
    miniProduct,
    routineStep,
    renderProductSection,
    reviewBar,
  });
}

function productNeedsStorefrontDetail(item) {
  const variants = getItemVariants(item);
  if (!variants.length) return false;
  return variants.some((variant) => !resolveStorefrontVariantId(variant));
}
async function renderBlogPage() {
  await ensureBlogsLoaded();
  const articles = state.blogs || [];
  els.app.innerHTML = `
    <div class="page-shell">
      <section class="section">
        <div class="section-heading">
          <span>Journal</span>
          <h1>Blog</h1>
          <p>${articles.length ? "Latest storefront blog posts from Selldone." : state.blogsLoadError || "No blog posts were returned."}</p>
        </div>
        ${articles.length ? `<div class="blog-grid">${articles.map((article) => renderBlogCard(article)).join("")}</div>` : ""}
      </section>
    </div>
  `;
}

async function renderBlogArticlePage(articleId) {
  await ensureBlogsLoaded();
  const article = await ensureBlogArticleLoaded(articleId);
  if (!article) {
    els.app.innerHTML = `
      <div class="page-shell">
        <section class="section">
          <div class="section-heading">
            <span>Journal</span>
            <h1>Blog post unavailable</h1>
            <p>${escapeHtml(state.blogsLoadError || "Could not load this Selldone blog post.")}</p>
            <a class="pill-button" href="#blog">Back to blog</a>
          </div>
        </section>
      </div>
    `;
    return;
  }

  const date = blogArticleDate(article);
  els.app.innerHTML = `
    <div class="page-shell">
      <article class="blog-article">
        <header class="blog-article-head">
          <a class="text-link" href="#blog">Back to blog</a>
          <div class="blog-meta">
            <span>${escapeHtml(article.category || "Beauty Notes")}</span>
            ${date ? `<span>${escapeHtml(date)}</span>` : ""}
            ${article.author ? `<span>${escapeHtml(article.author)}</span>` : ""}
          </div>
          <h1>${escapeHtml(article.title)}</h1>
        </header>
        ${renderBlogImage(article, "blog-article-media")}
        <div class="blog-article-body">
          ${renderBlogBody(article)}
        </div>
      </article>
    </div>
  `;
}

function renderLiveCatalogEmptyState(title = "Nothing to show", body = "Please try again.") {
  els.app.innerHTML = `
    <div class="page-shell">
      <section class="section">
        <div class="account-order-history-empty storefront-empty-state">
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(body)}</p>
          <div class="account-profile-actions">
            <a class="black-button" href="#shop">Back to shop</a>
          </div>
        </div>
      </section>
    </div>
  `;
}

async function renderOrderSuccessPage(params = new URLSearchParams()) {
  clearOrderSuccessTimer();
  const orderId = String(params.get("order") || params.get("id") || rememberedCheckoutOrderId() || "").trim();
  if (orderId) rememberCheckoutOrder(orderId);

  closeCart();
  state.cart = {};
  state.cartSummary = null;
  state.cartLoaded = false;
  saveCart();
  renderCart();
  await hydrateStorefrontCart(true).catch(() => false);
  state.cart = {};
  state.cartSummary = null;
  state.cartLoaded = true;
  saveCart();
  renderCart();

  let seconds = 5;
  const detailTarget = orderId ? `#account/orders?detail=${encodeURIComponent(orderId)}` : "#account/orders";
  els.app.innerHTML = `
    <div class="page-shell">
      <nav class="breadcrumbs" aria-label="Order complete path">
        <a href="#home">Home</a><span>/</span><a href="#account/orders">Orders</a><span>/</span><strong>Completed</strong>
      </nav>
      <section class="order-success-page" aria-live="polite">
        <div class="order-success-card">
          <span class="order-success-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M9.2 16.4 4.8 12l-1.5 1.5 5.9 5.9L21 7.6 19.5 6 9.2 16.4Z" />
            </svg>
          </span>
          <span class="account-profile-kicker">Order completed</span>
          <h1>Payment successful</h1>
          <p>${orderId ? `Your Selldone order ${escapeHtml(orderId)} is complete.` : "Your Selldone order is complete."}</p>
          <div class="order-success-countdown">
            Opening order details in <strong data-order-success-countdown>${seconds}</strong> seconds.
          </div>
          <div class="account-profile-actions">
            <a class="black-button" href="${escapeHtml(detailTarget)}">View order details</a>
            <a class="text-link" href="#shop">Continue shopping</a>
          </div>
        </div>
      </section>
    </div>
  `;

  orderSuccessCountdownTimer = window.setInterval(() => {
    seconds -= 1;
    const counter = document.querySelector("[data-order-success-countdown]");
    if (counter) counter.textContent = String(Math.max(0, seconds));
    if (seconds > 0) return;
    clearOrderSuccessTimer();
    if (orderId) {
      setHash("account/orders", { detail: orderId });
      return;
    }
    setHash("account/orders");
  }, 1000);
}

async function route() {
  const current = parseHash();
  if (current.route !== "order-success") clearOrderSuccessTimer();
  setPageLoading(true);
  try {
    if (current.route === "product") {
      await renderProductPage(current.id);
    } else if (current.route === "account") {
      await renderAccountProfilePage(current.section || "profile");
    } else if (current.route === "checkout") {
      await renderCheckoutPage();
    } else if (current.route === "order-success") {
      await renderOrderSuccessPage(current.params);
    } else if (current.route === "shop") {
      await renderShopPage();
    } else if (current.route === "cart" || current.route === "bag") {
      await renderShopPage();
      openCart();
    } else if (current.route === "blog" && current.id) {
      await renderBlogArticlePage(current.id);
    } else if (current.route === "blog") {
      await renderBlogPage();
    } else if (current.route === "home" || current.route === "") {
      await ensureProductsForPage();
      await ensureBlogsLoaded();
      renderHomePage();
    } else {
      await ensureProductsForPage();
      await ensureBlogsLoaded();
      renderHomePage();
    }
  } catch (error) {
    renderLiveCatalogEmptyState("Storefront unavailable", error?.message || "Could not open this page.");
  } finally {
    setPageLoading(false);
    updateAccountButton();
    renderCart();
  }
}

function setAccountMenuOpen(open) {
  const nextState = Boolean(open);
  state.accountMenuOpen = nextState;
  if (els.accountButton) {
    els.accountButton.setAttribute("aria-expanded", String(nextState));
  }
  if (els.accountControl) {
    els.accountControl.classList.toggle("is-open", nextState);
  }
}

function closeAccountMenu() {
  setAccountMenuOpen(false);
}

function toggleAccountMenu() {
  setAccountMenuOpen(!state.accountMenuOpen);
}

function categoryMenuHref(key) {
  const normalized = String(key || "").trim();
  if (!normalized || normalized === "all") return "#shop";
  return `#shop?category=${encodeURIComponent(normalized)}`;
}

function categoryProductCount(key) {
  const normalized = asSafeCategory(key);
  if (!normalized || normalized === "all") return productTotal();
  return getProductsForUi().filter((item) => asSafeCategory(item.category) === normalized).length;
}

function renderCategoryMenuItem(key, label, image) {
  const normalized = String(key || "all").trim() || "all";
  const count = categoryProductCount(normalized);
  return `
    <a class="category-menu-item" href="${categoryMenuHref(normalized)}" data-category-menu-link>
      <span class="category-menu-media">
        ${normalized === "all" ? renderSprite(0, "category-menu-sprite") : renderCategoryMedia(image)}
      </span>
      <span class="category-menu-copy">
        <strong>${escapeHtml(label || titleCase(normalized))}</strong>
        <small>${count} ${count === 1 ? "item" : "items"}</small>
      </span>
      <span class="category-menu-arrow" aria-hidden="true">›</span>
    </a>
  `;
}

function renderCategoryMenu() {
  if (!els.categoryMenuList) return;
  const categories = [["all", "All products", 0], ...getCategoryCards()];
  els.categoryMenuList.innerHTML = categories.length
    ? categories.map(([key, label, image]) => renderCategoryMenuItem(key, label, image)).join("")
    : `<p class="category-menu-empty">Categories are loading from Selldone.</p>`;
}

function setCategoryMenuOpen(open) {
  const nextState = Boolean(open);
  state.categoryMenuOpen = nextState;
  if (nextState) renderCategoryMenu();
  document.body.classList.toggle("category-menu-open", nextState);
  els.categoryMenu?.classList.toggle("is-open", nextState);
  els.categoryMenu?.setAttribute("aria-hidden", String(!nextState));
}

function openCategoryMenu() {
  setCategoryMenuOpen(true);
}

function closeCategoryMenu() {
  setCategoryMenuOpen(false);
}

function navigateToAccount(nextRoute = "") {
  if (state.sessionAuthenticated) {
    setHash("account");
    return;
  }
  window.location.assign(buildAccountLoginUrl(nextRoute));
}

function updateAccountButton() {
  if (!els.accountButton) return;
  const name = userDisplayName(state.sessionUser);
  const avatar = resolveUserAvatarUrl(state.sessionUser, "small");
  const initials = userInitials(state.sessionUser);
  const label = state.sessionAuthenticated && name ? `Account (${name})` : "Account";
  els.accountButton.setAttribute("title", state.sessionAuthenticated ? "Open account" : "Log in");
  els.accountButton.setAttribute("aria-label", state.sessionAuthenticated ? "Open account menu" : "Log in");
  if (state.sessionAuthenticated) {
    els.accountButton.innerHTML = avatar
      ? `<span class="account-button-avatar" aria-hidden="true"><img src="${escapeHtml(avatar)}" alt="${escapeHtml(name || "Profile")} avatar" loading="lazy" /></span>`
      : `<span class="account-button-avatar account-button-avatar--initials" aria-hidden="true">${escapeHtml(initials)}</span>`;
  } else {
    els.accountButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
      </svg>
    `;
  }
  if (name && state.sessionAuthenticated) {
    const marker = firstNonNull(label, "Account");
    els.accountButton.dataset.accountLabel = marker;
  } else {
    els.accountButton.dataset.accountLabel = "Account";
  }
  renderAccountMenu();
}

function setHeroSlide(index) {
  const total = heroSlides.length;
  if (!total) return;
  state.activeHeroSlide = ((index % total) + total) % total;

  const carousel = document.querySelector("[data-hero-carousel]");
  const track = carousel?.querySelector("[data-hero-track]");
  if (!carousel || !track) return;

  track.style.transform = `translateX(-${state.activeHeroSlide * 100}%)`;
  carousel.querySelectorAll(".hero-slide").forEach((slide, slideIndex) => {
    const isActive = slideIndex === state.activeHeroSlide;
    slide.classList.toggle("is-active", isActive);
    slide.setAttribute("aria-hidden", isActive ? "false" : "true");
  });
  carousel.querySelectorAll("[data-hero-slide]").forEach((dot, dotIndex) => {
    const isActive = dotIndex === state.activeHeroSlide;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function closeMobileMenu() {
  els.primaryLinks?.classList.remove("is-open");
}

export { 
  state,
  els,
  addToCart,
  cartEntries,
  closeAccountMenu,
  closeCart,
  closeCategoryMenu,
  closeQuickBuy,
  closeMobileMenu,
  fetchSessionStatus,
  firstNonNull,
  getItemVariants,
  getProductById,
  handleCheckoutSubmit,
  handleQuickBuySubmit,
  initializeStorefrontSession,
  navigateToAccount,
  openCart,
  openCategoryMenu,
  openQuickBuy,
  parseHash,
  renderCart,
  renderCheckoutPage,
  renderProductImage,
  renderProductPage,
  refreshQuickBuy,
  renderShopPage,
  selectProductVariantOption,
  route,
  setActiveProductVariantSelection,
  setCartQuantity,
  setHash,
  setHeroSlide,
  setQuickBuyAddressIndex,
  shadeName,
  showToast,
  toggleQuickBuyAddressEditing,
  updateAccountButton,
  updateQuickBuyQuantity,
  updateQuantity,
  toggleAccountMenu,
  normalizeGallery,
};
