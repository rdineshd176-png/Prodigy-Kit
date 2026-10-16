// =========================================================================
// QR Studio — Standalone app.js (Day 5 of Prodigy Kit)
// Fully self-contained: store + theme logic + tool rendering
// No external dependencies except the library imports below
// =========================================================================

// Library imports (must be at top of ES module)
import QRCode from "https://esm.sh/qrcode@1.5.4";

// =========================================================================
// Store (inlined from assets/lib/store.js)
// =========================================================================

// =========================================================================
// Prodigy Kit — Global Store
// Tiny pub/sub state manager. Vanilla JS, no framework needed.
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

// ---- Hydrate from localStorage ----
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

// ---- Theme ----
function setTheme(theme) {
  if (!["pro", "arcade", "pookie"].includes(theme)) return;
  state.theme = theme;
  try { localStorage.setItem(LS_KEYS.theme, theme); } catch {}
  emit("theme");
}

// ---- Onboarding ----
function setOnboarded(v = true) {
  state.onboarded = v;
  try { localStorage.setItem(LS_KEYS.onboarded, String(v)); } catch {}
  emit("onboarded");
}

// ---- Progress ----
function markDone(toolId) {
  if (state.progress[toolId]) return;
  state.progress[toolId] = true;
  try { localStorage.setItem(LS_KEYS.progress, JSON.stringify(state.progress)); } catch {}
  emit("progress");
}

function isDone(toolId) {
  return !!state.progress[toolId];
}

// ---- Toast (lightweight) ----
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

const LOGO_ICONS = {'pro': 'gem', 'arcade': 'trophy', 'pookie': 'sparkles'};

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const themeColor = theme === "pookie" ? "#fef6f9" : theme === "arcade" ? "#050208" : "#150826";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", themeColor);
  document.querySelectorAll(".pk-themeswitch__btn").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.theme === theme));
  });
  // Update logo mark icon based on theme
  const logoMark = document.querySelector(".pk-logo__mark");
  if (logoMark) {
    logoMark.innerHTML = `<i data-lucide="${LOGO_ICONS[theme] || "gem"}"></i>`;
  }
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

// =========================================================================
// Tool rendering (inlined from day-05-qr-studio.js)
// =========================================================================

