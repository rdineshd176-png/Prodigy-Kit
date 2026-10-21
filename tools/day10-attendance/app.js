// =========================================================================
// Attendance Calculator — Standalone app.js (Day 10 of Prodigy Kit)
// 4 features: Quick Calc, Bunk Predictor, Recovery Planner, Subject Tracker
// Sarcastic commentary included. You're welcome.
// =========================================================================

// =========================================================================
// Store (inlined from assets/lib/store.js)
// =========================================================================

const LS_KEYS = {
  theme: "prodigy_kit_theme",
  onboarded: "prodigy_kit_onboarded",
  progress: "prodigy_kit_progress",
  sounds: "prodigy_kit_sounds",
  subjects: "prodigy_kit_subjects_v1",
};

const state = {
  theme: "pro",
  onboarded: false,
  progress: {},
  sounds: false,
};

const listeners = new Map();

function getState() {
  return state;
}

function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key)?.delete(fn);
}

function emit(key) {
  listeners.get(key)?.forEach((fn) => {
    try { fn(state); } catch (e) { console.error(e); }
  });
}

function hydrate() {
  try {
    const theme = localStorage.getItem(LS_KEYS.theme);
    if (theme && ["pro", "arcade", "pookie"].includes(theme)) {
      state.theme = theme;
    }
    state.onboarded = localStorage.getItem(LS_KEYS.onboarded) === "true";
    const progress = localStorage.getItem(LS_KEYS.progress);
    if (progress) {
      try { state.progress = JSON.parse(progress); } catch { state.progress = {}; }
    }
    state.sounds = localStorage.getItem(LS_KEYS.sounds) === "true";
  } catch {}
}

function setTheme(theme) {
  if (!["pro", "arcade", "pookie"].includes(theme)) return;
  state.theme = theme;
  try { localStorage.setItem(LS_KEYS.theme, theme); } catch {}
  emit("theme");
}

function setOnboarded(v = true) {
  state.onboarded = v;
  try { localStorage.setItem(LS_KEYS.onboarded, String(v)); } catch {}
  emit("onboarded");
}

function markDone(toolId) {
  if (state.progress[toolId]) return;
  state.progress[toolId] = true;
  try { localStorage.setItem(LS_KEYS.progress, JSON.stringify(state.progress)); } catch {}
  emit("progress");
}

function isDone(toolId) {
  return !!state.progress[toolId];
}

