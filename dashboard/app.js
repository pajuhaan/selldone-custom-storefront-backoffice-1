import { createCustomerFeature } from "./features/customers.js";
import { createSelldoneDirectClient } from "./features/selldone-direct.js";

const LOW_STOCK_LIMIT = 8;
const LOCAL_APP_URL = "http://localhost:5173/dashboard/";
const AUTH_REDIRECT_KEY = "pajulina_auth_redirect_started";
const CONSENT_REDIRECT_KEY = "pajulina_consent_redirect_started";
const THEME_KEY = "pajulina_dashboard_theme_v2";
const SELLDONE_CDN_BASE = "https://cdn.selldone.com/app";

const VIEW_META = {
  overview: {
    title: "Dashboard",
    eyebrow: "Operations",
    subtitle: (name) => `Welcome back, ${name}. Here is what is happening with your store.`,
  },
  suite: {
    title: "Selldone Suite",
    eyebrow: "Modules",
    subtitle: () => "A complete map of Selldone backoffice sections, permissions, and next dashboard pages.",
  },
  orders: {
    title: "Orders & Fulfillment",
    eyebrow: "Process Center",
    subtitle: () => "Manage, track, and fulfill customer orders seamlessly.",
  },
  products: {
    title: "Products",
    eyebrow: "Inventory",
    subtitle: () => "Manage your catalog, stock, variants, and product performance.",
  },
  customers: {
    title: "Customers",
    eyebrow: "CRM",
    subtitle: () => "Manage customer records, loyalty signals, segments, and profile details.",
  },
  customerDetail: {
    title: "Customer Detail",
    eyebrow: "Customer",
    subtitle: () => "Review profile data, addresses, orders, CLV, activity, and raw Selldone fields.",
  },
  productDetail: {
    title: "Product Detail",
    eyebrow: "Product",
    subtitle: () => "Review catalog data, inventory, pricing, media, and raw Selldone fields.",
  },
  blog: {
    title: "Blog Posts",
    eyebrow: "Content",
    subtitle: () => "Manage Selldone shop articles, publishing status, tags, and scheduled posts.",
  },
  marketing: {
    title: "Marketing",
    eyebrow: "CRM",
    subtitle: () => "Grow your brand, engage your audience, and maximize revenue.",
  },
  analytics: {
    title: "Analytics",
    eyebrow: "Reports",
    subtitle: () => "Deeper reporting for catalog, inventory, orders, and finance signals.",
  },
  settings: {
    title: "Settings",
    eyebrow: "Connection",
    subtitle: () => "OAuth consent, API status, and operational quick actions.",
  },
};

const ACCENTS = {
  purple: "var(--accent-violet)",
  blue: "var(--accent-blue)",
  green: "var(--accent-green)",
  orange: "var(--accent-orange)",
  red: "var(--accent-red)",
  pink: "var(--accent-pink)",
};

const MODULE_CATALOG = [
  {
    key: "DASHBOARD",
    title: "Dashboard & Reports",
    group: "Operations",
    icon: "bi-speedometer2",
    body: "Store health, daily analytics, traffic, sales, and executive reporting.",
    route: "overview",
    scopes: ["backoffice:shop:read", "backoffice:report:read"],
  },
  {
    key: "PRODUCTS",
    title: "Products",
    group: "Catalog",
    icon: "bi-box-seam",
    body: "Product list, detail pages, pricing, stock, media, variants, and product notes.",
    route: "products",
    scopes: ["backoffice:product:read", "backoffice:product:write"],
  },
  {
    key: "CATEGORIES",
    title: "Categories",
    group: "Catalog",
    icon: "bi-diagram-3",
    body: "Category tree, folder structure, category notes, merchandising, and catalog navigation.",
    route: "products",
    scopes: ["backoffice:category:read", "backoffice:category:write"],
  },
  {
    key: "ORDERS",
    title: "Orders & Fulfillment",
    group: "Orders",
    icon: "bi-receipt",
    body: "Process center, baskets, fulfillment status, vendor orders, returns, and delivery actions.",
    route: "orders",
    scopes: ["backoffice:order:read", "backoffice:order:write", "vendor-read", "vendor-write"],
  },
  {
    key: "CUSTOMERS",
    title: "Customers & Reviews",
    group: "Customers",
    icon: "bi-people",
    body: "Customer records, reviews, satisfaction, cohorts, repeat customers, and audience signals.",
    route: "customers",
    scopes: ["backoffice:customer:read", "backoffice:customer:write", "backoffice:reviews:read", "backoffice:reviews:write"],
  },
  {
    key: "COMMUNITY",
    title: "Community",
    group: "Customers",
    icon: "bi-chat-square-heart",
    body: "Community spaces, customer engagement, discussions, and member management.",
    route: "marketing",
    scopes: ["backoffice:community:read", "backoffice:community:write"],
  },
  {
    key: "MARKETING",
    title: "Marketing",
    group: "Growth",
    icon: "bi-megaphone",
    body: "Campaign candidates, CRM opportunities, funnel analysis, and campaign reporting.",
    route: "marketing",
    scopes: ["backoffice:discount-code:read", "backoffice:coupon:read", "backoffice:offer:read"],
  },
  {
    key: "INCENTIVES",
    title: "Discounts & Incentives",
    group: "Growth",
    icon: "bi-percent",
    body: "Discount codes, coupons, offers, cashbacks, lotteries, ribbons, and affiliate tools.",
    route: "marketing",
    scopes: [
      "backoffice:discount-code:read",
      "backoffice:discount-code:write",
      "backoffice:coupon:read",
      "backoffice:coupon:write",
      "backoffice:offer:read",
      "backoffice:offer:write",
      "backoffice:cashback:read",
      "backoffice:lottery:read",
      "backoffice:ribbon:read",
      "backoffice:affiliate:read",
    ],
  },
  {
    key: "ACCOUNTING",
    title: "Finance & Accounting",
    group: "Finance",
    icon: "bi-wallet2",
    body: "Financial accounts, payouts, gift cards, vendor payments, and monetization signals.",
    route: "analytics",
    scopes: [
      "backoffice:finance:read",
      "backoffice:finance:write",
      "backoffice:giftcard:read",
      "backoffice:vendor-payment:read",
      "selldone:monetization:read",
    ],
  },
  {
    key: "LOGISTIC",
    title: "Logistics & Warehouse",
    group: "Operations",
    icon: "bi-truck",
    body: "Warehouses, shipping operations, delivery health, process-center logistics, and print support.",
    route: "orders",
    scopes: ["backoffice:logistic:read", "backoffice:logistic:write", "backoffice:print:read", "backoffice:print:write"],
  },
  {
    key: "PAGES",
    title: "Pages & Page Builder",
    group: "Content",
    icon: "bi-file-earmark-richtext",
    body: "Backoffice page builder, page files, page preview, SEO content, and landing pages.",
    route: "suite",
    scopes: ["backoffice:page:read", "backoffice:page:write"],
  },
  {
    key: "BLOG",
    title: "Blog & Articles",
    group: "Content",
    icon: "bi-journal-text",
    body: "Articles, content publishing, FAQ, AI content assistance, and knowledge pages.",
    route: "blog",
    scopes: ["articles", "backoffice:faq:read", "backoffice:faq:write", "backoffice:ai:read", "backoffice:ai:write"],
  },
  {
    key: "CHANNELS",
    title: "Channels & Connect",
    group: "Platform",
    icon: "bi-broadcast-pin",
    body: "Sales channels, connect providers, integrations, and external commerce surfaces.",
    route: "suite",
    scopes: ["connect:provider:read", "connect:provider:write"],
  },
  {
    key: "APPLICATIONS",
    title: "Apps & Integrations",
    group: "Platform",
    icon: "bi-puzzle",
    body: "Installed applications, app integrations, provider connections, and platform extensions.",
    route: "suite",
    scopes: ["connect:provider:read", "selldone:developer:read"],
  },
  {
    key: "AUTOMATION",
    title: "Automation",
    group: "Operations",
    icon: "bi-magic",
    body: "Automated workflows, operational triggers, AI commands, and future process automations.",
    route: "suite",
    scopes: ["backoffice:ai:read", "backoffice:ai:write", "backoffice:notifications"],
  },
  {
    key: "ACCESS",
    title: "Staff & Access",
    group: "Settings",
    icon: "bi-person-lock",
    body: "Staff permissions, roles, temporary access, notes, security, and ownership workflows.",
    route: "settings",
    scopes: ["backoffice:staff:read", "backoffice:staff:write", "backoffice:shop:write", "backoffice:note:read"],
  },
  {
    key: "SETTINGS",
    title: "Shop Settings",
    group: "Settings",
    icon: "bi-gear",
    body: "Business profile, company info, OAuth setup, endpoint status, and shop configuration.",
    route: "settings",
    scopes: ["backoffice:shop:read", "backoffice:shop:write", "backoffice:business-profile:read", "backoffice:company:read"],
  },
  {
    key: "POS",
    title: "POS",
    group: "Sales",
    icon: "bi-shop",
    body: "Point-of-sale operations, in-person sales channels, payments, and retail workflows.",
    route: "suite",
    scopes: ["backoffice:shop:read"],
  },
  {
    key: "WHOLESALER",
    title: "Wholesaler",
    group: "Sales",
    icon: "bi-boxes",
    body: "Wholesale flows, bulk buyers, B2B sales, vendor relationships, and price lists.",
    route: "suite",
    scopes: ["vendor-read", "vendor-write", "backoffice:customer:read"],
  },
  {
    key: "MARKETPLACE",
    title: "Marketplace",
    group: "Sales",
    icon: "bi-buildings",
    body: "Marketplace operations, vendors, vendor orders, seller payments, and fulfillment.",
    route: "orders",
    scopes: ["vendor-read", "vendor-write", "backoffice:vendor-payment:read"],
  },
  {
    key: "SUPPORT",
    title: "Support Tickets",
    group: "Operations",
    icon: "bi-life-preserver",
    body: "Contact forms, support tickets, notifications, customer issues, and response queues.",
    route: "suite",
    scopes: ["backoffice:support-tickets", "backoffice:notifications"],
  },
  {
    key: "DEVELOPERS",
    title: "Developers",
    group: "Platform",
    icon: "bi-code-slash",
    body: "Developer assets, OAuth apps, APIs, endpoints, integrations, and platform tooling.",
    route: "settings",
    scopes: ["selldone:developer:read", "selldone:developer:write"],
  },
];

const SCOPE_GROUPS = [
  { key: "Catalog", icon: "bi-box-seam", matcher: /product|category|property-set/ },
  { key: "Orders", icon: "bi-receipt", matcher: /order|vendor/ },
  { key: "Customers", icon: "bi-people", matcher: /customer|community|reviews/ },
  { key: "Marketing", icon: "bi-megaphone", matcher: /discount|coupon|offer|cashback|lottery|ribbon|affiliate/ },
  { key: "Finance", icon: "bi-wallet2", matcher: /finance|giftcard|payment|monetization/ },
  { key: "Content", icon: "bi-file-earmark-text", matcher: /article|page|faq|ai/ },
  { key: "Operations", icon: "bi-truck", matcher: /logistic|staff|note|print|notifications|support/ },
  { key: "Platform", icon: "bi-puzzle", matcher: /connect|developer|agency|mcp/ },
];

const state = {
  session: null,
  user: null,
  activeView: "overview",
  activeProductId: null,
  activeCustomerId: null,
  activeArticleId: null,
  blogLoading: false,
  customerDetailLoadingId: null,
  dateRangeDays: 30,
  dashboard: {
    products: [],
    categories: [],
    orders: [],
    customers: [],
    customerDetails: {},
    articles: [],
    blogTimeline: [],
    blogTags: [],
    notifications: [],
    errors: [],
    analytics: {
      window: { days: 30, offset: 0 },
      points: [],
      raw: {},
    },
    orderStatuses: ["Open", "Reserved", "Payed", "COD", "Canceled"],
    totalOrders: 0,
    customerTotal: 0,
    articleTotal: 0,
    notificationTotal: 0,
    fetchedAt: null,
  },
  actionMode: "low",
  moduleFilter: "all",
  moduleSearch: "",
  editingProductId: null,
  editingCustomerId: null,
  editingArticleId: null,
};

const els = {
  authGate: document.getElementById("authGate"),
  appShell: document.getElementById("appShell"),
  loginButton: document.getElementById("loginButton"),
  retrySession: document.getElementById("retrySession"),
  shopName: document.getElementById("shopName"),
  shopDomain: document.getElementById("shopDomain"),
  openShop: document.getElementById("openShop"),
  syncTime: document.getElementById("syncTime"),
  refreshButton: document.getElementById("refreshButton"),
  exportCsv: document.getElementById("exportCsv"),
  themeToggle: document.getElementById("themeToggle"),
  datePreset: document.getElementById("datePreset"),
  dateRangeLabel: document.getElementById("dateRangeLabel"),
  globalSearchInput: document.getElementById("globalSearchInput"),
  navLinks: Array.from(document.querySelectorAll("[data-view]")),
  tabButtons: Array.from(document.querySelectorAll("[data-view-tab]")),
  viewPanels: Array.from(document.querySelectorAll("[data-view-panel]")),
  navOrderBadge: document.getElementById("navOrderBadge"),
  navCustomerBadge: document.getElementById("navCustomerBadge"),
  navRiskBadge: document.getElementById("navRiskBadge"),
  pageTitle: document.getElementById("pageTitle"),
  pageEyebrow: document.getElementById("pageEyebrow"),
  pageSubtitle: document.getElementById("pageSubtitle"),
  userMenu: document.getElementById("userMenu"),
  userMenuButton: document.getElementById("userMenuButton"),
  sidebarUserButton: document.getElementById("sidebarUserButton"),
  userMenuLabel: document.getElementById("userMenuLabel"),
  userMenuShop: document.getElementById("userMenuShop"),
  userEmail: document.getElementById("userEmail"),
  sidebarUserName: document.getElementById("sidebarUserName"),
  sidebarUserRole: document.getElementById("sidebarUserRole"),
  userAvatarImage: document.getElementById("userAvatarImage"),
  userAvatarLarge: document.getElementById("userAvatarLarge"),
  sidebarAvatarImage: document.getElementById("sidebarAvatarImage"),
  userAvatarFallback: document.getElementById("userAvatarFallback"),
  userAvatarLargeFallback: document.getElementById("userAvatarLargeFallback"),
  sidebarAvatarFallback: document.getElementById("sidebarAvatarFallback"),
  apiAlerts: document.getElementById("apiAlerts"),
  notificationMenu: document.getElementById("notificationMenu"),
  notificationDropdown: document.getElementById("notificationDropdown"),
  notificationsButton: document.getElementById("notificationsButton"),
  notificationBadge: document.getElementById("notificationBadge"),
  refreshNotificationsButton: document.getElementById("refreshNotificationsButton"),
  refreshNotificationsMenuButton: document.getElementById("refreshNotificationsMenuButton"),
  notificationsPanel: document.getElementById("notificationsPanel"),
  notificationList: document.getElementById("notificationList"),
  notificationDropdownList: document.getElementById("notificationDropdownList"),
  overviewKpis: document.getElementById("overviewKpis"),
  suiteKpis: document.getElementById("suiteKpis"),
  productKpis: document.getElementById("productKpis"),
  blogKpis: document.getElementById("blogKpis"),
  orderKpis: document.getElementById("orderKpis"),
  customerKpis: document.getElementById("customerKpis"),
  marketingKpis: document.getElementById("marketingKpis"),
  analyticsKpis: document.getElementById("analyticsKpis"),
  revenueChart: document.getElementById("revenueChart"),
  trafficSummary: document.getElementById("trafficSummary"),
  storeStatus: document.getElementById("storeStatus"),
  topProducts: document.getElementById("topProducts"),
  recentOrders: document.getElementById("recentOrders"),
  businessHealth: document.getElementById("businessHealth"),
  productRows: document.getElementById("productRows"),
  customerRows: document.getElementById("customerRows"),
  articleRows: document.getElementById("articleRows"),
  productDetailContent: document.getElementById("productDetailContent"),
  customerDetailContent: document.getElementById("customerDetailContent"),
  moduleGrid: document.getElementById("moduleGrid"),
  moduleSearchInput: document.getElementById("moduleSearchInput"),
  moduleFilterButtons: Array.from(document.querySelectorAll("[data-module-filter]")),
  scopeMatrix: document.getElementById("scopeMatrix"),
  suiteRoadmap: document.getElementById("suiteRoadmap"),
  productPerformance: document.getElementById("productPerformance"),
  lowStockAlerts: document.getElementById("lowStockAlerts"),
  inventoryOverview: document.getElementById("inventoryOverview"),
  categorySummary: document.getElementById("categorySummary"),
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  riskFilter: document.getElementById("riskFilter"),
  customerSearchInput: document.getElementById("customerSearchInput"),
  customerLevelFilter: document.getElementById("customerLevelFilter"),
  customerStatusFilter: document.getElementById("customerStatusFilter"),
  refreshCustomersButton: document.getElementById("refreshCustomersButton"),
  customerResultMeta: document.getElementById("customerResultMeta"),
  customerCards: document.getElementById("customerCards"),
  customerSegmentList: document.getElementById("customerSegmentList"),
  customerActivityList: document.getElementById("customerActivityList"),
  customerValueChart: document.getElementById("customerValueChart"),
  customerHealth: document.getElementById("customerHealth"),
  blogSearchInput: document.getElementById("blogSearchInput"),
  articleStatusFilter: document.getElementById("articleStatusFilter"),
  refreshBlogButton: document.getElementById("refreshBlogButton"),
  newArticleButton: document.getElementById("newArticleButton"),
  blogTagList: document.getElementById("blogTagList"),
  blogTimeline: document.getElementById("blogTimeline"),
  blogPerformanceChart: document.getElementById("blogPerformanceChart"),
  blogEditorialQueue: document.getElementById("blogEditorialQueue"),
  orderPipeline: document.getElementById("orderPipeline"),
  orderRows: document.getElementById("orderRows"),
  shippingPerformance: document.getElementById("shippingPerformance"),
  orderTimeline: document.getElementById("orderTimeline"),
  campaignRows: document.getElementById("campaignRows"),
  marketingFunnel: document.getElementById("marketingFunnel"),
  audienceOverview: document.getElementById("audienceOverview"),
  segmentRows: document.getElementById("segmentRows"),
  loyaltySignals: document.getElementById("loyaltySignals"),
  categoryChart: document.getElementById("categoryChart"),
  analyticsRevenueChart: document.getElementById("analyticsRevenueChart"),
  analyticsOrdersChart: document.getElementById("analyticsOrdersChart"),
  inventoryDistribution: document.getElementById("inventoryDistribution"),
  financeCards: document.getElementById("financeCards"),
  insightList: document.getElementById("insightList"),
  endpointList: document.getElementById("endpointList"),
  actionOutput: document.getElementById("actionOutput"),
  productEditor: document.getElementById("productEditor"),
  productEditForm: document.getElementById("productEditForm"),
  productEditId: document.getElementById("productEditId"),
  productEditTitle: document.getElementById("productEditTitle"),
  productEditTitleEn: document.getElementById("productEditTitleEn"),
  productEditSku: document.getElementById("productEditSku"),
  productEditStatus: document.getElementById("productEditStatus"),
  productEditPrice: document.getElementById("productEditPrice"),
  productEditDiscount: document.getElementById("productEditDiscount"),
  productEditCurrency: document.getElementById("productEditCurrency"),
  productEditSubmit: document.getElementById("productEditSubmit"),
  productEditorClose: document.getElementById("productEditorClose"),
  productEditCancel: document.getElementById("productEditCancel"),
  customerEditor: document.getElementById("customerEditor"),
  customerEditForm: document.getElementById("customerEditForm"),
  customerEditId: document.getElementById("customerEditId"),
  customerEditName: document.getElementById("customerEditName"),
  customerEditEmail: document.getElementById("customerEditEmail"),
  customerEditPhone: document.getElementById("customerEditPhone"),
  customerEditLevel: document.getElementById("customerEditLevel"),
  customerEditCurrency: document.getElementById("customerEditCurrency"),
  customerEditCountry: document.getElementById("customerEditCountry"),
  customerEditSex: document.getElementById("customerEditSex"),
  customerEditBirthday: document.getElementById("customerEditBirthday"),
  customerEditSegments: document.getElementById("customerEditSegments"),
  customerEditNotes: document.getElementById("customerEditNotes"),
  customerEditAddress: document.getElementById("customerEditAddress"),
  customerEditBilling: document.getElementById("customerEditBilling"),
  customerEditSubscribed: document.getElementById("customerEditSubscribed"),
  customerEditSubmit: document.getElementById("customerEditSubmit"),
  customerEditorClose: document.getElementById("customerEditorClose"),
  customerEditCancel: document.getElementById("customerEditCancel"),
  articleEditor: document.getElementById("articleEditor"),
  articleEditForm: document.getElementById("articleEditForm"),
  articleEditId: document.getElementById("articleEditId"),
  articleEditTitle: document.getElementById("articleEditTitle"),
  articleEditSlug: document.getElementById("articleEditSlug"),
  articleEditLang: document.getElementById("articleEditLang"),
  articleEditPageTitle: document.getElementById("articleEditPageTitle"),
  articleEditDescription: document.getElementById("articleEditDescription"),
  articleEditBody: document.getElementById("articleEditBody"),
  articleEditBodyHelp: document.getElementById("articleEditBodyHelp"),
  articleEditImage: document.getElementById("articleEditImage"),
  articleEditSchedule: document.getElementById("articleEditSchedule"),
  articleEditPublished: document.getElementById("articleEditPublished"),
  articleEditTags: document.getElementById("articleEditTags"),
  articleEditPrivate: document.getElementById("articleEditPrivate"),
  articleEditSubmit: document.getElementById("articleEditSubmit"),
  articleEditorClose: document.getElementById("articleEditorClose"),
  articleEditCancel: document.getElementById("articleEditCancel"),
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toastMessage"),
};

