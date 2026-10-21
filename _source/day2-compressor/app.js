// =========================================================================
// Image Compressor — Standalone app.js (Day 2 of Prodigy Kit)
// Fully self-contained: store + theme logic + tool rendering
// No external dependencies except the library imports below
// =========================================================================

// Library imports (must be at top of ES module)


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
// Tool rendering (inlined from day-02-image-compressor.js)
// =========================================================================

// =========================================================================
// Day 2 — Strict-Size Image Compressor
// Features: Exact-KB target (binary search), live size diff, format swap
// All client-side via HTML5 Canvas API
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

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Binary search: find quality that produces a blob closest to target KB
async function compressToTargetKB(img, format, targetKB, maxSize) {
  const target = targetKB * 1024;
  let lo = 0.05, hi = 0.95;
  let bestBlob = null;
  let bestQuality = 0;
  let bestDelta = Infinity;

  const canvas = document.createElement("canvas");
  let w = img.naturalWidth, h = img.naturalHeight;
  if (maxSize && (w > maxSize || h > maxSize)) {
    const r = Math.min(maxSize / w, maxSize / h);
    w = Math.round(w * r);
    h = Math.round(h * r);
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  // For JPG, fill white background (no alpha)
  if (format === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);

  const makeBlob = (q) => new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), format, q);
  });

  // Try a few quality points to converge fast
  for (let i = 0; i < 6; i++) {
    const q = (lo + hi) / 2;
    const blob = await makeBlob(q);
    if (!blob) break;
    const delta = Math.abs(blob.size - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestBlob = blob;
      bestQuality = q;
    }
    if (blob.size > target) {
      hi = q;
    } else {
      lo = q;
    }
    // If we're within 5% of target, done
    if (Math.abs(blob.size - target) < target * 0.05) break;
  }

  // Edge case: if even quality 0.05 is bigger than target, scale image down
  if (!bestBlob || bestBlob.size > target * 1.1) {
    let scale = 0.9;
    while (scale > 0.05) {
      const sw = Math.max(1, Math.round(w * scale));
      const sh = Math.max(1, Math.round(h * scale));
      const sc = document.createElement("canvas");
      sc.width = sw;
      sc.height = sh;
      const sctx = sc.getContext("2d");
      if (format === "image/jpeg") {
        sctx.fillStyle = "#ffffff";
        sctx.fillRect(0, 0, sw, sh);
      }
      sctx.drawImage(img, 0, 0, sw, sh);
      const blob = await new Promise((r) => sc.toBlob(r, format, 0.7));
      if (blob && blob.size <= target * 1.05) {
        return { blob, quality: 0.7, width: sw, height: sh, scaled: true };
      }
      scale -= 0.1;
    }
  }

  return { blob: bestBlob, quality: bestQuality, width: w, height: h, scaled: false };
}