function toast(message, type = "info", duration = 3500) {
  const stack = document.getElementById("pk-toast-stack");
  if (!stack) return;
  const el = document.createElement("div");
  el.className = `pk-toast pk-toast--${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add("pk-toast--fade-out");
    setTimeout(() => el.remove(), 200);
  }, duration);
}

// Subject tracker storage helpers
function loadSubjects() {
  try {
    const raw = localStorage.getItem(LS_KEYS.subjects);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveSubjects(subjects) {
  try { localStorage.setItem(LS_KEYS.subjects, JSON.stringify(subjects)); } catch {}
}

// =========================================================================
// Theme application
// =========================================================================

const LOGO_ICONS = { pro: "gem", arcade: "trophy", pookie: "sparkles" };

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const themeColor = theme === "pookie" ? "#fef6f9" : theme === "arcade" ? "#050208" : "#150826";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", themeColor);
  document.querySelectorAll(".pk-themeswitch__btn").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.theme === theme));
  });
  const logoMark = document.querySelector(".pk-logo__mark");
  if (logoMark) {
    logoMark.innerHTML = `<i data-lucide="${LOGO_ICONS[theme] || "gem"}"></i>`;
  }
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

// =========================================================================
// Attendance Calculator — Core Math
// =========================================================================

function clampPositive(n, fallback = 0) {
  const v = Number(n);
  if (!isFinite(v) || v < 0) return fallback;
  return v;
}

function calcPercent(attended, total) {
  if (total <= 0) return 0;
  return (attended / total) * 100;
}

// Bunk predictor: max classes you can skip out of `upcoming` while staying >= target
function calcMaxBunks(attended, total, target, upcoming) {
  // After skipping B, you've attended `attended` out of `total + upcoming`
  // We want attended / (total + upcoming) >= target (assuming you attend all OTHER upcoming)
  // Wait: upcoming = total classes still to come. If you skip B, you attend upcoming - B.
  // Final state: attended + (upcoming - B) attended out of total + upcoming total.
  // (attended + upcoming - B) / (total + upcoming) >= target
  // attended + upcoming - B >= target * (total + upcoming)
  // B <= attended + upcoming - target * (total + upcoming)
  const denom = total + upcoming;
  if (denom <= 0) return 0;
  const maxBunks = Math.floor(attended + upcoming - (target / 100) * denom);
  return Math.max(0, Math.min(maxBunks, upcoming));
}

// Recovery planner: how many consecutive classes needed to hit target
function calcRecovery(attended, total, target) {
  if (total <= 0) return 0;
  if ((attended / total) * 100 >= target) return 0;
  // (attended + R) / (total + R) >= target/100
  // attended + R >= (target/100) * (total + R)
  // attended + R >= (target/100)*total + (target/100)*R
  // R * (1 - target/100) >= (target/100)*total - attended
  // R >= ((target/100)*total - attended) / (1 - target/100)
  const t = target / 100;
  const needed = Math.ceil((t * total - attended) / (1 - t));
  return Math.max(0, needed);
}

// Sarcastic quote based on attendance percentage
function getQuoteFor(percent) {
  if (percent >= 95) return { tone: "roast", quote: "95%+ attendance. Did you get a gold star? Touch grass." };
  if (percent >= 85) return { tone: "meh", quote: "Solid. Boring, but solid. You'll survive." };
  if (percent >= 75) return { tone: "ok", quote: "You're safe. For now. The rector is watching." };
  if (percent >= 60) return { tone: "warn", quote: "Borderline. The deficiency email is being drafted." };
  if (percent >= 40) return { tone: "danger", quote: "Below 60%. Your parents are getting a call." };
  if (percent > 0) return { tone: "critical", quote: "Sub-40%. Consider this a personality trait at this point." };
  return { tone: "neutral", quote: "Zero attendance. Either you're a ghost or this is your first day." };
}

// Quote for bunk result
function getBunkQuote(bunks, upcoming) {
  if (bunks === 0) return "0 bunks available. Tough luck, sport. Go sit in the back row.";
  if (bunks === upcoming) return "ALL of them. You can bunk everything. (Don't. That's how you get caught.)";
  if (bunks === 1) return "1 bunk. Use it wisely. Or don't. I'm a calculator, not your mom.";
  if (bunks <= 3) return `${bunks} bunks. Live your chaotic life. Don't push it further.`;
  return `${bunks} bunks. Wow. You've earned this buffer. Go enjoy a sandwich.`;
}

// Quote for recovery result
function getRecoveryQuote(needed) {
  if (needed === 0) return "Already at target. Why are you here? Go home.";
  if (needed <= 3) return `Only ${needed} more. You can do this standing on your head.`;
  if (needed <= 7) return `${needed} consecutive. Including the 8 AM one. Including Monday.`;
  if (needed <= 15) return `${needed} in a row. Cancel your weekend plans. Your degree misses you.`;
  return `${needed} classes. At this point, just move into the lecture hall.`;
}

// =========================================================================
// Tool rendering
// =========================================================================

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    if (typeof c === "string") e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  });
  return e;
}

