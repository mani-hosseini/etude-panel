#!/usr/bin/env python3
"""Push session-7 minor/relative slides + images to the live admin API."""

from __future__ import annotations

import json
import mimetypes
import os
import sys
import uuid
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.etudepianoacademy.com/api/v1"
ENV_PATH = Path("/home/mani/projects/all-etude/etude-panel/backend/.env")
PUBLIC = Path("/home/mani/projects/all-etude/etude-panel/front-end/public")
UPLOAD_CACHE = Path("/tmp/etude-session7-uploads")
MAX_UPLOAD_BYTES = 700_000

KIND_MAP = {
    "cover": "COVER",
    "lesson": "LESSON",
    "visual": "VISUAL",
    "outro": "OUTRO",
}

# Final deck order (same as session-7-slides.ts after buildDeck).
# localImage: path under front-end/public for VISUAL slides.
SLIDES = [
    {
        "sourceId": "welcome",
        "kind": "cover",
        "chapter": "۰۱",
        "title": "جلسهٔ هفتم: گام‌های مینور و نسبی",
        "goal": "هنرجو باید بداند که در این جلسه چه می‌آموزد.",
        "body": "در این جلسه سه گونهٔ مینور را می‌شناسیم، ۱۴ گام را از لا مینور می‌سازیم، آکورد مینور را از درجات ۱–۳–۵ می‌گیریم، و مینور نسبی را یاد می‌گیریم.",
        "bullets": [
            "مینور تئوریک · هارمونیک · ملودیک",
            "۱۴ گام از لا مینور · آکورد مینور",
            "گام نسبی · دو ماژور و لا مینور",
        ],
        "terms": [
            {"en": "Minor Scale", "fa": "گام مینور"},
            {"en": "Relative Minor", "fa": "مینور نسبی"},
        ],
        "mistakes": [],
    },
    {
        "sourceId": "minor-three",
        "kind": "lesson",
        "chapter": "۰۲",
        "title": "مینورهای سه‌گانه",
        "goal": "هنرجو باید سه گونهٔ مینور را نام ببرد.",
        "body": "گام مینور سه شکل رایج دارد. تئوریک یا طبیعی ساده‌ترین است. هارمونیک درجهٔ هفتم را بالا می‌برد. ملودیک هنگام بالا رفتن درجات ششم و هفتم را بالا می‌برد.",
        "bullets": [
            "تئوریک / طبیعی",
            "هارمونیک · درجهٔ ۷ بالا",
            "ملودیک · درجات ۶ و ۷ بالا رونده",
        ],
        "terms": [
            {"en": "Natural Minor", "fa": "مینور تئوریک / طبیعی"},
            {"en": "Harmonic Minor", "fa": "مینور هارمونیک"},
            {"en": "Melodic Minor", "fa": "مینور ملودیک"},
        ],
        "mistakes": ["یکی دانستن صدای سه مینور"],
    },
    {
        "sourceId": "minor-natural",
        "kind": "lesson",
        "chapter": "۰۳",
        "title": "مینور تئوریک",
        "goal": "هنرجو باید فرمول مینور تئوریک را روی دو بسازد.",
        "body": "فرمول تئوریک: پرده، نیم‌پرده، پرده، پرده، نیم‌پرده، پرده، پرده. از دو: دو ر می‌بمل فا سل لا‌بمل سی‌بمل دو. نسبت به ماژور، درجات سوم و ششم و هفتم نیم‌پرده پایین‌ترند.",
        "bullets": [
            "فرمول: پ ن پ · پ ن پ پ",
            "دو مینور: میb · لاb · سیb",
            "درجات ۳، ۶، ۷ نسبت به ماژور پایین‌تر",
        ],
        "terms": [
            {"en": "Natural / Theoretical Minor", "fa": "مینور تئوریک"},
            {"en": "Lowered 3rd, 6th, 7th", "fa": "درجات ۳ و ۶ و ۷ پایین"},
        ],
        "mistakes": ["پایین آوردن درجهٔ دوم به‌جای سوم"],
    },
    {
        "sourceId": "minor-natural-visual",
        "kind": "visual",
        "chapter": "۰۳",
        "title": "مینور تئوریک",
        "goal": "",
        "body": "گام دو مینور تئوریک روی کیبورد با میb، لاb و سیb",
        "bullets": [],
        "terms": [],
        "mistakes": [],
        "imageHint": "گام دو مینور تئوریک روی کیبورد با میb، لاb و سیb",
        "localImage": "session_5/minor-natural.png",
    },
    {
        "sourceId": "minor-fourteen",
        "kind": "lesson",
        "chapter": "۰۴",
        "title": "۱۴ گام مینور از لا مینور",
        "goal": "هنرجو باید ترتیب و ساخته‌شدن ۱۴ گام مینور را از گام مبدأ (گام مادر «لا مینور») بتواند محاسبه کرده و بنویسد.",
        "body": "گام مبدأ، لا مینور طبیعی است. با فاصلهٔ پنجم درست از لا، گام‌های مینور دیزدار ساخته می‌شوند: هفت گام که با هر گام تازه یک دیز به دیزهای قبلی اضافه می‌شود. با فاصلهٔ چهارم درست از لا، گام‌های مینور بمل‌دار ساخته می‌شوند: هفت گام که با هر گام تازه یک بمل به بمل‌های قبلی اضافه می‌شود. فاصلهٔ پنجم درست برابر ۳٫۵ پرده و فاصلهٔ چهارم درست برابر ۲٫۵ پرده است. برای هر گام، علائم ترکیبی و آکورد سادهٔ سه‌صدایی (تونیک) را هم بنویسید.",
        "bullets": [
            "دیزدار (پنجم درست): لا ← می ← سی ← فا♯ ← دو♯ ← سل♯ ← ر♯ ← لا♯",
            "بمل‌دار (چهارم درست): لا ← ر ← سل ← دو ← فا ← سی♭ ← می♭ ← لا♭",
            "پنجم درست = ۳٫۵ پرده · چهارم درست = ۲٫۵ پرده",
            "هر گام: علائم ترکیبی + آکورد سه‌صدایی مینور",
        ],
        "terms": [
            {"en": "Natural Minor Scale", "fa": "گام مینور طبیعی"},
            {
                "en": "Relative Minor",
                "fa": "مینور نسبی · مثلاً A Minor مینور نسبی C Major",
            },
            {
                "en": "Circle of Fifths",
                "fa": "چرخهٔ پنجم‌ها · حرکت با فاصلهٔ پنجم درست",
            },
            {"en": "Sharp Minor Scales", "fa": "گام‌های مینور دیزدار"},
            {"en": "Flat Minor Scales", "fa": "گام‌های مینور بمل‌دار"},
            {"en": "Harmonic Minor Scale", "fa": "گام مینور هارمونیک"},
        ],
        "mistakes": [
            "شروع زنجیرهٔ دیزدار از چهارم درست به‌جای پنجم درست",
            "فراموش کردن اضافه شدن یک علامت در هر گام جدید",
        ],
    },
    {
        "sourceId": "minor-fourteen-visual",
        "kind": "visual",
        "chapter": "۰۴",
        "title": "۱۴ گام مینور از لا مینور",
        "goal": "",
        "body": "توالی گام‌های مینور دیزدار و بمل‌دار از گام مبدأ لا",
        "bullets": [],
        "terms": [],
        "mistakes": [],
        "imageHint": "توالی گام‌های مینور دیزدار و بمل‌دار از گام مبدأ لا",
        "localImage": "session_7/minor-fourteen.jpg",
    },
    {
        "sourceId": "minor-chord",
        "kind": "lesson",
        "chapter": "۰۵",
        "title": "ساخت آکورد مینور از گام مینور",
        "goal": "هنرجو باید ساختن آکوردهای مینور از طریق گام‌های مینور را بلد باشد.",
        "body": "پس از ساخت هر گام مینور، می‌توان آکورد مینور مربوط به آن گام را نیز به‌دست آورد. برای این کار، درجهٔ اول (تونیک)، درجهٔ سوم و درجهٔ پنجم گام را انتخاب کرده و به‌صورت هم‌زمان اجرا می‌کنیم. فاصله بین درجهٔ اول و سوم، سوم کوچک و فاصله بین درجهٔ اول و پنجم، پنجم درست است؛ بنابراین ساختار اصلی آکورد مینور از تونیک + سوم کوچک + پنجم درست تشکیل می‌شود. برای مثال در گام لا مینور، درجات اول، سوم و پنجم به‌ترتیب نت‌های لا، دو و می هستند که در کنار یکدیگر آکورد لا مینور (A Minor Chord) را تشکیل می‌دهند.",
        "bullets": [
            "آکورد مینور از درجات ۱، ۳ و ۵ گام مینور",
            "درجهٔ اول = ریشهٔ آکورد (Root)",
            "ریشه تا درجهٔ ۳ = سوم کوچک (Minor Third)",
            "ریشه تا درجهٔ ۵ = پنجم درست (Perfect Fifth)",
        ],
        "terms": [
            {"en": "Chord", "fa": "آکورد"},
            {"en": "Minor Chord", "fa": "آکورد مینور"},
            {"en": "Minor Triad", "fa": "سه‌صدایی مینور"},
            {"en": "Root", "fa": "ریشه / نت پایه"},
            {"en": "Minor Third", "fa": "سوم کوچک"},
            {"en": "Perfect Fifth", "fa": "پنجم درست"},
        ],
        "mistakes": ["ساختن آکورد مینور با سوم بزرگ به‌جای سوم کوچک"],
    },
    {
        "sourceId": "minor-chord-c-visual",
        "kind": "visual",
        "chapter": "۰۵",
        "title": "آکورد دو مینور",
        "goal": "",
        "body": "تونیک + سوم کوچک + پنجم درست = آکورد دو مینور (C – Eb – G)",
        "bullets": [],
        "terms": [],
        "mistakes": [],
        "imageHint": "تونیک + سوم کوچک + پنجم درست = آکورد دو مینور (C – Eb – G)",
        "localImage": "session_7/minor-chord-c.png",
    },
    {
        "sourceId": "minor-harmonic",
        "kind": "lesson",
        "chapter": "۰۶",
        "title": "مینور هارمونیک",
        "goal": "هنرجو باید تفاوت هارمونیک با تئوریک را روی درجهٔ هفتم ببیند.",
        "body": "مینور هارمونیک همان تئوریک است، فقط درجهٔ هفتم نیم‌پرده بالا می‌رود تا به تونیک نزدیک شود. در دو مینور، سی‌بمل به سی بکار تبدیل می‌شود. بین درجهٔ ششم و هفتم فاصلهٔ ۱٫۵ پرده (افزوده) ساخته می‌شود.",
        "bullets": [
            "تئوریک + درجهٔ ۷ بالا",
            "دو مینور هارمونیک: سی بکار",
            "فاصلهٔ ۶ تا ۷ = ۱٫۵ پرده",
        ],
        "terms": [
            {"en": "Harmonic Minor", "fa": "مینور هارمونیک"},
            {"en": "Leading Tone", "fa": "درجهٔ هفتم راهنما"},
            {"en": "Augmented Second", "fa": "دوم افزوده"},
        ],
        "mistakes": ["بالا بردن درجهٔ ششم به‌جای هفتم در هارمونیک"],
    },
    {
        "sourceId": "minor-harmonic-visual",
        "kind": "visual",
        "chapter": "۰۶",
        "title": "مینور هارمونیک",
        "goal": "",
        "body": "دو مینور هارمونیک: لاb تا سی = ۱٫۵ پرده",
        "bullets": [],
        "terms": [],
        "mistakes": [],
        "imageHint": "دو مینور هارمونیک: لاb تا سی = ۱٫۵ پرده",
        "localImage": "session_5/minor-harmonic.png",
    },
    {
        "sourceId": "minor-melodic",
        "kind": "lesson",
        "chapter": "۰۷",
        "title": "مینور ملودیک",
        "goal": "هنرجو باید شکل بالا رونده و پایین‌روندهٔ مینور ملودیک را بداند.",
        "body": "در ملودیک بالا رونده، درجات ششم و هفتم هر دو بالا می‌روند تا مسیر به تونیک نرم‌تر شود. در دو: لا بکار و سی بکار. هنگام پایین آمدن معمولاً به شکل تئوریک برمی‌گردیم: سی‌بمل و لا‌بمل.",
        "bullets": [
            "بالا رونده: درجات ۶ و ۷ بالا",
            "دو ملودیک ↑: لا و سی بکار",
            "پایین‌رونده معمولاً = تئوریک",
        ],
        "terms": [
            {"en": "Melodic Minor", "fa": "مینور ملودیک"},
            {"en": "Ascending / Descending", "fa": "بالا رونده / پایین‌رونده"},
        ],
        "mistakes": [
            "یکسان نواختن بالا و پایین ملودیک بدون توجه به سنت رایج"
        ],
    },
    {
        "sourceId": "minor-melodic-visual",
        "kind": "visual",
        "chapter": "۰۷",
        "title": "مینور ملودیک",
        "goal": "",
        "body": "دو مینور ملودیک بالا رونده روی کیبورد",
        "bullets": [],
        "terms": [],
        "mistakes": [],
        "imageHint": "دو مینور ملودیک بالا رونده روی کیبورد",
        "localImage": "session_5/minor-melodic.png",
    },
    {
        "sourceId": "minor-compare",
        "kind": "lesson",
        "chapter": "۰۸",
        "title": "مقایسهٔ سه مینور",
        "goal": "هنرجو باید نت‌های سه مینور را از روی یک تونیک کنار هم ببیند.",
        "body": "هر سه از دو شروع می‌شوند و تا درجهٔ پنجم یکی‌اند: دو ر می‌بمل فا سل. تفاوت از درجهٔ ششم و هفتم است. تئوریک لاb سیb، هارمونیک لاb سی، ملودیک بالا رونده لا سی.",
        "bullets": [
            "تا سل هر سه یکی‌اند",
            "تئوریک: لاb سیb",
            "هارمونیک: لاb سی",
            "ملودیک ↑: لا سی",
        ],
        "terms": [
            {"en": "Compare the three minors", "fa": "مقایسهٔ مینورهای سه‌گانه"},
        ],
        "mistakes": ["تغییر دادن درجهٔ سوم در هارمونیک یا ملودیک"],
    },
    {
        "sourceId": "relative",
        "kind": "lesson",
        "chapter": "۰۹",
        "title": "گام نسبی",
        "goal": "هنرجو باید مینور نسبی یک ماژور را پیدا کند.",
        "body": "هر گام ماژور یک مینور نسبی دارد که نت‌هایش یکی است، فقط تونیک عوض می‌شود. مینور نسبی از درجهٔ ششم ماژور شروع می‌شود. دو ماژور و لا مینور تئوریک هر دو روی کلاویه‌های سفیدند.",
        "bullets": [
            "مینور نسبی = درجهٔ ۶ ماژور",
            "دو ماژور ↔ لا مینور",
            "همان نت‌ها · تونیک متفاوت",
        ],
        "terms": [
            {"en": "Relative Minor", "fa": "مینور نسبی"},
            {"en": "Relative Major", "fa": "ماژور نسبی"},
        ],
        "mistakes": ["شروع مینور نسبی از درجهٔ پنجم به‌جای ششم"],
    },
    {
        "sourceId": "relative-visual",
        "kind": "visual",
        "chapter": "۰۹",
        "title": "گام نسبی",
        "goal": "",
        "body": "همان کیبورد سفید: تونیک ماژور روی دو، تونیک مینور روی لا",
        "bullets": [],
        "terms": [],
        "mistakes": [],
        "imageHint": "همان کیبورد سفید: تونیک ماژور روی دو، تونیک مینور روی لا",
        "localImage": "session_5/relative.png",
    },
    {
        "sourceId": "summary",
        "kind": "outro",
        "chapter": "۱۰",
        "title": "جمع‌بندی جلسهٔ هفتم",
        "goal": "هنرجو باید مسیر جلسه را مرور کند.",
        "body": "مینور سه شکل دارد: تئوریک، هارمونیک و ملودیک. از گام مادر لا مینور، مینورهای دیزدار و بمل‌دار ساخته می‌شوند. آکورد مینور از درجات ۱–۳–۵ گام مینور (سوم کوچک + پنجم درست) به‌دست می‌آید. مینور نسبی از درجهٔ ششم ماژور شروع می‌شود.",
        "bullets": [
            "تئوریک · هارمونیک · ملودیک",
            "۱۴ گام از لا مینور · دیزدار و بمل‌دار",
            "آکورد مینور: ۱ + سوم کوچک + ۵",
            "نسبی = درجهٔ ۶ ماژور",
        ],
        "terms": [
            {"en": "Minor Scale", "fa": "گام مینور"},
            {"en": "Minor Chord", "fa": "آکورد مینور"},
            {"en": "Relative Minor", "fa": "مینور نسبی"},
        ],
        "mistakes": ["فراموش کردن اینکه هارمونیک فقط درجهٔ ۷ را بالا می‌برد"],
    },
]


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, raw = line.split("=", 1)
        values[key.strip()] = raw.strip().strip('"').strip("'")
    return values


