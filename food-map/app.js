// 신비할망의 바당 맛 지도 — 맛집지도 로직
// 흐름: 메뉴 그리드 → 메뉴 클릭 시 제주 지도에 핀 → 핀 클릭 시 상세 패널

let DATA = null;

const $ = (sel) => document.querySelector(sel);

// ── 초기화 ──────────────────────────────────────────
async function init() {
  const res = await fetch("data/restaurants.json", { cache: "no-store" });
  DATA = await res.json();

  renderMenuGrid();
  document.body.dataset.screen = "menu"; // 첫 화면 배경
  speak(DATA.intro || "");

  // 뒤로가기 버튼
  document.querySelectorAll("[data-back]").forEach((btn) =>
    btn.addEventListener("click", () => showScreen(btn.dataset.back))
  );
}

// ── 1단계: 메뉴 그리드 ──────────────────────────────
function renderMenuGrid() {
  const grid = $("#menuGrid");
  grid.innerHTML = "";

  DATA.menus.forEach((menu, i) => {
    const card = document.createElement("div");
    card.className = "menu-card";
    card.style.animationDelay = `${i * 0.07}s`; // 왼쪽 위부터 순차 등장

    // 이미지가 있으면 이미지, 없으면 이모지 폴백 (이름 텍스트는 이미지 안에 포함됨)
    const thumb = menu.image
      ? `<img src="${menu.image}" alt="${menu.name}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${menu.emoji || "🍽️"}'}))">`
      : (menu.emoji || "🍽️");

    card.innerHTML = `<div class="menu-thumb">${thumb}</div>`;
    card.addEventListener("click", () => openMap(menu));
    grid.appendChild(card);
  });
}

// ── 2단계: 제주 지도 + 핀 ──────────────────────────
function openMap(menu) {
  speak(menu.desc || "");
  setMapFood(menu.id);

  const pins = $("#pins");
  pins.innerHTML = "";

  const list = menu.restaurants || [];
  $("#mapEmpty").hidden = list.length > 0;

  list.forEach((r, i) => {
    const pin = document.createElement("div");
    pin.className = "pin";
    pin.style.left = `${r.x}%`;
    pin.style.top = `${r.y}%`;
    pin.style.animationDelay = `${0.15 + i * 0.12}s`; // 핀 순차 낙하
    pin.innerHTML = `<div class="pin-dot"></div><div class="pin-label">${r.name}</div>`;
    pin.addEventListener("click", () => openDetail(r));
    pins.appendChild(pin);
  });

  // 새 메뉴로 들어오면 추천 맛집 패널은 핀을 클릭하기 전까지 숨김
  $("#recommendList").innerHTML = "";
  $(".recommend-card").classList.remove("is-open");

  showScreen("map");
}

// ── 3단계: 식당 상세 (지도 핀 클릭 시 추천 맛집 패널 자리에 표시) ──
function openDetail(r) {
  const photo = r.photo
    ? `<img class="detail-photo" src="${r.photo}" alt="${r.name}">`
    : `<div class="detail-photo placeholder">🍴</div>`;

  const menuRows = (r.menu || [])
    .map((m) => `<tr><td>${m.name}</td><td class="price">${m.price}원</td></tr>`)
    .join("");

  $("#recommendList").innerHTML = `
    ${photo}
    <div class="detail-name">${r.name}</div>
    ${r.rating ? `<div class="detail-rating">★ ${r.rating}</div>` : ""}
    <div class="detail-info">
      ${r.address ? `<div class="row"><span class="ic">📍</span><span>${r.address}</span></div>` : ""}
      ${r.hours ? `<div class="row"><span class="ic">🕒</span><span>${r.hours}</span></div>` : ""}
      ${r.phone ? `<div class="row"><span class="ic">📞</span><span>${r.phone}</span></div>` : ""}
    </div>
    ${menuRows ? `<div class="detail-menu"><h3>메뉴</h3><table>${menuRows}</table></div>` : ""}
    ${r.naverPlaceUrl ? `<a class="naver-btn" href="${r.naverPlaceUrl}" target="_blank" rel="noopener">네이버 지도에서 보기 →</a>` : ""}
  `;

  // 다시 열어도 애니메이션이 새로 보이도록 리플로우 후 클래스 추가
  const card = $(".recommend-card");
  card.classList.remove("is-open");
  void card.offsetWidth;
  card.classList.add("is-open");
}

// 지도 화면: 순덕이가 들고 있는 음식(메뉴별, assets/음식/<id>.png)
function setMapFood(id) {
  const img = $("#mapFoodImg");
  if (!id) { img.removeAttribute("src"); return; }
  img.src = `assets/음식/${id}.png`;
}

// ── 순덕 말하기 (타이핑 + 입 모션) ──────────────────
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
