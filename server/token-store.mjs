import { existsSync, unlinkSync } from "node:fs";
import { TOKEN_STORE } from "./config.mjs";

let storedTokens = null;

export function loadStoredTokens() {
  return null;
}

export function getStoredTokens() {
  return null;
}

export function cloneTokens(tokens) {
  return tokens ? { ...tokens } : null;
}

export function saveStoredTokens(tokens) {
  storedTokens = null;
  clearStoredTokens();
}

export function clearStoredTokens() {
  storedTokens = null;
  try {
    if (existsSync(TOKEN_STORE)) unlinkSync(TOKEN_STORE);
  } catch (error) {
    console.error(JSON.stringify({ level: "warn", source: "token_store", message: error.message }));
  }
}