def prepare_upload_file(relative: str) -> Path:
    """Compress large PNGs to JPEG so nginx does not reject with 413."""
    from PIL import Image

    src = PUBLIC / relative
    if not src.is_file():
        raise SystemExit(f"missing image: {src}")
    if src.stat().st_size <= MAX_UPLOAD_BYTES and src.suffix.lower() in {
        ".jpg",
        ".jpeg",
        ".webp",
    }:
        return src

    UPLOAD_CACHE.mkdir(parents=True, exist_ok=True)
    out = UPLOAD_CACHE / f"{src.stem}.jpg"
    img = Image.open(src)
    if img.mode in ("RGBA", "P"):
        background = Image.new("RGB", img.size, (7, 16, 36))
        rgba = img.convert("RGBA")
        background.paste(rgba, mask=rgba.split()[-1])
        img = background
    else:
        img = img.convert("RGB")

    max_w = 1800
    if img.width > max_w:
        ratio = max_w / img.width
        img = img.resize((max_w, int(img.height * ratio)), Image.Resampling.LANCZOS)

    quality = 82
    while quality >= 55:
        img.save(out, "JPEG", quality=quality, optimize=True)
        if out.stat().st_size <= MAX_UPLOAD_BYTES:
            break
        quality -= 8
    print(
        f"  compressed {relative}: {src.stat().st_size} → {out.stat().st_size} bytes"
    )
    return out


