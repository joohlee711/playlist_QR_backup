#!/usr/bin/env python3
"""Spotify 플레이리스트를 아카이브에 추가/갱신한다.

API 키 없이 Spotify 임베드 페이지에 들어 있는 공개 데이터를 읽는다.
  - data/playlists/<slug>.json  : 플리 데이터 (소개글/곡 코멘트는 직접 채움)
  - assets/<slug>/cover.jpg     : 커버 300px JPEG (Spotify에서 사라져도 남도록 백업)
  - assets/<slug>/qr.svg, qr.png : Spotify 링크 QR
  - data/index.json              : 메인 그리드용 목록 (전체 재생성)

예)
  python3 scripts/add_playlist.py "https://open.spotify.com/playlist/..." \
      --slug 2026-11-mono-lens --title "왼손잡이 덥스텝" \
      --curator "Mono Lens" --handle mono_lens_ --date 2026-11-25 \
      --instagram "https://www.instagram.com/p/XXXX/"

  Editor's playlist면 --curator 대신 --editor.
  이미 있는 slug면 소개글·코멘트 등 손으로 쓴 내용은 유지하고 Spotify 데이터만 갱신한다.
  python3 scripts/add_playlist.py --reindex  : index.json만 다시 만든다.
"""
import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "playlists"
ASSETS = ROOT / "assets"
UA = {"User-Agent": "Mozilla/5.0"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read()


def playlist_id(url):
    m = re.search(r"playlist[/:]([A-Za-z0-9]{22})", url)
    if not m:
        sys.exit(f"Spotify 플레이리스트 링크가 아님: {url}")
    return m.group(1)


def rgb(c):
    return f"#{c['red']:02x}{c['green']:02x}{c['blue']:02x}" if c else None


def fetch_spotify(pid):
    html = get(f"https://open.spotify.com/embed/playlist/{pid}").decode("utf-8")
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
    if not m:
        sys.exit("임베드 페이지 구조가 바뀐 듯함 (__NEXT_DATA__ 없음)")
    e = json.loads(m.group(1))["props"]["pageProps"]["state"]["data"]["entity"]
    vi = e.get("visualIdentity") or {}
    images = sorted(vi.get("image") or [], key=lambda i: i.get("maxWidth") or 0)
    tracks = []
    for t in e.get("trackList", []):
        tid = t["uri"].split(":")[-1]
        tracks.append({
            "id": tid,
            "title": t["title"],
            "artists": t.get("subtitle", ""),
            "duration_ms": t.get("duration"),
            "explicit": t.get("isExplicit", False),
            "preview": (t.get("audioPreview") or {}).get("url"),
        })
    return {
        "id": pid,
        "url": f"https://open.spotify.com/playlist/{pid}",
        "name": e.get("name"),
        "owner": e.get("subtitle"),
        "images": [i["url"] for i in images],
        "colors": {
            "bg": rgb(vi.get("backgroundBase")),
            "bg_tint": rgb(vi.get("backgroundTintedBase")),
            "text_sub": rgb(vi.get("textSubdued")),
        },
        "track_count_fetched": len(tracks),
    }, tracks


def save_cover(slug, images):
    if not images:
        return None
    # 300px 쯤을 고른다 (64 / 300 / 640 중 가운데)
    url = images[len(images) // 2] if len(images) > 1 else images[0]
    img_id = url.rstrip("/").split("/")[-1]
    out = ASSETS / slug / "cover.jpg"
    out.write_bytes(get(f"https://i.scdn.co/image/{img_id}"))
    return f"assets/{slug}/cover.jpg"


def save_qr(slug, url):
    import segno
    qr = segno.make(url, error="m")
    qr.save(ASSETS / slug / "qr.svg", scale=1, border=2, dark="#000", light="#fff")
    qr.save(ASSETS / slug / "qr.png", scale=20, border=2, dark="#000", light="#fff")
    return {"svg": f"assets/{slug}/qr.svg", "png": f"assets/{slug}/qr.png"}


def reindex():
    items = []
    for f in sorted(DATA.glob("*.json")):
        p = json.loads(f.read_text(encoding="utf-8"))
        items.append({k: p.get(k) for k in ("slug", "vol", "date", "title", "type", "curator", "cover")}
                     | {"tracks": len(p.get("tracks", []))})
    items.sort(key=lambda p: p.get("date") or "", reverse=True)
    (ROOT / "data" / "index.json").write_text(
        json.dumps({"playlists": items}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"index.json: {len(items)}개")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url", nargs="?")
    ap.add_argument("--slug")
    ap.add_argument("--title")
    ap.add_argument("--date", help="인스타 게시일 YYYY-MM-DD")
    ap.add_argument("--vol", type=int)
    ap.add_argument("--curator", help="큐레이터 이름")
    ap.add_argument("--handle", help="큐레이터 인스타 아이디 (@ 없이)")
    ap.add_argument("--editor", action="store_true", help="Editor's playlist")
    ap.add_argument("--instagram", help="인스타 게시물 링크")
    ap.add_argument("--reindex", action="store_true")
    a = ap.parse_args()

    if a.reindex:
        return reindex()
    if not (a.url and a.slug):
        ap.error("url 과 --slug 는 필수")

    DATA.mkdir(parents=True, exist_ok=True)
    (ASSETS / a.slug).mkdir(parents=True, exist_ok=True)
    path = DATA / f"{a.slug}.json"
    old = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    old_tracks = {t["id"]: t for t in old.get("tracks", [])}

    sp, tracks = fetch_spotify(playlist_id(a.url))
    for n, t in enumerate(tracks, 1):
        prev = old_tracks.get(t["id"], {})
        t["comment"] = prev.get("comment", f"<곡 {n} 코멘트>")
        t["comment_by"] = prev.get("comment_by")

    curator = old.get("curator") or {}
    if a.editor:
        curator = {"name": "akks", "handle": "akks.kr"}
    if a.curator:
        curator = {"name": a.curator, "handle": a.handle}

    p = {
        "slug": a.slug,
        "vol": a.vol if a.vol is not None else old.get("vol"),
        "date": a.date or old.get("date"),
        "title": a.title or old.get("title") or sp["name"],
        "type": "editor" if a.editor else old.get("type", "guest"),
        "curator": curator,
        "intro": old.get("intro", "<캡션 텍스트>"),
        "instagram": a.instagram or old.get("instagram"),
        "cover": save_cover(a.slug, sp["images"]) or old.get("cover"),
        "qr": save_qr(a.slug, sp["url"]),
        "spotify": sp,
        "tracks": tracks,
    }
    path.write_text(json.dumps(p, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{path.relative_to(ROOT)}: 곡 {len(tracks)}개")
    reindex()


if __name__ == "__main__":
    main()
