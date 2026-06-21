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

export async function renderProductPage(deps) {
  const {
    productId,
    state,
    DATA_SOURCE,
    els,
    getProductById,
    fetchXapiProductDetail,
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

  const catalog = getProductsForUi();
  const related = catalog.filter((entry) => entry.category === category && entry.id !== item.id).slice(0, 4);
  const similar = catalog.filter((entry) => entry.subcategory === subcategory && entry.id !== item.id).slice(0, 4);

  const catalogItem = (index, alternate = null) => catalog[index] || alternate || null;
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
