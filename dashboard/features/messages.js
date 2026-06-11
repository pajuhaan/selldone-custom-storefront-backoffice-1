export function createMessagesFeature(deps) {
  const {
    state,
    els,
    formatNumber,
    formatDate,
    getInitials,
    escapeHtml,
    escapeAttribute,
    emptyState,
    notify,
    selldone,
  } = deps;

  function normalizeContacts(contacts) {
    return Array.isArray(contacts) ? contacts.map(normalizeContact).filter((contact) => contact.id) : [];
  }

  function normalizeContact(contact = {}) {
    const messages = Array.isArray(contact.messages) ? contact.messages : [];
    const lastMessage = normalizeMessage(messages[messages.length - 1] || {});
    const name = firstText(contact.name, contact.user?.name, contact.customer?.name, contact.email, contact.phone, "Guest customer");
    const updatedAt = firstText(contact.updated_at, contact.notify_at, lastMessage.createdAt, contact.created_at);

    return {
      id: contact.id ?? contact.contact_id,
      name,
      email: firstText(contact.email, contact.user?.email, contact.customer?.email, ""),
      phone: firstText(contact.phone, contact.user?.phone, contact.customer?.phone, ""),
      category: firstText(contact.category, "General"),
      waiting: readBoolean(contact.waiting),
      closed: readBoolean(contact.closed),
      rate: Number(contact.rate || 0),
      url: firstText(contact.url, ""),
      messages: messages.map(normalizeMessage),
      lastMessage,
      createdAt: firstText(contact.created_at, ""),
      updatedAt,
      raw: contact,
    };
  }

  function normalizeMessage(message = {}) {
    if (typeof message === "string") {
      return { body: message, officer: false, createdAt: "" };
    }
    return {
      body: firstText(message.message, message.body, message.text, message.content, message.description, ""),
      officer: readBoolean(message.officer, message.admin, message.staff),
      createdAt: firstText(message.created_at, message.date, message.at, ""),
      link: firstText(message.link, message.url, ""),
      raw: message,
    };
  }

  function renderMessages() {
    if (!els.messagesButton || !els.messageDropdownList) return;
    const contacts = state.dashboard.contacts || [];
    const waitingCount = contacts.filter((contact) => contact.waiting && !contact.closed).length;
    const badgeCount = waitingCount || state.dashboard.contactTotal || contacts.length;

    if (els.messageBadge) {
      els.messageBadge.textContent = formatNumber(badgeCount);
      els.messageBadge.classList.toggle("is-empty", !badgeCount);
    }

    els.messageDropdownList.innerHTML = contacts.length
      ? contacts.slice(0, 10).map(renderMessageItem).join("")
      : emptyState("No customer messages", "Selldone returned no contact tickets for this shop.");
  }

  function renderMessageItem(contact) {
    const status = contact.closed ? "Closed" : contact.waiting ? "Waiting" : "Open";
    const message = contact.lastMessage?.body || "No message body returned.";
    const meta = [contact.email, contact.phone].filter(Boolean).join(" - ");
    return `
      <button class="message-item" type="button" data-contact-id="${escapeAttribute(contact.id)}">
        <span class="message-avatar">${escapeHtml(getInitials(contact.name).slice(0, 2) || "C")}</span>
        <span class="message-body min-w-0">
          <span class="message-title-line">
            <strong class="text-truncate">${escapeHtml(contact.name)}</strong>
            <span class="chip ${contact.closed ? "chip-neutral" : contact.waiting ? "chip-warning" : "chip-success"}">${escapeHtml(status)}</span>
          </span>
          <span class="message-preview text-truncate">${escapeHtml(message)}</span>
          <span class="message-meta text-truncate">
            ${escapeHtml(meta || contact.category)}
            ${contact.updatedAt ? ` - ${escapeHtml(formatDate(contact.updatedAt))}` : ""}
          </span>
        </span>
      </button>
    `;
  }

  async function refreshMessages({ silent = false } = {}) {
    setMessageLoading(true);
    try {
      const payload = await selldone.contacts({ offset: 0, limit: 20, sortBy: "updated_at", sortDesc: "true" });
      state.dashboard.contacts = normalizeContacts(payload.contacts || payload.data || payload.items || []);
      state.dashboard.contactTotal = Number(payload.total || state.dashboard.contacts.length || 0);
      state.dashboard.errors = (state.dashboard.errors || []).filter((error) => error?.label !== "Contacts");
      renderMessages();
      if (!silent) notify(`Loaded ${formatNumber(state.dashboard.contacts.length)} customer messages`);
    } catch (error) {
      state.dashboard.errors = [
        ...(state.dashboard.errors || []).filter((item) => item?.label !== "Contacts"),
        { label: "Contacts", status: error.status || 503, code: error.code || "contacts_failed", message: formatContactError(error.message) },
      ];
      if (els.messageDropdownList) {
        els.messageDropdownList.innerHTML = emptyState("Messages unavailable", formatContactError(error.message));
      }
      notify(formatContactError(error.message));
    } finally {
      setMessageLoading(false);
    }
  }

  function toggleMessageMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    closeNotificationMenu?.();
    closeUserMenu?.();
    const isOpen = !els.messageMenu.classList.contains("is-open");
    els.messageMenu.classList.toggle("is-open", isOpen);
    els.messagesButton.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) refreshMessages({ silent: true });
  }

  function closeMessageMenuFromOutside(event) {
    if (els.messageMenu && !els.messageMenu.contains(event.target)) closeMessageMenu();
  }

  function closeMessageMenuOnEscape(event) {
    if (event.key === "Escape") closeMessageMenu();
  }

  function closeMessageMenu() {
    els.messageMenu?.classList.remove("is-open");
    els.messagesButton?.setAttribute("aria-expanded", "false");
  }

  function setMessageLoading(isLoading) {
    if (els.refreshMessagesMenuButton) els.refreshMessagesMenuButton.disabled = isLoading;
    if (els.messageDropdownList && isLoading && !state.dashboard.contacts?.length) {
      els.messageDropdownList.innerHTML = emptyState("Loading messages", "Fetching contact tickets from Selldone.");
    }
  }

  function formatContactError(message) {
    if (/scope|permission|403|forbidden|access/i.test(message || "")) {
      return "Reconnect with consent to grant support ticket access.";
    }
    if (/google2fa/i.test(message || "")) {
      return "Selldone requires Google 2FA verification for support tickets.";
    }
    return message || "Customer messages could not be loaded.";
  }

  function readBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") return /^(true|1|yes|on|open|waiting)$/i.test(value);
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

  const closeNotificationMenu = deps.closeNotificationMenu;
  const closeUserMenu = deps.closeUserMenu;

  return {
    normalizeContacts,
    renderMessages,
    refreshMessages,
    toggleMessageMenu,
    closeMessageMenu,
    closeMessageMenuFromOutside,
    closeMessageMenuOnEscape,
  };
}
