const state = {
  status: null,
  mode: "manual",
};

const els = {
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
  els.modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
  els.manualForm.addEventListener("submit", submitManual);
  els.autoForm.addEventListener("submit", submitAuto);
  els.manualForm.appBaseUrl.addEventListener("input", updateCallbackNote);
}

async function loadStatus() {
  try {
    const payload = await requestJson("/setup/api/status");
    state.status = payload;
    fillDefaults(payload.config || {});
    els.mcpRequest.textContent = JSON.stringify(payload.mcp?.parameters || {}, null, 2);
    updateCallbackNote();
    setStatus(payload.setupComplete ? "Setup is already complete. You can open /dashboard/ or run setup again to replace .env." : "Choose a setup path to continue.");
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
  els.manualForm.scopes.value = (config.scopes || []).join(", ");
}

function setMode(mode) {
  state.mode = mode;
  els.cards.forEach((card) => card.classList.toggle("is-active", card.dataset.modeCard === mode));
  els.panels.forEach((panel) => panel.classList.toggle("d-none", panel.dataset.panel !== mode));
}

async function submitManual(event) {
  event.preventDefault();
  const payload = formPayload(els.manualForm);
  payload.scopes = splitScopes(payload.scopes);
  await submitSetup("/setup/api/manual", payload);
}

async function submitAuto(event) {
  event.preventDefault();
  const payload = {
    ...formPayload(els.manualForm),
    scopes: splitScopes(els.manualForm.scopes.value),
    mcpResult: els.autoForm.mcpResult.value,
  };
  await submitSetup("/setup/api/auto", payload);
}

async function submitSetup(url, payload) {
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
    setStatus(error.message, true);
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { headers: { Accept: "application/json", ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const extra = data.mcp ? `\n\nMCP request:\n${JSON.stringify(data.mcp.parameters, null, 2)}` : "";
    throw new Error(`${data.error || data.message || `Request failed: ${response.status}`}${extra}`);
  }
  return data;
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
