// 북차사랑의 숨은 숲 지도 — 숲지도 로직
// 흐름: 테마 리스트 → 테마 클릭 시 제주 숲 지도에 핀 → 핀 클릭 시 추천 숲길 카드

let DATA = null;

const $ = (sel) => document.querySelector(sel);

// ── 초기화 ──────────────────────────────────────────
async function init() {
  const res = await fetch("data/forests.json", { cache: "no-store" });
  DATA = await res.json();

  renderThemeGrid();
  document.body.dataset.screen = "menu"; // 첫 화면 배경
  speak(DATA.intro || "");

  // 뒤로가기 버튼
  document.querySelectorAll("[data-back]").forEach((btn) =>
    btn.addEventListener("click", () => showScreen(btn.dataset.back))
  );
}

// ── 1단계: 테마 리스트 ──────────────────────────────
function renderThemeGrid() {
  const grid = $("#menuGrid");
  grid.innerHTML = "";

  DATA.themes.forEach((theme, i) => {
    const card = document.createElement("div");
    card.className = "menu-card";
    card.style.animationDelay = `${i * 0.07}s`; // 위에서부터 순차 등장

    // 버튼 이미지 자체에 아이콘+문구가 이미 그려져 있음(802×90) — 이미지가 곧 버튼.
    // 이미지가 없거나 로드 실패하면 텍스트 알약으로 대체
    const thumb = theme.image
      ? `<img src="${theme.image}" alt="${theme.name}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'menu-card-fallback',textContent:'${theme.emoji || "🌲"} ${theme.name}'}))">`
      : `<div class="menu-card-fallback">${theme.emoji || "🌲"} ${theme.name}</div>`;

    card.innerHTML = `<div class="menu-thumb">${thumb}</div>`;
    card.addEventListener("click", () => openMap(theme));
    grid.appendChild(card);
  });
}

// ── 2단계: 제주 숲 지도 + 핀 ──────────────────────────
function openMap(theme) {
  const tagImg = $("#mapTagImg");
  tagImg.style.display = ""; // 이전 테마에서 로드 실패로 숨겨졌을 수 있으니 초기화
  tagImg.alt = theme.name;
  tagImg.src = `assets/titles/${theme.id}.png`;
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
    pin.style.animationDelay = `${0.15 + i * 0.12}s`; // 핀 순차 낙하
    pin.innerHTML = `<div class="pin-dot"></div><div class="pin-label">${f.name}</div>`;
    pin.addEventListener("click", () => openDetail(f));
    pins.appendChild(pin);
  });

  // 새 테마로 들어오면 추천 숲길 패널은 핀을 클릭하기 전까지 숨김
  $("#recommendList").innerHTML = "";
  $(".recommend-card").classList.remove("is-open");

  showScreen("map");
}

// ── 3단계: 숲 상세 (지도 핀 클릭 시 추천 숲길 패널 자리에 표시) ──
function openDetail(f) {
  const photo = f.photo
    ? `<img class="reco-photo" src="${f.photo}" alt="${f.name}">`
    : `<div class="reco-photo placeholder">🌳</div>`;

  const tags = (f.tags || []).slice(0, 3).map((t) => `<span class="reco-tag">${t}</span>`).join("");

  $("#recommendList").innerHTML = `
    <div class="reco-card"${f.naverPlaceUrl ? ' role="link" tabindex="0"' : ""}>
      <img class="reco-item-bg" src="assets/reco_item.png" alt="" onerror="this.style.display='none'">
      <div class="reco-card-inner">
        ${photo}
        <div class="reco-body">
          <div class="reco-name">${f.name}</div>
          <div class="reco-meta">📍 ${f.address || ""} ${f.hours ? "· " + f.hours : ""}</div>
          <div class="reco-tags">${tags}</div>
        </div>
      </div>
    </div>
  `;

  // 카드 아무 곳이나 클릭하면 네이버 지도로 이동
  if (f.naverPlaceUrl) {
    const recoCard = $(".reco-card");
    recoCard.addEventListener("click", () => window.open(f.naverPlaceUrl, "_blank", "noopener"));
  }

  // 다시 열어도 애니메이션이 새로 보이도록 리플로우 후 클래스 추가
  const card = $(".recommend-card");
  card.classList.remove("is-open");
  void card.offsetWidth;
  card.classList.add("is-open");
}

// ── 북차사랑 말하기 (타이핑 + 입 모션) ───────────────
let speakTimer = null;
function speak(text) {
  const span = $("#speechText");
  const img = $("#charImg");
  clearInterval(speakTimer);

  span.textContent = "";
  if (!text) { img.classList.remove("talking"); return; }

  // 대사 박스(395×117)에 맞춰 글자 수가 많으면 폰트를 자동으로 살짝 줄임
  const base = 25;
  const size = Math.round(Math.min(base, Math.max(16, base * Math.sqrt(46 / text.length))));
  span.parentElement.style.fontSize = `${size}px`;

  img.classList.add("talking");
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  span.parentElement.appendChild(cursor);

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

// ── 1080×1920 고정 스케일 ─────────────────────────────
function fitScreen() {
  const s = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
  document.getElementById("app").style.transform = `scale(${s})`;
}
window.addEventListener("resize", fitScreen);
fitScreen();
