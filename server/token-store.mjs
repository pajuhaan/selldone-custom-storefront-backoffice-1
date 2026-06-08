import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { CLIENT_ID, SHOP_ID, AUTH_DIR, TOKEN_STORE } from "./config.mjs";

let storedTokens = loadStoredTokens();

export function loadStoredTokens() {
  try {
    if (!existsSync(TOKEN_STORE)) return null;
    const payload = JSON.parse(readFileSync(TOKEN_STORE, "utf8"));
    return payload?.tokens?.access_token ? payload.tokens : null;
  } catch (error) {
    console.error(JSON.stringify({ level: "warn", source: "token_store", message: error.message }));
    return null;
  }
}

export function getStoredTokens() {
  return storedTokens;
}

export function cloneTokens(tokens) {
  return tokens ? { ...tokens } : null;
}

export function saveStoredTokens(tokens) {
  mkdirSync(AUTH_DIR, { recursive: true });
  storedTokens = tokens;
  writeFileSync(
    TOKEN_STORE,
    JSON.stringify(
      {
        saved_at: new Date().toISOString(),
        shop_id: SHOP_ID,
        client_id: CLIENT_ID,
        tokens,
      },
      null,
      2,
    ),
  );
}

export function clearStoredTokens() {
  storedTokens = null;
  try {
    if (existsSync(TOKEN_STORE)) unlinkSync(TOKEN_STORE);
  } catch (error) {
    console.error(JSON.stringify({ level: "warn", source: "token_store", message: error.message }));
  }
}
