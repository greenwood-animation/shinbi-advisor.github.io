// 북차사랑의 숨은 숲 지도 — 숲지도 로직
// 흐름: 테마 그리드 → 테마 클릭 시 제주 지도에 숲 핀 → 핀 클릭 시 상세

let DATA = null;

const $ = (sel) => document.querySelector(sel);

// ── 초기화 ──────────────────────────────────────────
async function init() {
  const res = await fetch("data/forests.json", { cache: "no-store" });
  DATA = await res.json();

  renderThemeGrid();
  document.body.dataset.screen = "menu"; // 첫 화면 배경
  speak(DATA.intro || "");

  document.querySelectorAll("[data-back]").forEach((btn) =>
    btn.addEventListener("click", () => showScreen(btn.dataset.back))
  );

  $("#detailClose").addEventListener("click", closeDetail);
  $("#overlay").addEventListener("click", closeDetail);
}

// ── 1단계: 테마 그리드 ──────────────────────────────
function renderThemeGrid() {
  const grid = $("#menuGrid");
  grid.innerHTML = "";

  DATA.themes.forEach((theme, i) => {
    const card = document.createElement("div");
    card.className = "menu-card";
    card.style.animationDelay = `${i * 0.05}s`;

    const thumb = theme.image
      ? `<img src="${theme.image}" alt="${theme.name}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${theme.emoji || "🌳"}'}))">`
      : (theme.emoji || "🌳");

    card.innerHTML = `
      <div class="menu-thumb">${thumb}</div>
      <div class="menu-name">${theme.name}</div>`;
    card.addEventListener("click", () => openMap(theme));
    grid.appendChild(card);
  });
}

// ── 2단계: 제주 숲 지도 + 핀 ────────────────────────
function openMap(theme) {
  $("#mapMenuName").textContent = theme.name;
  speak(theme.desc || "");

  const pins = $("#pins");
  pins.innerHTML = "";

  const list = theme.forests || [];
  $("#mapEmpty").hidden = list.length > 0;

  list.forEach((f, i) => {
    const pin = document.createElement("div");
    pin.className = "pin";
    pin.style.left = `${f.x}%`;
    pin.style.top = `${f.y}%`;
    pin.style.animationDelay = `${0.15 + i * 0.12}s`;
    pin.innerHTML = `<div class="pin-dot"></div><div class="pin-label">${f.name}</div>`;
    pin.addEventListener("click", () => openDetail(f));
    pins.appendChild(pin);
  });

  showScreen("map");
}

// ── 3단계: 숲 상세 ──────────────────────────────────
function openDetail(f) {
  const photo = f.photo
    ? `<img class="detail-photo" src="${f.photo}" alt="${f.name}">`
    : `<div class="detail-photo placeholder">🌳</div>`;

  const tags = (f.tags || [])
    .map((t) => `<span class="tag-chip">${t}</span>`)
    .join("");

  $("#detailBody").innerHTML = `
    ${photo}
    <div class="detail-name">${f.name}</div>
    ${f.rating ? `<div class="detail-rating">★ ${f.rating}</div>` : ""}
    ${tags ? `<div class="tag-row">${tags}</div>` : ""}
    <div class="detail-info">
      ${f.address ? `<div class="row"><span class="ic">📍</span><span>${f.address}</span></div>` : ""}
      ${f.hours ? `<div class="row"><span class="ic">🕒</span><span>${f.hours}</span></div>` : ""}
    </div>
    ${f.desc ? `<blockquote class="detail-quote">${f.desc}</blockquote>` : ""}
    ${f.naverPlaceUrl ? `<a class="naver-btn" href="${f.naverPlaceUrl}" target="_blank" rel="noopener">네이버 지도에서 보기 →</a>` : ""}
  `;

  $("#detailPanel").classList.add("is-open");
  $("#overlay").classList.add("is-open");
}

function closeDetail() {
  $("#detailPanel").classList.remove("is-open");
  $("#overlay").classList.remove("is-open");
}

// ── 북차사랑 말하기 (타이핑 + 입 모션) ───────────────
let speakTimer = null;
function speak(text) {
  const span = $("#speechText");
  const img = $("#charImg");
  clearInterval(speakTimer);

  span.textContent = "";
  if (!text) { img.classList.remove("talking"); return; }

  img.classList.add("talking");
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  $("#speechBubble").appendChild(cursor);

  let i = 0;
  speakTimer = setInterval(() => {
    span.textContent = text.slice(0, ++i);
    if (i >= text.length) {
      clearInterval(speakTimer);
      img.classList.remove("talking");
      cursor.remove();
    }
  }, 45);
}

// ── 화면 전환 ──────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("is-active"));
  $(`#screen-${name}`).classList.add("is-active");
  document.body.dataset.screen = name; // 화면별 장식 배경 적용용
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "menu" && DATA) speak(DATA.intro || "");
}

init();