def req(method: str, path: str, token: str | None = None, data=None):
    headers = {"Accept": "application/json"}
    body = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data, ensure_ascii=False).encode()
    request = urllib.request.Request(
        API + path, data=body, headers=headers, method=method
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as err:
        payload = err.read().decode()
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            parsed = {"raw": payload}
        print(f"HTTP {err.code} {method} {path}", file=sys.stderr)
        print(json.dumps(parsed, ensure_ascii=False)[:1000], file=sys.stderr)
        raise SystemExit(1)


def upload_image(token: str, file_path: Path) -> str:
    boundary = f"----EtudeBoundary{uuid.uuid4().hex}"
    mime = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    raw = file_path.read_bytes()
    parts = [
        f"--{boundary}\r\n".encode(),
        (
            f'Content-Disposition: form-data; name="file"; filename="{file_path.name}"\r\n'
            f"Content-Type: {mime}\r\n\r\n"
        ).encode(),
        raw,
        b"\r\n",
        f"--{boundary}--\r\n".encode(),
    ]
    body = b"".join(parts)
    request = urllib.request.Request(
        API + "/admin/uploads/slide-image",
        data=body,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as resp:
            payload = json.loads(resp.read().decode())
    except urllib.error.HTTPError as err:
        print(f"HTTP {err.code} upload {file_path.name}", file=sys.stderr)
        print(err.read().decode()[:800], file=sys.stderr)
        raise SystemExit(1)
    data = payload.get("data") or payload
    path = data.get("path")
    if not path:
        print(json.dumps(payload, ensure_ascii=False)[:800], file=sys.stderr)
        raise SystemExit("upload response missing path")
    return path


def payload_for_write(slide: dict, image_id: str | None) -> dict:
    kind = KIND_MAP[slide["kind"]]
    is_visual = kind == "VISUAL"
    return {
        "sourceId": slide["sourceId"],
        "chapter": slide["chapter"],
        "title": slide["title"],
        "goal": slide.get("goal") or "",
        "body": slide["body"],
        "bullets": slide.get("bullets") or [],
        "terms": slide.get("terms") or [],
        "mistakes": slide.get("mistakes") or [],
        "kind": kind,
        "imageHint": (slide.get("imageHint") or "") if is_visual else "",
        "imageId": (image_id or "") if is_visual else "",
        "funFact": slide.get("funFact") or "",
    }


def main() -> None:
    dry = "--dry-run" in sys.argv
    env = load_env()
    email = os.environ.get("SEED_ADMIN_EMAIL") or env.get("SEED_ADMIN_EMAIL")
    password = os.environ.get("SEED_ADMIN_PASSWORD") or env.get("SEED_ADMIN_PASSWORD")
    if not email or not password:
        raise SystemExit("Admin credentials missing in backend/.env")

    for slide in SLIDES:
        local = slide.get("localImage")
        if local and not (PUBLIC / local).is_file():
            raise SystemExit(f"missing image: {PUBLIC / local}")

    login = req(
        "POST",
        "/auth/admin/login",
        data={"email": email, "password": password},
    )
    token = login["data"]["accessToken"]
    print("admin login: ok")

    course = req("GET", "/admin/courses/theory-basics", token=token)["data"]
    session = next((s for s in course.get("sessions") or [] if s.get("number") == 7), None)
    if not session:
        raise SystemExit("session 7 not found on theory-basics")

    session_id = session["id"]
    print(f"session 7 id: {session_id}")

    if dry:
        print(f"dry-run: would sync {len(SLIDES)} slides")
        for i, slide in enumerate(SLIDES, 1):
            img = slide.get("localImage") or "-"
            print(f"  {i:02d}  {slide['sourceId']:<28}  {slide['kind']:<7}  {img}")
        return

    req(
        "PATCH",
        f"/admin/sessions/{session_id}",
        token=token,
        data={
            "title": "گام‌های مینور و نسبی",
            "summary": "سه گونهٔ مینور، ۱۴ گام از لا مینور، آکورد مینور، و گام نسبی.",
            "topics": [
                "مینور تئوریک · هارمونیک · ملودیک",
                "۱۴ گام از لا مینور",
                "آکورد مینور",
                "گام نسبی",
            ],
            "status": "AVAILABLE",
            "durationLabel": "۱۲۰ دقیقه",
            "dateLabel": "فعال",
        },
    )
    print("updated session metadata → AVAILABLE")

    existing = req("GET", f"/admin/sessions/{session_id}/slides", token=token)[
        "data"
    ]["slides"]
    by_source = {s.get("sourceId"): s for s in existing}
    print(f"existing slides: {len(existing)}")

    want_sources = {s["sourceId"] for s in SLIDES}
    for old in existing:
        source = old.get("sourceId")
        if source not in want_sources:
            req("DELETE", f"/admin/slides/{old['id']}", token=token)
            print(f"deleted stale {source}")

    image_cache: dict[str, str] = {}
    created_ids: list[str] = []

    for index, slide in enumerate(SLIDES, start=1):
        image_id = None
        local = slide.get("localImage")
        if local:
            if local not in image_cache:
                path = prepare_upload_file(local)
                print(f"uploading {local} ({path.stat().st_size} bytes)…")
                image_cache[local] = upload_image(token, path)
                print(f"  → {image_cache[local]}")
            image_id = image_cache[local]

        body = payload_for_write(slide, image_id)
        body["sortOrder"] = index
        existing_row = by_source.get(slide["sourceId"])
        if existing_row:
            updated = req(
                "PATCH",
                f"/admin/slides/{existing_row['id']}",
                token=token,
                data=body,
            )["data"]
            created_ids.append(updated["id"])
            print(f"updated {slide['sourceId']}")
        else:
            created = req(
                "POST",
                f"/admin/sessions/{session_id}/slides",
                token=token,
                data=body,
            )["data"]
            created_ids.append(created["id"])
            print(f"created {slide['sourceId']}")

    # Re-fetch to get stable ids after create/update
    final = req("GET", f"/admin/sessions/{session_id}/slides", token=token)["data"][
        "slides"
    ]
    by_source = {s.get("sourceId"): s for s in final}
    ordered_ids = [by_source[s["sourceId"]]["id"] for s in SLIDES]
    req(
        "POST",
        f"/admin/sessions/{session_id}/slides/reorder",
        token=token,
        data={"slideIds": ordered_ids},
    )
    print("reordered")

    final = req("GET", f"/admin/sessions/{session_id}/slides", token=token)["data"][
        "slides"
    ]
    print(f"final slides: {len(final)}")
    for slide in final:
        print(
            f"  {slide.get('sortOrder'):02d}  {slide.get('sourceId'):<28}  "
            f"{slide.get('kind'):<7}  {slide.get('title')}"
        )


if __name__ == "__main__":
    main()
