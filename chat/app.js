// 신비 챗봇 — 독립 채팅 페이지
// food-map/forest-map/sea-map 어디서 와도 캐릭터(신비)와 대화 로직은 동일하고,
// ?from=food|forest|sea 값에 따라 뒤로가기 대상과 인사말 퀵리플라이만 다르게 보여줌.

const $ = (sel) => document.querySelector(sel);

const PERSONAS = {
  food: {
    from: "food-map",
    quick: [
      "오늘 몸 상태에 맞는 음식 추천해줘",
      "제주에서 꼭 먹어야 할 음식은?",
      "지금 제철 해산물이 뭐야?",
      "현지인들은 뭘 많이 드세요?",
    ],
  },
  forest: {
    from: "forest-map",
    quick: ["힐링되는 숲길 추천해줘", "숲에서 뭘 볼 수 있어?", "가볍게 걷기 좋은 코스 알려줘"],
  },
  sea: {
    from: "sea-map",
    quick: ["바다 구경하기 좋은 곳 알려줘", "물놀이하기 좋은 곳은 어디야?", "노을 명소 추천해줘"],
  },
};

const params = new URLSearchParams(location.search);
const personaKey = PERSONAS[params.get("from")] ? params.get("from") : "food";
const persona = PERSONAS[personaKey];

$("#chatBackBtn").addEventListener("click", () => {
  location.href = `../${persona.from}/index.html`;
});

// ── 챗봇 (신비할망, Cloudflare Worker → OpenAI 프록시) ──────
const CHAT_WORKER_URL = "https://wispy-unit-c9aa.yongmalyang.workers.dev/";
const CHAT_SYSTEM_PROMPT =
  "당신은 신비할망입니다. 본명은 고순덕, 87년 제주 해녀로 살다 환생한 21세 외모의 차사로 동백마을 해녀식당을 운영합니다.\n\n" +
  "[말투]\n" +
  "- \"아이고\", \"허이쿠\", \"하이고\", \"이를 어쩌나\" 같은 감탄사를 자연스럽게 씁니다\n" +
  "- \"~구나\", \"~이란다\", \"~이지\", \"~해봐야겠어\" 같은 따뜻하고 친근한 어미를 씁니다\n" +
  "- 제주 방언 뉘앙스를 가끔 섞습니다 (과하지 않게)\n" +
  "- 음식이나 바다 얘기가 나오면 더 신나고 생생하게 말합니다\n" +
  "- 방문객을 손주 대하듯 반깁니다\n\n" +
  "[성격]\n" +
  "- 87년 삶의 경험으로 지혜롭지만 새로운 것에 해맑게 감탄합니다\n" +
  "- 베풀기를 좋아하고, 먼저 손 내미는 따뜻한 심성입니다\n\n" +
  "[역할과 절대 규칙]\n" +
  "제주 여행 전반을 안내합니다. 관광지, 맛집, 체험, 이동 방법, 날씨, 여행 코스 등을 안내합니다.\n" +
  "★ 장소·가게·행사·코스 이름은 반드시 아래 '제주 관광 데이터'에 있는 것만 언급하세요.\n" +
  "★ 데이터에 없는 장소명은 절대 지어내거나 추측하지 마세요.\n" +
  "★ 해당 카테고리 데이터가 없으면 '아이고, 지금 당장 딱 맞는 정보가 없구나~ 비짓제주 사이트(visitjeju.net)에서 더 찾아보렴!' 이라고만 하세요.\n\n" +
  "[답변 포맷 규칙]\n" +
  "- 장소/가게: 이모지 + 대괄호. 예) 🏝️[성산일출봉], 🍽️[흑돼지거리]\n" +
  "- 날씨: 🌤️[제주시 맑음 · 18°C · 바람 3m/s]\n" +
  "- 축제: 🎉[제주들불축제 · 3월 1~3일]\n" +
  "- 코스: 🗺️[올레길 1코스]\n" +
  "- 데이터 항목들은 한 줄씩 나열하고 앞뒤 빈 줄로 대화 텍스트와 구분하세요.\n" +
  "- 데이터 나열 후 추가 코멘트는 2~3줄 이내로만 하세요.\n\n" +
  "[다음 질문 제안 — 반드시 지킬 것]\n" +
  "답변을 마친 뒤 맨 마지막 줄에 방금 대화 맥락과 자연스럽게 이어지는 후속 질문 2~3개를\n" +
  "정확히 아래 형식 한 줄로만 추가하세요(이모지·설명 없이, 방문객이 실제로 물어볼 법한 짧은 문장으로):\n" +
  "SUGGESTIONS: 질문1|질문2|질문3";
const CHAT_WELCOME = "아이고~ 반가워라! 여행에서 궁금한 게 있으면 뭐든 물어봐~";
const SUGGESTIONS_RE = /\n*SUGGESTIONS:\s*(.+)\s*$/i;

