import * as storefront from "./app-core.js?v=storefront-product-rating-refactor-20260621";
import { updateProductRatingSubmitState } from "./product-rating.js?v=storefront-product-rating-refactor-20260621";

const {
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
  handleProductReviewSubmit,
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
  toggleAccountMenu,
  updateAccountButton,
  updateQuickBuyQuantity,
  updateQuantity,
  normalizeGallery,
} = storefront;

const favoriteStorageKey = "pajulina:favorites";

function readFavoriteIds() {
  try {
    const raw = window.localStorage?.getItem(favoriteStorageKey);
    const ids = JSON.parse(raw || "[]");
    return Array.isArray(ids) ? ids.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids = []) {
  try {
    window.localStorage?.setItem(favoriteStorageKey, JSON.stringify([...new Set(ids.map(String).filter(Boolean))]));
  } catch {
    // Ignore storage access errors in private or restricted browser modes.
  }
}

function setFavoriteButtonState(button, isActive) {
  button.classList.toggle("is-active", isActive);
  button.setAttribute("aria-pressed", isActive ? "true" : "false");
  button.setAttribute("aria-label", isActive ? "Remove from favorites" : "Add to favorites");
  button.setAttribute("title", isActive ? "Remove from favorites" : "Add to favorites");
}

function syncFavoriteButtons(productId = "", isActive = false) {
  document.querySelectorAll(`[data-favorite-product="${CSS.escape(String(productId))}"]`).forEach((button) => {
    setFavoriteButtonState(button, isActive);
  });
}

function toggleFavoriteProduct(productId = "") {
  const id = String(productId || "").trim();
  if (!id) return false;
  const ids = readFavoriteIds();
  const exists = ids.includes(id);
  const next = exists ? ids.filter((entry) => entry !== id) : [...ids, id];
  writeFavoriteIds(next);
  syncFavoriteButtons(id, !exists);
  return !exists;
}

export function registerStorefrontInteractions() {
  document.addEventListener("click", (event) => {
    const accountControl = event.target.closest("[data-account-control]");
    if (!accountControl && state.accountMenuOpen) {
      closeAccountMenu();
    }

    const reviewCancelControl = event.target.closest("[data-review-cancel]");
    if (reviewCancelControl) {
      event.preventDefault();
      const reviewForm = reviewCancelControl.closest("[data-product-review-form]");
      if (reviewForm) {
        reviewForm.hidden = true;
        reviewForm.dataset.submitting = "0";
        document.querySelectorAll(`[data-edit-my-review="${CSS.escape(reviewForm.id)}"]`).forEach((trigger) => {
          trigger.hidden = false;
          trigger.setAttribute("aria-expanded", "false");
        });
      }
      return;
    }

    const editMyReviewControl = event.target.closest("[data-edit-my-review]");
    if (editMyReviewControl) {
      event.preventDefault();
      const targetId = String(editMyReviewControl.dataset.editMyReview || "").trim();
      const reviewForm = targetId ? document.getElementById(targetId) : null;
      if (reviewForm) {
        reviewForm.hidden = false;
        document.querySelectorAll(`[data-edit-my-review="${CSS.escape(reviewForm.id)}"]`).forEach((trigger) => {
          trigger.hidden = true;
          trigger.setAttribute("aria-expanded", "true");
        });
        updateProductRatingSubmitState(reviewForm);
        reviewForm.querySelector('textarea[name="comment"], [data-rating-input]:not(:disabled)')?.focus();
      }
      return;
    }

    const categoryMenuOpen = event.target.closest("[data-category-menu-open]");
    if (categoryMenuOpen) {
      event.preventDefault();
      openCategoryMenu();
      return;
    }

    const categoryMenuClose = event.target.closest("[data-category-menu-close]");
    if (categoryMenuClose) {
      event.preventDefault();
      closeCategoryMenu();
      return;
    }

    const categoryMenuLink = event.target.closest("[data-category-menu-link]");
    if (categoryMenuLink) {
      closeCategoryMenu();
      closeMobileMenu();
      return;
    }

    if (state.categoryMenuOpen && !event.target.closest("[data-category-menu]")) {
      closeCategoryMenu();
    }

    const heroStep = event.target.closest("[data-hero-step]");
    if (heroStep) {
      setHeroSlide(state.activeHeroSlide + Number(heroStep.dataset.heroStep));
      return;
    }

    const heroSlide = event.target.closest("[data-hero-slide]");
    if (heroSlide) {
      setHeroSlide(Number(heroSlide.dataset.heroSlide));
      return;
    }

    const favoriteButton = event.target.closest("[data-favorite-product]");
    if (favoriteButton) {
      event.preventDefault();
      const isActive = toggleFavoriteProduct(favoriteButton.dataset.favoriteProduct);
      const title = favoriteButton.dataset.favoriteTitle || "Product";
      showToast(isActive ? `${title} added to favorites.` : `${title} removed from favorites.`);
      return;
    }

    const quickBuyButton = event.target.closest("[data-quick-buy-product]");
    if (quickBuyButton) {
      event.preventDefault();
      void openQuickBuy(quickBuyButton.dataset.quickBuyProduct, quickBuyButton.dataset.variantKey || "");
      return;
    }

    if (event.target.closest("[data-quick-buy-close]")) {
      closeQuickBuy();
      return;
    }

    const quickBuyQty = event.target.closest("[data-quick-buy-qty]");
    if (quickBuyQty) {
      void updateQuickBuyQuantity(Number(quickBuyQty.dataset.quickBuyQty || 0));
      return;
    }

    const quickBuyAddress = event.target.closest("[data-quick-buy-address-index]");
    if (quickBuyAddress) {
      void setQuickBuyAddressIndex(quickBuyAddress.dataset.quickBuyAddressIndex);
      return;
    }

    if (event.target.closest("[data-quick-buy-address-edit]")) {
      void toggleQuickBuyAddressEditing();
      return;
    }

    const addButton = event.target.closest("[data-add-to-cart], [data-add-to-cart-product]");
    if (addButton) {
      const productId = addButton.dataset.addToCartProduct || addButton.dataset.addToCart;
      if (!productId) {
        showToast("Product ID unknown.");
        return;
      }
      void addToCart(productId, addButton.dataset.variantKey || "");
      return;
    }

    const filter = event.target.closest("[data-filter]");
    if (filter) {
      state.activeCategory = filter.dataset.filter;
      setHash("shop", {
        category: state.activeCategory,
        ...(state.activeDiscountOnly ? { discount: "1" } : {}),
        ...(state.search ? { search: state.search } : {}),
      });
      return;
    }

    const discountFilter = event.target.closest("[data-discount-filter]");
    if (discountFilter) {
      state.activeDiscountOnly = !state.activeDiscountOnly;
      setHash("shop", {
        ...(state.activeCategory && state.activeCategory !== "all" ? { category: state.activeCategory } : {}),
        ...(state.activeDiscountOnly ? { discount: "1" } : {}),
        ...(state.search ? { search: state.search } : {}),
      });
      return;
    }

    const accountButton = event.target.closest("[data-account-button]");
    if (accountButton) {
      event.preventDefault();
      void fetchSessionStatus().then(() => {
        updateAccountButton();
        if (!state.sessionAuthenticated) {
          navigateToAccount("#account");
          return;
        }
        toggleAccountMenu();
      });
      return;
    }

    const accountMenuLogin = event.target.closest("[data-account-menu-login]");
    if (accountMenuLogin) {
      event.preventDefault();
      closeAccountMenu();
      void fetchSessionStatus().then(() => {
        navigateToAccount();
      });
      return;
    }

    const accountMenuCart = event.target.closest("[data-account-menu-cart]");
    if (accountMenuCart) {
      event.preventDefault();
      closeAccountMenu();
      openCart();
      return;
    }

    const checkoutButton = event.target.closest("[data-cart-checkout]");
    if (checkoutButton) {
      const entries = cartEntries();
      if (!entries.length) {
        showToast("Your bag is empty");
        return;
      }
      closeCart();
      setHash("checkout");
      return;
    }

    const checkoutLogin = event.target.closest("[data-checkout-login]");
    if (checkoutLogin) {
      event.preventDefault();
      void fetchSessionStatus().then(() => {
        navigateToAccount();
      });
      return;
    }

    const reviewScroll = event.target.closest("[data-review-scroll]");
    if (reviewScroll) {
      event.preventDefault();
      const targetSelector = String(reviewScroll.dataset.reviewScroll || "").trim();
      const target = targetSelector ? document.querySelector(targetSelector) : null;
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        const focusTarget = target.querySelector("[data-rating-input]:not(:disabled), textarea[name='comment']");
        focusTarget?.focus({ preventScroll: true });
      }, 250);
      return;
    }

    const deliveryOption = event.target.closest("[data-delivery-option]");
    if (deliveryOption) {
      const context = String(deliveryOption.dataset.deliveryContext || "").trim().toLowerCase();
      const productId = deliveryOption.dataset.deliveryProduct;
      const key = deliveryOption.dataset.deliveryKey || "";
      if (!key) return;

      if (context === "quick-buy" && productId) {
        state.activeProductShippingSelection[String(productId)] = key;
        void refreshQuickBuy();
        return;
      }

      if (productId) {
        state.activeProductShippingSelection[String(productId)] = key;
        state.activeCheckoutShippingKey = key;
        renderProductPage(productId);
        return;
      }

      if (context === "checkout") {
        state.activeCheckoutShippingKey = key;
        renderCheckoutPage();
        return;
      }
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

    const variantOption = event.target.closest("[data-variant-key]");
    if (variantOption) {
      const productId = variantOption.dataset.variantProduct;
      const item = getProductById(productId) || getProductById(state.activeProductId);
      if (!item) return;

      const variants = getItemVariants(item);
      const key = String(variantOption.dataset.variantKey || "").trim();
      const selected =
        variants.find((entry) =>
          String(firstNonNull(entry.__key, entry.__index, entry.variant_id, entry.product_variant_id, entry.id, entry.sku, entry.code, entry.name, entry.title) || "") ===
          key,
        ) ||
        (key ? variants.find((entry, index) => String(index) === key) : null);
      if (!selected) return;

      setActiveProductVariantSelection(productId, selected);
      const selectedGallery = normalizeGallery(item, selected);
      state.activeMedia = selectedGallery.length ? selectedGallery[0] : item.image ?? 0;
      renderProductPage(productId);
      return;
    }

    const variantGroupedOption = event.target.closest("[data-variant-option-name]");
    if (variantGroupedOption) {
      const productId = variantGroupedOption.dataset.variantOptionProduct;
      const optionName = variantGroupedOption.dataset.variantOptionName;
      const optionValue = variantGroupedOption.dataset.variantOptionValue;
      const item = getProductById(productId) || getProductById(state.activeProductId);
      if (!item || !optionName || !optionValue) return;

      const selected = selectProductVariantOption(productId, optionName, optionValue);
      const selectedGallery = normalizeGallery(item, selected);
      state.activeMedia = selectedGallery.length ? selectedGallery[0] : item.image ?? 0;
      renderProductPage(productId);
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

    if (event.target.closest("[data-cart-product-link]")) {
      closeCart();
      return;
    }

    const cartRemove = event.target.closest("[data-cart-remove-key]");
    if (cartRemove) {
      void setCartQuantity(cartRemove.dataset.cartRemoveKey, 0);
      return;
    }

    const cartQty = event.target.closest("[data-cart-key]");
    if (cartQty) {
      void updateQuantity(cartQty.dataset.cartKey, Number(cartQty.dataset.delta));
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
    const reviewForm = event.target.closest("[data-product-review-form]");
    if (reviewForm) {
      updateProductRatingSubmitState(reviewForm);
      return;
    }

    const cartQuantity = event.target.closest("[data-cart-quantity]");
    if (cartQuantity) {
      void setCartQuantity(cartQuantity.dataset.cartQuantity, cartQuantity.value);
      return;
    }

    const sort = event.target.closest("[data-sort-select]");
    if (!sort) return;
    state.activeSort = sort.value;
    renderShopPage();
  });

  document.addEventListener("input", (event) => {
    const reviewForm = event.target.closest("[data-product-review-form]");
    if (reviewForm) updateProductRatingSubmitState(reviewForm);
  });

  document.querySelector("[data-search-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.search = new FormData(event.currentTarget).get("q")?.toString().trim() || "";
    setHash("shop", {
      ...(state.activeCategory && state.activeCategory !== "all" ? { category: state.activeCategory } : {}),
      ...(state.activeDiscountOnly ? { discount: "1" } : {}),
      ...(state.search ? { search: state.search } : {}),
    });
  });

  const newsletterForm = document.querySelector("[data-newsletter-form]");
  const newsletterStorageKey = "pajulina:newsletter-email";
  const showNewsletterSubscribedState = (form, email = "") => {
    const message = form.querySelector("[data-newsletter-message]");
    form.classList.add("is-subscribed");
    form.querySelector('input[name="email"]')?.setAttribute("hidden", "");
    form.querySelector('button[type="submit"]')?.setAttribute("hidden", "");
    if (message) {
      message.classList.remove("is-error");
      message.classList.add("is-success");
      message.textContent = email ? `You're on the list: ${email}` : "You're on the list. Watch your inbox for updates.";
    }
  };

  try {
    const rememberedNewsletterEmail = window.localStorage?.getItem(newsletterStorageKey) || "";
    if (newsletterForm && rememberedNewsletterEmail) showNewsletterSubscribedState(newsletterForm, rememberedNewsletterEmail);
  } catch {
    // Ignore storage access errors in private or restricted browser modes.
  }

  newsletterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const emailInput = form.querySelector('input[name="email"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const message = form.querySelector("[data-newsletter-message]");
    const email = String(emailInput?.value || "").trim();

    if (!email || !emailInput?.checkValidity()) {
      if (message) {
        message.classList.remove("is-success");
        message.classList.add("is-error");
        message.textContent = "Enter a valid email address.";
      }
      showToast("Enter a valid email address.");
      emailInput?.focus();
      return;
    }

    const previousLabel = submitButton?.textContent || "Sign up";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Signing up...";
    }
    if (message) {
      message.classList.remove("is-success", "is-error");
      message.textContent = "";
    }

    fetch("/api/storefront/newsletter", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        source: "storefront_footer",
        page: window.location.hash || "#home",
      }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || "Could not sign up for emails.");
        }
        try {
          window.localStorage?.setItem(newsletterStorageKey, email);
        } catch {
          // Ignore storage access errors in private or restricted browser modes.
        }
        showNewsletterSubscribedState(form, email);
        showToast(payload?.message || "You're signed up for news and offers.");
      })
      .catch((error) => {
        const text = error?.message || "Could not sign up for emails.";
        if (message) {
          message.classList.remove("is-success");
          message.classList.add("is-error");
          message.textContent = text;
        }
        showToast(text);
      })
      .finally(() => {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = previousLabel;
        }
      });
  });

  document.addEventListener("submit", (event) => {
  const quickBuyForm = event.target.closest("[data-quick-buy-form]");
    if (quickBuyForm) {
      event.preventDefault();
      void handleQuickBuySubmit(event);
      return;
    }

    const reviewForm = event.target.closest("[data-product-review-form]");
    if (reviewForm) {
      event.preventDefault();
      void handleProductReviewSubmit(event);
      return;
    }

    const checkoutForm = event.target.closest("[data-checkout-form]");
    if (!checkoutForm) return;
    event.preventDefault();
    void handleCheckoutSubmit(event);
  });

  window.addEventListener("hashchange", route);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCart();
      closeQuickBuy();
      closeCategoryMenu();
      closeMobileMenu();
      closeAccountMenu();
    }
  });

  void initializeStorefrontSession({ force: true, hydrateCart: true }).then(() => {
    route();
  });
}
