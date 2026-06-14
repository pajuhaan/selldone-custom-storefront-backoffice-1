import * as storefront from "./app-core.js?v=storefront-cart-links-20260614";

const {
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
  setCartQuantity,
  setHash,
  setHeroSlide,
  shadeName,
  showToast,
  toggleAccountMenu,
  updateAccountButton,
  updateQuantity,
  normalizeGallery,
} = storefront;

export function registerStorefrontInteractions() {
  document.addEventListener("click", (event) => {
    const accountControl = event.target.closest("[data-account-control]");
    if (!accountControl && state.accountMenuOpen) {
      closeAccountMenu();
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

    const deliveryOption = event.target.closest("[data-delivery-option]");
    if (deliveryOption) {
      const context = String(deliveryOption.dataset.deliveryContext || "").trim().toLowerCase();
      const productId = deliveryOption.dataset.deliveryProduct;
      const key = deliveryOption.dataset.deliveryKey || "";
      if (!key) return;

      if (productId) {
        state.activeProductShippingSelection[String(productId)] = key;
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

  document.querySelector("[data-search-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.search = new FormData(event.currentTarget).get("q")?.toString().trim() || "";
    setHash("shop", {
      ...(state.activeCategory && state.activeCategory !== "all" ? { category: state.activeCategory } : {}),
      ...(state.activeDiscountOnly ? { discount: "1" } : {}),
      ...(state.search ? { search: state.search } : {}),
    });
  });

  document.querySelector("[data-newsletter-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    event.currentTarget.reset();
    showToast("Thanks for signing up");
  });

  document.addEventListener("submit", (event) => {
    const checkoutForm = event.target.closest("[data-checkout-form]");
    if (!checkoutForm) return;
    event.preventDefault();
    void handleCheckoutSubmit(event);
  });

  window.addEventListener("hashchange", route);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCart();
      closeMobileMenu();
      closeAccountMenu();
    }
  });

  renderCart();
  route();
}
