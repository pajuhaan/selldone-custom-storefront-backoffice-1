export function createCustomerFeature(deps) {
  const {
    state,
    els,
    ACCENTS,
    statCard,
    formatNumber,
    formatPercent,
    formatMoney,
    formatFitMoney,
    formatDate,
    formatShortDate,
    titleCase,
    getInitials,
    escapeHtml,
    escapeAttribute,
    tableEmpty,
    emptyState,
    statusRows,
    renderLineChart,
    productInfoPanel,
    productDetailRawRows,
    formatRawValue,
    normalizeOrders,
    normalizeArticleTags,
    readFirstNumber,
    buildSeriesFromItems,
    requestJson,
    notify,
    splitTags,
    ensureSelectOption,
    toDateInputValue,
    renderSuite,
    renderSettings,
    renderNavBadges,
    selldone,
  } = deps;

  function normalizeCustomers(customers) {
    return Array.isArray(customers) ? customers.map((customer) => normalizeCustomer(customer)) : [];
  }

  function normalizeCustomer(customer = {}) {
    const address = normalizeCustomerAddress(customer.address);
    const billing = normalizeCustomerAddress(customer.billing);
    const segments = normalizeArticleTags(customer.segments || customer.segment || []);
    const clv = normalizeCustomerClv(customer);
    const recentOrders = [
      ...(Array.isArray(customer.baskets) ? customer.baskets : []),
      ...(Array.isArray(customer.pos_baskets) ? customer.pos_baskets : []),
    ];
    const name = firstCustomerText(customer.name, customer.full_name, customer.user?.name, customer.email, customer.phone, "Unnamed customer");
    const currency = customer.currency || clv.currency || "USD";

    return {
      id: customer.id ?? customer.customer_id ?? customer.user_id ?? name,
      userId: customer.user_id || "",
      name,
      email: firstCustomerText(customer.email, customer.user?.email),
      phone: firstCustomerText(customer.phone, customer.mobile, customer.user?.phone),
      level: String(customer.level || "BRONZE").toUpperCase(),
      subscribed: Boolean(customer.subscribed),
      currency,
      segments,
      chips: Number(customer.chips || 0),
      birthday: customer.birthday || "",
      sex: customer.sex || "",
      access: customer.access !== false,
      banned: Boolean(customer.banned),
      country: firstCustomerText(customer.country, address.country, billing.country),
      address,
      billing,
      notes: firstCustomerText(customer.notes, customer.note),
      loginAt: customer.login_at || customer.loginAt || "",
      purchaseAt: customer.purchase_at || customer.purchaseAt || "",
      createdAt: customer.created_at || customer.createdAt || "",
      updatedAt: customer.updated_at || customer.updatedAt || customer.created_at || "",
      clv: clv.value,
      clvCurrency: currency,
      recentOrders,
      activity: customer.activity || {},
      raw: customer,
    };
  }

  function firstCustomerText(...values) {
    for (const value of values) {
      if (typeof value !== "string" && typeof value !== "number") continue;
      const text = String(value).trim();
      if (text && text !== "[object Object]") return text;
    }
    return "";
  }

  function normalizeCustomerAddress(address = {}) {
    if (typeof address === "string") {
      const text = address.trim();
      return text ? { address: text } : {};
    }
    if (!address || typeof address !== "object" || Array.isArray(address)) return {};
    return {
      name: firstCustomerText(address.name),
      phone: firstCustomerText(address.phone),
      address: firstCustomerText(address.address, address.street, address.line1),
      country: firstCustomerText(address.country),
      state: firstCustomerText(address.state, address.province),
      city: firstCustomerText(address.city),
      postal: firstCustomerText(address.postal, address.zip, address.postal_code),
      unit: firstCustomerText(address.unit),
      no: firstCustomerText(address.no),
      message: firstCustomerText(address.message),
      location: address.location || null,
    };
  }

  function normalizeCustomerClv(customer = {}) {
    const clvRows = Array.isArray(customer.clv) ? customer.clv : [];
    if (clvRows.length) {
      return clvRows.reduce(
        (result, row) => {
          const value = readFirstNumber(row || {}, ["value", "amount", "total", "sell", "sales", "sum", "balance"]);
          return {
            value: result.value + value,
            currency: result.currency || row?.currency || customer.currency || "USD",
          };
        },
        { value: 0, currency: customer.currency || "USD" },
      );
    }
    return {
      value: readFirstNumber(customer, ["clv_value", "lifetime_value", "total_spent", "orders_sum", "sell", "sales"]),
      currency: customer.currency || "USD",
    };
  }

  function renderCustomers() {
    if (!els.customerRows) return;

    const summary = getCustomerSummary();
    const filtered = getFilteredCustomers();
    const customerError = getCustomerError();
    const visibleCustomers = filtered.slice(0, 100);

    els.customerKpis.innerHTML = [
      statCard({
        title: "Total Customers",
        value: formatNumber(summary.total),
        icon: "bi-people",
        accent: "purple",
        trend: summary.total ? "Live" : "Waiting",
        note: "Loaded from Selldone customers",
        values: buildCustomerSeries(() => 1),
      }),
      statCard({
        title: "Subscribers",
        value: formatNumber(summary.subscribed),
        icon: "bi-envelope-check",
        accent: "blue",
        trend: summary.total ? formatPercent((summary.subscribed / Math.max(summary.total, 1)) * 100) : "No data",
        note: "Marketing opt-in customers",
        values: buildCustomerSeries((customer) => (customer.subscribed ? 1 : 0)),
      }),
      statCard({
        title: "Customer CLV",
        value: formatFitMoney(summary.clv, summary.currency),
        icon: "bi-stars",
        accent: "green",
        trend: summary.clv ? "Returned" : "No CLV",
        note: "Combined lifetime value",
        values: buildCustomerSeries((customer) => customer.clv || customer.chips || 0),
      }),
      statCard({
        title: "Restricted",
        value: formatNumber(summary.restricted),
        icon: "bi-shield-exclamation",
        accent: "orange",
        trend: summary.restricted ? "Review" : "Clear",
        note: "Banned or no-access accounts",
        values: buildCustomerSeries((customer) => (customer.banned || !customer.access ? 1 : 0)),
      }),
    ].join("");

    if (els.customerResultMeta) {
      const total = summary.total || state.dashboard.customerTotal || state.dashboard.customers.length;
      const loaded = state.dashboard.customers.length;
      els.customerResultMeta.textContent = customerError && !loaded
        ? "Customer API needs attention"
        : `Showing ${formatNumber(visibleCustomers.length)} of ${formatNumber(filtered.length)} matching customers (${formatNumber(total)} total)`;
    }

    const emptyMarkup = customerError && !state.dashboard.customers.length
      ? emptyState("Customer API is not active", customerError.message)
      : emptyState("No customers in this view", "Try changing filters or refreshing customers from Selldone.");

    els.customerRows.innerHTML = customerError && !state.dashboard.customers.length
      ? tableEmpty(8, "Customer API is not active", customerError.message)
      : visibleCustomers.length
      ? visibleCustomers.map(renderCustomerTableRow).join("")
      : tableEmpty(8, "No customers in this view", "Try changing filters or refreshing customers from Selldone.");

    if (els.customerCards) {
      els.customerCards.innerHTML = visibleCustomers.length ? visibleCustomers.map(renderCustomerCard).join("") : emptyMarkup;
    }

    els.customerSegmentList.innerHTML = renderCustomerSegments();
    els.customerActivityList.innerHTML = renderCustomerActivityList();
    els.customerValueChart.innerHTML = renderLineChart({
      values: buildCustomerSeries((customer) => customer.clv || customer.chips || 0).slice(-30),
      labels: state.dashboard.customers.map((customer) => customer.name).slice(-30),
      color: ACCENTS.blue,
      valueFormatter: (value, compact = false) => (compact ? formatFitMoney(value, summary.currency) : formatMoney(value, summary.currency)),
      minimal: true,
    });
    els.customerHealth.innerHTML = statusRows([
      {
        icon: "bi-gem",
        title: "Gold+ Members",
        body: "GOLD, PLATINUM, or DIAMOND club level",
        value: formatNumber(summary.highValue),
        variant: summary.highValue ? "success" : "neutral",
      },
      {
        icon: "bi-person-check",
        title: "Access Enabled",
        body: "Customers allowed to use storefront account",
        value: formatNumber(summary.accessEnabled),
        variant: "info",
      },
      {
        icon: "bi-person-slash",
        title: "Banned",
        body: "Accounts marked as banned",
        value: formatNumber(summary.banned),
        variant: summary.banned ? "danger" : "success",
      },
    ]);
  }

  function renderCustomerTableRow(customer) {
    const initials = getInitials(customer.name).slice(0, 2);
    const status = customerDisplayStatus(customer);
    const purchaseLabel = customer.purchaseAt ? formatDate(customer.purchaseAt) : "No purchase yet";
    const activityLabel = customer.purchaseAt
      ? "Last purchase"
      : customer.loginAt
      ? `Last login ${formatDate(customer.loginAt)}`
      : `Updated ${formatDate(customer.updatedAt)}`;

    return `
      <tr class="customer-table-row" data-customer-open="${escapeAttribute(customer.id)}" tabindex="0" aria-label="Open ${escapeAttribute(customer.name)} details">
        <td class="customer-cell">
          <div class="customer-identity">
            <span class="customer-avatar customer-avatar-large">${escapeHtml(initials || "C")}</span>
            <span class="min-w-0">
              <strong class="text-truncate">${escapeHtml(customer.name)}</strong>
              <small class="text-truncate">ID ${escapeHtml(customer.id)}${customer.userId ? ` - User ${escapeHtml(customer.userId)}` : ""}</small>
            </span>
          </div>
        </td>
        <td class="customer-contact-cell">${renderCustomerContactBlock(customer)}</td>
        <td><span class="chip ${customerLevelChipClass(customer.level)}">${escapeHtml(titleCase(customer.level))}</span></td>
        <td title="${escapeAttribute(customer.segments.join(", "))}">
          <div class="customer-chip-stack">${renderCustomerSegmentChips(customer.segments, 2)}</div>
        </td>
        <td>
          <span class="customer-date">${escapeHtml(purchaseLabel)}</span>
          <small class="customer-muted">${escapeHtml(activityLabel)}</small>
        </td>
        <td>
          <strong class="money customer-clv" title="${escapeAttribute(formatMoney(customer.clv, customer.clvCurrency, 2))}">${formatFitMoney(customer.clv, customer.clvCurrency)}</strong>
          <small class="customer-muted">${formatNumber(customer.chips)} chips</small>
        </td>
        <td><span class="chip ${customerStatusChipClass(customer)}">${escapeHtml(status.label)}</span></td>
        <td class="customer-actions-cell">
          <div class="row-action-inline">
            <button class="btn btn-soft btn-sm" type="button" data-customer-open="${escapeAttribute(customer.id)}">
              <i class="bi bi-eye" aria-hidden="true"></i>
              <span>Details</span>
            </button>
            <button class="btn btn-soft btn-sm" type="button" data-customer-edit="${escapeAttribute(customer.id)}">
              <i class="bi bi-pencil-square" aria-hidden="true"></i>
              <span>Edit</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderCustomerCard(customer) {
    const initials = getInitials(customer.name).slice(0, 2);
    const status = customerDisplayStatus(customer);
    const contact = [customer.email, customer.phone].filter(Boolean).join(" / ") || "No contact information";

    return `
      <article class="customer-card" data-customer-open="${escapeAttribute(customer.id)}" tabindex="0" aria-label="Open ${escapeAttribute(customer.name)} details">
        <div class="customer-card-top">
          <span class="customer-avatar customer-avatar-large">${escapeHtml(initials || "C")}</span>
          <div class="min-w-0">
            <strong class="text-truncate">${escapeHtml(customer.name)}</strong>
            <small class="text-truncate">${escapeHtml(contact)}</small>
          </div>
          <span class="chip ${customerStatusChipClass(customer)}">${escapeHtml(status.label)}</span>
        </div>
        <div class="customer-card-metrics">
          ${renderCustomerMetric("CLV", formatFitMoney(customer.clv, customer.clvCurrency), "bi-stars")}
          ${renderCustomerMetric("Level", titleCase(customer.level), "bi-gem")}
          ${renderCustomerMetric("Last Purchase", customer.purchaseAt ? formatShortDate(customer.purchaseAt) : "-", "bi-bag-check")}
          ${renderCustomerMetric("Country", customer.country || "-", "bi-geo-alt")}
        </div>
        <div class="customer-card-foot">
          <div class="customer-chip-stack">${renderCustomerSegmentChips(customer.segments, 3)}</div>
          <div class="row-action-inline">
            <button class="btn btn-soft btn-sm" type="button" data-customer-open="${escapeAttribute(customer.id)}">
              <i class="bi bi-eye" aria-hidden="true"></i>
              <span>Details</span>
            </button>
            <button class="btn btn-soft btn-sm" type="button" data-customer-edit="${escapeAttribute(customer.id)}">
              <i class="bi bi-pencil-square" aria-hidden="true"></i>
              <span>Edit</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function renderCustomerMetric(label, value, icon) {
    return `
      <div class="customer-metric">
        <i class="bi ${escapeAttribute(icon)}" aria-hidden="true"></i>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value || "-")}</strong>
      </div>
    `;
  }

  function renderCustomerContactBlock(customer) {
    const rows = [
      ["bi-envelope", customer.email],
      ["bi-telephone", customer.phone],
      ["bi-geo-alt", customer.country],
    ].filter(([, value]) => value);

    if (!rows.length) return `<span class="customer-contact-empty">No contact</span>`;

    return `
      <div class="customer-contact-lines">
        ${rows.map(([icon, value]) => `
          <span title="${escapeAttribute(value)}">
            <i class="bi ${escapeAttribute(icon)}" aria-hidden="true"></i>
            <span class="text-truncate">${escapeHtml(value)}</span>
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderCustomerSegmentChips(segments = [], limit = 3) {
    const list = Array.isArray(segments) ? segments.filter(Boolean) : [];
    if (!list.length) return '<span class="chip chip-neutral">Unsegmented</span>';
    const shown = list.slice(0, limit);
    const extra = list.length - shown.length;
    return [
      ...shown.map((segment) => `<span class="chip chip-purple">${escapeHtml(segment)}</span>`),
      extra > 0 ? `<span class="chip chip-neutral">+${formatNumber(extra)}</span>` : "",
    ].join("");
  }

  function customerDisplayStatus(customer) {
    if (customer.banned) return { label: "Banned", icon: "bi-shield-x" };
    if (!customer.access) return { label: "No Access", icon: "bi-lock" };
    if (customer.subscribed) return { label: "Subscribed", icon: "bi-envelope-check" };
    return { label: "Active", icon: "bi-check-circle" };
  }

  function renderCustomerSegments() {
    const counts = new Map();
    state.dashboard.customers.forEach((customer) => {
      const segments = customer.segments.length ? customer.segments : ["Unsegmented"];
      segments.forEach((segment) => counts.set(segment, (counts.get(segment) || 0) + 1));
    });
    const rows = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([segment, count]) => ({
        icon: "bi-tags",
        title: segment,
        body: "Customer segment",
        value: formatNumber(count),
        variant: segment === "Unsegmented" ? "neutral" : "purple",
      }));
    return statusRows(rows);
  }

  function renderCustomerActivityList() {
    const recent = state.dashboard.customers
      .slice()
      .sort((left, right) => new Date(right.purchaseAt || right.loginAt || right.updatedAt || 0) - new Date(left.purchaseAt || left.loginAt || left.updatedAt || 0))
      .slice(0, 6);
    if (!recent.length) return emptyState("No customer activity", "Recent customer login and purchase dates will appear here.");
    return recent
      .map(
        (customer) => `
          <div class="compact-row">
            <span class="customer-avatar">${escapeHtml(getInitials(customer.name).slice(0, 1))}</span>
            <span class="min-w-0">
              <strong class="text-truncate">${escapeHtml(customer.name)}</strong>
              <small>${escapeHtml(customer.purchaseAt ? "Last purchase" : customer.loginAt ? "Last login" : "Updated")} - ${formatDate(customer.purchaseAt || customer.loginAt || customer.updatedAt)}</small>
            </span>
            <span class="chip ${customerLevelChipClass(customer.level)}">${escapeHtml(titleCase(customer.level))}</span>
          </div>
        `,
      )
      .join("");
  }

  function renderCustomerDetail() {
    if (!els.customerDetailContent) return;
    const customer = findCustomer(state.activeCustomerId);
    if (!customer) {
      els.customerDetailContent.innerHTML = emptyState(
        "Select a customer",
        "Open any customer row from the customers table to review the full Selldone profile.",
      );
      return;
    }

    const addressText = formatCustomerAddress(customer.address);
    const billingText = formatCustomerAddress(customer.billing);
    const rawRows = productDetailRawRows(customer.raw);
    const status = customerDisplayStatus(customer);
    const contactSummary = [customer.email, customer.phone, customer.country].filter(Boolean).join(" - ") || "No contact information returned by Selldone.";
    const segments = renderCustomerSegmentChips(customer.segments, 6);

    els.customerDetailContent.innerHTML = `
      <div class="customer-detail-shell">
        <article class="panel-card customer-profile-hero">
          <div class="customer-profile-identity">
            <span class="customer-avatar-xl">${escapeHtml(getInitials(customer.name).slice(0, 2) || "C")}</span>
            <div class="customer-profile-copy">
              <div class="customer-profile-kicker">
                <span class="chip ${customerLevelChipClass(customer.level)}">${escapeHtml(titleCase(customer.level))}</span>
                <span class="chip ${customerStatusChipClass(customer)}"><i class="bi ${escapeAttribute(status.icon)}" aria-hidden="true"></i>${escapeHtml(status.label)}</span>
                ${customer.subscribed ? '<span class="chip chip-info"><i class="bi bi-envelope-check" aria-hidden="true"></i>Subscribed</span>' : ""}
              </div>
              <h2>${escapeHtml(customer.name)}</h2>
              <p>${escapeHtml(contactSummary)}</p>
              <div class="customer-profile-actions">
                <button class="btn btn-primary-gradient" type="button" data-customer-edit="${escapeAttribute(customer.id)}">
                  <i class="bi bi-pencil-square" aria-hidden="true"></i>
                  <span>Edit Customer</span>
                </button>
                <button class="btn btn-soft" type="button" data-view-jump="customers">
                  <i class="bi bi-arrow-left" aria-hidden="true"></i>
                  <span>Back to Customers</span>
                </button>
              </div>
            </div>
          </div>

          <div class="customer-profile-notes">
            <span class="customer-section-label">Segments</span>
            <div class="customer-chip-stack">${segments}</div>
            <p>${escapeHtml(customer.notes || "No internal customer notes were returned by Selldone.")}</p>
          </div>

          <div class="customer-score-panel">
            <span>Lifetime Value</span>
            <strong title="${escapeAttribute(formatMoney(customer.clv, customer.clvCurrency, 2))}">${formatFitMoney(customer.clv, customer.clvCurrency)}</strong>
            <small>${formatNumber(customer.chips)} loyalty chips</small>
          </div>
        </article>

        <section class="customer-quick-stats" aria-label="Customer quick stats">
          ${renderCustomerMetric("Customer ID", String(customer.id), "bi-person-vcard")}
          ${renderCustomerMetric("Last Purchase", customer.purchaseAt ? formatDate(customer.purchaseAt) : "No purchase", "bi-bag-check")}
          ${renderCustomerMetric("Last Login", customer.loginAt ? formatDate(customer.loginAt) : "No login", "bi-box-arrow-in-right")}
          ${renderCustomerMetric("Created", customer.createdAt ? formatDate(customer.createdAt) : "-", "bi-calendar-plus")}
        </section>

        <div class="customer-detail-grid">
          ${customerInfoPanel("Profile", "bi-person-lines-fill", [
            ["Customer ID", customer.id],
            ["User ID", customer.userId || "-"],
            ["Email", customer.email || "-"],
            ["Phone", customer.phone || "-"],
            ["Country", customer.country || "-"],
            ["Birthday", formatShortDate(customer.birthday)],
          ])}
          ${customerInfoPanel("Loyalty", "bi-gem", [
            ["Club level", titleCase(customer.level)],
            ["Subscribed", customer.subscribed ? "Yes" : "No"],
            ["Segments", customer.segments.join(", ") || "-"],
            ["Chips", formatNumber(customer.chips)],
            ["CLV", formatMoney(customer.clv, customer.clvCurrency, 2)],
            ["Currency", customer.currency || customer.clvCurrency || "-"],
          ])}
          ${customerInfoPanel("Access", "bi-shield-check", [
            ["Access", customer.access ? "Enabled" : "Disabled"],
            ["Banned", customer.banned ? "Yes" : "No"],
            ["Last login", formatDate(customer.loginAt)],
            ["Created", formatDate(customer.createdAt)],
            ["Updated", formatDate(customer.updatedAt)],
          ])}
          ${customerInfoPanel("Shipping Address", "bi-truck", [
            ["Receiver", customer.address.name || "-"],
            ["Phone", customer.address.phone || "-"],
            ["Address", addressText || "-"],
            ["Postal", customer.address.postal || "-"],
          ])}
          ${customerInfoPanel("Billing Address", "bi-credit-card", [
            ["Receiver", customer.billing.name || "-"],
            ["Phone", customer.billing.phone || "-"],
            ["Address", billingText || "-"],
            ["Postal", customer.billing.postal || "-"],
          ])}
          <article class="panel-card customer-info-card">
            <div class="panel-header customer-info-header">
              <div>
                <span class="customer-info-icon"><i class="bi bi-receipt" aria-hidden="true"></i></span>
                <h2>Recent Orders</h2>
              </div>
            </div>
            <div class="compact-list">
              ${renderCustomerRecentOrders(customer)}
            </div>
          </article>
          <article class="panel-card customer-info-card">
            <div class="panel-header customer-info-header">
              <div>
                <span class="customer-info-icon"><i class="bi bi-activity" aria-hidden="true"></i></span>
                <h2>Activity Timeline</h2>
              </div>
            </div>
            <div class="timeline-list">
              ${renderCustomerTimeline(customer)}
            </div>
          </article>
          <article class="panel-card customer-info-card span-2">
            <div class="panel-header customer-info-header">
              <div>
                <span class="customer-info-icon"><i class="bi bi-braces" aria-hidden="true"></i></span>
                <h2>Selldone Raw Fields</h2>
                <p>Primitive fields from the live customer payload for diagnostics and future dashboard expansion.</p>
              </div>
            </div>
            <div class="raw-field-grid">
              ${rawRows.map(([key, value]) => `
                <div class="raw-field-row">
                  <span>${escapeHtml(key)}</span>
                  <strong>${escapeHtml(formatRawValue(value))}</strong>
                </div>
              `).join("")}
            </div>
          </article>
        </div>
      </div>
    `;

    if (state.activeView === "customerDetail") {
      updateCustomerDetailHeading(customer);
    }
  }

  function customerInfoPanel(title, icon, rows) {
    return `
      <article class="panel-card customer-info-card">
        <div class="panel-header customer-info-header">
          <div>
            <span class="customer-info-icon"><i class="bi ${escapeAttribute(icon)}" aria-hidden="true"></i></span>
            <h2>${escapeHtml(title)}</h2>
          </div>
        </div>
        <div class="detail-list">
          ${rows.map(([label, value]) => `
            <div class="detail-list-row">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value ?? "-")}</strong>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }

  function renderCustomerTimeline(customer) {
    const events = [
      { icon: "bi-person-plus", title: "Customer created", date: customer.createdAt },
      { icon: "bi-box-arrow-in-right", title: "Last login", date: customer.loginAt },
      { icon: "bi-bag-check", title: "Last purchase", date: customer.purchaseAt },
      { icon: "bi-pencil-square", title: "Profile updated", date: customer.updatedAt },
    ].filter((event) => event.date);

    if (!events.length) return emptyState("No timeline data", "Selldone did not return customer activity timestamps.");

    return events
      .map(
        (event) => `
          <div class="timeline-row">
            <span class="timeline-dot"><i class="bi ${escapeAttribute(event.icon)}" aria-hidden="true"></i></span>
            <span class="min-w-0">
              <strong>${escapeHtml(event.title)}</strong>
              <small>${formatDate(event.date)}</small>
            </span>
          </div>
        `,
      )
      .join("");
  }

  function getFilteredCustomers() {
    const search = (els.customerSearchInput?.value || "").trim().toLowerCase();
    const level = els.customerLevelFilter?.value || "all";
    const status = els.customerStatusFilter?.value || "all";

    return state.dashboard.customers.filter((customer) => {
      const text = [
        customer.name,
        customer.email,
        customer.phone,
        customer.country,
        customer.level,
        ...customer.segments,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !search || text.includes(search);
      const matchesLevel = level === "all" || customer.level === level;
      const matchesStatus =
        status === "all" ||
        (status === "subscribed" && customer.subscribed) ||
        (status === "banned" && customer.banned) ||
        (status === "no-access" && !customer.access);
      return matchesSearch && matchesLevel && matchesStatus;
    });
  }

  function getCustomerSummary() {
    const customers = state.dashboard.customers;
    const currency = customers[0]?.clvCurrency || customers[0]?.currency || "USD";
    const subscribed = customers.filter((customer) => customer.subscribed).length;
    const banned = customers.filter((customer) => customer.banned).length;
    const noAccess = customers.filter((customer) => !customer.access).length;
    const highValue = customers.filter((customer) => ["GOLD", "PLATINUM", "DIAMOND"].includes(customer.level)).length;
    const clv = customers.reduce((sum, customer) => sum + Number(customer.clv || 0), 0);
    return {
      total: state.dashboard.customerTotal || customers.length,
      loaded: customers.length,
      subscribed,
      banned,
      noAccess,
      restricted: banned + noAccess,
      highValue,
      accessEnabled: customers.filter((customer) => customer.access).length,
      clv,
      currency,
    };
  }

  function buildCustomerSeries(mapper) {
    return buildSeriesFromItems(state.dashboard.customers, mapper);
  }

  async function openCustomerDetail(customerId, updateHash = true) {
    const id = String(customerId || "").trim();
    if (!id) {
      notify("Customer id is missing.");
      return;
    }

    const existing = findCustomer(id);
    state.activeCustomerId = existing?.id || id;

    if (existing) {
      renderCustomerDetail();
      updateCustomerDetailHeading(existing);
    } else if (els.customerDetailContent) {
      els.customerDetailContent.innerHTML = emptyState("Loading customer", "Fetching the full customer profile from Selldone.");
      els.pageTitle.textContent = "Customer";
      els.pageEyebrow.textContent = "Customer";
      els.pageSubtitle.textContent = `Customer ID ${id}`;
    }

    state.customerDetailLoadingId = id;
    deps.showView("customerDetail", false);
    if (updateHash) {
      history.replaceState(null, "", `#customer-${encodeURIComponent(id)}`);
    }

    try {
      const payload = await selldone.customerDetail(encodeURIComponent(id));
      if (!payload) return;
      const source = extractCustomerPayload(payload);
      if (!source) {
        notify("Selldone did not return customer detail fields.");
        return;
      }
      const customer = mergeCustomer(normalizeCustomer(source));
      state.activeCustomerId = customer.id;
      renderCustomers();
      renderCustomerDetail();
      updateCustomerDetailHeading(customer);
    } catch (error) {
      notify(formatCustomerActionError(error.message));
    } finally {
      if (state.customerDetailLoadingId === id) state.customerDetailLoadingId = null;
    }
  }

  function updateCustomerDetailHeading(customer) {
    els.pageTitle.textContent = customer.name || "Customer";
    els.pageEyebrow.textContent = "Customer";
    els.pageSubtitle.textContent = [customer.email, customer.phone, titleCase(customer.level), customer.country].filter(Boolean).join(" - ") || `Customer ID ${customer.id}`;
  }

  function findCustomer(customerId) {
    const id = String(customerId || "");
    return state.dashboard.customerDetails[id] || state.dashboard.customers.find((customer) => String(customer.id) === id) || null;
  }

  function mergeCustomer(customer) {
    const id = String(customer.id || "");
    if (!id) return customer;

    const previous = findCustomer(id);
    const next = {
      ...(previous || {}),
      ...customer,
      raw: {
        ...(previous?.raw || {}),
        ...(customer.raw || {}),
      },
    };
    if (!customer.recentOrders?.length && previous?.recentOrders?.length) next.recentOrders = previous.recentOrders;

    state.dashboard.customerDetails[id] = next;
    const index = state.dashboard.customers.findIndex((item) => String(item.id) === id);
    if (index >= 0) {
      state.dashboard.customers[index] = next;
    } else {
      state.dashboard.customers.unshift(next);
      state.dashboard.customerTotal = Math.max(Number(state.dashboard.customerTotal || 0), state.dashboard.customers.length);
    }
    return next;
  }

  function extractCustomerPayload(payload = {}) {
    if (!payload || typeof payload !== "object") return null;
    const source = payload.customer || payload.data?.customer || payload.data?.profile || payload.data;
    if (!source || typeof source !== "object" || Array.isArray(source)) return null;
    if (source.success === true && !source.id && !source.customer_id && !source.user_id && !source.email && !source.phone) return null;
    return source;
  }

  async function refreshCustomers({ silent = false } = {}) {
    if (els.refreshCustomersButton) {
      els.refreshCustomersButton.disabled = true;
      els.refreshCustomersButton.querySelector("span").textContent = "Refreshing";
    }

    try {
      const payload = await selldone.customers({ limit: 100, offset: 0, sortBy: "updated_at", sortDesc: "true" });
      if (!payload) return;
      state.dashboard.customers = normalizeCustomers(payload.customers || payload.data || payload.items || []);
      state.dashboard.customerDetails = {};
      state.dashboard.customerTotal = Number(payload.total || state.dashboard.customers.length || 0);
      state.dashboard.errors = (state.dashboard.errors || []).filter((error) => error?.label !== "Customers");
      if (state.activeCustomerId && !findCustomer(state.activeCustomerId)) state.activeCustomerId = null;
      renderCustomers();
      renderCustomerDetail();
      renderSuite();
      renderSettings();
      renderNavBadges();
      if (!silent) notify(`Loaded ${formatNumber(state.dashboard.customers.length)} customers`);
    } catch (error) {
      const message = formatCustomerActionError(error.message);
      state.dashboard.errors = [
        ...(state.dashboard.errors || []).filter((item) => item?.label !== "Customers"),
        { label: "Customers", status: 503, code: "customer_refresh_failed", message },
      ];
      renderCustomers();
      notify(message);
    } finally {
      if (els.refreshCustomersButton) {
        els.refreshCustomersButton.disabled = false;
        els.refreshCustomersButton.querySelector("span").textContent = "Refresh Customers";
      }
    }
  }

  function openCustomerEditor(customerId) {
    const customer = findCustomer(customerId);
    if (!customer) {
      notify("Customer was not found in the current table.");
      return;
    }

    state.editingCustomerId = customer.id;
    els.customerEditId.value = customer.id;
    els.customerEditName.value = customer.name || "";
    els.customerEditEmail.value = customer.email || "";
    els.customerEditPhone.value = customer.phone || "";
    ensureSelectOption(els.customerEditLevel, customer.level);
    els.customerEditLevel.value = customer.level || "BRONZE";
    els.customerEditCurrency.value = customer.currency || customer.clvCurrency || "USD";
    els.customerEditCountry.value = customer.country || "";
    ensureSelectOption(els.customerEditSex, customer.sex);
    els.customerEditSex.value = customer.sex || "";
    els.customerEditBirthday.value = toDateInputValue(customer.birthday);
    els.customerEditSegments.value = customer.segments.join(", ");
    els.customerEditNotes.value = customer.notes || "";
    els.customerEditAddress.value = customer.address.address || formatCustomerAddress(customer.address);
    els.customerEditBilling.value = customer.billing.address || formatCustomerAddress(customer.billing);
    els.customerEditSubscribed.checked = Boolean(customer.subscribed);

    els.customerEditor.classList.add("is-open");
    els.customerEditor.setAttribute("aria-hidden", "false");
    window.setTimeout(() => els.customerEditName.focus(), 0);
  }

  function closeCustomerEditor() {
    state.editingCustomerId = null;
    els.customerEditor.classList.remove("is-open");
    els.customerEditor.setAttribute("aria-hidden", "true");
    els.customerEditForm.reset();
  }

  async function submitCustomerEdit(event) {
    event.preventDefault();
    const customerId = els.customerEditId.value;
    const current = findCustomer(customerId);
    const payload = {
      name: els.customerEditName.value.trim(),
      email: els.customerEditEmail.value.trim(),
      phone: els.customerEditPhone.value.trim(),
      level: els.customerEditLevel.value,
      currency: els.customerEditCurrency.value.trim() || current?.currency || "USD",
      country: els.customerEditCountry.value.trim(),
      sex: els.customerEditSex.value,
      birthday: els.customerEditBirthday.value,
      segments: splitTags(els.customerEditSegments.value),
      notes: els.customerEditNotes.value.trim(),
      address: buildCustomerAddressPayload(els.customerEditAddress.value, current?.address),
      billing: buildCustomerAddressPayload(els.customerEditBilling.value, current?.billing),
      subscribed: els.customerEditSubscribed.checked,
    };

    if (!payload.name) {
      notify("Customer name is required.");
      return;
    }

    els.customerEditSubmit.disabled = true;
    try {
      const response = await selldone.updateCustomer(encodeURIComponent(customerId), payload);
      const returned = extractCustomerPayload(response);
      const raw = {
        ...(current?.raw || {}),
        ...payload,
        ...(returned || {}),
        id: current?.id || customerId,
        user_id: current?.userId || returned?.user_id || "",
      };
      const updated = mergeCustomer(normalizeCustomer(raw));
      closeCustomerEditor();
      renderCustomers();
      renderCustomerDetail();
      updateCustomerDetailHeading(updated);
      renderSuite();
      renderSettings();
      notify("Customer updated");
    } catch (error) {
      notify(formatCustomerActionError(error.message));
    } finally {
      els.customerEditSubmit.disabled = false;
    }
  }

  function buildCustomerAddressPayload(value, current = {}) {
    const text = String(value || "").trim();
    if (!text && !current?.address) return undefined;
    return {
      ...current,
      address: text || current.address || "",
    };
  }

  function formatCustomerAddress(address = {}) {
    if (!address || typeof address !== "object") return "";
    return [address.address, address.no, address.unit, address.city, address.state, address.country].filter(Boolean).join(", ");
  }

  function renderCustomerRecentOrders(customer) {
    const orders = (customer.recentOrders || [])
      .map((order) => normalizeOrders([order])[0])
      .filter(Boolean)
      .slice(0, 5);
    if (!orders.length) return emptyState("No recent orders", "Order history was not included in this customer payload.");
    return orders
      .map(
        (order) => `
          <div class="compact-row">
            <span class="status-icon chip-info"><i class="bi bi-receipt" aria-hidden="true"></i></span>
            <span class="min-w-0">
              <strong class="text-truncate">${escapeHtml(order.code)}</strong>
              <small>${formatDate(order.createdAt)} - ${escapeHtml(order.status)}</small>
            </span>
            <span class="money" title="${escapeAttribute(formatMoney(order.price, order.currency, 2))}">${formatFitMoney(order.price, order.currency, { fullDigits: 2 })}</span>
          </div>
        `,
      )
      .join("");
  }

  function customerLevelChipClass(level) {
    const value = String(level || "").toUpperCase();
    if (["DIAMOND", "PLATINUM"].includes(value)) return "chip-purple";
    if (value === "GOLD") return "chip-warning";
    if (value === "SILVER") return "chip-info";
    if (value === "BRONZE") return "chip-neutral";
    return "chip-neutral";
  }

  function customerStatusChipClass(customer) {
    if (customer.banned) return "chip-danger";
    if (!customer.access) return "chip-warning";
    if (customer.subscribed) return "chip-info";
    return "chip-success";
  }

  function formatCustomerActionError(message) {
    if (/Expected JSON/i.test(message || "")) {
      return "The local server is still serving the old API bundle. Restart the dashboard server, then refresh Customers.";
    }
    if (/scope|permission|403|forbidden/i.test(message)) {
      return "Reconnect with consent to grant customer read/write access.";
    }
    if (/google2fa/i.test(message)) {
      return "Selldone requires Google 2FA verification for this customer action.";
    }
    return message || "Customer action failed.";
  }

  function getCustomerError() {
    return (state.dashboard.errors || []).find((error) => error?.label === "Customers") || null;
  }

  return {
    normalizeCustomers,
    renderCustomers,
    renderCustomerDetail,
    getFilteredCustomers,
    getCustomerSummary,
    buildCustomerSeries,
    openCustomerDetail,
    updateCustomerDetailHeading,
    findCustomer,
    mergeCustomer,
    refreshCustomers,
    openCustomerEditor,
    closeCustomerEditor,
    submitCustomerEdit,
    formatCustomerActionError,
  };
}
