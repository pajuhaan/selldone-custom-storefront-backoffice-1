function safeText(value) {
  return String(value ?? "").trim();
}

function quantityValue(state) {
  const qty = Number.parseInt(state.quickBuy?.quantity, 10);
  return Number.isFinite(qty) && qty > 0 ? Math.min(9, qty) : 1;
}

function addressSources(user = {}) {
  return [
    user.default_address,
    user.defaultAddress,
    user.shipping_address,
    user.shippingAddress,
    user.receiver_info,
    user.receiverInfo,
    user.address,
    ...(Array.isArray(user.addresses) ? user.addresses : []),
    ...(Array.isArray(user.locations) ? user.locations : []),
  ].filter(Boolean);
}

function normalizeAddress(source = {}, user = {}, firstNonNull) {
  const raw = typeof source === "string" ? { address: source } : source && typeof source === "object" ? source : {};
  const name = safeText(firstNonNull(raw.name, raw.fullName, raw.receiver, user.name, user.fullName, user.first_name, ""));
  const email = safeText(firstNonNull(raw.email, user.email, ""));
  const phone = safeText(firstNonNull(raw.phone, raw.mobile, user.phone, user.mobile, ""));
  const address = safeText(firstNonNull(raw.address, raw.street, raw.line1, raw.address1, user.address, ""));
  const city = safeText(firstNonNull(raw.city, user.city, ""));
  const state = safeText(firstNonNull(raw.state, raw.province, raw.region, user.state, ""));
  const country = safeText(firstNonNull(raw.country, user.country, "US"));
  const postal = safeText(firstNonNull(raw.postal, raw.postal_code, raw.zip, raw.zipcode, user.postal, user.postalCode, ""));
  return { name, email, phone, address, city, state, country, postal };
}

