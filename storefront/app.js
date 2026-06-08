const SPRITE_COLUMNS = 4;
const SPRITE_ROWS = 4;
const CART_KEY = "pajulina_storefront_cart_v1";
const DATA_SOURCE = {
  xapi: "xapi",
};
const XAPI_PRODUCT_LIMIT = 200;

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
  activeCategory: "all",
  activeSort: "featured",
  search: "",
  activeMedia: null,
  activeShade: 0,
  activeProductId: null,
  products: [],
  categoryCards: [],
  folders: [],
  dataSource: DATA_SOURCE.xapi,
  productsLoaded: false,
  isLoading: true,
  loadError: null,
  xapiEndpoint: null,
  activeProductGallery: [],
};

const els = {
  app: document.getElementById("app"),
  cartDrawer: document.querySelector("[data-cart-drawer]"),
  cartItems: document.querySelector("[data-cart-items]"),
  cartCount: document.querySelector("[data-cart-count]"),
  cartTitle: document.querySelector("[data-cart-title]"),
  cartSubtotal: document.querySelector("[data-cart-subtotal]"),
  searchInput: document.querySelector("[data-site-search]"),
  primaryLinks: document.querySelector("[data-primary-links]"),
};

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

function firstNonNull(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
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
    const mapped = pickImagePath(imageSource);
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

function pickImagePath(value) {
  if (typeof value !== "string") return null;
  const valueClean = value.trim();
  if (!valueClean) return null;
  if (/^https?:\/\//i.test(valueClean) || valueClean.startsWith("//")) return valueClean;
  if (/^(data|blob):/i.test(valueClean)) return valueClean;

  const cleanPath = valueClean.replace(/^\/+/, "");
  if (/^shops[_/]/i.test(cleanPath)) {
    return `${metaContent("selldone-cdn-images", "https://selldone.com/cdn-shop-images-1").replace(/\/$/, "")}/${cleanPath}`;
  }

  if (window.CDN?.GET_SHOP_IMAGE_PATH) {
    const cdnPath = window.CDN.GET_SHOP_IMAGE_PATH(cleanPath);
    if (cdnPath) return cdnPath;
  }

  return `${metaContent("storage-redirect-host", "https://cdn.selldone.com").replace(/\/$/, "")}/${cleanPath}`;
}

function extractImages(rawProduct) {
  const collected = [];
  const pushImage = (entry) => {
    if (typeof entry === "number") {
      collected.push(entry);
      return;
    }
    if (entry && typeof entry === "string") {
      const mapped = pickImagePath(entry);
      if (mapped) collected.push(mapped);
      return;
    }
    if (entry && typeof entry === "object") {
      const source = firstNonNull(entry.icon, entry.image, entry.path, entry.url, entry.filename);
      if (source) {
        const mapped = typeof source === "number" ? source : pickImagePath(source);
        if (mapped) collected.push(mapped);
      }
    }
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
  if (Array.isArray(rawProduct?.images_arr)) {
    rawProduct.images_arr.forEach(pushImage);
  }

  return Array.from(new Set(collected));
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
  const price = toNumber(firstNonNull(raw.price, raw.final_price, raw.sale_price, raw.priced_value, raw.list_price), 0);
  const originalCandidate = firstNonNull(raw.original, raw.regular_price, raw.compare_at_price, raw.base_price, raw.list_price);
  const discount = toNumber(raw.discount, 0);
  const colors = toNumber(raw.colors_count || raw.color_count || (Array.isArray(raw.productVariants) ? raw.productVariants.length : 0), 1);
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
    title,
    brand,
    category: categoryValue,
    subcategory: subcategoryValue,
    price: toNumber(price, 0),
    currency: firstNonNull(raw.currency, raw.currency_code, "$"),
    original: resolvedOriginal || null,
    image: images[0] ?? (raw.icon ?? 0),
    images,
    badge: badgeCandidate || (discount > 0 ? "Sale" : ""),
    discount,
    colors: Math.max(1, Math.min(12, toNumber(colors, 1))),
    rating: Math.max(0, Math.min(5, rating)),
    reviews,
    sku: raw.sku || `PJ-${raw.id || ""}`,
    createdAt: raw.created_at || raw.createdAt || null,
    updatedAt: raw.updated_at || raw.updatedAt || null,
    description: firstNonNull(
      raw.description,
      raw.summary,
      "A polished daily essential designed for fresh color, smooth wear, and an easy beauty routine.",
    ),
    rate: raw.rate,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    productVariants: Array.isArray(raw.productVariants) ? raw.productVariants : [],
    folder: categorySource,
  };
}

function renderProductImage(item, className = "product-sprite", media = null) {
  const target = media == null ? item?.image : media;
  if (typeof target === "number") return renderSprite(target, className);
  if (typeof target === "string" && target.trim()) {
    const source = pickImagePath(target) || target;
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
  const needle = String(productId || "");
  return getProductsForUi().find((entry) => String(entry.id) === needle) || null;
}

function syncRouteSearch(query) {
  state.search = query.get("search") || "";
  state.activeCategory = query.get("category") || "all";
  if (els.searchInput) els.searchInput.value = state.search;
  closeMobileMenu();
}

function responseProducts(payload) {
  return firstArray(payload?.products, payload?.data?.products, payload?.result?.products, payload?.items, payload?.data);
}

function responseFolders(payload) {
  return firstArray(payload?.folders, payload?.data?.folders, payload?.result?.folders, payload?.categories, payload?.data?.categories);
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
  if (!mappedProducts.length) {
    throw new Error("Selldone XAPI returned no products for this storefront.");
  }

  state.products = mappedProducts;
  state.folders = responseFolders(payload);
  const foldersCategoryCards = buildCategoryCardsFromFolders(state.folders).map((item) => [item.key, item.label, item.image]);
  const productCategoryCards = buildCategoryCardsFromProducts(mappedProducts).map((item) => [item.key, item.label, item.image]);
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

async function fetchXapiProductsDirect() {
  const shopName = metaContent("shop-name", "pajulina");
  const xapiBase = metaContent("selldone-xapi", "https://xapi.selldone.com").replace(/\/$/, "");
  const endpoint = new URL(`${xapiBase}/shops/@${encodeURIComponent(shopName)}/products/all`);

  endpoint.searchParams.set("dir", "*");
  endpoint.searchParams.set("offset", "0");
  endpoint.searchParams.set("limit", String(XAPI_PRODUCT_LIMIT));
  endpoint.searchParams.set("with_total", "true");
  endpoint.searchParams.set("with_category", "true");
  endpoint.searchParams.set("products_only", "false");
  endpoint.searchParams.set("categories_only", "false");
  endpoint.searchParams.set("with_parent", "true");
  endpoint.searchParams.set("with_page", "true");
  endpoint.searchParams.set("available", "false");
  endpoint.searchParams.set("surrounded", "false");
  endpoint.searchParams.set("sort", "newest");

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Direct Selldone XAPI failed with status ${response.status}.`);
  }
  return {
    ...payload,
    endpoint: { method: "GET", url: endpoint.toString() },
  };
}

function storefrontSdkNamespace() {
  return window.storefront || window.$storefront || window.StorefrontSDK || null;
}

async function setupStorefrontSdk() {
  const sdk = storefrontSdkNamespace();
  const setup = sdk?.StorefrontSDK?.Setup || sdk?.Setup || window.storefront?.StorefrontSDK?.Setup;
  if (typeof setup !== "function") {
    throw new Error("Selldone Storefront SDK is not available in the browser.");
  }
  setup();
  if (typeof window.$storefront?.products?.list !== "function") {
    throw new Error("Selldone Storefront SDK initialized without products.list.");
  }
  return window.$storefront;
}

async function fetchXapiProductsViaSdk() {
  const storefrontClient = await setupStorefrontSdk();
  const productClient =
    typeof storefrontClient.products.optimize === "function" ? storefrontClient.products.optimize(600) : storefrontClient.products;
  return productClient.list("*", 0, XAPI_PRODUCT_LIMIT, {
    categories_count: 0,
    with_total: true,
    with_category: true,
    products_only: false,
    categories_only: false,
    with_parent: true,
    with_page: true,
    sort: "newest",
    available: false,
    search: null,
    search_type: null,
    dirs: null,
    filter: null,
    bounds: null,
    tags: null,
    vendor_id: null,
    surrounded: false,
  });
}

async function fetchXapiProducts() {
  const errors = [];
  const loaders = [
    ["proxy", fetchXapiProductsViaProxy],
    ["direct", fetchXapiProductsDirect],
    ["sdk", fetchXapiProductsViaSdk],
  ];

  for (const [sourceLabel, loader] of loaders) {
    try {
      return applyXapiCatalog(await loader(), sourceLabel);
    } catch (error) {
      errors.push(`${sourceLabel}: ${error.message || error}`);
      console.warn(`Selldone XAPI ${sourceLabel} load failed:`, error);
    }
  }

  throw new Error(errors.join(" | ") || "Selldone XAPI catalog load failed.");
}

async function fetchXapiProductDetail(productId) {
  if (!productId) return null;

  try {
    let response = null;
    const proxyResponse = await fetch(`/api/storefront/products/${encodeURIComponent(String(productId))}`, {
      headers: { Accept: "application/json" },
    }).catch(() => null);
    if (proxyResponse?.ok) {
      response = await proxyResponse.json().catch(() => null);
    }
    if (!response?.product && !response?.data?.product) {
      response = await fetchXapiProductDetailDirect(productId).catch(() => null);
    }
    if (!response?.product && !response?.data?.product) {
      const storefrontClient = typeof window.$storefront?.products?.get === "function" ? window.$storefront : await setupStorefrontSdk().catch(() => null);
      if (typeof storefrontClient?.products?.get === "function") {
        response = await storefrontClient.products.get(String(productId));
      }
    }
    if (!response) return null;
    const payload = response?.product || response?.data?.product || response?.data || response;
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

async function fetchXapiProductDetailDirect(productId) {
  const shopName = metaContent("shop-name", "pajulina");
  const xapiBase = metaContent("selldone-xapi", "https://xapi.selldone.com").replace(/\/$/, "");
  const endpoint = new URL(`${xapiBase}/shops/@${encodeURIComponent(shopName)}/products/${encodeURIComponent(String(productId))}/info`);
  const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Direct Selldone XAPI product detail failed with status ${response.status}.`);
  }
  return {
    ...payload,
    endpoint: { method: "GET", url: endpoint.toString() },
  };
}

function normalizeGallery(item) {
  const list = [];
  const seen = new Set();

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
      const mapped = candidate.trim();
      if (!mapped) return;
      const normalized = pickImagePath(mapped);
      if (!normalized) return;
      const key = `s:${normalized}`;
      if (seen.has(key)) return;
      seen.add(key);
      list.push(normalized);
      return;
    }
    if (typeof candidate === "object") {
      const source = firstNonNull(candidate.icon, candidate.image, candidate.path, candidate.url, candidate.filename);
      if (source) pushMedia(source);
    }
  };

  if (Array.isArray(item?.images)) item.images.forEach(pushMedia);
  pushMedia(item?.image);

  return list;
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

async function bootstrapProducts() {
  if (state.productsLoaded && state.dataSource === DATA_SOURCE.xapi) return;
  state.isLoading = true;
  state.loadError = null;
  try {
    await fetchXapiProducts();
    state.productsLoaded = true;
  } catch (error) {
    state.products = [];
    state.folders = [];
    state.categoryCards = [];
    state.dataSource = DATA_SOURCE.xapi;
    state.activeCategory = "all";
    state.loadError = `Could not load live Selldone XAPI products. ${error.message || ""}`.trim();
    state.productsLoaded = true;
    console.error("Selldone XAPI load failed:", error);
  } finally {
    state.isLoading = false;
  }
}

function parseHash() {
  const raw = window.location.hash.slice(1) || "home";
  const [pathWithAnchor, queryString = ""] = raw.split("?");
  const path = pathWithAnchor.split("#")[0] || "home";
  const [route, id] = path.split("/");
  const query = new URLSearchParams(queryString);
  return { route, id, query };
}

function setHash(route, params = {}) {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query}` : "";
  window.location.hash = `${route}${suffix}`;
}

async function route() {
  await bootstrapProducts();
  if (state.isLoading) return;

  const { route: routeName, id, query } = parseHash();
  syncRouteSearch(query);
  sanitizeActiveCategory();

  if (routeName === "shop") {
    state.activeProductId = null;
    state.activeProductGallery = [];
    renderShopPage();
  } else if (routeName === "product") {
    await renderProductPage(id);
  } else {
    state.activeProductId = null;
    state.activeProductGallery = [];
    renderHomePage();
  }

  updateNav(routeName);
  window.scrollTo({ top: 0, behavior: "auto" });
}

function updateNav(routeName) {
  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    link.classList.toggle("is-active", routeName === "shop" && link.dataset.navLink !== "events");
  });
}

function renderLiveCatalogEmptyState(title, body) {
  els.app.innerHTML = `
    <div class="page-shell">
      ${renderDataStatus()}
      <section class="section live-empty-state">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(body)}</p>
        <button class="black-button" type="button" data-retry-catalog>Retry catalog</button>
      </section>
    </div>
  `;
}

function hasProductDiscount(item) {
  return toNumber(item?.discount, 0) > 0 || (toNumber(item?.original, 0) > 0 && toNumber(item?.original, 0) > toNumber(item?.price, 0));
}

function homeDeals(products, limit, offset = 0) {
  const discounted = products.filter(hasProductDiscount);
  const source = discounted.length >= offset + 1 ? discounted : products;
  return source.slice(offset, offset + limit);
}

function homeRecommended(products, limit) {
  return [...products]
    .sort((a, b) => toNumber(b.rating, 0) - toNumber(a.rating, 0) || toNumber(b.reviews, 0) - toNumber(a.reviews, 0))
    .slice(0, limit);
}

function homeNewProducts(products, limit) {
  return [...products]
    .sort((a, b) => productTimeValue(b) - productTimeValue(a))
    .slice(0, limit);
}

function productTimeValue(item) {
  const value = Date.parse(item?.createdAt || item?.updatedAt || "");
  return Number.isFinite(value) ? value : toNumber(item?.id, 0);
}

function renderHomePage() {
  const products = getProductsForUi();
  if (!products.length) {
    renderLiveCatalogEmptyState("Selldone XAPI catalog is unavailable", "The storefront is configured to use live Selldone XAPI data only.");
    return;
  }

  const deals = homeDeals(products, 4);
  const today = homeDeals(products, 6, 4);
  const recommended = homeRecommended(products, 4);
  const newItems = homeNewProducts(products, 4);

  els.app.innerHTML = `
    <div class="page-shell">
      ${renderDataStatus()}
      <section class="promo-grid" aria-label="Featured offers">
        <article class="promo-card hot">
          <div class="promo-body">
            <span class="eyebrow">Rewards are glowing</span>
            <h1>Members save up to 20%</h1>
            <p>Fresh color, daily skin care, and easy gifts for every routine.</p>
            <a class="pill-button light" href="#shop">Shop now</a>
            <div class="promo-discs" aria-hidden="true">
              <span>diamond<br />20%</span>
              <span>platinum<br />15%</span>
              <span>member<br />10%</span>
            </div>
          </div>
        </article>
        <article class="promo-card orange">
          <img src="assets/beauty-hero.png" alt="" />
          <div class="promo-body">
            <span class="eyebrow">Only here</span>
            <h2>Worth the obsession</h2>
            <p>Beauty finds with color, glow, and staying power.</p>
            <a class="pill-button" href="#shop">Shop now</a>
          </div>
        </article>
        <article class="promo-card blue">
          <img src="assets/beauty-hero.png" alt="" />
          <div class="promo-body">
            <span class="eyebrow">Summer beauty</span>
            <h2>New arrivals, loading...</h2>
            <p>Bright skin, softer lips, easy shine.</p>
            <a class="pill-button" href="#shop?category=skincare">Shop new</a>
          </div>
        </article>
      </section>

      ${renderProductSection("Deals for you", `${deals.length} items`, deals, "product-row")}
      ${renderDealStrip("Today's deals", today)}

      <section class="section" id="events">
        <div class="event-band">
          <div class="event-lead">
            <span class="eyebrow">In-store inspiration</span>
            <h2>Come see us!</h2>
            <a class="pill-button light" href="#shop">Find a store</a>
          </div>
          ${eventTile("Bronze to bridal", "Warm color lessons for every glow.", "22% 55%")}
          ${eventTile("Beauty services", "Fresh styling, shade matching, and skin prep.", "54% 48%")}
          ${eventTile("In-store beauty event", "Meet new favorites and trending routines.", "70% 48%")}
          ${eventTile("Selfie-ready skin", "Soft glam looks with easy everyday steps.", "86% 45%")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h2>The beauty everyone wants, only here</h2>
            <p>Curated edits for color, care, fragrance, and tools.</p>
          </div>
        </div>
        <div class="feature-grid">
          ${featureCard("Pajulina Beauty Collection", "Clean color and easy everyday shine.", "12% 55%")}
          ${featureCard("DIBS Beauty", "Cool girl color for lips and cheeks.", "35% 45%")}
          ${featureCard("Live Tinted", "Skin-first makeup for warm radiance.", "58% 48%")}
          ${featureCard("isima", "Hair care made for bounce and shine.", "80% 48%")}
        </div>
      </section>

      ${renderProductSection("We think you'll like", `${recommended.length} items`, recommended, "product-row")}

      <section class="section">
        <div class="gift-banner">
          <div class="gift-copy">
            <h2>Find a gift Dad will love</h2>
            <p>Ask Pajulina AI for personalized picks, from skin care to fragrance.</p>
            <a class="text-link" href="#shop?category=gifts">Start chat</a>
          </div>
          <div class="gift-image" role="img" aria-label="Beauty gifts and cosmetics"></div>
        </div>
      </section>

      <section class="section">
        <div class="obsession-strip">
          <div class="obsession-copy">
            <h2>Worth the obsession</h2>
            <a class="text-link" href="#shop">Shop now</a>
          </div>
          ${storyCard("A routine that feels like a treat", "Skin care favorites for fresh starts.", "24% 52%")}
          ${storyCard("Most fragrant", "Easy scents for day and night.", "50% 52%")}
          ${storyCard("Detector mode", "Find color, texture, and glow in one place.", "66% 48%")}
          ${storyCard("Glow-worthy acts", "Care picks that keep skin feeling soft.", "85% 48%")}
        </div>
      </section>

      ${renderProductSection("New for you", `${newItems.length} items`, newItems, "product-row")}

      <section class="section-tight">
        <div class="coupon-band">
          <div>
            <strong>20% off your first purchase</strong>
            <span>When you sign up for Pajulina emails. Exclusions apply.</span>
          </div>
          <a class="text-link" href="#shop">See details</a>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Shop by Category</h2>
        </div>
        <div class="category-grid">
          ${getCategoryCards().map(([key, label, image]) => categoryCard(key, label, image)).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>All things Pajulina Beauty</h2>
        </div>
        <div class="magazine-row">
          ${storyCard("Pride, Amplified", "Joyful color made for every day.", "18% 52%", true)}
          ${storyCard("Apply to be a part of the 2026 Muse cohort", "Creators, artists, and beauty voices.", "42% 50%", true)}
          ${storyCard("Join the Pajulina Beauty Community today", "Tips, events, and new favorites.", "60% 50%", true)}
          ${storyCard("Give a Pajulina Beauty gift card", "The easiest gift for every routine.", "86% 45%", true)}
        </div>
      </section>
    </div>
  `;
}

function renderShopPage() {
  if (!getProductsForUi().length) {
    renderLiveCatalogEmptyState("No live products loaded", "The shop page is waiting for products from Selldone XAPI.");
    return;
  }

  const filtered = getFilteredProducts();
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
        <div class="shop-hero-image" role="img" aria-label="Pajulina beauty collection products"></div>
      </section>

      <section class="section-tight">
        <div class="editorial-row">
          ${featureCard("Glossy lips, soft cheeks", "Color that feels light and fresh.", "12% 55%")}
          ${featureCard("Beauty, assembled", "Routine-ready favorites for every bag.", "48% 50%")}
          ${featureCard("Face the summer", "SPF, tint, and glow for warm days.", "78% 48%")}
          ${featureCard("Gifts that glow", "Little luxuries, easy to love.", "88% 45%")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h1>${shopHeading()}</h1>
            <p>${filtered.length} items</p>
          </div>
        </div>
        <div class="shop-toolbar">
          ${(() => {
            const chips = [["all", "All"], ...getCategoryCards().map(([key, label]) => [key, label])];
            return `<div class="filter-bar" role="group" aria-label="Filter by category">
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
          ${filtered.map((item) => productCard(item)).join("")}
        </div>
        <div class="load-more">
          <span>You are viewing ${filtered.length} of ${productTotal()} items</span>
          <button class="black-button" type="button">Load more</button>
        </div>
      </section>
    </div>
  `;
}

async function renderProductPage(productId) {
  const id = String(productId || "").trim();
  let item = (id ? getProductById(id) : null) || (state.dataSource === DATA_SOURCE.xapi ? await fetchXapiProductDetail(id) : null);
  if (!item) {
    renderLiveCatalogEmptyState("Product is not available from Selldone XAPI", `Product ID ${id || "unknown"} was not returned by the live storefront API.`);
    return;
  }
  state.activeProductId = item.id;

  const itemPrice = toNumber(item.price, 0);
  const itemColors = Math.max(1, Math.min(12, toNumber(item.colors, 1)));
  const itemRating = toNumber(item.rating, 0);
  const itemReviews = toNumber(item.reviews, 0);
  const itemOriginal = toNumber(item.original, 0);
  const category = item.category || "misc";
  const subcategory = item.subcategory || "product";
  const description = item.description || "A polished daily essential designed for fresh color, smooth wear, and an easy beauty routine.";
  const galleryMedia = normalizeGallery(item) || [];
  state.activeProductGallery = galleryMedia.length ? galleryMedia : [item.image ?? 0];

  if (state.activeMedia === null || !state.activeProductGallery.includes(state.activeMedia)) {
    state.activeMedia = state.activeProductGallery[0];
  }

  const catalog = getProductsForUi();
  const related = catalog.filter((entry) => entry.category === category && entry.id !== item.id).slice(0, 4);
  const similar = catalog.filter((entry) => entry.subcategory === subcategory && entry.id !== item.id).slice(0, 4);
  const shadeList = shadePalette.slice(0, Math.min(Math.max(itemColors, 1), shadePalette.length));

  const catalogItem = (index, alternate = null) => catalog[index] || alternate || null;

  els.app.innerHTML = `
    <div class="page-shell">
      <nav class="breadcrumbs" aria-label="Breadcrumbs">
        <a href="#home">Home</a><span>/</span><a href="#shop">Shop</a><span>/</span><a href="#shop?category=${category}">${escapeHtml(titleCase(category))}</a><span>/</span><strong>${escapeHtml(subcategory)}</strong>
      </nav>
      <section class="product-detail-layout">
        <div class="gallery">
          <div class="gallery-main">
            ${renderProductImage(item, "large-sprite", state.activeMedia)}
            <button class="try-on" type="button">TRY IT ON</button>
          </div>
          <div class="thumb-row" aria-label="Product media">
            ${state.activeProductGallery
              .map(
                (image, index) => `
                  <button class="thumb ${state.activeMedia === image ? "is-active" : ""}" type="button" data-media-index="${index}" aria-label="View product image">
                    ${renderProductImage(item, "thumbnail-sprite", image)}
                  </button>
                `,
              )
              .join("")}
          </div>
        </div>

        <article class="product-info">
          <span class="brand">${escapeHtml(item.brand)}</span>
          <h1>${escapeHtml(item.title)}</h1>
          <div class="detail-rating">
            <span class="stars" aria-label="${itemRating} out of 5 stars">*****</span>
            <strong>${itemRating.toFixed(1)}</strong>
            <a href="#reviews">${itemReviews.toLocaleString()} reviews</a>
          </div>
          <div class="detail-price">
            ${formatPrice(itemPrice, item.currency)}
            ${itemOriginal ? `<s>${formatPrice(itemOriginal, item.currency)}</s>` : ""}
          </div>
          <p class="points-note">Earn points on this purchase as a Pajulina Rewards member.</p>

          <section class="shade-section">
            <div class="shade-head">
              <div>
                <strong>Color: ${shadeName(state.activeShade)}</strong>
                <span class="shade-count">${itemColors} shades</span>
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

          <section class="delivery-section">
            <h2 class="product-meta">Pickup and delivery options</h2>
            <div class="delivery-cards">
              <div class="delivery-card is-active"><strong>Ship</strong><span>Free on $45 orders</span></div>
              <div class="delivery-card"><strong>Pickup</strong><span>Ready in store</span></div>
              <div class="delivery-card"><strong>Same Day</strong><span>Local delivery</span></div>
            </div>
          </section>

          <div class="detail-actions">
            <button class="black-button" type="button" data-add-to-cart="${item.id}">Add to bag</button>
            <button class="favorite-button" type="button" aria-label="Add to favorites">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
              </svg>
            </button>
          </div>
          <div class="promo-box">
            Members save up to 20% on almost everything in stores and online. Use code <strong>NEWROUTINE</strong>.
          </div>

          <div class="accordion">
            ${accordionItem("Summary", description, true)}
            ${accordionItem("Details", "Buildable color, comfortable wear, and a smooth finish made for everyday routines. Size and finish vary by product.")}
            ${accordionItem("How To Use", "Apply as desired. Layer lightly for a soft finish or build for more impact.")}
            ${accordionItem("Ingredients", "Ingredient lists may vary. Please check product packaging for the most current information.")}
            ${accordionItem("Shipping & Coupon Restrictions", "Available for standard shipping, pickup, and selected offers unless marked otherwise.")}
          </div>

          <section class="bought-box">
            <h2>Frequently bought together</h2>
            ${miniProduct(item)}
            ${miniProduct(catalogItem(2))}
            ${miniProduct(catalogItem(9))}
            <button class="black-button" type="button" data-add-to-cart="${item.id}">Add set to bag</button>
          </section>

          <section class="routine-box">
            <h2>Make it a routine</h2>
            ${routineStep("Step 1", catalogItem(4))}
            ${routineStep("Step 2", item)}
            ${routineStep("Step 3", catalogItem(11))}
            <button class="black-button" type="button" data-add-to-cart="${item.id}">Add set to bag</button>
          </section>
        </article>
      </section>

      ${renderProductSection("We think you'll like", "4 items", related, "product-row")}
      ${renderProductSection("Similar items for you", "4 items", similar, "product-row")}

      <section class="reviews-block" id="reviews">
        <div class="section-head">
          <h2>Reviews</h2>
          <button class="filter-chip" type="button">Write A Review</button>
        </div>
        <div class="review-summary">
          <div>
            <div class="rating-big">${itemRating.toFixed(1)}</div>
            <div class="stars">*****</div>
            <p class="product-meta">83% recommend this product</p>
          </div>
          <div class="review-bars">
            ${reviewBar("5 stars", 72)}
            ${reviewBar("4 stars", 15)}
            ${reviewBar("3 stars", 7)}
            ${reviewBar("2 stars", 3)}
            ${reviewBar("1 star", 3)}
          </div>
        </div>
        <article class="review-card">
          <h3>Smooth finish and easy color match</h3>
          <p>This became an everyday favorite. It feels lightweight, layers well, and gives a polished finish without looking heavy.</p>
          <span class="product-meta">Verified buyer</span>
        </article>
      </section>
    </div>
  `;
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

function productCard(item, compact = false) {
  const price = toNumber(item.price, 0);
  const original = toNumber(item.original, 0);
  const rating = toNumber(item.rating, 0);
  const reviews = toNumber(item.reviews, 0);
  const colors = toNumber(item.colors, 1);
  const sale = original > 0 && original > price;
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
        <button class="add-button" type="button" data-add-to-cart="${item.id}">Add to bag</button>
      </div>
    </article>
  `;
}

function filterChip(category, label) {
  return `<button class="filter-chip ${state.activeCategory === category ? "is-active" : ""}" type="button" data-filter="${category}">${label}</button>`;
}

function getFilteredProducts() {
  let list = [...getProductsForUi()];
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
  if (state.activeSort === "price-low") list.sort((a, b) => a.price - b.price);
  if (state.activeSort === "price-high") list.sort((a, b) => b.price - a.price);
  if (state.activeSort === "rating") list.sort((a, b) => b.rating - a.rating);
  if (state.activeSort === "new") list.sort((a, b) => Number(b.badge === "New") - Number(a.badge === "New"));
  return list;
}

function shopHeading() {
  if (state.search) return `Search results for "${state.search}"`;
  if (!state.activeCategory || state.activeCategory === "all") return "Pajulina Beauty";
  return `${titleCase(state.activeCategory)} at Pajulina`;
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

function featureCard(title, body, pos) {
  return `
    <article class="feature-card">
      <div class="feature-image" style="--hero-pos:${pos}"></div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </article>
  `;
}

function storyCard(title, body, pos, tall = false) {
  return `
    <article class="story-card">
      <div class="story-image ${tall ? "tall" : ""}" style="--hero-pos:${pos}"></div>
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
    const source = pickImagePath(media) || media;
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
  return `
    <div class="mini-product">
      <div class="mini-media">${renderProductImage(item, "thumbnail-sprite")}</div>
      <div>
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.brand)}</p>
        <span class="rating"><span class="stars">*****</span>${rating.toFixed(1)}</span>
      </div>
      <strong>${formatPrice(item.price, item.currency)}</strong>
    </div>
  `;
}

function routineStep(label, item) {
  if (!item) return "";
  return `
    <div class="routine-step">
      <div class="mini-media">${renderProductImage(item, "thumbnail-sprite")}</div>
      <div>
        <span class="product-meta">${label}</span>
        <h4>${escapeHtml(item.title)}</h4>
        <p>${formatPrice(item.price, item.currency)}</p>
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

function cartEntries() {
  return Object.entries(state.cart)
    .map(([id, qty]) => ({ item: getProductById(id), qty }))
    .filter((entry) => entry.item && entry.qty > 0);
}

function addToCart(productId) {
  state.cart[productId] = (state.cart[productId] || 0) + 1;
  saveCart();
  renderCart();
  showToast("Added to bag");
}

function updateQuantity(productId, delta) {
  state.cart[productId] = Math.max(0, (state.cart[productId] || 0) + delta);
  if (state.cart[productId] === 0) delete state.cart[productId];
  saveCart();
  renderCart();
}

function renderCart() {
  const entries = cartEntries();
  const count = entries.reduce((sum, entry) => sum + entry.qty, 0);
  const subtotal = entries.reduce((sum, entry) => sum + entry.item.price * entry.qty, 0);
  els.cartCount.textContent = String(count);
  els.cartTitle.textContent = `${count} ${count === 1 ? "item" : "items"}`;
  els.cartSubtotal.textContent = formatPrice(subtotal);
  els.cartItems.innerHTML = entries.length
    ? entries
        .map(
          ({ item, qty }) => `
          <article class="cart-item">
            <div class="cart-item-media">${renderProductImage(item, "thumbnail-sprite")}</div>
            <div>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.brand)}</p>
              <strong>${formatPrice(item.price)}</strong>
            </div>
            <div class="qty-stepper">
              <button type="button" data-cart-qty="${item.id}" data-delta="-1" aria-label="Decrease quantity">-</button>
              <span>${qty}</span>
              <button type="button" data-cart-qty="${item.id}" data-delta="1" aria-label="Increase quantity">+</button>
            </div>
          </article>
        `,
        )
        .join("")
    : `<p class="cart-empty">Your bag is ready for something beautiful.</p>`;
}

function openCart() {
  els.cartDrawer.classList.add("is-open");
  els.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
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

function closeMobileMenu() {
  els.primaryLinks?.classList.remove("is-open");
}

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-to-cart]");
  if (addButton) {
    addToCart(addButton.dataset.addToCart);
    return;
  }

  const filter = event.target.closest("[data-filter]");
  if (filter) {
    state.activeCategory = filter.dataset.filter;
    setHash("shop", {
      category: state.activeCategory,
      ...(state.search ? { search: state.search } : {}),
    });
    return;
  }

  const media = event.target.closest("[data-media-index]");
  if (media) {
    const index = Number(media.dataset.mediaIndex);
    const selected = state.activeProductGallery[index];
    if (selected === undefined) return;
    state.activeMedia = selected;
    const route = parseHash();
    const activeProduct = getProductById(route.id) || getProductById(state.activeProductId);
    document.querySelectorAll("[data-media-index]").forEach((thumb) => {
      thumb.classList.toggle("is-active", thumb === media);
    });
    if (activeProduct) {
      const galleryMain = document.querySelector(".gallery-main");
      if (galleryMain) {
        galleryMain.innerHTML = `
          ${renderProductImage(activeProduct, "large-sprite", state.activeMedia)}
          <button class="try-on" type="button">TRY IT ON</button>
        `;
      }
    }
    return;
  }

  const shade = event.target.closest("[data-shade]");
  if (shade) {
    state.activeShade = Number(shade.dataset.shade);
    document.querySelectorAll("[data-shade]").forEach((dot) => dot.classList.toggle("is-active", dot === shade));
    const label = document.querySelector(".shade-head strong");
    if (label) label.textContent = `Color: ${shadeName(state.activeShade)}`;
    return;
  }

  const accordion = event.target.closest("[data-accordion-toggle]");
  if (accordion) {
    accordion.closest(".accordion-item")?.classList.toggle("is-open");
    return;
  }

  const cartQty = event.target.closest("[data-cart-qty]");
  if (cartQty) {
    updateQuantity(cartQty.dataset.cartQty, Number(cartQty.dataset.delta));
    return;
  }

  if (event.target.closest("[data-cart-open]")) {
    openCart();
    return;
  }

  if (event.target.closest("[data-cart-close]")) {
    closeCart();
    return;
  }

  if (event.target.closest("[data-menu-toggle]")) {
    els.primaryLinks?.classList.toggle("is-open");
    return;
  }

  if (event.target.closest("[data-retry-catalog]")) {
    state.productsLoaded = false;
    state.loadError = null;
    route();
    return;
  }
});

document.addEventListener("change", (event) => {
  const sort = event.target.closest("[data-sort-select]");
  if (!sort) return;
  state.activeSort = sort.value;
  renderShopPage();
});

document.querySelector("[data-search-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  state.search = new FormData(event.currentTarget).get("q")?.toString().trim() || "";
  setHash("shop", {
    ...(state.activeCategory && state.activeCategory !== "all" ? { category: state.activeCategory } : {}),
    ...(state.search ? { search: state.search } : {}),
  });
});

document.querySelector("[data-newsletter-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  event.currentTarget.reset();
  showToast("Thanks for signing up");
});

window.addEventListener("hashchange", route);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCart();
    closeMobileMenu();
  }
});

renderCart();
route();