function renderTool(container, { toast, markDone }) {
  container.innerHTML = "";
  const wrap = el("div");

  // ----- Dropzone -----
  const dz = el("div", { class: "pk-dropzone", role: "button", tabindex: "0" });
  dz.innerHTML = `
    <div class="pk-dropzone__icon">🖼️</div>
    <div class="pk-dropzone__title">Drop an image or click to browse</div>
    <div class="pk-dropzone__hint">JPG · PNG · WEBP</div>
  `;
  const fileInput = el("input", { type: "file", accept: "image/*", style: "display:none" });
  dz.appendChild(fileInput);

  // ----- Settings panel -----
  const settings = el("div", { class: "pk-card", style: "display:none" });
  settings.innerHTML = `
    <h3 style="font-size:1rem;margin-bottom:0.75rem" id="comp-filename">image.jpg</h3>

    <!-- Mode selector -->
    <div style="margin-bottom:1rem">
      <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Mode</label>
      <div class="pk-tabs" role="tablist">
        <button class="pk-tab" role="tab" data-mode="exact" aria-selected="true">Exact KB target</button>
        <button class="pk-tab" role="tab" data-mode="quality" aria-selected="false">Quality slider</button>
      </div>
    </div>

    <!-- Exact KB target mode -->
    <div id="mode-exact" class="comp-mode-panel">
      <div class="pk-flex" style="align-items:center;gap:0.75rem;flex-wrap:wrap">
        <label class="pk-text-sm pk-text-muted">Target size:</label>
        <input type="range" id="kb-slider" min="5" max="500" value="50" step="1" style="flex:1;min-width:200px" />
        <input type="number" id="kb-input" min="5" max="500" value="50" style="width:80px" />
        <span class="pk-text-sm pk-text-muted">KB</span>
      </div>
      <div class="pk-flex pk-gap-3 pk-mt-2" style="flex-wrap:wrap">
        <button class="pk-btn pk-btn--ghost pk-text-xs" data-preset="20">20 KB (passport)</button>
        <button class="pk-btn pk-btn--ghost pk-text-xs" data-preset="50">50 KB</button>
        <button class="pk-btn pk-btn--ghost pk-text-xs" data-preset="100">100 KB</button>
        <button class="pk-btn pk-btn--ghost pk-text-xs" data-preset="200">200 KB</button>
        <button class="pk-btn pk-btn--ghost pk-text-xs" data-preset="240">240 KB (signature)</button>
      </div>
    </div>

    <!-- Quality slider mode -->
    <div id="mode-quality" class="comp-mode-panel" style="display:none">
      <div class="pk-flex" style="align-items:center;gap:0.75rem">
        <label class="pk-text-sm pk-text-muted">Quality:</label>
        <input type="range" id="q-slider" min="10" max="100" value="80" step="1" style="flex:1" />
        <span id="q-value" class="pk-text-sm pk-text-mono" style="min-width:50px;text-align:right">80%</span>
      </div>
      <div class="pk-flex pk-gap-3 pk-mt-2" style="flex-wrap:wrap">
        <button class="pk-btn pk-btn--ghost pk-text-xs" data-q="30">30% (tiny)</button>
        <button class="pk-btn pk-btn--ghost pk-text-xs" data-q="60">60%</button>
        <button class="pk-btn pk-btn--ghost pk-text-xs" data-q="80">80% (balanced)</button>
        <button class="pk-btn pk-btn--ghost pk-text-xs" data-q="95">95% (high)</button>
      </div>
    </div>

    <!-- Format selector -->
    <div style="margin-top:1rem">
      <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Output format</label>
      <div class="pk-flex pk-gap-2">
        <button class="pk-btn comp-format" data-fmt="image/jpeg" aria-pressed="true">JPG</button>
        <button class="pk-btn comp-format" data-fmt="image/png" aria-pressed="false">PNG</button>
        <button class="pk-btn comp-format" data-fmt="image/webp" aria-pressed="false">WEBP</button>
      </div>
    </div>

    <button class="pk-btn pk-btn--primary pk-btn--lg" id="comp-go" style="width:100%;margin-top:1rem">
      Compress & Download
    </button>
  `;

  // ----- Preview panel -----
  const preview = el("div", { class: "pk-card", style: "display:none;margin-top:1rem" });
  preview.innerHTML = `
    <div class="pk-grid-2" style="gap:1rem;align-items:start">
      <div>
        <div class="pk-text-xs pk-text-muted pk-mb-2">ORIGINAL</div>
        <div id="prev-orig" style="text-align:center"></div>
        <div class="pk-text-sm pk-text-mono pk-mt-2" id="prev-orig-size" style="text-align:center"></div>
      </div>
      <div>
        <div class="pk-text-xs pk-text-muted pk-mb-2">COMPRESSED</div>
        <div id="prev-comp" style="text-align:center"></div>
        <div class="pk-text-sm pk-text-mono pk-mt-2" id="prev-comp-size" style="text-align:center"></div>
      </div>
    </div>
    <div id="prev-delta" class="pk-text-center pk-mt-3" style="font-weight:500"></div>
  `;

  // ----- State -----
  const state = {
    file: null,
    img: null,
    origUrl: null,
    mode: "exact", // or "quality"
    targetKB: 50,
    quality: 0.8,
    format: "image/jpeg",
    compressedUrl: null,
  };

  // ----- Event wiring -----
  dz.addEventListener("click", () => fileInput.click());
  dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files?.[0]) handleFile(fileInput.files[0]);
    fileInput.value = "";
  });
  ["dragenter", "dragover"].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.setAttribute("data-dragover", "true"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.setAttribute("data-dragover", "false"); })
  );
  dz.addEventListener("drop", (e) => {
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  });

  async function handleFile(file) {
    if (!file.type.startsWith("image/")) {
      toast("Please drop an image file", "error");
      return;
    }
    state.file = file;
    if (state.origUrl) URL.revokeObjectURL(state.origUrl);
    state.origUrl = URL.createObjectURL(file);
    try {
      state.img = await loadImage(state.origUrl);
    } catch {
      toast("Could not load image", "error");
      return;
    }
    settings.querySelector("#comp-filename").textContent = file.name;
    settings.style.display = "block";
    renderOriginal();
    preview.style.display = "none";
    toast(`Loaded ${file.name}`, "info", 1500);
  }

  function renderOriginal() {
    const c = settings.querySelector("#prev-orig");
    if (!c) return;
    // For now, render in the preview panel
    const origDiv = preview.querySelector("#prev-orig");
    origDiv.innerHTML = `<img src="${state.origUrl}" style="max-width:100%;max-height:200px;border-radius:var(--pk-radius-sm);object-fit:contain" alt="" />`;
    preview.querySelector("#prev-orig-size").textContent = `${formatBytes(state.file.size)} · ${state.img.naturalWidth}×${state.img.naturalHeight}`;
  }

  // Mode tabs
  settings.querySelectorAll(".pk-tab[data-mode]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.mode;
      state.mode = mode;
      settings.querySelectorAll(".pk-tab[data-mode]").forEach((t) =>
        t.setAttribute("aria-selected", String(t.dataset.mode === mode)));
      settings.querySelector("#mode-exact").style.display = mode === "exact" ? "block" : "none";
      settings.querySelector("#mode-quality").style.display = mode === "quality" ? "block" : "none";
    });
  });

  // KB target
  const kbSlider = settings.querySelector("#kb-slider");
  const kbInput = settings.querySelector("#kb-input");
  kbSlider.addEventListener("input", () => {
    state.targetKB = parseInt(kbSlider.value, 10);
    kbInput.value = state.targetKB;
  });
  kbInput.addEventListener("input", () => {
    const v = Math.max(5, Math.min(500, parseInt(kbInput.value, 10) || 5));
    state.targetKB = v;
    kbSlider.value = v;
  });
  settings.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = parseInt(btn.dataset.preset, 10);
      state.targetKB = v;
      kbSlider.value = v;
      kbInput.value = v;
    });
  });

  // Quality slider
  const qSlider = settings.querySelector("#q-slider");
  qSlider.addEventListener("input", () => {
    state.quality = parseInt(qSlider.value, 10) / 100;
    settings.querySelector("#q-value").textContent = `${qSlider.value}%`;
  });
  settings.querySelectorAll("[data-q]").forEach((btn) => {
    btn.addEventListener("click", () => {
      qSlider.value = btn.dataset.q;
      state.quality = parseInt(btn.dataset.q, 10) / 100;
      settings.querySelector("#q-value").textContent = `${btn.dataset.q}%`;
    });
  });

  // Format
  settings.querySelectorAll(".comp-format").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.format = btn.dataset.fmt;
      settings.querySelectorAll(".comp-format").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.fmt === state.format)));
    });
  });

  // Compress button
  settings.querySelector("#comp-go").addEventListener("click", async () => {
    if (!state.img) return;
    const btn = settings.querySelector("#comp-go");
    btn.disabled = true;
    btn.innerHTML = `<span class="pk-spinner"></span> Tuning…`;
    try {
      let blob;
      if (state.mode === "exact") {
        const result = await compressToTargetKB(state.img, state.format, state.targetKB, 4096);
        blob = result?.blob;
        if (!blob) throw new Error("Could not reach target size");
        if (result.scaled) toast(`Image was scaled to ${result.width}×${result.height} to hit target`, "info");
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = state.img.naturalWidth;
        canvas.height = state.img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (state.format === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(state.img, 0, 0);
        blob = await new Promise((r) => canvas.toBlob(r, state.format, state.quality));
      }
      if (!blob) throw new Error("Compression failed");

      // Render preview
      if (state.compressedUrl) URL.revokeObjectURL(state.compressedUrl);
      state.compressedUrl = URL.createObjectURL(blob);
      preview.querySelector("#prev-comp").innerHTML = `<img src="${state.compressedUrl}" style="max-width:100%;max-height:200px;border-radius:var(--pk-radius-sm);object-fit:contain" alt="" />`;
      preview.querySelector("#prev-comp-size").textContent = `${formatBytes(blob.size)} · (compressed)`;
      const ratio = ((1 - blob.size / state.file.size) * 100).toFixed(1);
      const deltaEl = preview.querySelector("#prev-delta");
      if (blob.size < state.file.size) {
        deltaEl.innerHTML = `<span style="color:#10b981">▼ ${ratio}% smaller</span> · saved ${formatBytes(state.file.size - blob.size)}`;
      } else {
        deltaEl.innerHTML = `<span style="color:#f59e0b">▲ ${Math.abs(ratio)}% larger</span> (target reached by upscaling quality)`;
      }
      preview.style.display = "block";

      // Auto-download
      const ext = state.format === "image/jpeg" ? "jpg" : state.format === "image/png" ? "png" : "webp";
      const baseName = state.file.name.replace(/\.[^.]+$/, "");
      downloadBlob(blob, `${baseName}-${state.mode === "exact" ? state.targetKB + "kb" : Math.round(state.quality * 100) + "q"}.${ext}`);
      toast(`Compressed to ${formatBytes(blob.size)}`, "success");
      markDone();
    } catch (e) {
      console.error(e);
      toast("Compression failed: " + e.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Compress & Download";
    }
  });

  wrap.appendChild(dz);
  wrap.appendChild(settings);
  wrap.appendChild(preview);

  // Info card
  const info = el("div", { class: "pk-card pk-mt-4" });
  info.innerHTML = `
    <h3 style="font-size:0.95rem;margin-bottom:0.5rem">How this works</h3>
    <p class="pk-text-sm pk-text-muted">
      The <strong>Exact KB target</strong> mode uses a binary search over JPEG/WEBP quality values,
      running up to 6 compression passes to converge within ±5% of your target size. If even the
      lowest quality can't reach the target, the image is progressively scaled down until it fits.
      Great for passport photos (20 KB) or signatures (240 KB) for government/college portals.
      The <strong>Quality slider</strong> mode is for when you want predictable quality, not strict size.
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
  const container = document.getElementById("day2-mount");
  if (container && typeof renderTool === "function") {
    renderTool(container, {
      toast,
      markDone: () => markDone("day2-compressor"),
    });
  }

  // Refresh Lucide icons
  if (window.lucide) window.lucide.createIcons();
  else window.addEventListener("load", () => window.lucide && window.lucide.createIcons());

  console.log("Day 2 — Image Compressor loaded.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
