// =========================================================================
// Markdown → PDF — Standalone app.js (Day 7 of Prodigy Kit)
// Fully self-contained: store + theme logic + tool rendering
// No external dependencies except the library imports below
//
// BUG FIXES vs original:
//  1. CSS selectors now scoped to `.md-content` (was `body{...}` which never
//     applied because content lives in a <div>, not a <body>).
//  2. Preview CSS no longer leaks globally — won't override page h1/h2/p styles.
//  3. PDF export now wraps markdown in `<div class="md-content">` and attaches
//     the container to the DOM off-screen, so html2canvas computes layout
//     correctly and the chosen style's padding/centering actually applies.
//  4. Added Copy-as-HTML button, sample-doc loader, character count, and a
//     download-success toast that actually fires.
// =========================================================================

// Library imports (must be at top of ES module)
import { marked } from "https://esm.sh/marked@18.1.0";
import html2pdf from "https://esm.sh/html2pdf.js@0.14.0";

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

// ---------------------------------------------------------------------------
// BUG FIX: All CSS selectors now scoped to `.md-content`
// Previously: `body{...}` never applied because content lives in a <div>,
// not a <body>. Also generic `h1{...}` selectors leaked globally and could
// override page styles. Now everything is prefixed with `.md-content`.
// ---------------------------------------------------------------------------

const STYLES = {
  article: {
    label: "Article",
    css: `
.md-content {
  font-family: 'Inter', Georgia, sans-serif;
  font-size: 14px;
  line-height: 1.7;
  color: #111;
  max-width: 680px;
  margin: 0 auto;
  padding: 40px;
}
.md-content h1 { font-size: 28px; margin: 24px 0 12px; border-bottom: 2px solid #111; padding-bottom: 6px; }
.md-content h2 { font-size: 22px; margin: 24px 0 12px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
.md-content h3 { font-size: 18px; margin: 20px 0 8px; }
.md-content p  { margin: 8px 0; }
.md-content ul, .md-content ol { margin: 8px 0; padding-left: 24px; }
.md-content li { margin: 2px 0; }
.md-content blockquote { border-left: 4px solid #888; padding: 8px 16px; margin: 16px 0; color: #555; background: #f7f7f7; }
.md-content pre { background: #1e1e1e; color: #eee; padding: 14px; border-radius: 6px; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.4; }
.md-content code { font-family: 'JetBrains Mono', monospace; background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 90%; }
.md-content pre code { background: none; padding: 0; color: #eee; }
.md-content table { border-collapse: collapse; width: 100%; margin: 12px 0; }
.md-content th, .md-content td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
.md-content th { background: #f0f0f0; font-weight: 600; }
.md-content a { color: #1f6feb; text-decoration: none; }
.md-content a:hover { text-decoration: underline; }
.md-content img { max-width: 100%; height: auto; }
.md-content hr { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
`,
  },
  resume: {
    label: "Resume",
    css: `
.md-content {
  font-family: 'Inter', Arial, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  color: #222;
  max-width: 680px;
  margin: 0 auto;
  padding: 32px;
}
.md-content h1 { font-size: 24px; text-align: center; margin: 0 0 4px; letter-spacing: 0.5px; }
.md-content h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #222; padding-bottom: 2px; margin: 18px 0 8px; }
.md-content h3 { font-size: 13px; margin: 10px 0 4px; }
.md-content p  { margin: 6px 0; }
.md-content ul, .md-content ol { margin: 6px 0; padding-left: 20px; }
.md-content li { margin: 2px 0; }
.md-content blockquote { font-style: italic; color: #555; margin: 8px 0; padding-left: 8px; border-left: 2px solid #ccc; }
.md-content pre { background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 11px; overflow-x: auto; }
.md-content code { font-family: 'JetBrains Mono', monospace; background: #f0f0f0; padding: 1px 3px; border-radius: 2px; }
.md-content pre code { background: none; padding: 0; }
.md-content table { border-collapse: collapse; width: 100%; margin: 10px 0; }
.md-content th, .md-content td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
.md-content th { background: #f5f5f5; }
.md-content a { color: #222; text-decoration: none; }
.md-content img { max-width: 100%; height: auto; }
.md-content hr { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
`,
  },
  academic: {
    label: "Academic",
    css: `
.md-content {
  font-family: 'Times New Roman', Georgia, serif;
  font-size: 13px;
  line-height: 1.6;
  color: #000;
  max-width: 680px;
  margin: 0 auto;
  padding: 48px;
}
.md-content h1 { font-size: 22px; text-align: center; margin: 0 0 24px; }
.md-content h2 { font-size: 16px; margin: 24px 0 8px; }
.md-content h3 { font-size: 14px; margin: 18px 0 6px; }
.md-content p  { margin: 8px 0; text-indent: 24px; }
.md-content p:first-of-type, .md-content h1 + p, .md-content h2 + p, .md-content h3 + p { text-indent: 0; }
.md-content ul, .md-content ol { margin: 8px 0; padding-left: 24px; }
.md-content li { margin: 2px 0; }
.md-content blockquote { font-style: italic; margin: 12px 24px; padding-left: 8px; border-left: 2px solid #888; }
.md-content pre { background: #f5f5f5; padding: 10px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 11px; overflow-x: auto; }
.md-content code { font-family: 'Courier New', monospace; background: #f0f0f0; padding: 0 2px; }
.md-content pre code { background: none; padding: 0; }
.md-content table { border-collapse: collapse; width: 100%; margin: 12px 0; }
.md-content th, .md-content td { border: 1px solid #000; padding: 4px 8px; text-align: left; }
.md-content th { background: #e0e0e0; font-weight: bold; }
.md-content a { color: #000; text-decoration: underline; }
.md-content img { max-width: 100%; height: auto; }
.md-content hr { border: none; border-top: 1px solid #000; margin: 20px 0; }
`,
  },
};

