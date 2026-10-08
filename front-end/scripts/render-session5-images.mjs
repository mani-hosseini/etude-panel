#!/usr/bin/env node
/**
 * Renders session-5 educational PNGs.
 * Keyboard slides reuse the SAME keyboard-base.png so key spacing never changes.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "../public/session_5");
const tmpDir = join(root, ".session5-html");
const kb = join(root, "keyboard-base.png");
const fontBold = join(root, "fonts/Vazirmatn-Bold.ttf");
const fontReg = existsSync(join(root, "fonts/Vazirmatn-Regular.ttf"))
  ? join(root, "fonts/Vazirmatn-Regular.ttf")
  : fontBold;

mkdirSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const W = 1536;
const H = 1024;
const CYAN = "#00BFFF";

/** White-key front faces — measured on keyboard-base.png */
const WHITE = {
  C: { x: 185, w: 146, cx: 258 },
  D: { x: 338, w: 144, cx: 410 },
  E: { x: 489, w: 139, cx: 558 },
  F: { x: 635, w: 130, cx: 700 },
  G: { x: 772, w: 134, cx: 839 },
  A: { x: 914, w: 147, cx: 987 },
  B: { x: 1069, w: 165, cx: 1151 },
  C2: { x: 1241, w: 115, cx: 1298 },
};

/** Black keys — measured on keyboard-base.png */
const BLACK = {
  Cs: { x: 296, w: 72, cx: 332 },
  Ds: { x: 471, w: 68, cx: 505 },
  Fs: { x: 705, w: 70, cx: 740 },
  Gs: { x: 868, w: 72, cx: 904 },
  As: { x: 1038, w: 72, cx: 1074 },
};

/** Only the white-key front face — never cover black keys. */
const WHITE_TOP = 518;
const WHITE_H = 128;
const BLACK_TOP = 312;
const BLACK_H = 198;
const ARCH_Y = 248;

function cx(id) {
  return WHITE[id]?.cx ?? BLACK[id]?.cx;
}

function glowWhite(id) {
  const k = WHITE[id];
  return `<div class="glow-w" style="left:${k.x}px;width:${k.w}px;top:${WHITE_TOP}px;height:${WHITE_H}px"></div>`;
}

function glowBlack(id) {
  const k = BLACK[id];
  return `<div class="glow-b" style="left:${k.x}px;width:${k.w}px;top:${BLACK_TOP}px;height:${BLACK_H}px"></div>`;
}

function archPath(id1, id2, rise = 44) {
  const x1 = cx(id1);
  const x2 = cx(id2);
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${ARCH_Y} Q ${mx} ${ARCH_Y - rise} ${x2} ${ARCH_Y}`;
}

function arrowPair(id1, id2, label, rise = 44) {
  const x1 = cx(id1);
  const x2 = cx(id2);
  const mx = (x1 + x2) / 2;
  const ly = ARCH_Y - rise - 18;
  return `
    <path d="${archPath(id1, id2, rise)}" fill="none" stroke="${CYAN}" stroke-width="3.2" marker-start="url(#arr)" marker-end="url(#arr)" />
    <text x="${mx}" y="${ly}" text-anchor="middle" fill="${CYAN}" font-size="22" font-family="Vazir, sans-serif">${label}</text>
  `;
}

function kbFrame({ title, glows, arrows, caption, note }) {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
@font-face { font-family: Vazir; src: url("file://${fontReg}") format("truetype"); font-weight: 400; }
@font-face { font-family: Vazir; src: url("file://${fontBold}") format("truetype"); font-weight: 700; }
html, body { margin: 0; width: ${W}px; height: ${H}px; background: #000; overflow: hidden; font-family: Vazir, sans-serif; }
.stage { position: relative; width: ${W}px; height: ${H}px; background: #000; }
.kb { position: absolute; inset: 0; width: ${W}px; height: ${H}px; display: block; z-index: 0; }
.title {
  position: absolute; top: 36px; left: 0; right: 0; text-align: center;
  color: ${CYAN}; font-weight: 700; font-size: 44px; letter-spacing: 0.02em;
  text-decoration: underline; text-underline-offset: 10px; text-decoration-thickness: 3px;
  z-index: 4;
}
.glow-w {
  position: absolute; pointer-events: none; border-radius: 0 0 10px 10px; z-index: 1;
  background: linear-gradient(to bottom, rgba(0,191,255,0.12) 0%, rgba(0,191,255,0.42) 70%, rgba(0,191,255,0.62) 100%);
  box-shadow: inset 0 0 28px rgba(0,229,255,0.55), 0 0 18px rgba(0,191,255,0.35);
  mix-blend-mode: screen;
}
.glow-b {
  position: absolute; pointer-events: none; border-radius: 4px; z-index: 1;
  background: rgba(0,191,255,0.28);
  box-shadow: inset 0 0 16px rgba(0,229,255,0.7), 0 0 14px rgba(0,191,255,0.55);
  mix-blend-mode: screen;
}
svg.arrows { position: absolute; inset: 0; width: ${W}px; height: ${H}px; pointer-events: none; z-index: 3; }
.caption {
  position: absolute; bottom: 78px; left: 50%; transform: translateX(-50%);
  border: 2.5px solid ${CYAN}; border-radius: 18px; padding: 10px 28px;
  color: #fff; font-size: 26px; font-weight: 700; white-space: nowrap;
  z-index: 4;
}
.note {
  position: absolute; bottom: 28px; right: 56px; color: ${CYAN};
  font-size: 24px; font-weight: 700; direction: rtl; z-index: 4;
}
</style>
</head>
<body>
<div class="stage">
  <img class="kb" src="file://${kb}" alt="" />
  ${glows}
  <div class="title">${title}</div>
  <svg class="arrows" viewBox="0 0 ${W} ${H}">
    <defs>
      <marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <circle cx="4" cy="4" r="2.4" fill="${CYAN}" />
      </marker>
    </defs>
    ${arrows}
  </svg>
  ${caption ? `<div class="caption">${caption}</div>` : ""}
  ${note ? `<div class="note">${note}</div>` : ""}
</div>
</body>
</html>`;
}

