// =========================================================================
// PDF Toolkit — Standalone app.js (Day 1 of Prodigy Kit)
// Fully self-contained: store + theme logic + tool rendering
// No external dependencies except the library imports below
// =========================================================================

// Library imports (must be at top of ES module)
import { PDFDocument, degrees } from "https://esm.sh/pdf-lib@1.17.1";

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
// Tool rendering (inlined from day-01-pdf-toolkit.js)
// =========================================================================

// =========================================================================
// Day 1 — PDF Toolkit
// Sub-tools: Merger (drag-reorder), Splitter (page ranges), Images-to-PDF
// All client-side via pdf-lib (loaded from esm.sh)
// =========================================================================


// ---------- Shared helpers ----------
function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") {
      e.addEventListener(k.slice(2), v);
    } else if (k === "dataset") {
      Object.entries(v).forEach(([dk, dv]) => (e.dataset[dk] = dv));
    } else e.setAttribute(k, v);
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

async function readPdfPageCount(file) {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  return doc.getPageCount();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Dropzone helper ----------
function createDropzone(onFiles, accept) {
  const dz = el("div", { class: "pk-dropzone", role: "button", tabindex: "0" }, [
    el("div", { class: "pk-dropzone__icon" }, ["📥"]),
    el("div", { class: "pk-dropzone__title" }, ["Drop files here or click to browse"]),
    el("div", { class: "pk-dropzone__hint" }, [accept || "Any files"]),
  ]);
  const input = el("input", { type: "file", multiple: "true", accept: accept || "", style: "display:none" });
  dz.appendChild(input);

  dz.addEventListener("click", () => input.click());
  dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });
  input.addEventListener("change", () => {
    if (input.files?.length) onFiles(Array.from(input.files));
    input.value = "";
  });
  ["dragenter", "dragover"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.setAttribute("data-dragover", "true");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.setAttribute("data-dragover", "false");
    })
  );
  dz.addEventListener("drop", (e) => {
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) onFiles(files);
  });
  return dz;
}

// =========================================================================
// SUB-TOOL 1: PDF MERGER (drag-and-drop reorder)
// =========================================================================