// =========================================================================
// Day 5 — Non-Expiring QR Code Studio
// Generates static QR codes for URLs, Wi-Fi credentials, or plain text
// Custom foreground/background colors, PNG/SVG export, zero tracking
// Uses qrcode library (CDN)
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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderTool(container, { toast, markDone }) {
  container.innerHTML = "";
  const wrap = el("div");

  const state = {
    type: "url", // url | wifi | text
    fgColor: "#0b0b14",
    bgColor: "#ffffff",
    size: 320,
    ecc: "M", // L, M, Q, H
  };

  // Layout
  wrap.innerHTML = `
    <div class="pk-grid-2" style="gap:1.5rem;align-items:start">
      <div>
        <!-- Type tabs -->
        <div class="pk-tabs" role="tablist">
          <button class="pk-tab" role="tab" data-type="url" aria-selected="true">🔗 URL</button>
          <button class="pk-tab" role="tab" data-type="wifi" aria-selected="false">📶 Wi-Fi</button>
          <button class="pk-tab" role="tab" data-type="text" aria-selected="false">📝 Text</button>
        </div>

        <!-- URL form -->
        <div class="qr-form" data-form="url">
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block;margin-top:1rem">URL</label>
          <input type="url" id="qr-url" placeholder="https://example.com" style="width:100%" />
        </div>

        <!-- Wi-Fi form -->
        <div class="qr-form" data-form="wifi" style="display:none">
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block;margin-top:1rem">SSID (network name)</label>
          <input type="text" id="qr-ssid" placeholder="MyHomeWiFi" style="width:100%;margin-bottom:0.75rem" />
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Password</label>
          <input type="text" id="qr-pass" placeholder="••••••••" style="width:100%;margin-bottom:0.75rem" />
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Encryption</label>
          <select id="qr-enc" style="width:100%;padding:0.5rem 0.75rem;background:var(--pk-card-bg);border:1px solid var(--pk-border);border-radius:var(--pk-radius-sm);color:var(--pk-fg)">
            <option value="WPA">WPA/WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">None (open)</option>
          </select>
        </div>

        <!-- Text form -->
        <div class="qr-form" data-form="text" style="display:none">
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block;margin-top:1rem">Text content</label>
          <textarea id="qr-text" rows="4" placeholder="Any text up to ~2,000 chars" style="width:100%;resize:vertical"></textarea>
        </div>

        <!-- Style controls -->
        <div class="pk-card pk-card--pad-sm pk-mt-3">
          <h4 style="font-size:0.875rem;margin-bottom:0.75rem">Style</h4>

          <div class="pk-flex pk-gap-3" style="flex-wrap:wrap;margin-bottom:0.75rem">
            <label class="pk-flex pk-gap-2 pk-text-sm" style="align-items:center">
              <span style="width:24px;height:24px;border-radius:var(--pk-radius-sm);border:1px solid var(--pk-border);background:#0b0b14" id="qr-fg-preview"></span>
              <span>Foreground</span>
              <input type="color" id="qr-fg" value="#0b0b14" style="width:40px;height:32px;padding:0;border:none;background:none;cursor:pointer" />
            </label>
            <label class="pk-flex pk-gap-2 pk-text-sm" style="align-items:center">
              <span style="width:24px;height:24px;border-radius:var(--pk-radius-sm);border:1px solid var(--pk-border);background:#ffffff" id="qr-bg-preview"></span>
              <span>Background</span>
              <input type="color" id="qr-bg" value="#ffffff" style="width:40px;height:32px;padding:0;border:none;background:none;cursor:pointer" />
            </label>
          </div>

          <div class="pk-flex pk-gap-3" style="flex-wrap:wrap;align-items:center">
            <label class="pk-flex pk-gap-2 pk-text-sm" style="align-items:center">
              <span>Error correction:</span>
              <select id="qr-ecc" style="padding:0.4rem 0.5rem;background:var(--pk-card-bg);border:1px solid var(--pk-border);border-radius:var(--pk-radius-sm);color:var(--pk-fg)">
                <option value="L">Low (7%)</option>
                <option value="M" selected>Medium (15%)</option>
                <option value="Q">Quartile (25%)</option>
                <option value="H">High (30%)</option>
              </select>
            </label>
            <label class="pk-flex pk-gap-2 pk-text-sm" style="align-items:center">
              <span>Size:</span>
              <input type="range" id="qr-size" min="128" max="1024" value="320" step="32" style="width:120px" />
              <span class="pk-text-xs pk-text-mono" id="qr-size-val">320px</span>
            </label>
          </div>

          <div class="pk-flex pk-gap-2 pk-mt-2" style="flex-wrap:wrap">
            <button class="pk-btn pk-btn--ghost pk-text-xs" data-preset="classic">Classic</button>
            <button class="pk-btn pk-btn--ghost pk-text-xs" data-preset="dark">Dark mode</button>
            <button class="pk-btn pk-btn--ghost pk-text-xs" data-preset="forest">Forest</button>
            <button class="pk-btn pk-btn--ghost pk-text-xs" data-preset="sunset">Sunset</button>
            <button class="pk-btn pk-btn--ghost pk-text-xs" data-preset="cmyk">CMYK print</button>
          </div>
        </div>
      </div>

      <!-- Preview + export -->
      <div>
        <div class="pk-card" style="text-align:center">
          <div id="qr-canvas-wrap" style="display:inline-block;padding:1rem;background:#fff;border-radius:var(--pk-radius)">
            <canvas id="qr-canvas"></canvas>
          </div>
          <div id="qr-error" class="pk-text-sm pk-text-muted pk-mt-2" style="display:none"></div>
          <div class="pk-flex pk-gap-2 pk-mt-3">
            <button class="pk-btn pk-btn--primary" id="qr-download-png" style="flex:1">⬇ PNG</button>
            <button class="pk-btn" id="qr-download-svg" style="flex:1">⬇ SVG</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // ---------- Helpers ----------
  const canvas = wrap.querySelector("#qr-canvas");
  const ctx = canvas.getContext("2d");
  const errorEl = wrap.querySelector("#qr-error");

  function getQRString() {
    if (state.type === "url") {
      const v = wrap.querySelector("#qr-url").value.trim();
      if (!v) return null;
      // Add https:// if missing
      if (!/^https?:\/\//i.test(v)) return "https://" + v;
      return v;
    }
    if (state.type === "wifi") {
      const ssid = wrap.querySelector("#qr-ssid").value.trim();
      const pass = wrap.querySelector("#qr-pass").value;
      const enc = wrap.querySelector("#qr-enc").value;
      if (!ssid) return null;
      // Wi-Fi QR format: WIFI:T:WPA;S:ssid;P:pass;;
      const escape = (s) => s.replace(/([\\;,:"])/g, "\\$1");
      if (enc === "nopass") return `WIFI:T:nopass;S:${escape(ssid)};;`;
      return `WIFI:T:${enc};S:${escape(ssid)};P:${escape(pass)};;`;
    }
    if (state.type === "text") {
      const v = wrap.querySelector("#qr-text").value;
      return v.trim() ? v : null;
    }
    return null;
  }

  async function renderQR() {
    const data = getQRString();
    if (!data) {
      canvas.width = 256;
      canvas.height = 256;
      ctx.clearRect(0, 0, 256, 256);
      errorEl.style.display = "block";
      errorEl.textContent = state.type === "url"
        ? "Type a URL above to preview the QR"
        : state.type === "wifi"
        ? "Enter an SSID to preview the Wi-Fi QR"
        : "Type some text to preview the QR";
      return;
    }
    errorEl.style.display = "none";
    try {
      await QRCode.toCanvas(canvas, data, {
        width: state.size,
        margin: 2,
        errorCorrectionLevel: state.ecc,
        color: {
          dark: state.fgColor,
          light: state.bgColor,
        },
      });
      // Update wrapper background
      wrap.querySelector("#qr-canvas-wrap").style.background = state.bgColor;
    } catch (e) {
      console.error(e);
      errorEl.style.display = "block";
      errorEl.textContent = "Data too long for QR code. Try shorter text or lower error correction.";
    }
  }

  async function downloadPNG() {
    const data = getQRString();
    if (!data) { toast("Enter QR content first", "error"); return; }
    try {
      const tmpCanvas = document.createElement("canvas");
      await QRCode.toCanvas(tmpCanvas, data, {
        width: 1024, margin: 2, errorCorrectionLevel: state.ecc,
        color: { dark: state.fgColor, light: state.bgColor },
      });
      tmpCanvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, `qrcode-${Date.now()}.png`);
          toast("PNG downloaded (1024×1024)", "success");
          markDone();
        }
      });
    } catch (e) { toast("PNG export failed", "error"); }
  }

  async function downloadSVG() {
    const data = getQRString();
    if (!data) { toast("Enter QR content first", "error"); return; }
    try {
      const svg = await QRCode.toString(data, {
        type: "svg", margin: 2, errorCorrectionLevel: state.ecc,
        color: { dark: state.fgColor, light: state.bgColor },
      });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      downloadBlob(blob, `qrcode-${Date.now()}.svg`);
      toast("SVG downloaded (vector)", "success");
      markDone();
    } catch (e) { toast("SVG export failed", "error"); }
  }

  // ---------- Wire events ----------
  // Type tabs
  wrap.querySelectorAll(".pk-tab[data-type]").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.type = tab.dataset.type;
      wrap.querySelectorAll(".pk-tab[data-type]").forEach((t) =>
        t.setAttribute("aria-selected", String(t.dataset.type === state.type)));
      wrap.querySelectorAll(".qr-form").forEach((f) => {
        f.style.display = f.dataset.form === state.type ? "block" : "none";
      });
      renderQR();
    });
  });

  // Color pickers
  wrap.querySelector("#qr-fg").addEventListener("input", (e) => {
    state.fgColor = e.target.value;
    wrap.querySelector("#qr-fg-preview").style.background = state.fgColor;
    renderQR();
  });
  wrap.querySelector("#qr-bg").addEventListener("input", (e) => {
    state.bgColor = e.target.value;
    wrap.querySelector("#qr-bg-preview").style.background = state.bgColor;
    renderQR();
  });

  // ECC
  wrap.querySelector("#qr-ecc").addEventListener("change", (e) => {
    state.ecc = e.target.value;
    renderQR();
  });

  // Size
  wrap.querySelector("#qr-size").addEventListener("input", (e) => {
    state.size = parseInt(e.target.value, 10);
    wrap.querySelector("#qr-size-val").textContent = `${state.size}px`;
    renderQR();
  });

  // Inputs (debounced)
  let inputTimer;
  ["#qr-url", "#qr-ssid", "#qr-pass", "#qr-enc", "#qr-text"].forEach((sel) => {
    wrap.querySelector(sel).addEventListener("input", () => {
      clearTimeout(inputTimer);
      inputTimer = setTimeout(renderQR, 150);
    });
  });

  // Presets
  const presets = {
    classic: { fg: "#0b0b14", bg: "#ffffff" },
    dark: { fg: "#ffffff", bg: "#0b0b14" },
    forest: { fg: "#1f4d2e", bg: "#f5f0e6" },
    sunset: { fg: "#7a1f3d", bg: "#fcd6a1" },
    cmyk: { fg: "#000000", bg: "#ffffff" },
  };
  wrap.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = presets[btn.dataset.preset];
      state.fgColor = p.fg;
      state.bgColor = p.bg;
      wrap.querySelector("#qr-fg").value = p.fg;
      wrap.querySelector("#qr-bg").value = p.bg;
      wrap.querySelector("#qr-fg-preview").style.background = p.fg;
      wrap.querySelector("#qr-bg-preview").style.background = p.bg;
      renderQR();
    });
  });

  // Download
  wrap.querySelector("#qr-download-png").addEventListener("click", downloadPNG);
  wrap.querySelector("#qr-download-svg").addEventListener("click", downloadSVG);

  // Initial render
  renderQR();

  // Info card
  const info = el("div", { class: "pk-card pk-mt-4" });
  info.innerHTML = `
    <h3 style="font-size:0.95rem;margin-bottom:0.5rem">Why this is different</h3>
    <p class="pk-text-sm pk-text-muted">
      Most "free" QR generators route your data through their servers, embed tracking redirects,
      or expire after 7 days. These QR codes are static — the data is encoded directly into the matrix
      and the code works forever. <strong>Wi-Fi QR codes</strong> use the standard
      <code class="pk-text-mono">WIFI:T:WPA;S:name;P:pass;;</code> format supported by iOS 11+ and most
      Android phones. <strong>Error correction</strong> levels let you trade density for resilience —
      pick "High" if your QR will be printed or partially obscured.
    </p>
  `;
  wrap.appendChild(info);

  container.appendChild(wrap);
}


// =========================================================================
// Init
// =========================================================================

function init() {
  hydrate();
  applyTheme(getState().theme);

  // Wire theme switcher
  document.querySelectorAll(".pk-themeswitch__btn").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(btn.dataset.theme));
  });
  subscribe("theme", (state) => applyTheme(state.theme));

  // Mount the tool
  const container = document.getElementById("day5-mount");
  if (container && typeof renderTool === "function") {
    renderTool(container, {
      toast,
      markDone: () => markDone("day5-qr"),
    });
  }

  // Refresh Lucide icons
  if (window.lucide) window.lucide.createIcons();
  else window.addEventListener("load", () => window.lucide && window.lucide.createIcons());

  console.log("Day 5 — QR Studio loaded.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
