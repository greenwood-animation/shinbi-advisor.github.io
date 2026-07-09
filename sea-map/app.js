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

  $("#detailClose").addEventListener("click", closeDetail);
  $("#overlay").addEventListener("click", closeDetail);
}

// ── 0단계: 안내자 선택 카드 ─────────────────────────
// 안내자별 아트(고양이 메인/발바닥 말풍선) 절대좌표 — 전부 #screen-select(1080×1920) 기준,
// 사용자가 Figma에서 읽어준 정확한 left/top 값 그대로 사용. 이름/설명 텍스트는 좌표가
// 따로 없어서 각 고양이 사진 위쪽에 겹쳐 보이도록 임시로 배치 — 정확한 위치 받으면 조정 예정.
const GUIDE_POS = {
  yoyo:   { btnLeft: 0,   btnWidth: 540, catLeft: 11,  catTop: 445, pawLeft: 93,  pawTop: 896 },
  cheese: { btnLeft: 540, btnWidth: 540, catLeft: 536, catTop: 445, pawLeft: 618, pawTop: 892 },
};

function renderPicks() {
  const wrap = $("#picks");
  wrap.innerHTML = "";

  DATA.guides.forEach((guide) => {
    const pos = GUIDE_POS[guide.id] || { btnLeft: 0, btnWidth: 540, catLeft: 11, catTop: 445, pawLeft: 93, pawTop: 896 };

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
      <div class="pick-name" style="left:${pos.btnLeft}px; width:${pos.btnWidth}px; color:${guide.color}">${guide.name} 선택하기</div>
      <p class="pick-desc" style="left:${pos.btnLeft}px; width:${pos.btnWidth}px">${guide.desc || ""}</p>
      ${pawBubble}
      ${cat}
    `);

    // 실제 클릭 영역: 이미지 위에 얹히는 투명 버튼 (보이지 않고 해당 절반 전체를 덮음)
    const btn = document.createElement("button");
    btn.className = `guide-pick guide-pick--${guide.side}`;
    btn.style.left = `${pos.btnLeft}px`;
    btn.style.width = `${pos.btnWidth}px`;
    btn.addEventListener("click", () => selectGuide(guide));
    wrap.appendChild(btn);
  });
}

// ── 안내자 확정 → 캐릭터/테마 세팅 후 지도로 ─────────
function selectGuide(guide) {
  currentGuide = guide;
  document.body.dataset.guide = guide.id; // 안내자별 지도 배경 (yoyo/cheese)

  // 강조색을 안내자 색으로 교체
  document.documentElement.style.setProperty("--accent", guide.color);

  // 캐릭터 이미지 세팅 (스프라이트 or 이모지 폴백)
  const img = $("#charImg");
  if (guide.image) {
    img.style.backgroundImage = `url('${guide.image}')`;
    img.style.aspectRatio = guide.frameAspect || "1 / 1";
    img.classList.remove("char-img--emoji");
    img.textContent = "";
  } else {
    img.style.backgroundImage = "none";
    img.style.aspectRatio = "1 / 1";
    img.classList.add("char-img--emoji");
    img.textContent = guide.emoji || "🐱";
  }

  openMap(guide);
}

// ── 1단계: 제주 바다 지도 + 핀 ──────────────────────
function openMap(guide) {
  $("#mapMenuName").textContent = guide.mapTitle || guide.name;
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

  showScreen("map");
}

// ── 2단계: 바다 상세 ────────────────────────────────
function openDetail(s) {
  const photo = s.photo
    ? `<img class="detail-photo" src="${s.photo}" alt="${s.name}">`
    : `<div class="detail-photo placeholder">🌊</div>`;

  const tags = (s.tags || [])
    .map((t) => `<span class="tag-chip">${t}</span>`)
    .join("");

  $("#detailBody").innerHTML = `
    ${photo}
    <div class="detail-name">${s.name}</div>
    ${s.rating ? `<div class="detail-rating">★ ${s.rating}</div>` : ""}
    ${tags ? `<div class="tag-row">${tags}</div>` : ""}
    <div class="detail-info">
      ${s.address ? `<div class="row"><span class="ic">📍</span><span>${s.address}</span></div>` : ""}
      ${s.hours ? `<div class="row"><span class="ic">🕒</span><span>${s.hours}</span></div>` : ""}
    </div>
    ${s.desc ? `<blockquote class="detail-quote">${s.desc}</blockquote>` : ""}
    ${s.naverPlaceUrl ? `<a class="naver-btn" href="${s.naverPlaceUrl}" target="_blank" rel="noopener">네이버 지도에서 보기 →</a>` : ""}
  `;

  $("#detailPanel").classList.add("is-open");
  $("#overlay").classList.add("is-open");
}

function closeDetail() {
  $("#detailPanel").classList.remove("is-open");
  $("#overlay").classList.remove("is-open");
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

  // 선택 화면에서는 하단 캐릭터 숨김 (양쪽 고양이를 크게 보여주므로)
  $("#charStage").style.display = name === "select" ? "none" : "flex";
}

init();

// ── 1080×1920 고정 스케일 ─────────────────────────────
function fitScreen() {
  const s = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
  document.getElementById("app").style.transform = `scale(${s})`;
}
window.addEventListener("resize", fitScreen);
fitScreen();
