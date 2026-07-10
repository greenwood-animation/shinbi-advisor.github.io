// 신비할망의 바당 지도 — 바다지도 로직
// 흐름: 안내자(요요/치즈) 선택 → 그 안내자의 제주 바다 지도 핀 → 핀 클릭 시 상세

let DATA = null;
let currentGuide = null;

const $ = (sel) => document.querySelector(sel);

// ── 초기화 ──────────────────────────────────────────
async function init() {
  const res = await fetch("data/sea.json", { cache: "no-store" });
  DATA = await res.json();

  // 줄바꿈은 introLines 배열로 직접 지정, 마지막 줄은 강조색으로 표시
  const introLines = DATA.introLines || [DATA.intro || ""];
  $("#selectIntroText").innerHTML = introLines
    .map((line, i) => (i === introLines.length - 1 ? `<span class="intro-highlight">${line}</span>` : line))
    .join("<br>");
  document.body.dataset.screen = "select"; // 첫 화면 배경
  renderPicks();

  document.querySelectorAll("[data-back]").forEach((btn) =>
    btn.addEventListener("click", () => showScreen(btn.dataset.back))
  );
}

// ── 0단계: 안내자 선택 카드 ─────────────────────────
// 안내자별 아트/텍스트 절대좌표 — 전부 #screen-select(1080×1920) 기준, 사용자가 Figma에서
// 읽어준 정확한 left/top 값 그대로 사용.
const GUIDE_POS = {
  yoyo:   { catLeft: 11,  catTop: 445, pawLeft: 93,  pawTop: 896, nameLeft: 73,  descLeft: 93 },
  cheese: { catLeft: 536, catTop: 445, pawLeft: 618, pawTop: 892, nameLeft: 582, descLeft: 610 },
};
const NAME_TOP = 525;
const DESC_TOP = 639, DESC_WIDTH = 370, DESC_HEIGHT = 198;

function renderPicks() {
  const wrap = $("#picks");
  wrap.innerHTML = "";

  DATA.guides.forEach((guide) => {
    const pos = GUIDE_POS[guide.id] || GUIDE_POS.yoyo;
    const btnLeft = guide.side === "calm" ? 0 : 540;

    const cat = guide.image
      ? `<img class="pick-cat" src="${guide.image}" alt="${guide.name}" style="left:${pos.catLeft}px; top:${pos.catTop}px" onerror="this.style.display='none'">`
      : `<div class="pick-cat pick-cat--emoji" style="left:${pos.catLeft}px; top:${pos.catTop}px">${guide.emoji || "🐱"}</div>`;

    // 발바닥 옆 말풍선: 안내자별 말풍선 프레임(요요_말풍선.png/치즈_말풍선.png) 위에 대사 텍스트를 얹음
    const pawBubble = guide.catQuote
      ? `<div class="paw-bubble" style="left:${pos.pawLeft}px; top:${pos.pawTop}px">
          <img class="paw-bubble-bg" src="${guide.pawBubbleImage || ""}" alt="" onerror="this.style.display='none'">
          <span class="paw-bubble-text">${guide.catQuote}</span>
        </div>`
      : "";

    wrap.insertAdjacentHTML("beforeend", `
      <div class="pick-name" style="left:${pos.nameLeft}px; top:${NAME_TOP}px; color:${guide.color}">${guide.name} 선택하기</div>
      <p class="pick-desc" style="left:${pos.descLeft}px; top:${DESC_TOP}px; width:${DESC_WIDTH}px; height:${DESC_HEIGHT}px">${guide.desc || ""}</p>
      ${pawBubble}
      ${cat}
    `);

    // 실제 클릭 영역: 이미지 위에 얹히는 투명 버튼 (보이지 않고 해당 절반 전체를 덮음)
    const btn = document.createElement("button");
    btn.className = `guide-pick guide-pick--${guide.side}`;
    btn.style.left = `${btnLeft}px`;
    btn.style.width = "540px";
    btn.addEventListener("click", () => selectGuide(guide));
    wrap.appendChild(btn);
  });
}

