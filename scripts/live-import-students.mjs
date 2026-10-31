#!/usr/bin/env node
/**
 * Send students to the live etude-panel API.
 *
 * Credentials (never commit):
 *   scripts/.env
 *     ADMIN_API_URL=https://api.etudepianoacademy.com/api/v1
 *     ADMIN_EMAIL=...
 *     ADMIN_PASSWORD=...
 *
 * Payload JSON:
 * {
 *   "courseId": "piano",
 *   "classDays": ["سه‌شنبه"],
 *   "students": [
 *     { "firstName": "آوا", "lastName": "محمدی", "nationalId": "0012345678", "phone": "09121234567", "level": "1" }
 *   ]
 * }
 *
 * Usage:
 *   node scripts/live-import-students.mjs path/to/students.json
 *   node scripts/live-import-students.mjs --dry-run path/to/students.json
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

loadEnv(resolve(import.meta.dirname, ".env"));

const API = (process.env.ADMIN_API_URL || "https://api.etudepianoacademy.com/api/v1").replace(
  /\/$/,
  "",
);
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const PERSIAN_NAME = /^[\u0600-\u06FF\u200c\s]{2,40}$/;

const args = process.argv.slice(2).filter(Boolean);
const dryRun = args.includes("--dry-run");
const fileArg = args.find((item) => item !== "--dry-run");

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function digits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (ch) => "۰۱۲۳۴۵۶۷۸۹".indexOf(ch))
    .replace(/[٠-٩]/g, (ch) => "٠١٢٣٤٥٦٧٨٩".indexOf(ch))
    .replace(/\D/g, "");
}

function compactDay(value) {
  return String(value ?? "").replace(/‌/g, "").replace(/\s/g, "");
}

function errMsg(payload, fallback = "") {
  if (!payload || typeof payload !== "object") return fallback || String(payload);
  const message = payload.message || payload.error;
  if (Array.isArray(message)) return message.join(" | ");
  if (message && typeof message === "object") return JSON.stringify(message);
  return String(message || fallback || JSON.stringify(payload).slice(0, 200));
}

async function request(method, path, { token, body, query } = {}) {
  const url = new URL(`${API}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    }
  }
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text.slice(0, 400) };
  }
  const data = payload?.data !== undefined ? payload.data : payload;
  if (!res.ok) {
    const error = new Error(`${method} ${path} → ${res.status} ${errMsg(payload, text)}`);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }
  return data;
}

function unwrapUsers(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return data.users || [];
  return [];
}

async function findUser(token, { nationalId, firstName, lastName }) {
  const queries = [nationalId, firstName].filter(Boolean);
  for (const search of queries) {
    const data = await request("GET", "/users", {
      token,
      query: { role: "STUDENT", search, limit: 50, page: 1 },
    });
    for (const user of unwrapUsers(data)) {
      const sameId = nationalId && digits(user.nationalId) === nationalId;
      const sameName =
        String(user.firstName || "").trim() === firstName &&
        String(user.lastName || "").trim() === lastName;
      if (sameId || sameName) return user;
    }
  }
  return null;
}

if (!fileArg) {
  console.error("Usage: node scripts/live-import-students.mjs [--dry-run] students.json");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(resolve(fileArg), "utf8"));
const courseId = String(payload.courseId || "").trim();
const classDays = Array.isArray(payload.classDays) ? payload.classDays.filter(Boolean) : [];
const students = Array.isArray(payload.students) ? payload.students : [];

if (!courseId) {
  console.error("courseId is required, e.g. piano");
  process.exit(1);
}
if (students.length === 0) {
  console.error("students[] is empty");
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      api: API,
      dryRun,
      courseId,
      classDays,
      count: students.length,
    },
    null,
    2,
  ),
);

if (dryRun) {
  for (const row of students) {
    const name = `${row.firstName || ""} ${row.lastName || ""}`.trim();
    console.log(`DRY ${name} nid_len=${digits(row.nationalId).length} phone_len=${digits(row.phone).length}`);
  }
  process.exit(0);
}

if (!EMAIL || !PASSWORD) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required in scripts/.env");
  process.exit(1);
}

const session = await request("POST", "/auth/admin/login", {
  body: { email: EMAIL, password: PASSWORD },
});
const token = session.accessToken;
if (!token) {
  console.error("Admin login did not return an access token.");
  process.exit(1);
}
console.log("LOGIN_OK");

const summary = { created: 0, existed: 0, enrolled: 0, daysUpdated: 0, failed: 0 };

for (const row of students) {
  const firstName = String(row.firstName || "").trim();
  const lastName = String(row.lastName || "").trim();
  const nationalId = digits(row.nationalId);
  const phone = digits(row.phone);
  const name = `${firstName} ${lastName}`.trim();
  const label = name || `nid_len=${nationalId.length}`;

  try {
    if (!PERSIAN_NAME.test(firstName) || !PERSIAN_NAME.test(lastName)) {
      throw new Error("invalid_name");
    }
    if (nationalId.length < 8 || nationalId.length > 16) {
      throw new Error(`invalid_nid_len_${nationalId.length}`);
    }

    let user = await findUser(token, { nationalId, firstName, lastName });
    if (user) {
      summary.existed += 1;
      console.log("EXISTS", label);
    } else {
      try {
        user = await request("POST", "/auth/register/student", {
          token,
          body: {
            firstName,
            lastName,
            nationalId,
            level: String(row.level || "1"),
          },
        });
        summary.created += 1;
        console.log("CREATED", label);
      } catch (error) {
        if (error.status !== 409) throw error;
        user = await findUser(token, { nationalId, firstName, lastName });
        if (!user) throw error;
        summary.existed += 1;
        console.log("EXISTS", label);
      }
    }

    if (phone.length >= 10 && phone.length <= 12 && digits(user.phone) !== phone) {
      try {
        user = await request("PATCH", `/users/${user.id}`, {
          token,
          body: { phone },
        });
      } catch (error) {
        if (error.status !== 409) throw error;
        console.log("PHONE_SKIP", label);
      }
    }

    try {
      await request("POST", `/users/${user.id}/enrollments`, {
        token,
        body: { courseId, classDays },
      });
      summary.enrolled += 1;
      console.log("ENROLLED", label);
    } catch (error) {
      if (error.status !== 409) throw error;
      if (classDays.length > 0) {
        const detail = await request("GET", `/users/${user.id}`, { token });
        const enrollment = (detail.enrollments || []).find((item) => {
          const course = item.course || {};
          return [course.id, course.slug, course.uuid, item.courseId].includes(courseId);
        });
        const currentDays = enrollment?.classDays || [];
        const merged = [...currentDays];
        for (const day of classDays) {
          if (!merged.some((item) => compactDay(item) === compactDay(day))) {
            merged.push(day);
          }
        }
        await request("PATCH", `/users/${user.id}/enrollments/${encodeURIComponent(courseId)}`, {
          token,
          body: { classDays: merged },
        });
        summary.daysUpdated += 1;
        console.log("DAYS_UPDATED", label);
      } else {
        summary.enrolled += 1;
        console.log("ALREADY_ENROLLED", label);
      }
    }
  } catch (error) {
    summary.failed += 1;
    console.log("FAIL", label, error instanceof Error ? error.message : error);
  }
}

console.log("SUMMARY", JSON.stringify(summary));
