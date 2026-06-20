function valueIsObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function firstDateValue(order = {}) {
  return order.created_at || order.createdAt || order.reserved_at || order.payed_at || order.updated_at || order.date || "";
}

function formatOrderDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function pickNumeric(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key];
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
}

function normalizeOrderItems(order = {}, firstArrayValue) {
  return firstArrayValue(
    order.items,
    order.basket_items,
    order.lines,
    order.products,
    order.order_items,
    order.data?.items,
    order.bill?.items,
  );
}

function orderIdentifier(order = {}, firstNonNull) {
  return String(firstNonNull(order.code, order.order_code, order.orderCode, order.id, order.basket_id, order.basketId, "") || "").trim();
}

function orderCurrency(order = {}, firstNonNull) {
  return String(firstNonNull(order.currency, order.currency_code, order.bill?.currency, order.payment?.currency, "USD") || "USD").trim();
}

function orderTotal(order = {}) {
  return pickNumeric(order, ["final_total", "grand_total", "total", "payable", "payment_amount", "pay_amount", "amount", "price", "sum"]);
}

function orderStatus(order = {}, firstNonNull) {
  return String(firstNonNull(order.status, order.delivery_state, order.payment_status, order.state, order.order_state, order.reserved ? "Reserved" : "", "Processing") || "Processing").trim();
}

function orderStatusTone(status = "") {
  const normalized = String(status || "").toLowerCase();
  if (/(complete|deliver|fulfilled|paid|accept|sent|done|success)/.test(normalized)) return "success";
  if (/(cancel|reject|fail|refund|void|expired)/.test(normalized)) return "danger";
  if (/(pending|wait|reserv|process|review|hold)/.test(normalized)) return "warning";
  return "neutral";
}

function itemTitle(item = {}, firstNonNull) {
  const product = valueIsObject(item.product) ? item.product : {};
  return String(firstNonNull(item.title, item.name, item.product_title, product.title, product.name, "Item") || "Item").trim();
}

function itemQuantity(item = {}, firstNonNull) {
  const qty = Number(firstNonNull(item.count, item.quantity, item.qty, item.num, 1));
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function normalizeSelldoneImageUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalizeCdnPath = (path) => {
    const match = path.match(/^(.*?)shops_(\d+)_(products|categories|blogs|avatars)_(.+)$/i);
    if (match) return `${match[1]}shops/${match[2]}/${match[3]}/${match[4]}`;
    return path;
  };
  if (/^https?:\/\//i.test(raw)) {
    return normalizeCdnPath(raw);
  }
  const path = raw.replace(/^\/+/, "");
  if (path.startsWith("app/")) return `https://cdn.selldone.com/${normalizeCdnPath(path)}`;
  if (path.startsWith("shops_")) return `https://cdn.selldone.com/app/${normalizeCdnPath(path)}`;
  if (path.startsWith("shops/")) return `https://cdn.selldone.com/app/${path}`;
  return `https://cdn.selldone.com/app/${normalizeCdnPath(path)}`;
}

function imageFromList(value, firstArrayValue, firstNonNull) {
  const list = firstArrayValue(value);
  for (const entry of list) {
    if (typeof entry === "string" && entry.trim()) return entry.trim();
    if (valueIsObject(entry)) {
      const found = firstNonNull(entry.url, entry.src, entry.path, entry.image, entry.icon, "");
      if (found) return String(found).trim();
    }
  }
  return "";
}

function itemImageUrl(item = {}, firstArrayValue, firstNonNull) {
  const product = valueIsObject(item.product) ? item.product : {};
  const raw = firstNonNull(
    item.image,
    item.image_url,
    item.imageUrl,
    item.photo,
    item.icon,
    item.thumbnail,
    item.product_image,
    item.productImage,
    product.image,
    product.image_url,
    product.imageUrl,
    product.photo,
    product.icon,
    product.thumbnail,
    imageFromList(item.images, firstArrayValue, firstNonNull),
    imageFromList(item.gallery, firstArrayValue, firstNonNull),
    imageFromList(product.images, firstArrayValue, firstNonNull),
    imageFromList(product.gallery, firstArrayValue, firstNonNull),
    "",
  );
  return normalizeSelldoneImageUrl(raw);
}

function itemProductHref(item = {}, firstNonNull) {
  const product = valueIsObject(item.product) ? item.product : {};
  const id = String(firstNonNull(item.product_id, item.productId, product.id, product.product_id, "") || "").trim();
  return id ? `#product/${encodeURIComponent(id)}` : "#account/orders";
}

function itemProductId(item = {}, firstNonNull) {
  const product = valueIsObject(item.product) ? item.product : {};
  return String(firstNonNull(item.product_id, item.productId, item.product?.id, product.id, product.product_id, "") || "").trim();
}

function productFromPayload(payload = {}, firstNonNull) {
  const product = firstNonNull(
    payload?.product,
    payload?.item,
    payload?.data?.product,
    payload?.data?.item,
    payload?.result?.product,
    payload?.result?.item,
    payload?.payload?.product,
    payload?.payload?.item,
    payload?.data,
    payload?.result,
    payload?.payload,
    payload,
  );
  return valueIsObject(product) ? product : {};
}