function formatMoney(value, currency = "USD", digits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatCompactMoney(value, currency = "USD", digits = 1) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatCompactNumber(value, digits = 1) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatFitNumber(value, { compactAt = 10000, digits = 1 } = {}) {
  const number = Number(value || 0);
  return Math.abs(number) >= compactAt ? formatCompactNumber(number, digits) : formatNumber(number);
}

function formatFitMoney(value, currency = "USD", { compactAt = 10000, digits = 1, fullDigits = 0 } = {}) {
  const number = Number(value || 0);
  return Math.abs(number) >= compactAt ? formatCompactMoney(number, currency, digits) : formatMoney(number, currency, fullDigits);
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10) || "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function notify(message) {
  els.toastMessage.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2400);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (response.status === 401) {
    beginAuthRedirect("Your Selldone session expired.");
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");
  const data = isJson ? await response.json().catch(() => ({})) : {};

  if (!isJson) {
    throw new Error(`Expected JSON from ${url}, but the local server returned ${contentType || "non-JSON content"}. Restart the dashboard server so the latest API routes are active.`);
  }

  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : data.error?.message || data.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function loadSession() {
  if (window.location.protocol === "file:") {
    showFileModeNotice();
    return false;
  }

  const session = await requestJson("/api/session");
  state.session = session;
  state.user = session.user || null;
  selldoneClient.setSession(session);

  if (!session.authenticated) {
    els.loginButton.href = session.loginUrl || "/auth/start";
    beginAuthRedirect("Sign in is required to load live Selldone data.");
    return false;
  }

  sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  els.authGate.classList.add("d-none");
  els.appShell.classList.remove("d-none");
  try {
    const directUser = await selldoneClient.loadProfile();
    state.user = { ...(session.user || {}), ...directUser };
  } catch {
    state.user = session.user || null;
  }
  renderShell(session.shop, state.user);
  return true;
}

function beginAuthRedirect(message, guardKey = AUTH_REDIRECT_KEY) {
  els.authGate.classList.remove("d-none");
  els.appShell.classList.add("d-none");
  els.loginButton.textContent = "Sign in with Selldone";
  els.retrySession.textContent = "Try again";
  els.retrySession.onclick = () => {
    sessionStorage.removeItem(guardKey);
    window.location.assign(els.loginButton.href || "/auth/start");
  };

  const paragraph = els.authGate.querySelector(".auth-card p");
  paragraph.textContent = message;

  if (sessionStorage.getItem(guardKey) === "1") {
    paragraph.textContent = `${message} Automatic sign-in already ran once, so the dashboard stopped the redirect loop.`;
    return;
  }

  sessionStorage.setItem(guardKey, "1");
  window.setTimeout(() => window.location.assign(els.loginButton.href || "/auth/start"), 450);
}

function showFileModeNotice() {
  els.authGate.classList.remove("d-none");
  els.appShell.classList.add("d-none");
  els.loginButton.href = LOCAL_APP_URL;
  els.loginButton.textContent = "Open local dashboard";
  els.retrySession.textContent = "I started the server";
  els.retrySession.onclick = () => {
    window.location.href = LOCAL_APP_URL;
  };

  const paragraph = els.authGate.querySelector(".auth-card p");
  paragraph.textContent = "This dashboard needs the local server for OAuth callback, Bootstrap assets, and live Selldone API data.";
}

function renderShell(shop, user) {
  els.shopName.textContent = shop.name;
  els.shopDomain.href = shop.domain;
  els.shopDomain.textContent = shop.domain.replace(/^https?:\/\//, "");
  els.openShop.href = shop.domain;
  renderUserProfile(user || { name: shop.name, email: "", avatarUrl: "" });
  showView(state.activeView, false);
}

function renderUserProfile(user) {
  const name = user.name || "Selldone user";
  const email = user.email || "Selldone account";
  const initials = getInitials(name).slice(0, 1);

  els.userMenuLabel.textContent = name;
  els.userMenuShop.textContent = name;
  els.userEmail.textContent = email;
  els.sidebarUserName.textContent = name;
  els.sidebarUserRole.textContent = email || "Admin";
  els.userAvatarFallback.textContent = initials;
  els.userAvatarLargeFallback.textContent = initials;
  els.sidebarAvatarFallback.textContent = initials;

  setAvatarImage(els.userAvatarImage, user.avatarUrl);
  setAvatarImage(els.userAvatarLarge, user.avatarUrl);
  setAvatarImage(els.sidebarAvatarImage, user.avatarUrl);
}

function setAvatarImage(image, src) {
  if (!image) return;
  image.parentElement.classList.remove("has-image");
  image.removeAttribute("src");
  if (!src) return;

  image.onload = () => image.parentElement.classList.add("has-image");
  image.onerror = () => {
    image.parentElement.classList.remove("has-image");
    image.removeAttribute("src");
  };
  image.src = `${src}${src.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

async function loadDashboard() {
  setLoading(true);
  try {
    const dashboard = await selldoneClient.loadDashboard();
    state.dashboard.products = normalizeProducts(dashboard.products || []);
    state.dashboard.categories = normalizeCategories(dashboard.categories || []);
    state.dashboard.orders = normalizeOrders(dashboard.orders || []);
    state.dashboard.customers = normalizeCustomers(dashboard.customers || []);
    state.dashboard.articles = normalizeArticles(dashboard.articles || []);
    state.dashboard.blogTimeline = normalizeArticles(dashboard.blogTimeline || []);
    state.dashboard.blogTags = normalizeArticleTags(dashboard.blogTags || []);
    state.dashboard.notifications = normalizeNotifications(dashboard.notifications || []);
    state.dashboard.totalOrders = Number(dashboard.totalOrders || state.dashboard.orders.length || 0);
    state.dashboard.customerTotal = Number(dashboard.customerTotal || state.dashboard.customers.length || 0);
    state.dashboard.articleTotal = Number(dashboard.articleTotal || state.dashboard.articles.length || 0);
    state.dashboard.notificationTotal = Number(dashboard.notificationTotal || state.dashboard.notifications.length || 0);
    state.dashboard.orderStatuses = dashboard.orderStatuses || state.dashboard.orderStatuses;
    state.dashboard.errors = dashboard.errors || [];
    state.dashboard.analytics = normalizeStoreAnalytics(dashboard.analytics || {}, state.dashboard.orders);
    state.dashboard.fetchedAt = dashboard.fetchedAt || new Date().toISOString();

    if (requiresConsentReconnect(state.dashboard.errors) && sessionStorage.getItem(CONSENT_REDIRECT_KEY) !== "1") {
      beginAuthRedirect(
        "Reconnect with Selldone consent to load Products and other protected backoffice sections.",
        CONSENT_REDIRECT_KEY,
      );
      return;
    }
    if (!requiresConsentReconnect(state.dashboard.errors)) sessionStorage.removeItem(CONSENT_REDIRECT_KEY);

    renderAll();
    els.syncTime.textContent = formatDate(state.dashboard.fetchedAt);
    notify("Live Selldone data refreshed");
  } catch (error) {
    renderError(error.message);
  } finally {
    setLoading(false);
  }
}

function requiresConsentReconnect(errors = []) {
  return errors.some((error) => error?.code === "selldone_token_access_denied");
}

function setLoading(isLoading) {
  els.refreshButton.disabled = isLoading;
  const refreshLabel = els.refreshButton.querySelector("span");
  if (refreshLabel) refreshLabel.textContent = isLoading ? "Refreshing" : "Refresh";

  if (isLoading && !state.dashboard.products.length && !state.dashboard.orders.length) {
    const skeletonCards = Array.from({ length: 4 }).map(renderSkeletonStat).join("");
    els.overviewKpis.innerHTML = skeletonCards;
    els.productKpis.innerHTML = skeletonCards;
    if (els.blogKpis) els.blogKpis.innerHTML = skeletonCards;
    els.productRows.innerHTML = Array.from({ length: 6 })
      .map(
        () =>
          '<tr class="skeleton-row"><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td></tr>',
      )
      .join("");
    if (els.customerRows) {
      els.customerRows.innerHTML = Array.from({ length: 6 })
        .map(() => '<tr class="skeleton-row"><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td></tr>')
        .join("");
    }
    if (els.articleRows) {
      els.articleRows.innerHTML = Array.from({ length: 6 })
        .map(() => '<tr class="skeleton-row"><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td><td>Loading</td></tr>')
        .join("");
    }
  }
}

function normalizeProducts(products) {
  return products.map((product) => {
    const title = product.title_en || product.title || product.name || "Untitled product";
    const price = Number(product.price ?? product.price_input ?? product.original_price ?? 0);
    const finalPrice = Number(product.final_price ?? product.finalPrice ?? product.price_discounted ?? product.price ?? 0);
    const quantity = Number(product.quantity ?? product.stock ?? product.inventory ?? product.count ?? 0);
    const category = product.category?.title || product.category?.name || product.category_title || "Uncategorized";
    const status = normalizeProductStatus(product, quantity);
    const imageUrl = resolveProductImage(product);

    return {
      id: product.id ?? product.product_id ?? title,
      title,
      titleEn: product.title_en || "",
      sku: product.sku || product.mpn || product.code || "-",
      categoryId: product.category_id ?? product.category?.id ?? "uncategorized",
      category,
      price,
      discount: Number(product.discount ?? product.discount_amount ?? 0),
      finalPrice,
      currency: product.currency || product.currency_code || "USD",
      quantity,
      visits: Number(product.visits ?? product.views ?? product.view_count ?? 0),
      sells: Number(product.sells ?? product.sales ?? product.orders_count ?? 0),
      status,
      backofficeStatus: product.status || product.state || "Open",
      imageUrl,
      icon: imageUrl,
      raw: product,
    };
  });
}

function normalizeCategories(categories) {
  return categories.map((category) => ({
    ...category,
    imageUrl: resolveSelldoneRecordImage(category, { scope: "categories", size: 128 }),
  }));
}

function normalizeArticles(articles) {
  return articles.map((article) => {
    const parent = article.parent || {};
    const seo = article.seo || article.meta || article.seo_meta || {};
    const title = firstArticleText(article.title, parent.title, article.page_title, seo.title, seo.page_title) || "Untitled post";
    const slug = firstArticleText(article.slug, article.url, article.page_slug, article.seo_slug, parent.slug, parent.url, seo.slug);
    const pageTitle = firstArticleText(article.page_title, article.pageTitle, article.seo_title, parent.page_title, seo.page_title, seo.title);
    const description = firstArticleText(
      article.description,
      article.summary,
      article.subtitle,
      article.meta_description,
      parent.description,
      parent.summary,
      seo.description,
      seo.meta_description,
    );
    const body = firstArticleText(article.body, article.content, article.html, article.article_body, article.raw_body, article.text);
    const image = firstArticleText(article.image, article.cover, article.icon, parent.image, parent.cover, parent.icon, article.thumbnail, parent.thumbnail);
    const tags = normalizeArticleTags(article.tags || article.tag || article.keywords || []);
    const views = Number(article.views ?? article.view ?? article.visit ?? 0);
    const likes = Number(article.like ?? article.likes ?? 0);
    const power = Number(article.power ?? article.claps ?? 0);
    const comments = Number(article.comments_count ?? article.comments ?? 0);
    const scheduledAt = article.schedule_at || article.scheduled_at || article.start || "";
    const published = Boolean(article.published);
    const isPrivate = Boolean(article.private);
    const status = normalizeArticleStatus({ ...article, published, private: isPrivate, schedule_at: scheduledAt });
    const imageUrl = resolveArticleImage({ ...article, parent, image });

    return {
      id: article.id ?? article.article_id ?? title,
      title,
      slug,
      pageTitle,
      description,
      body,
      hasFullBody: Boolean(body),
      image,
      imageUrl,
      lang: article.lang || article.language || "",
      tags,
      views,
      likes,
      power,
      comments,
      newComments: Number(article.new_comments_count || 0),
      published,
      private: isPrivate,
      status,
      scheduledAt,
      createdAt: article.created_at || article.createdAt || "",
      updatedAt: article.updated_at || article.updatedAt || article.created_at || "",
      author: article.user?.name || article.user?.full_name || article.author?.name || "Selldone",
      raw: article,
    };
  });
}

function firstArticleText(...values) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text) return text;
  }
  return "";
}

function normalizeArticleTags(tags) {
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(tags)) return [];
  return Array.from(
    new Set(
      tags
        .map((tag) => (typeof tag === "string" ? tag : tag?.title || tag?.name || tag?.tag || tag?.value || ""))
        .map((tag) => String(tag || "").trim())
        .filter(Boolean),
    ),
  );
}

function resolveProductImage(product = {}) {
  return resolveSelldoneRecordImage(product, { scope: "products", size: 128 });
}

function resolveArticleImage(article = {}) {
  return resolveSelldoneRecordImage(article, { scope: "articles", size: 256 });
}

function resolveSelldoneRecordImage(record = {}, options = {}) {
  const candidates = [];
  [
    record.image_url,
    record.icon_url,
    record.thumbnail_url,
    record.cover_url,
    record.photo_url,
    record.main_image,
    record.image_path,
    record.icon_path,
    record.path,
    record.icon,
    record.image,
    record.thumbnail,
    record.cover,
    record.photo,
    record.images,
    record.gallery,
    record.photos,
    record.medias,
    record.product_images,
    record.assets,
    record.parent?.image_url,
    record.parent?.icon_url,
    record.parent?.thumbnail_url,
    record.parent?.cover_url,
    record.parent?.image,
    record.parent?.icon,
    record.parent?.thumbnail,
    record.parent?.cover,
  ].forEach((value) => collectImageCandidates(value, candidates));

  return candidates.map((candidate) => toSelldoneImageUrl(candidate, options)).find(Boolean) || "";
}

function collectImageCandidates(value, candidates) {
  if (!value) return;

  if (typeof value === "string") {
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => candidates.push(item));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectImageCandidates(item, candidates));
    return;
  }

  if (typeof value === "object") {
    [
      "url",
      "src",
      "path",
      "file",
      "filename",
      "name",
      "image",
      "icon",
      "thumbnail",
      "small",
      "medium",
      "large",
      "original",
    ].forEach((key) => collectImageCandidates(value[key], candidates));
  }
}

function toSelldoneImageUrl(value, options = {}) {
  const source = String(value || "").trim();
  if (!source || source === "[object Object]" || source.toLowerCase() === "null") return "";
  if (/^data:image\//i.test(source)) return source;
  if (/^https?:\/\//i.test(source)) return withSelldoneThumbnailSize(source, options.size);
  if (source.startsWith("//")) return withSelldoneThumbnailSize(`https:${source}`, options.size);

  const shopId = state.session?.shop?.id || 14952;
  const path = source.replace(/^\/+/, "");

  if (path.startsWith("app/")) return withSelldoneThumbnailSize(`https://cdn.selldone.com/${path}`, options.size);
  if (path.startsWith("shops/")) return withSelldoneThumbnailSize(`${SELLDONE_CDN_BASE}/${path}`, options.size);
  if (path.startsWith("shops_")) return withSelldoneThumbnailSize(`${SELLDONE_CDN_BASE}/${path.replaceAll("_", "/")}`, options.size);
  if (path.includes("app/shops/")) {
    return withSelldoneThumbnailSize(`https://cdn.selldone.com/${path.slice(path.indexOf("app/shops/"))}`, options.size);
  }

  const compactShopPath = path.match(/^shops(\d+)(products|categories|articles|pages|folders|vendors|logos|baskets|users)[_/](.+)$/i);
  if (compactShopPath) {
    const [, compactShopId, scope, rest] = compactShopPath;
    return withSelldoneThumbnailSize(`${SELLDONE_CDN_BASE}/shops/${compactShopId}/${scope}/${rest.replaceAll("_", "/")}`, options.size);
  }

  const underscoredPath = path.includes("_") ? path.replaceAll("_", "/") : "";
  if (underscoredPath.startsWith("shops/")) {
    return withSelldoneThumbnailSize(`${SELLDONE_CDN_BASE}/${underscoredPath}`, options.size);
  }

  if (path.includes(`/${options.scope || "products"}/`)) {
    return withSelldoneThumbnailSize(`${SELLDONE_CDN_BASE}/shops/${shopId}/${options.scope || "products"}/${path.split("/").pop()}`, options.size);
  }

  if (/\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(path)) {
    return withSelldoneThumbnailSize(`${SELLDONE_CDN_BASE}/shops/${shopId}/${options.scope || "products"}/${path}`, options.size);
  }

  return "";
}

function withSelldoneThumbnailSize(url, size) {
  if (!size || !/^https:\/\/cdn\.selldone\.com\/app\//i.test(url)) return url;
  if (/\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url)) return url;
  if (/(32|64|128|256|512)\.png(\?.*)?$/i.test(url)) return url;
  if (/\.svg(\?.*)?$/i.test(url)) return url;
  return `${url}${Number(size)}.png`;
}

function normalizeProductStatus(product, quantity) {
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= LOW_STOCK_LIMIT) return "Low Stock";
  if (product.status && typeof product.status === "string") return titleCase(product.status);
  if (product.enable === false || product.active === false) return "Inactive";
  return "In Stock";
}

function normalizeArticleStatus(article = {}) {
  const scheduledAt = article.schedule_at || article.scheduled_at;
  if (scheduledAt && new Date(scheduledAt).getTime() > Date.now()) return "Scheduled";
  if (article.private) return "Private";
  return article.published ? "Published" : "Draft";
}

function normalizeOrders(orders) {
  return orders.map((order) => {
    const buyer = order.buyer || order.customer || order.user || {};
    const first = buyer.first_name || buyer.name || order.customer_name || "";
    const last = buyer.last_name || "";
    const customer = [first, last].filter(Boolean).join(" ") || buyer.email || order.email || "Customer";
    const payment = order.payment?.status || order.payment_status || order.pay_status || (order.pay_at ? "Paid" : "Pending");
    const status = order.status || order.delivery_state || order.fulfillment_status || "Open";
    const total = Number(order.price ?? order.total_price ?? order.amount ?? order.payment?.amount ?? 0);

    return {
      id: order.id ?? order.basket_id ?? order.code,
      code: order.code || order.order_code || (order.id ? `#${order.id}` : "Order"),
      customer,
      email: buyer.email || order.email || "",
      status: titleCase(String(status)),
      payment: titleCase(String(payment)),
      fulfillment: titleCase(String(order.delivery_state || order.fulfillment_status || status)),
      shipping: order.delivery?.service || order.shipping?.service || order.shipping_method || "-",
      tracking: order.tracking_code || order.tracking_number || order.delivery?.tracking_code || "",
      price: total,
      currency: order.currency || order.currency_code || "USD",
      createdAt: order.created_at || order.createdAt || order.created || order.updated_at || new Date().toISOString(),
      raw: order,
    };
  });
}

function normalizeCustomers(customers) {
  return customerFeature.normalizeCustomers(customers);
}

function normalizeNotifications(notifications) {
  return notifications
    .map((notification, index) => {
      const data = notification.data && typeof notification.data === "object" ? notification.data : {};
      const type = String(notification.type || data.type || "notification");
      const typeLabel = normalizeNotificationType(type);
      const title = firstNotificationText(notification.title, data.title, data.subject, data.heading, typeLabel);
      const message = firstNotificationText(
        notification.message,
        data.message,
        data.text,
        data.body,
        data.description,
        data.content,
        title,
      );
      const readAt = notification.read_at || notification.readAt || "";
      const createdAt = notification.created_at || notification.createdAt || notification.updated_at || notification.updatedAt || "";
      const count = Math.max(1, Number(notification.count || data.count || 1));

      return {
        id: notification.id ?? `${type}-${createdAt || index}`,
        type,
        typeLabel,
        title,
        message,
        count,
        readAt,
        isUnread: !readAt && notification.read !== true,
        createdAt,
        href: firstNotificationText(notification.url, notification.link, notification.href, notification.action_url, data.url, data.link, data.href),
        icon: notificationIcon(type, message),
        variant: notificationVariant(type, message, !readAt && notification.read !== true),
        raw: notification,
      };
    })
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
}

function firstNotificationText(...values) {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const text = String(value).trim();
    if (text && text !== "[object Object]") return text;
  }
  return "";
}

