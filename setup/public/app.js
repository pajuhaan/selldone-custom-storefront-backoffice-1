const state = {
  status: null,
  mode: "connect",
};

const els = {
  connectButton: document.querySelector("[data-connect-button]"),
  manualToggle: document.querySelector("[data-manual-toggle]"),
  cards: document.querySelectorAll("[data-mode-card]"),
  modeButtons: document.querySelectorAll("[data-mode]"),
  panels: document.querySelectorAll("[data-panel]"),
  manualForm: document.querySelector("[data-manual-form]"),
  autoForm: document.querySelector("[data-auto-form]"),
  status: document.querySelector("[data-status]"),
  mcpRequest: document.querySelector("[data-mcp-request]"),
  callbackNote: document.querySelector("[data-callback-note]"),
};

init();

async function init() {
  bindEvents();
  await loadStatus();
}

function bindEvents() {
  els.connectButton?.addEventListener("click", submitConnect);
  els.modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
  els.manualForm?.addEventListener("submit", submitManual);
  els.autoForm?.addEventListener("submit", submitAuto);
  els.manualForm?.appBaseUrl?.addEventListener("input", updateCallbackNote);
}

async function loadStatus() {
  try {
    const payload = await requestJson("/setup/api/status");
    state.status = payload;
    fillDefaults(payload.config || {});
    els.mcpRequest.textContent = JSON.stringify(payload.mcp?.parameters || {}, null, 2);
    updateCallbackNote();
    setStatus(
      payload.setupComplete
        ? "Setup is already complete. Connect again to refresh authentication, or open manual settings to replace .env."
        : "Ready. Connect to continue with Selldone setup."
    );
  } catch (error) {
    setStatus(error.message, true);
  }
}

function fillDefaults(config) {
  els.manualForm.clientId.value = config.clientId || "";
  els.manualForm.shopId.value = config.shopId || "";
  els.manualForm.shopName.value = config.shopName || "";
  els.manualForm.shopDomain.value = config.shopDomain || "";
  els.manualForm.storefrontShopHandle.value = config.storefrontShopHandle || "";
  els.manualForm.appBaseUrl.value = config.appBaseUrl || "http://localhost:5173";
  els.manualForm.authPrompt.value = config.authPrompt || "consent";
  els.manualForm.scopes.value = (config.scopes || []).join(", ");
}

function setMode(mode) {
  state.mode = mode;
  els.cards.forEach((card) => card.classList.toggle("is-active", card.dataset.modeCard === mode));
  els.panels.forEach((panel) => panel.classList.toggle("d-none", panel.dataset.panel !== mode));
  els.manualToggle?.setAttribute("aria-expanded", String(mode === "manual"));
}

async function submitConnect(event) {
  event.preventDefault();
  const payload = setupPayload();
  await submitSetup("/setup/api/auto", payload, { fromConnectButton: true });
}

async function submitManual(event) {
  event.preventDefault();
  await submitSetup("/setup/api/manual", setupPayload());
}

async function submitAuto(event) {
  event.preventDefault();
  await submitSetup("/setup/api/auto", setupPayload({ includeMcpResult: true }));
}

async function submitSetup(url, payload, options = {}) {
  setStatus("Saving setup...");
  try {
    const result = await requestJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setStatus("Setup saved. Redirecting to Selldone authentication...", false, true);
    window.setTimeout(() => {
      window.location.assign(result.next || "/auth/start");
    }, 600);
  } catch (error) {
    if (options.fromConnectButton && error.payload?.code === "mcp_bridge_required") {
      setMode("auto");
      setStatus(
        "Automatic setup needs the Selldone MCP client result. Run the shown request, paste the returned JSON, then save the connector result.",
        true
      );
      return;
    }
    setStatus(error.message, true);
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { headers: { Accept: "application/json", ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || `Request failed: ${response.status}`);
    error.payload = data;
    throw error;
  }
  return data;
}

function setupPayload(options = {}) {
  const payload = formPayload(els.manualForm);
  payload.scopes = splitScopes(payload.scopes);
  if (options.includeMcpResult) payload.mcpResult = els.autoForm.mcpResult.value;
  return payload;
}

function formPayload(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function splitScopes(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function updateCallbackNote() {
  const base = String(els.manualForm.appBaseUrl.value || "http://localhost:5173").replace(/\/$/, "");
  els.callbackNote.textContent = `OAuth callback: ${base}/callback`;
}

function setStatus(message, isError = false, isSuccess = false) {
  els.status.textContent = message;
  els.status.classList.toggle("is-error", isError);
  els.status.classList.toggle("is-success", isSuccess);
}