// ── 안내자 확정 → 지도로 ─────────────────────────────
function selectGuide(guide) {
  currentGuide = guide;
  document.body.dataset.guide = guide.id; // 안내자별 지도 배경 (yoyo/cheese)

  // 강조색을 안내자 색으로 교체
  document.documentElement.style.setProperty("--accent", guide.color);

  openMap(guide);
}

// 안내자별 말풍선/캐릭터 절대좌표 — 전부 #screen-map(1080×1920) 기준, 사용자가 Figma에서
// 읽어준 정확한 left/top 값 그대로 사용.
const MAP_POS = {
  yoyo:   { bubbleLeft: 53, bubbleTop: 119, charLeft: 521, charTop: 119 },
  cheese: { bubbleLeft: 53, bubbleTop: 118, charLeft: 517, charTop: 115 },
};

// ── 1단계: 제주 바다 지도 + 핀 ──────────────────────
function openMap(guide) {
  const pos = MAP_POS[guide.id] || MAP_POS.yoyo;

  $("#mapMenuName").textContent = `${guide.mapTitle || guide.name} 지도`;

  // 캐릭터 (원본 크기 그대로, 안내자별 절대좌표)
  const charImg = $("#charImg");
  charImg.src = guide.mapCharImage || guide.image || "";
  charImg.style.left = `${pos.charLeft}px`;
  charImg.style.top = `${pos.charTop}px`;

  // 말풍선 프레임 (안내자별 이미지) + 좌표
  const bubble = $("#mapSpeechBubble");
  bubble.style.left = `${pos.bubbleLeft}px`;
  bubble.style.top = `${pos.bubbleTop}px`;
  $("#mapSpeechBg").src = guide.mapBubbleImage || "";

  speak(guide.mapIntro || "");

  const pins = $("#pins");
  pins.innerHTML = "";

  const list = guide.spots || [];
  $("#mapEmpty").hidden = list.length > 0;

  list.forEach((s, i) => {
    const pin = document.createElement("div");
    pin.className = "pin";
    pin.style.left = `${s.x}%`;
    pin.style.top = `${s.y}%`;
    pin.style.animationDelay = `${0.15 + i * 0.12}s`;
    pin.innerHTML = `<div class="pin-dot"></div><div class="pin-label">${s.name}</div>`;
    pin.addEventListener("click", () => openDetail(s));
    pins.appendChild(pin);
  });

  // 새 안내자로 들어오면 추천 명소 패널은 핀을 클릭하기 전까지 비워둠
  $("#recommendList").innerHTML = "";
  $(".reco-panel").classList.remove("is-open");

  resetMapZoom();
  showScreen("map");
}

// ── 2단계: 바다 상세 (지도 핀 클릭 시 추천 명소 패널에 표시) ──
function openDetail(s) {
  const photo = s.photo
    ? `<img class="reco-photo" src="${s.photo}" alt="${s.name}">`
    : `<div class="reco-photo placeholder">🌊</div>`;

  const tags = (s.tags || []).slice(0, 3).map((t) => `<span class="reco-tag">${t}</span>`).join("");

  $("#recommendList").innerHTML = `
    <div class="reco-card"${s.naverPlaceUrl ? ' role="link" tabindex="0"' : ""}>
      <img class="reco-item-bg" src="assets/공통_지도패널_상세_명소.png" alt="" onerror="this.style.display='none'">
      <div class="reco-card-inner">
        ${photo}
        <div class="reco-body">
          <div class="reco-name">${s.name}</div>
          <div class="reco-meta">📍 ${s.address || ""} ${s.hours ? "· " + s.hours : ""}</div>
          <div class="reco-tags">${tags}</div>
        </div>
      </div>
    </div>
  `;

  if (s.naverPlaceUrl) {
    $(".reco-card").addEventListener("click", () => window.open(s.naverPlaceUrl, "_blank", "noopener"));
  }

  const panel = $(".reco-panel");
  panel.classList.remove("is-open");
  void panel.offsetWidth; // 리플로우 후 클래스 재적용 → 다시 열어도 애니메이션 보임
  panel.classList.add("is-open");
}

// ── 안내자 말하기 (타이핑 + 입 모션) ─────────────────
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