function normalizeNotificationType(type) {
  const clean = String(type || "")
    .split(/[\\/]/)
    .pop()
    .replace(/Notification$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  return titleCase(clean || "Notification");
}

function notificationIcon(type, message = "") {
  const value = `${type} ${message}`.toLowerCase();
  if (/order|basket|payment|transaction/.test(value)) return "bi-receipt";
  if (/product|stock|inventory|catalog/.test(value)) return "bi-box-seam";
  if (/shipping|delivery|logistic|fulfill/.test(value)) return "bi-truck";
  if (/ticket|support|message|comment|chat/.test(value)) return "bi-chat-square-text";
  if (/blog|article|page|content/.test(value)) return "bi-journal-text";
  if (/error|failed|fail|cancel|alert|warning|danger/.test(value)) return "bi-exclamation-triangle";
  return "bi-bell";
}

function notificationVariant(type, message = "", isUnread = false) {
  const value = `${type} ${message}`.toLowerCase();
  if (/error|failed|fail|cancel|alert|danger/.test(value)) return "danger";
  if (/warning|stock|inventory|pending/.test(value)) return "warning";
  if (/order|basket|payment|transaction|delivery/.test(value)) return "success";
  if (/ticket|support|message|comment|chat/.test(value)) return "info";
  if (/blog|article|page|content/.test(value)) return "purple";
  return isUnread ? "purple" : "neutral";
}

function normalizeStoreAnalytics(payload = {}, orders = []) {
  const windowDays = Number(payload.window?.days || payload.days || payload.raw?.days || 30);
  const labels = makeLastDayLabels(windowDays);
  const points = labels.map((date) => ({
    date,
    revenue: 0,
    orders: 0,
    visits: 0,
    customers: 0,
  }));
  const byDate = new Map(points.map((point) => [point.date, point]));
  const data = payload.data ?? payload.raw?.data ?? [];
  let consumed = mergeAnalyticsData(data, byDate, labels);

  if (!consumed) {
    consumed = mergeAnalyticsObject(payload.raw || payload, byDate, labels);
  }

  if (!points.some((point) => point.revenue || point.orders)) {
    mergeOrdersIntoAnalytics(orders, byDate);
  }

  return {
    window: { days: windowDays, offset: Number(payload.window?.offset || 0) },
    points,
    orderQue: Array.isArray(payload.orderQue) ? payload.orderQue : [],
    avocadoQue: Array.isArray(payload.avocadoQue) ? payload.avocadoQue : [],
    raw: payload.raw || payload,
  };
}

function mergeAnalyticsData(data, byDate, labels) {
  if (Array.isArray(data)) {
    data.forEach((row, index) => mergeAnalyticsRow(row, byDate, labels[index] || labels[labels.length - 1]));
    return data.length > 0;
  }

  if (data && typeof data === "object") {
    return mergeAnalyticsObject(data, byDate, labels);
  }

  return false;
}

function mergeAnalyticsObject(data, byDate, labels) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const keys = ["revenue", "sales", "orders", "visits", "views", "customers", "users", "data"];
  let consumed = false;

  keys.forEach((key) => {
    const value = data[key];
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const row = typeof item === "object" ? item : { [key]: item };
        mergeAnalyticsRow(row, byDate, labels[index] || labels[labels.length - 1]);
      });
      consumed = true;
    }
  });

  if (!consumed && Object.values(data).every((value) => value && typeof value === "object")) {
    Object.entries(data).forEach(([date, row]) => {
      mergeAnalyticsRow({ ...(row || {}), date }, byDate, date);
    });
    consumed = true;
  }

  return consumed;
}

function mergeAnalyticsRow(row, byDate, fallbackDate) {
  if (!row || typeof row !== "object") return;
  const date = normalizeAnalyticsDate(row.date || row.day || row.created_at || row.createdAt || row.x || row.label || fallbackDate);
  const point = byDate.get(date);
  if (!point) return;

  point.revenue += readFinanceNumber(row, ["sell", "pay"]) || readFirstNumber(row, ["revenue", "sales", "sale", "sell", "amount", "total", "gross", "gross_sales", "total_sales", "price", "value"]);
  point.orders +=
    readFirstNumber(row, ["orders", "order", "count", "baskets", "basket", "sales_count", "transactions"]) ||
    sumNumberFields(row, [
      "order_physical_checkout",
      "order_virtual_checkout",
      "order_file_checkout",
      "order_service_checkout",
      "order_subscription_checkout",
      "hyper_pays",
      "ds_payments",
    ]);
  point.visits +=
    readFirstNumber(row, ["visits", "views", "view", "sessions", "traffic", "hits"]) ||
    sumNumberFields(row, ["page_views", "hyper_views", "view_avocados"]);
  point.customers +=
    readFirstNumber(row, ["customers", "customer", "users", "user", "new_customers", "buyers"]) ||
    sumNumberFields(row, ["users_add", "customers_add", "new_visitors"]);
}

function mergeOrdersIntoAnalytics(orders, byDate) {
  orders.forEach((order) => {
    const date = normalizeAnalyticsDate(order.createdAt);
    const point = byDate.get(date);
    if (!point) return;
    point.revenue += Number(order.price || 0);
    point.orders += 1;
    if (order.email || order.customer) point.customers += 1;
  });
}

function makeLastDayLabels(days = 30) {
  const labels = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    labels.push(date.toISOString().slice(0, 10));
  }
  return labels;
}

function normalizeAnalyticsDate(value) {
  if (!value) return makeLastDayLabels(1)[0];
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return makeLastDayLabels(1)[0];
  return date.toISOString().slice(0, 10);
}

function readFirstNumber(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
  }
  return 0;
}

function readFinanceNumber(row, keys) {
  const finances = Array.isArray(row.finances) ? row.finances : [];
  return finances.reduce((sum, finance) => sum + readFirstNumber(finance || {}, keys), 0);
}

function sumNumberFields(row, keys) {
  return keys.reduce((sum, key) => sum + Number(row[key] || 0), 0);
}

function renderAll() {
  renderApiAlerts();
  renderFilters();
  renderNavBadges();
  renderOverview();
  renderSuite();
  renderCustomers();
  renderCustomerDetail();
  renderProducts();
  renderProductDetail();
  renderBlog();
  renderOrders();
  renderMarketing();
  renderAnalytics();
  renderSettings();
}

function renderApiAlerts() {
  const errors = state.dashboard.errors || [];
  els.apiAlerts.innerHTML = errors.length
    ? errors
        .map((error) => {
          let message = error.message || "This section could not be loaded.";
          if (error.code === "selldone_google_2fa_required") {
            message =
              "Selldone blocked this backoffice endpoint with a Google 2FA guard. Reconnect after the Selldone token is trusted for this backoffice access.";
          }
          if (error.code === "selldone_token_access_denied") {
            message =
              "The current Selldone token is missing access for this backoffice section. Use Reconnect with consent from the profile menu.";
          }
          return `
            <div class="alert" role="alert">
              <strong>${escapeHtml(error.label || "Selldone API")}</strong>
              <span>${escapeHtml(message)}</span>
            </div>
          `;
        })
        .join("")
    : "";
}

function renderNavBadges() {
  const summary = getSummary();
  els.navOrderBadge.title = formatNumber(summary.totalOrders);
  if (els.navCustomerBadge) els.navCustomerBadge.title = formatNumber(summary.customers);
  els.navRiskBadge.title = formatNumber(summary.lowStock + summary.outOfStock);
  els.navOrderBadge.textContent = formatFitNumber(summary.totalOrders, { compactAt: 1000 });
  if (els.navCustomerBadge) els.navCustomerBadge.textContent = formatFitNumber(summary.customers, { compactAt: 1000 });
  els.navRiskBadge.textContent = formatFitNumber(summary.lowStock + summary.outOfStock, { compactAt: 1000 });
}

function renderOverview() {
  const summary = getSummary();
  const analytics = getAnalyticsSummary(summary);
  const revenueSeries = getAnalyticsSeries("revenue");
  const orderSeries = getAnalyticsSeries("orders");
  const visitSeries = getAnalyticsSeries("visits");
  const labels = getAnalyticsLabels();

  els.overviewKpis.innerHTML = [
    statCard({
      title: `Revenue ${formatWindowLabel(analytics.windowDays)}`,
      value: formatMoney(analytics.revenue, analytics.currency),
      icon: "bi-currency-dollar",
      accent: "purple",
      trend: analytics.revenue ? "Live" : "No data",
      note: selectedWindowCopy(analytics.windowDays),
      values: revenueSeries,
    }),
    statCard({
      title: `Orders ${formatWindowLabel(analytics.windowDays)}`,
      value: formatNumber(analytics.orders),
      icon: "bi-bag",
      accent: "blue",
      trend: analytics.orders ? "Active" : "Quiet",
      note: "Daily order trend",
      values: orderSeries,
    }),
    statCard({
      title: "Average Order",
      value: formatMoney(analytics.aov, analytics.currency),
      icon: "bi-receipt",
      accent: "green",
      trend: analytics.aov ? "Calculated" : "Waiting",
      note: "Revenue divided by orders",
      values: revenueSeries.map((value, index) => (orderSeries[index] ? value / orderSeries[index] : 0)),
    }),
    statCard({
      title: `Visits ${formatWindowLabel(analytics.windowDays)}`,
      value: formatNumber(analytics.visits),
      icon: "bi-people",
      accent: "orange",
      trend: analytics.visits ? `${formatPercent(analytics.conversion)} CVR` : "No visits",
      note: "Store traffic signals",
      values: visitSeries,
    }),
  ].join("");

  els.revenueChart.innerHTML = renderLineChart({
    values: revenueSeries,
    labels,
    color: ACCENTS.purple,
    valueFormatter: (value, compact = false) => (compact ? formatFitMoney(value, summary.currency) : formatMoney(value, summary.currency)),
    minimal: true,
  });

  els.trafficSummary.innerHTML = renderDonut({
    total: Math.max(analytics.orders + analytics.visits + analytics.customers, 1),
    label: "Signals",
    segments: [
      { label: "Visits", value: analytics.visits, color: ACCENTS.purple },
      { label: "Orders", value: analytics.orders, color: ACCENTS.blue },
      { label: "Customers", value: analytics.customers, color: ACCENTS.green },
    ],
  });

  els.storeStatus.innerHTML = statusRows([
    {
      icon: "bi-cart-check",
      title: "Orders to Fulfill",
      body: "Open, reserved, or paid orders",
      value: formatNumber(summary.openOrders),
      variant: summary.openOrders ? "warning" : "success",
    },
    {
      icon: "bi-box-seam",
      title: "Low Stock Products",
      body: `At or below ${LOW_STOCK_LIMIT} units`,
      value: formatNumber(summary.lowStock),
      variant: summary.lowStock ? "warning" : "success",
    },
    {
      icon: "bi-x-octagon",
      title: "Out of Stock Products",
      body: "Products with zero units",
      value: formatNumber(summary.outOfStock),
      variant: summary.outOfStock ? "danger" : "success",
    },
    {
      icon: "bi-megaphone",
      title: "Discounted Products",
      body: "Products with active discount fields",
      value: formatNumber(summary.discounted),
      variant: summary.discounted ? "purple" : "neutral",
    },
  ]);

  els.topProducts.innerHTML = renderCompactProducts(getTopProducts(5));
  els.recentOrders.innerHTML = renderCompactOrders(state.dashboard.orders.slice(0, 5));
  els.businessHealth.innerHTML = renderBusinessHealth(summary);
  renderNotifications();
}

function renderNotifications() {
  if (!els.notificationBadge) return;

  const notifications = state.dashboard.notifications || [];
  const unreadCount = notifications.filter((notification) => notification.isUnread).reduce((sum, notification) => sum + notification.count, 0);
  const badgeCount = unreadCount || state.dashboard.notificationTotal || notifications.length;
  els.notificationBadge.textContent = formatFitNumber(badgeCount, { compactAt: 1000 });
  els.notificationBadge.title = formatNumber(badgeCount);
  els.notificationBadge.classList.toggle("is-empty", badgeCount <= 0);

  const content = notifications.length
    ? notifications.slice(0, 8).map(renderNotificationItem).join("")
    : emptyState("No notifications", "Selldone has not returned recent notifications for this shop.");
  [els.notificationList, els.notificationDropdownList].filter(Boolean).forEach((list) => {
    list.innerHTML = content;
  });
}

function renderNotificationItem(notification) {
  const status = notification.isUnread ? "Unread" : "Read";
  const countChip =
    notification.count > 1
      ? `<span class="chip chip-neutral" title="${escapeAttribute(formatNumber(notification.count))}">x${escapeHtml(formatFitNumber(notification.count, { compactAt: 1000 }))}</span>`
      : "";
  const href = notification.href && /^https?:\/\//i.test(notification.href)
    ? `<a class="notification-link" href="${escapeAttribute(notification.href)}" target="_blank" rel="noreferrer">Open</a>`
    : "";

  return `
    <article class="notification-item ${notification.isUnread ? "is-unread" : ""}">
      <span class="notification-icon chip-${escapeAttribute(notification.variant)}">
        <i class="bi ${escapeAttribute(notification.icon)}" aria-hidden="true"></i>
      </span>
      <span class="notification-copy min-w-0">
        <strong class="text-truncate" title="${escapeAttribute(notification.title)}">${escapeHtml(notification.title)}</strong>
        <span title="${escapeAttribute(notification.message)}">${escapeHtml(notification.message)}</span>
        <small>${escapeHtml(formatDate(notification.createdAt))} · ${escapeHtml(notification.typeLabel)}</small>
      </span>
      <span class="notification-meta">
        <span class="chip ${notification.isUnread ? "chip-purple" : "chip-neutral"}">${status}</span>
        ${countChip}
        ${href}
      </span>
    </article>
  `;
}

