// 신비할망의 바당 지도 — 바다지도 로직
// 흐름: 안내자(요요/치즈) 선택 → 그 안내자의 제주 바다 지도 핀 → 핀 클릭 시 상세

let DATA = null;
let currentGuide = null;

const $ = (sel) => document.querySelector(sel);

// ── 초기화 ──────────────────────────────────────────
async function init() {
  const res = await fetch("data/sea.json", { cache: "no-store" });
  DATA = await res.json();

  $("#selectIntroText").textContent = DATA.intro || "";
  document.body.dataset.screen = "select"; // 첫 화면 배경
  renderPicks();

  document.querySelectorAll("[data-back]").forEach((btn) =>
    btn.addEventListener("click", () => showScreen(btn.dataset.back))
  );
}

// ── 0단계: 안내자 선택 카드 ─────────────────────────
// 안내자별 아트(고양이 메인/발바닥 말풍선) 절대좌표 — 전부 #screen-select(1080×1920) 기준,
// 사용자가 Figma에서 읽어준 정확한 left/top 값 그대로 사용. 이름/설명 텍스트는 좌표가
// 따로 없어서 각 고양이 사진 위쪽에 겹쳐 보이도록 임시로 배치 — 정확한 위치 받으면 조정 예정.
const GUIDE_POS = {
  yoyo:   { catLeft: 11,  catTop: 445, pawLeft: 93,  pawTop: 896 },
  cheese: { catLeft: 536, catTop: 445, pawLeft: 618, pawTop: 892 },
};
const CAT_WIDTH = 533; // 이름/설명 텍스트를 고양이 사진과 같은 폭·좌우 위치로 정렬

function renderPicks() {
  const wrap = $("#picks");
  wrap.innerHTML = "";

  DATA.guides.forEach((guide) => {
    const pos = GUIDE_POS[guide.id] || { catLeft: 11, catTop: 445, pawLeft: 93, pawTop: 896 };
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

    // 이름/설명은 버튼(클릭 영역, 화면 절반)이 아니라 고양이 사진과 같은 폭·좌표에 맞춰 배치
    wrap.insertAdjacentHTML("beforeend", `
      <div class="pick-name" style="left:${pos.catLeft}px; width:${CAT_WIDTH}px; color:${guide.color}">${guide.name} 선택하기</div>
      <p class="pick-desc" style="left:${pos.catLeft}px; width:${CAT_WIDTH}px">${guide.desc || ""}</p>
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

init();

// ── 1080×1920 고정 스케일 ─────────────────────────────
function fitScreen() {
  const s = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
  document.getElementById("app").style.transform = `scale(${s})`;
}
window.addEventListener("resize", fitScreen);
fitScreen();
