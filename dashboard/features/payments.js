import { resolveSelldoneRecordImage } from "./selldone-images.js";

const PAYMENT_METHODS = [
  "card",
  "klarna",
  "ideal",
  "alipay",
  "bancontact",
  "afterpay_clearpay",
  "au_becs_debit",
  "boleto",
  "eps",
  "giropay",
  "oxxo",
  "p24",
  "sepa_debit",
  "sofort",
  "grabpay",
  "wechat",
  "ach_credit_transfer",
  "multibanco",
  "bacs_debit",
];

export function createPaymentFeature(deps) {
  const {
    state,
    els,
    ACCENTS,
    statCard,
    formatNumber,
    formatFitMoney,
    formatMoney,
    formatDate,
    titleCase,
    getInitials,
    escapeHtml,
    escapeAttribute,
    tableEmpty,
    emptyState,
    statusRows,
    renderLineChart,
    readFirstNumber,
    notify,
    renderSuite,
    renderSettings,
    renderNavBadges,
    selldone,
  } = deps;

  function normalizeGateways(gateways) {
    return Array.isArray(gateways) ? gateways.map((gateway) => normalizeGateway(gateway)).filter((gateway) => gateway.code) : [];
  }

  function normalizeAvailableGateways(gateways) {
    return Array.isArray(gateways)
      ? gateways.map((gateway) => normalizeGateway(gateway, { available: true })).filter((gateway) => gateway.code)
      : [];
  }

  function normalizeGateway(row = {}, options = {}) {
    const gateway = row.gateway && typeof row.gateway === "object" ? row.gateway : {};
    const source = { ...gateway, ...row };
    const code = firstText(row.gateway_code, row.code, row.gateway?.code, row.gateway?.gateway_code, row.name, row.id);
    const title = firstText(row.title, row.name, gateway.title, gateway.name, gateway.title_en, titleCase(code));
    const config = normalizeGatewayConfig(row.config || row.options || row.setting || {});
    const currency = firstText(row.currency, row.gateway?.currency, state.dashboard.gatewayCurrency, state.session?.shop?.currency, "USD");

    return {
      id: row.id ?? row.gateway_id ?? code,
      code,
      title,
      description: firstText(row.description, gateway.description, gateway.subtitle, ""),
      provider: firstText(row.provider, gateway.provider, gateway.brand, code),
      currency,
      enable: readBoolean(row.enable, row.enabled, row.active, row.status === "active", options.available ? false : true),
      livemode: readBoolean(row.livemode, row.live_mode, row.live, row.mode === "live", false),
      manual: readBoolean(row.manual, row.is_manual, false),
      limit: readFirstGatewayNumber(row, ["limit", "max", "max_amount", "amount_limit"]),
      config,
      methods: normalizeMethods(row.methods || config.methods || gateway.methods || []),
      hasPublicConfig: Boolean(row.public && Object.keys(row.public || {}).length),
      hasPrivateConfig: Boolean(row.private && Object.keys(row.private || {}).length),
      logoUrl: resolveGatewayImage(source),
      imports: Array.isArray(gateway.imports) ? gateway.imports : Array.isArray(row.imports) ? row.imports : [],
      raw: row,
    };
  }

  function normalizeGatewayConfig(config = {}) {
    if (!config || typeof config !== "object" || Array.isArray(config)) return {};
    return {
      ...config,
      methods: normalizeMethods(config.methods || config.payment_methods || []),
      connect: readBoolean(config.connect, config.connected, false),
      client_id: firstText(config.client_id, config.clientId, ""),
    };
  }

  function normalizeTransactions(transactions) {
    return Array.isArray(transactions)
      ? transactions.map((transaction) => normalizeTransaction(transaction)).filter((transaction) => transaction.id)
      : [];
  }

  function normalizeTransaction(transaction = {}) {
    const amount = readFirstGatewayNumber(transaction, ["amount", "price", "total", "value"]);
    const currency = firstText(transaction.currency, state.dashboard.gatewayCurrency, "USD");
    const status = firstText(transaction.status, transaction.transaction_status, transaction.payment_status, "-");
    const issuedAt = firstText(transaction.issued_at, transaction.created_at, transaction.createdAt);
    const paymentAt = firstText(transaction.payment_at, transaction.pay_at, transaction.paid_at);

    return {
      id: transaction.id ?? transaction.payment_id ?? transaction.unique_id ?? transaction.code,
      uniqueId: firstText(transaction.unique_id, transaction.uuid, transaction.code, transaction.id),
      amount,
      currency,
      status,
      risk: firstText(transaction.risk, transaction.risk_level, "-"),
      card: firstText(transaction.card, transaction.card_brand, ""),
      livemode: readBoolean(transaction.livemode, transaction.live_mode, false),
      issuedAt,
      paymentAt,
      raw: transaction,
    };
  }

  function renderPayments() {
    if (!els.gatewayRows) return;

    const summary = getPaymentSummary();
    const selectedGateway = findGateway(state.activeGatewayCode) || state.dashboard.paymentGateways[0] || null;
    if (!state.activeGatewayCode && selectedGateway) state.activeGatewayCode = selectedGateway.code;

    if (els.gatewayCurrencyFilter) {
      ensureSelectValue(els.gatewayCurrencyFilter, state.dashboard.gatewayCurrency || summary.currency || "USD");
    }

    els.paymentKpis.innerHTML = [
      statCard({
        title: "Configured Gateways",
        value: formatNumber(summary.total),
        icon: "bi-credit-card-2-front",
        accent: "blue",
        trend: summary.enabled ? `${formatNumber(summary.enabled)} enabled` : "Waiting",
        note: "From Selldone backoffice payments",
        values: state.dashboard.paymentGateways.map((gateway) => (gateway.enable ? 1 : 0)),
      }),
      statCard({
        title: "Live Mode",
        value: formatNumber(summary.live),
        icon: "bi-broadcast-pin",
        accent: "green",
        trend: summary.sandbox ? `${formatNumber(summary.sandbox)} sandbox` : "All live",
        note: "Gateways using production credentials",
        values: state.dashboard.paymentGateways.map((gateway) => (gateway.livemode ? 1 : 0)),
      }),
      statCard({
        title: "Available Providers",
        value: formatNumber(summary.available),
        icon: "bi-plus-circle",
        accent: "purple",
        trend: summary.currency,
        note: "Installable gateways for selected currency",
        values: state.dashboard.availableGateways.map((_, index) => index + 1),
      }),
      statCard({
        title: "Transaction Volume",
        value: formatFitMoney(summary.transactionAmount, summary.currency),
        icon: "bi-receipt",
        accent: "orange",
        trend: `${formatNumber(summary.transactionCount)} rows`,
        note: "Loaded for selected gateway",
        values: state.dashboard.gatewayTransactions.map((transaction) => transaction.amount),
      }),
    ].join("");

    const paymentError = getPaymentError();
    els.gatewayRows.innerHTML = paymentError && !state.dashboard.paymentGateways.length
      ? tableEmpty(6, "Payment gateway API is not active", paymentError.message)
      : state.dashboard.paymentGateways.length
      ? state.dashboard.paymentGateways.map(renderGatewayRow).join("")
      : tableEmpty(6, "No configured gateways", "Add a payment gateway from the available provider list.");

    els.gatewayHealth.innerHTML = renderGatewayHealth(summary);
    els.availableGatewayList.innerHTML = renderAvailableGateways();
    renderGatewayTransactions();
  }

  function renderGatewayRow(gateway) {
    const selected = String(gateway.code) === String(state.activeGatewayCode || "");
    return `
      <tr class="payment-gateway-row ${selected ? "is-selected" : ""}" data-gateway-open="${escapeAttribute(gateway.code)}" tabindex="0" aria-label="Open ${escapeAttribute(gateway.title)} transactions">
        <td>
          <div class="payment-gateway-identity">
            ${renderGatewayLogo(gateway)}
            <span class="min-w-0">
              <strong class="text-truncate">${escapeHtml(gateway.title)}</strong>
              <small class="text-truncate">${escapeHtml(gateway.code)}${gateway.description ? ` - ${escapeHtml(gateway.description)}` : ""}</small>
            </span>
          </div>
        </td>
        <td>
          <span class="chip ${gateway.livemode ? "chip-success" : "chip-warning"}">${gateway.livemode ? "Live" : "Sandbox"}</span>
          ${gateway.manual ? '<span class="chip chip-neutral">Manual</span>' : ""}
        </td>
        <td>${gateway.limit ? `<span class="money">${formatFitMoney(gateway.limit, gateway.currency)}</span>` : '<span class="text-secondary">No limit</span>'}</td>
        <td>
          <div class="payment-config-stack">
            <span class="chip ${gateway.hasPublicConfig ? "chip-info" : "chip-neutral"}">Public ${gateway.hasPublicConfig ? "set" : "empty"}</span>
            <span class="chip ${gateway.hasPrivateConfig ? "chip-purple" : "chip-neutral"}">Private ${gateway.hasPrivateConfig ? "set" : "empty"}</span>
          </div>
        </td>
        <td><span class="chip ${gateway.enable ? "chip-success" : "chip-danger"}">${gateway.enable ? "Enabled" : "Disabled"}</span></td>
        <td>
          <div class="row-action-inline">
            <button class="btn btn-soft btn-sm" type="button" data-gateway-toggle="${escapeAttribute(gateway.code)}">
              <i class="bi ${gateway.enable ? "bi-pause-circle" : "bi-play-circle"}" aria-hidden="true"></i>
              <span>${gateway.enable ? "Disable" : "Enable"}</span>
            </button>
            <button class="btn btn-soft btn-sm" type="button" data-gateway-edit="${escapeAttribute(gateway.code)}">
              <i class="bi bi-sliders" aria-hidden="true"></i>
              <span>Configure</span>
            </button>
            <button class="btn btn-soft btn-sm text-danger" type="button" data-gateway-delete="${escapeAttribute(gateway.code)}">
              <i class="bi bi-trash" aria-hidden="true"></i>
              <span>Delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderGatewayLogo(gateway) {
    if (gateway.logoUrl) {
      return `<span class="gateway-logo has-image"><img src="${escapeAttribute(gateway.logoUrl)}" alt="${escapeAttribute(gateway.title)} logo" loading="lazy" referrerpolicy="no-referrer" /></span>`;
    }
    return `<span class="gateway-logo"><i class="bi bi-credit-card-2-front" aria-hidden="true"></i></span>`;
  }

  function renderGatewayHealth(summary) {
    return statusRows([
      {
        icon: "bi-check-circle",
        title: "Checkout Enabled",
        body: "Gateways currently available at checkout",
        value: formatNumber(summary.enabled),
        variant: summary.enabled ? "success" : "danger",
      },
      {
        icon: "bi-broadcast-pin",
        title: "Production Mode",
        body: "Gateways using live provider credentials",
        value: formatNumber(summary.live),
        variant: summary.live ? "success" : "warning",
      },
      {
        icon: "bi-shield-lock",
        title: "Accounting Scope",
        body: "Requires backoffice:shop read/write access",
        value: hasPaymentWriteScope() ? "Write" : "Read",
        variant: hasPaymentWriteScope() ? "info" : "warning",
      },
    ]);
  }

  function renderAvailableGateways() {
    const configured = new Set(state.dashboard.paymentGateways.map((gateway) => gateway.code));
    const list = state.dashboard.availableGateways.slice(0, 12);
    if (!list.length) return emptyState("No available gateway list", "Refresh gateways or choose another currency.");
    return list
      .map((gateway) => {
        const installed = configured.has(gateway.code);
        return `
          <div class="compact-row">
            ${renderGatewayLogo(gateway)}
            <span class="min-w-0">
              <strong class="text-truncate">${escapeHtml(gateway.title)}</strong>
              <small>${escapeHtml(gateway.code)}</small>
            </span>
            <button class="btn btn-soft btn-sm" type="button" data-gateway-edit="${escapeAttribute(gateway.code)}">
              <i class="bi ${installed ? "bi-sliders" : "bi-plus-lg"}" aria-hidden="true"></i>
              <span>${installed ? "Edit" : "Add"}</span>
            </button>
          </div>
        `;
      })
      .join("");
  }

  function renderGatewayTransactions() {
    if (!els.gatewayTransactionRows) return;
    const gateway = findGateway(state.activeGatewayCode);
    if (els.gatewayTransactionMeta) {
      els.gatewayTransactionMeta.textContent = gateway
        ? `${gateway.title} transactions - ${formatNumber(state.dashboard.gatewayTransactionTotal || state.dashboard.gatewayTransactions.length)} rows`
        : "Select a gateway to load payment transactions.";
    }

    if (!gateway) {
      els.gatewayTransactionRows.innerHTML = tableEmpty(6, "No gateway selected", "Open a gateway row to load recent transactions.");
      return;
    }

    els.gatewayTransactionRows.innerHTML = state.dashboard.gatewayTransactions.length
      ? state.dashboard.gatewayTransactions.map(renderTransactionRow).join("")
      : tableEmpty(6, "No transactions loaded", "Refresh transactions for this gateway.");
  }

  function renderTransactionRow(transaction) {
    return `
      <tr>
        <td>
          <div class="payment-transaction-id">
            <strong class="text-truncate">${escapeHtml(transaction.uniqueId || transaction.id)}</strong>
            <small>${transaction.livemode ? "Live" : "Sandbox"}${transaction.card ? ` - ${escapeHtml(transaction.card)}` : ""}</small>
          </div>
        </td>
        <td><span class="money">${formatMoney(transaction.amount, transaction.currency, 2)}</span></td>
        <td><span class="chip ${gatewayStatusChipClass(transaction.status)}">${escapeHtml(titleCase(transaction.status))}</span></td>
        <td>${escapeHtml(transaction.risk || "-")}</td>
        <td>${formatDate(transaction.issuedAt)}</td>
        <td>${formatDate(transaction.paymentAt)}</td>
      </tr>
    `;
  }

  function getPaymentSummary() {
    const gateways = state.dashboard.paymentGateways || [];
    const transactions = state.dashboard.gatewayTransactions || [];
    const currency = state.dashboard.gatewayCurrency || gateways[0]?.currency || transactions[0]?.currency || "USD";
    return {
      total: gateways.length,
      enabled: gateways.filter((gateway) => gateway.enable).length,
      live: gateways.filter((gateway) => gateway.livemode).length,
      sandbox: gateways.filter((gateway) => !gateway.livemode).length,
      available: state.dashboard.availableGateways?.length || 0,
      transactionCount: state.dashboard.gatewayTransactionTotal || transactions.length,
      transactionAmount: transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
      currency,
    };
  }

  async function refreshPaymentGateways({ silent = false } = {}) {
    const currency = els.gatewayCurrencyFilter?.value || state.dashboard.gatewayCurrency || "USD";
    state.dashboard.gatewayCurrency = currency;
    setGatewayButtonsLoading(true);
    try {
      const [gatewayPayload, availablePayload] = await Promise.all([
        selldone.gateways(),
        selldone.availableGateways(currency),
      ]);
      state.dashboard.paymentGateways = normalizeGateways(gatewayPayload.shop_gateways || gatewayPayload.gateways || gatewayPayload.data || []);
      state.dashboard.availableGateways = normalizeAvailableGateways(availablePayload.gateways || availablePayload.shop_gateways || availablePayload.data || []);
      state.dashboard.errors = (state.dashboard.errors || []).filter((error) => error?.label !== "Payment Gateways" && error?.label !== "Available Gateways");
      if (state.activeGatewayCode && !findGateway(state.activeGatewayCode)) state.activeGatewayCode = state.dashboard.paymentGateways[0]?.code || null;
      renderPayments();
      renderSuite();
      renderSettings();
      renderNavBadges();
      if (!silent) notify(`Loaded ${formatNumber(state.dashboard.paymentGateways.length)} gateways`);
    } catch (error) {
      handlePaymentError("Payment Gateways", error);
    } finally {
      setGatewayButtonsLoading(false);
    }
  }

  async function loadGatewayTransactions(gatewayCode, { silent = false } = {}) {
    const code = String(gatewayCode || state.activeGatewayCode || "").trim();
    if (!code) {
      notify("Select a gateway first.");
      return;
    }

    state.activeGatewayCode = code;
    if (els.gatewayTransactionRows) {
      els.gatewayTransactionRows.innerHTML = tableEmpty(6, "Loading transactions", "Fetching recent payments from Selldone.");
    }
    renderPayments();

    try {
      const payload = await selldone.gatewayTransactions(code, { offset: 0, limit: 20, sortBy: "id", sortDesc: "true" });
      state.dashboard.gatewayTransactions = normalizeTransactions(payload.transactions || payload.data || payload.items || []);
      state.dashboard.gatewayTransactionTotal = Number(payload.total || state.dashboard.gatewayTransactions.length || 0);
      state.dashboard.errors = (state.dashboard.errors || []).filter((error) => error?.label !== "Gateway Transactions");
      renderPayments();
      if (!silent) notify(`Loaded ${formatNumber(state.dashboard.gatewayTransactions.length)} transactions`);
    } catch (error) {
      handlePaymentError("Gateway Transactions", error);
    }
  }

  function openGatewayEditor(gatewayCode = null) {
    const gateway = gatewayCode ? findGateway(gatewayCode) || findAvailableGateway(gatewayCode) : null;
    const code = gateway?.code || state.dashboard.availableGateways[0]?.code || state.dashboard.paymentGateways[0]?.code || "";
    const existing = findGateway(code);

    state.editingGatewayCode = existing?.code || code || null;
    els.gatewayEditOriginalCode.value = existing?.code || "";
    fillGatewayOptions(code);
    els.gatewayEditCode.value = code;
    els.gatewayEditCode.disabled = Boolean(existing);
    els.gatewayEditEnable.checked = existing ? existing.enable : true;
    els.gatewayEditLivemode.checked = existing ? existing.livemode : false;
    els.gatewayEditManual.checked = existing ? existing.manual : false;
    els.gatewayEditLimit.value = existing?.limit || "";
    const methodDefaults = existing?.methods?.length ? existing.methods : existing?.config?.methods?.length ? existing.config.methods : [];
    els.gatewayConfigMethods.value = methodDefaults.join(", ");
    els.gatewayConfigConnect.checked = Boolean(existing?.config?.connect);
    els.gatewayConfigClientId.value = "";
    els.gatewayEditPublic.value = "";
    els.gatewayEditPrivate.value = "";

    els.gatewayEditor.classList.add("is-open");
    els.gatewayEditor.setAttribute("aria-hidden", "false");
    window.setTimeout(() => (existing ? els.gatewayEditLimit : els.gatewayEditCode).focus(), 0);
  }

  function closeGatewayEditor() {
    state.editingGatewayCode = null;
    els.gatewayEditor.classList.remove("is-open");
    els.gatewayEditor.setAttribute("aria-hidden", "true");
    els.gatewayEditCode.disabled = false;
    els.gatewayEditForm.reset();
  }

  async function submitGatewayEdit(event) {
    event.preventDefault();
    const code = els.gatewayEditOriginalCode.value || els.gatewayEditCode.value;
    if (!code) {
      notify("Gateway code is required.");
      return;
    }

    const payload = {
      enable: els.gatewayEditEnable.checked,
      livemode: els.gatewayEditLivemode.checked,
      manual: els.gatewayEditManual.checked,
    };
    if (els.gatewayEditLimit.value !== "") payload.limit = Number(els.gatewayEditLimit.value);

    const publicConfig = parseOptionalJson(els.gatewayEditPublic.value, "Public credentials JSON");
    if (publicConfig === false) return;
    const privateConfig = parseOptionalJson(els.gatewayEditPrivate.value, "Private credentials JSON");
    if (privateConfig === false) return;
    if (publicConfig) payload.public = publicConfig;
    if (privateConfig) payload.private = privateConfig;

    els.gatewayEditSubmit.disabled = true;
    try {
      await selldone.setGateway(code, payload);
      const methods = splitMethods(els.gatewayConfigMethods.value);
      if (methods.length) {
        const configPayload = {
          methods: methods.includes("card") ? methods : ["card", ...methods],
          connect: els.gatewayConfigConnect.checked,
        };
        if (els.gatewayConfigClientId.value.trim()) configPayload.client_id = els.gatewayConfigClientId.value.trim();
        await selldone.setGatewayConfig(code, configPayload);
      }
      closeGatewayEditor();
      await refreshPaymentGateways({ silent: true });
      notify("Gateway saved");
    } catch (error) {
      notify(formatPaymentActionError(error.message));
    } finally {
      els.gatewayEditSubmit.disabled = false;
    }
  }

  async function toggleGateway(gatewayCode) {
    const gateway = findGateway(gatewayCode);
    if (!gateway) {
      notify("Gateway was not found.");
      return;
    }

    try {
      await selldone.setGateway(gateway.code, {
        enable: !gateway.enable,
        livemode: gateway.livemode,
        manual: gateway.manual,
        ...(gateway.limit ? { limit: gateway.limit } : {}),
      });
      await refreshPaymentGateways({ silent: true });
      notify(`${gateway.title} ${gateway.enable ? "disabled" : "enabled"}`);
    } catch (error) {
      notify(formatPaymentActionError(error.message));
    }
  }

  async function deleteGateway(gatewayCode) {
    const gateway = findGateway(gatewayCode);
    if (!gateway) {
      notify("Gateway was not found.");
      return;
    }
    if (!window.confirm(`Delete ${gateway.title} from this shop?`)) return;

    try {
      await selldone.deleteGateway(gateway.code);
      if (state.activeGatewayCode === gateway.code) {
        state.activeGatewayCode = null;
        state.dashboard.gatewayTransactions = [];
        state.dashboard.gatewayTransactionTotal = 0;
      }
      await refreshPaymentGateways({ silent: true });
      notify("Gateway deleted");
    } catch (error) {
      notify(formatPaymentActionError(error.message));
    }
  }

  function fillGatewayOptions(selectedCode = "") {
    const byCode = new Map();
    [...state.dashboard.paymentGateways, ...state.dashboard.availableGateways].forEach((gateway) => {
      if (!gateway?.code) return;
      byCode.set(gateway.code, gateway);
    });
    if (selectedCode && !byCode.has(selectedCode)) {
      byCode.set(selectedCode, normalizeGateway({ code: selectedCode, name: selectedCode }));
    }
    els.gatewayEditCode.innerHTML = Array.from(byCode.values())
      .map((gateway) => `<option value="${escapeAttribute(gateway.code)}">${escapeHtml(gateway.title)} (${escapeHtml(gateway.code)})</option>`)
      .join("");
  }

  function findGateway(gatewayCode) {
    const code = String(gatewayCode || "");
    return state.dashboard.paymentGateways.find((gateway) => String(gateway.code) === code) || null;
  }

  function findAvailableGateway(gatewayCode) {
    const code = String(gatewayCode || "");
    return state.dashboard.availableGateways.find((gateway) => String(gateway.code) === code) || null;
  }

  function parseOptionalJson(value, label) {
    const text = String(value || "").trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        notify(`${label} must be a JSON object.`);
        return false;
      }
      return parsed;
    } catch {
      notify(`${label} is not valid JSON.`);
      return false;
    }
  }

  function handlePaymentError(label, error) {
    const message = formatPaymentActionError(error.message);
    state.dashboard.errors = [
      ...(state.dashboard.errors || []).filter((item) => item?.label !== label),
      { label, status: error.status || 503, code: error.code || "payment_gateway_failed", message },
    ];
    renderPayments();
    notify(message);
  }

  function formatPaymentActionError(message) {
    if (/scope|permission|403|forbidden|access/i.test(message || "")) {
      return "Reconnect with consent to grant payment gateway read/write access.";
    }
    if (/google2fa/i.test(message || "")) {
      return "Selldone requires Google 2FA verification for this payment gateway action.";
    }
    return message || "Payment gateway action failed.";
  }

  function getPaymentError() {
    return (state.dashboard.errors || []).find((error) => ["Payment Gateways", "Available Gateways"].includes(error?.label)) || null;
  }

  function setGatewayButtonsLoading(isLoading) {
    [els.refreshGatewaysButton, els.addGatewayButton, els.refreshGatewayTransactionsButton].filter(Boolean).forEach((button) => {
      button.disabled = isLoading;
    });
    if (els.refreshGatewaysButton?.querySelector("span")) {
      els.refreshGatewaysButton.querySelector("span").textContent = isLoading ? "Refreshing" : "Refresh Gateways";
    }
  }

  function hasPaymentWriteScope() {
    const scopes = state.session?.scopes || [];
    return scopes.includes("backoffice:shop:write") || scopes.includes("backoffice:finance:write");
  }

  function ensureSelectValue(select, value) {
    const text = String(value || "USD");
    if (![...select.options].some((option) => option.value === text)) {
      select.add(new Option(text, text));
    }
    select.value = text;
  }

  function splitMethods(value) {
    const methods = String(value || "")
      .split(/[,\s]+/)
      .map((method) => method.trim())
      .filter(Boolean);
    return Array.from(new Set(methods.filter((method) => PAYMENT_METHODS.includes(method))));
  }

  function normalizeMethods(value) {
    if (typeof value === "string") return splitMethods(value);
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.map((method) => String(method || "").trim()).filter(Boolean)));
  }

  function readFirstGatewayNumber(row, keys) {
    return readFirstNumber(row, keys);
  }

  function readBoolean(...values) {
    for (const value of values) {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      if (typeof value === "string") {
        if (/^(true|1|yes|on|active|enabled|live)$/i.test(value)) return true;
        if (/^(false|0|no|off|inactive|disabled|sandbox)$/i.test(value)) return false;
      }
    }
    return false;
  }

  function firstText(...values) {
    for (const value of values) {
      if (typeof value !== "string" && typeof value !== "number") continue;
      const text = String(value).trim();
      if (text && text !== "[object Object]") return text;
    }
    return "";
  }

  function gatewayStatusChipClass(status) {
    const value = String(status || "").toLowerCase();
    if (/paid|payed|success|complete|captur|deliver|active/.test(value)) return "chip-success";
    if (/pending|process|open|wait|review/.test(value)) return "chip-warning";
    if (/refund|return|cancel|fail|reject|risk/.test(value)) return "chip-danger";
    return "chip-neutral";
  }

  function resolveGatewayImage(record = {}) {
    return resolveSelldoneRecordImage(record, {
      scope: "gateways",
      shopId: record.shop_id || state.session?.shop?.id,
      size: 128,
      fields: ["icon_url", "icon_path", "icon", "logo_url", "logo_path", "logo", "image_url", "image", "path"],
    });
  }

  return {
    normalizeGateways,
    normalizeAvailableGateways,
    normalizeTransactions,
    renderPayments,
    refreshPaymentGateways,
    loadGatewayTransactions,
    openGatewayEditor,
    closeGatewayEditor,
    submitGatewayEdit,
    toggleGateway,
    deleteGateway,
    findGateway,
    formatPaymentActionError,
  };
}