function renderTool(container, { toast, markDone }) {
  container.innerHTML = "";
  const wrap = el("div");

  wrap.innerHTML = `
    <!-- Style selector + actions -->
    <div class="pk-flex pk-mb-3" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
      <div class="pk-flex pk-gap-2 pk-text-sm" style="align-items:center;flex-wrap:wrap">
        <label>Style:</label>
        <select id="md-style" style="padding:0.4rem 0.625rem;background:var(--pk-card-bg);border:1px solid var(--pk-border);border-radius:var(--pk-radius-sm);color:var(--pk-fg)">
          ${Object.entries(STYLES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}
        </select>
        <button class="pk-btn pk-btn--ghost pk-text-xs" id="md-sample" title="Load sample document">↺ Sample</button>
        <span id="md-count" class="pk-text-xs pk-text-subtle pk-text-mono"></span>
      </div>
      <div class="pk-flex pk-gap-2">
        <button class="pk-btn" id="md-copy" title="Copy HTML to clipboard">📋 Copy HTML</button>
        <button class="pk-btn" id="md-clear" title="Clear editor">✕ Clear</button>
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
  const countEl = wrap.querySelector("#md-count");

  function renderPreview() {
    const md = input.value;
    let html;
    try {
      html = marked.parse(md, { gfm: true, breaks: false });
    } catch (e) {
      html = `<p style="color:#c00">Markdown parse error: ${e.message}</p>`;
    }
    const styleKey = styleSelect.value;
    const css = STYLES[styleKey].css;
    // BUG FIX: CSS is scoped to .md-content, so it applies cleanly inside this
    // container AND inside the PDF export container. No global leakage.
    preview.innerHTML = `<style>${css}</style><div class="md-content">${html}</div>`;
    countEl.textContent = `${md.length} chars`;
  }

  let renderTimer;
  input.addEventListener("input", () => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPreview, 150);
  });
  styleSelect.addEventListener("change", renderPreview);

  // Sample doc loader
  wrap.querySelector("#md-sample").addEventListener("click", () => {
    input.value = DEFAULT_MARKDOWN;
    renderPreview();
    toast("Sample document loaded", "info", 1500);
  });

  // Clear button
  wrap.querySelector("#md-clear").addEventListener("click", () => {
    if (input.value === "" || confirm("Clear all text?")) {
      input.value = "";
      renderPreview();
      input.focus();
    }
  });

  // Copy HTML
  wrap.querySelector("#md-copy").addEventListener("click", async () => {
    const md = input.value;
    const html = marked.parse(md, { gfm: true, breaks: false });
    const styleKey = styleSelect.value;
    const css = STYLES[styleKey].css;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;
    try {
      await navigator.clipboard.writeText(fullHtml);
      toast("HTML + CSS copied to clipboard", "success", 2000);
      markDone();
    } catch (e) {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = fullHtml;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast("HTML copied to clipboard", "success", 2000); markDone(); }
      catch { toast("Copy failed — your browser blocked clipboard access", "error"); }
      document.body.removeChild(ta);
    }
  });

  // Download PDF
  // BUG FIX: Build a proper .md-content wrapper (not a full HTML doc string
  // which loses its <body> when assigned via innerHTML). Attach the container
  // to the DOM off-screen so html2canvas can measure layout correctly. The
  // .md-content selector in the CSS now properly applies padding, centering,
  // and font styles to the PDF output.
  wrap.querySelector("#md-download").addEventListener("click", async () => {
    const btn = wrap.querySelector("#md-download");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="pk-spinner"></span> Generating…`;
    try {
      const md = input.value;
      if (!md.trim()) {
        toast("Type some Markdown first", "error");
        return;
      }
      const styleKey = styleSelect.value;
      const css = STYLES[styleKey].css;
      const html = marked.parse(md, { gfm: true, breaks: false });

      // Build off-screen container with the SAME .md-content wrapper the
      // preview uses. This guarantees the CSS rules apply identically.
      const exportNode = document.createElement("div");
      exportNode.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:#fff;color:#111;";
      exportNode.innerHTML = `<style>${css}</style><div class="md-content">${html}</div>`;
      document.body.appendChild(exportNode);

      // Wait a tick for layout
      await new Promise((r) => setTimeout(r, 50));

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `document-${Date.now()}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      };

      await html2pdf().set(opt).from(exportNode.querySelector(".md-content")).save();

      // Clean up
      document.body.removeChild(exportNode);

      toast("PDF downloaded", "success");
      markDone();
    } catch (e) {
      console.error("PDF export error:", e);
      toast("PDF generation failed: " + (e.message || "unknown error"), "error");
      // Clean up if container still attached
      const leftover = document.querySelector('div[style*="left:-9999px"]');
      if (leftover) leftover.remove();
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
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

  document.querySelectorAll(".pk-themeswitch__btn").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(btn.dataset.theme));
  });
  subscribe("theme", (state) => applyTheme(state.theme));

  const container = document.getElementById("day7-mount");
  if (container && typeof renderTool === "function") {
    renderTool(container, {
      toast,
      markDone: () => markDone("day7-markdown"),
    });
  }

  if (window.lucide) window.lucide.createIcons();
  else window.addEventListener("load", () => window.lucide && window.lucide.createIcons());

  console.log("Day 7 — Markdown → PDF loaded.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
