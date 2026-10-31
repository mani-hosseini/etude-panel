#!/usr/bin/env node
/**
 * Live admin API helper for etude-panel.
 *
 * Credentials (never commit these):
 *   export ADMIN_API_URL=https://api.etudepianoacademy.com/api/v1
 *   export ADMIN_EMAIL='...'
 *   export ADMIN_PASSWORD='...'
 *
 * Usage:
 *   node scripts/admin-api.mjs ping
 *   node scripts/admin-api.mjs me
 *   node scripts/admin-api.mjs get /admin/users
 *   node scripts/admin-api.mjs get /admin/courses
 *   node scripts/admin-api.mjs get /admin/courses/theory-basics
 *   node scripts/admin-api.mjs post /admin/users '{"firstName":"..."}'
 *   node scripts/admin-api.mjs patch /admin/sessions/UUID '{"status":"AVAILABLE"}'
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

loadEnv(resolve(import.meta.dirname, ".env"));

const API = (process.env.ADMIN_API_URL || "https://api.etudepianoacademy.com/api/v1").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path.startsWith("/") ? path : `/${path}`}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const message = json?.message || json?.error || text || res.statusText;
    throw new Error(`${method} ${path} → ${res.status} ${typeof message === "string" ? message : JSON.stringify(message)}`);
  }
  return json?.data !== undefined ? json.data : json;
}

async function login() {
  if (!EMAIL || !PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
  }
  const data = await request("/auth/admin/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });
  if (!data?.accessToken) {
    throw new Error("Admin login did not return an access token.");
  }
  return data;
}

const [command = "help", ...args] = process.argv.slice(2);

try {
  if (command === "ping") {
    const health = await request("/health");
    console.log(JSON.stringify({ api: API, health }, null, 2));
    process.exit(0);
  }

  if (command === "help" || command === "-h") {
    console.log(`Admin API: ${API}
Commands:
  ping
  me
  get <path>
  post <path> <json>
  patch <path> <json>
  delete <path>`);
    process.exit(0);
  }

  const session = await login();
  const token = session.accessToken;

  if (command === "me") {
    const me = await request("/auth/me", { token });
    console.log(JSON.stringify({ api: API, user: me }, null, 2));
    process.exit(0);
  }

  const method = command.toUpperCase();
  if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    throw new Error(`Unknown command: ${command}`);
  }
  const path = args[0];
  if (!path) throw new Error("Path is required, e.g. /admin/users");
  const body = args[1] ? JSON.parse(args[1]) : undefined;
  const data = await request(path, { method, body, token });
  console.log(JSON.stringify(data, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
