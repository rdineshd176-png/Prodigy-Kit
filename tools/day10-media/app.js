// =========================================================================
// Media Extractor — Standalone app.js (Day 10 of Prodigy Kit)
// Fully self-contained: store + theme logic + tool rendering
// No external dependencies except the library imports below
// =========================================================================

// Library imports (must be at top of ES module)
import { FFmpeg } from "https://esm.sh/@ffmpeg/ffmpeg@0.12.15";
import { fetchFile, toBlobURL } from "https://esm.sh/@ffmpeg/util@0.12.2";

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
// Tool rendering (inlined from day-10-media-extractor.js)
// =========================================================================

// =========================================================================
// Day 10 — Local Media Audio Extractor & Trimmer
// Uses ffmpeg.wasm — runs entirely in the browser via SharedArrayBuffer
// Two modes: Extract audio (video→MP3/WAV), Trim audio/video (start-end)
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

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
    ffmpeg: null,
    loading: false,
    file: null,
    url: null,
    duration: 0,
    start: 0,
    end: 0,
    mode: "extract", // extract | trim
    extractFmt: "mp3", // mp3 | wav
    trimOut: "copy", // copy | mp3
  };

  wrap.innerHTML = `
    <!-- FFmpeg loading card -->
    <div class="pk-card pk-mb-3" id="ff-status-card" style="display:none">
      <div class="pk-flex pk-text-sm" style="align-items:center;gap:0.75rem">
        <span class="pk-spinner"></span>
        <div>
          <div style="font-weight:500" id="ff-status-title">Initializing FFmpeg…</div>
          <div class="pk-text-xs pk-text-muted" id="ff-status-detail">Loading WASM core (~25 MB, first run only)</div>
        </div>
      </div>
    </div>

    <!-- Dropzone -->
    <div class="pk-dropzone" id="mx-dz" role="button" tabindex="0">
      <div class="pk-dropzone__icon">🎬</div>
      <div class="pk-dropzone__title">Drop a video or audio file</div>
      <div class="pk-dropzone__hint">MP4 · WebM · MP3 · WAV · M4A · AAC · OGG — nothing leaves your browser</div>
    </div>
    <input type="file" id="mx-input" accept="video/*,audio/*" style="display:none" />

    <!-- File panel -->
    <div class="pk-card" id="mx-panel" style="display:none;margin-top:1rem">
      <div class="pk-flex" style="justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem">
        <div>
          <h3 style="font-size:1rem;margin:0" id="mx-filename">media.mp4</h3>
          <p class="pk-text-xs pk-text-muted pk-text-mono" id="mx-fileinfo"></p>
        </div>
        <button class="pk-btn pk-btn--ghost" data-action="clear">✕ Remove</button>
      </div>

      <!-- Media preview -->
      <div id="mx-preview" style="margin-bottom:1rem;text-align:center"></div>

      <!-- Mode tabs -->
      <div class="pk-tabs" role="tablist">
        <button class="pk-tab" role="tab" data-mode="extract" aria-selected="true">🎵 Extract audio (MP3/WAV)</button>
        <button class="pk-tab" role="tab" data-mode="trim" aria-selected="false">✂️ Trim clip (start→end)</button>
      </div>

      <!-- Extract mode -->
      <div id="mx-extract" class="mx-mode-panel">
        <p class="pk-text-sm pk-text-muted pk-mb-3">Extract the audio track from your video as a clean MP3 or WAV file. No quality loss in the original.</p>
        <div class="pk-flex pk-gap-2 pk-mb-3" style="flex-wrap:wrap;align-items:center">
          <span class="pk-text-sm pk-text-muted">Output format:</span>
          <button class="pk-btn" data-xfmt="mp3" aria-pressed="true">MP3 (compressed)</button>
          <button class="pk-btn" data-xfmt="wav" aria-pressed="false">WAV (lossless)</button>
        </div>
      </div>

      <!-- Trim mode -->
      <div id="mx-trim" class="mx-mode-panel" style="display:none">
        <p class="pk-text-sm pk-text-muted pk-mb-3">Set start and end times to clip the file. We re-encode only the trimmed portion.</p>
        <div class="pk-mb-3">
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">
            Start: <span id="mx-start-val" class="pk-text-mono">00:00</span>
          </label>
          <input type="range" id="mx-start" min="0" max="100" value="0" step="0.1" style="width:100%" />
        </div>
        <div class="pk-mb-3">
          <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">
            End: <span id="mx-end-val" class="pk-text-mono">00:00</span>
          </label>
          <input type="range" id="mx-end" min="0" max="100" value="100" step="0.1" style="width:100%" />
        </div>
        <div class="pk-text-xs pk-text-muted pk-mb-3">
          Duration: <span id="mx-clip-dur" class="pk-text-mono">00:00</span>
          <span class="pk-text-subtle"> · </span>
          Total media length: <span id="mx-total-dur" class="pk-text-mono">00:00</span>
        </div>
        <div class="pk-flex pk-gap-2" style="flex-wrap:wrap;align-items:center">
          <span class="pk-text-sm pk-text-muted">Output format:</span>
          <button class="pk-btn" data-tfmt="copy" aria-pressed="true">Keep original format</button>
          <button class="pk-btn" data-tfmt="mp3" aria-pressed="false">MP3 (audio)</button>
        </div>
      </div>

      <!-- Action button -->
      <button class="pk-btn pk-btn--primary pk-btn--lg" id="mx-go" style="width:100%;margin-top:1rem">
        🎬 Process
      </button>
      <div id="mx-progress" style="display:none;margin-top:0.75rem">
        <div class="pk-flex pk-text-xs pk-text-muted" style="align-items:center;gap:0.5rem">
          <span class="pk-spinner"></span>
          <span id="mx-progress-text">Working…</span>
        </div>
      </div>
    </div>
  `;

  // ----- Dropzone wiring -----
  const dz = wrap.querySelector("#mx-dz");
  const fileInput = wrap.querySelector("#mx-input");
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

  // ----- File handling -----
  function handleFile(file) {
    if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
      toast("Drop a video or audio file", "error");
      return;
    }
    state.file = file;
    if (state.url) URL.revokeObjectURL(state.url);
    state.url = URL.createObjectURL(file);
    wrap.querySelector("#mx-filename").textContent = file.name;
    wrap.querySelector("#mx-fileinfo").textContent = `${formatBytes(file.size)} · ${file.type || "unknown"}`;

    // Render preview
    const preview = wrap.querySelector("#mx-preview");
    if (file.type.startsWith("video/")) {
      preview.innerHTML = `<video src="${state.url}" controls style="max-width:100%;max-height:300px;border-radius:var(--pk-radius-sm)" onloadedmetadata="this.dataset.dur=this.duration; window.__mxOnMetadata && window.__mxOnMetadata(this.duration)"></video>`;
    } else {
      preview.innerHTML = `<audio src="${state.url}" controls style="width:100%" onloadedmetadata="this.dataset.dur=this.duration; window.__mxOnMetadata && window.__mxOnMetadata(this.duration)"></audio>`;
    }

    wrap.querySelector("#mx-panel").style.display = "block";
    dz.style.display = "none";
    toast(`Loaded ${file.name}`, "info", 1500);
  }

  // Hook metadata loading
  window.__mxOnMetadata = (duration) => {
    state.duration = duration;
    state.end = duration;
    wrap.querySelector("#mx-total-dur").textContent = formatTime(duration);
    wrap.querySelector("#mx-start-val").textContent = formatTime(0);
    wrap.querySelector("#mx-end-val").textContent = formatTime(duration);
    wrap.querySelector("#mx-clip-dur").textContent = formatTime(duration);

    const startSlider = wrap.querySelector("#mx-start");
    const endSlider = wrap.querySelector("#mx-end");
    startSlider.max = String(duration);
    endSlider.max = String(duration);
    startSlider.value = "0";
    endSlider.value = String(duration);
    updateClipDuration();
  };

  // ----- Mode tabs -----
  wrap.querySelectorAll(".pk-tab[data-mode]").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.mode = tab.dataset.mode;
      wrap.querySelectorAll(".pk-tab[data-mode]").forEach((t) =>
        t.setAttribute("aria-selected", String(t.dataset.mode === state.mode)));
      wrap.querySelector("#mx-extract").style.display = state.mode === "extract" ? "block" : "none";
      wrap.querySelector("#mx-trim").style.display = state.mode === "trim" ? "block" : "none";
    });
  });

  // ----- Extract format -----
  wrap.querySelectorAll("[data-xfmt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.extractFmt = btn.dataset.xfmt;
      wrap.querySelectorAll("[data-xfmt]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.xfmt === state.extractFmt)));
    });
  });

  // ----- Trim format -----
  wrap.querySelectorAll("[data-tfmt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.trimOut = btn.dataset.tfmt;
      wrap.querySelectorAll("[data-tfmt]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.tfmt === state.trimOut)));
    });
  });

  // ----- Trim sliders -----
  const startSlider = wrap.querySelector("#mx-start");
  const endSlider = wrap.querySelector("#mx-end");
  startSlider.addEventListener("input", () => {
    state.start = parseFloat(startSlider.value);
    if (state.start > state.end - 0.5) {
      state.start = state.end - 0.5;
      startSlider.value = String(state.start);
    }
    wrap.querySelector("#mx-start-val").textContent = formatTime(state.start);
    updateClipDuration();
  });
  endSlider.addEventListener("input", () => {
    state.end = parseFloat(endSlider.value);
    if (state.end < state.start + 0.5) {
      state.end = state.start + 0.5;
      endSlider.value = String(state.end);
    }
    wrap.querySelector("#mx-end-val").textContent = formatTime(state.end);
    updateClipDuration();
  });

  function updateClipDuration() {
    wrap.querySelector("#mx-clip-dur").textContent = formatTime(Math.max(0, state.end - state.start));
  }

  // ----- Clear -----
  wrap.querySelector('[data-action=clear]').addEventListener("click", () => {
    if (state.url) URL.revokeObjectURL(state.url);
    state.file = null; state.url = null; state.duration = 0; state.start = 0; state.end = 0;
    wrap.querySelector("#mx-panel").style.display = "none";
    dz.style.display = "block";
  });

  // ----- FFmpeg loading -----
  async function ensureFFmpeg() {
    if (state.ffmpeg) return state.ffmpeg;
    if (state.loading) return null;
    state.loading = true;
    const statusCard = wrap.querySelector("#ff-status-card");
    statusCard.style.display = "block";
    const ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => {
      // Surface only meaningful messages
      if (/error|fail/i.test(message)) console.warn("[ffmpeg]", message);
    });
    ffmpeg.on("progress", ({ progress, time }) => {
      const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
      wrap.querySelector("#mx-progress-text").textContent = `Processing… ${pct}% (${formatTime(time / 1000000)})`;
    });
    try {
      wrap.querySelector("#ff-status-title").textContent = "Downloading FFmpeg WASM core…";
      wrap.querySelector("#ff-status-detail").textContent = "~25 MB, cached for next runs";
      // The CDN URLs for the ffmpeg-core singlethreaded version
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      state.ffmpeg = ffmpeg;
      wrap.querySelector("#ff-status-title").textContent = "FFmpeg ready";
      wrap.querySelector("#ff-status-detail").textContent = "WASM core loaded and cached";
      setTimeout(() => { statusCard.style.display = "none"; }, 1500);
    } catch (e) {
      console.error(e);
      wrap.querySelector("#ff-status-title").textContent = "Failed to load FFmpeg";
      wrap.querySelector("#ff-status-detail").textContent = e.message + " — try refreshing the page";
      toast("FFmpeg failed to load. Check connection.", "error");
      throw e;
    } finally {
      state.loading = false;
    }
    return state.ffmpeg;
  }

  // ----- Process button -----
  wrap.querySelector("#mx-go").addEventListener("click", async () => {
    if (!state.file) return;
    const btn = wrap.querySelector("#mx-go");
    const prog = wrap.querySelector("#mx-progress");
    btn.disabled = true;
    prog.style.display = "block";
    try {
      const ffmpeg = await ensureFFmpeg();
      if (!ffmpeg) throw new Error("FFmpeg not ready");

      const inExt = state.file.name.split(".").pop()?.toLowerCase() || "mp4";
      const inName = `input.${inExt}`;
      wrap.querySelector("#mx-progress-text").textContent = "Reading file…";
      const data = await fetchFile(state.file);
      await ffmpeg.writeFile(inName, data);

      let outName, args;
      if (state.mode === "extract") {
        const fmt = state.extractFmt;
        outName = `output.${fmt}`;
        // For video → audio: -vn (no video), -acodec libmp3lame for MP3
        if (fmt === "mp3") {
          args = ["-i", inName, "-vn", "-acodec", "libmp3lame", "-q:a", "2", outName];
        } else {
          args = ["-i", inName, "-vn", "-acodec", "pcm_s16le", outName];
        }
      } else {
        // Trim mode
        const startStr = formatTimeFFmpeg(state.start);
        const durStr = formatTimeFFmpeg(state.end - state.start);
        if (state.trimOut === "mp3") {
          outName = "output.mp3";
          args = ["-ss", startStr, "-i", inName, "-t", durStr, "-vn", "-acodec", "libmp3lame", "-q:a", "2", outName];
        } else {
          // Keep original container; use stream copy
          outName = `output.${inExt}`;
          args = ["-ss", startStr, "-i", inName, "-t", durStr, "-c", "copy", outName];
        }
      }

      wrap.querySelector("#mx-progress-text").textContent = "Running FFmpeg…";
      await ffmpeg.exec(args);

      wrap.querySelector("#mx-progress-text").textContent = "Reading output…";
      const outData = await ffmpeg.readFile(outName);
      const blob = new Blob([outData.buffer], { type: getMime(outName) });
      const baseName = state.file.name.replace(/\.[^.]+$/, "");
      const suffix = state.mode === "extract"
        ? `audio-${state.extractFmt}`
        : `clip-${Math.floor(state.start)}s-${Math.floor(state.end)}s`;
      downloadBlob(blob, `${baseName}-${suffix}.${outName.split(".").pop()}`);

      // Cleanup
      try { await ffmpeg.deleteFile(inName); } catch {}
      try { await ffmpeg.deleteFile(outName); } catch {}

      toast("Processing complete ✓", "success");
      markDone();
    } catch (e) {
      console.error(e);
      toast("Processing failed: " + e.message, "error");
    } finally {
      btn.disabled = false;
      prog.style.display = "none";
    }
  });

  function formatTimeFFmpeg(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
  }

  function getMime(name) {
    const ext = name.split(".").pop();
    return ext === "mp3" ? "audio/mpeg"
      : ext === "wav" ? "audio/wav"
      : ext === "mp4" ? "video/mp4"
      : ext === "webm" ? "video/webm"
      : "application/octet-stream";
  }

  // Info card
  const info = el("div", { class: "pk-card pk-mt-4" });
  info.innerHTML = `
    <h3 style="font-size:0.95rem;margin-bottom:0.5rem">100% local processing</h3>
    <p class="pk-text-sm pk-text-muted pk-mb-2">
      <code class="pk-text-mono">ffmpeg.wasm</code> brings the full FFmpeg engine into your browser
      via WebAssembly. The first time you process a file, ~25 MB of WASM core downloads and gets
      cached — every subsequent run is much faster. Your media files never touch a server.
    </p>
    <p class="pk-text-sm pk-text-muted">
      <strong>Extract audio</strong> pulls the audio track from a video, perfect for getting MP3s
      from MP4 lectures or YouTube downloads. <strong>Trim</strong> lets you set start and end
      markers on the timeline, then exports just that range — for cutting intros/outros or making
      ringtones from full songs.
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
  const container = document.getElementById("day10-mount");
  if (container && typeof renderTool === "function") {
    renderTool(container, {
      toast,
      markDone: () => markDone("day10-media"),
    });
  }

  // Refresh Lucide icons
  if (window.lucide) window.lucide.createIcons();
  else window.addEventListener("load", () => window.lucide && window.lucide.createIcons());

  console.log("Day 10 — Media Extractor loaded.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
