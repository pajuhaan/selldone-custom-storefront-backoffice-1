export function createStorefrontPayments({
  state,
  firstArrayValue,
  firstNonNull,
  escapeHtml,
  showToast,
  renderLiveCatalogEmptyState,
  checkoutSuccessUrl = null,
  onPaymentComplete = null,
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
    const fromUrl = stripeUrlParam(findStripeRedirectUrl(result), ["session_id", "sessionId", "checkout_session_id", "checkoutSessionId"]);
    if (fromUrl) return fromUrl;
    const anyId = findPaymentValue(result, ["id"]);
    return anyId.startsWith("cs_") ? anyId : "";
  }

  function findStripeClientSecret(result = {}) {
    return findPaymentValue(result, ["client_secret", "clientSecret", "payment_intent_client_secret", "paymentIntentClientSecret", "stripe_client_secret", "stripeClientSecret"])
      || stripeUrlParam(findStripeRedirectUrl(result), ["client_secret", "clientSecret", "payment_intent_client_secret", "paymentIntentClientSecret"]);
  }

  function stripeUrlParam(rawUrl = "", names = []) {
    const value = String(rawUrl || "").trim();
    if (!value) return "";
    try {
      const url = new URL(value, window.location.origin);
      for (const name of names) {
        const found = url.searchParams.get(name);
        if (found) return found.trim();
      }
    } catch {
      return "";
    }
    return "";
  }

  function findStripeRedirectUrl(result = {}, depth = 0, visited = new WeakSet()) {
    if (!result || depth > 5) return "";
    if (typeof result === "string") {
      const value = result.trim();
      return /[?&](client_secret|session_id|checkout_session_id)=/i.test(value) ? value : "";
    }
    if (typeof result !== "object" || visited.has(result)) return "";
    visited.add(result);

    const direct = firstNonNull(
      result?.redirect?.url,
      result?.redirect_url,
      result?.redirectUrl,
      result?.payment_url,
      result?.paymentUrl,
      result?.checkout_url,
      result?.checkoutUrl,
      result?.url,
      result?.link,
      result?.payment?.redirect?.url,
      result?.payment?.redirect_url,
      result?.payment?.url,
      result?.payment?.link,
      result?.gateway?.redirect?.url,
      result?.gateway?.url,
      "",
    );
    const directMatch = findStripeRedirectUrl(direct, depth + 1, visited);
    if (directMatch) return directMatch;

    for (const value of Object.values(result)) {
      const nested = findStripeRedirectUrl(value, depth + 1, visited);
      if (nested) return nested;
    }
    return "";
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
    const sessionId = findStripeCheckoutSessionId(result);
    const clientSecret = findStripeClientSecret(result);
    const isStripe = Boolean(clientSecret)
      || Boolean(sessionId)
      || Boolean(result?.stripe)
      || Boolean(result?.gateway?.stripe)
      || checkoutGatewayIsStripe(gatewayCode);
    if (!isStripe) return false;

    const publishableKey = stripePublishableKeyForResult(result, gatewayCode);
    if (!publishableKey || (!sessionId && !clientSecret)) return false;

    if (clientSecret) {
      return renderInlineStripePaymentForm({
        clientSecret,
        publishableKey,
        result,
        requestPayload,
      });
    }

    state.stripeLoading = true;
    showToast("Opening Stripe payment...");
    if (typeof checkoutSuccessUrl === "function") checkoutSuccessUrl(result, requestPayload);
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

  async function renderInlineStripePaymentForm({ clientSecret, publishableKey, result = {}, requestPayload = {} }) {
    state.checkoutSubmitting = false;
    state.stripeLoading = true;
    const app = document.getElementById("app");
    if (!app) return false;

    const returnUrl = (typeof checkoutSuccessUrl === "function" ? checkoutSuccessUrl(result, requestPayload) : "")
      || String(requestPayload.return_url || "").trim()
      || `${window.location.origin}${window.location.pathname}${window.location.search || ""}#account/orders`;
    const backUrl = String(requestPayload.back_url || "").trim() || "#checkout";
    app.innerHTML = `
      <div class="page-shell">
        <nav class="breadcrumbs" aria-label="Payment path">
          <a href="${escapeHtml(backUrl)}">Checkout</a><span>/</span><strong>Secure payment</strong>
        </nav>
        <section class="section stripe-payment-page">
          <div class="stripe-payment-shell">
            <div class="stripe-payment-copy">
              <span class="account-profile-kicker">Stripe payment</span>
              <h1>Complete payment securely</h1>
              <p>Your order is prepared in Selldone. Finish the card payment here without leaving Pajulina.</p>
              <div class="stripe-payment-badges">
                <span>Encrypted</span>
                <span>Stripe</span>
                <span>Selldone order</span>
              </div>
            </div>
            <form class="stripe-payment-card" data-stripe-payment-form>
              <div class="stripe-payment-element" data-stripe-payment-element></div>
              <p class="stripe-payment-message" data-stripe-payment-message role="alert"></p>
              <button class="black-button stripe-payment-submit" type="submit" data-stripe-payment-submit>
                Pay securely
              </button>
              <a class="text-link" href="${escapeHtml(backUrl)}">Back to checkout</a>
            </form>
          </div>
        </section>
      </div>
    `;

    showToast("Loading secure Stripe form...");
    const Stripe = await loadStripeJs();
    const stripe = Stripe(publishableKey);

    if (clientSecret.startsWith("cs_") && typeof stripe.initEmbeddedCheckout === "function") {
      const checkout = await stripe.initEmbeddedCheckout({ clientSecret });
      checkout.mount("[data-stripe-payment-element]");
      state.stripeLoading = false;
      return true;
    }

    const elements = stripe.elements({
      clientSecret,
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#1f8f3a",
          colorText: "#1d1d1f",
          colorDanger: "#b00020",
          borderRadius: "12px",
          fontFamily: "Arial, sans-serif",
        },
      },
    });
    const paymentElement = elements.create("payment", { layout: "tabs" });
    paymentElement.mount("[data-stripe-payment-element]");

    const form = app.querySelector("[data-stripe-payment-form]");
    const submit = app.querySelector("[data-stripe-payment-submit]");
    const message = app.querySelector("[data-stripe-payment-message]");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Processing payment...";
      }
      if (message) message.textContent = "";

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: "if_required",
      });

      if (error) {
        if (message) message.textContent = error.message || "Stripe payment failed.";
        showToast(error.message || "Stripe payment failed.");
        if (submit) {
          submit.disabled = false;
          submit.textContent = "Pay securely";
        }
        return;
      }

      const status = paymentIntent?.status || "processing";
      showToast(`Stripe payment ${status}.`);
      if (status === "succeeded" && typeof onPaymentComplete === "function") {
        await onPaymentComplete(result, requestPayload, paymentIntent);
        return;
      }
      renderLiveCatalogEmptyState(
        status === "succeeded" ? "Payment completed" : "Payment processing",
        status === "succeeded"
          ? "Stripe confirmed the payment. Your Selldone order history will update shortly."
          : "Stripe accepted the payment step. Selldone will confirm the order shortly.",
      );
    });

    state.stripeLoading = false;
    return true;
  }

  return {
    checkoutGateways,
    checkoutSubmitLabel,
    handleStripeCheckoutResult,
    renderCheckoutPaymentOptions,
  };
}
