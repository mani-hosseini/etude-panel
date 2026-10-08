#!/usr/bin/env python3
"""Push session-3 langu text slides to the live admin API."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.etudepianoacademy.com/api/v1"
ENV_PATH = Path("/home/mani/projects/all-etude/etude-panel/backend/.env")

NEW_SLIDES = [
    {
        "sourceId": "langu",
        "chapter": "۱۳",
        "title": "میزان لنگ (مختلط)",
        "goal": "هنرجو باید بداند که میزان لنگ از ترکیب دو میزان متفاوت ساخته می‌شود.",
        "body": "میزان لنگ یا مختلط از جمع دو یا چند میزان سادهٔ متفاوت به دست می‌آید. صورت میزان‌نماها با هم جمع می‌شود و مخرج یکی می‌ماند. نتیجه یک میزان با گروه‌بندی نامساوی است، نه الگوی ثابت قوی/ضعیف.",
        "bullets": [
            "از ترکیب میزان‌های متفاوت ساخته می‌شود",
            "صورت‌ها جمع می‌شوند؛ مخرج ثابت است",
            "گروه‌بندی ضرب‌ها حس میزان را می‌سازد",
        ],
        "terms": [
            {"en": "Irregular Meter", "fa": "میزان لنگ"},
            {"en": "Mixed Meter", "fa": "میزان مختلط"},
            {"en": "Additive Meter", "fa": "میزان ترکیبی نهان"},
        ],
        "mistakes": ["زدن همهٔ ضرب‌های میزان لنگ با یک الگوی ثابت قوی/ضعیف"],
        "kind": "LESSON",
    },
    {
        "sourceId": "langu-5-2plus3",
        "chapter": "۱۴",
        "title": "۵/۴ از ۲/۴ + ۳/۴",
        "goal": "هنرجو باید گروه‌بندی ۲+۳ را در میزان ۵/۴ بشناسد.",
        "body": "اگر ۲/۴ را با ۳/۴ جمع کنیم، ۵/۴ به دست می‌آید. پنج سیاه در میزان می‌آید: ۱ ۲ ۳ ۴ ۵. گروه اول دو ضرب است و گروه دوم سه ضرب. تأکید اصلی روی ۱ است و تأکید بعدی روی ۳، یعنی شروع گروه سه‌تایی.",
        "bullets": [
            "۲/۴ + ۳/۴ = ۵/۴",
            "گروه‌بندی: ۲ + ۳",
            "تأکید: ضرب ۱ و ضرب ۳",
            "الگو: قوی · ضعیف · قوی · ضعیف · ضعیف",
        ],
        "terms": [
            {"en": "5/4", "fa": "پنج‌چهارم"},
            {"en": "2+3 grouping", "fa": "گروه‌بندی ۲+۳"},
        ],
        "mistakes": ["تأکید دوم را روی ضرب ۲ گذاشتن به‌جای ضرب ۳"],
        "kind": "LESSON",
    },
    {
        "sourceId": "langu-5-3plus2",
        "chapter": "۱۵",
        "title": "۵/۴ از ۳/۴ + ۲/۴",
        "goal": "هنرجو باید بداند که ۵/۴ را می‌توان ۳+۲ هم گروه‌بندی کرد.",
        "body": "اگر ترتیب جمع عوض شود، همان ۵/۴ حس دیگری پیدا می‌کند: ۳/۴ + ۲/۴ = ۵/۴. باز پنج سیاه داریم، ولی گروه اول سه ضرب است و گروه دوم دو ضرب. تأکید اصلی روی ۱ است و تأکید بعدی روی ۴، یعنی شروع گروه دوتایی.",
        "bullets": [
            "۳/۴ + ۲/۴ = ۵/۴",
            "گروه‌بندی: ۳ + ۲",
            "تأکید: ضرب ۱ و ضرب ۴",
            "الگو: قوی · ضعیف · ضعیف · قوی · ضعیف",
        ],
        "terms": [
            {"en": "5/4", "fa": "پنج‌چهارم"},
            {"en": "3+2 grouping", "fa": "گروه‌بندی ۳+۲"},
        ],
        "mistakes": ["یکی دانستن ۲+۳ و ۳+۲ فقط چون هر دو ۵/۴ هستند"],
        "kind": "LESSON",
    },
    {
        "sourceId": "langu-accent",
        "chapter": "۱۶",
        "title": "چرا ترتیب جمع مهم است؟",
        "goal": "هنرجو باید بفهمد که عدد میزان‌نما یکسان است ولی محل تأکید عوض می‌شود.",
        "body": "هر دو مثال ۵/۴ می‌سازند، اما جای ضرب قوی دوم فرق دارد. در ۲+۳ تأکید دوم روی ۳ می‌افتد؛ در ۳+۲ روی ۴. میزان لنگ را باید با گروه‌بندی‌اش خواند، نه فقط با عدد صورت میزان‌نما.",
        "bullets": [
            "۵/۴ = ۲+۳ یا ۳+۲",
            "عدد میزان‌نما یکی است؛ حس ریتم فرق دارد",
            "تأکید دوم = شروع گروه دوم",
            "قبل از نواختن، گروه‌بندی را مشخص کنید",
        ],
        "terms": [
            {"en": "Accent", "fa": "تأکید / آکسان"},
            {"en": "Grouping", "fa": "گروه‌بندی"},
        ],
        "mistakes": ["فقط شمردن پنج سیاه مساوی بدون مشخص کردن گروه ۲+۳ یا ۳+۲"],
        "kind": "LESSON",
    },
    {
        "sourceId": "langu-74",
        "chapter": "۱۷",
        "title": "۷/۴ هم میزان لنگ است",
        "goal": "هنرجو باید بتواند همین روش را برای ۷/۴ به کار ببرد.",
        "body": "با همان روش، ۳/۴ + ۴/۴ = ۷/۴. هفت سیاه در میزان می‌آید و گروه‌بندی معمولاً ۳+۴ یا ۴+۳ است. تأکید دوم روی شروع گروه دوم می‌افتد؛ پس در ۳+۴ روی ۴ است و در ۴+۳ روی ۵.",
        "bullets": [
            "۳/۴ + ۴/۴ = ۷/۴",
            "گروه‌بندی رایج: ۳+۴ یا ۴+۳",
            "تأکید دوم = شروع گروه دوم",
        ],
        "terms": [
            {"en": "7/4", "fa": "هفت‌چهارم"},
            {"en": "3+4 / 4+3", "fa": "گروه‌بندی ۳+۴ / ۴+۳"},
        ],
        "mistakes": ["زدن ۷/۴ مثل هفت ضرب کاملاً مساوی بدون گروه"],
        "kind": "LESSON",
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
        with urllib.request.urlopen(request, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as err:
        payload = err.read().decode()
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            parsed = {"raw": payload}
        print(f"HTTP {err.code} {method} {path}", file=sys.stderr)
        print(json.dumps(parsed, ensure_ascii=False)[:800], file=sys.stderr)
        raise SystemExit(1)


def payload_for_write(slide: dict) -> dict:
    body = {
        "sourceId": slide["sourceId"],
        "chapter": slide["chapter"],
        "title": slide["title"],
        "goal": slide["goal"],
        "body": slide["body"],
        "bullets": slide["bullets"],
        "terms": slide["terms"],
        "mistakes": slide["mistakes"],
        "kind": slide["kind"],
        "imageHint": "",
        "imageId": "",
        "funFact": "",
    }
    return body


def main() -> None:
    dry = "--dry-run" in sys.argv
    env = load_env()
    email = os.environ.get("SEED_ADMIN_EMAIL") or env.get("SEED_ADMIN_EMAIL")
    password = os.environ.get("SEED_ADMIN_PASSWORD") or env.get("SEED_ADMIN_PASSWORD")
    if not email or not password:
        raise SystemExit("Admin credentials missing in backend/.env")

    login = req(
        "POST",
        "/auth/admin/login",
        data={"email": email, "password": password},
    )
    token = login["data"]["accessToken"]
    print("admin login: ok")

    course = req("GET", "/admin/courses/theory-basics", token=token)["data"]
    sessions = course.get("sessions") or []
    session = next((s for s in sessions if s.get("number") == 3), None)
    if not session:
        print("available sessions:", [(s.get("number"), s.get("title")) for s in sessions])
        raise SystemExit("session 3 not found")

    session_id = session["id"]
    print(f"session 3 id: {session_id}")
    print(f"session title: {session.get('title')}")

    slides = req("GET", f"/admin/sessions/{session_id}/slides", token=token)["data"][
        "slides"
    ]
    print(f"existing slides: {len(slides)}")
    for slide in slides:
        print(
            f"  {slide.get('sortOrder'):02d}  {slide.get('sourceId'):<28}  "
            f"{slide.get('kind'):<7}  {slide.get('title')}"
        )

    by_source = {s.get("sourceId"): s for s in slides}

    if dry:
        print("dry-run: no writes")
        return

    welcome = by_source.get("welcome")
    if welcome:
        req(
            "PATCH",
            f"/admin/slides/{welcome['id']}",
            token=token,
            data={
                "body": "در این جلسه میزان ترکیبی، تریوله، و میزان لنگ را می‌آموزیم.",
                "bullets": [
                    "میزان ترکیبی از میزان ساده با ضرب ۳/۲",
                    "تریوله در میزان ساده ≠ شمارش میزان ترکیبی",
                    "میزان لنگ: ۵/۴ به‌صورت ۲+۳ یا ۳+۲",
                ],
                "terms": [
                    {"en": "Compound Meter", "fa": "میزان ترکیبی"},
                    {"en": "Triplet", "fa": "تریوله"},
                    {"en": "Irregular Meter", "fa": "میزان لنگ"},
                ],
            },
        )
        print("updated welcome")

    summary = by_source.get("summary")
    if summary:
        req(
            "PATCH",
            f"/admin/slides/{summary['id']}",
            token=token,
            data={
                "body": "در این جلسه یاد گرفتیم: میزان ترکیبی با ضرب ۳/۲، تفاوت تریوله با شمارش ترکیبی، شمارش ۶/۸ و ۹/۸ و ۱۲/۸، و میزان لنگ با گروه‌بندی ۲+۳ یا ۳+۲.",
                "bullets": [
                    "میزان ترکیبی · ۶/۸ ۹/۸ ۱۲/۸",
                    "تریوله در میزان ساده ≠ شمارش ترکیبی",
                    "میزان لنگ · ۵/۴ به‌صورت ۲+۳ یا ۳+۲ · ۷/۴",
                ],
                "terms": [
                    {"en": "Compound Meter", "fa": "میزان ترکیبی"},
                    {"en": "Triplet", "fa": "تریوله"},
                    {"en": "Irregular Meter", "fa": "میزان لنگ"},
                ],
            },
        )
        print("updated summary")

    for slide in NEW_SLIDES:
        source = slide["sourceId"]
        body = payload_for_write(slide)
        existing = by_source.get(source)
        if existing:
            req("PATCH", f"/admin/slides/{existing['id']}", token=token, data=body)
            print(f"updated {source}")
        else:
            req(
                "POST",
                f"/admin/sessions/{session_id}/slides",
                token=token,
                data=body,
            )
            print(f"created {source}")

    slides_after = req("GET", f"/admin/sessions/{session_id}/slides", token=token)[
        "data"
    ]["slides"]
    langu_sources = {s["sourceId"] for s in NEW_SLIDES}
    langu_ids = []
    for item in NEW_SLIDES:
        match = next(s for s in slides_after if s.get("sourceId") == item["sourceId"])
        langu_ids.append(match["id"])

    head_ids: list[str] = []
    tail_ids: list[str] = []
    seen_practice = False
    for slide in slides_after:
        source = slide.get("sourceId")
        if source in langu_sources:
            continue
        if source == "summary":
            tail_ids.append(slide["id"])
            continue
        head_ids.append(slide["id"])
        if source == "compound-practice":
            seen_practice = True

    if not seen_practice:
        raise SystemExit("compound-practice not found; refusing to reorder")

    final_ids = head_ids + langu_ids + tail_ids
    req(
        "POST",
        f"/admin/sessions/{session_id}/slides/reorder",
        token=token,
        data={"slideIds": final_ids},
    )
    print("reordered")

    final = req("GET", f"/admin/sessions/{session_id}/slides", token=token)["data"]["slides"]
    print(f"final slides: {len(final)}")
    for slide in final:
        print(
            f"  {slide.get('sortOrder'):02d}  {slide.get('sourceId'):<28}  "
            f"{slide.get('kind'):<7}  {slide.get('title')}"
        )


if __name__ == "__main__":
    main()
