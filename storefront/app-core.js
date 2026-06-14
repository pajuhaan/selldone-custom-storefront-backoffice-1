import { selldoneImagePathToUrl } from "/dashboard/features/selldone-images.js";

const SPRITE_COLUMNS = 4;
const SPRITE_ROWS = 4;
const CART_KEY = "pajulina_storefront_cart_v1";
const STOREFRONT_ACCESS_TOKEN_KEY = "pajulina_storefront_access_token";
const STOREFRONT_TOKEN_EXPIRES_AT_KEY = "pajulina_storefront_access_token_expires_at";
const DATA_SOURCE = {
  xapi: "xapi",
};
const XAPI_PRODUCT_LIMIT = 200;

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
  checkoutSubmitting: false,
  xapiEndpoint: null,
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
  searchInput: document.querySelector("[data-site-search]"),
  primaryLinks: document.querySelector("[data-primary-links]"),
  accountButton: document.querySelector("[data-account-button]"),
  accountControl: document.querySelector("[data-account-control]"),
  accountMenu: document.querySelector("[data-account-menu]"),
  cartCheckoutButton: document.querySelector("[data-cart-checkout]"),
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
    return pickImagePath(trimmed, { scope: "products", shopId }) || trimmed;
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
  const mappedVariants = normalizeProductVariants(firstArray(raw.variants, raw.product_variants, raw.productVariants), raw);
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
    files: Array.isArray(raw.files) ? raw.files : [],
    file: raw.file,
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
    variants: mappedVariants,
    folder: categorySource,
  };
}

function normalizeProductVariants(rawVariants = [], rawProduct = null) {
  const productId = String(firstNonNull(rawProduct?.id, rawProduct?.product_id, rawProduct?.code, "product"));
  const list = Array.isArray(rawVariants) ? rawVariants : [];
  return list
    .map((rawVariant, index) => {
      if (!rawVariant || typeof rawVariant !== "object") return null;
      const variant = { ...rawVariant };
      const variantId = firstNonNull(variant.id, variant.variant_id, variant.sku, variant.code, variant.name, variant.title);
      const key = String(firstNonNull(variantId, `${productId}-${index}`)).trim();
      const color = firstNonNull(variant.color, variant.colour, variant.hex, variant.color_code, variant.colour_code, variant.swatch_color);
      return {
        ...variant,
        __index: index,
        __key: `${productId}:${key}`,
        __swatchColor: color ? String(color).trim() : "",
      };
    })
    .filter(Boolean);
}

function getItemVariants(item) {
  return Array.isArray(item?.variants) ? item.variants : [];
}

function activeProductVariant(item) {
  const productId = String(item?.id || "").trim();
  const variants = getItemVariants(item);
  if (!variants.length) return null;

  const selected = productId ? state.activeProductVariantSelections[productId] : "";
  if (selected) {
    const byKey = variants.find((variant) => String(variant.__key) === String(selected).trim());
    if (byKey) return byKey;

    const byIndex = Number(selected);
    if (Number.isInteger(byIndex) && variants[byIndex]) {
      return variants[byIndex];
    }
  }

  return variants[0] || null;
}

function setActiveProductVariantSelection(productId, variant) {
  const id = String(productId || "").trim();
  if (!id || !variant || typeof variant !== "object") {
    if (id) delete state.activeProductVariantSelections[id];
    return;
  }

  const key = firstNonNull(
    variant.__key,
    variant.__index,
    variant.id,
    variant.variant_id,
    variant.sku,
    variant.code,
    variant.name,
    variant.title,
  );
  if (!key) return;
  state.activeProductVariantSelections[id] = String(key);
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
  const activeKey = String(selectedVariant?.__key || selectedVariant?.__index || "").trim();
  const heading = selectedVariant ? variantLabel(selectedVariant, selectedVariant?.__index || 0) : "Choose variant";

  return `
    <section class="shade-section">
      <div class="shade-head">
        <div>
          <strong>Variant: ${escapeHtml(heading)}</strong>
          <span class="shade-count">${variants.length} ${variants.length === 1 ? "variant" : "variants"}</span>
        </div>
      </div>
      <div class="shade-grid" role="group" aria-label="Select variant">
        ${variants
          .map((variant) => {
            const key = String(
              firstNonNull(
                variant.__key,
                variant.__index,
                variant.id,
                variant.variant_id,
                variant.sku,
                variant.code,
              ) || "",
            );
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
    </section>
  `;
}

