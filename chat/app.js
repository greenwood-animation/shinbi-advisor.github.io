// 신비 챗봇 — 독립 채팅 페이지
// food-map/forest-map/sea-map 어디서 와도 캐릭터(신비)와 대화 로직은 동일하고,
// ?from=food|forest|sea 값에 따라 뒤로가기 대상과 인사말 퀵리플라이만 다르게 보여줌.

const $ = (sel) => document.querySelector(sel);

const PERSONAS = {
  food: {
    from: "food-map",
    quick: ["오늘 뭐 먹을지 추천해줘", "이 근처 맛집 알려줘", "제철 음식이 뭐야?"],
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
  "- 데이터 나열 후 추가 코멘트는 2~3줄 이내로만 하세요.";
const CHAT_WELCOME = "아이고~ 반가워라! 여행에서 궁금한 게 있으면 뭐든 물어봐~";

let chatHistory = [];
let chatSending = false;

function initChat() {
  $("#chatBarIcon").addEventListener("click", submitBar);
  $("#chatBar").addEventListener("submit", (e) => { e.preventDefault(); submitBar(); });

  renderQuickReplies();
  addChatBubble("bot", CHAT_WELCOME);

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

function renderQuickReplies() {
  const wrap = $("#chatQuickReplies");
  wrap.innerHTML = "";
  persona.quick.forEach((label) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chat-quick-btn";
    btn.textContent = label;
    btn.addEventListener("click", () => sendChatMessage(label));
    wrap.appendChild(btn);
  });
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

  addChatBubble("user", text);
  chatHistory.push({ role: "user", content: text });

  const typing = addChatBubble("bot", "···");
  typing.classList.add("chat-bubble-typing");

  try {
    const res = await fetch(CHAT_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: CHAT_SYSTEM_PROMPT }, ...chatHistory],
        temperature: 0.8,
      }),
    });
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || CHAT_WELCOME;
    typing.textContent = reply;
    chatHistory.push({ role: "assistant", content: reply });
  } catch (err) {
    typing.textContent = "아이고, 지금은 대답을 못 하겠구나... 잠시 후 다시 물어봐줘!";
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
