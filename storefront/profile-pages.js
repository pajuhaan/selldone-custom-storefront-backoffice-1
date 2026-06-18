const PROFILE_PAGE_ROUTES = new Map([
  ["about", "about"],
  ["about-us", "about"],
  ["aboutus", "about"],
  ["privacy", "privacy"],
  ["privacy-policy", "privacy"],
  ["terms", "terms"],
  ["terms-of-service", "terms"],
  ["terms-conditions", "terms"],
  ["shipping", "shipping"],
  ["delivery", "shipping"],
  ["returns", "returns"],
  ["return-policy", "returns"],
  ["refund", "returns"],
  ["refund-policy", "returns"],
  ["contact", "contact"],
  ["contact-us", "contact"],
]);

const PROFILE_PAGE_META = {
  about: {
    eyebrow: "Shop profile",
    title: "About us",
    summary: "Brand story and shop details from the Selldone shop profile.",
    keys: ["about", "aboutus", "about_us", "story", "bio", "description", "shop_description", "summary", "lead"],
  },
  privacy: {
    eyebrow: "Policy",
    title: "Privacy policy",
    summary: "How this shop handles customer information.",
    keys: ["privacy", "privacypolicy", "privacy_policy", "policy_privacy"],
  },
  terms: {
    eyebrow: "Policy",
    title: "Terms & conditions",
    summary: "Terms of sale and storefront usage.",
    keys: ["terms", "termsofservice", "terms_of_service", "termsconditions", "terms_conditions", "conditions"],
  },
  shipping: {
    eyebrow: "Delivery",
    title: "Shipping & delivery",
    summary: "Delivery information and transport options configured in Selldone.",
    keys: ["shipping", "shippingpolicy", "shipping_policy", "delivery", "deliveryinfo", "delivery_info", "transportation"],
  },
  returns: {
    eyebrow: "Policy",
    title: "Returns & refunds",
    summary: "Return, refund, and warranty information from the shop profile.",
    keys: ["returns", "returnpolicy", "return_policy", "refund", "refundpolicy", "refund_policy", "warranty", "return_warranty"],
  },
  contact: {
    eyebrow: "Support",
    title: "Contact us",
    summary: "Customer support and shop contact information.",
    keys: ["contact", "contacts", "contactus", "contact_us", "support"],
  },
};

const PROFILE_DOCUMENT_TYPES = {
  about: "about-us",
  privacy: "privacy",
  terms: "terms",
  contact: "contact-us",
};

let shopProfilePromise = null;
const profileDocumentPromises = new Map();

function currentProfilePageKey() {
  const rawHash = window.location.hash.replace(/^#/, "").split(/[/?&]/)[0].trim().toLowerCase();
  return PROFILE_PAGE_ROUTES.get(rawHash) || null;
}

function appRoot() {
  return document.querySelector("#app, [data-app-root], [data-storefront-root], main");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function firstObject(...values) {
  return values.find((value) => value && typeof value === "object" && !Array.isArray(value)) || null;
}

function firstArray(...values) {
  return values.find((value) => Array.isArray(value)) || [];
}

function valueIsUseful(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function findValueByKeys(source, keys, depth = 0, visited = new WeakSet()) {
  if (!source || typeof source !== "object" || depth > 5 || visited.has(source)) return null;
  visited.add(source);

  const normalizedKeys = new Set(keys.map(normalizeKey));
  for (const [key, value] of Object.entries(source)) {
    if (normalizedKeys.has(normalizeKey(key)) && valueIsUseful(value)) return value;
  }

  for (const value of Object.values(source)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const nested = findValueByKeys(value, keys, depth + 1, visited);
    if (valueIsUseful(nested)) return nested;
  }

  return null;
}

function plainTextToHtml(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function sanitizeRichHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  template.content.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = String(attribute.value || "").trim().toLowerCase();
      if (name.startsWith("on") || name === "style") node.removeAttribute(attribute.name);
      if ((name === "href" || name === "src") && value.startsWith("javascript:")) node.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
}

function renderValue(value) {
  if (!valueIsUseful(value)) return "";
  if (typeof value === "string") {
    return /<\/?[a-z][\s\S]*>/i.test(value) ? sanitizeRichHtml(value) : plainTextToHtml(value);
  }
  if (Array.isArray(value)) {
    return `<ul>${value
      .filter(valueIsUseful)
      .map((item) => `<li>${typeof item === "object" ? renderObjectSummary(item) : escapeHtml(item)}</li>`)
      .join("")}</ul>`;
  }
  if (typeof value === "object") return renderObjectSummary(value);
  return `<p>${escapeHtml(value)}</p>`;
}

function renderObjectSummary(value) {
  return `<dl>${Object.entries(value || {})
    .filter(([, entry]) => valueIsUseful(entry) && typeof entry !== "object")
    .map(([key, entry]) => `<div><dt>${escapeHtml(labelFromKey(key))}</dt><dd>${escapeHtml(entry)}</dd></div>`)
    .join("")}</dl>`;
}

function labelFromKey(key) {
  return String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeShopProfilePayload(payload) {
  const shop = firstObject(payload?.shop, payload?.shopInfo?.shop, payload?.shopInfo?.data?.shop, payload?.shopInfo?.payload?.shop, payload?.shopInfo);
  const profile = firstObject(payload?.profile, shop?.profile, shop?.shop_profile, shop?.info, payload?.shopInfo?.profile);
  const transportations = firstArray(
    payload?.transportations,
    payload?.shopInfo?.transportations,
    payload?.shopInfo?.data?.transportations,
    shop?.transportations,
    shop?.transportation,
  );
  return { payload, shop, profile, roots: [profile, shop, payload?.shopInfo, payload].filter(Boolean), transportations };
}

async function loadShopProfile() {
  if (!shopProfilePromise) {
    shopProfilePromise = fetch("/api/storefront/shop/info", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) throw new Error(payload?.error || "Could not load shop profile.");
        return normalizeShopProfilePayload(payload);
      })
      .catch((error) => {
        shopProfilePromise = null;
        throw error;
      });
  }
  return shopProfilePromise;
}

async function loadProfileDocument(pageKey) {
  const type = PROFILE_DOCUMENT_TYPES[pageKey];
  if (!type) return "";
  if (!profileDocumentPromises.has(type)) {
    profileDocumentPromises.set(
      type,
      fetch(`/api/storefront/profiles/${encodeURIComponent(type)}`, { headers: { Accept: "application/json" } })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload?.ok === false) throw new Error(payload?.error || "Could not load shop profile document.");
          const body = payload?.body || payload?.profile?.body || payload?.payload?.body || payload?.payload?.profile?.body || "";
          return body ? sanitizeRichHtml(body) : "";
        })
        .catch((error) => {
          profileDocumentPromises.delete(type);
          throw error;
        }),
    );
  }
  return profileDocumentPromises.get(type);
}