function renderTool(container, { toast, markDone }) {
  container.innerHTML = "";
  const wrap = el("div");

  // Tabs
  const tabs = [
    { id: "quick", label: "Quick Calc", icon: "calculator" },
    { id: "bunk", label: "Bunk Predictor", icon: "moon" },
    { id: "recover", label: "Recovery Planner", icon: "trending-up" },
    { id: "tracker", label: "Subject Tracker", icon: "list-checks" },
  ];

  wrap.innerHTML = `
    <div class="pk-tabs" role="tablist">
      ${tabs.map((t, i) => `<button class="pk-tab" role="tab" data-tab="${t.id}" aria-selected="${i === 0 ? "true" : "false"}">${t.label}</button>`).join("")}
    </div>
    <div id="att-content"></div>
  `;

  const content = wrap.querySelector("#att-content");

  function selectTab(id) {
    wrap.querySelectorAll(".pk-tab").forEach((t) =>
      t.setAttribute("aria-selected", String(t.dataset.tab === id)));
    content.innerHTML = "";
    if (id === "quick") content.appendChild(renderQuick());
    else if (id === "bunk") content.appendChild(renderBunk());
    else if (id === "recover") content.appendChild(renderRecover());
    else if (id === "tracker") content.appendChild(renderTracker());
    if (window.lucide) window.lucide.createIcons();
  }

  wrap.querySelectorAll(".pk-tab").forEach((tab) => {
    tab.addEventListener("click", () => selectTab(tab.dataset.tab));
  });
  selectTab("quick");

  // ========================================================================
  // TAB 1: Quick Calculator
  // ========================================================================
  function renderQuick() {
    const card = el("div", { class: "pk-card" });
    card.innerHTML = `
      <p class="pk-text-sm pk-text-muted pk-mb-3">
        Math you'll actually use. Unlike calculus.
      </p>
      <div class="pk-grid-2 pk-mb-3">
        <div>
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Total classes held</label>
          <input type="number" id="qc-total" min="0" placeholder="e.g. 40" style="width:100%;font-size:1.25rem;padding:0.75rem" />
        </div>
        <div>
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Classes you attended</label>
          <input type="number" id="qc-attended" min="0" placeholder="e.g. 30" style="width:100%;font-size:1.25rem;padding:0.75rem" />
        </div>
      </div>
      <div id="qc-result" class="pk-text-center" style="padding:1.5rem 0"></div>
      <div id="qc-quote" class="pk-text-center" style="margin-top:0.5rem"></div>
    `;

    const totalInput = card.querySelector("#qc-total");
    const attInput = card.querySelector("#qc-attended");
    const resultEl = card.querySelector("#qc-result");
    const quoteEl = card.querySelector("#qc-quote");

    function recalc() {
      const total = clampPositive(totalInput.value);
      const attended = clampPositive(attInput.value, 0);
      if (total === 0 && attended === 0) {
        resultEl.innerHTML = `<div class="pk-text-muted pk-text-sm">Type your numbers above.</div>`;
        quoteEl.innerHTML = "";
        return;
      }
      if (attended > total) {
        resultEl.innerHTML = `<div style="color:#ef4444;font-size:1.1rem;font-weight:600">⏰ Time-traveler detected</div><div class="pk-text-sm pk-text-muted pk-mt-2">You can't attend more classes than were held. Unless you have a TARDIS.</div>`;
        quoteEl.innerHTML = "";
        return;
      }
      const pct = calcPercent(attended, total);
      const { tone, quote } = getQuoteFor(pct);
      const color = tone === "roast" ? "#10b981" : tone === "meh" ? "#10b981" : tone === "ok" ? "#10b981" : tone === "warn" ? "#f59e0b" : tone === "danger" ? "#ef4444" : tone === "critical" ? "#ef4444" : "var(--pk-fg-muted)";
      resultEl.innerHTML = `
        <div style="font-size:3rem;font-weight:800;color:${color};line-height:1">${pct.toFixed(1)}<span style="font-size:1.5rem">%</span></div>
        <div class="pk-text-sm pk-text-muted pk-mt-2 pk-text-mono">${attended} / ${total} classes</div>
      `;
      quoteEl.innerHTML = `<div class="pk-text-sm" style="color:${color};font-style:italic;max-width:480px;margin:0 auto">"${quote}"</div>`;
    }

    totalInput.addEventListener("input", recalc);
    attInput.addEventListener("input", recalc);
    setTimeout(recalc, 50);
    return card;
  }

  // ========================================================================
  // TAB 2: Bunk Predictor
  // ========================================================================
  function renderBunk() {
    const card = el("div", { class: "pk-card" });
    card.innerHTML = `
      <p class="pk-text-sm pk-text-muted pk-mb-3">
        Will you survive skipping tomorrow's 8 AM? Let's find out.
      </p>
      <div class="pk-grid-2 pk-mb-3">
        <div>
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Total classes held so far</label>
          <input type="number" id="bp-total" min="0" placeholder="e.g. 40" style="width:100%;font-size:1.1rem;padding:0.625rem" />
        </div>
        <div>
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Classes attended so far</label>
          <input type="number" id="bp-attended" min="0" placeholder="e.g. 30" style="width:100%;font-size:1.1rem;padding:0.625rem" />
        </div>
      </div>
      <div class="pk-grid-2 pk-mb-3">
        <div>
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Target attendance %</label>
          <input type="number" id="bp-target" min="0" max="100" value="75" style="width:100%;font-size:1.1rem;padding:0.625rem" />
        </div>
        <div>
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Upcoming classes (next N)</label>
          <input type="number" id="bp-upcoming" min="0" placeholder="e.g. 10" style="width:100%;font-size:1.1rem;padding:0.625rem" />
        </div>
      </div>
      <div id="bp-result" class="pk-text-center" style="padding:1.5rem 0"></div>
    `;

    const totalInput = card.querySelector("#bp-total");
    const attInput = card.querySelector("#bp-attended");
    const targetInput = card.querySelector("#bp-target");
    const upcomingInput = card.querySelector("#bp-upcoming");
    const resultEl = card.querySelector("#bp-result");

    function recalc() {
      const total = clampPositive(totalInput.value);
      const attended = clampPositive(attInput.value, 0);
      const target = Math.max(0, Math.min(100, clampPositive(targetInput.value, 75)));
      const upcoming = clampPositive(upcomingInput.value, 0);

      if (total === 0 || upcoming === 0) {
        resultEl.innerHTML = `<div class="pk-text-muted pk-text-sm">Fill in all four fields. No shortcuts here.</div>`;
        return;
      }
      if (attended > total) {
        resultEl.innerHTML = `<div style="color:#ef4444;font-weight:600">Attended > held. Check your inputs, time-traveler.</div>`;
        return;
      }
      const bunks = calcMaxBunks(attended, total, target, upcoming);
      const finalAttended = attended + (upcoming - bunks);
      const finalTotal = total + upcoming;
      const finalPct = (finalAttended / finalTotal) * 100;
      const quote = getBunkQuote(bunks, upcoming);
      resultEl.innerHTML = `
        <div style="font-size:3rem;font-weight:800;color:var(--pk-accent);line-height:1">${bunks}</div>
        <div class="pk-text-sm pk-text-muted pk-mt-2 pk-text-mono">out of ${upcoming} bunkable</div>
        <div class="pk-text-sm pk-mt-3 pk-text-mono">after bunking: ${finalAttended}/${finalTotal} = ${finalPct.toFixed(2)}%</div>
        <div class="pk-text-sm pk-mt-3" style="font-style:italic;max-width:480px;margin:0.75rem auto 0;color:var(--pk-fg)">"${quote}"</div>
      `;
    }

    [totalInput, attInput, targetInput, upcomingInput].forEach((inp) => inp.addEventListener("input", recalc));
    setTimeout(recalc, 50);
    return card;
  }

  // ========================================================================
  // TAB 3: Recovery Planner
  // ========================================================================
  function renderRecover() {
    const card = el("div", { class: "pk-card" });
    card.innerHTML = `
      <p class="pk-text-sm pk-text-muted pk-mb-3">
        Below 75%? Here's how many classes you need to attend in a row. Sorry.
      </p>
      <div class="pk-grid-2 pk-mb-3">
        <div>
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Total classes held</label>
          <input type="number" id="rp-total" min="0" placeholder="e.g. 40" style="width:100%;font-size:1.1rem;padding:0.625rem" />
        </div>
        <div>
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Classes attended</label>
          <input type="number" id="rp-attended" min="0" placeholder="e.g. 25" style="width:100%;font-size:1.1rem;padding:0.625rem" />
        </div>
      </div>
      <div class="pk-mb-3">
        <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Target attendance %</label>
        <input type="number" id="rp-target" min="0" max="100" value="75" style="width:100%;font-size:1.1rem;padding:0.625rem" />
      </div>
      <div id="rp-result" class="pk-text-center" style="padding:1.5rem 0"></div>
    `;

    const totalInput = card.querySelector("#rp-total");
    const attInput = card.querySelector("#rp-attended");
    const targetInput = card.querySelector("#rp-target");
    const resultEl = card.querySelector("#rp-result");

    function recalc() {
      const total = clampPositive(totalInput.value);
      const attended = clampPositive(attInput.value, 0);
      const target = Math.max(0, Math.min(100, clampPositive(targetInput.value, 75)));
      if (total === 0) {
        resultEl.innerHTML = `<div class="pk-text-muted pk-text-sm">Fill in the numbers above.</div>`;
        return;
      }
      if (attended > total) {
        resultEl.innerHTML = `<div style="color:#ef4444;font-weight:600">Attended > held. Check your inputs.</div>`;
        return;
      }
      const needed = calcRecovery(attended, total, target);
      const futureAttended = attended + needed;
      const futureTotal = total + needed;
      const futurePct = (futureAttended / futureTotal) * 100;
      const currentPct = (attended / total) * 100;
      const quote = getRecoveryQuote(needed);
      resultEl.innerHTML = `
        <div style="font-size:3rem;font-weight:800;color:var(--pk-accent);line-height:1">${needed}</div>
        <div class="pk-text-sm pk-text-muted pk-mt-2 pk-text-mono">consecutive classes needed</div>
        <div class="pk-text-sm pk-mt-3 pk-text-mono">from ${currentPct.toFixed(1)}% → ${futurePct.toFixed(2)}% (${futureAttended}/${futureTotal})</div>
        <div class="pk-text-sm pk-mt-3" style="font-style:italic;max-width:480px;margin:0.75rem auto 0;color:var(--pk-fg)">"${quote}"</div>
      `;
    }

    [totalInput, attInput, targetInput].forEach((inp) => inp.addEventListener("input", recalc));
    setTimeout(recalc, 50);
    return card;
  }

  // ========================================================================
  // TAB 4: Subject Tracker
  // ========================================================================
  function renderTracker() {
    const card = el("div", { class: "pk-card" });
    card.innerHTML = `
      <p class="pk-text-sm pk-text-muted pk-mb-3">
        Track all your subjects. Watch the average betray you in real time.
      </p>
      <div class="pk-grid-2 pk-mb-3" style="gap:0.5rem">
        <input type="text" id="tr-name" placeholder="Subject name (e.g. DBMS)" style="font-size:0.9rem;padding:0.625rem" />
        <div class="pk-flex pk-gap-2">
          <input type="number" id="tr-attended" min="0" placeholder="Attended" style="flex:1;font-size:0.9rem;padding:0.625rem" />
          <input type="number" id="tr-total" min="0" placeholder="Total" style="flex:1;font-size:0.9rem;padding:0.625rem" />
        </div>
      </div>
      <button class="pk-btn pk-btn--primary" id="tr-add" style="width:100%;margin-bottom:1rem">
        <i data-lucide="plus"></i> Add subject
      </button>
      <div id="tr-list"></div>
      <div id="tr-summary" class="pk-text-center" style="margin-top:1rem"></div>
    `;

    const nameInput = card.querySelector("#tr-name");
    const attInput = card.querySelector("#tr-attended");
    const totalInput = card.querySelector("#tr-total");
    const addBtn = card.querySelector("#tr-add");
    const listEl = card.querySelector("#tr-list");
    const summaryEl = card.querySelector("#tr-summary");

    function renderList() {
      const subjects = loadSubjects();
      listEl.innerHTML = "";
      if (subjects.length === 0) {
        listEl.innerHTML = `<div class="pk-text-center pk-text-muted pk-text-sm" style="padding:1.5rem 0">No subjects yet. Add one above. Or don't, I'm just a UI.</div>`;
        summaryEl.innerHTML = "";
        return;
      }
      let totalAtt = 0, totalHeld = 0;
      subjects.forEach((s, idx) => {
        const pct = calcPercent(s.attended, s.total);
        const { tone, quote } = getQuoteFor(pct);
        const color = tone === "roast" || tone === "meh" || tone === "ok" ? "#10b981" : tone === "warn" ? "#f59e0b" : "#ef4444";
        totalAtt += s.attended;
        totalHeld += s.total;
        const row = el("div", { class: "pk-card pk-card--pad-sm", style: "margin-bottom:0.5rem;display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap" });
        row.innerHTML = `
          <div style="flex:1;min-width:120px">
            <div style="font-weight:600;color:var(--pk-fg-strong);font-size:0.9rem">${escapeHtml(s.name)}</div>
            <div class="pk-text-xs pk-text-muted pk-text-mono">${s.attended}/${s.total} classes</div>
          </div>
          <div style="font-size:1.5rem;font-weight:700;color:${color};min-width:80px;text-align:right">${pct.toFixed(1)}%</div>
          <button class="pk-btn pk-btn--ghost pk-text-xs" data-del="${idx}" style="color:#ef4444" title="Delete">
            <i data-lucide="trash-2"></i>
          </button>
        `;
        listEl.appendChild(row);
      });
      // Wire delete buttons
      listEl.querySelectorAll("[data-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.del, 10);
          const subjects = loadSubjects();
          subjects.splice(idx, 1);
          saveSubjects(subjects);
          renderList();
          toast("Subject removed. (Was it the professor's fault?)", "info", 2000);
        });
      });

      const avg = calcPercent(totalAtt, totalHeld);
      const { tone, quote } = getQuoteFor(avg);
      const avgColor = tone === "roast" || tone === "meh" || tone === "ok" ? "#10b981" : tone === "warn" ? "#f59e0b" : "#ef4444";
      summaryEl.innerHTML = `
        <div class="pk-text-xs pk-text-muted pk-text-mono">OVERALL ATTENDANCE</div>
        <div style="font-size:2.5rem;font-weight:800;color:${avgColor};line-height:1.1">${avg.toFixed(1)}%</div>
        <div class="pk-text-xs pk-text-muted pk-text-mono">${totalAtt}/${totalHeld} classes across ${subjects.length} subject${subjects.length === 1 ? "" : "s"}</div>
        <div class="pk-text-sm pk-mt-2" style="font-style:italic;color:${avgColor};max-width:480px;margin:0.5rem auto 0">"${quote}"</div>
      `;
    }

    function addSubject() {
      const name = nameInput.value.trim() || `Subject ${loadSubjects().length + 1}`;
      const attended = clampPositive(attInput.value, 0);
      const total = clampPositive(totalInput.value, 0);
      if (total === 0) {
        toast("Total can't be 0. Did you even attend college?", "error");
        return;
      }
      if (attended > total) {
        toast("Attended > Total. Time-traveler alert.", "error");
        return;
      }
      const subjects = loadSubjects();
      subjects.push({ name, attended, total });
      saveSubjects(subjects);
      nameInput.value = "";
      attInput.value = "";
      totalInput.value = "";
      renderList();
      toast(`"${name}" added. Godspeed.`, "success", 2000);
      markDone();
    }

    addBtn.addEventListener("click", addSubject);
    [nameInput, attInput, totalInput].forEach((inp) => {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); addSubject(); }
      });
    });

    renderList();
    return card;
  }

  container.appendChild(wrap);
}

// Simple HTML escape for subject names
function escapeHtml(str) {
  if (str == null) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// =========================================================================
// Init
// =========================================================================

function init() {
  hydrate();
  applyTheme(getState().theme);

  document.querySelectorAll(".pk-themeswitch__btn").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(btn.dataset.theme));
  });
  subscribe("theme", (state) => applyTheme(state.theme));

  const container = document.getElementById("day10-mount");
  if (container && typeof renderTool === "function") {
    renderTool(container, {
      toast,
      markDone: () => markDone("day10-attendance"),
    });
  }

  if (window.lucide) window.lucide.createIcons();
  else window.addEventListener("load", () => window.lucide && window.lucide.createIcons());

  console.log("Day 10 — Attendance Calculator loaded. Go to class.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
