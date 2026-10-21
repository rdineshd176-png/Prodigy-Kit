// =========================================================================
// Markdown → PDF — Standalone app.js (Day 7 of Prodigy Kit)
// Fully self-contained: store + theme logic + tool rendering
// No external dependencies except the library imports below
// =========================================================================

// Library imports (must be at top of ES module)
import { marked } from "https://esm.sh/marked@18.1.0";
import html2pdf from "https://esm.sh/html2pdf.js@0.14.0";

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
// Tool rendering (inlined from day-07-markdown-pdf.js)
// =========================================================================

// =========================================================================
// Day 7 — Markdown-to-PDF Lab & Resume Formatter
// Split-screen live preview, marked.js for parsing, html2pdf.js for export
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

const DEFAULT_MARKDOWN = `# My Document

Welcome to **Prodigy Kit**'s Markdown-to-PDF lab. Type Markdown on the left and watch the live A4 preview on the right.

## Features

- Live split-screen preview
- Code syntax highlighting
- One-click PDF download
- Resume-friendly styling

## Code example

\`\`\`javascript
function hello(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Quote

> "The best way to predict the future is to invent it." — Alan Kay

## Table

| Day | Tool |
|-----|------|
| 1   | PDF Toolkit |
| 2   | Image Compressor |
| 3   | EXIF Scrubber |

---

Type your own content here and **Download PDF** when ready.`;

