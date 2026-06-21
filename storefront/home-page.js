function renderHeroCarousel({ state, heroSlides, escapeHtml }) {
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

export function renderHomePage(deps) {
  const {
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
    featureCard,
    renderHomeBlogBand,
    storyCard,
    getCategoryCards,
    categoryCard,
  } = deps;

  const products = getProductsForUi();
  if (!products.length) {
    renderLiveCatalogEmptyState("Selldone XAPI catalog is unavailable", "The storefront is configured to use live Selldone XAPI data only.");
    return;
  }

  const deals = homeDeals(products, 4);
  const today = homeDeals(products, 6, 4);
  const recommended = homeRecommended(products, 4);
  const newItems = homeNewProducts(products, 4);
  const categoryCards = getCategoryCards();
  const homeCreativeImages = {
    routine: "assets/home-routine-treat.svg",
    fragrant: "assets/home-most-fragrant.svg",
    detector: "assets/home-detector-mode.svg",
    glow: "assets/home-glow-worthy.svg",
  };
  const magazineImages = {
    pride: "assets/home-magazine-pride.png",
    muse: "assets/home-magazine-muse.png",
    community: "assets/home-magazine-community.png",
    giftCard: "assets/home-magazine-gift-card.png",
  };

  els.app.innerHTML = `
    <div class="page-shell">
      ${renderDataStatus()}
      ${renderHeroCarousel({ state, heroSlides, escapeHtml })}
      <section class="promo-grid promo-grid--editorial" aria-label="Featured offers">
        <article class="promo-card hot promo-card--membership">
          <div class="promo-body">
            <span class="eyebrow">Rewards are glowing</span>
            <h1>Members save up to 20%</h1>
            <p>Fresh color, daily skin care, and easy gifts for every routine.</p>
            <a class="pill-button light" href="#shop?discount=1">Shop discounts</a>
            <div class="promo-discs" aria-hidden="true">
              <span><strong>diamond</strong><em>20%</em></span>
              <span><strong>platinum</strong><em>15%</em></span>
              <span><strong>member</strong><em>10%</em></span>
            </div>
          </div>
        </article>
        <article class="promo-card orange promo-card--image promo-card--ritual">
          <img src="assets/promo-obsession-still.svg" alt="" />
          <div class="promo-body">
            <span class="eyebrow">Only here</span>
            <h2>Worth the obsession</h2>
            <p>Soft-focus essentials for lips, skin, and everyday glow.</p>
            <a class="pill-button" href="#shop">Shop now</a>
          </div>
        </article>
        <article class="promo-card blue promo-card--image promo-card--summer">
          <img src="assets/promo-summer-glow.svg" alt="" />
          <div class="promo-body">
            <span class="eyebrow">Summer beauty</span>
            <h2>New arrivals, glowing now</h2>
            <p>Sunlit skin care, sheer color, and fresh shine.</p>
            <a class="pill-button" href="#shop?category=skincare">Shop new</a>
          </div>
        </article>
      </section>

      ${renderProductSection("Deals for you", `${deals.length} items`, deals, "product-row")}
      ${renderDealStrip("Today's deals", today)}

      ${renderHomeBlogBand()}

      <section class="section">
        <div class="section-head">
          <div>
            <h2>Shop by category</h2>
            <p>Explore Pajulina Beauty categories with their storefront images.</p>
          </div>
        </div>
        <div class="category-grid category-grid--home">
          ${categoryCards.map(([key, label, image]) => categoryCard(key, label, image)).join("")}
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
          ${storyCard("A routine that feels like a treat", "Skin care favorites for fresh starts.", "50% 50%", false, homeCreativeImages.routine)}
          ${storyCard("Most fragrant", "Easy scents for day and night.", "50% 50%", false, homeCreativeImages.fragrant)}
          ${storyCard("Detector mode", "Find color, texture, and glow in one place.", "50% 50%", false, homeCreativeImages.detector)}
          ${storyCard("Glow-worthy acts", "Care picks that keep skin feeling soft.", "50% 50%", false, homeCreativeImages.glow)}
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
          <h2>All things Pajulina Beauty</h2>
        </div>
        <div class="magazine-row">
          ${storyCard("Pride, Amplified", "Joyful color made for every day.", "50% 50%", true, magazineImages.pride)}
          ${storyCard("Apply to be a part of the 2026 Muse cohort", "Creators, artists, and beauty voices.", "50% 50%", true, magazineImages.muse)}
          ${storyCard("Join the Pajulina Beauty Community today", "Tips, events, and new favorites.", "50% 50%", true, magazineImages.community)}
          ${storyCard("Give a Pajulina Beauty gift card", "The easiest gift for every routine.", "50% 50%", true, magazineImages.giftCard)}
        </div>
      </section>
    </div>
  `;
}