function extractPageContent(profileData, pageKey) {
  const meta = PROFILE_PAGE_META[pageKey];
  for (const root of profileData.roots) {
    const value = findValueByKeys(root, meta.keys);
    if (valueIsUseful(value)) return renderValue(value);
  }
  if (pageKey === "contact") return renderContactFallback(profileData);
  if (pageKey === "shipping") return renderShippingFallback(profileData);
  return "";
}

function renderContactFallback({ shop, profile }) {
  const fields = [
    ["Email", findValueByKeys({ shop, profile }, ["email", "supportemail", "support_email"])],
    ["Phone", findValueByKeys({ shop, profile }, ["phone", "tel", "mobile"])],
    ["Address", findValueByKeys({ shop, profile }, ["address", "location"])],
    ["Website", shop?.domain || shop?.url || shop?.web],
  ].filter(([, value]) => valueIsUseful(value));

  if (!fields.length) return "";
  return `<dl>${fields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
}

function renderShippingFallback({ transportations }) {
  if (!transportations.length) return "";
  return `<div class="profile-policy-grid">${transportations
    .map((item) => {
      const title = item?.title || item?.name || item?.type || "Delivery option";
      const description = item?.description || item?.note || item?.message || item?.duration || "";
      const price = item?.price || item?.cost || item?.amount || "";
      return `
        <article class="profile-policy-card">
          <strong>${escapeHtml(title)}</strong>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
          ${price ? `<span>${escapeHtml(price)}</span>` : ""}
        </article>
      `;
    })
    .join("")}</div>`;
}

function renderProfilePageShell(pageKey, profileData, content) {
  const meta = PROFILE_PAGE_META[pageKey];
  const shopName = profileData.shop?.title || profileData.shop?.name || "Pajulina";
  return `
    <section class="profile-page page-shell">
      <nav class="profile-breadcrumb" aria-label="Breadcrumb">
        <a href="#home">Home</a>
        <span>/</span>
        <span>${escapeHtml(meta.title)}</span>
      </nav>
      <header class="profile-hero">
        <span>${escapeHtml(meta.eyebrow)}</span>
        <h1>${escapeHtml(meta.title)}</h1>
        <p>${escapeHtml(meta.summary)}</p>
      </header>
      <article class="profile-content-card">
        <div class="profile-content">
          ${content || `<p>${escapeHtml(shopName)} has not published this section in the Selldone shop profile yet.</p>`}
        </div>
      </article>
    </section>
  `;
}

async function renderProfilePage() {
  const pageKey = currentProfilePageKey();
  if (!pageKey) return false;

  const root = appRoot();
  if (!root) return false;

  root.innerHTML = `
    <section class="profile-page page-shell">
      <article class="profile-content-card">
        <div class="profile-loading">Loading shop profile...</div>
      </article>
    </section>
  `;

  try {
    const [profileData, documentContent] = await Promise.all([
      loadShopProfile(),
      loadProfileDocument(pageKey).catch(() => ""),
    ]);
    const content = documentContent || extractPageContent(profileData, pageKey);
    root.innerHTML = renderProfilePageShell(pageKey, profileData, content);
  } catch (error) {
    root.innerHTML = `
      <section class="profile-page page-shell">
        <article class="profile-content-card">
          <div class="profile-content">
            <h1>Shop profile is unavailable</h1>
            <p>${escapeHtml(error?.message || "Could not load shop profile.")}</p>
            <a class="pill-button" href="#shop">Back to shop</a>
          </div>
        </article>
      </section>
    `;
  }

  return true;
}

function hydrateProfileLinks() {
  const nav = document.querySelector(".footer-bottom nav[aria-label='Legal'], footer nav[aria-label='Legal']");
  if (!nav) return;

  [
    ["About us", "#about"],
    ["Privacy", "#privacy"],
    ["Terms", "#terms"],
    ["Shipping", "#shipping"],
    ["Returns", "#returns"],
    ["Contact", "#contact"],
  ].forEach(([label, href]) => {
    if (nav.querySelector(`a[href="${href}"]`)) return;
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    nav.appendChild(link);
  });
}

window.addEventListener("hashchange", () => {
  window.setTimeout(() => {
    void renderProfilePage();
  }, 0);
});

hydrateProfileLinks();
void renderProfilePage();
