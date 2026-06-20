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

function itemTitle(item = {}, firstNonNull) {
  const product = valueIsObject(item.product) ? item.product : {};
  return String(firstNonNull(item.title, item.name, item.product_title, product.title, product.name, "Item") || "Item").trim();
}

function itemQuantity(item = {}, firstNonNull) {
  const qty = Number(firstNonNull(item.count, item.quantity, item.qty, item.num, 1));
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function renderOrderCard(order, deps) {
  const { escapeHtml, firstArrayValue, firstNonNull, formatPrice } = deps;
  const id = orderIdentifier(order, firstNonNull);
  const currency = orderCurrency(order, firstNonNull);
  const total = orderTotal(order);
  const status = orderStatus(order, firstNonNull);
  const items = normalizeOrderItems(order, firstArrayValue);
  const visibleItems = items.slice(0, 4);
  const detailHref = "#account/orders";

  return `
    <article class="account-order-card">
      <div class="account-order-card-head">
        <div>
          <span class="account-order-date">${escapeHtml(formatOrderDate(firstDateValue(order)))}</span>
          <h2>${id ? `Order ${escapeHtml(id)}` : "Selldone order"}</h2>
        </div>
        <span class="account-order-status">${escapeHtml(status)}</span>
      </div>
      <div class="account-order-meta">
        <span>${Number.isFinite(total) ? escapeHtml(formatPrice(total, currency)) : "Total unavailable"}</span>
        <span>${items.length} ${items.length === 1 ? "item" : "items"}</span>
      </div>
      ${
        visibleItems.length
          ? `<ul class="account-order-items">${visibleItems
              .map((item) => `<li><span>${escapeHtml(itemTitle(item, firstNonNull))}</span><strong>x${itemQuantity(item, firstNonNull)}</strong></li>`)
              .join("")}${items.length > visibleItems.length ? `<li><span>More items</span><strong>+${items.length - visibleItems.length}</strong></li>` : ""}</ul>`
          : `<p class="product-meta">Item details are not available in this order list response.</p>`
      }
      <div class="account-profile-actions">
        <a class="text-link" href="${detailHref}">View order</a>
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
                <p class="product-meta">${orders.length ? `${orders.length} physical ${orders.length === 1 ? "order" : "orders"} loaded from Selldone.` : "No completed physical orders were returned by Selldone yet."}</p>
              </div>
            </div>
            ${
              orders.length
                ? `<div class="account-order-history-list">${orders.map((order) => renderOrderCard(order, { escapeHtml, firstArrayValue, firstNonNull, formatPrice })).join("")}</div>`
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
