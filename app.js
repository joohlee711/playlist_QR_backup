// akks playlist archive — 정적 페이지. 라우트: #/ (목록), #/p/<slug> (상세)
const app = document.getElementById("app");
const TRACK_PAGE = 20;
const state = { year: "all", type: "all", curator: null };
let index = null;
let audio = null;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (d) => (d ? d.replaceAll("-", ".") : "");
const fmtDur = (ms) => {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const byLabel = (p) => (p.type === "editor" ? "Editor's playlist" : p.curator?.name || "");
const metaLine = (p) => [p.vol ? `Vol.${String(p.vol).padStart(2, "0")}` : "", fmtDate(p.date)]
  .filter(Boolean).join(" · ");

async function getJSON(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

function stopAudio() {
  if (audio) { audio.pause(); audio = null; }
}

/* ---------------- 목록 ---------------- */
function renderList() {
  const all = index.playlists;
  if (!all.length) {
    app.innerHTML = `<p class="empty">아직 올라간 플레이리스트가 없어요.</p>`;
    return;
  }
  const years = [...new Set(all.map((p) => (p.date || "").slice(0, 4)).filter(Boolean))].sort().reverse();
  const hasEditor = all.some((p) => p.type === "editor");

  const list = all.filter((p) =>
    (state.year === "all" || (p.date || "").startsWith(state.year)) &&
    (state.type === "all" || p.type === state.type) &&
    (!state.curator || (p.type !== "editor" && p.curator?.name === state.curator)));

  const chip = (group, value, label) =>
    `<button class="chip" data-g="${group}" data-v="${esc(value)}" aria-pressed="${state[group] === value}">${esc(label)}</button>`;

  app.innerHTML = `
    <div class="filters">
      ${chip("year", "all", "전체")}
      ${years.map((y) => chip("year", y, y)).join("")}
      ${hasEditor ? `<span style="width:8px"></span>${chip("type", "guest", "Selected by")}${chip("type", "editor", "Editor's")}` : ""}
      ${state.curator ? `<button class="chip clear" data-clear>${esc(state.curator)} ✕</button>` : ""}
    </div>
    <div class="count">${list.length}개의 플레이리스트</div>
    ${list.length ? `<div class="grid">${list.map((p) => `
      <a class="card" href="#/p/${encodeURIComponent(p.slug)}">
        <img class="cover" src="${esc(p.cover)}" alt="" loading="lazy" width="300" height="300">
        <div class="meta">${esc(metaLine(p))}</div>
        <div class="title">${esc(p.title)}</div>
        <div class="by">${p.type === "editor" ? "Editor's playlist" : `selected by ${esc(p.curator?.name)}`}</div>
      </a>`).join("")}</div>` : `<p class="empty">조건에 맞는 플레이리스트가 없어요.</p>`}
  `;

  app.querySelectorAll(".chip[data-g]").forEach((b) => b.addEventListener("click", () => {
    const g = b.dataset.g, v = b.dataset.v;
    state[g] = state[g] === v && g === "type" ? "all" : v;
    if (g === "type" && v === "editor") state.curator = null;
    renderList();
  }));
  app.querySelector("[data-clear]")?.addEventListener("click", () => { state.curator = null; renderList(); });
}

/* ---------------- 상세 ---------------- */
async function renderDetail(slug) {
  app.innerHTML = `<p class="empty">불러오는 중…</p>`;
  let p;
  try { p = await getJSON(`data/playlists/${encodeURIComponent(slug)}.json`); }
  catch { app.innerHTML = `<p class="err">플레이리스트를 찾을 수 없어요. <a href="#/">목록으로</a></p>`; return; }
  document.title = `${p.title} — akks playlist archive`;

  const handle = p.curator?.handle;
  const selected = p.type === "editor"
    ? `<div class="selected">Editor's playlist</div>`
    : `<div class="selected">Selected<i>by</i><button data-curator="${esc(p.curator?.name)}">${esc(p.curator?.name)}</button>
       ${handle ? ` <a href="https://www.instagram.com/${esc(handle)}/" target="_blank" rel="noopener" style="color:var(--sub);font-size:13px">@${esc(handle)}</a>` : ""}</div>`;

  const trackRow = (t, i) => `
    <li class="track" data-open="false">
      <button aria-expanded="false">
        <span class="no">${String(i + 1).padStart(2, "0")}</span>
        <span><span class="tt">${esc(t.title)}</span><span class="ar">${esc(t.artists)}</span></span>
        <span class="dur">${fmtDur(t.duration_ms)}</span>
        <span class="tog" aria-hidden="true">+</span>
      </button>
      <div class="body">
        ${t.comment ? `<p class="comment">${esc(t.comment)}</p>` : ""}
        ${t.comment_by ? `<p class="comment-by">— ${esc(t.comment_by)}</p>` : ""}
        <div class="tlinks">
          ${t.preview ? `<button data-preview="${esc(t.preview)}">30초 미리듣기</button>` : ""}
          <a href="https://open.spotify.com/track/${esc(t.id)}" target="_blank" rel="noopener">Spotify에서 듣기</a>
        </div>
      </div>
    </li>`;

  app.innerHTML = `
    <a class="back" href="#/">← 목록</a>
    <div class="hero">
      <img class="cover" src="${esc(p.cover)}" alt="${esc(p.title)} 커버" width="300" height="300">
      <div>
        <div class="meta">${esc(metaLine(p))} · ${p.tracks.length}곡</div>
        ${selected}
        <h1 class="ptitle"><mark>${esc(p.title)}</mark></h1>
        <span class="ptag">PLAYLIST</span>
        <div class="actions">
          <a class="btn primary" href="${esc(p.spotify.url)}" target="_blank" rel="noopener">Spotify에서 열기</a>
          ${p.instagram ? `<a class="btn" href="${esc(p.instagram)}" target="_blank" rel="noopener">인스타에서 보기</a>` : ""}
        </div>
      </div>
    </div>

    <section class="block">
      <h2>소개</h2>
      <p class="intro">${esc(p.intro)}</p>
    </section>

    <section class="block">
      <h2>트랙 ${p.tracks.length}</h2>
      <ol class="tracks">${p.tracks.slice(0, TRACK_PAGE).map(trackRow).join("")}</ol>
      ${p.tracks.length > TRACK_PAGE ? `<button class="more">나머지 ${p.tracks.length - TRACK_PAGE}곡 더 보기</button>` : ""}
    </section>

    <section class="block">
      <h2>QR</h2>
      <div class="qr">
        <img src="${esc(p.qr.svg)}" alt="Spotify 플레이리스트 QR 코드" width="140" height="140">
        <div>
          <p>찍으면 Spotify 플레이리스트로 바로 연결돼요.</p>
          <div class="actions" style="margin-top:0">
            <a class="btn" href="${esc(p.qr.png)}" download="${esc(p.slug)}-qr.png">PNG 저장</a>
            <a class="btn" href="${esc(p.qr.svg)}" download="${esc(p.slug)}-qr.svg">SVG 저장</a>
          </div>
        </div>
      </div>
    </section>
  `;

  const ol = app.querySelector(".tracks");
  ol.addEventListener("click", (e) => {
    const pv = e.target.closest("[data-preview]");
    if (pv) {
      const was = pv.classList.contains("playing");
      stopAudio();
      ol.querySelectorAll(".playing").forEach((x) => { x.classList.remove("playing"); x.textContent = "30초 미리듣기"; });
      if (!was) {
        audio = new Audio(pv.dataset.preview);
        audio.play();
        pv.classList.add("playing"); pv.textContent = "■ 정지";
        audio.addEventListener("ended", () => { pv.classList.remove("playing"); pv.textContent = "30초 미리듣기"; });
      }
      return;
    }
    const head = e.target.closest(".track > button");
    if (!head) return;
    const li = head.parentElement, open = li.dataset.open !== "true";
    li.dataset.open = open; head.setAttribute("aria-expanded", open);
    head.querySelector(".tog").textContent = open ? "−" : "+";
  });
  app.querySelector(".more")?.addEventListener("click", (e) => {
    ol.insertAdjacentHTML("beforeend", p.tracks.slice(TRACK_PAGE).map((t, i) => trackRow(t, i + TRACK_PAGE)).join(""));
    e.currentTarget.remove();
  });
  app.querySelector("[data-curator]")?.addEventListener("click", (e) => {
    Object.assign(state, { year: "all", type: "all", curator: e.currentTarget.dataset.curator });
    location.hash = "#/";
  });
}

/* ---------------- 라우터 ---------------- */
async function route() {
  stopAudio();
  window.scrollTo(0, 0);
  const m = location.hash.match(/^#\/p\/(.+)$/);
  if (m) return renderDetail(decodeURIComponent(m[1]));
  document.title = "akks playlist archive";
  try { index ??= await getJSON("data/index.json"); }
  catch { app.innerHTML = `<p class="err">목록을 불러오지 못했어요.</p>`; return; }
  renderList();
}
window.addEventListener("hashchange", route);
route();