function userAddressCandidates(user = {}, firstNonNull) {
  const seen = new Set();
  const candidates = addressSources(user)
    .map((source) => normalizeAddress(source, user, firstNonNull))
    .filter((address) => address.address || address.city || address.phone)
    .filter((address) => {
      const key = [address.name, address.phone, address.address, address.city, address.postal].join("|").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (candidates.length) return candidates;
  return [normalizeAddress({}, user, firstNonNull)];
}

function addressLine(address = {}) {
  return [address.address, address.city, address.state, address.postal, address.country].filter(Boolean).join(", ");
}

function submitRedirectForm(url, method = "POST", fields = {}) {
  const target = safeText(url);
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

export function createStorefrontQuickBuy(deps) {
  const {
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
    checkoutSuccessUrl,
    completeStorefrontOrder,
    firstNonNull,
    escapeHtml,
    toNumber,
    showToast,
    renderLiveCatalogEmptyState,
  } = deps;

  async function quickBuyContext(productId = "", variantKey = "") {
    const id = safeText(productId || state.activeProductId);
    let item = getProductById(id);
    if (!item && state.dataSource === DATA_SOURCE.xapi && id) {
      item = await fetchXapiProductDetail(id);
    }
    if (!item) throw new Error("Product is not available.");

    const resolved = await resolveCartLineVariantForStorefront(item, variantKey || state.quickBuy?.variantKey || "");
    item = resolved.item || item;
    const selected = resolved.selected || activeProductVariant(item);
    const selectedVariantId = resolved.variantId || resolveStorefrontVariantId(selected);
    const variants = getItemVariants(item);
    if (selected && variants.length && !selectedVariantId) {
      throw new Error("This selected variant is not valid anymore. Please reselect an option.");
    }

    const price = resolveVariantPrice(selected, toNumber(item.price, 0));
    const original = resolveVariantOriginalPrice(selected, price, toNumber(item.original, 0));
    const key = firstNonNull(selected?.__key, selected?.__index, selected?.id, selected?.variant_id, selected?.sku, selected?.code, variantKey, "");
    return { item, selected, selectedVariantId, price, original, variantKey: safeText(key) };
  }

  function cartLineAmount(entry = {}) {
    const qty = toNumber(firstNonNull(entry.qty, entry.count, entry.quantity, 1), 1);
    const price = toNumber(firstNonNull(entry.price, entry.finalPrice, entry.item?.price, entry.item?.variant?.price, 0), 0);
    return toNumber(firstNonNull(entry.total, entry.subtotal, entry.amount, price * qty), price * qty);
  }

  function quickBuyTransportLabel(transport = null) {
    if (!transport) return "Shipping";
    return safeText(firstNonNull(transport.title, transport.name, transport.label, transport.type, transport.code, "Shipping")) || "Shipping";
  }

  function quickBuyTransportId(transport = null) {
    if (!transport) return null;
    return firstNonNull(transport.id, transport.transportation_id, transport.delivery_id, transport.code, transport.name, null);
  }

  function readableVariantLabel(key = "") {
    return safeText(key)
      .replace(/^variant[_-]?/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function readableVariantValue(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      return safeText(firstNonNull(value.title, value.name, value.label, value.value, value.text, ""));
    }
    return safeText(value);
  }

  function isDisplayableVariantValue(value = "") {
    const text = safeText(value);
    if (!text) return false;
    if (/^#?[0-9a-f]{6}$/i.test(text)) return false;
    if (/^rgba?\(/i.test(text)) return false;
    return true;
  }

  function pushVariantPair(pairs, seen, label = "", value = "") {
    const cleanLabel = readableVariantLabel(label);
    const cleanValue = readableVariantValue(value);
    if (!cleanLabel || !isDisplayableVariantValue(cleanValue)) return;
    const key = `${cleanLabel}:${cleanValue}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ label: cleanLabel, value: cleanValue });
  }

  function collectVariantPairsFromSource(source, pairs, seen) {
    if (!source) return;
    if (Array.isArray(source)) {
      source.forEach((entry, index) => {
        if (typeof entry === "object" && entry) {
          pushVariantPair(
            pairs,
            seen,
            firstNonNull(entry.title, entry.name, entry.label, entry.key, entry.option, `Option ${index + 1}`),
            firstNonNull(entry.value, entry.text, entry.name_value, entry.option_value, entry.selected, ""),
          );
          return;
        }
        pushVariantPair(pairs, seen, `Option ${index + 1}`, entry);
      });
      return;
    }
    if (typeof source === "object") {
      Object.entries(source).forEach(([key, value]) => pushVariantPair(pairs, seen, key, value));
    }
  }

  function variantDetailPairs(variant = null) {
    if (!variant || typeof variant !== "object") return [];
    const pairs = [];
    const seen = new Set();
    const directKeys = [
      "color_name",
      "colour_name",
      "shade_name",
      "color",
      "colour",
      "shade",
      "size",
      "volume",
      "capacity",
      "weight",
      "scent",
      "style",
      "material",
      "finish",
      "tone",
    ];
    directKeys.forEach((key) => pushVariantPair(pairs, seen, key, variant[key]));
    [
      variant.options,
      variant.option_values,
      variant.optionValues,
      variant.values,
      variant.properties,
      variant.property,
      variant.spec,
      variant.specs,
      variant.attributes,
      variant.attribute,
    ].forEach((source) => collectVariantPairsFromSource(source, pairs, seen));
    if (!pairs.length) {
      const title = safeText(firstNonNull(variant.title, variant.name, variant.sku, variant.code, ""));
      if (isDisplayableVariantValue(title)) pushVariantPair(pairs, seen, "Variant", title);
    }
    return pairs.slice(0, 4);
  }

  function renderVariantSummary(variant = null, className = "quick-buy-variant-summary") {
    if (!variant || typeof variantDetailsMarkup !== "function") return "";
    return variantDetailsMarkup(variant, variant?.__index || 0, className);
  }

  function cartEntryMatchesQuickBuy(entry = {}, context = {}) {
    const entryProductId = firstNonNull(entry.productId, entry.item?.id, entry.item?.product_id, entry.item?.productId, "");
    if (String(entryProductId) !== String(context.item?.id || "")) return false;

    const targetVariantId = safeText(context.selectedVariantId);
    if (!targetVariantId) return true;

    const entryVariantId = safeText(resolveStorefrontVariantId(entry.variant));
    if (entryVariantId) return entryVariantId === targetVariantId;

    const entryVariantKey = safeText(firstNonNull(
      entry.variantKey,
      entry.key,
      entry.lineKey,
      entry.variant?.__key,
      entry.variant?.__index,
      entry.variant?.id,
      entry.variant?.variant_id,
      entry.variant?.product_variant_id,
      entry.variant?.sku,
      entry.variant?.code,
      "",
    ));
    const targetVariantKey = safeText(context.variantKey);
    return targetVariantKey ? entryVariantKey.includes(targetVariantKey) : true;
  }

  function selectQuickBuyTransport(transportations = [], productId = "") {
    state.activeProductShippingSelection = state.activeProductShippingSelection || {};
    const productKey = safeText(productId);
    const currentKey = productKey ? safeText(state.activeProductShippingSelection[productKey]) : "";
    const selected = resolveCheckoutTransport(transportations, currentKey);
    const fallback = selected || transportations[0] || null;
    const key = fallback
      ? transportSelectionKey(fallback, currentKey || "shipping-default")
      : currentKey || "shipping-default";
    if (productKey && key) state.activeProductShippingSelection[productKey] = key;
    return { transport: fallback, key };
  }

  function quickBuyBilling(context, selectedTransport = null) {
    const qty = quantityValue(state);
    const currency = context.item.currency || state.cartSummary?.currency || "USD";
    const currentEntries = cartEntries();
    const cartTotals = typeof cartTotalsSummary === "function" ? cartTotalsSummary(currentEntries) : {};
    const currentBagSubtotal = currentEntries
      .filter((entry) => !cartEntryMatchesQuickBuy(entry, context))
      .reduce((sum, entry) => sum + cartLineAmount(entry), 0);
    const lineSubtotal = toNumber(context.price, 0) * qty;
    const subtotal = currentBagSubtotal + lineSubtotal;
    const shipping = selectedTransport
      ? calculateTransportCost(selectedTransport, subtotal)
      : toNumber(firstNonNull(cartTotals.shipping, state.cartSummary?.shipping, state.cartSummary?.shipping_price), Number.NaN);
    const discounts = Math.max(0, toNumber(firstNonNull(cartTotals.discounts, cartTotals.discount, state.cartSummary?.discount, state.cartSummary?.discounts), 0));
    const tax = toNumber(firstNonNull(cartTotals.tax, cartTotals.taxAmount, state.cartSummary?.tax, state.cartSummary?.tax_amount), Number.NaN);
    const knownShipping = Number.isFinite(shipping) ? Math.max(0, shipping) : Number.NaN;
    const knownTax = Number.isFinite(tax) ? Math.max(0, tax) : Number.NaN;
    const taxIncluded = Boolean(cartTotals.taxIncluded || state.cartSummary?.tax_included || state.cartSummary?.taxIncluded);
    const total = Math.max(
      0,
      subtotal - discounts + (Number.isFinite(knownShipping) ? knownShipping : 0) + (!taxIncluded && Number.isFinite(knownTax) ? knownTax : 0),
    );

    return {
      currency,
      quantity: qty,
      lineSubtotal,
      currentBagSubtotal,
      subtotal,
      shipping: knownShipping,
      shippingLabel: quickBuyTransportLabel(selectedTransport),
      discounts,
      tax: knownTax,
      taxIncluded,
      total,
      hasCurrentBag: currentBagSubtotal > 0,
      selectedTransport,
    };
  }

  function billingMoney(value, currency) {
    return Number.isFinite(value) ? formatPrice(value, currency) : "Calculated by Selldone";
  }

  function renderQuickBuyBilling(billing, address = {}) {
    const taxLabel = billing.taxIncluded ? "Tax included" : "Tax";
    const contact = safeText(address.email || address.phone || addressLine(address));
    return `
      <section class="quick-buy-section quick-buy-billing">
        <div class="quick-buy-section-head">
          <div>
            <strong>Billing</strong>
            <span>${escapeHtml(contact ? `Bill to ${contact}` : "Billing uses your shipping contact.")}</span>
          </div>
        </div>
        <div class="quick-buy-billing-card">
          <div class="quick-buy-billing-row">
            <span>This item <em>x${escapeHtml(String(billing.quantity))}</em></span>
            <strong>${formatPrice(billing.lineSubtotal, billing.currency)}</strong>
          </div>
          ${billing.hasCurrentBag ? `
            <div class="quick-buy-billing-row">
              <span>Current bag</span>
              <strong>${formatPrice(billing.currentBagSubtotal, billing.currency)}</strong>
            </div>
          ` : ""}
          <div class="quick-buy-billing-row">
            <span>Subtotal</span>
            <strong>${formatPrice(billing.subtotal, billing.currency)}</strong>
          </div>
          <div class="quick-buy-billing-row">
            <span>${escapeHtml(billing.shippingLabel)}</span>
            <strong>${billingMoney(billing.shipping, billing.currency)}</strong>
          </div>
          ${billing.discounts > 0 ? `
            <div class="quick-buy-billing-row is-discount">
              <span>Discounts</span>
              <strong>-${formatPrice(billing.discounts, billing.currency)}</strong>
            </div>
          ` : ""}
          <div class="quick-buy-billing-row">
            <span>${escapeHtml(taxLabel)}</span>
            <strong>${billingMoney(billing.tax, billing.currency)}</strong>
          </div>
          <div class="quick-buy-billing-row quick-buy-billing-total">
            <span>Estimated due now</span>
            <strong>${formatPrice(billing.total, billing.currency)}</strong>
          </div>
        </div>
        <p class="quick-buy-billing-note">Selldone confirms final shipping and tax before the Stripe payment form opens.</p>
      </section>
    `;
  }

  function renderCompactBag(currentItemId = "") {
    const entries = cartEntries();
    if (!entries.length) return "";
    const visible = entries.slice(0, 4);
    const count = entries.reduce((sum, entry) => sum + entry.qty, 0);
    return `
      <section class="quick-buy-mini-bag" aria-label="Current bag">
        <div class="quick-buy-mini-head">
          <span>Current bag</span>
          <strong>${escapeHtml(String(count))} ${count === 1 ? "item" : "items"}</strong>
        </div>
        <div class="quick-buy-mini-list">
          ${visible.map((entry) => {
            const href = `#product/${encodeURIComponent(String(entry.item.id || entry.productId || ""))}`;
            const active = String(entry.item.id || entry.productId || "") === String(currentItemId);
            const media = firstNonNull(entry.variant?.image, entry.variant?.icon, entry.variant?.path, entry.item.image, entry.item.images?.[0]);
            return `
              <a class="quick-buy-mini-item ${active ? "is-current" : ""}" href="${href}">
                <div class="quick-buy-mini-media">${renderProductImage(entry.item, "thumbnail-sprite", media)}</div>
                <div class="quick-buy-mini-copy">
                  <em>${escapeHtml(entry.item.title || "Product")}</em>
                  ${renderVariantSummary(entry.variant, "cart-variant-details quick-buy-mini-cart-variant-details")}
                </div>
                <strong>x${escapeHtml(String(entry.qty))}</strong>
              </a>
            `;
          }).join("")}
          ${entries.length > visible.length ? `<a class="quick-buy-mini-more" href="#cart">+${entries.length - visible.length} more in bag</a>` : ""}
        </div>
      </section>
    `;
  }

  function renderAddressControls(addresses = [], activeIndex = 0) {
    if (addresses.length <= 1) return "";
    return `
      <div class="quick-buy-address-options" aria-label="Saved addresses">
        ${addresses.map((address, index) => `
          <button class="${index === activeIndex ? "is-active" : ""}" type="button" data-quick-buy-address-index="${index}">
            ${escapeHtml(address.city || address.address || `Address ${index + 1}`)}
          </button>
        `).join("")}
      </div>
    `;
  }

  async function renderQuickBuyPanel(productId = "", variantKey = "") {
    const context = await quickBuyContext(productId, variantKey);
    const { item, selected, selectedVariantId, price, original } = context;
    const qty = quantityValue(state);
    const user = state.sessionUser || {};
    const addresses = userAddressCandidates(user, firstNonNull);
    const activeAddressIndex = Math.min(addresses.length - 1, Math.max(0, Number.parseInt(state.quickBuy?.addressIndex, 10) || 0));
    const address = addresses[activeAddressIndex] || addresses[0] || {};
    const editingAddress = Boolean(state.quickBuy?.editingAddress || !address.address || !address.phone);
    const transportations = await ensureShopTransportationsLoaded();
    const { transport: selectedTransport, key: selectedShippingKey } = selectQuickBuyTransport(transportations, item.id);
    const billing = quickBuyBilling(context, selectedTransport);
    const paymentOptions = renderCheckoutPaymentOptions(state.cartSummary || {}, item.currency);
    const mount = document.querySelector("[data-quick-buy-mount]");
    if (!mount) return;

    mount.innerHTML = `
      <section class="quick-buy-panel quick-buy-dialog" role="dialog" aria-modal="true" aria-label="Quick buy checkout" tabindex="-1">
        <div class="quick-buy-head">
          <div>
            <span class="account-profile-kicker">Fast checkout</span>
            <h2>Express checkout</h2>
            <p>Review delivery, billing, and pay securely with Stripe.</p>
          </div>
          <button class="quick-buy-close" type="button" data-quick-buy-close aria-label="Close quick buy">×</button>
        </div>

        <form class="quick-buy-grid" data-quick-buy-form>
          <input type="hidden" name="productId" value="${escapeHtml(item.id)}" />
          <input type="hidden" name="variantKey" value="${escapeHtml(context.variantKey)}" />
          <input type="hidden" name="selectedVariantId" value="${escapeHtml(selectedVariantId || "")}" />

          <div class="quick-buy-primary-item">
            <div class="quick-buy-product-media">${renderProductImage(item, "thumbnail-sprite", firstNonNull(selected?.image, selected?.icon, selected?.path, item.image, item.images?.[0]))}</div>
            <div>
              <span>${escapeHtml(item.brand || "Pajulina")}</span>
              <h3>${escapeHtml(item.title || "Product")}</h3>
              <p>${selected ? escapeHtml(firstNonNull(selected.title, selected.name, selected.sku, selected.code, "")) : "Selected product"}</p>
              ${renderVariantSummary(selected, "cart-variant-details quick-buy-cart-variant-details")}
              <div class="quick-buy-price">
                <strong>${formatPrice(price * qty, item.currency)}</strong>
                ${original ? `<s>${formatPrice(original * qty, item.currency)}</s>` : ""}
              </div>
            </div>
            <div class="quick-buy-qty" aria-label="Quick buy quantity">
              <button type="button" data-quick-buy-qty="-1" aria-label="Decrease quick buy quantity">-</button>
              <output>${escapeHtml(String(qty))}</output>
              <button type="button" data-quick-buy-qty="1" aria-label="Increase quick buy quantity">+</button>
            </div>
          </div>

          ${renderCompactBag(item.id)}

          <section class="quick-buy-section quick-buy-address-section">
            <div class="quick-buy-section-head">
              <div>
                <strong>Shipping address</strong>
                <span>${editingAddress ? "Edit delivery details before payment." : escapeHtml(addressLine(address) || "Add a delivery address.")}</span>
              </div>
              <button type="button" class="text-link" data-quick-buy-address-edit>${editingAddress ? "Use compact view" : "Change"}</button>
            </div>
            ${renderAddressControls(addresses, activeAddressIndex)}
            <div class="quick-buy-address-form ${editingAddress ? "is-editing" : ""}">
              <label><span>Full name</span><input name="fullName" required value="${escapeHtml(address.name)}" placeholder="J. Doe" ${editingAddress ? "" : "readonly"} /></label>
              <label><span>Phone</span><input name="phone" required value="${escapeHtml(address.phone)}" placeholder="+1 000 000 0000" ${editingAddress ? "" : "readonly"} /></label>
              <label><span>Email</span><input name="email" type="email" value="${escapeHtml(address.email)}" placeholder="you@example.com" ${editingAddress ? "" : "readonly"} /></label>
              <label class="quick-buy-field-wide"><span>Address</span><input name="address" required value="${escapeHtml(address.address)}" placeholder="Street address" ${editingAddress ? "" : "readonly"} /></label>
              <label><span>City</span><input name="city" value="${escapeHtml(address.city)}" placeholder="City" ${editingAddress ? "" : "readonly"} /></label>
              <label><span>State</span><input name="state" value="${escapeHtml(address.state)}" placeholder="State" ${editingAddress ? "" : "readonly"} /></label>
              <label><span>Postal</span><input name="postal" value="${escapeHtml(address.postal)}" placeholder="ZIP" ${editingAddress ? "" : "readonly"} /></label>
              <label><span>Country</span><input name="country" required value="${escapeHtml(address.country || "US")}" placeholder="US" ${editingAddress ? "" : "readonly"} /></label>
            </div>
          </section>

          <section class="quick-buy-section quick-buy-delivery-section">
            <strong>Delivery</strong>
            ${renderDeliveryCards(transportations, {
              selectedKey: selectedShippingKey,
              productId: item.id,
              context: "quick-buy",
            })}
          </section>

          ${renderQuickBuyBilling(billing, address)}

          <section class="quick-buy-section quick-buy-payment-section">
            <strong>Payment</strong>
            ${paymentOptions}
          </section>

          <button class="quick-buy-pay" type="submit" data-quick-buy-submit>
            <span>Pay now</span>
            <strong>${formatPrice(billing.total, billing.currency)}</strong>
          </button>
          <p class="quick-buy-note" data-quick-buy-message></p>
        </form>
      </section>
    `;
    document.body.classList.add("quick-buy-open");
    mount.querySelector(".quick-buy-dialog")?.focus({ preventScroll: true });
  }

  async function openQuickBuy(productId = "", variantKey = "") {
    if (!state.sessionAuthenticated) {
      await fetchSessionStatus(true);
      if (!state.sessionAuthenticated) {
        showToast("Please log in before quick checkout.");
        navigateToAccount();
        return;
      }
    }
    state.quickBuy = {
      ...(state.quickBuy || {}),
      productId: safeText(productId || state.activeProductId),
      variantKey: safeText(variantKey),
      quantity: quantityValue(state),
      addressIndex: Number.parseInt(state.quickBuy?.addressIndex, 10) || 0,
      editingAddress: Boolean(state.quickBuy?.editingAddress),
      submitting: false,
    };
    const added = await addToCart(state.quickBuy.productId, state.quickBuy.variantKey, {
      openBag: false,
      successToast: "Added to bag. Opening express checkout...",
    });
    if (!added?.ok) return;
    state.quickBuy = {
      ...(state.quickBuy || {}),
      quantity: quantityValue({ quickBuy: { quantity: added.count } }),
    };
    await hydrateStorefrontCart(true);
    await renderQuickBuyPanel(state.quickBuy.productId, state.quickBuy.variantKey);
  }

  function closeQuickBuy() {
    document.body.classList.remove("quick-buy-open");
    const mount = document.querySelector("[data-quick-buy-mount]");
    if (mount) mount.innerHTML = "";
    state.quickBuy = { ...(state.quickBuy || {}), submitting: false };
  }

  async function updateQuickBuyQuantity(delta = 0) {
    state.quickBuy = {
      ...(state.quickBuy || {}),
      quantity: Math.min(9, Math.max(1, quantityValue(state) + Number(delta || 0))),
    };
    await renderQuickBuyPanel(state.quickBuy.productId, state.quickBuy.variantKey);
  }

  async function setQuickBuyAddressIndex(index = 0) {
    state.quickBuy = {
      ...(state.quickBuy || {}),
      addressIndex: Math.max(0, Number.parseInt(index, 10) || 0),
      editingAddress: false,
    };
    await renderQuickBuyPanel(state.quickBuy.productId, state.quickBuy.variantKey);
  }

  async function toggleQuickBuyAddressEditing() {
    state.quickBuy = {
      ...(state.quickBuy || {}),
      editingAddress: !state.quickBuy?.editingAddress,
    };
    await renderQuickBuyPanel(state.quickBuy.productId, state.quickBuy.variantKey);
  }

  async function refreshQuickBuy() {
    if (!state.quickBuy?.productId) return;
    await renderQuickBuyPanel(state.quickBuy.productId, state.quickBuy.variantKey);
  }

  async function requestQuickBuyJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    return { response, result };
  }

  async function fallbackQuickBuyCheckout(requestPayload, context, qty) {
    const basketResponse = await fetch(`/api/storefront/basket/${encodeURIComponent(String(context.item.id))}`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        count: qty,
        currency: context.item.currency,
        variant_id: context.selectedVariantId,
        product_variant_id: context.selectedVariantId,
        selected_variant_id: context.selectedVariantId,
      }),
    });
    const basketResult = await basketResponse.json().catch(() => ({}));
    if (!basketResponse.ok || basketResult?.ok === false) {
      throw new Error(basketResult?.error || basketResult?.message || `Could not sync quick buy basket (${basketResponse.status}).`);
    }

    await hydrateStorefrontCart(true);
    const { response, result } = await requestQuickBuyJson("/api/storefront/orders", {
      ...requestPayload,
      selected_variant_id: context.selectedVariantId,
      params: {
        ...(requestPayload.params && typeof requestPayload.params === "object" ? requestPayload.params : {}),
        quick_buy: true,
        quick_buy_product_id: context.item.id,
        quick_buy_count: qty,
        ...(context.selectedVariantId ? { quick_buy_variant_id: context.selectedVariantId } : {}),
      },
    });
    if (!response.ok || result?.ok === false) {
      throw new Error(result?.error || result?.message || `Quick buy checkout failed (${response.status}).`);
    }
    if (typeof checkoutSuccessUrl === "function") checkoutSuccessUrl(result, requestPayload);
    return result;
  }

  async function handleQuickBuySubmit(event) {
    event.preventDefault();
    const form = event.target.closest("[data-quick-buy-form]");
    if (!form || state.quickBuy?.submitting) return;

    const message = form.querySelector("[data-quick-buy-message]");
    const submit = form.querySelector("[data-quick-buy-submit]");
    const formData = Object.fromEntries(new FormData(form).entries());
    const context = await quickBuyContext(formData.productId, formData.variantKey);
    const qty = quantityValue(state);
    const transportations = await ensureShopTransportationsLoaded();
    const { transport: selectedTransport, key: selectedShippingKey } = selectQuickBuyTransport(transportations, context.item.id);
    const billing = quickBuyBilling(context, selectedTransport);
    const receiver = {
      name: safeText(formData.fullName),
      phone: safeText(formData.phone),
      email: safeText(formData.email),
      address: safeText(formData.address),
      city: safeText(formData.city),
      state: safeText(formData.state),
      postal: safeText(formData.postal),
      postal_code: safeText(formData.postal),
      country: safeText(formData.country || "US"),
    };

    if (!receiver.name || !receiver.phone || !receiver.address) {
      if (message) message.textContent = "Name, phone, and address are required.";
      showToast("Add shipping name, phone, and address.");
      return;
    }

    const requestPayload = {
      product_id: context.item.id,
      count: qty,
      variant_id: context.selectedVariantId,
      selected_variant_id: context.selectedVariantId,
      currency: context.item.currency,
      receiver_info: receiver,
      billing_info: {
        ...receiver,
        same_as_shipping: true,
      },
      delivery_info: {
        method: selectedShippingKey,
        shipping_method: selectedShippingKey,
        transportation_id: quickBuyTransportId(selectedTransport),
        title: quickBuyTransportLabel(selectedTransport),
      },
      customer: receiver,
      guest_email: receiver.email || null,
      gateway_code: safeText(formData.gatewayCode || state.checkoutGatewayCode || "auto"),
      return_url: `${window.location.origin}${window.location.pathname}${window.location.search || ""}#order-success`,
      back_url: `#product/${encodeURIComponent(String(context.item.id))}`,
      quick_buy: true,
      bill: {
        currency: billing.currency,
        item: billing.lineSubtotal,
        current_bag: billing.currentBagSubtotal,
        subtotal: billing.subtotal,
        shipping: Number.isFinite(billing.shipping) ? billing.shipping : null,
        discount: billing.discounts,
        tax: Number.isFinite(billing.tax) ? billing.tax : null,
        total: billing.total,
      },
      product: {
        id: context.item.id,
        title: context.item.title,
        count: qty,
        variant_id: context.selectedVariantId,
        currency: context.item.currency,
      },
    };

    state.quickBuy = { ...(state.quickBuy || {}), submitting: true };
    if (submit) {
      submit.disabled = true;
      submit.querySelector("span") && (submit.querySelector("span").textContent = "Preparing Stripe...");
    }
    if (message) message.textContent = "";

    try {
      const { response, result } = await requestQuickBuyJson("/api/storefront/quick-buy", requestPayload);
      const routeMissing = response.status === 404 && /route not found/i.test(String(result?.error || result?.message || ""));
      if (!response.ok || result?.ok === false) {
        if (routeMissing) {
          const fallbackResult = await fallbackQuickBuyCheckout(requestPayload, context, qty);
          showToast("Opening secure Stripe payment...");
          if (await handleStripeCheckoutResult(fallbackResult, requestPayload)) return;
          if (typeof checkoutSuccessUrl === "function") checkoutSuccessUrl(fallbackResult, requestPayload);
          if (fallbackResult?.redirect?.url) {
            submitRedirectForm(fallbackResult.redirect.url, fallbackResult.redirect.method || "GET", fallbackResult.redirect.fields || {});
            return;
          }
          if (typeof completeStorefrontOrder === "function") {
            await completeStorefrontOrder(fallbackResult, requestPayload);
            return;
          }
          renderLiveCatalogEmptyState("Order placed", "Your quick order has been received. Thank you for shopping with Pajulina.");
          return;
        }
        throw new Error(result?.error || result?.message || `Quick buy failed (${response.status}).`);
      }

      showToast("Opening secure Stripe payment...");
      if (await handleStripeCheckoutResult(result, requestPayload)) return;
      if (typeof checkoutSuccessUrl === "function") checkoutSuccessUrl(result, requestPayload);
      if (result?.redirect?.url) {
        submitRedirectForm(result.redirect.url, result.redirect.method || "GET", result.redirect.fields || {});
        return;
      }

      if (typeof completeStorefrontOrder === "function") {
        await completeStorefrontOrder(result, requestPayload);
        return;
      }
      renderLiveCatalogEmptyState("Order placed", "Your quick order has been received. Thank you for shopping with Pajulina.");
    } catch (error) {
      state.quickBuy = { ...(state.quickBuy || {}), submitting: false };
      if (submit) {
        submit.disabled = false;
        submit.querySelector("span") && (submit.querySelector("span").textContent = "Pay now");
      }
      if (message) message.textContent = error?.message || "Quick buy is unavailable.";
      showToast(error?.message || "Quick buy is unavailable.");
    }
  }

  return {
    closeQuickBuy,
    handleQuickBuySubmit,
    openQuickBuy,
    refreshQuickBuy,
    setQuickBuyAddressIndex,
    toggleQuickBuyAddressEditing,
    updateQuickBuyQuantity,
  };
}
