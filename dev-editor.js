/* ══════════════════════════════════════════════════════
   🎮 Dev Editor — 콘솔에 붙여넣기
   다시 실행하면 닫힘
══════════════════════════════════════════════════════ */
(function () {
  if (document.getElementById('__dvp')) {
    document.getElementById('__dvp').remove();
    ['char-img', 'speech-bubble', 'menu-grid'].forEach(cls => {
      const el = document.querySelector('.' + cls);
      if (el) { el.style.outline = ''; el.style.cursor = ''; el.onmousedown = null; }
    });
    return;
  }

  const vw = window.innerWidth, vh = window.innerHeight;
  let dragEl = null, panelDrag = null;

  /* ─── 마우스 이벤트 ───────────────────────────────── */
  function onMove(e) {
    if (panelDrag) {
      const p = document.getElementById('__dvp');
      p.style.right = 'auto';
      p.style.left = Math.max(0, panelDrag.left0 + e.clientX - panelDrag.x0) + 'px';
      p.style.top  = Math.max(0, panelDrag.top0  + e.clientY - panelDrag.y0) + 'px';
    }
    if (!dragEl) return;
    const dx = e.clientX - dragEl.x0, dy = e.clientY - dragEl.y0;
    if (dragEl.type === 'char') {
      dragEl.el.style.right  = Math.max(0, dragEl.r0 - dx) + 'px';
      dragEl.el.style.bottom = Math.max(0, dragEl.b0 - dy) + 'px';
    }
    if (dragEl.type === 'bubble') {
      dragEl.el.style.left = Math.max(0, dragEl.l0 + dx) + 'px';
      dragEl.el.style.top  = Math.max(0, dragEl.t0 + dy) + 'px';
    }
    refresh();
  }
  function onUp() { dragEl = null; panelDrag = null; }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',  onUp);

  /* ─── 드래그 모드 ON/OFF ─────────────────────────── */
  const dragState = { char: false, bubble: false };
  function toggleDrag(type) {
    const selMap = { char: '.char-img', bubble: '.speech-bubble' };
    const colorMap = { char: '#4ade80', bubble: '#60a5fa' };
    const el = document.querySelector(selMap[type]);
    if (!el) return;
    dragState[type] = !dragState[type];
    const on = dragState[type];
    el.style.outline = on ? `3px dashed ${colorMap[type]}` : '';
    el.style.cursor  = on ? 'grab' : '';
    el.onmousedown   = on ? (e) => {
      e.stopPropagation(); e.preventDefault();
      const r = el.getBoundingClientRect();
      el.style.cursor = 'grabbing';
      dragEl = { el, type, x0: e.clientX, y0: e.clientY,
                 r0: vw - r.right, b0: vh - r.bottom,
                 l0: r.left, t0: r.top };
    } : null;
    el.onmouseup = on ? () => { el.style.cursor = 'grab'; } : null;
    // 버튼 텍스트 업데이트
    const btn = document.getElementById('__dv_' + type + 'Btn');
    if (btn) {
      btn.textContent = on ? '🟢 드래그 ON' : '드래그 OFF';
      btn.style.background = on ? (type === 'char' ? '#15803d' : '#1d4ed8') : '#313244';
    }
  }

  /* ─── 현재 값 읽기 ──────────────────────────────── */
  function vals() {
    const c = document.querySelector('.char-img');
    const b = document.querySelector('.speech-bubble');
    const g = document.querySelector('.menu-grid');
    const cr = c?.getBoundingClientRect(), br = b?.getBoundingClientRect(), gr = g?.getBoundingClientRect();
    return {
      cW:  c ? c.offsetWidth : 0,
      cR:  c ? Math.round(vw - cr.right)  : 0,
      cB:  c ? Math.round(vh - cr.bottom) : 0,
      bT:  b ? Math.round(br.top)  : 0,
      bL:  b ? Math.round(br.left) : 0,
      bW:  b ? Math.round(b.offsetWidth) : 0,
      gL:  g ? Math.round(gr.left)        : 0,
      gW:  g ? Math.round(g.offsetWidth)  : 0,
    };
  }
  const p1 = (n, d) => (n / d * 100).toFixed(1);

  /* ─── CSS 출력 ──────────────────────────────────── */
  function genCSS(v) {
    return `/* ── 측정 환경: ${vw}×${vh}px ────────────────────── */

/* 캐릭터 (진) */
body[data-screen="menu"] .char-img {
  width:  ${p1(v.cW, vw)}vw;   /* ${v.cW}px */
  right:  ${p1(v.cR, vw)}vw;   /* ${v.cR}px */
  bottom: ${p1(v.cB, vh)}vh;   /* ${v.cB}px */
}

/* 말풍선 */
body[data-screen="menu"] .speech-bubble {
  top:       ${p1(v.bT, vh)}%;   /* ${v.bT}px */
  left:      ${p1(v.bL, vw)}%;   /* ${v.bL}px */
  max-width: ${p1(v.bW, vw)}vw;  /* ${v.bW}px */
}

/* 버튼 그리드 */
body[data-screen="menu"] .menu-grid {
  margin-left: ${p1(v.gL, vw)}vw;  /* ${v.gL}px */
  max-width:   ${p1(v.gW, vw)}vw;  /* ${v.gW}px */
}`;
  }

  /* ─── 패널 HTML ──────────────────────────────────── */
  const B  = (id, txt, bg) =>
    `<button id="${id}" style="background:${bg};color:#cdd6f4;border:none;border-radius:8px;` +
    `padding:6px 11px;cursor:pointer;font-family:monospace;font-size:11px">${txt}</button>`;
  const SL = (id, min, max, step) =>
    `<input id="${id}" type="range" min="${min}" max="${max}" step="${step}" ` +
    `style="width:130px;vertical-align:middle;accent-color:#cba6f7">`;
  const row = (label, id) =>
    `<div style="margin:5px 0;display:flex;align-items:center;gap:6px">` +
    `<span style="color:#89b4fa;width:80px;flex-shrink:0">${label}</span>${id}</div>`;

  const panel = document.createElement('div');
  panel.id = '__dvp';
  panel.style.cssText =
    'position:fixed;top:20px;right:20px;z-index:99999;background:#1e1e2e;color:#cdd6f4;' +
    'border-radius:14px;padding:16px;width:330px;font-family:monospace;font-size:12px;' +
    'box-shadow:0 8px 32px rgba(0,0,0,.8);border:1px solid #45475a;';

  panel.innerHTML = `
    <!-- 헤더 -->
    <div id="__dvH" style="display:flex;justify-content:space-between;align-items:center;
         cursor:move;padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid #45475a">
      <b style="color:#cba6f7;font-size:14px">🎮 Dev Editor &nbsp;<span style="font-size:10px;opacity:.6">${vw}×${vh}</span></b>
      ${B('__dvClose', '✕ 닫기', '#45475a')}
    </div>

    <!-- 캐릭터 -->
    <div style="margin-bottom:10px;padding:10px;background:#181825;border-radius:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <b style="color:#4ade80">🧍 캐릭터 (진)</b>
        ${B('__dv_charBtn', '드래그 OFF', '#313244')}
      </div>
      ${row('폭', SL('__dvCW', 15, 60, 0.1) + ' <span id="__dvCWv" style="color:#a6e3a1"></span>')}
      <div id="__dvCInfo" style="margin-top:5px;color:#6c7086;font-size:11px;line-height:1.6"></div>
    </div>

    <!-- 말풍선 -->
    <div style="margin-bottom:10px;padding:10px;background:#181825;border-radius:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <b style="color:#60a5fa">💬 말풍선</b>
        ${B('__dv_bubbleBtn', '드래그 OFF', '#313244')}
      </div>
      <div id="__dvBInfo" style="color:#6c7086;font-size:11px;line-height:1.6"></div>
    </div>

    <!-- 버튼 그리드 -->
    <div style="margin-bottom:12px;padding:10px;background:#181825;border-radius:10px">
      <b style="color:#f59e0b">🔘 버튼 그리드</b>
      <div style="margin-top:8px">
        ${row('margin-left', SL('__dvGL', 0, 20, 0.1) + ' <span id="__dvGLv" style="color:#fbbf24"></span>')}
        ${row('max-width',   SL('__dvGW', 20, 80, 0.1) + ' <span id="__dvGWv" style="color:#fbbf24"></span>')}
      </div>
      <div id="__dvGInfo" style="margin-top:5px;color:#6c7086;font-size:11px;line-height:1.6"></div>
    </div>

    <!-- 복사 버튼 -->
    <button id="__dvCopy"
      style="width:100%;background:#4c1d95;color:#e9d5ff;border:none;border-radius:10px;
             padding:10px;cursor:pointer;font-family:monospace;font-size:12px;font-weight:bold">
      📋 CSS 값 복사 → 클로드에게 붙여넣기
    </button>
  `;

  document.body.appendChild(panel);

  /* ─── 슬라이더 초기화 + 이벤트 ──────────────────── */
  const charEl = document.querySelector('.char-img');
  const gridEl = document.querySelector('.menu-grid');

  const cwSL = document.getElementById('__dvCW');
  const glSL = document.getElementById('__dvGL');
  const gwSL = document.getElementById('__dvGW');

  cwSL.value = charEl ? p1(charEl.offsetWidth, vw) : 38;
  glSL.value = gridEl ? p1(gridEl.getBoundingClientRect().left, vw) : 4;
  gwSL.value = gridEl ? p1(gridEl.offsetWidth, vw) : 50;

  cwSL.oninput = () => { if (charEl) charEl.style.width = cwSL.value + 'vw'; refresh(); };
  glSL.oninput = () => { if (gridEl) gridEl.style.marginLeft = glSL.value + 'vw'; refresh(); };
  gwSL.oninput = () => {
    if (gridEl) { gridEl.style.maxWidth = gwSL.value + 'vw'; gridEl.style.width = 'auto'; }
    refresh();
  };

  /* ─── 드래그 버튼 이벤트 ─────────────────────────── */
  document.getElementById('__dv_charBtn').onclick   = () => toggleDrag('char');
  document.getElementById('__dv_bubbleBtn').onclick = () => toggleDrag('bubble');

  /* ─── 화면 갱신 ──────────────────────────────────── */
  function refresh() {
    const v = vals();
    cwSL.value = p1(v.cW, vw);
    document.getElementById('__dvCWv').textContent    = `${p1(v.cW,vw)}vw  (${v.cW}px)`;
    document.getElementById('__dvCInfo').innerHTML    =
      `right: ${p1(v.cR,vw)}vw (${v.cR}px)<br>bottom: ${p1(v.cB,vh)}vh (${v.cB}px)`;
    document.getElementById('__dvBInfo').innerHTML    =
      `top: ${p1(v.bT,vh)}% (${v.bT}px)  |  left: ${p1(v.bL,vw)}% (${v.bL}px)<br>width: ${v.bW}px`;
    glSL.value = p1(v.gL, vw);
    gwSL.value = p1(v.gW, vw);
    document.getElementById('__dvGLv').textContent    = `${p1(v.gL,vw)}vw (${v.gL}px)`;
    document.getElementById('__dvGWv').textContent    = `${p1(v.gW,vw)}vw (${v.gW}px)`;
    document.getElementById('__dvGInfo').textContent  = '';
  }
  refresh();
  setInterval(refresh, 150);

  /* ─── CSS 복사 ───────────────────────────────────── */
  document.getElementById('__dvCopy').onclick = () => {
    navigator.clipboard.writeText(genCSS(vals())).then(() => {
      const btn = document.getElementById('__dvCopy');
      btn.textContent = '✅ 복사됨! 클로드에게 붙여넣으세요';
      btn.style.background = '#166534';
      setTimeout(() => {
        if (document.getElementById('__dvCopy')) {
          btn.textContent = '📋 CSS 값 복사 → 클로드에게 붙여넣기';
          btn.style.background = '#4c1d95';
        }
      }, 2500);
    });
  };

  /* ─── 닫기 ───────────────────────────────────────── */
  document.getElementById('__dvClose').onclick = () => {
    panel.remove();
    ['char-img', 'speech-bubble', 'menu-grid'].forEach(cls => {
      const el = document.querySelector('.' + cls);
      if (el) { el.style.outline = ''; el.style.cursor = ''; el.onmousedown = null; }
    });
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',  onUp);
  };

  /* ─── 패널 자체 드래그 ───────────────────────────── */
  document.getElementById('__dvH').onmousedown = (e) => {
    if (e.target.closest('button')) return;
    const r = panel.getBoundingClientRect();
    panelDrag = { x0: e.clientX, y0: e.clientY, left0: r.left, top0: r.top };
    e.preventDefault();
  };

})();
