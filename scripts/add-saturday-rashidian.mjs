#!/usr/bin/env node
/**
 * Add Saturday to Babak Rashidian's live piano course, then enroll
 * the Saturday roster onto that day.
 *
 *   node scripts/add-saturday-rashidian.mjs
 *   node scripts/add-saturday-rashidian.mjs /tmp/etude-xls/shanbe-students.json
 *   node scripts/add-saturday-rashidian.mjs --dry-run
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
const SATURDAY = "شنبه";
const PERSIAN_NAME = /^[\u0600-\u06FF\u200c\s]{2,40}$/;
const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

const args = process.argv.slice(2).filter(Boolean);
const dryRun = args.includes("--dry-run");
const fileArg =
  args.find((item) => item !== "--dry-run") || "/tmp/etude-xls/shanbe-students.json";

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

function normalizeDay(value) {
  const compact = compactDay(value);
  return WEEKDAYS.find((day) => compactDay(day) === compact) ?? String(value ?? "").trim();
}

function mergeDays(current, extra) {
  const unique = new Set();
  for (const item of [...(current || []), ...(extra || [])]) {
    const day = normalizeDay(item);
    if (WEEKDAYS.includes(day)) unique.add(day);
  }
  return WEEKDAYS.filter((day) => unique.has(day));
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

function unwrapList(data, key) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return data[key] || data.users || [];
  return [];
}

function coursePatchBody(course, days) {
  return {
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    instrument: course.instrument,
    teacher: course.teacher,
    teacherShort: course.teacherShort,
    day: days.join("، "),
    days,
    time: course.time,
    timeShort: course.timeShort,
    duration: course.duration,
    room: course.room,
    level: course.level,
    focus: course.focus,
    sessionsTotal: course.sessionsTotal,
    weeklyHours: course.weeklyHours,
    status: course.status,
    certificateReady: course.certificateReady,
    accessNote: course.accessNote,
    isActive: course.isActive,
    sortOrder: course.sortOrder,
    teacherId: course.teacherId,
  };
}

async function findUser(token, { nationalId, firstName, lastName }) {
  const queries = [nationalId, firstName, `${firstName} ${lastName}`].filter(Boolean);
  for (const role of ["STUDENT", ""]) {
    for (const search of queries) {
      const data = await request("GET", "/users", {
        token,
        query: {
          ...(role ? { role } : {}),
          search,
          limit: 50,
          page: 1,
        },
      });
      for (const user of unwrapList(data, "users")) {
        const sameId = nationalId && digits(user.nationalId) === nationalId;
        const sameName =
          String(user.firstName || "").trim() === firstName &&
          String(user.lastName || "").trim() === lastName;
        if (sameId || sameName) return user;
      }
    }
  }
  return null;
}

if (!existsSync(fileArg)) {
  console.error(`Student file not found: ${fileArg}`);
  process.exit(1);
}

const payload = JSON.parse(readFileSync(resolve(fileArg), "utf8"));
const students = Array.isArray(payload.students) ? payload.students : [];
if (students.length === 0) {
  console.error("students[] is empty");
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      api: API,
      dryRun,
      file: fileArg,
      saturday: SATURDAY,
      count: students.length,
    },
    null,
    2,
  ),
);

if (dryRun) {
  for (const row of students) {
    console.log(`DRY ${String(row.firstName || "").trim()} ${String(row.lastName || "").trim()}`);
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

const listed = await request("GET", "/admin/courses", { token, query: { limit: 100 } });
const courses = unwrapList(listed, "courses").filter((course) => {
  const teacher = `${course.teacher || ""} ${course.title || ""}`;
  return teacher.includes("رشیدیان");
});
if (courses.length === 0) {
  console.error("No Rashidian course found on live API.");
  process.exit(1);
}

const updatedCourses = [];
for (const summary of courses) {
  const course = await request("GET", `/admin/courses/${summary.id}`, { token });
  const nextDays = mergeDays(course.days, [course.day, SATURDAY]);
  const already = (course.days || []).some((day) => compactDay(day) === compactDay(SATURDAY));
  console.log(
    JSON.stringify(
      {
        course: course.title,
        slug: course.slug,
        before: course.days,
        after: nextDays,
      },
      null,
      2,
    ),
  );
  if (already) {
    console.log("DAYS_OK", course.title);
    updatedCourses.push({ ...course, days: nextDays });
    continue;
  }
  try {
    const saved = await request("PATCH", `/admin/courses/${course.id}`, {
      token,
      body: coursePatchBody(course, nextDays),
    });
    console.log("DAYS_ADDED", saved.title || course.title, saved.days || nextDays);
    updatedCourses.push({ ...course, ...saved, days: saved.days || nextDays });
  } catch (error) {
    console.error("DAYS_BLOCKED", course.title, error instanceof Error ? error.message : error);
    throw new Error(
      "Live API rejected adding Saturday. Course.day is still VARCHAR(32); 5 weekdays do not fit until the server pulls main and migrates.",
    );
  }
}

const courseId = updatedCourses[0]?.slug || updatedCourses[0]?.id;
const classDays = [SATURDAY];
const summary = { created: 0, existed: 0, enrolled: 0, daysUpdated: 0, failed: 0 };

for (const row of students) {
  const firstName = String(row.firstName || "").trim();
  const lastName = String(row.lastName || "").trim();
  const nationalId = digits(row.nationalId).slice(0, 10);
  const phone = digits(row.phone);
  const name = `${firstName} ${lastName}`.trim();

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
      console.log("EXISTS", name, user.role || "STUDENT");
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
        console.log("CREATED", name);
      } catch (error) {
        if (error.status !== 409) throw error;
        user = await findUser(token, { nationalId, firstName, lastName });
        if (!user) throw error;
        summary.existed += 1;
        console.log("EXISTS", name, user.role || "STUDENT");
      }
    }

    if (user.role && user.role !== "STUDENT") {
      throw new Error(`not_student_role_${user.role}`);
    }

    if (phone.length >= 10 && phone.length <= 12 && digits(user.phone) !== phone) {
      try {
        user = await request("PATCH", `/users/${user.id}`, {
          token,
          body: { phone },
        });
      } catch (error) {
        if (error.status !== 409) throw error;
        console.log("PHONE_SKIP", name);
      }
    }

    try {
      await request("POST", `/users/${user.id}/enrollments`, {
        token,
        body: { courseId, classDays },
      });
      summary.enrolled += 1;
      console.log("ENROLLED", name);
    } catch (error) {
      if (error.status !== 409) throw error;
      const detail = await request("GET", `/users/${user.id}`, { token });
      const enrollment = (detail.enrollments || []).find((item) => {
        const course = item.course || {};
        return [course.id, course.slug, course.uuid, item.courseId].includes(courseId);
      });
      const currentDays = enrollment?.classDays || [];
      const merged = mergeDays(currentDays, classDays);
      await request("PATCH", `/users/${user.id}/enrollments/${encodeURIComponent(courseId)}`, {
        token,
        body: { classDays: merged },
      });
      summary.daysUpdated += 1;
      console.log("DAYS_UPDATED", name);
    }
  } catch (error) {
    summary.failed += 1;
    console.log("FAIL", name, error instanceof Error ? error.message : error);
  }
}

const verify = await request("GET", `/admin/courses/${updatedCourses[0].id}`, { token });
const saturdayNames = (verify.enrollments || [])
  .filter((item) => (item.classDays || []).some((day) => compactDay(day) === compactDay(SATURDAY)))
  .map((item) => {
    const user = item.user || {};
    return `${user.firstName || ""} ${user.lastName || ""}`.trim();
  });

console.log(
  "VERIFY",
  JSON.stringify(
    {
      course: verify.title,
      days: verify.days,
      saturdayEnrolled: saturdayNames.length,
      names: saturdayNames,
    },
    null,
    2,
  ),
);
console.log("SUMMARY", JSON.stringify(summary));
if (summary.failed > 0 || saturdayNames.length !== students.length) {
  process.exit(1);
}
