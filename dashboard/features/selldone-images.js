const SELLDONE_CDN_ORIGIN = "https://cdn.selldone.com";
const SELLDONE_APP_CDN_BASE = `${SELLDONE_CDN_ORIGIN}/app`;
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i;
const GLOBAL_ASSET_PREFIX_RE = /^(payments?|gateways?|gateway|icons?|logos?|brands?|badges?|assets?)\//i;
const SHOP_SCOPES_RE = /^(products|categories|articles|pages|folders|vendors|logos|baskets|users|gateways)\//i;

const DEFAULT_IMAGE_KEYS = [
  "url",
  "src",
  "href",
  "path",
  "file",
  "filename",
  "name",
  "image",
  "icon",
  "logo",
  "thumbnail",
  "cover",
  "photo",
  "small",
  "medium",
  "large",
  "original",
];

const DEFAULT_RECORD_FIELDS = [
  "image_url",
  "icon_url",
  "logo_url",
  "thumbnail_url",
  "cover_url",
  "photo_url",
  "main_image",
  "image_path",
  "icon_path",
  "logo_path",
  "path",
  "icon",
  "logo",
  "image",
  "thumbnail",
  "cover",
  "photo",
  "images",
  "gallery",
  "photos",
  "medias",
  "product_images",
  "assets",
];

export function resolveSelldoneRecordImage(record = {}, options = {}) {
  const candidates = [];
  collectRecordCandidates(record, candidates, options.fields || DEFAULT_RECORD_FIELDS);
  collectRecordCandidates(record.parent, candidates, options.fields || DEFAULT_RECORD_FIELDS);
  collectRecordCandidates(record.gateway, candidates, options.fields || DEFAULT_RECORD_FIELDS);
  collectRecordCandidates(record.shop, candidates, options.fields || DEFAULT_RECORD_FIELDS);

  return candidates.map((candidate) => selldoneImagePathToUrl(candidate, options)).find(Boolean) || "";
}

export function selldoneImagePathToUrl(value, options = {}) {
  const source = String(value ?? "").trim();
  if (!source || source === "[object Object]" || source.toLowerCase() === "null") return "";
  if (/^(data:image\/|blob:)/i.test(source)) return source;
  if (/^https?:\/\//i.test(source)) return withSelldoneThumbnailSize(source, options.size);
  if (source.startsWith("//")) return withSelldoneThumbnailSize(`https:${source}`, options.size);

  const path = normalizeImagePath(source);
  if (!path) return "";
  const slashPath = path.includes("_") ? normalizeImagePath(path.replaceAll("_", "/")) : "";

  const directUrl = structuredSelldonePathToUrl(path, options, { allowShopFallback: false });
  if (directUrl) return directUrl;

  if (slashPath && slashPath !== path) {
    const slashUrl = structuredSelldonePathToUrl(slashPath, options, { allowShopFallback: false });
    if (slashUrl) return slashUrl;
  }

  const fallbackUrl = structuredSelldonePathToUrl(path, options, { allowShopFallback: true });
  if (fallbackUrl) return fallbackUrl;

  if (slashPath && slashPath !== path) {
    const slashFallbackUrl = structuredSelldonePathToUrl(slashPath, options, { allowShopFallback: true });
    if (slashFallbackUrl) return slashFallbackUrl;
  }

  return "";
}

export const toSelldoneImageUrl = selldoneImagePathToUrl;

export function collectSelldoneImageCandidates(value, candidates = []) {
  if (value === null || value === undefined || value === false) return candidates;

  if (typeof value === "string") {
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => candidates.push(item));
    return candidates;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectSelldoneImageCandidates(item, candidates));
    return candidates;
  }

  if (typeof value === "object") {
    DEFAULT_IMAGE_KEYS.forEach((key) => collectSelldoneImageCandidates(value[key], candidates));
  }

  return candidates;
}

function collectRecordCandidates(record, candidates, fields) {
  if (!record || typeof record !== "object") return;
  fields.forEach((field) => collectSelldoneImageCandidates(record[field], candidates));
}

function normalizeImagePath(value) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

function structuredSelldonePathToUrl(path, options = {}, { allowShopFallback = false } = {}) {
  if (!path) return "";

  if (path.startsWith("app/")) {
    return withSelldoneThumbnailSize(`${SELLDONE_CDN_ORIGIN}/${path}`, options.size);
  }
  if (path.includes("app/shops/")) {
    return withSelldoneThumbnailSize(`${SELLDONE_CDN_ORIGIN}/${path.slice(path.indexOf("app/shops/"))}`, options.size);
  }
  if (path.startsWith("shops/")) {
    return withSelldoneThumbnailSize(`${SELLDONE_APP_CDN_BASE}/${path}`, options.size);
  }

  const compactShopPath = path.match(/^shops(\d+)(products|categories|articles|pages|folders|vendors|logos|baskets|users|gateways)[/](.+)$/i);
  if (compactShopPath) {
    const [, compactShopId, scope, rest] = compactShopPath;
    return withSelldoneThumbnailSize(`${SELLDONE_APP_CDN_BASE}/shops/${compactShopId}/${scope}/${rest}`, options.size);
  }

  if (GLOBAL_ASSET_PREFIX_RE.test(path)) {
    return withSelldoneThumbnailSize(`${SELLDONE_APP_CDN_BASE}/${path}`, options.size);
  }

  if (SHOP_SCOPES_RE.test(path) && (options.shopId || options.shop_id)) {
    const shopId = options.shopId || options.shop_id;
    return withSelldoneThumbnailSize(`${SELLDONE_APP_CDN_BASE}/shops/${shopId}/${path}`, options.size);
  }

  if (IMAGE_EXT_RE.test(path)) {
    const shopId = options.shopId || options.shop_id;
    const scope = options.scope || "products";
    if (shopId && allowShopFallback) {
      return withSelldoneThumbnailSize(`${SELLDONE_APP_CDN_BASE}/shops/${shopId}/${scope}/${path}`, options.size);
    }
    if (!shopId) return withSelldoneThumbnailSize(`${SELLDONE_APP_CDN_BASE}/${path}`, options.size);
  }

  if (allowShopFallback && (options.shopId || options.shop_id) && !/[?#]/.test(path)) {
    const shopId = options.shopId || options.shop_id;
    const scope = options.scope || "products";
    return withSelldoneThumbnailSize(`${SELLDONE_APP_CDN_BASE}/shops/${shopId}/${scope}/${path}`, options.size);
  }

  return "";
}

function withSelldoneThumbnailSize(url, size) {
  if (!size || !/^https:\/\/cdn\.selldone\.com\/app\//i.test(url)) return url;
  if (IMAGE_EXT_RE.test(url)) return url;
  if (/(32|64|128|256|512)\.png(\?.*)?$/i.test(url)) return url;
  const [base, query = ""] = url.split("?");
  return `${base}${Number(size)}.png${query ? `?${query}` : ""}`;
}
