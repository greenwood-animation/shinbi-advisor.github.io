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

  resetMapZoom();
  showScreen("map");
}

// ── 3단계: 식당 상세 (지도 핀 클릭 시 추천 맛집 패널 자리에 표시) ──
function openDetail(r) {
  const photo = r.photo
    ? `<img class="reco-photo" src="${r.photo}" alt="${r.name}">`
    : `<div class="reco-photo placeholder">🍴</div>`;

  const prices = (r.menu || [])
    .map((m) => Number(String(m.price).replace(/[^0-9]/g, "")))
    .filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices).toLocaleString() : "";
  const tags = (r.menu || []).slice(0, 3).map((m) => `<span class="reco-tag">${m.name}</span>`).join("");

  $("#recommendList").innerHTML = `
    <div class="reco-card"${r.naverPlaceUrl ? ' role="link" tabindex="0"' : ""}>
      <img class="reco-item-bg" src="assets/reco_item.png" alt="" onerror="this.style.display='none'">
      <div class="reco-card-inner">
        ${photo}
        <div class="reco-body">
          <div class="reco-name">${r.name}</div>
          <div class="reco-meta">📍 ${r.address || ""} ${r.hours ? "· " + r.hours : ""}</div>
          <div class="reco-tags">${tags}</div>
          ${minPrice ? `<div class="reco-price">₩${minPrice}~</div>` : ""}
        </div>
      </div>
    </div>
  `;

  // 카드 아무 곳이나 클릭하면 네이버 지도로 이동
  if (r.naverPlaceUrl) {
    const recoCard = $(".reco-card");
    recoCard.addEventListener("click", () => window.open(r.naverPlaceUrl, "_blank", "noopener"));
  }

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

  // 대사 박스(395×117)에 맞춰 글자 수가 많으면 폰트를 자동으로 살짝 줄임
  const base = 25; // 기준 폰트(px), 기준 글자 수(46자) 이하면 그대로
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

// ── 지도 확대/축소 + 이동 (마우스 휠·드래그, 터치 핀치·드래그) ──────
// .map-frame(투명 창, overflow:hidden) 안에서 #mapWrap을 transform으로 확대/이동시킴.
// 드래그·핀치 중에는 다음 클릭 1번을 무시해서 핀이 실수로 눌리는 걸 막음.
let resetMapZoom = () => {};
(function initMapZoom() {
  const frame = document.querySelector(".map-frame");
  const wrap = document.getElementById("mapWrap");
  if (!frame || !wrap) return;

  const MIN_SCALE = 1, MAX_SCALE = 2.5;
  let scale = 1, panX = 0, panY = 0;
  let suppressNextClick = false;

  wrap.style.transformOrigin = "0 0";
  frame.style.touchAction = "none";

  function apply() {
    wrap.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }
  function clampPan() {
    const w = wrap.offsetWidth * scale, h = wrap.offsetHeight * scale;
    const minX = Math.min(0, frame.clientWidth - w), minY = Math.min(0, frame.clientHeight - h);
    panX = Math.min(0, Math.max(panX, minX));
    panY = Math.min(0, Math.max(panY, minY));
  }
  function zoomAt(clientX, clientY, newScale) {
    newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    const rect = frame.getBoundingClientRect();
    const cx = clientX - rect.left, cy = clientY - rect.top;
    panX = cx - ((cx - panX) / scale) * newScale;
    panY = cy - ((cy - panY) / scale) * newScale;
    scale = newScale;
    clampPan();
    apply();
  }
  resetMapZoom = () => { scale = 1; panX = 0; panY = 0; apply(); };

  frame.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, scale * (1 - e.deltaY * 0.0015));
  }, { passive: false });

  // 마우스 드래그 이동
  let dragging = false, dragMoved = false, startX = 0, startY = 0, startPanX = 0, startPanY = 0;
  frame.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return; // 터치는 아래 touch 이벤트에서 처리
    if (e.target.closest(".pin")) return; // 핀 위에서 시작한 클릭은 지도 이동 로직을 타지 않음
    e.preventDefault(); // 기본 이미지 드래그/텍스트 선택(파란 하이라이트) 방지
    dragging = true; dragMoved = false;
    startX = e.clientX; startY = e.clientY;
    startPanX = panX; startPanY = panY;
    frame.setPointerCapture(e.pointerId);
  });
  frame.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
    if (dragMoved) { panX = startPanX + dx; panY = startPanY + dy; clampPan(); apply(); }
  });
  frame.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    if (dragMoved) suppressNextClick = true;
  });

  // 드래그/핀치 직후 첫 클릭은 캡처 단계에서 가로채서 핀 오클릭 방지
  frame.addEventListener("click", (e) => {
    if (suppressNextClick) { e.stopPropagation(); e.preventDefault(); suppressNextClick = false; }
  }, true);

  // 터치: 한 손가락 드래그 이동 + 두 손가락 핀치 줌
  let touchMode = null, touchMoved = false;
  let touchStartX = 0, touchStartY = 0, touchStartPanX = 0, touchStartPanY = 0;
  let pinchStartDist = 0, pinchStartScale = 1;
  const dist = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  const mid = (t1, t2) => ({ x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 });

  frame.addEventListener("touchstart", (e) => {
    if (e.target.closest(".pin")) return; // 핀 위에서 시작한 터치는 지도 이동 로직을 타지 않음
    if (e.touches.length === 1) {
      touchMode = "pan"; touchMoved = false;
      touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
      touchStartPanX = panX; touchStartPanY = panY;
    } else if (e.touches.length === 2) {
      touchMode = "pinch";
      pinchStartDist = dist(e.touches[0], e.touches[1]);
      pinchStartScale = scale;
    }
  }, { passive: true });
  frame.addEventListener("touchmove", (e) => {
    if (touchMode === "pan" && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - touchStartX, dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) touchMoved = true;
      if (touchMoved) { panX = touchStartPanX + dx; panY = touchStartPanY + dy; clampPan(); apply(); }
    } else if (touchMode === "pinch" && e.touches.length === 2) {
      e.preventDefault();
      const d = dist(e.touches[0], e.touches[1]);
      const m = mid(e.touches[0], e.touches[1]);
      zoomAt(m.x, m.y, pinchStartScale * (d / pinchStartDist));
      touchMoved = true;
    }
  }, { passive: false });
  frame.addEventListener("touchend", () => {
    if (touchMoved) suppressNextClick = true;
    touchMode = null; touchMoved = false;
  });

  // 더블클릭/더블탭: 확대 ↔ 원상태 토글
  frame.addEventListener("dblclick", (e) => {
    if (scale > 1.01) resetMapZoom();
    else zoomAt(e.clientX, e.clientY, 2);
  });
})();

init();

// ── 1080×1920 고정 스케일 ─────────────────────────────
function fitScreen() {
  const s = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
  document.getElementById("app").style.transform = `scale(${s})`;
}
window.addEventListener("resize", fitScreen);
fitScreen();
