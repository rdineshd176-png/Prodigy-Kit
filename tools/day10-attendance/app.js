// =========================================================================
// Attendance Calculator — Standalone app.js (Day 10 of Prodigy Kit)
// Simple single-screen calculator: target % + attended + total → output
// Shows either "you can bunk X classes" or "you need to attend X more"
// Sarcastic commentary included. Part of Prodigy Kit (full theme system).
// =========================================================================

// =========================================================================
// Store (inlined from assets/lib/store.js)
// =========================================================================

const LS_KEYS = {
  theme: "prodigy_kit_theme",
  onboarded: "prodigy_kit_onboarded",
  progress: "prodigy_kit_progress",
  sounds: "prodigy_kit_sounds",
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

function clampPositive(n, fallback) {
  const v = Number(n);
  if (!isFinite(v) || v < 0) return fallback === undefined ? 0 : fallback;
  return v;
}

// If current % >= target: how many classes can you bunk (skip) while staying >= target?
// Uses integer arithmetic to avoid floating-point precision issues:
//   (attended - B) / total >= target/100
//   100*attended - 100*B >= target*total
//   B <= (100*attended - target*total) / 100
function calcBunks(attended, total, target) {
  if (total <= 0) return 0;
  const bunks = Math.floor((100 * attended - target * total) / 100);
  return Math.max(0, bunks);
}

// If current % < target: how many consecutive classes needed to reach target?
// Uses integer arithmetic to avoid floating-point precision issues:
//   (attended + R) / (total + R) >= target/100
//   100*(attended + R) >= target*(total + R)
//   100*attended + 100*R >= target*total + target*R
//   R*(100 - target) >= target*total - 100*attended
//   R >= (target*total - 100*attended) / (100 - target)
function calcRecovery(attended, total, target) {
  if (total <= 0) return 0;
  if ((attended / total) * 100 >= target) return 0;
  const needed = Math.ceil((target * total - 100 * attended) / (100 - target));
  return Math.max(0, needed);
}

// Sarcastic quote engine
function getQuoteFor(percent) {
  if (percent >= 95) return { color: "#10b981", quote: "95%+ attendance. Did you get a gold star? Touch grass." };
  if (percent >= 85) return { color: "#10b981", quote: "Solid. Boring, but solid. You'll survive." };
  if (percent >= 75) return { color: "#10b981", quote: "You're safe. For now. The rector is watching." };
  if (percent >= 60) return { color: "#f59e0b", quote: "Borderline. The deficiency email is being drafted." };
  if (percent >= 40) return { color: "#ef4444", quote: "Below 60%. Your parents are getting a call." };
  if (percent > 0) return { color: "#ef4444", quote: "Sub-40%. Consider this a personality trait at this point." };
  return { color: "var(--pk-fg-muted)", quote: "Zero attendance. Either you're a ghost or this is your first day." };
}

function getBunkQuote(bunks) {
  if (bunks === 0) return "0 bunks available. Tough luck, sport. Go sit in the back row.";
  if (bunks === 1) return "1 bunk. Use it wisely. Or don't. I'm a calculator, not your mom.";
  if (bunks <= 3) return `${bunks} bunks. Live your chaotic life. Don't push it further.`;
  return `${bunks} bunks. Wow. You've earned this buffer. Go enjoy a sandwich.`;
}

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

function renderTool(container, { toast: _toast, markDone }) {
  container.innerHTML = "";
  const wrap = el("div");

  wrap.innerHTML = `
    <div class="pk-card">
      <p class="pk-text-sm pk-text-muted pk-mb-3" style="text-align:center">
        Math you'll actually use. Unlike calculus.
      </p>

      <!-- Target percentage selector -->
      <div class="pk-mb-3">
        <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block" for="att-target">Percentage Required</label>
        <select id="att-target" style="width:100%;padding:0.625rem 0.75rem;background:var(--pk-card-bg);border:1px solid var(--pk-border);border-radius:var(--pk-radius-sm);color:var(--pk-fg);font-size:1rem;cursor:pointer">
          <option value="60">60%</option>
          <option value="65">65%</option>
          <option value="70">70%</option>
          <option value="75" selected>75%</option>
          <option value="80">80%</option>
          <option value="85">85%</option>
          <option value="90">90%</option>
        </select>
      </div>

      <!-- Present / Total inputs -->
      <div class="pk-grid-2 pk-mb-3">
        <div>
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block" for="att-attended">Classes Attended</label>
          <input type="number" id="att-attended" min="0" placeholder="e.g. 30" autocomplete="off"
            style="width:100%;padding:0.75rem;background:var(--pk-card-bg);border:1px solid var(--pk-card-border);border-radius:var(--pk-radius-sm);color:var(--pk-fg);font-size:1.1rem;font-family:var(--pk-font-mono);outline:none" />
        </div>
        <div>
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block" for="att-total">Total Classes Held</label>
          <input type="number" id="att-total" min="0" placeholder="e.g. 40" autocomplete="off"
            style="width:100%;padding:0.75rem;background:var(--pk-card-bg);border:1px solid var(--pk-card-border);border-radius:var(--pk-radius-sm);color:var(--pk-fg);font-size:1.1rem;font-family:var(--pk-font-mono);outline:none" />
        </div>
      </div>

      <button class="pk-btn pk-btn--primary pk-btn--lg" id="att-calc" style="width:100%">
        <i data-lucide="calculator"></i>
        <span>Calculate</span>
      </button>

      <div id="att-output" class="pk-text-center" style="margin-top:1.5rem;min-height:140px"></div>
    </div>

    <!-- Info card -->
    <div class="pk-card pk-mt-4">
      <h3 style="font-size:0.95rem;margin-bottom:0.5rem">How this works</h3>
      <p class="pk-text-sm pk-text-muted">
        Enter your current attendance numbers and target percentage. If you're above target, you'll see
        how many classes you can safely bunk. If you're below, you'll see how many consecutive classes you
        need to attend to claw your way back. Sarcastic commentary is free of charge.
      </p>
    </div>
  `;

  const targetSelect = wrap.querySelector("#att-target");
  const attInput = wrap.querySelector("#att-attended");
  const totInput = wrap.querySelector("#att-total");
  const calcBtn = wrap.querySelector("#att-calc");
  const outputEl = wrap.querySelector("#att-output");

  function calculate() {
    const target = Math.max(0, Math.min(100, clampPositive(targetSelect.value, 75)));
    const attended = clampPositive(attInput.value, 0);
    const total = clampPositive(totInput.value, 0);

    // Edge cases
    if (total === 0 && attended === 0) {
      outputEl.innerHTML = `<div class="pk-text-sm pk-text-muted">Type your numbers above and hit Calculate.</div>`;
      return;
    }
    if (total === 0) {
      outputEl.innerHTML = `<div class="pk-text-sm" style="color:#ef4444">Total can't be 0. Did you even attend college?</div>`;
      return;
    }
    if (attended > total) {
      outputEl.innerHTML = `
        <div style="font-size:1.1rem;font-weight:600;color:#ef4444">⏰ Time-traveler detected</div>
        <div class="pk-text-sm pk-text-muted pk-mt-2">You can't attend more classes than were held. Unless you have a TARDIS.</div>
      `;
      return;
    }

    const currentPct = (attended / total) * 100;
    const q = getQuoteFor(currentPct);

    if (currentPct >= target) {
      // Above target → show bunks available
      const bunks = calcBunks(attended, total, target);
      const finalAttended = attended - bunks;
      const finalPct = total > 0 ? (finalAttended / total) * 100 : 0;
      const bunkQuote = getBunkQuote(bunks);
      outputEl.innerHTML = `
        <div class="pk-text-xs pk-text-muted pk-text-mono" style="letter-spacing:0.1em">CURRENT ATTENDANCE</div>
        <div style="font-size:2.5rem;font-weight:800;color:${q.color};line-height:1.1;margin:0.25rem 0">${currentPct.toFixed(1)}<span style="font-size:1.25rem">%</span></div>
        <div class="pk-text-xs pk-text-muted pk-text-mono">${attended} / ${total} classes</div>
        <div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--pk-card-border)">
          <div class="pk-text-xs pk-text-muted pk-text-mono" style="letter-spacing:0.1em">YOU CAN BUNK</div>
          <div style="font-size:3rem;font-weight:800;color:var(--pk-accent);line-height:1">${bunks}</div>
          <div class="pk-text-xs pk-text-muted pk-text-mono">class${bunks === 1 ? "" : "es"} while staying ≥ ${target}%</div>
          ${bunks > 0 ? `<div class="pk-text-xs pk-text-muted pk-text-mono pk-mt-2">after bunking ${bunks}: ${finalAttended}/${total} = ${finalPct.toFixed(2)}%</div>` : ""}
        </div>
        <div class="pk-text-sm pk-mt-3" style="font-style:italic;color:${q.color};max-width:480px;margin:0.75rem auto 0">"${bunkQuote}"</div>
      `;
    } else {
      // Below target → show recovery needed
      const needed = calcRecovery(attended, total, target);
      const futureAttended = attended + needed;
      const futureTotal = total + needed;
      const futurePct = (futureAttended / futureTotal) * 100;
      const recoveryQuote = getRecoveryQuote(needed);
      outputEl.innerHTML = `
        <div class="pk-text-xs pk-text-muted pk-text-mono" style="letter-spacing:0.1em">CURRENT ATTENDANCE</div>
        <div style="font-size:2.5rem;font-weight:800;color:${q.color};line-height:1.1;margin:0.25rem 0">${currentPct.toFixed(1)}<span style="font-size:1.25rem">%</span></div>
        <div class="pk-text-xs pk-text-muted pk-text-mono">${attended} / ${total} classes</div>
        <div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--pk-card-border)">
          <div class="pk-text-xs pk-text-muted pk-text-mono" style="letter-spacing:0.1em">YOU NEED TO ATTEND</div>
          <div style="font-size:3rem;font-weight:800;color:var(--pk-accent);line-height:1">${needed}</div>
          <div class="pk-text-xs pk-text-muted pk-text-mono">consecutive class${needed === 1 ? "" : "es"} to reach ${target}%</div>
          <div class="pk-text-xs pk-text-muted pk-text-mono pk-mt-2">after attending ${needed}: ${futureAttended}/${futureTotal} = ${futurePct.toFixed(2)}%</div>
        </div>
        <div class="pk-text-sm pk-mt-3" style="font-style:italic;color:${q.color};max-width:480px;margin:0.75rem auto 0">"${recoveryQuote}"</div>
      `;
    }

    markDone();
  }

  calcBtn.addEventListener("click", calculate);
  // Enter key also triggers calculate
  [attInput, totInput].forEach((inp) => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); calculate(); }
    });
  });

  // Initial placeholder
  outputEl.innerHTML = `<div class="pk-text-sm pk-text-muted">Type your numbers above and hit Calculate.</div>`;

  container.appendChild(wrap);
  if (window.lucide) window.lucide.createIcons();
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