async function refreshNotifications({ silent = false } = {}) {
  [els.refreshNotificationsButton, els.refreshNotificationsMenuButton].filter(Boolean).forEach((button) => {
    button.disabled = true;
  });
  try {
    const payload = await selldoneClient.notifications({ mode: "new", limit: 20, offset: 0, shop_id: state.session?.shop?.id });
    state.dashboard.notifications = normalizeNotifications(payload.notifications || []);
    state.dashboard.notificationTotal = Number(payload.total || state.dashboard.notifications.length || 0);
    state.dashboard.errors = (state.dashboard.errors || []).filter((error) => error?.label !== "Notifications");
    if (payload.error) state.dashboard.errors.push(payload.error);
    renderApiAlerts();
    renderNotifications();
    if (!silent) notify(`Loaded ${formatNumber(state.dashboard.notifications.length)} notifications`);
  } catch (error) {
    notify(error.message || "Notifications could not be loaded");
  } finally {
    [els.refreshNotificationsButton, els.refreshNotificationsMenuButton].filter(Boolean).forEach((button) => {
      button.disabled = false;
    });
  }
}

function renderSuite() {
  if (!els.moduleGrid) return;

  const summary = getSummary();
  const modules = getSelldoneModules(summary);
  const filtered = filterModules(modules);
  const liveCount = modules.filter((module) => module.hasLiveAccess).length;
  const writeCount = modules.filter((module) => module.write).length;
  const plannedCount = modules.length - liveCount;
  const scopeCount = state.session?.scopes?.length || 0;

  els.suiteKpis.innerHTML = [
    statCard({
      title: "Selldone Sections",
      value: formatNumber(modules.length),
      icon: "bi-app-indicator",
      accent: "blue",
      trend: "Mapped",
      note: "Major backoffice modules",
      values: modules.map((_, index) => index + 1),
    }),
    statCard({
      title: "Live Access",
      value: formatNumber(liveCount),
      icon: "bi-cloud-check",
      accent: "green",
      trend: liveCount ? "Connected" : "Waiting",
      note: "From shop analytics access map",
      values: modules.map((module) => (module.hasLiveAccess ? 1 : 0)),
    }),
    statCard({
      title: "Write Enabled",
      value: formatNumber(writeCount),
      icon: "bi-pencil-square",
      accent: "purple",
      trend: writeCount ? "Writable" : "Read only",
      note: "Modules with write permission",
      values: modules.map((module) => (module.write ? 1 : 0)),
    }),
    statCard({
      title: "OAuth Scopes",
      value: formatNumber(scopeCount),
      icon: "bi-key",
      accent: "orange",
      trend: scopeCount ? "Granted" : "Pending",
      note: `${formatNumber(plannedCount)} modules ready for detail pages`,
      values: SCOPE_GROUPS.map((group) => countScopesForGroup(group)),
    }),
  ].join("");

  els.moduleGrid.innerHTML = filtered.length
    ? filtered.map(renderModuleCard).join("")
    : emptyState("No matching modules", "Try clearing the module search or switching the filter back to All.");
  els.scopeMatrix.innerHTML = renderScopeMatrix();
  els.suiteRoadmap.innerHTML = renderSuiteRoadmap(modules);
}

function getSelldoneModules(summary = getSummary()) {
  const access = getShopAccessMap();
  const scopes = state.session?.scopes || [];
  return MODULE_CATALOG.map((module) => {
    const permissions = normalizeModulePermissions(access[module.key]);
    const scopeMatches = module.scopes.filter((scope) => scopes.includes(scope));
    const read = permissions.includes("READ");
    const write = permissions.includes("WRITE");
    const scopeBacked = scopeMatches.length > 0;
    const hasLiveAccess = read || write;

    return {
      ...module,
      permissions,
      read,
      write,
      scopeBacked,
      scopeMatches,
      hasLiveAccess,
      status: write ? "Write" : read ? "Read" : scopeBacked ? "Scoped" : "Planned",
      metric: moduleMetric(module.key, summary),
    };
  });
}

function getShopAccessMap() {
  return state.dashboard.analytics?.raw?.access || state.dashboard.analytics?.raw?.raw?.access || {};
}

function normalizeModulePermissions(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).toUpperCase());
  if (typeof value === "string") return [value.toUpperCase()];
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key.toUpperCase());
  }
  return [];
}

function moduleMetric(key, summary) {
  const analytics = getAnalyticsSummary(summary);
  const metrics = {
    DASHBOARD: formatFitMoney(analytics.revenue, summary.currency),
    PRODUCTS: formatNumber(summary.products),
    CATEGORIES: formatNumber(summary.categories),
    ORDERS: formatNumber(summary.totalOrders),
    CUSTOMERS: formatNumber(summary.customers || analytics.customers || getUniqueCustomers().uniqueCustomers),
    COMMUNITY: formatNumber(getUniqueCustomers().repeatCustomers),
    MARKETING: formatNumber(getCampaignProducts().length),
    INCENTIVES: formatNumber(summary.discounted),
    ACCOUNTING: formatFitMoney(summary.inventoryValue, summary.currency),
    LOGISTIC: formatNumber(summary.openOrders),
    PAGES: "Pages",
    BLOG: formatNumber(getBlogSummary().total),
    CHANNELS: "Connect",
    APPLICATIONS: "Apps",
    AUTOMATION: "Flows",
    ACCESS: "Staff",
    SETTINGS: "Config",
    POS: "POS",
    WHOLESALER: "B2B",
    MARKETPLACE: "Vendors",
    SUPPORT: formatNumber(summary.notifications),
    DEVELOPERS: "API",
  };
  return metrics[key] || "Ready";
}

function filterModules(modules) {
  const search = state.moduleSearch.trim().toLowerCase();
  return modules.filter((module) => {
    const matchesSearch =
      !search ||
      [module.title, module.group, module.body, module.key, module.status, ...module.scopes].join(" ").toLowerCase().includes(search);
    const matchesFilter =
      state.moduleFilter === "all" ||
      (state.moduleFilter === "live" && module.hasLiveAccess) ||
      (state.moduleFilter === "write" && module.write) ||
      (state.moduleFilter === "planned" && !module.hasLiveAccess);
    return matchesSearch && matchesFilter;
  });
}

function renderModuleCard(module) {
  const statusClass = module.write ? "chip-success" : module.read ? "chip-info" : module.scopeBacked ? "chip-purple" : "chip-neutral";
  const route = module.route && VIEW_META[module.route] ? module.route : "suite";
  const action =
    route === "suite"
      ? `<button class="btn btn-soft btn-sm" type="button" data-module-focus="${escapeAttribute(module.key)}">Inspect</button>`
      : `<button class="btn btn-soft btn-sm" type="button" data-view-jump="${escapeAttribute(route)}">Open</button>`;

  return `
    <article id="module-${escapeAttribute(module.key)}" class="module-card" data-module-key="${escapeAttribute(module.key)}">
      <div class="module-card-top">
        <span class="module-icon">
          <i class="bi ${escapeAttribute(module.icon)}" aria-hidden="true"></i>
        </span>
        <span class="chip ${statusClass}">${escapeHtml(module.status)}</span>
      </div>
      <div class="module-card-body">
        <span class="module-group">${escapeHtml(module.group)}</span>
        <h3>${escapeHtml(module.title)}</h3>
        <p>${escapeHtml(module.body)}</p>
      </div>
      <div class="module-card-foot">
        <strong title="${escapeAttribute(module.metric)}">${escapeHtml(module.metric)}</strong>
        <span>${escapeHtml(module.permissions.length ? module.permissions.join(" / ") : module.scopeMatches.length ? `${module.scopeMatches.length} scopes` : "No live access yet")}</span>
      </div>
      <div class="module-card-actions">
        ${action}
      </div>
    </article>
  `;
}

function renderScopeMatrix() {
  const scopes = state.session?.scopes || [];
  if (!scopes.length) return emptyState("No scopes loaded", "Reconnect with consent to load the granted OAuth scopes.");

  const grouped = SCOPE_GROUPS.map((group) => ({
    ...group,
    count: countScopesForGroup(group),
  }));
  const matched = new Set();
  SCOPE_GROUPS.forEach((group) => scopes.filter((scope) => group.matcher.test(scope)).forEach((scope) => matched.add(scope)));
  const otherCount = Math.max(0, scopes.length - matched.size);

  return statusRows([
    ...grouped.map((group) => ({
      icon: group.icon,
      title: group.key,
      body: "Granted OAuth scopes",
      value: formatNumber(group.count),
      variant: group.count ? "success" : "neutral",
    })),
    {
      icon: "bi-three-dots",
      title: "Other",
      body: "Core, profile, or uncategorized scopes",
      value: formatNumber(otherCount),
      variant: otherCount ? "info" : "neutral",
    },
  ]);
}

function countScopesForGroup(group) {
  const scopes = state.session?.scopes || [];
  return scopes.filter((scope) => group.matcher.test(scope)).length;
}

function renderSuiteRoadmap(modules) {
  const candidates = modules
    .filter((module) => !["overview", "orders", "customers", "products", "blog", "marketing", "analytics", "settings"].includes(module.route) || !module.write)
    .slice(0, 8);

  return candidates
    .map(
      (module) => `
        <div class="compact-row">
          <span class="status-icon ${module.write ? "chip-success" : module.read ? "chip-info" : "chip-neutral"}">
            <i class="bi ${escapeAttribute(module.icon)}" aria-hidden="true"></i>
          </span>
          <span class="min-w-0">
            <strong class="text-truncate">${escapeHtml(module.title)}</strong>
            <small>${escapeHtml(module.write ? "Ready for write tools" : module.read ? "Ready for read/detail page" : "Needs endpoint wiring")}</small>
          </span>
          <span class="chip ${module.write ? "chip-success" : module.read ? "chip-info" : "chip-neutral"}">${escapeHtml(module.status)}</span>
        </div>
      `,
    )
    .join("");
}

function focusModuleCard(moduleKey) {
  showView("suite");
  window.setTimeout(() => {
    const card = document.getElementById(`module-${String(moduleKey || "")}`);
    if (!card) return;
    card.classList.add("is-focused");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => card.classList.remove("is-focused"), 1400);
  }, 0);
}

function renderCustomers() {
  return customerFeature.renderCustomers();
}

function renderCustomerDetail() {
  return customerFeature.renderCustomerDetail();
}

function renderProducts() {
  const summary = getSummary();
  const filtered = getFilteredProducts().sort((a, b) => a.quantity - b.quantity || b.finalPrice - a.finalPrice);

  els.productKpis.innerHTML = [
    statCard({
      title: "Total Products",
      value: formatNumber(summary.products),
      icon: "bi-box-seam",
      accent: "purple",
      trend: "Live",
      note: "Loaded from backoffice catalog",
      values: buildProductSeries(() => 1),
    }),
    statCard({
      title: "In Stock",
      value: formatNumber(summary.inStock),
      icon: "bi-bag-check",
      accent: "blue",
      trend: summary.inStock ? "Available" : "Empty",
      note: "Products above low-stock threshold",
      values: buildProductSeries((product) => (product.quantity > LOW_STOCK_LIMIT ? 1 : 0)),
    }),
    statCard({
      title: "Low Stock",
      value: formatNumber(summary.lowStock),
      icon: "bi-exclamation-diamond",
      accent: "orange",
      trend: summary.lowStock ? "Review" : "Stable",
      note: `At or below ${LOW_STOCK_LIMIT} units`,
      values: buildProductSeries((product) => (product.quantity <= LOW_STOCK_LIMIT && product.quantity > 0 ? 1 : 0)),
    }),
    statCard({
      title: "Inventory Value",
      value: formatMoney(summary.inventoryValue, summary.currency),
      icon: "bi-safe",
      accent: "green",
      trend: "Calculated",
      note: "Final price multiplied by stock",
      values: buildProductSeries((product) => product.finalPrice * product.quantity),
    }),
  ].join("");

  els.productRows.innerHTML = filtered.length
    ? filtered.map(renderProductTableRow).join("")
    : tableEmpty(8, "No products found", "Try adjusting filters or reconnect once Selldone permits this backoffice endpoint.");

  els.productPerformance.innerHTML = renderCompactProducts(getTopProducts(5));
  els.lowStockAlerts.innerHTML = renderCompactProducts(
    state.dashboard.products
      .filter((product) => product.quantity <= LOW_STOCK_LIMIT)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5),
    "stock",
  );
  els.inventoryOverview.innerHTML = renderLineChart({
    values: buildProductSeries((product) => product.quantity),
    labels: ["1", "2", "3", "4", "5", "6", "7"],
    color: ACCENTS.blue,
    valueFormatter: (value, compact = false) => `${compact ? formatFitNumber(value) : formatNumber(value)} units`,
  });
  els.categorySummary.innerHTML = renderCategoryRows(5);

  document.querySelectorAll(".product-avatar img").forEach((image) => {
    image.addEventListener("error", () => {
      const wrapper = image.parentElement;
      wrapper.textContent = wrapper.dataset.initials || "P";
    });
  });
}

function renderBlog() {
  if (!els.articleRows) return;
  const summary = getBlogSummary();
  const filtered = getFilteredArticles().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  els.blogKpis.innerHTML = [
    statCard({
      title: "Total Posts",
      value: formatNumber(summary.total),
      icon: "bi-journal-richtext",
      accent: "purple",
      trend: summary.total ? "Live" : "No data",
      note: "Loaded from Selldone Blog",
      values: buildArticleSeries((article) => 1),
    }),
    statCard({
      title: "Published",
      value: formatNumber(summary.published),
      icon: "bi-broadcast",
      accent: "green",
      trend: summary.published ? "Public" : "Waiting",
      note: "Visible article records",
      values: buildArticleSeries((article) => (article.status === "Published" ? 1 : 0)),
    }),
    statCard({
      title: "Scheduled",
      value: formatNumber(summary.scheduled),
      icon: "bi-calendar2-check",
      accent: "blue",
      trend: summary.scheduled ? "Queued" : "Clear",
      note: "Future publish dates",
      values: buildArticleSeries((article) => (article.status === "Scheduled" ? 1 : 0)),
    }),
    statCard({
      title: "Engagement",
      value: formatFitNumber(summary.engagement, { compactAt: 1000 }),
      icon: "bi-chat-heart",
      accent: "orange",
      trend: summary.engagement ? "Tracked" : "Quiet",
      note: "Views, likes, claps, and comments",
      values: buildArticleSeries((article) => article.views + article.likes + article.power + article.comments),
    }),
  ].join("");

  els.articleRows.innerHTML = filtered.length
    ? filtered.map(renderArticleTableRow).join("")
    : tableEmpty(7, "No blog posts found", "Create a post or adjust the search and status filter.");

  els.blogTagList.innerHTML = renderBlogTagRows();
  els.blogTimeline.innerHTML = renderBlogTimelineRows();
  els.blogEditorialQueue.innerHTML = renderBlogEditorialQueue();
  els.blogPerformanceChart.innerHTML = renderLineChart({
    values: buildArticleSeries((article) => article.views + article.likes + article.power + article.comments),
    labels: ["1", "2", "3", "4", "5", "6", "7"],
    color: ACCENTS.purple,
    valueFormatter: (value, compact = false) => (compact ? formatFitNumber(value) : formatNumber(value)),
    minimal: true,
  });

  document.querySelectorAll(".article-avatar img").forEach((image) => {
    image.addEventListener("error", () => {
      const wrapper = image.parentElement;
      wrapper.textContent = wrapper.dataset.initials || "B";
    });
  });
}

async function refreshBlogPosts({ silent = false } = {}) {
  if (state.blogLoading) return;
  state.blogLoading = true;
  if (els.refreshBlogButton) {
    els.refreshBlogButton.disabled = true;
    els.refreshBlogButton.querySelector("span").textContent = "Refreshing";
  }

  try {
    const payload = await selldoneClient.blogs();
    if (!payload) return;
    state.dashboard.articles = normalizeArticles(payload.articles || payload.blogs || payload.data || payload.items || []);
    state.dashboard.articleTotal = Number(payload.total || state.dashboard.articles.length || 0);
    state.dashboard.errors = (state.dashboard.errors || []).filter((error) => error?.label !== "Blog posts");
    renderBlog();
    renderSuite();
    renderSettings();
    if (!silent) notify(`Loaded ${formatNumber(state.dashboard.articles.length)} blog posts`);
  } catch (error) {
    notify(formatArticleActionError(error.message));
  } finally {
    state.blogLoading = false;
    if (els.refreshBlogButton) {
      els.refreshBlogButton.disabled = false;
      els.refreshBlogButton.querySelector("span").textContent = "Refresh Posts";
    }
  }
}

function renderOrders() {
  const summary = getSummary();
  const counts = getOrderCounts();
  const statuses = state.dashboard.orderStatuses.length ? state.dashboard.orderStatuses : Object.keys(counts);

  els.orderKpis.innerHTML = statuses
    .slice(0, 5)
    .map((status, index) =>
      statCard({
        title: titleCase(status),
        value: formatNumber(counts[status] || counts[titleCase(status)] || 0),
        icon: ["bi-hourglass-split", "bi-gear", "bi-credit-card", "bi-truck", "bi-arrow-counterclockwise"][index] || "bi-circle",
        accent: ["purple", "blue", "green", "orange", "red"][index] || "purple",
        trend: "Live",
        note: "Selldone process center",
        values: buildOrderSeries(status),
      }),
    )
    .join("");

  els.orderPipeline.innerHTML = statuses
    .map(
      (status) => `
        <div class="pipeline-step">
          <span>${escapeHtml(titleCase(status))}</span>
          <strong>${formatNumber(counts[status] || counts[titleCase(status)] || 0)}</strong>
        </div>
      `,
    )
    .join("");

  els.orderRows.innerHTML = state.dashboard.orders.length
    ? state.dashboard.orders.slice(0, 25).map(renderOrderTableRow).join("")
    : tableEmpty(8, "No physical orders returned", "Orders will appear here once Selldone returns process-center data.");

  els.shippingPerformance.innerHTML = statusRows([
    {
      icon: "bi-check2-circle",
      title: "Paid Orders",
      body: "Orders with paid payment signals",
      value: formatNumber(summary.paidOrders),
      variant: "success",
    },
    {
      icon: "bi-clock-history",
      title: "Pending Orders",
      body: "Open or reserved orders",
      value: formatNumber(summary.openOrders),
      variant: summary.openOrders ? "warning" : "neutral",
    },
    {
      icon: "bi-arrow-counterclockwise",
      title: "Returns or Cancellations",
      body: "Returned or canceled order statuses",
      value: formatNumber(summary.returnOrders),
      variant: summary.returnOrders ? "danger" : "success",
    },
    {
      icon: "bi-cash-stack",
      title: "Average Order Value",
      body: "Calculated from returned order totals",
      value: formatMoney(summary.avgOrderValue, summary.currency),
      variant: "purple",
    },
  ]);

  els.orderTimeline.innerHTML = state.dashboard.orders.length
    ? state.dashboard.orders.slice(0, 6).map(renderTimelineRow).join("")
    : emptyState("No order timeline yet", "The timeline will update when orders are available from Selldone.");
}

