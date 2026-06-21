const favoriteStorageKey = "pajulina:favorites";

function productIsFavorite(productId = "") {
  try {
    const raw = window.localStorage?.getItem(favoriteStorageKey);
    const ids = JSON.parse(raw || "[]");
    return Array.isArray(ids) && ids.map(String).includes(String(productId));
  } catch {
    return false;
  }
}

function localEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function firstObject(...values) {
  return values.find((value) => value && typeof value === "object" && !Array.isArray(value)) || {};
}

function productArticleContent(item = {}, firstNonNull) {
  const article = firstObject(
    item.article,
    item.product_article,
    item.productArticle,
    item.article_data,
    item.articleData,
    item.article_pack?.article,
    item.articlePack?.article,
    item.blog,
    item.data?.article,
    item.payload?.article,
  );
  return String(firstNonNull(
    article.body_html,
    article.content_html,
    article.bodyHtml,
    article.contentHtml,
    article.article_body,
    article.articleBody,
    article.html,
    article.body,
    article.content,
    article.text,
    item.article_body_html,
    item.articleBodyHtml,
    item.article_body,
    item.articleBody,
    item.article_html,
    item.articleHtml,
    item.content_html,
    item.contentHtml,
    "",
  ) || "").trim();
}

function productArticleTitle(item = {}, firstNonNull) {
  const article = firstObject(
    item.article,
    item.product_article,
    item.productArticle,
    item.article_data,
    item.articleData,
    item.article_pack?.article,
    item.articlePack?.article,
    item.blog,
    item.data?.article,
    item.payload?.article,
  );
  return String(firstNonNull(article.title, article.name, item.article_title, item.articleTitle, "Product article") || "Product article").trim();
}

