# CLAUDE.md — akks playlist archive

음악 매거진 akks가 인스타그램에 올린 큐레이션 플레이리스트를 아카이빙하는 정적 사이트.
GitHub Pages(main 브랜치, 루트)로 배포: https://joohlee711.github.io/playlist_QR_backup/

## 작업하는 사람
**비개발자.** JSON·git·터미널을 모르고 IDE도 없음. **Claude Code 클라우드 세션**(claude.ai/code 웹 또는 앱)으로만 작업한다. 사용자 컴퓨터에는 아무것도 설치하지 않는다.
- 설명은 쉬운 한국어로. 파일 내용이나 JSON을 보여주지 말고 "무엇이 바뀌었는지"를 말로 요약.
- 명령어를 사용자에게 시키지 말고 직접 실행한다.
- 사용자는 README를 거의 안 읽는다. "플리 올릴래" 한마디로 시작한다고 가정한다.

## 클라우드 환경
- 필요한 외부 접속: `open.spotify.com`(곡 정보), `i.scdn.co`(커버). 패키지 매니저(pip)는 기본 허용.
- 스포티파이 접속이 프록시에 막히면, 환경 도구(get_environment → create_environment 또는 update_environment)로 위 두 호스트만 허용하는 이 레포용 개인 환경을 제안한다. 사용자는 승인 창에서 허용만 누르면 된다고 미리 한 줄 알려준다.
- `segno`가 없으면 `pip install segno`.

## 대화 방식: "플리 올릴래"
템플릿 없이 짧게 말을 걸어오면 **한 번에 하나씩** 물어본다. 질문 하나 = 메시지 하나.
1. 스포티파이 링크 → 받자마자 스크립트로 곡 정보를 가져와서 "○○ 플리, ○곡 맞죠?"로 확인
2. 인스타 게시물 링크 (없으면 나중에 넣어도 된다고 안내)
3. 게시 날짜 (모르면 오늘 날짜를 제안)
4. 플리 제목
5. 큐레이터 이름·인스타 아이디, 또는 에디터 플리인지
6. 캡션 (복붙)
7. 곡 코멘트 — "원고 복붙이나 슬라이드 스크린샷 주시면 제가 곡에 맞춰 넣을게요". 다 받으면 어느 곡에 어떤 코멘트가 들어갔는지 짧게 보여주고 확인
8. 미리보기 → "올릴까요?" → 확인 받으면 푸시
- 사용자가 템플릿(SETUP.md 참고)으로 한 번에 주면 이미 받은 항목은 건너뛴다.
- 중간에 "그만" / "취소할래"면 아무것도 푸시하지 않고 로컬 변경을 되돌린다.
- 고치기 요청("○○ 고칠래")도 같은 식으로 무엇을 어떻게 바꿀지 하나씩 묻는다.

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
6. 미리보기: 사용자는 컨테이너의 localhost를 열 수 없다. `python3 -m http.server 8000`을 띄우고 Playwright(사전 설치됨)로 모바일 크기(iPhone 13) 스크린샷을 찍어 **목록 화면과 상세 화면(코멘트 1~2개 펼친 상태)** 을 사용자에게 파일로 보여준다. Pretendard CDN이 막혀 기본 폰트로 보일 수 있다고 한 줄 알린다.
7. 사용자가 "올려줘"라고 하면 그것을 main 푸시 허락으로 보고 main에 커밋·푸시. 커밋 메시지는 한국어로 짧게 (예: `플리 추가: 왼손잡이 덥스텝 (Mono Lens)`). 1~2분 뒤 사이트 반영된다고 안내. (세션이 작업 브랜치+PR 방식을 요구하면 PR을 만들고, 사용자 허락을 받아 바로 머지까지 한다.)

## 수정/삭제
- 텍스트 수정: 해당 JSON만 고치고(필요하면 `--reindex`) 미리보기 → 확인 → 푸시.
- Spotify 곡 목록이 바뀌어 다시 가져올 때: 같은 slug로 스크립트 재실행. 손으로 쓴 `intro`/`comment`/`comment_by`는 곡 ID 기준으로 유지된다.
- 삭제: `data/playlists/<slug>.json`과 `assets/<slug>/` 삭제 후 `--reindex`. 삭제 전 사용자에게 한 번 확인.

## 되돌리기 ("방금 올린 거 취소해줘")
- `git revert <커밋>`으로 새 커밋을 만들어 되돌리고 main에 푸시. **`reset --hard`나 force push는 쓰지 않는다** (기록이 사라지고 다른 사람 작업을 덮을 수 있음).
- "방금" = 이 사용자가 마지막으로 푸시한 커밋. 대상이 애매하면 최근 커밋 몇 개를 쉬운 말(날짜·플리 제목)로 보여주고 고르게 한다.
- 되돌린 뒤 무엇이 원래대로 돌아갔는지 한 줄로 알려준다.

## 처음 준비 / 권한 창
- 첫 세션에서: 스포티파이 접속 확인(막히면 위 '클라우드 환경'대로 환경 제안), `pip install segno`, main 푸시 권한(협업자 초대 수락 여부)을 확인하고 "준비 끝"이라고 알린다. 사용자 컴퓨터에 설치를 시키지 않는다.
- 명령 실행 전 권한 창이 뜰 때마다 사용자는 낯선 영어 명령어를 보게 된다. 처음 몇 번은 실행 전에 "지금 ○○하려고 허용을 물어볼 거야"라고 한 줄로 미리 말해준다.

## 디자인 규칙 (사이트 수정 요청 시)
- 폰트: Pretendard Variable dynamic subset (jsDelivr CDN)
- 검정 바탕. 노랑 `#eef03a`는 포인트로만(Spotify 버튼, 제목 하이라이트, 활성 표시)
- **모서리 둥글게 금지** — 버튼·칩·이미지 전부 각지게 (`border-radius: 0`)
- 텍스트 위주. 곡별 앨범아트·영상 등 무거운 에셋은 넣지 않는다. 이미지는 플리 커버 1장
- 모바일 우선 (그리드 2열 → 3열 → 4열)

## 데이터 형식 참고 (`data/playlists/<slug>.json`)
`slug, vol(null 가능), date, title, type("guest"|"editor"), curator{name, handle}, intro, instagram, cover, qr{svg,png}, spotify{id,url,name,owner,images,colors}, tracks[{id,title,artists,duration_ms,explicit,preview,comment,comment_by}]`