function renderMarketing() {
  const summary = getSummary();
  const campaignProducts = getCampaignProducts();
  const discountExposure = summary.discountExposure;

  els.marketingKpis.innerHTML = [
    statCard({
      title: "Campaign Candidates",
      value: formatNumber(campaignProducts.length),
      icon: "bi-megaphone",
      accent: "purple",
      trend: campaignProducts.length ? "Ready" : "Empty",
      note: "Discounted or high-traffic products",
      values: buildProductSeries((product) => (product.discount || product.visits ? 1 : 0)),
    }),
    statCard({
      title: "Discount Exposure",
      value: formatMoney(discountExposure, summary.currency),
      icon: "bi-percent",
      accent: "orange",
      trend: summary.discounted ? "Active" : "No spend",
      note: `${formatNumber(summary.discounted)} discounted products`,
      values: buildProductSeries((product) => product.discount * Math.max(product.quantity, 1)),
    }),
    statCard({
      title: "Catalog Visits",
      value: formatNumber(summary.visits),
      icon: "bi-people",
      accent: "green",
      trend: summary.visits ? "Tracked" : "No visits",
      note: "Product visit totals",
      values: buildProductSeries((product) => product.visits),
    }),
    statCard({
      title: "Attributed Stock Value",
      value: formatMoney(campaignProducts.reduce((sum, product) => sum + product.finalPrice * product.quantity, 0), summary.currency),
      icon: "bi-graph-up-arrow",
      accent: "blue",
      trend: "Calculated",
      note: "Value behind campaign candidates",
      values: campaignProducts.length ? buildSeriesFromItems(campaignProducts, (product) => product.finalPrice * product.quantity) : [0, 0, 0, 0, 0, 0, 0],
    }),
  ].join("");

  els.campaignRows.innerHTML = campaignProducts.length
    ? campaignProducts.slice(0, 8).map(renderCampaignRow).join("")
    : tableEmpty(6, "No campaign candidates", "Discounted or high-traffic products will appear here.");

  els.marketingFunnel.innerHTML = renderFunnel([
    { label: "Catalog Views", value: summary.visits, color: "linear-gradient(90deg, var(--accent-purple), var(--accent-blue))" },
    { label: "Product Candidates", value: campaignProducts.length, color: "linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))" },
    { label: "Discounted SKUs", value: summary.discounted, color: "linear-gradient(90deg, var(--accent-cyan), var(--accent-green))" },
    { label: "Orders", value: summary.totalOrders, color: "linear-gradient(90deg, var(--accent-green), var(--accent-orange))" },
    { label: "Paid Signals", value: summary.paidOrders, color: "linear-gradient(90deg, var(--accent-orange), var(--accent-pink))" },
  ]);

  els.audienceOverview.innerHTML = renderDonut({
    total: summary.visits + summary.totalOrders + summary.products,
    label: "Signals",
    segments: [
      { label: "Product Visits", value: summary.visits, color: ACCENTS.purple },
      { label: "Orders", value: summary.totalOrders, color: ACCENTS.blue },
      { label: "Catalog Items", value: summary.products, color: ACCENTS.green },
    ],
  });

  els.segmentRows.innerHTML = statusRows([
    {
      icon: "bi-gem",
      title: "High Value Products",
      body: "Top inventory value candidates for premium campaigns",
      value: formatNumber(getTopProducts(10).length),
      variant: "purple",
    },
    {
      icon: "bi-heart",
      title: "Returning Customer Signals",
      body: "Requires customer analytics endpoint to enrich",
      value: formatNumber(getUniqueCustomers().repeatCustomers),
      variant: "info",
    },
    {
      icon: "bi-person-plus",
      title: "Known Customers",
      body: "Unique buyers in returned orders",
      value: formatNumber(getUniqueCustomers().uniqueCustomers),
      variant: "success",
    },
  ]);

  els.loyaltySignals.innerHTML = statusRows([
    {
      icon: "bi-stars",
      title: "Reward Candidates",
      body: "Orders and products ready for loyalty targeting",
      value: formatNumber(summary.totalOrders + summary.discounted),
      variant: "purple",
    },
    {
      icon: "bi-envelope",
      title: "Email Automation",
      body: "Connect CRM analytics to activate flow metrics",
      value: summary.visits ? "Ready" : "Waiting",
      variant: summary.visits ? "success" : "neutral",
    },
  ]);
}

function renderAnalytics() {
  const summary = getSummary();
  const analytics = getAnalyticsSummary(summary);
  const revenueSeries = getAnalyticsSeries("revenue");
  const orderSeries = getAnalyticsSeries("orders");
  const visitSeries = getAnalyticsSeries("visits");
  const labels = getAnalyticsLabels();

  els.analyticsKpis.innerHTML = [
    statCard({
      title: `Revenue ${formatWindowLabel(analytics.windowDays)}`,
      value: formatMoney(analytics.revenue, analytics.currency),
      icon: "bi-graph-up",
      accent: "purple",
      trend: analytics.revenue ? "Live" : "No data",
      note: selectedWindowCopy(analytics.windowDays),
      values: revenueSeries,
    }),
    statCard({
      title: `Orders ${formatWindowLabel(analytics.windowDays)}`,
      value: formatNumber(analytics.orders),
      icon: "bi-bag-check",
      accent: "blue",
      trend: analytics.orders ? "Active" : "Quiet",
      note: "Daily order volume",
      values: orderSeries,
    }),
    statCard({
      title: "Average Order",
      value: formatMoney(analytics.aov, analytics.currency),
      icon: "bi-receipt",
      accent: "green",
      trend: analytics.aov ? "Calculated" : "Waiting",
      note: "Revenue divided by orders",
      values: revenueSeries.map((value, index) => (orderSeries[index] ? value / orderSeries[index] : 0)),
    }),
    statCard({
      title: "Conversion",
      value: formatPercent(analytics.conversion),
      icon: "bi-funnel",
      accent: analytics.conversion ? "orange" : "green",
      trend: analytics.visits ? "Tracked" : "No visits",
      note: `${formatNumber(analytics.visits)} visits`,
      values: visitSeries,
    }),
  ].join("");

  els.analyticsRevenueChart.innerHTML = renderLineChart({
    values: revenueSeries,
    labels,
    color: ACCENTS.purple,
    valueFormatter: (value, compact = false) => (compact ? formatFitMoney(value, summary.currency) : formatMoney(value, summary.currency)),
    minimal: true,
  });

  els.analyticsOrdersChart.innerHTML = renderLineChart({
    values: orderSeries,
    labels,
    color: ACCENTS.blue,
    valueFormatter: (value, compact = false) => (compact ? formatFitNumber(value) : formatNumber(value)),
    minimal: true,
  });

  els.categoryChart.innerHTML = renderCategoryChart();
  els.inventoryDistribution.innerHTML = renderDonut({
    total: summary.products,
    label: "Products",
    segments: [
      { label: "In Stock", value: summary.inStock, color: ACCENTS.green },
      { label: "Low Stock", value: summary.lowStock, color: ACCENTS.orange },
      { label: "Out of Stock", value: summary.outOfStock, color: ACCENTS.red },
    ],
  });
  els.financeCards.innerHTML = statusRows([
    {
      icon: "bi-receipt",
      title: `${formatWindowLabel(analytics.windowDays)} Revenue`,
      body: "From shop analytics endpoint with order fallback",
      value: formatMoney(analytics.revenue, summary.currency),
      variant: "success",
    },
    {
      icon: "bi-basket",
      title: `${formatWindowLabel(analytics.windowDays)} Orders`,
      body: "Daily volume in the same window",
      value: formatNumber(analytics.orders),
      variant: "purple",
    },
    {
      icon: "bi-wallet2",
      title: "Inventory on Hand",
      body: "Value held in product stock",
      value: formatMoney(summary.inventoryValue, summary.currency),
      variant: "info",
    },
  ]);
  els.insightList.innerHTML = renderInsights(summary);
}

function renderSettings() {
  const summary = getSummary();
  const scopes = state.session?.scopes || [];
  els.endpointList.innerHTML = statusRows([
    {
      icon: "bi-cloud-check",
      title: "API Base",
      body: "Backoffice endpoint host",
      value: "api.selldone.com",
      variant: "success",
    },
    {
      icon: "bi-shield-lock",
      title: "OAuth Consent",
      body: "The sign-in URL uses prompt=consent",
      value: state.session?.authPrompt || "consent",
      variant: "purple",
    },
    {
      icon: "bi-key",
      title: "Token Storage",
      body: "Tokens are stored server-side only",
      value: "Secure",
      variant: "success",
    },
    {
      icon: "bi-list-check",
      title: "Scopes",
      body: scopes.join(", ") || "Waiting for session",
      value: formatNumber(scopes.length),
      variant: "info",
    },
    {
      icon: "bi-database",
      title: "Loaded Records",
      body: `${formatNumber(summary.products)} products, ${formatNumber(summary.articles)} blog posts, ${formatNumber(summary.totalOrders)} orders`,
      value: "Live",
      variant: "success",
    },
  ]);
  renderActions(state.actionMode);
}

function renderFilters() {
  const current = els.categoryFilter.value;
  const categoryMap = new Map();
  state.dashboard.categories.forEach((category) => {
    categoryMap.set(String(category.id), category.title || category.name || "Untitled");
  });
  state.dashboard.products.forEach((product) => {
    categoryMap.set(String(product.categoryId), product.category || "Uncategorized");
  });

  const options = ['<option value="all">All categories</option>'];
  categoryMap.forEach((title, id) => {
    options.push(`<option value="${escapeAttribute(id)}">${escapeHtml(title)}</option>`);
  });
  els.categoryFilter.innerHTML = options.join("");
  els.categoryFilter.value = Array.from(els.categoryFilter.options).some((option) => option.value === current) ? current : "all";
}

function getFilteredProducts() {
  const search = els.searchInput.value.trim().toLowerCase();
  const category = els.categoryFilter.value;
  const risk = els.riskFilter.value;

  return state.dashboard.products.filter((product) => {
    const matchesSearch =
      !search ||
      product.title.toLowerCase().includes(search) ||
      product.sku.toLowerCase().includes(search) ||
      product.category.toLowerCase().includes(search);
    const matchesCategory = category === "all" || String(product.categoryId) === category;
    const matchesRisk =
      risk === "all" ||
      (risk === "low" && product.quantity <= LOW_STOCK_LIMIT) ||
      (risk === "discounted" && product.discount > 0) ||
      (risk === "quiet" && product.visits <= 0);

    return matchesSearch && matchesCategory && matchesRisk;
  });
}

function getFilteredCustomers() {
  return customerFeature.getFilteredCustomers();
}

function getCustomerSummary() {
  return customerFeature.getCustomerSummary();
}

function buildCustomerSeries(mapper) {
  return customerFeature.buildCustomerSeries(mapper);
}

function getFilteredArticles() {
  const search = (els.blogSearchInput?.value || "").trim().toLowerCase();
  const status = els.articleStatusFilter?.value || "all";

  return state.dashboard.articles.filter((article) => {
    const text = [article.title, article.slug, article.description, article.author, ...article.tags].join(" ").toLowerCase();
    const matchesSearch = !search || text.includes(search);
    const matchesStatus =
      status === "all" ||
      article.status.toLowerCase() === status ||
      (status === "published" && article.published && article.status !== "Scheduled") ||
      (status === "draft" && !article.published && article.status !== "Scheduled") ||
      (status === "private" && article.private);
    return matchesSearch && matchesStatus;
  });
}

function getBlogSummary() {
  const articles = state.dashboard.articles;
  const published = articles.filter((article) => article.status === "Published").length;
  const scheduled = articles.filter((article) => article.status === "Scheduled").length;
  const draft = articles.filter((article) => article.status === "Draft").length;
  const privatePosts = articles.filter((article) => article.private || article.status === "Private").length;
  const views = articles.reduce((sum, article) => sum + article.views, 0);
  const comments = articles.reduce((sum, article) => sum + article.comments, 0);
  const engagement = articles.reduce((sum, article) => sum + article.views + article.likes + article.power + article.comments, 0);

  return {
    total: state.dashboard.articleTotal || articles.length,
    loaded: articles.length,
    published,
    scheduled,
    draft,
    privatePosts,
    views,
    comments,
    engagement,
  };
}

function buildArticleSeries(mapper) {
  return buildSeriesFromItems(state.dashboard.articles, mapper);
}