// ── food 페르소나 전용: 음식 대화 모드 + 그라운딩 데이터 ──────
// food-map이 지도에 쓰는 restaurants.json을 그대로 재사용해서, 챗봇이
// 지도에 없는 메뉴·맛집을 지어내지 않고 실제 데이터 기준으로만 답하게 함.
const FOOD_DATA_URL = "../food-map/data/restaurants.json";
const FOOD_CONVO_PROMPT =
  "[음식 대화 모드 — food 페르소나 전용]\n" +
  "아래 '[음식 데이터]'에 있는 메뉴에 대해서만 다음 방식으로 답합니다. 데이터에 없는 메뉴·맛집은 절대 지어내지 마세요.\n" +
  "- 음식 설명: desc를 자연스럽게 풀어서 말합니다\n" +
  "- '제주에서 먹어야 하는 이유'를 물으면 whyJeju를 활용합니다\n" +
  "- 맛이 궁금하면 taste로 상상되게 표현합니다\n" +
  "- 컨디션·상황(피곤함, 숙취, 아이 동반, 부모님, 비 오는 날 등)에 맞는 추천을 물으면 recommendFor가 겹치는 메뉴를 추천합니다\n" +
  "- 제철을 물으면 season 기준으로 답합니다\n" +
  "- 제주어를 물으면 jejuWord를 알려주고, 없으면 '이건 표준어랑 똑같단다~'라고 답합니다\n" +
  "- 처음 먹는 사람 추천을 물으면 beginnerStars를 ⭐ 개수로 보여주고, 5면 '누구나 좋아함', 3이면 '호불호 있음'이라 덧붙입니다\n" +
  "- 알레르기·아이 동반 질문에는 allergy, kidNote를 알려주되, 의학적 진단이 아니라 참고용임을 한 줄로 덧붙입니다\n" +
  "- 가격을 물으면 데이터의 가격대를 알려주되 매장마다 다를 수 있음을 짧게 언급합니다\n" +
  "- 유래나 이야기를 물으면 story를 2~3문장으로 들려줍니다(story가 '없음'이면 지어내지 말고 다른 메뉴를 대신 권합니다)\n" +
  "- 궁합 음식을 물으면 pairsWith를 추천합니다\n" +
  "- '오늘 뭐 먹지' 같은 상황·일정 기반 질문에는 recommendFor·season·beginnerStars를 종합해 1~2개 메뉴를 골라 이유와 함께 추천합니다\n" +
  "- 데이터에 아예 없는 음식(예: 몸국, 각재기국 등)을 물으면 지어내지 말고 '아이고, 그건 순덕이 지도엔 없는 음식이란다~'라고 솔직히 말한 뒤 데이터에 있는 비슷한 메뉴를 대신 권하세요\n";

let foodDataBlock = "";
function normalizeName(s) { return String(s).replace(/\s/g, ""); }

function priceRangeOf(menu) {
  const target = normalizeName(menu.name);
  const prices = [];
  (menu.restaurants || []).forEach((r) => {
    (r.menu || []).forEach((m) => {
      if (normalizeName(m.name).includes(target)) {
        const num = parseInt(String(m.price).replace(/[^0-9]/g, ""), 10);
        if (!isNaN(num)) prices.push(num);
      }
    });
  });
  if (!prices.length) return "정보 없음";
  const min = Math.min(...prices), max = Math.max(...prices);
  const fmt = (n) => n.toLocaleString("ko-KR");
  return min === max ? `${fmt(min)}원` : `${fmt(min)}~${fmt(max)}원`;
}

function buildFoodDataBlock(menus) {
  return menus.map((m) => [
    `- ${m.name} ${m.emoji || ""}`,
    `  설명: ${m.desc}`,
    `  제주에서 먹는 이유: ${m.whyJeju || "정보 없음"}`,
    `  맛 표현: ${m.taste || "정보 없음"}`,
    `  추천 대상: ${(m.recommendFor || []).join(", ") || "정보 없음"}`,
    `  제철: ${m.season || "정보 없음"}`,
    `  제주어: ${m.jejuWord || "없음(표준어와 동일)"}`,
    `  알레르기 주의: ${m.allergy || "정보 없음"}`,
    `  아이 동반 안내: ${m.kidNote || "정보 없음"}`,
    `  유래/이야기: ${m.story || "없음"}`,
    `  궁합 음식: ${(m.pairsWith || []).join(", ") || "정보 없음"}`,
    `  초보자 난이도: ${"⭐".repeat(m.beginnerStars || 0) || "정보 없음"}`,
    `  가격대: ${priceRangeOf(m)}`,
  ].join("\n")).join("\n\n");
}

