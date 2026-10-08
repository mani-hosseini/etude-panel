#!/usr/bin/env python3
"""Push session-9 slides (+ images) to the live admin API."""

from __future__ import annotations

import json
import mimetypes
import os
import sys
import time
import uuid
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.etudepianoacademy.com/api/v1"
ENV_PATH = Path("/home/mani/projects/all-etude/etude-panel/backend/.env")
PUBLIC = Path("/home/mani/projects/all-etude/etude-panel/front-end/public")
DECK_PATH = Path(__file__).with_name("session9-deck.json")
UPLOAD_CACHE = Path("/tmp/etude-session9-uploads")
MAX_UPLOAD_BYTES = 700_000

KIND_MAP = {
    "cover": "COVER",
    "lesson": "LESSON",
    "visual": "VISUAL",
    "outro": "OUTRO",
}


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, raw = line.split("=", 1)
        values[key.strip()] = raw.strip().strip('"').strip("'")
    return values


def load_deck() -> list[dict]:
    slides = json.loads(DECK_PATH.read_text(encoding="utf-8"))
    if not isinstance(slides, list) or not slides:
        raise SystemExit(f"invalid deck: {DECK_PATH}")
    return slides


def req(method: str, path: str, token: str | None = None, data=None, retries: int = 4):
    headers = {"Accept": "application/json"}
    body = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data, ensure_ascii=False).encode()
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        request = urllib.request.Request(
            API + path, data=body, headers=headers, method=method
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as resp:
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
        except Exception as err:  # noqa: BLE001 — retry network blips
            last_err = err
            print(f"retry {attempt}/{retries} {method} {path}: {err}", file=sys.stderr)
            time.sleep(3 * attempt)
    raise SystemExit(f"request failed: {last_err}")


def prepare_upload_file(relative: str) -> Path:
    from PIL import Image

    src = PUBLIC / relative.lstrip("/")
    if not src.is_file():
        # path may be /session_9/foo.png
        alt = PUBLIC / relative.replace("/session_9/", "session_9/")
        src = alt if alt.is_file() else src
    if not src.is_file():
        raise SystemExit(f"missing image: {relative}")

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

    max_w = 1600
    if img.width > max_w:
        ratio = max_w / img.width
        img = img.resize((max_w, int(img.height * ratio)), Image.Resampling.LANCZOS)

    quality = 80
    while quality >= 50:
        img.save(out, "JPEG", quality=quality, optimize=True)
        if out.stat().st_size <= MAX_UPLOAD_BYTES:
            break
        quality -= 8
    print(f"  compressed {src.name}: {src.stat().st_size} → {out.stat().st_size} bytes")
    return out


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
    with urllib.request.urlopen(request, timeout=180) as resp:
        payload = json.loads(resp.read().decode())
    data = payload.get("data") or payload
    path = data.get("path")
    if not path:
        print(json.dumps(payload, ensure_ascii=False)[:800], file=sys.stderr)
        raise SystemExit("upload response missing path")
    return path


def payload_for_write(slide: dict, image_id: str | None) -> dict:
    kind = KIND_MAP[slide.get("kind") or "lesson"]
    is_visual = kind == "VISUAL"
    return {
        "sourceId": slide["id"],
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

    slides = load_deck()
    print(f"deck slides: {len(slides)}")

    if dry:
        for i, slide in enumerate(slides, 1):
            print(
                f"  {i:02d}  {slide['id']:<32}  {slide.get('kind'):<7}  "
                f"{slide.get('imageId') or '-'}"
            )
        return

    login = req(
        "POST",
        "/auth/admin/login",
        data={"email": email, "password": password},
    )
    token = login["data"]["accessToken"]
    print("admin login: ok")

    course = req("GET", "/admin/courses/theory-basics", token=token)["data"]
    session = next(
        (s for s in course.get("sessions") or [] if s.get("number") == 9), None
    )
    if not session:
        raise SystemExit("session 9 not found on theory-basics")
    session_id = session["id"]
    print(f"session 9 id: {session_id}")

    req(
        "PATCH",
        f"/admin/sessions/{session_id}",
        token=token,
        data={
            "title": "معکوس آکورد · اصطلاحات مترونوم",
            "summary": "۱۵ آکورد ماژور و مینور با معکوس اول و دوم، و اصطلاحات مترونوم از تند به کند.",
            "topics": [
                "معکوس اول و دوم سه‌صدایی",
                "۱۵ ماژور و ۱۵ مینور",
                "اصطلاحات مترونوم · BPM",
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

    want_sources = {s["id"] for s in slides}
    for old in existing:
        source = old.get("sourceId")
        if source not in want_sources:
            req("DELETE", f"/admin/slides/{old['id']}", token=token)
            print(f"deleted stale {source}")

    image_cache: dict[str, str] = {}
    for index, slide in enumerate(slides, start=1):
        image_id = None
        local = slide.get("imageId")
        if slide.get("kind") == "visual" and local:
            rel = local.lstrip("/")
            if rel not in image_cache:
                path = prepare_upload_file(rel)
                print(f"uploading {rel} ({path.stat().st_size} bytes)…")
                image_cache[rel] = upload_image(token, path)
                print(f"  → {image_cache[rel]}")
            image_id = image_cache[rel]

        body = payload_for_write(slide, image_id)
        body["sortOrder"] = index
        existing_row = by_source.get(slide["id"])
        if existing_row:
            req(
                "PATCH",
                f"/admin/slides/{existing_row['id']}",
                token=token,
                data=body,
            )
            print(f"updated {slide['id']}")
        else:
            req(
                "POST",
                f"/admin/sessions/{session_id}/slides",
                token=token,
                data=body,
            )
            print(f"created {slide['id']}")

    final = req("GET", f"/admin/sessions/{session_id}/slides", token=token)["data"][
        "slides"
    ]
    by_source = {s.get("sourceId"): s for s in final}
    ordered_ids = [by_source[s["id"]]["id"] for s in slides]
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
            f"  {slide.get('sortOrder'):02d}  {slide.get('sourceId'):<32}  "
            f"{slide.get('kind'):<7}  {slide.get('title')}"
        )


if __name__ == "__main__":
    main()