function sanitizeProductArticleHtml(rawHtml = "") {
  const source = String(rawHtml || "").trim();
  if (!source) return "";
  if (!source.includes("<")) {
    return source
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${localEscapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  const template = document.createElement("template");
  template.innerHTML = source;
  const allowedTags = new Set([
    "P",
    "BR",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "UL",
    "OL",
    "LI",
    "H2",
    "H3",
    "H4",
    "BLOCKQUOTE",
    "A",
    "IMG",
    "DIV",
    "FIGURE",
    "TABLE",
    "THEAD",
    "TBODY",
    "TR",
    "TH",
    "TD",
  ]);
  const allowedAttrs = {
    A: new Set(["href", "title", "target", "rel"]),
    IMG: new Set(["src", "alt", "title", "loading"]),
  };
  Array.from(template.content.querySelectorAll("*")).forEach((node) => {
    if (!node.parentNode) return;
    if (!allowedTags.has(node.tagName)) {
      const fragment = document.createDocumentFragment();
      Array.from(node.childNodes).forEach((child) => fragment.appendChild(child));
      node.parentNode.replaceChild(fragment, node);
      return;
    }
    Array.from(node.attributes).forEach((attr) => {
      const allowed = allowedAttrs[node.tagName]?.has(attr.name);
      if (!allowed) node.removeAttribute(attr.name);
    });
    if (node.tagName === "A") {
      const href = String(node.getAttribute("href") || "").trim();
      if (/^(javascript|data):/i.test(href)) node.removeAttribute("href");
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
    if (node.tagName === "IMG") {
      const src = String(node.getAttribute("src") || "").trim();
      if (!src || /^(javascript|data):/i.test(src)) node.remove();
      else node.setAttribute("loading", "lazy");
    }
  });
  return template.innerHTML.trim();
}

function renderProductArticleSection(item = {}, firstNonNull, escapeHtml) {
  const content = sanitizeProductArticleHtml(productArticleContent(item, firstNonNull));
  if (!content) return "";
  return `
    <section class="product-article-section">
      <span class="product-meta">Article</span>
      <h2>${escapeHtml(productArticleTitle(item, firstNonNull))}</h2>
      <div class="product-article-content">${content}</div>
    </section>
  `;
}

function firstArray(...values) {
  return values.find((value) => Array.isArray(value)) || [];
}

function crossSellProductId(entry = {}, firstNonNull) {
  if (!entry || typeof entry !== "object") return String(entry || "").trim();
  return String(firstNonNull(
    entry.product_id,
    entry.productId,
    entry.id,
    entry.item_id,
    entry.itemId,
    entry.target_id,
    entry.targetId,
    entry.product?.id,
    entry.item?.id,
    "",
  ) || "").trim();
}

function crossSellDiscount(entry = {}, product = {}, toNumber) {
  return Math.max(
    0,
    toNumber(entry?.discount, 0),
    toNumber(entry?.percent, 0),
    toNumber(entry?.offer, 0),
    toNumber(entry?.off, 0),
    toNumber(product?.discount, 0),
  );
}

function productHasDiscount(product = {}, toNumber) {
  const price = toNumber(product.price, 0);
  const original = toNumber(product.original, 0);
  return toNumber(product.discount, 0) > 0 || (original > 0 && price > 0 && original > price);
}

export async function renderProductPage(deps) {
  const {
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
  } = deps;

  const id = String(productId || "").trim() || String(state.activeProductId || "").trim();
  const cachedProduct = id ? getProductById(id) : null;
  let item = cachedProduct;

  if (state.dataSource === DATA_SOURCE.xapi && id) {
    const needsDetail =
      !cachedProduct ||
      !Array.isArray(cachedProduct.images) ||
      cachedProduct.images.length <= 1 ||
      productNeedsStorefrontDetail(cachedProduct);
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

  if (typeof ensureProductsForPage === "function") {
    await ensureProductsForPage();
  }
  const catalog = getProductsForUi();
  const catalogWithoutCurrent = catalog.filter((entry) => String(entry.id) !== String(item.id));
  const pickProductRail = (primary = []) => {
    const seen = new Set();
    const picked = [];
    [...primary, ...catalogWithoutCurrent].forEach((entry) => {
      const key = String(entry?.id || "");
      if (!entry || !key || seen.has(key) || String(key) === String(item.id)) return;
      seen.add(key);
      picked.push(entry);
    });
    return picked.slice(0, 4);
  };
  const related = pickProductRail(catalogWithoutCurrent.filter((entry) => entry.category === category));
  const similar = pickProductRail(catalogWithoutCurrent.filter((entry) => entry.subcategory === subcategory));
  const crossSellSources = [
    ...firstArray(item.includes),
    ...firstArray(item.sells),
    ...firstArray(item.crossSells),
    ...firstArray(item.extraPricings),
  ];
  const crossSellSeen = new Set();
  const crossSellRoutine = crossSellSources
    .map((entry) => {
      const directProduct = firstObject(entry?.product, entry?.item, entry);
      const targetId = crossSellProductId(entry, firstNonNull);
      const matched = targetId ? catalog.find((candidate) => String(candidate.id) === String(targetId)) : null;
      const product = matched || (directProduct?.title ? directProduct : null);
      if (!product || String(product.id || "") === String(item.id)) return null;
      const id = String(product.id || targetId || product.title || "");
      if (!id || crossSellSeen.has(id)) return null;
      const discount = crossSellDiscount(entry, product, toNumber);
      const original = toNumber(product.original, 0);
      const price = toNumber(product.price, 0);
      const hasDiscount = discount > 0 || productHasDiscount(product, toNumber) || toNumber(entry?.discount_amount, 0) > 0 || toNumber(entry?.discountAmount, 0) > 0;
      if (!hasDiscount) return null;
      crossSellSeen.add(id);
      return {
        ...product,
        discount: discount || product.discount,
        original: original || (discount > 0 && price > 0 ? price / (1 - Math.min(99.9, discount) / 100) : product.original),
        crossSellLabel: String(firstNonNull(entry?.title, entry?.label, entry?.name, discount > 0 ? `${discount}% cross-sell` : "Cross-sell deal") || "Cross-sell deal"),
      };
    })
    .filter(Boolean)
    .slice(0, 3);
  const catalogItem = (index, alternate = null) => catalog[index] || alternate || null;
  const routineItems = crossSellRoutine.length
    ? crossSellRoutine
    : [catalogItem(4), item, catalogItem(11)].filter(Boolean);
  const routineTitle = crossSellRoutine.length ? "Complete the set and save" : "Make it a routine";

  const isFavorite = productIsFavorite(item.id);

  els.app.innerHTML = `
    <div class="page-shell">
      <nav class="breadcrumbs" aria-label="Breadcrumbs">
        <a href="#home">Home</a><span>/</span><a href="#shop">Shop</a><span>/</span><a href="#shop?category=${category}">${escapeHtml(titleCase(category))}</a><span>/</span><strong>${escapeHtml(subcategory)}</strong>
      </nav>
      <section class="product-detail-layout">
        <div class="gallery">
          <button
            class="favorite-button product-favorite-overlay ${isFavorite ? "is-active" : ""}"
            type="button"
            data-favorite-product="${escapeHtml(item.id)}"
            data-favorite-title="${escapeHtml(item.title || "Product")}"
            aria-pressed="${isFavorite ? "true" : "false"}"
            aria-label="${isFavorite ? "Remove from favorites" : "Add to favorites"}"
            title="${isFavorite ? "Remove from favorites" : "Add to favorites"}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
            </svg>
          </button>
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
            <button class="quick-buy-trigger" type="button" data-quick-buy-product="${item.id}" data-variant-key="${escapeHtml(addButtonVariantKey)}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13 2 5 13h6l-1 9 9-12h-6l1-8Z" />
              </svg>
              <span>Buy now</span>
            </button>
          </div>
          <div data-quick-buy-mount></div>
          <div class="promo-box">
            Members save up to 20% on almost everything in stores and online. Use code <strong>NEWROUTINE</strong>.
          </div>

          <div class="accordion">
            ${renderProductProsAccordion(item, description)}
          </div>

          <section class="bought-box">
            <h2>Frequently bought together</h2>
            ${miniProduct(item)}
            ${miniProduct(catalogItem(2))}
            ${miniProduct(catalogItem(9))}
            <button class="black-button" type="button" data-add-to-cart-product="${item.id}" data-variant-key="${escapeHtml(addButtonVariantKey)}">Add set to bag</button>
          </section>

          <section class="routine-box">
            <h2>${escapeHtml(routineTitle)}</h2>
            ${routineItems.map((entry, index) => routineStep(crossSellRoutine.length ? `Deal ${index + 1}` : `Step ${index + 1}`, entry)).join("")}
            <button class="black-button" type="button" data-add-to-cart-product="${item.id}" data-variant-key="${escapeHtml(addButtonVariantKey)}">Add set to bag</button>
          </section>
        </article>
      </section>

      ${renderProductArticleSection(item, firstNonNull, escapeHtml)}

      ${renderProductSection("We think you'll like", `${related.length} ${related.length === 1 ? "item" : "items"}`, related, "product-row")}
      ${renderProductSection("Similar items for you", `${similar.length} ${similar.length === 1 ? "item" : "items"}`, similar, "product-row")}

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