function diagramFrame(inner) {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
@font-face { font-family: Vazir; src: url("file://${fontReg}") format("truetype"); font-weight: 400; }
@font-face { font-family: Vazir; src: url("file://${fontBold}") format("truetype"); font-weight: 700; }
html, body { margin: 0; width: ${W}px; height: ${H}px; background: #000; overflow: hidden; font-family: Vazir, sans-serif; color: #fff; }
.stage { width: ${W}px; height: ${H}px; padding: 48px 64px; box-sizing: border-box; }
h1 { margin: 0 0 36px; text-align: center; color: ${CYAN}; font-size: 42px;
  text-decoration: underline; text-underline-offset: 10px; text-decoration-thickness: 3px; }
.row { display: flex; gap: 28px; justify-content: center; }
.card {
  flex: 1; max-width: 420px; border: 2px solid ${CYAN}; border-radius: 22px;
  padding: 28px 22px; text-align: center; background: rgba(0,191,255,0.06);
}
.card h2 { margin: 0 0 12px; color: ${CYAN}; font-size: 30px; }
.card p { margin: 0; font-size: 22px; line-height: 1.7; color: #e8f7ff; }
.sub { margin-top: 22px; display: flex; flex-direction: column; gap: 10px; }
.pill { border: 1.5px solid ${CYAN}; border-radius: 14px; padding: 10px 14px; font-size: 20px; color: #dff6ff; }
.table { width: 100%; border-collapse: collapse; font-size: 24px; }
.table th { color: ${CYAN}; text-align: right; padding: 14px 16px; border-bottom: 2px solid ${CYAN}; }
.table td { padding: 13px 16px; border-bottom: 1px solid rgba(0,191,255,0.25); }
.table tr:nth-child(even) td { background: rgba(0,191,255,0.05); }
.formula { font-size: 26px; color: ${CYAN}; font-weight: 700; letter-spacing: 0.04em; }
.muted { color: #b9d7ea; font-size: 20px; }
</style>
</head>
<body><div class="stage">${inner}</div></body>
</html>`;
}

const pages = {
  "scale-types": diagramFrame(`
    <h1>انواع گام‌های موسیقی</h1>
    <div class="row">
      <div class="card">
        <h2>کروماتیک</h2>
        <p>۱۲ نیم‌پرده پشت‌سرهم<br/>از دو تا دوِ بعدی</p>
      </div>
      <div class="card">
        <h2>ماژور</h2>
        <p>گام بزرگ<br/>فرمول: پرده پرده نیم‌پرده<br/>پرده پرده پرده نیم‌پرده</p>
      </div>
      <div class="card">
        <h2>مینور</h2>
        <p>گام کوچک · سه گونه</p>
        <div class="sub">
          <div class="pill">تئوریک / طبیعی</div>
          <div class="pill">هارمونیک</div>
          <div class="pill">ملودیک</div>
        </div>
      </div>
    </div>
  `),

  chromatic: kbFrame({
    title: "گام کروماتیک",
    glows: [
      ...["C", "D", "E", "F", "G", "A", "B", "C2"].map(glowWhite),
      ...["Cs", "Ds", "Fs", "Gs", "As"].map(glowBlack),
    ].join(""),
    arrows: [
      arrowPair("C", "Cs", "½", 34),
      arrowPair("Cs", "D", "½", 50),
      arrowPair("D", "Ds", "½", 34),
      arrowPair("Ds", "E", "½", 50),
      arrowPair("E", "F", "½", 34),
      arrowPair("F", "Fs", "½", 50),
      arrowPair("Fs", "G", "½", 34),
      arrowPair("G", "Gs", "½", 50),
      arrowPair("Gs", "A", "½", 34),
      arrowPair("A", "As", "½", 50),
      arrowPair("As", "B", "½", 34),
      arrowPair("B", "C2", "½", 50),
    ].join(""),
    caption: "هر پله = نیم‌پرده  ·  ۱۲ نیم‌پرده در یک اکتاو",
    note: "گام کروماتیک = همهٔ کلاویه‌ها پشت‌سرهم",
  }),

  major: kbFrame({
    title: "گام دو ماژور",
    glows: ["C", "D", "E", "F", "G", "A", "B", "C2"].map(glowWhite).join(""),
    arrows: [
      arrowPair("C", "D", "پرده", 48),
      arrowPair("D", "E", "پرده", 48),
      arrowPair("E", "F", "نیم‌پرده", 36),
      arrowPair("F", "G", "پرده", 48),
      arrowPair("G", "A", "پرده", 48),
      arrowPair("A", "B", "پرده", 48),
      arrowPair("B", "C2", "نیم‌پرده", 36),
    ].join(""),
    caption: "فرمول ماژور: پرده · پرده · نیم‌پرده · پرده · پرده · پرده · نیم‌پرده",
    note: "دو ماژور = همهٔ کلاویه‌های سفید",
  }),

  "minor-natural": kbFrame({
    title: "گام دو مینور تئوریک",
    glows: [
      glowWhite("C"),
      glowWhite("D"),
      glowBlack("Ds"),
      glowWhite("F"),
      glowWhite("G"),
      glowBlack("Gs"),
      glowBlack("As"),
      glowWhite("C2"),
    ].join(""),
    arrows: [
      arrowPair("C", "D", "پرده", 48),
      arrowPair("D", "Ds", "نیم‌پرده", 36),
      arrowPair("Ds", "F", "پرده", 48),
      arrowPair("F", "G", "پرده", 48),
      arrowPair("G", "Gs", "نیم‌پرده", 36),
      arrowPair("Gs", "As", "پرده", 48),
      arrowPair("As", "C2", "پرده", 48),
    ].join(""),
    caption: "فرمول تئوریک: پرده · نیم‌پرده · پرده · پرده · نیم‌پرده · پرده · پرده",
    note: "درجات ۳ و ۶ و ۷ نسبت به ماژور نیم‌پرده پایین‌ترند",
  }),

  "minor-harmonic": kbFrame({
    title: "گام دو مینور هارمونیک",
    glows: [
      glowWhite("C"),
      glowWhite("D"),
      glowBlack("Ds"),
      glowWhite("F"),
      glowWhite("G"),
      glowBlack("Gs"),
      glowWhite("B"),
      glowWhite("C2"),
    ].join(""),
    arrows: [
      arrowPair("C", "D", "پرده", 48),
      arrowPair("D", "Ds", "نیم‌پرده", 36),
      arrowPair("Ds", "F", "پرده", 48),
      arrowPair("F", "G", "پرده", 48),
      arrowPair("G", "Gs", "نیم‌پرده", 36),
      arrowPair("Gs", "B", "۱٫۵ پرده", 56),
      arrowPair("B", "C2", "نیم‌پرده", 36),
    ].join(""),
    caption: "مثل تئوریک، فقط درجهٔ ۷ نیم‌پرده بالا می‌رود (سی بکار)",
    note: "بین درجهٔ ۶ و ۷ فاصلهٔ افزوده (۱٫۵ پرده) ساخته می‌شود",
  }),

  "minor-melodic": kbFrame({
    title: "گام دو مینور ملودیک · بالا رونده",
    glows: [
      glowWhite("C"),
      glowWhite("D"),
      glowBlack("Ds"),
      glowWhite("F"),
      glowWhite("G"),
      glowWhite("A"),
      glowWhite("B"),
      glowWhite("C2"),
    ].join(""),
    arrows: [
      arrowPair("C", "D", "پرده", 48),
      arrowPair("D", "Ds", "نیم‌پرده", 36),
      arrowPair("Ds", "F", "پرده", 48),
      arrowPair("F", "G", "پرده", 48),
      arrowPair("G", "A", "پرده", 48),
      arrowPair("A", "B", "پرده", 48),
      arrowPair("B", "C2", "نیم‌پرده", 36),
    ].join(""),
    caption: "بالا رونده: درجات ۶ و ۷ بالا می‌روند  ·  پایین‌رونده معمولاً تئوریک است",
    note: "دو مینور ملودیک بالا رونده: دو ر میb فا سل لا سی دو",
  }),

  relative: kbFrame({
    title: "گام نسبی · دو ماژور و لا مینور",
    glows: ["C", "D", "E", "F", "G", "A", "B", "C2"].map(glowWhite).join(""),
    arrows: `
      <text x="${WHITE.C.cx}" y="188" text-anchor="middle" fill="${CYAN}" font-size="26" font-family="Vazir, sans-serif">تونیک ماژور</text>
      <text x="${WHITE.A.cx}" y="188" text-anchor="middle" fill="${CYAN}" font-size="26" font-family="Vazir, sans-serif">تونیک مینور</text>
      <path d="M ${WHITE.C.cx} 200 L ${WHITE.C.cx} 300" stroke="${CYAN}" stroke-width="3" />
      <path d="M ${WHITE.A.cx} 200 L ${WHITE.A.cx} 300" stroke="${CYAN}" stroke-width="3" />
      <path d="${archPath("C", "A", 28)}" fill="none" stroke="${CYAN}" stroke-width="2.5" stroke-dasharray="8 7" />
    `,
    caption: "لا مینور نسبیِ دو ماژور است · همان کلاویه‌های سفید، شروع از لا",
    note: "مینور نسبی = درجهٔ ششم همان گام ماژور",
  }),

  "minor-compare": diagramFrame(`
    <h1>مقایسهٔ مینورهای سه‌گانه · از دو</h1>
    <table class="table">
      <thead>
        <tr>
          <th>گونه</th>
          <th>نت‌ها</th>
          <th>فرمول</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>تئوریک</td>
          <td>دو ر میb فا سل لاb سیb دو</td>
          <td class="formula">پ ن پ پ ن پ پ</td>
        </tr>
        <tr>
          <td>هارمونیک</td>
          <td>دو ر میb فا سل لاb سی دو</td>
          <td class="formula">پ ن پ پ ن ۱٫۵ ن</td>
        </tr>
        <tr>
          <td>ملودیک ↑</td>
          <td>دو ر میb فا سل لا سی دو</td>
          <td class="formula">پ ن پ پ پ پ ن</td>
        </tr>
      </tbody>
    </table>
    <p class="muted" style="margin-top:28px;text-align:center">پ = پرده &nbsp;·&nbsp; ن = نیم‌پرده &nbsp;·&nbsp; همه از تونیک دو ساخته شده‌اند</p>
  `),

  modes: diagramFrame(`
    <h1>مدهای کلیسایی · پوزیشن‌های گام ماژور</h1>
    <table class="table">
      <thead>
        <tr>
          <th>درجه</th>
          <th>شروع از</th>
          <th>نام مد</th>
          <th>یادداشت</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>۱</td><td>دو</td><td>ایونین · Ionian</td><td>همان گام ماژور</td></tr>
        <tr><td>۲</td><td>ر</td><td>دورین · Dorian</td><td></td></tr>
        <tr><td>۳</td><td>می</td><td>فریژین · Phrygian</td><td></td></tr>
        <tr><td>۴</td><td>فا</td><td>لیدین · Lydian</td><td></td></tr>
        <tr><td>۵</td><td>سل</td><td>میکسولیدین · Mixolydian</td><td></td></tr>
        <tr><td>۶</td><td>لا</td><td>آئولین · Aeolian</td><td>همان مینور تئوریک</td></tr>
        <tr><td>۷</td><td>سی</td><td>لوکرین · Locrian</td><td></td></tr>
      </tbody>
    </table>
  `),
};

function screenshot(html, outfile) {
  const htmlPath = join(tmpDir, `${outfile}.html`);
  writeFileSync(htmlPath, html);
  const pngPath = join(outDir, `${outfile}.png`);
  const r = spawnSync(
    "google-chrome",
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${W},${H}`,
      "--default-background-color=000000",
      "--virtual-time-budget=4000",
      `--screenshot=${pngPath}`,
      `file://${htmlPath}`,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error(`chrome failed for ${outfile}`);
  }
  console.log("wrote", pngPath);
}

for (const [id, html] of Object.entries(pages)) {
  screenshot(html, id);
}

rmSync(tmpDir, { recursive: true, force: true });
console.log("done", Object.keys(pages).length, "images");
