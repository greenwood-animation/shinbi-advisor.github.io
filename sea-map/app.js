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
function renderPicks() {
  const wrap = $("#picks");
  wrap.innerHTML = "";

  DATA.guides.forEach((guide) => {
    const cat = guide.image
      ? `<div class="pick-cat" style="background-image:url('${guide.image}'); aspect-ratio:${guide.frameAspect || "1 / 1"}"></div>`
      : `<div class="pick-cat pick-cat--emoji">${guide.emoji || "🐱"}</div>`;

    const pick = document.createElement("button");
    pick.className = `guide-pick guide-pick--${guide.side}`;
    pick.style.setProperty("--guide", guide.color);
    pick.innerHTML = `
      ${cat}
      <div class="pick-name">${guide.name} 선택하기</div>
      <p class="pick-desc">${guide.desc || ""}</p>`;
    pick.addEventListener("click", () => selectGuide(guide));
    wrap.appendChild(pick);
  });

  // 각 guide-pick이 --guide 변수로 자체 배경색을 가짐 (CSS clip-path로 번개 분할)
  $("#screen-select").style.background = "";
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
function tts(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  if (!text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR"; u.rate = 1.0; u.pitch = 1.1;
  window.speechSynthesis.speak(u);
}
function speak(text) {
  const span = $("#speechText");
  const img = $("#charImg");
  clearInterval(speakTimer);
  tts(text);

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

// ── 1920×1080 고정 스케일 ─────────────────────────────
function fitScreen() {
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  document.getElementById("app").style.transform = `scale(${s})`;
}
window.addEventListener("resize", fitScreen);
fitScreen();