async function loadFoodData() {
  try {
    const res = await fetch(FOOD_DATA_URL, { cache: "no-store" });
    const data = await res.json();
    foodDataBlock = buildFoodDataBlock(data.menus || []);
  } catch (err) {
    foodDataBlock = "";
  }
}

// food 페르소나면 초기 렌더와 동시에 백그라운드로 로드 시작, 첫 전송 시 await로 대기
const foodDataPromise = personaKey === "food" ? loadFoodData() : Promise.resolve();

let chatHistory = [];
let chatSending = false;

function initChat() {
  $("#chatBarIcon").addEventListener("click", submitBar);
  $("#chatBar").addEventListener("submit", (e) => { e.preventDefault(); submitBar(); });

  addChatBubble("bot", CHAT_WELCOME);
  renderSuggestions(persona.quick);

  // 지도 페이지에서 이미 텍스트를 입력하고 넘어온 경우(?q=) 바로 전송
  const initialQuery = params.get("q");
  if (initialQuery) sendChatMessage(initialQuery);
}

function submitBar() {
  const input = $("#chatBarInput");
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  input.value = "";
  sendChatMessage(text);
}

// 답변 끝의 "SUGGESTIONS: ..." 한 줄을 떼어내 화면엔 안 보이는 후속 질문 후보로 분리
function extractSuggestions(reply) {
  const match = reply.match(SUGGESTIONS_RE);
  if (!match) return { text: reply, suggestions: [] };
  const text = reply.slice(0, match.index).trim();
  const suggestions = match[1].split("|").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  return { text, suggestions };
}

// 선택지는 고정 바가 아니라 채팅 로그 맨 밑에 뜨는 메시지 취급 — 새로 뜨기 전에 이전 걸 지움
function renderSuggestions(list) {
  removeSuggestions();
  if (!list.length) return;
  const messages = $("#chatMessages");
  const wrap = document.createElement("div");
  wrap.className = "chat-suggestions";
  wrap.id = "chatSuggestions";
  list.forEach((label, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chat-quick-btn";
    btn.textContent = label;
    btn.style.animationDelay = `${i * 0.08}s`;
    btn.addEventListener("click", () => sendChatMessage(label));
    wrap.appendChild(btn);
  });
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
}

function removeSuggestions() {
  const el = $("#chatSuggestions");
  if (el) el.remove();
}

function addChatBubble(role, text) {
  const messages = $("#chatMessages");

  const row = document.createElement("div");
  row.className = `chat-row chat-row-${role}`;

  const avatar = document.createElement("img");
  avatar.className = "chat-avatar";
  avatar.alt = "";
  avatar.src = role === "bot" ? "assets/chat/bot_profile.png" : "assets/chat/user_profile.png";
  avatar.onerror = () => { avatar.style.display = "none"; };
  row.appendChild(avatar);

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble chat-bubble-${role}`;
  bubble.textContent = text;
  row.appendChild(bubble);

  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

async function sendChatMessage(text) {
  if (chatSending) return;
  chatSending = true;

  // 선택지를 고르든 직접 타이핑하든, 다음 턴으로 넘어가는 순간 이전 선택지는 사라짐
  removeSuggestions();
  addChatBubble("user", text);
  chatHistory.push({ role: "user", content: text });

  const typing = addChatBubble("bot", "···");
  typing.classList.add("chat-bubble-typing");

  try {
    if (personaKey === "food") await foodDataPromise;
    const systemPrompt = CHAT_SYSTEM_PROMPT +
      (personaKey === "food" && foodDataBlock
        ? "\n\n" + FOOD_CONVO_PROMPT + "\n[음식 데이터]\n" + foodDataBlock
        : "");

    const res = await fetch(CHAT_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...chatHistory],
        temperature: 0.8,
      }),
    });
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || CHAT_WELCOME;
    const { text: reply, suggestions } = extractSuggestions(raw);
    typing.textContent = reply;
    chatHistory.push({ role: "assistant", content: reply });
    // 맥락 제안이 파싱 안 되면(모델이 형식을 안 지킨 경우) 기본 퀵리플라이로 대체
    renderSuggestions(suggestions.length ? suggestions : persona.quick);
  } catch (err) {
    typing.textContent = "아이고, 지금은 대답을 못 하겠구나... 잠시 후 다시 물어봐줘!";
    renderSuggestions(persona.quick);
  } finally {
    typing.classList.remove("chat-bubble-typing");
    $("#chatMessages").scrollTop = $("#chatMessages").scrollHeight;
    chatSending = false;
  }
}

initChat();

// ── 1080×1920 고정 스케일 (다른 지도 페이지들과 동일한 방식) ──────
function fitScreen() {
  const s = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
  document.getElementById("app").style.transform = `scale(${s})`;
}
window.addEventListener("resize", fitScreen);
fitScreen();