function renderTool(container, { toast, markDone }) {
  container.innerHTML = "";
  const wrap = el("div");

  // Configure marked
  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  // Style presets
  const STYLES = {
    article: {
      label: "Article",
      css: `body{font-family:'Inter',Georgia,sans-serif;font-size:14px;line-height:1.7;color:#111;max-width:680px;margin:0 auto;padding:40px}
      h1{font-size:28px;margin:24px 0 12px;border-bottom:2px solid #111;padding-bottom:6px}
      h2{font-size:22px;margin:24px 0 12px;border-bottom:1px solid #ccc;padding-bottom:4px}
      h3{font-size:18px;margin:20px 0 8px}
      p{margin:8px 0}
      blockquote{border-left:4px solid #888;padding:8px 16px;margin:16px 0;color:#555;background:#f7f7f7}
      pre{background:#1e1e1e;color:#eee;padding:14px;border-radius:6px;overflow-x:auto;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.4}
      code{font-family:'JetBrains Mono',monospace;background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:90%}
      pre code{background:none;padding:0}
      table{border-collapse:collapse;width:100%;margin:12px 0}
      th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}
      th{background:#f0f0f0;font-weight:600}
      a{color:#1f6feb;text-decoration:none}
      img{max-width:100%}
      hr{border:none;border-top:1px solid #ccc;margin:20px 0}`,
    },
    resume: {
      label: "Resume",
      css: `body{font-family:'Inter',Arial,sans-serif;font-size:12px;line-height:1.5;color:#222;max-width:680px;margin:0 auto;padding:32px}
      h1{font-size:24px;text-align:center;margin:0 0 4px;letter-spacing:0.5px}
      h2{font-size:14px;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #222;padding-bottom:2px;margin:18px 0 8px}
      h3{font-size:13px;margin:10px 0 4px}
      p{margin:6px 0}
      ul{margin:6px 0;padding-left:20px}
      li{margin:2px 0}
      blockquote{font-style:italic;color:#555;margin:8px 0;padding-left:8px;border-left:2px solid #ccc}
      pre{background:#f5f5f5;padding:10px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:11px}
      code{font-family:'JetBrains Mono',monospace;background:#f0f0f0;padding:1px 3px;border-radius:2px}
      table{border-collapse:collapse;width:100%;margin:10px 0}
      th,td{border:1px solid #ccc;padding:4px 8px;text-align:left}
      th{background:#f5f5f5}
      a{color:#222;text-decoration:none}`,
    },
    academic: {
      label: "Academic",
      css: `body{font-family:'Times New Roman',Georgia,serif;font-size:13px;line-height:1.6;color:#000;max-width:680px;margin:0 auto;padding:48px}
      h1{font-size:22px;text-align:center;margin:0 0 24px}
      h2{font-size:16px;margin:24px 0 8px}
      h3{font-size:14px;margin:18px 0 6px}
      p{margin:8px 0;text-indent:24px}
      p:first-of-type, h1+p, h2+p, h3+p{text-indent:0}
      blockquote{font-style:italic;margin:12px 24px;padding-left:8px;border-left:2px solid #888}
      pre{background:#f5f5f5;padding:10px;border-radius:3px;font-family:'Courier New',monospace;font-size:11px}
      code{font-family:'Courier New',monospace;background:#f0f0f0;padding:0 2px}
      table{border-collapse:collapse;width:100%;margin:12px 0}
      th,td{border:1px solid #000;padding:4px 8px;text-align:left}
      th{background:#e0e0e0;font-weight:bold}
      a{color:#000;text-decoration:underline}`,
    },
  };

  wrap.innerHTML = `
    <!-- Style selector + actions -->
    <div class="pk-flex pk-mb-3" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
      <div class="pk-flex pk-gap-2 pk-text-sm" style="align-items:center">
        <label>Style:</label>
        <select id="md-style" style="padding:0.4rem 0.625rem;background:var(--pk-card-bg);border:1px solid var(--pk-border);border-radius:var(--pk-radius-sm);color:var(--pk-fg)">
          ${Object.entries(STYLES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}
        </select>
      </div>
      <div class="pk-flex pk-gap-2">
        <button class="pk-btn" id="md-clear">Clear</button>
        <button class="pk-btn pk-btn--primary" id="md-download">⬇ Download PDF</button>
      </div>
    </div>

    <!-- Split screen -->
    <div class="pk-grid-2" style="gap:0.75rem;min-height:480px">
      <div style="display:flex;flex-direction:column">
        <div class="pk-text-xs pk-text-muted pk-mb-2" style="font-family:var(--pk-font-mono)">MARKDOWN</div>
        <textarea id="md-input" style="flex:1;width:100%;resize:vertical;font-family:var(--pk-font-mono);font-size:0.85rem;line-height:1.5;padding:1rem;background:var(--pk-card-bg);border:1px solid var(--pk-card-border);border-radius:var(--pk-radius);color:var(--pk-fg);min-height:420px" spellcheck="false">${DEFAULT_MARKDOWN}</textarea>
      </div>
      <div style="display:flex;flex-direction:column">
        <div class="pk-text-xs pk-text-muted pk-mb-2" style="font-family:var(--pk-font-mono)">PREVIEW (A4)</div>
        <div id="md-preview-wrap" style="flex:1;overflow:auto;max-height:600px;border:1px solid var(--pk-card-border);border-radius:var(--pk-radius);background:#fff;color:#111">
          <div id="md-preview" style="padding:0"></div>
        </div>
      </div>
    </div>
  `;

  const input = wrap.querySelector("#md-input");
  const preview = wrap.querySelector("#md-preview");
  const styleSelect = wrap.querySelector("#md-style");

  function renderPreview() {
    const md = input.value;
    const html = marked.parse(md);
    const styleKey = styleSelect.value;
    const css = STYLES[styleKey].css;
    preview.innerHTML = `
      <style>${css}</style>
      <div class="md-content">${html}</div>
    `;
  }

  let renderTimer;
  input.addEventListener("input", () => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPreview, 200);
  });
  styleSelect.addEventListener("change", renderPreview);

  wrap.querySelector("#md-clear").addEventListener("click", () => {
    if (confirm("Clear all text?")) {
      input.value = "";
      renderPreview();
    }
  });

  wrap.querySelector("#md-download").addEventListener("click", async () => {
    const btn = wrap.querySelector("#md-download");
    btn.disabled = true;
    btn.innerHTML = `<span class="pk-spinner"></span> Generating…`;
    try {
      const styleKey = styleSelect.value;
      const css = STYLES[styleKey].css;
      const html = marked.parse(input.value);
      // Build a full HTML document for html2pdf
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;
      const container = document.createElement("div");
      container.innerHTML = fullHtml;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `document-${Date.now()}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
      // Wait for any syntax highlighter etc.
      await html2pdf().set(opt).from(container).save();
      toast("PDF downloaded", "success");
      markDone();
    } catch (e) {
      console.error(e);
      toast("PDF generation failed: " + e.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "⬇ Download PDF";
    }
  });

  // Initial render
  renderPreview();

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
  const container = document.getElementById("day7-mount");
  if (container && typeof renderTool === "function") {
    renderTool(container, {
      toast,
      markDone: () => markDone("day7-markdown"),
    });
  }

  // Refresh Lucide icons
  if (window.lucide) window.lucide.createIcons();
  else window.addEventListener("load", () => window.lucide && window.lucide.createIcons());

  console.log("Day 7 — Markdown → PDF loaded.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
