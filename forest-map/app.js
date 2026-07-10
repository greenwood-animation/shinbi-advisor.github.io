// 북차사랑의 숨은 숲 지도 — 숲지도 로직
// 흐름: 테마 리스트 → 테마 클릭 시 제주 숲 지도에 핀 → 핀 클릭 시 추천 숲길 카드

let DATA = null;

const $ = (sel) => document.querySelector(sel);

// 테마별 타이틀 이미지(assets/titles/<id>.png) 위치 — .map-card(63,604) 기준 로컬 좌표.
// 전부 같은 크기(1080×200)인데도 이미지 안 텍스트 위치가 제각각이라 테마마다 따로 지정.
const TAG_POS = {
  "quiet-trail":   { left: -387, top: -44 },
  "valley":        { left: -323, top: -44 },
  "sunset-oreum":  { left: -323, top: -44 },
  "walk-path":     { left: -330, top: -44 },
  "solo-rest":     { left: -324, top: -44 },
  "workout":       { left: -323, top: -44 },
};

// ── 초기화 ──────────────────────────────────────────
async function init() {
  const res = await fetch("data/forests.json", { cache: "no-store" });
  DATA = await res.json();

  renderThemeGrid();
  document.body.dataset.screen = "menu"; // 첫 화면 배경
  speak(DATA.intro || "", "#menuSpeechText");

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
  const pos = TAG_POS[theme.id] || { left: -323, top: -44 };
  tagImg.style.left = `${pos.left}px`;
  tagImg.style.top = `${pos.top}px`;
  speak(theme.desc || "", "#speechText", "#charImg");

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

  resetMapZoom();
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
// 메뉴 화면 말풍선(#menuSpeechText)과 지도 화면 말풍선(#speechText)이 각자 따로 있어
// 대상 span/캐릭터 id를 받아 동작 — 같은 guide_window.png(내부 텍스트 박스 376×153)를
// 재사용하므로 자동 폰트 축소 로직도 공용으로 씀 (두 말풍선 완전히 같은 설정)
const speakTimers = {};
function speak(text, spanSel, imgSel) {
  const span = $(spanSel);
  const img = imgSel ? $(imgSel) : null;
  clearInterval(speakTimers[spanSel]);

  span.textContent = "";
  const prevCursor = span.parentElement.querySelector(".cursor");
  if (prevCursor) prevCursor.remove();
  if (!text) { if (img) img.classList.remove("talking"); return; }

  // 대사 박스(376×153)에 맞춰 글자 수가 많으면 폰트를 자동으로 살짝 줄임
  const base = 25;
  const size = Math.round(Math.min(base, Math.max(16, base * Math.sqrt(95 / text.length))));
  span.parentElement.style.fontSize = `${size}px`;

  if (img) img.classList.add("talking");
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  span.parentElement.appendChild(cursor);

  let i = 0;
  speakTimers[spanSel] = setInterval(() => {
    span.textContent = text.slice(0, ++i);
    if (i >= text.length) {
      clearInterval(speakTimers[spanSel]);
      if (img) img.classList.remove("talking");
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
  if (name === "menu" && DATA) speak(DATA.intro || "", "#menuSpeechText");
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
