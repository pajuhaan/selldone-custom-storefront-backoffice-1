export function createStorefrontPayments({
  state,
  firstArrayValue,
  firstNonNull,
  escapeHtml,
  showToast,
  renderLiveCatalogEmptyState,
}) {
  let stripeJsPromise = null;

  function checkoutGatewayPublicKey(gateway = {}) {
    return String(firstNonNull(
      gateway?.public?.key,
      gateway?.public?.publishable_key,
      gateway?.public?.publishableKey,
      gateway?.public_key,
      gateway?.publishable_key,
      gateway?.publishableKey,
      gateway?.stripe_public_key,
      gateway?.stripePublishableKey,
      "",
    ) || "").trim();
  }

  function checkoutGatewayIsStripe(code = "", gateway = {}) {
    return [
      code,
      gateway?.code,
      gateway?.gateway_code,
      gateway?.gatewayCode,
      gateway?.name,
      gateway?.title,
      gateway?.type,
    ].map((value) => String(value || "").toLowerCase()).join(" ").includes("stripe");
  }

  function checkoutGateways(currency = "") {
    const gateways = firstArrayValue(
      state.storefrontShopInfo?.gateways,
      state.storefrontShopInfo?.shop?.gateways,
    );
    const desiredCurrency = String(currency || "").trim();
    return gateways
      .filter((gateway) => gateway && typeof gateway === "object")
      .filter((gateway) => gateway.enable !== false && gateway.enabled !== false && gateway.active !== false)
      .filter((gateway) => {
        const gatewayCurrency = String(firstNonNull(gateway.currency, gateway.currency_code, "") || "").trim();
        return !desiredCurrency || !gatewayCurrency || gatewayCurrency === desiredCurrency;
      })
      .map((gateway) => {
        const code = String(firstNonNull(gateway.code, gateway.gateway_code, gateway.gatewayCode, gateway.name, gateway.type, gateway.id, "") || "").trim();
        if (!code) return null;
        const publicKey = checkoutGatewayPublicKey(gateway);
        const stripe = checkoutGatewayIsStripe(code, gateway);
        return {
          code,
          title: String(firstNonNull(gateway.title, gateway.name, gateway.label, code) || code),
          cod: gateway.cod === true || code.toLowerCase() === "cod",
          stripe,
          publicKey,
          gateway,
        };
      })
      .filter(Boolean);
  }

  function checkoutDefaultGatewayCode(bill = {}, currency = "") {
    const current = String(state.checkoutGatewayCode || "").trim();
    const gateways = checkoutGateways(currency);
    const gatewayCodes = gateways.map((gateway) => gateway.code);
    if (current && (current === "cod" || gatewayCodes.includes(current))) return current;
    return gateways.find((gateway) => gateway.stripe && !gateway.cod)?.code
      || gateways.find((gateway) => !gateway.cod)?.code
      || (bill?.can_cod === true ? "cod" : "")
      || gatewayCodes[0]
      || "auto";
  }

  function renderCheckoutPaymentOptions(bill = {}, currency = "") {
    const selected = checkoutDefaultGatewayCode(bill, currency);
    state.checkoutGatewayCode = selected;
    const gateways = checkoutGateways(currency).filter((gateway) => !gateway.cod);
    const selectedGateway = gateways.find((gateway) => gateway.code === selected);
    state.stripePublishableKey = selectedGateway?.stripe ? selectedGateway.publicKey : "";
    const options = [
      bill?.can_cod === true
        ? {
            code: "cod",
            title: "Cash on delivery",
            body: "Pay when the physical order is delivered.",
          }
        : null,
      ...gateways.map((gateway) => ({
        code: gateway.code,
        title: gateway.title,
        body: gateway.stripe
          ? gateway.publicKey
            ? "Pay securely by card with Stripe."
            : "Stripe is enabled, but Selldone did not return a publishable key."
          : "Pay securely through Selldone.",
        badge: gateway.stripe ? "Stripe" : "",
      })),
    ].filter(Boolean);

    if (!options.length) {
      return `<p class="checkout-status checkout-status--error">No Selldone payment gateway is available for this basket.</p>`;
    }

    return `
      <div class="checkout-payment-options" role="radiogroup" aria-label="Payment method">
        ${options
          .map(
            (option) => `
              <label class="checkout-payment-option ${selected === option.code ? "is-active" : ""}">
                <input type="radio" name="gatewayCode" value="${escapeHtml(option.code)}" ${selected === option.code ? "checked" : ""} />
                <span>
                  <strong>${escapeHtml(option.title)}</strong>
                  <small>${escapeHtml(option.body)}</small>
                  ${option.badge ? `<em>${escapeHtml(option.badge)}</em>` : ""}
                </span>
              </label>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function checkoutSubmitLabel(bill = {}) {
    if (!state.sessionAuthenticated) return "Log in to place order";
    if (state.checkoutSubmitting) return "Processing checkout...";
    if (bill?.can_cod === true && state.checkoutGatewayCode === "cod") return "Place COD order";
    return "Continue to payment";
  }

  function loadStripeJs() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (!stripeJsPromise) {
      stripeJsPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://js.stripe.com/v3/";
        script.async = true;
        script.onload = () => window.Stripe ? resolve(window.Stripe) : reject(new Error("Stripe.js did not initialize."));
        script.onerror = () => reject(new Error("Could not load Stripe.js."));
        document.head.appendChild(script);
      });
    }
    return stripeJsPromise;
  }

  function normalizePaymentLookupKey(key) {
    return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function findPaymentValue(source, keys, depth = 0, visited = new WeakSet()) {
    if (!source || typeof source !== "object" || depth > 5 || visited.has(source)) return "";
    visited.add(source);
    const wanted = new Set(keys.map(normalizePaymentLookupKey));
    for (const [key, value] of Object.entries(source)) {
      if (!wanted.has(normalizePaymentLookupKey(key))) continue;
      if (value === null || value === undefined) continue;
      if (typeof value === "string" || typeof value === "number") return String(value).trim();
    }
    for (const value of Object.values(source)) {
      if (!value || typeof value !== "object") continue;
      const nested = findPaymentValue(value, keys, depth + 1, visited);
      if (nested) return nested;
    }
    return "";
  }

  function findStripeCheckoutSessionId(result = {}) {
    const direct = findPaymentValue(result, ["session_id", "sessionId", "stripe_session_id", "stripeSessionId", "checkout_session_id", "checkoutSessionId"]);
    if (direct) return direct;
    const anyId = findPaymentValue(result, ["id"]);
    return anyId.startsWith("cs_") ? anyId : "";
  }

  function findStripeClientSecret(result = {}) {
    return findPaymentValue(result, ["client_secret", "clientSecret", "payment_intent_client_secret", "paymentIntentClientSecret", "stripe_client_secret", "stripeClientSecret"]);
  }

  function stripePublishableKeyForResult(result = {}, fallbackGatewayCode = "") {
    const fromResult = String(firstNonNull(
      result?.stripe?.publishableKey,
      result?.stripe?.publishable_key,
      result?.gateway?.publicKey,
      result?.gateway?.public?.key,
      result?.payment?.public?.key,
      result?.payment?.publishable_key,
      "",
    ) || "").trim();
    if (fromResult) return fromResult;
    const gateway = checkoutGateways(result?.bill?.currency || result?.payment?.currency || "")
      .find((item) => item.code === fallbackGatewayCode || item.code === result?.gatewayCode);
    return gateway?.publicKey || state.stripePublishableKey || "";
  }

  async function handleStripeCheckoutResult(result = {}, requestPayload = {}) {
    const gatewayCode = String(firstNonNull(result.gatewayCode, requestPayload.gateway_code, state.checkoutGatewayCode, "") || "").trim();
    const isStripe = Boolean(result?.stripe) || Boolean(result?.gateway?.stripe) || checkoutGatewayIsStripe(gatewayCode);
    if (!isStripe) return false;

    const publishableKey = stripePublishableKeyForResult(result, gatewayCode);
    const sessionId = findStripeCheckoutSessionId(result);
    const clientSecret = findStripeClientSecret(result);
    if (!publishableKey || (!sessionId && !clientSecret)) return false;

    state.stripeLoading = true;
    showToast("Opening Stripe payment...");
    const Stripe = await loadStripeJs();
    const stripe = Stripe(publishableKey);

    if (sessionId) {
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw new Error(error.message || "Stripe checkout could not start.");
      return true;
    }

    if (clientSecret && typeof stripe.handleNextAction === "function") {
      const { error, paymentIntent } = await stripe.handleNextAction({ clientSecret });
      if (error) throw new Error(error.message || "Stripe payment action failed.");
      state.checkoutSubmitting = false;
      const status = paymentIntent?.status || "processing";
      showToast(`Stripe payment ${status}.`);
      renderLiveCatalogEmptyState("Payment processing", "Stripe completed the payment step. Selldone will confirm the order shortly.");
      return true;
    }

    return false;
  }

  return {
    checkoutGateways,
    checkoutSubmitLabel,
    handleStripeCheckoutResult,
    renderCheckoutPaymentOptions,
  };
}
