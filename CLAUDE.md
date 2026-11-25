# CLAUDE.md — akks playlist archive

음악 매거진 akks가 인스타그램에 올린 큐레이션 플레이리스트를 아카이빙하는 정적 사이트.
GitHub Pages(main 브랜치, 루트)로 배포: https://joohlee711.github.io/playlist_QR_backup/

## 작업하는 사람
**비개발자.** JSON·git·터미널을 모르고 IDE도 없음. Claude 데스크톱 앱 Code 탭으로만 작업한다.
- 설명은 쉬운 한국어로. 파일 내용이나 JSON을 보여주지 말고 "무엇이 바뀌었는지"를 말로 요약.
- 명령어를 사용자에게 시키지 말고 직접 실행한다.
- 사용자가 README의 템플릿대로 정보를 주면 아래 절차를 끝까지 처리한다.

## 구조 (빌드 없음)
- `index.html`, `style.css`, `app.js` — 해시 라우팅 SPA. `#/` 목록, `#/p/<slug>` 상세
- `data/playlists/<slug>.json` — 플리 1개 (원본 데이터)
- `data/index.json` — 목록용. **직접 수정 금지**, 스크립트로 재생성
- `assets/<slug>/cover.jpg` (300px 백업), `qr.svg`, `qr.png` (Spotify 플리 링크)
- `scripts/add_playlist.py` — Spotify 공개 임베드 페이지(`open.spotify.com/embed/playlist/<id>`)의 `__NEXT_DATA__`를 읽음. API 키 불필요. 최대 100곡. 비공식이라 구조 변경 시 깨질 수 있음
- 의존성: Python 3, `pip install segno` (QR 생성)

## 새 플리 추가 절차
1. `git pull`로 최신화.
2. slug 정하기: `YYYY-MM-<큐레이터 영문 소문자-하이픈>` (예: `2026-11-mono-lens`, 에디터는 `2026-12-editor`). 같은 달 같은 큐레이터가 있으면 `-2`.
3. 스크립트 실행:
   ```bash
   python3 scripts/add_playlist.py "<spotify url>" --slug <slug> --title "<제목>" \
     --curator "<이름>" --handle <인스타아이디, @ 없이> --date YYYY-MM-DD --instagram "<게시물 url>"
   ```
   에디터 플리면 `--curator/--handle` 대신 `--editor`.
4. `data/playlists/<slug>.json` 직접 편집:
   - `intro`: 캡션 본문. 캡션 끝의 `❋ 아티스트 - 곡` 트랙리스트와 해시태그는 제외. 줄바꿈 유지(`\n`). 큐레이터 소개 문단도 그대로 둔다.
   - `tracks[].comment`: 곡 코멘트. 번호 순서가 아니라 **곡 제목/아티스트로 매칭**해서 넣고, 애매하면 사용자에게 확인. 코멘트가 없는 곡은 `""`로 비운다 (`<곡 N 코멘트>` 플레이스홀더를 남기지 말 것).
   - `tracks[].comment_by`: 코멘트 쓴 사람(크루 플리에서 `— Sejung` 같은 경우). 없으면 `null`.
   - 스크린샷에서 옮긴 경우 오타 가능성이 있다고 사용자에게 알린다.
5. 제목·날짜 등을 JSON에서 직접 바꿨으면 `python3 scripts/add_playlist.py --reindex`.
6. 미리보기: `python3 -m http.server 8000` 실행 후 `http://localhost:8000/#/p/<slug>`를 사용자가 열 수 있게 안내(또는 앱의 미리보기 기능 사용). 목록과 상세 둘 다 확인.
7. 사용자가 확인하면 main에 커밋·푸시. 커밋 메시지는 한국어로 짧게 (예: `플리 추가: 왼손잡이 덥스텝 (Mono Lens)`). 1~2분 뒤 사이트 반영된다고 안내.

## 수정/삭제
- 텍스트 수정: 해당 JSON만 고치고(필요하면 `--reindex`) 미리보기 → 확인 → 푸시.
- Spotify 곡 목록이 바뀌어 다시 가져올 때: 같은 slug로 스크립트 재실행. 손으로 쓴 `intro`/`comment`/`comment_by`는 곡 ID 기준으로 유지된다.
- 삭제: `data/playlists/<slug>.json`과 `assets/<slug>/` 삭제 후 `--reindex`. 삭제 전 사용자에게 한 번 확인.

## 디자인 규칙 (사이트 수정 요청 시)
- 폰트: Pretendard Variable dynamic subset (jsDelivr CDN)
- 검정 바탕. 노랑 `#eef03a`는 포인트로만(Spotify 버튼, 제목 하이라이트, 활성 표시)
- **모서리 둥글게 금지** — 버튼·칩·이미지 전부 각지게 (`border-radius: 0`)
- 텍스트 위주. 곡별 앨범아트·영상 등 무거운 에셋은 넣지 않는다. 이미지는 플리 커버 1장
- 모바일 우선 (그리드 2열 → 3열 → 4열)

## 데이터 형식 참고 (`data/playlists/<slug>.json`)
`slug, vol(null 가능), date, title, type("guest"|"editor"), curator{name, handle}, intro, instagram, cover, qr{svg,png}, spotify{id,url,name,owner,images,colors}, tracks[{id,title,artists,duration_ms,explicit,preview,comment,comment_by}]`