function createMergerView(toast) {
  const state = { files: [] };

  const container = el("div");
  const dz = createDropzone(handleFiles, "application/pdf");

  const listWrap = el("div", { class: "pk-card", style: "display:none" });
  const listTitle = el("div", { class: "pk-flex", style: "justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem" }, [
    el("h3", { style: "font-size:1rem;margin:0" }, ["Queued PDFs"]),
    el("div", { class: "pk-flex pk-gap-2" }, [
      el("button", { class: "pk-btn", onclick: () => { state.files = []; renderList(); } }, ["Clear all"]),
      el("button", { class: "pk-btn pk-btn--primary", onclick: doMerge }, ["Merge & Download"]),
    ]),
  ]);
  const list = el("div", { id: "merge-list", style: "display:flex;flex-direction:column;gap:0.5rem" });

  listWrap.appendChild(listTitle);
  listWrap.appendChild(list);

  async function handleFiles(files) {
    const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) {
      toast("Please drop PDF files only", "error");
      return;
    }
    for (const f of pdfs) {
      try {
        const pages = await readPdfPageCount(f);
        state.files.push({ file: f, pages });
      } catch (e) {
        toast(`Could not read ${f.name}`, "error");
      }
    }
    renderList();
    if (pdfs.length > 0) toast(`Added ${pdfs.length} PDF${pdfs.length > 1 ? "s" : ""}`, "success");
  }

  function renderList() {
    list.innerHTML = "";
    if (state.files.length === 0) {
      listWrap.style.display = "none";
      return;
    }
    listWrap.style.display = "block";
    state.files.forEach((item, idx) => {
      const card = el("div", {
        class: "pk-card pk-card--pad-sm pk-flex",
        style: "align-items:center;gap:0.75rem;cursor:grab",
        dataset: { idx: String(idx) },
      });
      card.innerHTML = `
        <span style="font-size:1.5rem;color:var(--pk-fg-subtle)">⠿</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:500;color:var(--pk-fg-strong);font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.file.name}</div>
          <div class="pk-text-xs pk-text-muted pk-text-mono">${item.pages} pages · ${formatBytes(item.file.size)}</div>
        </div>
        <button class="pk-btn pk-btn--ghost" data-action="up" title="Move up" ${idx === 0 ? "disabled" : ""}>↑</button>
        <button class="pk-btn pk-btn--ghost" data-action="down" title="Move down" ${idx === state.files.length - 1 ? "disabled" : ""}>↓</button>
        <button class="pk-btn pk-btn--ghost" data-action="remove" title="Remove" style="color:#ef4444">✕</button>
      `;
      card.querySelector('[data-action=up]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (idx > 0) {
          [state.files[idx - 1], state.files[idx]] = [state.files[idx], state.files[idx - 1]];
          renderList();
        }
      });
      card.querySelector('[data-action=down]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (idx < state.files.length - 1) {
          [state.files[idx + 1], state.files[idx]] = [state.files[idx], state.files[idx + 1]];
          renderList();
        }
      });
      card.querySelector('[data-action=remove]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        state.files.splice(idx, 1);
        renderList();
      });
      list.appendChild(card);
    });

    // Wire native HTML5 drag-and-drop (desktop reorder)
    wireDnD();
  }

  function wireDnD() {
    let dragging = null;
    list.querySelectorAll(".pk-card").forEach((card) => {
      card.draggable = true;
      card.addEventListener("dragstart", (e) => {
        dragging = parseInt(card.dataset.idx, 10);
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        const target = parseInt(card.dataset.idx, 10);
        if (dragging === null || dragging === target) return;
        const [moved] = state.files.splice(dragging, 1);
        state.files.splice(target, 0, moved);
        renderList();
        dragging = null;
      });
      card.addEventListener("dragend", () => { dragging = null; });
    });
  }

  async function doMerge() {
    if (state.files.length < 2) {
      toast("Add at least 2 PDFs to merge", "error");
      return;
    }
    const btn = listTitle.querySelector(".pk-btn--primary");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="pk-spinner"></span> Merging…`;
    try {
      const merged = await PDFDocument.create();
      for (const item of state.files) {
        const buf = await item.file.arrayBuffer();
        const src = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      const bytes = await merged.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "merged.pdf");
      toast(`Merged ${state.files.length} PDFs into one`, "success");
    } catch (e) {
      console.error(e);
      toast("Merge failed: " + e.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  container.appendChild(dz);
  container.appendChild(listWrap);
  return container;
}

// =========================================================================
// SUB-TOOL 2: PAGE SPLITTER (extract page ranges)
// =========================================================================

function createSplitterView(toast) {
  const state = { file: null, pages: 0 };

  const container = el("div");
  const dz = createDropzone(handleFile, "application/pdf");

  const panel = el("div", { class: "pk-card", style: "display:none" });
  panel.innerHTML = `
    <div class="pk-flex" style="justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem">
      <h3 style="font-size:1rem;margin:0" id="split-filename">PDF</h3>
      <button class="pk-btn pk-btn--ghost" data-action="clear">✕ Remove</button>
    </div>
    <p class="pk-text-sm pk-text-muted pk-mb-3">
      Use commas to separate ranges. Example: <code class="pk-text-mono">1-4, 9, 12-15</code> extracts pages 1,2,3,4,9,12,13,14,15.
    </p>
    <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Page ranges to extract</label>
    <input type="text" id="split-ranges" class="pk-text-mono" placeholder="1-4, 9, 12-15" style="width:100%;font-size:1rem;margin-bottom:0.75rem" />
    <div id="split-preview" class="pk-text-sm pk-text-muted" style="margin-bottom:1rem"></div>
    <button class="pk-btn pk-btn--primary pk-btn--lg" id="split-extract-btn" style="width:100%">
      Extract Pages & Download
    </button>
  `;

  async function handleFile(files) {
    const pdf = files.find((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!pdf) {
      toast("Please drop a PDF file", "error");
      return;
    }
    try {
      const pages = await readPdfPageCount(pdf);
      state.file = pdf;
      state.pages = pages;
      panel.querySelector("#split-filename").textContent = pdf.name;
      panel.querySelector("#split-preview").textContent = `${pages} pages total. Type ranges above to select which to extract.`;
      panel.style.display = "block";
      dz.style.display = "none";
      toast(`Loaded ${pdf.name} — ${pages} pages`, "info");
    } catch (e) {
      toast(`Could not read ${pdf.name}`, "error");
    }
  }

  panel.querySelector('[data-action=clear]').addEventListener("click", () => {
    state.file = null;
    state.pages = 0;
    panel.style.display = "none";
    dz.style.display = "block";
    panel.querySelector("#split-ranges").value = "";
  });

  // Live preview of selected pages
  panel.querySelector("#split-ranges").addEventListener("input", (e) => {
    const ranges = e.target.value.trim();
    if (!ranges) {
      panel.querySelector("#split-preview").textContent =
        state.file ? `${state.pages} pages total. Type ranges above to select which to extract.` : "";
      return;
    }
    try {
      const pages = parseRanges(ranges, state.pages);
      panel.querySelector("#split-preview").innerHTML = `Will extract <strong style="color:var(--pk-fg-strong)">${pages.length} pages</strong>: ${pages.slice(0, 20).join(", ")}${pages.length > 20 ? "…" : ""}`;
    } catch (err) {
      panel.querySelector("#split-preview").innerHTML = `<span style="color:#ef4444">${err.message}</span>`;
    }
  });

  panel.querySelector("#split-extract-btn").addEventListener("click", async () => {
    if (!state.file) return;
    const ranges = panel.querySelector("#split-ranges").value.trim();
    if (!ranges) {
      toast("Enter page ranges first", "error");
      return;
    }
    let pages;
    try {
      pages = parseRanges(ranges, state.pages);
    } catch (err) {
      toast(err.message, "error");
      return;
    }
    if (pages.length === 0) {
      toast("No valid pages selected", "error");
      return;
    }

    const btn = panel.querySelector("#split-extract-btn");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="pk-spinner"></span> Extracting…`;
    try {
      const buf = await state.file.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, pages.map((p) => p - 1));
      copied.forEach((p) => out.addPage(p));
      const bytes = await out.save();
      const baseName = state.file.name.replace(/\.pdf$/i, "");
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), `${baseName}-extracted.pdf`);
      toast(`Extracted ${pages.length} pages`, "success");
    } catch (e) {
      console.error(e);
      toast("Extraction failed: " + e.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  function parseRanges(input, maxPages) {
    const parts = input.split(",").map((p) => p.trim()).filter(Boolean);
    const result = [];
    for (const part of parts) {
      const m = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (m) {
        const a = parseInt(m[1], 10);
        const b = parseInt(m[2], 10);
        if (a < 1 || b < 1 || a > maxPages || b > maxPages) throw new Error(`Range ${part} exceeds page count (${maxPages})`);
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        for (let i = lo; i <= hi; i++) result.push(i);
      } else if (/^\d+$/.test(part)) {
        const n = parseInt(part, 10);
        if (n < 1 || n > maxPages) throw new Error(`Page ${n} out of range (1-${maxPages})`);
        result.push(n);
      } else {
        throw new Error(`Cannot parse "${part}"`);
      }
    }
    return [...new Set(result)].sort((a, b) => a - b);
  }

  container.appendChild(dz);
  container.appendChild(panel);
  return container;
}

// =========================================================================
// SUB-TOOL 3: IMAGES-TO-PDF
// =========================================================================

function createImagesView(toast) {
  const state = { files: [] };

  const container = el("div");
  const dz = createDropzone(handleFiles, "image/jpeg,image/png,image/webp");

  const panel = el("div", { class: "pk-card", style: "display:none" });
  panel.innerHTML = `
    <div class="pk-flex" style="justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem">
      <h3 style="font-size:1rem;margin:0">Queued Images</h3>
      <div class="pk-flex pk-gap-2">
        <select id="img-pagesize" style="padding:0.4rem 0.625rem;border-radius:var(--pk-radius-sm);background:var(--pk-card-bg);border:1px solid var(--pk-border);color:var(--pk-fg)">
          <option value="fit">Fit to image</option>
          <option value="a4">A4 portrait</option>
          <option value="a4r">A4 landscape</option>
          <option value="letter">Letter portrait</option>
        </select>
        <button class="pk-btn" data-action="clear">Clear</button>
        <button class="pk-btn pk-btn--primary" data-action="generate">Generate PDF</button>
      </div>
    </div>
    <div id="img-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.5rem"></div>
  `;

  async function handleFiles(files) {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) {
      toast("Drop image files only (JPG/PNG/WEBP)", "error");
      return;
    }
    for (const f of imgs) state.files.push({ file: f, url: URL.createObjectURL(f) });
    renderGrid();
    toast(`Added ${imgs.length} image${imgs.length > 1 ? "s" : ""}`, "success");
  }

  function renderGrid() {
    const grid = panel.querySelector("#img-grid");
    grid.innerHTML = "";
    if (state.files.length === 0) {
      panel.style.display = "none";
      dz.style.display = "block";
      return;
    }
    panel.style.display = "block";
    dz.style.display = "block";
    state.files.forEach((item, idx) => {
      const card = el("div", {
        class: "pk-card pk-card--pad-sm",
        style: "padding:0.5rem;position:relative;cursor:grab",
        dataset: { idx: String(idx) },
      });
      card.innerHTML = `
        <img src="${item.url}" alt="" style="width:100%;height:100px;object-fit:cover;border-radius:var(--pk-radius-sm);display:block" />
        <div class="pk-text-xs pk-text-muted pk-text-mono" style="margin-top:0.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.file.name}</div>
        <div class="pk-text-xs pk-text-subtle pk-text-mono">${formatBytes(item.file.size)}</div>
        <button data-action="remove" title="Remove" style="position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:var(--pk-radius-full);background:rgba(0,0,0,0.5);color:white;border:none;cursor:pointer;display:grid;place-items:center">✕</button>
      `;
      card.querySelector('[data-action=remove]').addEventListener("click", (e) => {
        e.stopPropagation();
        URL.revokeObjectURL(item.url);
        state.files.splice(idx, 1);
        renderGrid();
      });
      grid.appendChild(card);
    });
    wireGridDnD(grid);
  }

  function wireGridDnD(grid) {
    let dragging = null;
    grid.querySelectorAll(".pk-card").forEach((card) => {
      card.draggable = true;
      card.addEventListener("dragstart", (e) => {
        dragging = parseInt(card.dataset.idx, 10);
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        const target = parseInt(card.dataset.idx, 10);
        if (dragging === null || dragging === target) return;
        const [moved] = state.files.splice(dragging, 1);
        state.files.splice(target, 0, moved);
        renderGrid();
        dragging = null;
      });
      card.addEventListener("dragend", () => { dragging = null; });
    });
  }

  panel.querySelector('[data-action=clear]').addEventListener("click", () => {
    state.files.forEach((f) => URL.revokeObjectURL(f.url));
    state.files = [];
    renderGrid();
  });

  panel.querySelector('[data-action=generate]').addEventListener("click", async () => {
    if (state.files.length === 0) {
      toast("Add at least one image first", "error");
      return;
    }
    const btn = panel.querySelector('[data-action=generate]');
    btn.disabled = true;
    btn.innerHTML = `<span class="pk-spinner"></span> Generating…`;
    try {
      const pdf = await PDFDocument.create();
      const pageSize = panel.querySelector("#img-pagesize").value;
      for (const item of state.files) {
        const bytes = await item.file.arrayBuffer();
        let img;
        if (item.file.type === "image/jpeg" || item.file.name.toLowerCase().endsWith(".jpg") || item.file.name.toLowerCase().endsWith(".jpeg")) {
          img = await pdf.embedJpg(bytes);
        } else if (item.file.type === "image/png" || item.file.name.toLowerCase().endsWith(".png")) {
          img = await pdf.embedPng(bytes);
        } else {
          // Convert WEBP/other to PNG via canvas
          const png = await convertToPng(item.url);
          img = await pdf.embedPng(png);
        }
        let w = img.width, h = img.height;
        if (pageSize === "fit") {
          const maxW = 595, maxH = 842; // A4
          if (w > maxW) { const r = maxW / w; w = maxW; h = h * r; }
          if (h > maxH) { const r = maxH / h; h = maxH; w = w * r; }
          const page = pdf.addPage([w, h]);
          page.drawImage(img, { x: 0, y: 0, width: w, height: h });
        } else {
          let pw, ph;
          if (pageSize === "a4") { pw = 595; ph = 842; }
          else if (pageSize === "a4r") { pw = 842; ph = 595; }
          else { pw = 612; ph = 792; } // Letter
          const page = pdf.addPage([pw, ph]);
          const ratio = Math.min(pw / w, ph / h);
          const dw = w * ratio, dh = h * ratio;
          page.drawImage(img, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
        }
      }
      const out = await pdf.save();
      downloadBlob(new Blob([out], { type: "application/pdf" }), "images.pdf");
      toast(`Generated PDF from ${state.files.length} image${state.files.length > 1 ? "s" : ""}`, "success");
    } catch (e) {
      console.error(e);
      toast("Generation failed: " + e.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Generate PDF";
    }
  });

  async function convertToPng(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          blob.arrayBuffer().then(resolve).catch(reject);
        }, "image/png");
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  container.appendChild(dz);
  container.appendChild(panel);
  return container;
}

// =========================================================================
// MAIN: Mount all three sub-tools in tabs
// =========================================================================

function renderTool(container, { toast, markDone }) {
  container.innerHTML = "";

  const wrap = el("div");

  // Tabs
  const tabs = el("div", { class: "pk-tabs", role: "tablist" });
  const tabDefs = [
    { id: "merge", label: "Merge", icon: "🔗" },
    { id: "split", label: "Split & Extract", icon: "✂️" },
    { id: "images", label: "Images → PDF", icon: "🖼️" },
  ];
  const panels = {};
  tabDefs.forEach((tab, idx) => {
    const btn = el("button", {
      class: "pk-tab",
      role: "tab",
      "aria-selected": String(idx === 0),
      dataset: { tab: tab.id },
    }, [`${tab.icon}  ${tab.label}`]);
    btn.addEventListener("click", () => selectTab(tab.id));
    tabs.appendChild(btn);
  });

  const panelWrap = el("div");

  function selectTab(id) {
    tabs.querySelectorAll(".pk-tab").forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.tab === id));
    });
    panelWrap.innerHTML = "";
    if (id === "merge") panelWrap.appendChild(panels.merge);
    else if (id === "split") panelWrap.appendChild(panels.split);
    else if (id === "images") panelWrap.appendChild(panels.images);
  }

  panels.merge = createMergerView(toast);
  panels.split = createSplitterView(toast);
  panels.images = createImagesView(toast);
  selectTab("merge");

  wrap.appendChild(tabs);
  wrap.appendChild(panelWrap);

  // Info card
  const info = el("div", { class: "pk-card pk-mt-4" });
  info.innerHTML = `
    <h3 style="font-size:0.95rem;margin-bottom:0.5rem">How this works</h3>
    <p class="pk-text-sm pk-text-muted">
      Everything runs in your browser via <code class="pk-text-mono">pdf-lib</code>. PDFs and images never touch a server. Drag-and-drop
      reorder works on desktop; use the ↑ ↓ arrows on touch devices. Page ranges in Splitter use comma-separated values like
      <code class="pk-text-mono">1-4, 9, 12-15</code>.
    </p>
  `;
  wrap.appendChild(info);

  container.appendChild(wrap);

  // Mark tool as done when user performs any action
  let done = false;
  const markOnce = () => { if (!done) { done = true; markDone(); } };
  container.addEventListener("click", markOnce, { once: false });
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
  const container = document.getElementById("day1-mount");
  if (container && typeof renderTool === "function") {
    renderTool(container, {
      toast,
      markDone: () => markDone("day1-pdf"),
    });
  }

  // Refresh Lucide icons
  if (window.lucide) window.lucide.createIcons();
  else window.addEventListener("load", () => window.lucide && window.lucide.createIcons());

  console.log("Day 1 — PDF Toolkit loaded.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
