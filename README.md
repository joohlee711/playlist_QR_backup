# akks playlist archive

akks 인스타에 올린 플레이리스트를 모아 보는 정적 페이지. 빌드 없음 — `index.html`, `style.css`, `app.js` + `data/`.

## 구조
- `data/index.json` — 메인 그리드 목록 (스크립트가 자동 생성)
- `data/playlists/<slug>.json` — 플리 1개. `intro`(캡션), `tracks[].comment` / `comment_by`(곡 코멘트)는 직접 채움
- `assets/<slug>/` — 커버(300px JPEG 백업), QR(svg/png, Spotify 링크)

## 플리 추가
```bash
pip install segno
python3 scripts/add_playlist.py "<spotify 링크>" --slug 2026-11-mono-lens \
  --title "왼손잡이 덥스텝" --curator "Mono Lens" --handle mono_lens_ \
  --date 2026-11-25 --instagram "<인스타 게시물 링크>"
```
Editor's playlist면 `--curator` 대신 `--editor`. 같은 slug로 다시 돌리면 손으로 쓴 소개글·코멘트는 유지하고 Spotify 데이터만 갱신.

Spotify 곡 정보는 API 키 없이 공개 임베드 페이지에서 읽는다 (최대 100곡, 비공식이라 구조가 바뀌면 깨질 수 있음).

## 로컬 미리보기
```bash
python3 -m http.server
```
