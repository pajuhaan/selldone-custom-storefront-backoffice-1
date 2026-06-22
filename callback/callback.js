import { dashboardAuth, handleCallback, storefrontAuth } from "/shared/auth-client.js";

const message = document.getElementById("message");
const actions = document.getElementById("actions");

try {
  const result = await handleCallback();
  window.location.replace(result.next || (result.context === "storefront" ? "/" : "/dashboard/#overview"));
} catch (error) {
  const text = error?.message || "Could not complete OAuth sign in.";
  if (message) {
    message.textContent = text.includes("state")
      ? "This sign-in session expired or was opened in a different tab. Start sign-in again."
      : text;
  }
  if (actions) {
    actions.hidden = false;
    actions.querySelector("[data-login-storefront]")?.addEventListener("click", async () => {
      window.location.assign(await storefrontAuth.buildLoginUrl("/"));
    });
    actions.querySelector("[data-login-dashboard]")?.addEventListener("click", async () => {
      window.location.assign(await dashboardAuth.buildLoginUrl("/dashboard/#overview"));
    });
  }
}