function renderArticleTableRow(article) {
  const initials = getInitials(article.title).slice(0, 2);
  const engagement = article.likes + article.power;
  return `
    <tr class="article-table-row">
      <td>
        <div class="compact-row no-border">
          <span class="article-avatar" data-initials="${escapeAttribute(initials || "B")}">
            ${renderArticleImage(article, initials || "B")}
          </span>
          <span class="min-w-0">
            <strong class="text-truncate">${escapeHtml(article.title)}</strong>
            <small>${escapeHtml(article.slug || article.description || article.author)}</small>
          </span>
        </div>
      </td>
      <td><span class="chip ${statusChipClass(article.status)}">${escapeHtml(article.status)}</span></td>
      <td title="${escapeAttribute(formatNumber(article.views))}">${formatFitNumber(article.views, { compactAt: 1000 })}</td>
      <td title="${escapeAttribute(formatNumber(engagement))}">${formatFitNumber(engagement, { compactAt: 1000 })}</td>
      <td title="${escapeAttribute(formatNumber(article.comments))}">${formatFitNumber(article.comments, { compactAt: 1000 })}</td>
      <td>${formatDate(article.updatedAt || article.createdAt)}</td>
      <td>
        <div class="row-action" data-article-action-menu>
          <button class="btn btn-soft btn-sm" type="button" aria-label="Article actions" aria-expanded="false" data-article-menu-button data-article-id="${escapeAttribute(article.id)}">
            <i class="bi bi-three-dots" aria-hidden="true"></i>
          </button>
          <div class="row-action-menu" role="menu">
            <button class="row-action-item" type="button" role="menuitem" data-article-edit="${escapeAttribute(article.id)}">
              <i class="bi bi-pencil-square" aria-hidden="true"></i>
              <span>Edit post</span>
            </button>
            <button class="row-action-item danger" type="button" role="menuitem" data-article-delete="${escapeAttribute(article.id)}">
              <i class="bi bi-trash3" aria-hidden="true"></i>
              <span>Delete post</span>
            </button>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function renderArticleImage(article, fallbackText) {
  if (!article.imageUrl) return escapeHtml(fallbackText);
  return `<img src="${escapeAttribute(article.imageUrl)}" alt="${escapeAttribute(article.title)} cover" loading="lazy" referrerpolicy="no-referrer" />`;
}

function renderBlogTagRows() {
  const tagCounts = new Map();
  state.dashboard.blogTags.forEach((tag) => tagCounts.set(tag, tagCounts.get(tag) || 0));
  state.dashboard.articles.forEach((article) => {
    article.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1));
  });

  const rows = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([tag, count]) => ({
      icon: "bi-tag",
      title: tag,
      body: count ? "Used by returned posts" : "Available in Selldone",
      value: count ? formatNumber(count) : "-",
      variant: count ? "info" : "neutral",
    }));
  return statusRows(rows);
}

function renderBlogTimelineRows() {
  const timeline = (state.dashboard.blogTimeline.length ? state.dashboard.blogTimeline : state.dashboard.articles.filter((article) => article.scheduledAt))
    .slice()
    .sort((a, b) => new Date(a.scheduledAt || a.createdAt || 0) - new Date(b.scheduledAt || b.createdAt || 0))
    .slice(0, 8);

  if (!timeline.length) return emptyState("No scheduled posts", "Scheduled articles will appear here when Selldone returns timeline records.");
  return timeline
    .map(
      (article) => `
        <div class="timeline-row">
          <span class="timeline-dot"><i class="bi bi-calendar-event" aria-hidden="true"></i></span>
          <span class="min-w-0">
            <strong>${escapeHtml(article.title)}</strong>
            <small>${formatDate(article.scheduledAt || article.createdAt)} - ${escapeHtml(article.status)}</small>
          </span>
        </div>
      `,
    )
    .join("");
}

function renderBlogEditorialQueue() {
  const queue = state.dashboard.articles
    .filter((article) => article.status !== "Published" || article.newComments > 0)
    .sort((a, b) => b.newComments - a.newComments || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 6);

  if (!queue.length) return emptyState("Editorial queue is clear", "Drafts, scheduled posts, and posts with new comments will appear here.");
  return queue
    .map(
      (article) => `
        <div class="compact-row no-media">
          <span class="min-w-0">
            <strong class="text-truncate">${escapeHtml(article.title)}</strong>
            <small>${escapeHtml(article.status)} - ${formatDate(article.updatedAt || article.createdAt)}</small>
          </span>
          <span class="chip ${statusChipClass(article.status)}">${article.newComments ? `${formatFitNumber(article.newComments)} new` : escapeHtml(article.status)}</span>
        </div>
      `,
    )
    .join("");
}

function getSummary() {
  const products = state.dashboard.products;
  const orders = state.dashboard.orders;
  const currency = products[0]?.currency || orders[0]?.currency || "USD";
  const inventoryValue = products.reduce((sum, product) => sum + product.finalPrice * product.quantity, 0);
  const units = products.reduce((sum, product) => sum + product.quantity, 0);
  const lowStock = products.filter((product) => product.quantity > 0 && product.quantity <= LOW_STOCK_LIMIT).length;
  const outOfStock = products.filter((product) => product.quantity <= 0).length;
  const inStock = products.filter((product) => product.quantity > LOW_STOCK_LIMIT).length;
  const discounted = products.filter((product) => product.discount > 0).length;
  const discountExposure = products.reduce((sum, product) => sum + product.discount * Math.max(product.quantity, 1), 0);
  const quiet = products.filter((product) => product.visits <= 0).length;
  const visits = products.reduce((sum, product) => sum + product.visits, 0);
  const orderValue = orders.reduce((sum, order) => sum + order.price, 0);
  const totalOrders = state.dashboard.totalOrders || orders.length;
  const paidOrders = orders.filter((order) => /paid|payed|cod/i.test(order.payment) || /paid|payed|delivered|shipped/i.test(order.status)).length;
  const openOrders = orders.filter((order) => /open|reserved|pending|processing|payed|paid/i.test(order.status)).length;
  const returnOrders = orders.filter((order) => /return|cancel/i.test(order.status)).length;

  return {
    products: products.length,
    articles: state.dashboard.articleTotal || state.dashboard.articles.length,
    notifications: state.dashboard.notificationTotal || state.dashboard.notifications.length,
    customers: state.dashboard.customerTotal || state.dashboard.customers.length,
    categories: state.dashboard.categories.length || new Set(products.map((product) => product.categoryId)).size,
    orders: orders.length,
    totalOrders,
    inventoryValue,
    units,
    lowStock,
    outOfStock,
    inStock,
    discounted,
    discountExposure,
    quiet,
    visits,
    orderValue,
    avgOrderValue: orders.length ? orderValue / orders.length : 0,
    avgPrice: products.length ? products.reduce((sum, product) => sum + product.finalPrice, 0) / products.length : 0,
    paidOrders,
    openOrders,
    returnOrders,
    currency,
  };
}

function getAnalyticsPoints() {
  const points = state.dashboard.analytics?.points?.length ? state.dashboard.analytics.points : normalizeStoreAnalytics({}, state.dashboard.orders).points;
  return points.slice(-state.dateRangeDays);
}

function getAnalyticsSeries(field) {
  return getAnalyticsPoints().map((point) => Number(point[field] || 0));
}

function getAnalyticsLabels() {
  return getAnalyticsPoints().map((point) => point.date);
}

function getAnalyticsSummary(baseSummary = getSummary()) {
  const points = getAnalyticsPoints();
  const revenue = points.reduce((sum, point) => sum + Number(point.revenue || 0), 0);
  const orders = points.reduce((sum, point) => sum + Number(point.orders || 0), 0);
  const visits = points.reduce((sum, point) => sum + Number(point.visits || 0), 0);
  const customers = points.reduce((sum, point) => sum + Number(point.customers || 0), 0);
  const windowDays = Math.min(state.dateRangeDays, state.dashboard.analytics?.window?.days || state.dateRangeDays);

  return {
    points,
    revenue: revenue || baseSummary.orderValue,
    orders: orders || baseSummary.totalOrders,
    visits: visits || baseSummary.visits,
    customers,
    aov: (orders || baseSummary.totalOrders) ? (revenue || baseSummary.orderValue) / (orders || baseSummary.totalOrders) : 0,
    conversion: visits ? ((orders || baseSummary.totalOrders) / visits) * 100 : 0,
    windowDays,
    currency: baseSummary.currency,
  };
}

function formatWindowLabel(days) {
  if (Number(days) === 1) return "Today";
  return `${Number(days || 30)}D`;
}

function selectedWindowCopy(days = state.dateRangeDays) {
  if (Number(days) === 1) return "Today";
  return `Last ${Number(days || 30)} days`;
}

function updateDateRangeLabel() {
  if (!els.dateRangeLabel) return;
  const labels = {
    1: "Today",
    7: "Last 7 days",
    30: "Last 30 days",
  };
  els.dateRangeLabel.textContent = labels[state.dateRangeDays] || `Last ${state.dateRangeDays} days`;
}

function updateDateRange() {
  const next = Number(els.datePreset?.value || 30);
  state.dateRangeDays = [1, 7, 30].includes(next) ? next : 30;
  updateDateRangeLabel();
  renderOverview();
  renderMarketing();
  renderAnalytics();
}

function getOrderCounts() {
  const counts = Object.fromEntries(state.dashboard.orderStatuses.map((status) => [status, 0]));
  state.dashboard.orders.forEach((order) => {
    counts[order.status] = (counts[order.status] || 0) + 1;
  });
  return counts;
}

function getTopProducts(limit = 6) {
  return state.dashboard.products
    .slice()
    .sort((a, b) => b.sells - a.sells || b.visits - a.visits || b.finalPrice * b.quantity - a.finalPrice * a.quantity)
    .slice(0, limit);
}

function getCampaignProducts() {
  return state.dashboard.products
    .filter((product) => product.discount > 0 || product.visits > 0)
    .sort((a, b) => b.discount - a.discount || b.visits - a.visits)
    .slice(0, 10);
}

function getCategoryMetrics() {
  const products = state.dashboard.products;
  const categoryMap = new Map();

  state.dashboard.categories.forEach((category) => {
    categoryMap.set(String(category.id), {
      id: String(category.id),
      title: category.title || category.name || "Untitled",
      stock: 0,
      visits: Number(category.visits || 0),
      value: 0,
      count: 0,
      currency: products[0]?.currency || "USD",
    });
  });

  products.forEach((product) => {
    const id = String(product.categoryId);
    if (!categoryMap.has(id)) {
      categoryMap.set(id, {
        id,
        title: product.category || "Uncategorized",
        stock: 0,
        visits: 0,
        value: 0,
        count: 0,
        currency: product.currency,
      });
    }
    const row = categoryMap.get(id);
    row.stock += product.quantity;
    row.visits += product.visits;
    row.value += product.finalPrice * product.quantity;
    row.count += 1;
    row.currency = product.currency || row.currency;
  });

  return Array.from(categoryMap.values()).filter((row) => row.count || row.value || row.stock || row.visits);
}

function getUniqueCustomers() {
  const seen = new Map();
  state.dashboard.orders.forEach((order) => {
    const key = (order.email || order.customer || "").toLowerCase();
    if (!key) return;
    seen.set(key, (seen.get(key) || 0) + 1);
  });
  return {
    uniqueCustomers: seen.size,
    repeatCustomers: Array.from(seen.values()).filter((count) => count > 1).length,
  };
}

function statCard({ title, value, icon, accent, trend, note, values }) {
  const trendClass = /review|quiet|empty|no data|waiting/i.test(trend || "") ? "trend-down" : "trend-up";
  return `
    <article class="stat-card">
      <div class="stat-left">
        <div class="stat-title-row">
          <span class="stat-icon accent-${escapeAttribute(accent || "purple")}">
            <i class="bi ${escapeAttribute(icon || "bi-circle")}" aria-hidden="true"></i>
          </span>
          <span class="stat-title-copy">
            <span class="stat-label">${escapeHtml(title)}</span>
            <span class="stat-value d-block">${escapeHtml(value)}</span>
          </span>
        </div>
        <div class="stat-note">
          <span class="metric-chip ${trendClass}">${escapeHtml(trend || "Live")}</span>
          <span>${escapeHtml(note || "")}</span>
        </div>
      </div>
      ${makeSparkline(values || [0, 0, 0, 0, 0, 0, 0], ACCENTS[accent] || ACCENTS.purple)}
    </article>
  `;
}

function renderSkeletonStat() {
  return `
    <article class="stat-card">
      <div class="stat-left">
        <div class="stat-label skeleton-text">Loading</div>
        <div class="stat-value skeleton-text">Loading</div>
        <div class="stat-note skeleton-text">Loading</div>
      </div>
    </article>
  `;
}

function makeSparkline(values, color = ACCENTS.purple) {
  const numbers = normalizeSeries(values, 7);
  const comparison = makeComparisonSeries(numbers);
  const domain = getSeriesDomain(numbers, comparison);
  const { line, area } = makeChartPath(numbers, 120, 64, 6, domain);
  const comparisonPath = makeChartPath(comparison, 120, 64, 6, domain).line;
  return `
    <svg class="sparkline" style="color:${color}" viewBox="0 0 120 64" role="img" aria-label="Trend">
      <path class="area" d="${area}" fill="currentColor"></path>
      <path class="comparison-line" d="${comparisonPath}"></path>
      <path class="line" d="${line}"></path>
    </svg>
  `;
}

function renderLineChart({ values, labels, color, valueFormatter, minimal = false }) {
  const numbers = normalizeSeries(values, Math.max(2, values?.length || 7));
  const comparison = makeComparisonSeries(numbers);
  const domain = getSeriesDomain(numbers, comparison);
  const { line, area, points } = makeChartPath(numbers, 640, 210, 16, domain);
  const comparisonPath = makeChartPath(comparison, 640, 210, 16, domain).line;
  const latest = numbers[numbers.length - 1] || 0;
  const max = Math.max(...numbers, 0);

  if (!numbers.some(Boolean)) {
    return emptyState("No chart data yet", "The chart will draw once Selldone returns live values.");
  }

  return `
    <div class="line-chart ${minimal ? "stripe-chart" : ""}" style="color:${color}">
      <svg viewBox="0 0 640 210" role="img" aria-label="Line chart">
        ${[52, 104, 156].map((y) => `<line class="grid-line" x1="0" x2="640" y1="${y}" y2="${y}"></line>`).join("")}
        <path class="area" d="${area}" fill="currentColor" opacity="${minimal ? "0.035" : "0.08"}"></path>
        <path class="comparison-line" d="${comparisonPath}"></path>
        <path class="line" d="${line}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"></path>
        <circle cx="${points[points.length - 1].x}" cy="${points[points.length - 1].y}" r="4" fill="currentColor"></circle>
      </svg>
      <div class="axis-labels">
        <span>${escapeHtml(labels?.[0] || "Start")}</span>
        <strong title="${escapeAttribute(valueFormatter ? valueFormatter(latest) : formatNumber(latest))}">
          ${escapeHtml(valueFormatter ? valueFormatter(latest, true) : formatFitNumber(latest))}
        </strong>
        <span title="${escapeAttribute(valueFormatter ? valueFormatter(max) : formatNumber(max))}">
          Max ${escapeHtml(valueFormatter ? valueFormatter(max, true) : formatFitNumber(max))}
        </span>
      </div>
    </div>
  `;
}

function makeComparisonSeries(values) {
  return values.map((value, index) => {
    const previous = values[index - 1] ?? value;
    const next = values[index + 1] ?? value;
    return (previous + value + next) / 3;
  });
}

function makeChartPath(values, width, height, pad, domain = getSeriesDomain(values)) {
  const { min, max } = domain;
  const range = max - min || 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const points = values.map((value, index) => ({
    x: Math.round(pad + index * step),
    y: Math.round(height - pad - ((value - min) / range) * (height - pad * 2)),
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const baseY = height - pad;
  const area = `M${points[0].x},${baseY} ${points.map((point) => `L${point.x},${point.y}`).join(" ")} L${points[points.length - 1].x},${baseY} Z`;
  return { line, area, points };
}

function getSeriesDomain(...series) {
  const values = series.flat().filter((value) => Number.isFinite(Number(value))).map(Number);
  return {
    min: Math.min(...values, 0),
    max: Math.max(...values, 0),
  };
}

function normalizeSeries(values, length = 7) {
  const list = Array.isArray(values) ? values.map((value) => Number(value || 0)) : [];
  if (!list.length) return Array.from({ length }, () => 0);
  if (list.length === length) return list;
  const buckets = Array.from({ length }, () => 0);
  list.forEach((value, index) => {
    buckets[index % length] += value;
  });
  return buckets;
}

function buildProductSeries(mapper) {
  return buildSeriesFromItems(state.dashboard.products, mapper);
}

function buildOrderSeries(status) {
  const orders = status
    ? state.dashboard.orders.filter((order) => order.status === status || order.status === titleCase(status))
    : state.dashboard.orders;
  return buildSeriesFromItems(orders, (order) => order.price || 1);
}

function buildSeriesFromItems(items, mapper) {
  const buckets = Array.from({ length: 7 }, () => 0);
  items.forEach((item, index) => {
    buckets[index % buckets.length] += Number(mapper(item) || 0);
  });
  return buckets;
}

function renderDonut({ total, label, segments }) {
  const safeTotal = Number(total || 0);
  const visibleSegments = segments.filter((segment) => Number(segment.value || 0) > 0);
  const degreeTotal = visibleSegments.reduce((sum, segment) => sum + Number(segment.value || 0), 0);

  if (!safeTotal || !visibleSegments.length) {
    return emptyState("No distribution data", "Distribution will appear when this endpoint returns live values.");
  }

  let cursor = 0;
  const gradient = visibleSegments
    .map((segment) => {
      const start = cursor;
      const degree = (Number(segment.value || 0) / degreeTotal) * 360;
      cursor += degree;
      return `${segment.color} ${start}deg ${cursor}deg`;
    })
    .join(", ");

  return `
    <div class="donut" style="background: conic-gradient(${gradient})">
      <div class="donut-center">
        <span>Total</span>
        <strong title="${escapeAttribute(formatNumber(safeTotal))}">${formatFitNumber(safeTotal, { compactAt: 1000 })}</strong>
        <span>${escapeHtml(label)}</span>
      </div>
    </div>
    <div class="donut-legend">
      ${visibleSegments
        .map(
          (segment) => `
            <div class="legend-row" style="color:${segment.color}">
              <span class="legend-dot"></span>
              <span>${escapeHtml(segment.label)}</span>
              <strong title="${escapeAttribute(formatNumber(segment.value))}">${formatFitNumber(segment.value, { compactAt: 1000 })}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function statusRows(rows) {
  if (!rows.length) return emptyState("No data yet", "Live records will appear here after the next refresh.");
  return rows
    .map(
      (row) => `
        <div class="status-row">
          <span class="status-icon chip-${escapeAttribute(row.variant || "neutral")}">
            <i class="bi ${escapeAttribute(row.icon || "bi-circle")}" aria-hidden="true"></i>
          </span>
          <span class="min-w-0">
            <strong class="text-truncate">${escapeHtml(row.title)}</strong>
            <small>${escapeHtml(row.body || "")}</small>
          </span>
          <span class="chip chip-${escapeAttribute(row.variant || "neutral")}">${escapeHtml(row.value)}</span>
        </div>
      `,
    )
    .join("");
}

function renderCompactProducts(products, mode = "value") {
  if (!products.length) return emptyState("No products in this view", "Products will appear once Selldone returns catalog data.");

  return products
    .map((product) => {
      const initials = getInitials(product.title);
      const value =
        mode === "stock"
          ? `${formatFitNumber(product.quantity, { compactAt: 1000 })} left`
          : formatFitMoney(product.finalPrice * Math.max(product.quantity, 1), product.currency);
      return `
        <div class="compact-row">
          <span class="product-avatar" data-initials="${escapeAttribute(initials)}">
            ${renderProductImage(product, initials)}
          </span>
          <span class="min-w-0">
            <strong class="text-truncate">${escapeHtml(product.title)}</strong>
            <small>${escapeHtml(product.category)} - ${escapeHtml(product.sku)}</small>
          </span>
          <span class="money">${escapeHtml(value)}</span>
        </div>
      `;
    })
    .join("");
}

function renderCompactOrders(orders) {
  if (!orders.length) return emptyState("No recent orders", "Orders will appear here when Selldone returns process-center data.");

  return orders
    .map(
      (order) => `
        <div class="compact-row">
          <span class="customer-avatar">${escapeHtml(getInitials(order.customer).slice(0, 1))}</span>
          <span class="min-w-0">
            <strong class="text-truncate">${escapeHtml(order.code)}</strong>
            <small>${escapeHtml(order.customer)}</small>
          </span>
          <span class="chip ${statusChipClass(order.status)}">${escapeHtml(order.status)}</span>
        </div>
      `,
    )
    .join("");
}

function renderProductTableRow(product) {
  const initials = getInitials(product.title);
  return `
    <tr class="product-table-row" data-product-open="${escapeAttribute(product.id)}" tabindex="0" aria-label="Open ${escapeAttribute(product.title)} details">
      <td>
        <div class="compact-row no-border">
          <span class="product-avatar" data-initials="${escapeAttribute(initials)}">
            ${renderProductImage(product, initials)}
          </span>
          <span class="min-w-0">
            <strong class="text-truncate">${escapeHtml(product.title)}</strong>
            <small>${escapeHtml(product.category)}</small>
          </span>
        </div>
      </td>
      <td><span class="sku">${escapeHtml(product.sku)}</span></td>
      <td>${escapeHtml(product.category)}</td>
      <td>
        <span class="money">${formatMoney(product.finalPrice, product.currency, 2)}</span>
        ${product.discount ? `<small class="d-block text-secondary">${formatMoney(product.discount, product.currency, 2)} off</small>` : ""}
      </td>
      <td><span class="chip ${stockChipClass(product.quantity)}" title="${escapeAttribute(formatNumber(product.quantity))}">${formatFitNumber(product.quantity, { compactAt: 1000 })}</span></td>
      <td><span class="chip ${statusChipClass(product.status)}">${escapeHtml(product.status)}</span></td>
      <td>${makeSparkline(buildSeriesFromItems([product], (item) => item.visits || item.quantity || item.finalPrice), ACCENTS.purple)}</td>
      <td>
        <div class="row-action" data-product-action-menu>
          <button class="btn btn-soft btn-sm" type="button" aria-label="Product actions" aria-expanded="false" data-product-menu-button data-product-id="${escapeAttribute(product.id)}">
            <i class="bi bi-three-dots" aria-hidden="true"></i>
          </button>
          <div class="row-action-menu" role="menu">
            <button class="row-action-item" type="button" role="menuitem" data-product-edit="${escapeAttribute(product.id)}">
              <i class="bi bi-pencil-square" aria-hidden="true"></i>
              <span>Edit product</span>
            </button>
            <button class="row-action-item danger" type="button" role="menuitem" data-product-delete="${escapeAttribute(product.id)}">
              <i class="bi bi-trash3" aria-hidden="true"></i>
              <span>Delete product</span>
            </button>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function renderProductImage(product, fallbackText) {
  if (!product.imageUrl) return escapeHtml(fallbackText);
  return `<img src="${escapeAttribute(product.imageUrl)}" alt="${escapeAttribute(product.title)} image" loading="lazy" referrerpolicy="no-referrer" />`;
}

function renderProductDetail() {
  if (!els.productDetailContent) return;
  const product = findProduct(state.activeProductId);
  if (!product) {
    els.productDetailContent.innerHTML = emptyState(
      "Select a product",
      "Open any product row from the products table to review its full Selldone record.",
    );
    return;
  }

  const rawRows = productDetailRawRows(product.raw);
  const stockValue = product.finalPrice * Math.max(product.quantity, 0);
  const image = product.imageUrl
    ? `<img src="${escapeAttribute(product.imageUrl)}" alt="${escapeAttribute(product.title)} image" loading="lazy" referrerpolicy="no-referrer" />`
    : `<span>${escapeHtml(getInitials(product.title))}</span>`;

  els.productDetailContent.innerHTML = `
    <article class="product-detail-hero panel-card">
      <div class="product-detail-media">
        ${image}
      </div>
      <div class="product-detail-main">
        <div class="product-detail-kicker">
          <span class="chip chip-info">${escapeHtml(product.category)}</span>
          <span class="chip ${statusChipClass(product.status)}">${escapeHtml(product.status)}</span>
        </div>
        <h2>${escapeHtml(product.title)}</h2>
        <p>${escapeHtml(product.raw?.description || product.raw?.lead || product.raw?.subtitle || "No product description returned by Selldone.")}</p>
        <div class="product-detail-actions">
          <button class="btn btn-primary-gradient" type="button" data-product-edit="${escapeAttribute(product.id)}">
            <i class="bi bi-pencil-square" aria-hidden="true"></i>
            <span>Edit product</span>
          </button>
          <button class="btn btn-soft" type="button" data-view-jump="products">
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
            <span>Back to products</span>
          </button>
        </div>
      </div>
      <div class="product-detail-price">
        <span>Price</span>
        <strong>${formatMoney(product.finalPrice, product.currency, 2)}</strong>
        ${product.discount ? `<small>${formatMoney(product.discount, product.currency, 2)} discount</small>` : "<small>No discount</small>"}
      </div>
    </article>

    <div class="product-detail-grid">
      ${productInfoPanel("Catalog", [
        ["Product ID", product.id],
        ["SKU", product.sku],
        ["Category", product.category],
        ["Category ID", product.categoryId],
        ["Backoffice status", product.backofficeStatus],
        ["Currency", product.currency],
      ])}
      ${productInfoPanel("Inventory", [
        ["Quantity", formatNumber(product.quantity)],
        ["Stock status", product.status],
        ["Inventory value", formatMoney(stockValue, product.currency, 2)],
        ["Base price", formatMoney(product.price, product.currency, 2)],
        ["Final price", formatMoney(product.finalPrice, product.currency, 2)],
        ["Discount", formatMoney(product.discount, product.currency, 2)],
      ])}
      ${productInfoPanel("Performance", [
        ["Visits", formatNumber(product.visits)],
        ["Sells", formatNumber(product.sells)],
        ["Estimated value", formatMoney(stockValue, product.currency, 2)],
        ["Image URL", product.imageUrl ? "Available" : "Missing"],
      ])}
      <article class="panel-card product-detail-panel span-2">
        <div class="panel-header">
          <div>
            <h2>Selldone Raw Fields</h2>
            <p>Useful fields from the live product payload for debugging and future development.</p>
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
  `;

  if (state.activeView === "productDetail") {
    updateProductDetailHeading(product);
  }
}

function productInfoPanel(title, rows) {
  return `
    <article class="panel-card product-detail-panel">
      <div class="panel-header">
        <h2>${escapeHtml(title)}</h2>
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

function productDetailRawRows(raw = {}) {
  const rows = Object.entries(raw || {})
    .filter(([, value]) => value !== null && value !== undefined && typeof value !== "object")
    .slice(0, 24);
  return rows.length ? rows : [["No primitive fields", "-"]];
}

function formatRawValue(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "-";
  const text = String(value || "");
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
}

function openProductDetail(productId, updateHash = true) {
  const product = findProduct(productId);
  if (!product) {
    notify("Product was not found in the current table.");
    return;
  }
  state.activeProductId = product.id;
  renderProductDetail();
  showView("productDetail", false);
  updateProductDetailHeading(product);
  if (updateHash) {
    history.replaceState(null, "", `#product-${encodeURIComponent(product.id)}`);
  }
}

function updateProductDetailHeading(product) {
  els.pageTitle.textContent = product.title;
  els.pageEyebrow.textContent = "Product";
  els.pageSubtitle.textContent = `${product.category} - ${product.sku} - ${formatMoney(product.finalPrice, product.currency, 2)}`;
}

function findProduct(productId) {
  return state.dashboard.products.find((product) => String(product.id) === String(productId)) || null;
}

function openCustomerDetail(customerId, updateHash = true) {
  return customerFeature.openCustomerDetail(customerId, updateHash);
}

function updateCustomerDetailHeading(customer) {
  return customerFeature.updateCustomerDetailHeading(customer);
}

function findCustomer(customerId) {
  return customerFeature.findCustomer(customerId);
}

function refreshCustomers(options) {
  return customerFeature.refreshCustomers(options);
}

function openCustomerEditor(customerId) {
  return customerFeature.openCustomerEditor(customerId);
}

function closeCustomerEditor() {
  return customerFeature.closeCustomerEditor();
}

function submitCustomerEdit(event) {
  return customerFeature.submitCustomerEdit(event);
}

function toggleProductMenu(button) {
  const wrapper = button.closest("[data-product-action-menu]");
  const willOpen = !wrapper.classList.contains("is-open");
  closeProductMenus();
  wrapper.classList.toggle("is-open", willOpen);
  button.setAttribute("aria-expanded", String(willOpen));
}

function closeProductMenus() {
  document.querySelectorAll("[data-product-action-menu].is-open").forEach((menu) => {
    menu.classList.remove("is-open");
    menu.querySelector("[data-product-menu-button]")?.setAttribute("aria-expanded", "false");
  });
}

function openProductEditor(productId) {
  const product = findProduct(productId);
  if (!product) {
    notify("Product was not found in the current table.");
    return;
  }

  state.editingProductId = product.id;
  els.productEditId.value = product.id;
  els.productEditTitle.value = product.title || "";
  els.productEditTitleEn.value = product.titleEn || product.raw?.title_en || "";
  els.productEditSku.value = product.sku === "-" ? "" : product.sku || "";
  els.productEditPrice.value = Number(product.price || product.finalPrice || 0);
  els.productEditDiscount.value = Number(product.discount || 0);
  els.productEditCurrency.value = product.currency || "USD";
  const statusValue = product.backofficeStatus || "Open";
  ensureSelectOption(els.productEditStatus, statusValue);
  els.productEditStatus.value = statusValue;

  els.productEditor.classList.add("is-open");
  els.productEditor.setAttribute("aria-hidden", "false");
  window.setTimeout(() => els.productEditTitle.focus(), 0);
}

function ensureSelectOption(select, value) {
  if (!select || !value) return;
  if (Array.from(select.options).some((option) => option.value === value)) return;
  const option = document.createElement("option");
  option.value = value;
  option.textContent = titleCase(value);
  select.appendChild(option);
}

function closeProductEditor() {
  state.editingProductId = null;
  els.productEditor.classList.remove("is-open");
  els.productEditor.setAttribute("aria-hidden", "true");
  els.productEditForm.reset();
}

async function submitProductEdit(event) {
  event.preventDefault();
  const productId = els.productEditId.value;
  const payload = {
    title: els.productEditTitle.value.trim(),
    title_en: els.productEditTitleEn.value.trim(),
    sku: els.productEditSku.value.trim(),
    price: Number(els.productEditPrice.value || 0),
    discount: Number(els.productEditDiscount.value || 0),
    currency: els.productEditCurrency.value.trim() || "USD",
    status: els.productEditStatus.value,
  };

  els.productEditSubmit.disabled = true;
  try {
    await selldoneClient.updateProduct(encodeURIComponent(productId), payload);
    applyProductEdit(productId, payload);
    closeProductEditor();
    renderAll();
    notify("Product updated");
  } catch (error) {
    notify(formatProductActionError(error.message));
  } finally {
    els.productEditSubmit.disabled = false;
  }
}

async function deleteProduct(productId) {
  const product = findProduct(productId);
  if (!product) {
    notify("Product was not found in the current table.");
    return;
  }

  const confirmed = window.confirm(`Delete "${product.title}" from Selldone? This is a soft-delete action.`);
  if (!confirmed) return;

  try {
    await selldoneClient.deleteProduct(encodeURIComponent(productId));
    state.dashboard.products = state.dashboard.products.filter((item) => String(item.id) !== String(productId));
    if (String(state.activeProductId) === String(productId)) {
      state.activeProductId = null;
      showView("products");
    }
    renderAll();
    notify("Product deleted");
  } catch (error) {
    notify(formatProductActionError(error.message));
  }
}

function applyProductEdit(productId, payload) {
  const product = findProduct(productId);
  if (!product) return;

  product.title = payload.title || product.title;
  product.titleEn = payload.title_en || "";
  product.sku = payload.sku || "-";
  product.price = Number(payload.price || 0);
  product.discount = Number(payload.discount || 0);
  product.finalPrice = Math.max(0, product.price - product.discount);
  product.currency = payload.currency || product.currency;
  product.backofficeStatus = payload.status || product.backofficeStatus;
  product.status = normalizeProductStatus({ ...product, status: product.backofficeStatus }, product.quantity);
}

function formatProductActionError(message) {
  if (/scope|permission|403|forbidden/i.test(message)) {
    return "Reconnect with consent to grant product write access.";
  }
  if (/google2fa/i.test(message)) {
    return "Selldone requires Google 2FA verification for this product action.";
  }
  return message || "Product action failed.";
}

function formatCustomerActionError(message) {
  return customerFeature.formatCustomerActionError(message);
}

function findArticle(articleId) {
  return state.dashboard.articles.find((article) => String(article.id) === String(articleId)) || null;
}

function toggleArticleMenu(button) {
  const wrapper = button.closest("[data-article-action-menu]");
  const willOpen = !wrapper.classList.contains("is-open");
  closeArticleMenus();
  wrapper.classList.toggle("is-open", willOpen);
  button.setAttribute("aria-expanded", String(willOpen));
}

function closeArticleMenus() {
  document.querySelectorAll("[data-article-action-menu].is-open").forEach((menu) => {
    menu.classList.remove("is-open");
    menu.querySelector("[data-article-menu-button]")?.setAttribute("aria-expanded", "false");
  });
}

function openArticleEditor(articleId = null) {
  const article = articleId ? findArticle(articleId) : null;
  if (articleId && !article) {
    notify("Blog post was not found in the current table.");
    return;
  }

  state.editingArticleId = article?.id || null;
  els.articleEditId.value = article?.id || "";
  els.articleEditTitle.value = article?.title || "";
  els.articleEditSlug.value = article?.slug || "";
  els.articleEditLang.value = article?.lang || "en";
  els.articleEditPageTitle.value = article?.pageTitle || "";
  els.articleEditDescription.value = article?.description || "";
  els.articleEditBody.value = article?.body || "";
  els.articleEditImage.value = article?.image || article?.raw?.image || "";
  els.articleEditSchedule.value = toDateTimeLocalValue(article?.scheduledAt);
  els.articleEditPublished.value = article?.published ? "true" : "false";
  els.articleEditTags.value = (article?.tags || []).join(", ");
  els.articleEditPrivate.checked = Boolean(article?.private);

  const bodyMissingFromApi = Boolean(article && !article.hasFullBody);
  els.articleEditBody.required = !article || article.hasFullBody;
  if (els.articleEditBodyHelp) {
    els.articleEditBodyHelp.textContent = bodyMissingFromApi
      ? "Selldone's blog list API did not return the current article body. Paste the body before saving to avoid replacing the existing content."
      : "";
    els.articleEditBodyHelp.classList.toggle("warning", bodyMissingFromApi);
  }

  const title = document.getElementById("articleEditorTitle");
  if (title) title.textContent = article ? "Edit Blog Post" : "New Blog Post";
  els.articleEditor.classList.add("is-open");
  els.articleEditor.setAttribute("aria-hidden", "false");
  window.setTimeout(() => els.articleEditTitle.focus(), 0);
}

function closeArticleEditor() {
  state.editingArticleId = null;
  els.articleEditor.classList.remove("is-open");
  els.articleEditor.setAttribute("aria-hidden", "true");
  els.articleEditForm.reset();
  els.articleEditBody.required = true;
  if (els.articleEditBodyHelp) {
    els.articleEditBodyHelp.textContent = "";
    els.articleEditBodyHelp.classList.remove("warning");
  }
}

async function submitArticleEdit(event) {
  event.preventDefault();
  const articleId = els.articleEditId.value;
  const editingArticle = articleId ? findArticle(articleId) : null;
  const payload = {
    title: els.articleEditTitle.value.trim(),
    slug: els.articleEditSlug.value.trim(),
    lang: els.articleEditLang.value.trim() || "en",
    page_title: els.articleEditPageTitle.value.trim(),
    description: els.articleEditDescription.value.trim(),
    body: els.articleEditBody.value.trim(),
    image: els.articleEditImage.value.trim(),
    schedule_at: toApiDateTimeValue(els.articleEditSchedule.value),
    published: els.articleEditPublished.value === "true",
    private: els.articleEditPrivate.checked,
    tags: splitTags(els.articleEditTags.value),
  };

  if (!payload.title) {
    notify("Article title is required.");
    return;
  }

  if (!articleId && !payload.body) {
    notify("Article body is required for a new blog post.");
    return;
  }

  if (articleId && !editingArticle?.hasFullBody && !payload.body) {
    notify("Selldone did not return the current body for this post. Paste the body before saving.");
    els.articleEditBody.focus();
    return;
  }

  if (articleId && editingArticle?.hasFullBody && !payload.body) {
    notify("Article body is required.");
    return;
  }

  els.articleEditSubmit.disabled = true;
  try {
    await selldoneClient.saveBlogArticle(articleId ? { ...payload, article_id: articleId } : payload, payload.tags);
    closeArticleEditor();
    await loadDashboard();
    notify(articleId ? "Blog post updated" : "Blog post created");
  } catch (error) {
    notify(formatArticleActionError(error.message));
  } finally {
    els.articleEditSubmit.disabled = false;
  }
}

async function deleteArticle(articleId) {
  const article = findArticle(articleId);
  if (!article) {
    notify("Blog post was not found in the current table.");
    return;
  }

  const confirmed = window.confirm(`Delete "${article.title}" from Selldone blog?`);
  if (!confirmed) return;

  try {
    await selldoneClient.deleteBlogArticle(encodeURIComponent(articleId));
    state.dashboard.articles = state.dashboard.articles.filter((item) => String(item.id) !== String(articleId));
    state.dashboard.articleTotal = Math.max(0, Number(state.dashboard.articleTotal || 0) - 1);
    renderAll();
    notify("Blog post deleted");
  } catch (error) {
    notify(formatArticleActionError(error.message));
  }
}

function splitTags(value) {
  return Array.from(new Set(String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean))).slice(0, 24);
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const text = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function toApiDateTimeValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatArticleActionError(message) {
  if (/scope|permission|403|forbidden/i.test(message)) {
    return "Reconnect with consent to grant blog article access.";
  }
  if (/google2fa/i.test(message)) {
    return "Selldone requires Google 2FA verification for this blog action.";
  }
  return message || "Blog action failed.";
}

function renderOrderTableRow(order) {
  return `
    <tr>
      <td>
        <strong>${escapeHtml(order.code)}</strong>
        <small class="d-block text-secondary">${escapeHtml(String(order.id || ""))}</small>
      </td>
      <td>
        <div class="compact-row no-border">
          <span class="customer-avatar">${escapeHtml(getInitials(order.customer).slice(0, 1))}</span>
          <span class="min-w-0">
            <strong class="text-truncate">${escapeHtml(order.customer)}</strong>
            <small>${escapeHtml(order.email || "Customer")}</small>
          </span>
        </div>
      </td>
      <td>${formatDate(order.createdAt)}</td>
      <td class="money">${formatMoney(order.price, order.currency, 2)}</td>
      <td><span class="chip ${statusChipClass(order.payment)}">${escapeHtml(order.payment)}</span></td>
      <td><span class="chip ${statusChipClass(order.status)}">${escapeHtml(order.status)}</span></td>
      <td>${escapeHtml(order.fulfillment)}</td>
      <td><button class="btn btn-soft btn-sm" type="button" aria-label="Order actions"><i class="bi bi-three-dots" aria-hidden="true"></i></button></td>
    </tr>
  `;
}

function renderCampaignRow(product) {
  const spend = product.discount * Math.max(product.quantity, 1);
  const revenue = product.finalPrice * Math.max(product.quantity, 1);
  const roas = spend ? `${(revenue / spend).toFixed(2)}x` : "-";
  const active = product.discount > 0;
  return `
    <tr>
      <td>
        <strong>${escapeHtml(product.title)} Promotion</strong>
        <small class="d-block text-secondary">${escapeHtml(product.category)}</small>
      </td>
      <td>Catalog / CRM</td>
      <td>${formatMoney(spend, product.currency, 2)}</td>
      <td>${escapeHtml(roas)}</td>
      <td>${formatMoney(revenue, product.currency, 2)}</td>
      <td><span class="chip ${active ? "chip-success" : "chip-neutral"}">${active ? "Active" : "Draft"}</span></td>
    </tr>
  `;
}

function renderTimelineRow(order) {
  return `
    <div class="timeline-row">
      <span class="timeline-dot"><i class="bi bi-receipt" aria-hidden="true"></i></span>
      <span class="min-w-0">
        <strong>${escapeHtml(order.code)} ${escapeHtml(order.status)}</strong>
        <small>${formatDate(order.createdAt)} - ${escapeHtml(order.customer)}</small>
      </span>
    </div>
  `;
}

function renderCategoryRows(limit = 8) {
  const rows = getCategoryMetrics().sort((a, b) => b.value - a.value).slice(0, limit);
  if (!rows.length) return emptyState("No category data", "Categories will appear after the category endpoint returns data.");

  return statusRows(
    rows.map((row, index) => ({
      icon: ["bi-cpu", "bi-bag", "bi-stars", "bi-tags", "bi-layers"][index % 5],
      title: row.title,
      body: `${formatNumber(row.count)} products, ${formatNumber(row.stock)} units`,
      value: formatFitMoney(row.value, row.currency),
      variant: ["info", "success", "warning", "purple", "neutral"][index % 5],
    })),
  );
}

function renderCategoryChart() {
  const rows = getCategoryMetrics().sort((a, b) => b.value - a.value);
  if (!rows.length) return emptyState("No category chart yet", "Category analytics will appear after Selldone returns category and product data.");

  const max = Math.max(...rows.map((row) => row.value), 1);
  return rows
    .slice(0, 8)
    .map((row, index) => {
      const width = Math.max(4, Math.round((row.value / max) * 100));
      const colors = [ACCENTS.purple, ACCENTS.blue, ACCENTS.green, ACCENTS.orange, ACCENTS.pink];
      return `
        <div class="progress-row">
          <div class="min-w-0">
            <strong>${escapeHtml(row.title)}</strong>
            <small>${formatNumber(row.stock)} units, ${formatNumber(row.visits)} visits</small>
            <div class="progress-track">
              <div class="progress-fill" style="width:${width}%; background:${colors[index % colors.length]}"></div>
            </div>
          </div>
          <span class="money" title="${escapeAttribute(formatMoney(row.value, row.currency))}">${formatFitMoney(row.value, row.currency)}</span>
        </div>
      `;
    })
    .join("");
}

function renderFunnel(steps) {
  const max = Math.max(...steps.map((step) => Number(step.value || 0)), 1);
  if (!steps.some((step) => Number(step.value || 0))) {
    return emptyState("No funnel signals", "Visits and order signals will populate this funnel.");
  }
  return steps
    .map((step) => {
      const width = Math.max(42, Math.round((Number(step.value || 0) / max) * 100));
      return `
        <div class="funnel-step" style="width:${width}%; background:${step.color}">
          <span>${escapeHtml(step.label)}</span>
          <strong>${formatNumber(step.value)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderBusinessHealth(summary) {
  const riskRatio = summary.products ? (summary.lowStock + summary.outOfStock) / summary.products : 0;
  const orderBoost = Math.min(summary.totalOrders, 20) / 20;
  const visitBoost = Math.min(summary.visits, 1000) / 1000;
  const score = Math.max(0, Math.min(100, Math.round(82 - riskRatio * 45 + orderBoost * 10 + visitBoost * 8)));
  const label = score >= 80 ? "Healthy" : score >= 60 ? "Needs Attention" : "At Risk";

  return `
    <div class="gauge"></div>
    <strong>${formatNumber(score)}</strong>
    <span>${escapeHtml(label)}</span>
  `;
}

function renderInsights(summary) {
  const insights = [];
  if (summary.lowStock) {
    insights.push({
      product: "Low stock review",
      body: `${formatNumber(summary.lowStock)} products are at or below the stock threshold.`,
      value: "Resolve",
    });
  }
  if (summary.quiet) {
    insights.push({
      product: "Visibility gap",
      body: `${formatNumber(summary.quiet)} products have no visits in the returned data.`,
      value: "Improve",
    });
  }
  if (summary.discounted) {
    insights.push({
      product: "Discount exposure",
      body: `${formatMoney(summary.discountExposure, summary.currency)} exposure across discounted SKUs.`,
      value: "Review",
    });
  }
  if (!insights.length) {
    insights.push({
      product: "Operations look calm",
      body: "No major inventory or catalog risks were found in returned data.",
      value: "Stable",
    });
  }

  return insights
    .map(
      (item) => `
        <div class="compact-row no-media">
          <span>
            <strong>${escapeHtml(item.product)}</strong>
            <small>${escapeHtml(item.body)}</small>
          </span>
          <span class="chip chip-purple">${escapeHtml(item.value)}</span>
        </div>
      `,
    )
    .join("");
}

function renderActions(mode = "low") {
  state.actionMode = mode;
  const products = state.dashboard.products.slice();
  let list = products;

  if (mode === "low") {
    list = products.filter((product) => product.quantity <= LOW_STOCK_LIMIT).sort((a, b) => a.quantity - b.quantity);
  }
  if (mode === "discount") {
    list = products.filter((product) => product.discount > 0).sort((a, b) => b.discount - a.discount);
  }
  if (mode === "top") {
    list = products.sort((a, b) => b.finalPrice * b.quantity - a.finalPrice * a.quantity).slice(0, 8);
  }

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.classList.toggle("active", button.dataset.action === mode);
  });

  els.actionOutput.innerHTML = list.length
    ? list
        .map(
          (product) => `
            <div class="compact-row no-media">
              <span class="min-w-0">
                <strong class="text-truncate">${escapeHtml(product.title)}</strong>
                <small>${escapeHtml(product.sku)} - ${escapeHtml(product.category)}</small>
              </span>
              <span class="chip ${mode === "discount" ? "chip-warning" : stockChipClass(product.quantity)}">
                ${mode === "discount" ? formatFitMoney(product.discount, product.currency, { fullDigits: 2 }) : formatFitNumber(product.quantity, { compactAt: 1000 })}
              </span>
            </div>
          `,
        )
        .join("")
    : emptyState("No items in this view", "This quick-action list is empty for the current live data.");
}

function exportCsv() {
  const headers = ["id", "title", "sku", "category", "final_price", "currency", "quantity", "visits", "status"];
  const rows = state.dashboard.products.map((product) =>
    [
      product.id,
      product.title,
      product.sku,
      product.category,
      product.finalPrice,
      product.currency,
      product.quantity,
      product.visits,
      product.status,
    ]
      .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pajulina-live-products.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function renderError(message) {
  els.apiAlerts.innerHTML = `<div class="alert" role="alert"><strong>Dashboard</strong><span>${escapeHtml(message)}</span></div>`;
  els.productRows.innerHTML = tableEmpty(8, "Dashboard request failed", message);
  if (els.customerRows) els.customerRows.innerHTML = tableEmpty(8, "Customers request failed", message);
  if (els.articleRows) els.articleRows.innerHTML = tableEmpty(7, "Blog request failed", message);
  els.orderRows.innerHTML = tableEmpty(8, "Orders request failed", message);
  notify(message);
}

function tableEmpty(colspan, title, message) {
  return `<tr><td colspan="${colspan}">${emptyState(title, message)}</td></tr>`;
}

function emptyState(title, message) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <div>${escapeHtml(message)}</div>
    </div>
  `;
}

function stockChipClass(quantity) {
  if (quantity <= 0) return "chip-danger";
  if (quantity <= LOW_STOCK_LIMIT) return "chip-warning";
  return "chip-success";
}

function statusChipClass(status) {
  const value = String(status || "").toLowerCase();
  if (/paid|payed|delivered|shipped|active|in stock|success|complete|published/.test(value)) return "chip-success";
  if (/low|pending|reserved|open|cod|draft|processing|picking|packed/.test(value)) return "chip-warning";
  if (/schedule|calendar|private/.test(value)) return "chip-purple";
  if (/out|cancel|return|fail|inactive|danger/.test(value)) return "chip-danger";
  if (/process|ship|info/.test(value)) return "chip-info";
  if (/discount|campaign|purple/.test(value)) return "chip-purple";
  return "chip-neutral";
}

function titleCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function getInitials(value) {
  return String(value || "P")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

const selldoneClient = createSelldoneDirectClient({
  requestSession: () => requestJson("/api/session"),
  onAuthExpired: (message) => beginAuthRedirect(message || "Your Selldone session expired."),
});

const customerFeature = createCustomerFeature({
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
  showView,
  selldone: selldoneClient,
});

function bindEvents() {
  els.refreshButton.addEventListener("click", loadDashboard);
  els.refreshNotificationsButton?.addEventListener("click", () => refreshNotifications());
  els.refreshNotificationsMenuButton?.addEventListener("click", () => refreshNotifications());
  els.notificationsButton?.addEventListener("click", toggleNotificationMenu);
  els.exportCsv.addEventListener("click", exportCsv);
  els.themeToggle.addEventListener("click", toggleTheme);
  els.datePreset?.addEventListener("change", updateDateRange);
  els.navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showView(link.dataset.view);
    });
  });
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.viewTab));
  });
  window.addEventListener("hashchange", () => showView(readHashView(), false));

  els.userMenuButton.addEventListener("click", toggleUserMenu);
  els.sidebarUserButton.addEventListener("click", toggleUserMenu);
  document.addEventListener("click", closeUserMenuFromOutside);
  document.addEventListener("click", closeNotificationMenuFromOutside);
  document.addEventListener("keydown", closeUserMenuOnEscape);
  document.addEventListener("keydown", closeNotificationMenuOnEscape);

  els.searchInput.addEventListener("input", renderProducts);
  els.categoryFilter.addEventListener("change", renderProducts);
  els.riskFilter.addEventListener("change", renderProducts);
  els.blogSearchInput?.addEventListener("input", renderBlog);
  els.articleStatusFilter?.addEventListener("change", renderBlog);
  els.refreshBlogButton?.addEventListener("click", () => refreshBlogPosts());
  els.newArticleButton?.addEventListener("click", () => openArticleEditor());
  els.customerSearchInput?.addEventListener("input", renderCustomers);
  els.customerLevelFilter?.addEventListener("change", renderCustomers);
  els.customerStatusFilter?.addEventListener("change", renderCustomers);
  els.refreshCustomersButton?.addEventListener("click", () => refreshCustomers());
  els.moduleSearchInput?.addEventListener("input", () => {
    state.moduleSearch = els.moduleSearchInput.value;
    renderSuite();
  });
  els.moduleFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.moduleFilter = button.dataset.moduleFilter || "all";
      els.moduleFilterButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderSuite();
    });
  });
  els.productEditForm.addEventListener("submit", submitProductEdit);
  els.productEditorClose.addEventListener("click", closeProductEditor);
  els.productEditCancel.addEventListener("click", closeProductEditor);
  els.articleEditForm?.addEventListener("submit", submitArticleEdit);
  els.articleEditorClose?.addEventListener("click", closeArticleEditor);
  els.articleEditCancel?.addEventListener("click", closeArticleEditor);
  els.customerEditForm?.addEventListener("submit", submitCustomerEdit);
  els.customerEditorClose?.addEventListener("click", closeCustomerEditor);
  els.customerEditCancel?.addEventListener("click", closeCustomerEditor);
  els.globalSearchInput.addEventListener("input", () => {
    if (state.activeView === "blog") {
      els.blogSearchInput.value = els.globalSearchInput.value;
      renderBlog();
      return;
    }
    if (state.activeView === "customers") {
      els.customerSearchInput.value = els.globalSearchInput.value;
      renderCustomers();
      return;
    }
    els.searchInput.value = els.globalSearchInput.value;
    renderProducts();
  });
  els.globalSearchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (state.activeView === "blog") {
      showView("blog");
      return;
    }
    if (state.activeView === "customers") {
      showView("customers");
      return;
    }
    showView("products");
  });

  document.addEventListener("click", (event) => {
    const articleEdit = event.target.closest("[data-article-edit]");
    if (articleEdit) {
      closeArticleMenus();
      openArticleEditor(articleEdit.dataset.articleEdit);
      return;
    }

    const articleDelete = event.target.closest("[data-article-delete]");
    if (articleDelete) {
      closeArticleMenus();
      deleteArticle(articleDelete.dataset.articleDelete);
      return;
    }

    const articleMenuButton = event.target.closest("[data-article-menu-button]");
    if (articleMenuButton) {
      event.preventDefault();
      event.stopPropagation();
      closeProductMenus();
      toggleArticleMenu(articleMenuButton);
      return;
    }

    const productEdit = event.target.closest("[data-product-edit]");
    if (productEdit) {
      closeProductMenus();
      openProductEditor(productEdit.dataset.productEdit);
      return;
    }

    const productDelete = event.target.closest("[data-product-delete]");
    if (productDelete) {
      closeProductMenus();
      deleteProduct(productDelete.dataset.productDelete);
      return;
    }

    const productMenuButton = event.target.closest("[data-product-menu-button]");
    if (productMenuButton) {
      event.preventDefault();
      event.stopPropagation();
      closeArticleMenus();
      toggleProductMenu(productMenuButton);
      return;
    }

    const customerEdit = event.target.closest("[data-customer-edit]");
    if (customerEdit) {
      openCustomerEditor(customerEdit.dataset.customerEdit);
      return;
    }

    const customerOpenButton = event.target.closest("button[data-customer-open]");
    if (customerOpenButton) {
      openCustomerDetail(customerOpenButton.dataset.customerOpen);
      return;
    }

    const customerOpen = event.target.closest("[data-customer-open]");
    if (customerOpen && !event.target.closest("button, a, input, select, textarea")) {
      openCustomerDetail(customerOpen.dataset.customerOpen);
      return;
    }

    const productOpen = event.target.closest("[data-product-open]");
    if (productOpen && !event.target.closest("button, a, input, select, textarea, [data-product-action-menu]")) {
      openProductDetail(productOpen.dataset.productOpen);
      return;
    }

    if (event.target.closest("[data-modal-close='product']")) {
      closeProductEditor();
      return;
    }

    if (event.target.closest("[data-modal-close='article']")) {
      closeArticleEditor();
      return;
    }

    if (event.target.closest("[data-modal-close='customer']")) {
      closeCustomerEditor();
      return;
    }

    const viewJump = event.target.closest("[data-view-jump]");
    if (viewJump) {
      closeNotificationMenu();
      showView(viewJump.dataset.viewJump);
      return;
    }
    const moduleFocus = event.target.closest("[data-module-focus]");
    if (moduleFocus) {
      focusModuleCard(moduleFocus.dataset.moduleFocus);
      return;
    }
    const action = event.target.closest("[data-action]");
    if (action) {
      renderActions(action.dataset.action);
    }

    if (!event.target.closest("[data-product-action-menu]")) {
      closeProductMenus();
    }
    if (!event.target.closest("[data-article-action-menu]")) {
      closeArticleMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    const productOpen = event.target.closest?.("[data-product-open]");
    const customerOpen = event.target.closest?.("[data-customer-open]");
    if (!productOpen && !customerOpen) return;
    if (!["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    if (customerOpen) {
      openCustomerDetail(customerOpen.dataset.customerOpen);
      return;
    }
    openProductDetail(productOpen.dataset.productOpen);
  });

  els.toast.querySelector(".toast-close").addEventListener("click", () => els.toast.classList.remove("show"));
}

function readHashView() {
  const view = window.location.hash.replace("#", "");
  const productMatch = view.match(/^product-(.+)$/);
  if (productMatch) {
    state.activeProductId = decodeURIComponent(productMatch[1]);
    return "productDetail";
  }
  const customerMatch = view.match(/^customer-(.+)$/);
  if (customerMatch) {
    state.activeCustomerId = decodeURIComponent(customerMatch[1]);
    return "customerDetail";
  }
  return VIEW_META[view] ? view : "overview";
}

function showView(view = "overview", updateHash = true) {
  const nextView = VIEW_META[view] ? view : "overview";
  const navigationView = nextView === "productDetail" ? "products" : nextView === "customerDetail" ? "customers" : nextView;
  state.activeView = nextView;

  els.navLinks.forEach((link) => {
    const isActive = link.dataset.view === navigationView;
    link.classList.toggle("active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });

  els.tabButtons.forEach((button) => {
    const isActive = button.dataset.viewTab === navigationView;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  els.viewPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.viewPanel === nextView);
  });

  const meta = VIEW_META[nextView];
  const name = (state.user?.name || "there").split(/\s+/)[0];
  els.pageTitle.textContent = meta.title;
  els.pageEyebrow.textContent = meta.eyebrow;
  els.pageSubtitle.textContent = meta.subtitle(name);

  if (updateHash && window.location.hash !== `#${nextView}`) {
    history.replaceState(null, "", `#${nextView}`);
  }

  if (nextView === "blog" && state.session?.authenticated && !state.dashboard.articles.length) {
    refreshBlogPosts({ silent: true });
  }
  if (nextView === "customers" && state.session?.authenticated && !state.dashboard.customers.length) {
    refreshCustomers({ silent: true });
  }
  if (
    nextView === "customerDetail" &&
    state.session?.authenticated &&
    state.activeCustomerId &&
    !findCustomer(state.activeCustomerId) &&
    state.customerDetailLoadingId !== String(state.activeCustomerId)
  ) {
    openCustomerDetail(state.activeCustomerId, false);
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  setTheme(savedTheme || "light");
}

function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}

function setTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  const label = els.themeToggle.querySelector("span");
  const icon = els.themeToggle.querySelector("i");
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.dataset.bsTheme = nextTheme;
  localStorage.setItem(THEME_KEY, nextTheme);
  if (label) label.textContent = nextTheme === "dark" ? "Light" : "Dark";
  if (icon) icon.className = `bi ${nextTheme === "dark" ? "bi-brightness-high" : "bi-moon-stars"}`;
  els.themeToggle.setAttribute("aria-pressed", String(nextTheme === "dark"));
}

function toggleUserMenu(event) {
  event.preventDefault();
  event.stopPropagation();
  closeNotificationMenu();
  const menu = els.userMenu.querySelector(".dropdown-menu");
  const isOpen = menu.classList.toggle("show");
  els.userMenu.classList.toggle("is-open", isOpen);
  els.userMenuButton.setAttribute("aria-expanded", String(isOpen));
}

function toggleNotificationMenu(event) {
  event.preventDefault();
  event.stopPropagation();
  if (!els.notificationMenu) return;

  closeUserMenu();
  const isOpen = !els.notificationMenu.classList.contains("is-open");
  els.notificationMenu.classList.toggle("is-open", isOpen);
  els.notificationsButton?.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    renderNotifications();
    refreshNotifications({ silent: true });
  }
}

function closeUserMenuFromOutside(event) {
  if (!els.userMenu.contains(event.target) && !els.sidebarUserButton.contains(event.target)) {
    closeUserMenu();
  }
}

function closeNotificationMenuFromOutside(event) {
  if (els.notificationMenu && !els.notificationMenu.contains(event.target)) {
    closeNotificationMenu();
  }
}

function closeUserMenuOnEscape(event) {
  if (event.key === "Escape") {
    closeUserMenu();
    closeProductMenus();
    closeArticleMenus();
    closeProductEditor();
    closeCustomerEditor();
    closeArticleEditor();
  }
}

function closeNotificationMenuOnEscape(event) {
  if (event.key === "Escape") {
    closeNotificationMenu();
  }
}

function closeUserMenu() {
  const menu = els.userMenu.querySelector(".dropdown-menu");
  menu.classList.remove("show");
  els.userMenu.classList.remove("is-open");
  els.userMenuButton.setAttribute("aria-expanded", "false");
}

function closeNotificationMenu() {
  els.notificationMenu?.classList.remove("is-open");
  els.notificationsButton?.setAttribute("aria-expanded", "false");
}

async function init() {
  initTheme();
  updateDateRangeLabel();
  bindEvents();
  showView(readHashView(), false);
  const authenticated = await loadSession();
  if (authenticated) {
    await loadDashboard();
  }
}

init();