function productTitleFromProduct(product = {}, firstNonNull) {
  return String(firstNonNull(product.title, product.name, product.product_title, product.productTitle, "Product") || "Product").trim();
}

function productImageFromProduct(product = {}, firstArrayValue, firstNonNull) {
  const raw = firstNonNull(
    product.image,
    product.image_url,
    product.imageUrl,
    product.photo,
    product.icon,
    product.thumbnail,
    imageFromList(product.images, firstArrayValue, firstNonNull),
    imageFromList(product.gallery, firstArrayValue, firstNonNull),
    "",
  );
  return normalizeSelldoneImageUrl(raw);
}

async function fetchOrderProductCards(orders = [], deps) {
  const { firstArrayValue, firstNonNull } = deps;
  const ids = [...new Set(
    orders
      .flatMap((order) => normalizeOrderItems(order, firstArrayValue))
      .map((item) => itemProductId(item, firstNonNull))
      .filter(Boolean),
  )].slice(0, 40);
  if (!ids.length) return new Map();

  const settled = await Promise.allSettled(ids.map(async (id) => {
    const response = await fetch(`/api/storefront/products/${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) return [id, null];
    const product = productFromPayload(payload, firstNonNull);
    return [
      id,
      {
        image: productImageFromProduct(product, firstArrayValue, firstNonNull),
        title: productTitleFromProduct(product, firstNonNull),
      },
    ];
  }));

  const cards = new Map();
  settled.forEach((entry) => {
    if (entry.status !== "fulfilled" || !entry.value?.[0] || !entry.value?.[1]) return;
    cards.set(entry.value[0], entry.value[1]);
  });
  return cards;
}

function orderStatusStepIndex(status = "") {
  const normalized = String(status || "").toLowerCase();
  if (/(deliver|complete|fulfilled|done|success)/.test(normalized)) return 4;
  if (/(ship|sent|transport)/.test(normalized)) return 3;
  if (/(pack|prepare|prepar|accept)/.test(normalized)) return 2;
  if (/(paid|payment|pay)/.test(normalized)) return 1;
  return 0;
}

function renderOrderStatusVisual(status = "", tone = "", escapeHtml) {
  const steps = ["Placed", "Paid", "Packed", "Shipped", "Delivered"];
  const activeIndex = orderStatusStepIndex(status);
  const progress = Math.max(0, Math.min(100, (activeIndex / (steps.length - 1)) * 100));
  const danger = tone === "danger";
  return `
    <div class="account-order-status-visual account-order-status-visual--${escapeHtml(tone)}" style="--order-progress:${progress}%">
      <div class="account-order-status-line" aria-hidden="true"><span></span></div>
      <div class="account-order-steps" aria-label="Order status progress">
        ${steps
          .map((step, index) => {
            const complete = !danger && index <= activeIndex;
            const current = !danger && index === activeIndex;
            return `<span class="account-order-step ${complete ? "is-complete" : ""} ${current ? "is-current" : ""} ${danger && index === 0 ? "is-danger" : ""}"><i aria-hidden="true"></i><small>${escapeHtml(step)}</small></span>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderOrderCard(order, deps) {
  const { escapeHtml, firstArrayValue, firstNonNull, formatPrice, productCards = new Map() } = deps;
  const id = orderIdentifier(order, firstNonNull);
  const currency = orderCurrency(order, firstNonNull);
  const total = orderTotal(order);
  const status = orderStatus(order, firstNonNull);
  const tone = orderStatusTone(status);
  const items = normalizeOrderItems(order, firstArrayValue);
  const visibleItems = items.slice(0, 8);
  const totalLabel = Number.isFinite(total) ? formatPrice(total, currency) : "Unavailable";
  const itemCountLabel = `${items.length} ${items.length === 1 ? "item" : "items"}`;

  return `
    <article class="account-order-card account-order-card--${tone}">
      <span class="account-order-card-ribbon" aria-hidden="true"></span>
      <div class="account-order-card-head">
        <div class="account-order-title-block">
          <span class="account-order-eyebrow">Physical order</span>
          <h2>${id ? `Order ${escapeHtml(id)}` : "Selldone order"}</h2>
          <p class="account-order-date">${escapeHtml(formatOrderDate(firstDateValue(order)))}</p>
        </div>
        <span class="account-order-status account-order-status--${tone}">${escapeHtml(status)}</span>
      </div>
      <div class="account-order-meta" aria-label="Order summary">
        <span><small>Total</small><strong>${escapeHtml(totalLabel)}</strong></span>
        <span><small>Items</small><strong>${escapeHtml(itemCountLabel)}</strong></span>
      </div>
      ${renderOrderStatusVisual(status, tone, escapeHtml)}
      ${
        visibleItems.length
          ? `<div class="account-order-products-wrap"><div class="account-order-items-head"><span>Products</span>${items.length > visibleItems.length ? `<strong>+${items.length - visibleItems.length} more</strong>` : ""}</div><div class="account-order-product-strip">${visibleItems
              .map((item) => {
                const productId = itemProductId(item, firstNonNull);
                const productCard = productCards.get(productId) || {};
                const title = productCard.title || itemTitle(item, firstNonNull);
                const image = productCard.image || itemImageUrl(item, firstArrayValue, firstNonNull);
                const href = itemProductHref(item, firstNonNull);
                const quantity = itemQuantity(item, firstNonNull);
                return `<a class="account-order-thumb" href="${escapeHtml(href)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" />` : `<span aria-hidden="true"></span>`}${quantity > 1 ? `<b>${escapeHtml(`x${quantity}`)}</b>` : ""}</a>`;
              })
              .join("")}</div></div>`
          : `<div class="account-order-items-empty">Item details are not available in this order list response.</div>`
      }
      <div class="account-order-footer">
        <span>Synced from Selldone physical basket orders.</span>
        <a class="text-link" href="#shop">Shop again</a>
      </div>
    </article>
  `;
}

function orderListFromPayload(payload = {}, firstArrayValue) {
  return firstArrayValue(
    payload.orders,
    payload.baskets,
    payload.items,
    payload.data?.orders,
    payload.data?.baskets,
    payload.data?.items,
    payload.result?.orders,
    payload.result?.baskets,
    payload.payload?.orders,
    payload.payload?.baskets,
  );
}

export async function renderOrderHistoryPage(deps) {
  const { els, escapeHtml, firstArrayValue, firstNonNull, formatPrice, showToast } = deps;

  els.app.innerHTML = `
    <div class="page-shell">
      <nav class="breadcrumbs" aria-label="Account path">
        <a href="#home">Home</a><span>/</span><a href="#account/profile">Account</a><span>/</span><strong>Orders</strong>
      </nav>
      <section class="section">
        <div class="account-profile-panel">
          <div class="account-profile-head">
            <div>
              <h1>Order history</h1>
              <p class="product-meta">Loading your physical Selldone orders.</p>
            </div>
          </div>
          <div class="account-order-history-empty">
            <strong>Loading orders...</strong>
            <p>Please wait while Selldone returns your order history.</p>
          </div>
        </div>
      </section>
    </div>
  `;

  try {
    const response = await fetch("/api/storefront/orders/history?type=PHYSICAL&limit=40", { headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || "Could not load order history.");
    }

    const orders = orderListFromPayload(payload, firstArrayValue);
    const productCards = await fetchOrderProductCards(orders, { firstArrayValue, firstNonNull });
    const latestDate = orders
      .map((order) => firstDateValue(order))
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    const latestLabel = latestDate ? formatOrderDate(latestDate) : "No orders yet";
    els.app.innerHTML = `
      <div class="page-shell">
        <nav class="breadcrumbs" aria-label="Account path">
          <a href="#home">Home</a><span>/</span><a href="#account/profile">Account</a><span>/</span><strong>Orders</strong>
        </nav>
        <section class="section">
          <div class="account-profile-panel">
            <div class="account-orders-hero">
              <div>
                <span class="account-order-eyebrow">Selldone storefront</span>
                <h1>Order history</h1>
                <p>${orders.length ? "Your physical orders are synced from Selldone and grouped here for quick review." : "No completed physical orders were returned by Selldone yet."}</p>
              </div>
              <div class="account-orders-stats" aria-label="Order history summary">
                <span><small>Total orders</small><strong>${orders.length}</strong></span>
                <span><small>Latest order</small><strong>${escapeHtml(latestLabel)}</strong></span>
              </div>
            </div>
            ${
              orders.length
                ? `<div class="account-order-history-list">${orders.map((order) => renderOrderCard(order, { escapeHtml, firstArrayValue, firstNonNull, formatPrice, productCards })).join("")}</div>`
                : `<div class="account-order-history-empty"><strong>No orders yet</strong><p>Your completed physical orders will appear here after checkout.</p><div class="account-profile-actions"><a class="black-button" href="#shop">Back to shop</a></div></div>`
            }
          </div>
        </section>
      </div>
    `;
  } catch (error) {
    const message = error?.message || "Could not load order history.";
    showToast(message);
    els.app.innerHTML = `
      <div class="page-shell">
        <nav class="breadcrumbs" aria-label="Account path">
          <a href="#home">Home</a><span>/</span><a href="#account/profile">Account</a><span>/</span><strong>Orders</strong>
        </nav>
        <section class="section">
          <div class="account-profile-panel">
            <div class="account-profile-head">
              <div>
                <h1>Order history</h1>
                <p class="product-meta">Selldone order history is unavailable right now.</p>
              </div>
            </div>
            <div class="account-order-history-empty">
              <strong>Could not load orders</strong>
              <p>${escapeHtml(message)}</p>
              <div class="account-profile-actions">
                <a class="black-button" href="#account/orders">Try again</a>
                <a class="text-link" href="#shop">Back to shop</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
  }
}