function renderProductImage(item, className = "product-sprite", media = null) {
  const target = media == null ? item?.image : media;
  const source = normalizeImageCandidate(target, { shopId: item?.shopId }) || (media == null ? item?.image : media);
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
  return firstArray(
    payload?.products,
    payload?.data?.products,
    payload?.data?.data?.products,
    payload?.result?.products,
    payload?.result?.data?.products,
    payload?.payload?.products,
    payload?.payload?.data?.products,
    payload?.payload?.result?.products,
    payload?.data?.payload?.products,
    payload?.items,
    payload?.data?.items,
    payload?.result?.items,
    payload?.payload?.items,
    payload?.payload?.data?.items,
    payload?.result?.data?.items,
    payload?.data,
  );
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
    } else {
      const expiresAt = Number(payload?.tokenExpiresAt || 0);
      const hasValidAuthToken = Number.isFinite(expiresAt) && expiresAt > Date.now();

      state.sessionAuthenticated = Boolean(payload.authenticated) && hasValidAuthToken;
      state.sessionUser = payload.user && typeof payload.user === "object" ? payload.user : {};
      persistStorefrontSessionTokens({
        accessToken: payload.accessToken,
        tokenExpiresAt: payload.tokenExpiresAt,
      });

      if (!state.sessionAuthenticated) {
        clearStorefrontSessionTokens();
        state.sessionUser = {};
        state.accountMenuOpen = false;
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
    return `/api/profile/avatar?id=${avatarId}&size=${encodeURIComponent(size === "big" ? "big" : "small")}`;
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

function buildAccountLoginUrl(returnRoute = "") {
  const loginUrl = state.sessionLoginUrl || "/auth/storefront/start";
  const loginReturnRoute = storefrontReturnRoute(returnRoute);
  try {
    const target = new URL(loginUrl, window.location.origin);
    target.searchParams.set("next", loginReturnRoute);
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return `${loginUrl}${loginUrl.includes("?") ? "&" : "?"}next=${encodeURIComponent(loginReturnRoute)}`;
  }
}

function buildAccountLogoutUrl() {
  const returnRoute = `${window.location.pathname}${window.location.search || ""}${window.location.hash || ""}`;
  try {
    const target = new URL("/auth/storefront/logout", window.location.origin);
    target.searchParams.set("next", returnRoute);
    return `${target.pathname}${target.search}`;
  } catch {
    return `/auth/storefront/logout?next=${encodeURIComponent(returnRoute)}`;
  }
}

function renderAccountMenu() {
  if (!els.accountMenu) return;
  const user = state.sessionUser || {};
  const name = userDisplayName(user);
  if (!state.sessionAuthenticated) {
    els.accountMenu.innerHTML = `
      <div class="account-menu-user">
        <div class="account-menu-avatar" aria-hidden="true">?</div>
        <div class="account-menu-meta">
          <strong>Guest</strong>
          <p>Log in to see your profile</p>
        </div>
      </div>
      <div class="account-menu-links">
        <button class="black-button account-menu-login" type="button" data-account-menu-login>Log in</button>
      </div>
    `;
    return;
  }

  const avatar = resolveUserAvatarUrl(user, "big");
  const contact = firstNonNull(user?.email, user?.phone, user?.username, "");
  els.accountMenu.innerHTML = `
    <div class="account-menu-user">
      <div class="account-menu-avatar" aria-hidden="true">
        ${
          avatar
            ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name || "Profile")} avatar" />`
            : `<span>${escapeHtml(userInitials(user))}</span>`
        }
      </div>
      <div class="account-menu-meta">
        <strong>${escapeHtml(name || "Selldone user")}</strong>
        ${contact ? `<p>${escapeHtml(contact)}</p>` : ""}
      </div>
    </div>
    <div class="account-menu-links">
      <a class="text-link" href="#account/profile" data-account-menu-profile>Profile</a>
      <a class="black-button" href="${buildAccountLogoutUrl()}">Log out</a>
    </div>
  `;
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

function getCheckoutTransportations() {
  return state.shopTransportationsLoaded ? state.shopTransportations : [];
}

function resolveCheckoutTransport(transportations, selectedKey) {
  const normalized = normalizeShopTransportations(transportations);
  if (!normalized.length) return null;

  const selected = pickTransportByKey(normalized, selectedKey);
  if (selected) return selected;
  return normalized[0];
}

function currentCheckoutShippingKey(transportations = []) {
  const normalized = normalizeShopTransportations(transportations);
  if (!state.activeCheckoutShippingKey && normalized.length) {
    state.activeCheckoutShippingKey = transportSelectionKey(normalized[0], "checkout-default");
  }

  return state.activeCheckoutShippingKey || (normalized[0] ? transportSelectionKey(normalized[0], "checkout-default") : "shipping-default");
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
  const parts = String(path || "home")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part.length);
  const route = parts[0] || "home";
  const id = parts[1] || "";
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
  await fetchSessionStatus();
  updateAccountButton();
  closeAccountMenu();

  const { route: routeName, id, query } = parseHash();
  syncRouteSearch(query);
  sanitizeActiveCategory();

  if (routeName === "shop") {
    state.activeProductId = null;
    state.activeProductGallery = [];
    renderShopPage();
  } else if (routeName === "product") {
    const productId = String(id || state.activeProductId || "").trim();
    if (!productId) {
      state.activeProductId = null;
      state.activeProductGallery = [];
      setHash("shop");
      return;
    }
    await renderProductPage(productId);
  } else if (routeName === "checkout") {
    await renderCheckoutPage();
  } else if (routeName === "account") {
    await renderAccountProfilePage();
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

function productMerchText(item) {
  const folder = item?.folder || {};
  const categories = Array.isArray(item?.categories)
    ? item.categories.map((category) => [category?.name, category?.title, category?.slug, category?.category_name].filter(Boolean).join(" ")).join(" ")
    : "";
  return [
    item?.brand,
    item?.key,
    item?.label,
    item?.title,
    item?.category,
    item?.subcategory,
    item?.description,
    item?.sku,
    folder?.name,
    folder?.title,
    folder?.slug,
    folder?.category_name,
    categories,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function productMerchPriority(item) {
  const text = productMerchText(item);
  const isEye = /\b(eye|eyes|eyeliner|mascara|brow|eyebrow|eyelash|lashes|shadow|eyeshadow|undereye|under-eye|kohl|liner)\b|چشم|ابرو|مژه/i.test(text);
  const isTube = /\b(tube|tubed|squeeze|cream tube|gel tube|lotion tube)\b|تیوب/i.test(text);
  const isSkin =
    /\b(skin|skincare|skin-care|face|facial|cream|creme|moisturizer|moisturiser|serum|sunscreen|spf|cleanser|toner|mask|balm|lotion|hydrating|hydrate|anti-aging|antiage|dermal|derma|jar|pot|tub)\b|پوست|کرم|آبرسان|مرطوب/i.test(
      text,
    );

  if (isSkin && !isTube && !isEye) return 0;
  if (isSkin && isTube && !isEye) return 1;
  if (isEye) return 3;
  return 2;
}

function sortByMerchPriority(products) {
  return [...products].sort(
    (a, b) =>
      productMerchPriority(a) - productMerchPriority(b) ||
      Number(hasProductDiscount(b)) - Number(hasProductDiscount(a)) ||
      toNumber(b.rating, 0) - toNumber(a.rating, 0) ||
      productTimeValue(b) - productTimeValue(a),
  );
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

function productTimeValue(item) {
  const value = Date.parse(item?.createdAt || item?.updatedAt || "");
  return Number.isFinite(value) ? value : toNumber(item?.id, 0);
}

function renderHeroCarousel() {
  const total = heroSlides.length;
  const activeIndex = ((state.activeHeroSlide % total) + total) % total;
  const trackOffset = activeIndex * 100;

  return `
    <section class="hero-carousel" aria-label="Cosmetic shop highlights" data-hero-carousel>
      <div class="hero-carousel-track" data-hero-track style="transform: translateX(-${trackOffset}%);">
        ${heroSlides
          .map(
            (slide, index) => `
              <article
                class="hero-slide ${index === activeIndex ? "is-active" : ""}"
                style="--hero-image:url('${slide.image}');--hero-pos:${slide.position};--hero-accent:${slide.accent};"
                aria-hidden="${index === activeIndex ? "false" : "true"}"
              >
                <div class="hero-copy">
                  <span class="eyebrow">${escapeHtml(slide.eyebrow)}</span>
                  <h1>${escapeHtml(slide.title)}</h1>
                  <p>${escapeHtml(slide.body)}</p>
                  <a class="pill-button" href="${escapeHtml(slide.href)}">${escapeHtml(slide.cta)}</a>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
      <div class="hero-controls" aria-label="Hero carousel controls">
        <button class="hero-arrow" type="button" data-hero-step="-1" aria-label="Previous hero slide">&lsaquo;</button>
        <div class="hero-dots" role="tablist" aria-label="Hero slides">
          ${heroSlides
            .map(
              (slide, index) => `
                <button
                  class="hero-dot ${index === activeIndex ? "is-active" : ""}"
                  type="button"
                  data-hero-slide="${index}"
                  role="tab"
                  aria-label="${escapeHtml(slide.eyebrow)}"
                  aria-selected="${index === activeIndex ? "true" : "false"}"
                ></button>
              `,
            )
            .join("")}
        </div>
        <button class="hero-arrow" type="button" data-hero-step="1" aria-label="Next hero slide">&rsaquo;</button>
      </div>
    </section>
  `;
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
      ${renderHeroCarousel()}
      <section class="promo-grid" aria-label="Featured offers">
        <article class="promo-card hot">
          <div class="promo-body">
            <span class="eyebrow">Rewards are glowing</span>
            <h1>Members save up to 20%</h1>
            <p>Fresh color, daily skin care, and easy gifts for every routine.</p>
            <a class="pill-button light" href="#shop?discount=1">Shop discounts</a>
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
  const id = String(productId || "").trim() || String(state.activeProductId || "").trim();
  const cachedProduct = id ? getProductById(id) : null;
  let item = cachedProduct;

  if (state.dataSource === DATA_SOURCE.xapi && id) {
    const needsDetail = !cachedProduct || !Array.isArray(cachedProduct.images) || cachedProduct.images.length <= 1;
    if (needsDetail) {
      const detail = await fetchXapiProductDetail(id);
      if (detail) {
        item = detail;
      }
    }
  }

  if (!item) {
    item = state.dataSource === DATA_SOURCE.xapi ? await fetchXapiProductDetail(id) : null;
  }

  if (!item) {
    renderLiveCatalogEmptyState("Product is not available from Selldone XAPI", `Product ID ${id || "unknown"} was not returned by the live storefront API.`);
    return;
  }
  state.activeProductId = item.id;
  const transportations = await ensureShopTransportationsLoaded();
  const productTransportSelection = firstNonNull(state.activeProductShippingSelection[item.id], transportSelectionKey(transportations?.[0], "shipping"));
  if (productTransportSelection && !transportationSelectionExists(transportations, productTransportSelection)) {
    state.activeProductShippingSelection[item.id] = "";
  }
  state.activeProductShippingSelection[item.id] =
    state.activeProductShippingSelection[item.id] || (transportations.length ? transportSelectionKey(transportations[0], "shipping") : "shipping-default");
  const deliveryCards = renderDeliveryCards(transportations, {
    selectedKey: state.activeProductShippingSelection[item.id],
    productId: item.id,
    context: "product",
  });

  const selectedVariant = activeProductVariant(item);
  const itemPrice = resolveVariantPrice(selectedVariant, toNumber(item.price, 0));
  const itemOriginal = resolveVariantOriginalPrice(selectedVariant, itemPrice, toNumber(item.original, 0));
  const addButtonVariantKey = firstNonNull(
    selectedVariant?.__key,
    selectedVariant?.__index,
    selectedVariant?.id,
    selectedVariant?.variant_id,
    selectedVariant?.sku,
    selectedVariant?.code,
  ) || "";
  const itemRating = toNumber(item.rating, 0);
  const itemReviews = toNumber(item.reviews, 0);
  const category = item.category || "misc";
  const subcategory = item.subcategory || "product";
  const description = item.description || "A polished daily essential designed for fresh color, smooth wear, and an easy beauty routine.";
  const galleryMedia = normalizeGallery(item, selectedVariant) || [];
  const variantSection = renderVariantSection(item);
  state.activeProductGallery = galleryMedia.length ? galleryMedia : [item.image ?? 0];

  if (state.activeMedia === null || !state.activeProductGallery.includes(state.activeMedia)) {
    state.activeMedia = state.activeProductGallery[0];
  }

  const catalog = getProductsForUi();
  const related = catalog.filter((entry) => entry.category === category && entry.id !== item.id).slice(0, 4);
  const similar = catalog.filter((entry) => entry.subcategory === subcategory && entry.id !== item.id).slice(0, 4);

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
          ${variantSection}

          <section class="delivery-section">
            <h2 class="product-meta">Pickup and delivery options</h2>
            ${deliveryCards}
          </section>

          <div class="detail-actions">
            <button class="black-button" type="button" data-add-to-cart-product="${item.id}" data-variant-key="${escapeHtml(addButtonVariantKey)}">Add to bag</button>
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
            <button class="black-button" type="button" data-add-to-cart-product="${item.id}" data-variant-key="${escapeHtml(addButtonVariantKey)}">Add set to bag</button>
          </section>

          <section class="routine-box">
            <h2>Make it a routine</h2>
            ${routineStep("Step 1", catalogItem(4))}
            ${routineStep("Step 2", item)}
            ${routineStep("Step 3", catalogItem(11))}
            <button class="black-button" type="button" data-add-to-cart-product="${item.id}" data-variant-key="${escapeHtml(addButtonVariantKey)}">Add set to bag</button>
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

function checkoutLineItem(entry) {
  const selectedVariant = entry.variant;
  const variantText = selectedVariant ? variantLabel(selectedVariant, selectedVariant.__index || 0) : "";
  const linePrice = formatPrice(entry.linePrice, entry.item.currency);
  const totalPrice = formatPrice(entry.linePrice * entry.qty, entry.item.currency);
  return `
    <article class="checkout-line-item">
      <div class="checkout-line-media">${renderProductImage(entry.item, "thumbnail-sprite", entry.item.image)}</div>
      <div>
        <h4>${escapeHtml(entry.item.title)}</h4>
        ${variantText ? `<p class="product-meta">${escapeHtml(variantText)}</p>` : ""}
        <p class="product-meta">x${entry.qty}</p>
      </div>
      <div class="checkout-line-pricing">
        <span>${linePrice}</span>
        <strong>${totalPrice}</strong>
      </div>
    </article>
  `;
}

async function renderAccountProfilePage() {
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

  const user = state.sessionUser || {};
  const name = userDisplayName(user) || "Selldone user";
  const email = user.email || "Not provided";
  const phone = user.phone || "Not provided";
  const username = user.username || "Not provided";
  const address = firstNonNull(user.address, "Not provided");
  const city = firstNonNull(user.city, "Not provided");
  const id = Number(user.id || 0);
  const avatar = resolveUserAvatarUrl(user, "big");

  els.app.innerHTML = `
    <div class="page-shell">
      <nav class="breadcrumbs" aria-label="Account path">
        <a href="#home">Home</a><span>/</span><strong>Account</strong>
      </nav>
      <section class="section">
        <div class="account-profile-panel">
          <div class="account-profile-head">
            <div class="account-menu-avatar account-menu-avatar--large" aria-hidden="true">
              ${avatar ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)} avatar" />` : `<span>${escapeHtml(userInitials(user))}</span>`}
            </div>
            <div>
              <h1>${escapeHtml(name)}</h1>
              <p class="product-meta">Profile overview</p>
            </div>
          </div>
          <div class="account-profile-fields">
            <div class="account-profile-field"><span>Email</span><strong>${escapeHtml(email)}</strong></div>
            <div class="account-profile-field"><span>Phone</span><strong>${escapeHtml(phone)}</strong></div>
            <div class="account-profile-field"><span>Username</span><strong>${escapeHtml(username)}</strong></div>
            <div class="account-profile-field"><span>City</span><strong>${escapeHtml(city)}</strong></div>
            <div class="account-profile-field"><span>Address</span><strong>${escapeHtml(address)}</strong></div>
            <div class="account-profile-field"><span>Profile ID</span><strong>${id || "Not available"}</strong></div>
          </div>
          <div class="account-profile-actions">
            <a class="black-button" href="${buildAccountLogoutUrl()}">Log out</a>
            <a class="text-link" href="#shop">Back to shop</a>
          </div>
        </div>
      </section>
    </div>
  `;
}

async function renderCheckoutPage() {
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
  const shippingCost = Number.isFinite(cartTotals.shipping) ? cartTotals.shipping : calculateTransportCost(selectedTransport, subtotal);
  const shippingLabel = selectedTransport ? transportDescription(selectedTransport) : "Delivery";
  const total = Number.isFinite(cartTotals.total) ? cartTotals.total : subtotal + shippingCost;
  const cartCurrency = cartTotals.currency || currency;
  const customer = state.sessionUser || {};
  const customerName = userDisplayName(customer);

  const formAction = state.sessionAuthenticated ? "Place order" : "Log in to place order";

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
                <label>
                  <span>Address</span>
                  <textarea name="address" required rows="3" placeholder="Street, building, neighborhood">${escapeHtml(customer.address || "")}</textarea>
                </label>
                <label>
                  <span>City</span>
                  <input type="text" name="city" required value="${escapeHtml(customer.city || "")}" placeholder="City" />
                </label>
                <label>
                  <span>Note</span>
                  <textarea name="note" rows="3" placeholder="Delivery note (optional)"></textarea>
                </label>
                <button
                  class="black-button"
                  type="submit"
                  data-checkout-submit
                  data-checkout-state="${state.sessionAuthenticated ? "enabled" : "locked"}"
                  ${state.sessionAuthenticated ? "" : "disabled"}
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
              <div><span>Subtotal</span><strong>${formatPrice(subtotal, cartCurrency || currency)}</strong></div>
              <div><span>Shipping</span><strong>${formatPrice(shippingCost, currency)} (${escapeHtml(shippingLabel)})</strong></div>
              <div class="checkout-summary-total-final"><span>Total</span><strong>${formatPrice(total, cartCurrency || currency)}</strong></div>
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
  const shippingCost = Number.isFinite(cartTotals.shipping) ? cartTotals.shipping : calculateTransportCost(selectedTransport, subtotal);
  const currency = cartTotals.currency || formatOrderCurrency(entries);
  const total = Number.isFinite(cartTotals.total) ? cartTotals.total : subtotal + shippingCost;
  const formData = Object.fromEntries(new FormData(form));

  const payload = {
    sessionAuthenticated: state.sessionAuthenticated,
    customer: {
      fullName: String(formData.fullName || "").trim(),
      phone: String(formData.phone || "").trim(),
      email: String(formData.email || "").trim(),
      address: String(formData.address || "").trim(),
      city: String(formData.city || "").trim(),
      note: String(formData.note || "").trim(),
    },
    totals: {
      subtotal: Number(subtotal.toFixed(2)),
      shipping: Number(shippingCost.toFixed(2)),
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
  submitButton && (submitButton.textContent = "Placing order...");

  try {
    const response = await fetch("/api/storefront/orders", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!response || !response.ok) {
      const requestPayload = JSON.stringify(payload);
      console.info("Checkout payload (debug):", requestPayload);
      throw new Error("Checkout API not available.");
    }

    const result = await response.json().catch(() => ({}));
    const orderId = result.orderId || result.order_id || `PJ-${Date.now()}`;
    showToast(`Order ${orderId} placed successfully`);
    state.cart = {};
    state.cartSummary = null;
    saveCart();
    renderCart();
    state.checkoutSubmitting = false;
    state.activeCheckoutShippingKey = "";
    renderLiveCatalogEmptyState("Order placed", `Your order ${orderId} has been received. Thank you for shopping with Pajulina.`);
    setTimeout(() => setHash("shop"), 1000);
  } catch {
    state.checkoutSubmitting = false;
    if (submitButton) {
      submitButton.removeAttribute("disabled");
      submitButton.textContent = "Place order";
    }
    showToast("Checkout service is not available right now. Please try again shortly.");
    state.cart = state.cart || {};
    state.cartSummary = null;
    saveCart();
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

function persistStorefrontSessionTokens(payload = {}) {
  const token = firstNonNull(payload?.accessToken, "");
  const expiresAt = Number(payload?.tokenExpiresAt || 0);

  if (token && Number.isFinite(expiresAt) && expiresAt > 0) {
    localStorage.setItem(STOREFRONT_ACCESS_TOKEN_KEY, token);
    localStorage.setItem(STOREFRONT_TOKEN_EXPIRES_AT_KEY, String(expiresAt));
    return;
  }

  localStorage.removeItem(STOREFRONT_ACCESS_TOKEN_KEY);
  localStorage.removeItem(STOREFRONT_TOKEN_EXPIRES_AT_KEY);
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

  return activeProductVariant(item) || candidates[0]?.variant || null;
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
  return { variant: null, matched: false };
}

function resolveStorefrontVariantId(variant = null) {
  if (!variant || typeof variant !== "object") return null;

  const candidate = firstNonNull(
    variant.variant_id,
    variant.id,
    variant.product_variant_id,
    variant.productVariantId,
    variant.variantId,
  );
  const text = String(candidate || "").trim();
  if (!/^(?:[1-9]\d*)$/.test(text)) return null;

  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function resolveCartLineVariantForStorefront(item, variantKey = "") {
  const rawItem = item && typeof item === "object" ? item : null;
  if (!rawItem) return { item: null, selected: null, variantId: null };

  const normalizedKey = String(variantKey || "").trim();
  const rawKeyMatch = resolveCartLineVariantMatch(rawItem, normalizedKey);
  let selected = cartLineVariant(rawItem, variantKey);
  let variantId = resolveStorefrontVariantId(selected);
  let keyMatched = normalizedKey ? rawKeyMatch.matched : true;

  if (!variantId && rawItem?.id && state.dataSource === DATA_SOURCE.xapi) {
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

function syncCartFromBasketPayload(payload = {}) {
  const basket = payload && typeof payload === "object" ? payload : null;
  const entries = firstArrayValue(
    basket?.items,
    basket?.lines,
    basket?.basket_items,
    basket?.data?.items,
    basket?.result?.items,
  );

  const nextCart = {};
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
    const variantKey = variantKeyFromBasketLine(line, item);
    const key = cartLineKey(String(productId), variantKey);
    if (!key) return;
    nextCart[key] = qty;
  });

  state.cart = nextCart;
  state.cartSummary = basket?.bill && typeof basket.bill === "object" ? basket.bill : null;
}

function syncCartSummary(payload = null) {
  if (payload && typeof payload === "object") {
    state.cartSummary = payload;
    return;
  }
  state.cartSummary = null;
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
  if (!payload || typeof payload !== "object") {
    return status ? `Selldone cart API error (${status}).` : "Could not add item to Selldone cart.";
  }

  const candidates = [
    payload?.error_msg,
    payload?.message,
    payload?.error,
    payload?.error_message,
    payload?.reason,
    payload?.details,
    payload?.payload?.error_msg,
    payload?.payload?.message,
    payload?.payload?.error,
    payload?.payload?.error_message,
    payload?.payload?.reason,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.join(", ");
    }
    if (candidate && typeof candidate === "object" && candidate !== payload) {
      const nested = extractStorefrontErrorMessage(candidate);
      if (nested) return nested;
    }
    if (candidate != null) {
      const text = String(candidate).trim();
      if (text) return text;
    }
  }

  return status ? `Selldone cart API error (${status}).` : "Could not add item to Selldone cart.";
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
  if (!payload || typeof payload !== "object") return status >= 400;

  const directFlags = [
    payload?.ok,
    payload?.success,
    payload?.valid,
    payload?.error,
    payload?.error_msg,
    payload?.error_message,
    payload?.error_description,
    payload?.reason,
    payload?.message,
    payload?.details,
  ];

  for (const flag of directFlags) {
    if (flag === false) return true;
    if (typeof flag === "string" && flag.trim()) return isLikelyStorefrontErrorMessage(flag);
    if (Array.isArray(flag)) {
      if (!flag.length) continue;
      const hasErrorEntry = flag.some((entry) => {
        if (typeof entry === "string") return isLikelyStorefrontErrorMessage(entry);
        if (entry && typeof entry === "object") return hasStorefrontBasketError(entry, 0);
        return Boolean(entry);
      });
      if (hasErrorEntry) return true;
      continue;
    }
    if (flag && typeof flag === "object") {
      if (hasStorefrontBasketError(flag, 0)) return true;
    }
  }

  if (Array.isArray(payload?.errors) && payload.errors.length) return true;

  if (payload?.payload && typeof payload.payload === "object") {
    return hasStorefrontBasketError(payload.payload, 0);
  }

  return false;
}

function cartTotalsSummary(entries = []) {
  const localSubtotal = entries.reduce((sum, entry) => sum + entry.linePrice * entry.qty, 0);
  const localCurrency = firstNonNull(entries[0]?.item?.currency, "$");
  const summary = state.cartSummary && typeof state.cartSummary === "object" ? state.cartSummary : null;
  const summarySubtotal = summary ? pickNumeric(summary, ["subtotal", "sub_total", "items_total", "total_items", "itemsCost"], localSubtotal) : localSubtotal;
  const summaryTotal = summary ? pickNumeric(summary, ["total", "final_total", "grand_total", "payable"], NaN) : NaN;
  const currency = firstNonNull(summary?.currency, summary?.currency_code, localCurrency);
  const shipping = summary ? pickNumeric(summary, ["shipping", "shipping_cost", "delivery_cost", "delivery", "shipping_price"], NaN) : NaN;
  return {
    subtotal: summarySubtotal,
    total: summaryTotal,
    currency,
    shipping,
    hasSummary: Boolean(summary),
  };
}

function cartEntries() {
  return Object.entries(state.cart)
    .map(([rawKey, qty]) => {
      const { productId, variantKey } = parseCartLineKey(rawKey);
      const item = getProductById(productId);
      if (!item || !qty || qty <= 0) return null;

      const variant = cartLineVariant(item, variantKey);
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

function addToCart(productId, variantKey = "") {
  return addToCartAsync(productId, variantKey);
}

async function addToCartAsync(productId, variantKey = "") {
  let itemId = String(productId || "").trim();
  if (!itemId) {
    itemId = String(state.activeProductId || "").trim();
  }
  if (!itemId) {
    showToast("Product ID unknown.");
    return;
  }

  let item = getProductById(itemId);
  if (!item && state.dataSource === DATA_SOURCE.xapi) {
    item = await fetchXapiProductDetail(itemId);
  }
  if (!item) {
    showToast("Product is not available.");
    return;
  }
  const resolvedVariant = await resolveCartLineVariantForStorefront(item, variantKey);
  item = resolvedVariant.item || item;
  const selected = resolvedVariant.selected;
  const selectedVariantId = resolvedVariant.variantId;
  const keyMatched = resolvedVariant.keyMatched !== false;

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
  if (!lineKey) return;

  if (!keyMatched && getItemVariants(item).length > 1) {
    showToast("This selected variant is no longer available. Please reselect an option.");
    return;
  }

  if (selected && !selectedVariantId && getItemVariants(item).length > 1) {
    showToast("This selected variant is not valid anymore. Please reselect an option.");
    return;
  }

  if (!state.sessionAuthenticated) {
    await fetchSessionStatus(true);
    if (!state.sessionAuthenticated) {
      showToast("Please log in before adding to cart.");
      return;
    }
  }

  const requestBody = {
    count: 1,
    currency: firstNonNull(item.currency, "$"),
    ...(selectedVariantId ? { variant_id: selectedVariantId } : {}),
  };

  try {
    const response = await fetch(`/api/storefront/basket/${encodeURIComponent(String(item.id))}`, {
      method: "PUT",
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
    const authErrorHint = /please log|login first|not authorized|unauthor|token|authorization|session/i.test(errorMessage);

    if (hasError) {
      if (response.status === 401 || response.status === 403 || authErrorHint) {
        clearStorefrontSessionState();
        updateAccountButton();
      }
      showToast(errorMessage);
      return;
    }

    if (basket) {
      syncCartFromBasketPayload(basket);
      syncCartSummary(bill);
    } else {
      state.cart[lineKey] = (state.cart[lineKey] || 0) + 1;
      if (bill) {
        syncCartSummary(bill);
      } else {
        state.cartSummary = null;
      }
    }

    if (selected) {
      setActiveProductVariantSelection(item.id, selected);
    }

    saveCart();
    renderCart();
    openCart();
    showToast("Added to bag");
    return;
  } catch {
    showToast("Failed to add to cart. Please try again.");
  }
}

function updateQuantity(lineKey, delta) {
  const key = String(lineKey || "").trim();
  if (!key) return;
  state.cart[key] = Math.max(0, (state.cart[key] || 0) + delta);
  if (state.cart[key] === 0) delete state.cart[key];
  state.cartSummary = null;
  saveCart();
  renderCart();
}

function renderCart() {
  const entries = cartEntries();
  const count = entries.reduce((sum, entry) => sum + entry.qty, 0);
  const totals = cartTotalsSummary(entries);
  els.cartCount.textContent = String(count);
  els.cartTitle.textContent = `${count} ${count === 1 ? "item" : "items"}`;
  els.cartSubtotal.textContent = formatPrice(totals.subtotal, totals.currency || "$");
  els.cartItems.innerHTML = entries.length
    ? entries
        .map(
          ({ lineKey, item, qty, variant, linePrice }) => `
          <article class="cart-item">
            <div class="cart-item-media">${
              (() => {
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
                return renderProductImage(item, "thumbnail-sprite", activeMedia);
              })()
            }</div>
            <div>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.brand)}</p>
              ${variant ? `<span class="product-meta">${escapeHtml(variantLabel(variant, variant.__index || 0))}</span>` : ""}
              <strong>${formatPrice(linePrice, item.currency)}</strong>
            </div>
            <div class="qty-stepper">
              <button type="button" data-cart-key="${escapeHtml(lineKey)}" data-delta="-1" aria-label="Decrease quantity">-</button>
              <span>${qty}</span>
              <button type="button" data-cart-key="${escapeHtml(lineKey)}" data-delta="1" aria-label="Increase quantity">+</button>
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

function navigateToAccount(returnRoute = "") {
  if (state.sessionAuthenticated) {
    setHash("account");
    return;
  }
  window.location.assign(buildAccountLoginUrl(returnRoute));
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
  closeMobileMenu,
  fetchSessionStatus,
  firstNonNull,
  getItemVariants,
  getProductById,
  handleCheckoutSubmit,
  navigateToAccount,
  openCart,
  parseHash,
  renderCart,
  renderCheckoutPage,
  renderProductImage,
  renderProductPage,
  renderShopPage,
  route,
  setActiveProductVariantSelection,
  setHash,
  setHeroSlide,
  shadeName,
  showToast,
  updateAccountButton,
  updateQuantity,
  toggleAccountMenu,
  normalizeGallery,
};
