// =========================================================================
// Day 6 — In-Browser AI Background Remover
// Uses @imgly/background-removal (WASM model, runs in browser)
// Optional solid fill (white / passport blue) after removal
// =========================================================================

import { removeBackground } from "https://esm.sh/@imgly/background-removal@1.7.0";

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

export function mount(container, { toast, markDone }) {
  container.innerHTML = "";
  const wrap = el("div");

  wrap.innerHTML = `
    <!-- Dropzone -->
    <div class="pk-dropzone" id="bg-dz" role="button" tabindex="0">
      <div class="pk-dropzone__icon">✂️</div>
      <div class="pk-dropzone__title">Drop a photo to cut out</div>
      <div class="pk-dropzone__hint">JPG · PNG · WEBP · Person or object with clear foreground</div>
    </div>
    <input type="file" id="bg-input" accept="image/*" style="display:none" />

    <!-- Result panel -->
    <div class="pk-card" id="bg-panel" style="display:none;margin-top:1rem">
      <div class="pk-flex" style="justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem">
        <h3 style="font-size:1rem;margin:0" id="bg-filename">image.jpg</h3>
        <button class="pk-btn pk-btn--ghost" data-action="clear">✕ Remove</button>
      </div>

      <div class="pk-grid-2" style="gap:1rem;align-items:start;margin-bottom:1rem">
        <div style="text-align:center">
          <div class="pk-text-xs pk-text-muted pk-mb-2">ORIGINAL</div>
          <div id="bg-orig" style="display:grid;place-items:center;min-height:200px"></div>
        </div>
        <div style="text-align:center">
          <div class="pk-text-xs pk-text-muted pk-mb-2">CUTOUT</div>
          <div id="bg-out" style="display:grid;place-items:center;min-height:200px;
            background-image:linear-gradient(45deg,#999 25%,transparent 25%),linear-gradient(-45deg,#999 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#999 75%),linear-gradient(-45deg,transparent 75%,#999 75%);
            background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0;
            background-color:#ccc;border-radius:var(--pk-radius-sm)"></div>
        </div>
      </div>

      <div id="bg-controls" style="display:none">
        <div class="pk-flex pk-gap-2 pk-mb-3" style="flex-wrap:wrap">
          <button class="pk-btn pk-btn--primary" data-fill="none" aria-pressed="true">🚫 Transparent</button>
          <button class="pk-btn" data-fill="white" aria-pressed="false">⬜ Solid white</button>
          <button class="pk-btn" data-fill="blue" aria-pressed="false">🟦 Passport blue</button>
          <button class="pk-btn" data-fill="red" aria-pressed="false">🟥 Red</button>
          <button class="pk-btn" data-fill="custom" aria-pressed="false">🎨 Custom</button>
          <input type="color" id="bg-custom-color" value="#ffffff" style="width:36px;height:36px;padding:0;border:none;background:none;cursor:pointer;display:none" />
        </div>
        <div class="pk-flex pk-gap-2">
          <button class="pk-btn pk-btn--primary pk-btn--lg" id="bg-download" style="flex:1">⬇ Download PNG</button>
        </div>
      </div>

      <div id="bg-progress" class="pk-text-center pk-text-sm pk-text-muted pk-mt-3" style="display:none"></div>
    </div>
  `;

  const state = {
    file: null,
    origUrl: null,
    outUrl: null,
    blob: null,
    fill: "none",
    customColor: "#ffffff",
  };

  // Wire dropzone
  const dz = wrap.querySelector("#bg-dz");
  const input = wrap.querySelector("#bg-input");

  dz.addEventListener("click", () => input.click());
  dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
  });
  input.addEventListener("change", () => {
    if (input.files?.[0]) handleFile(input.files[0]);
    input.value = "";
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
    if (state.outUrl) URL.revokeObjectURL(state.outUrl);
    state.origUrl = URL.createObjectURL(file);
    state.outUrl = null;
    state.blob = null;

    wrap.querySelector("#bg-filename").textContent = file.name;
    wrap.querySelector("#bg-orig").innerHTML = `<img src="${state.origUrl}" style="max-width:100%;max-height:240px;border-radius:var(--pk-radius-sm);object-fit:contain" alt="" />`;
    wrap.querySelector("#bg-out").innerHTML = `<span class="pk-text-muted pk-text-sm">Loading model…</span>`;
    wrap.querySelector("#bg-controls").style.display = "none";
    wrap.querySelector("#bg-progress").style.display = "block";
    wrap.querySelector("#bg-progress").textContent = "Loading model + running inference…";
    wrap.querySelector("#bg-panel").style.display = "block";
    dz.style.display = "none";

    try {
      // @imgly/background-removal accepts a Blob or URL
      const blob = await removeBackground(state.origUrl, {
        progress: (key, current, total) => {
          const pct = total ? Math.round((current / total) * 100) : null;
          const label = key === "fetch" ? "Downloading model"
            : key === "compute" ? "Cutting out"
            : "Processing";
          wrap.querySelector("#bg-progress").innerHTML = pct != null
            ? `<span class="pk-spinner"></span> ${label}… ${pct}%`
            : `<span class="pk-spinner"></span> ${label}…`;
        },
      });
      state.blob = blob;
      state.outUrl = URL.createObjectURL(blob);
      wrap.querySelector("#bg-out").innerHTML = `<img src="${state.outUrl}" style="max-width:100%;max-height:240px;border-radius:var(--pk-radius-sm);object-fit:contain" alt="" />`;
      wrap.querySelector("#bg-controls").style.display = "block";
      wrap.querySelector("#bg-progress").style.display = "none";
      toast("Background removed — pick a fill option below", "success");
      markDone();
    } catch (e) {
      console.error(e);
      wrap.querySelector("#bg-out").innerHTML = `<span class="pk-text-sm" style="color:#ef4444">Failed: ${e.message}</span>`;
      wrap.querySelector("#bg-progress").style.display = "none";
      toast("Background removal failed. Check console.", "error");
    }
  }

  wrap.querySelector('[data-action=clear]').addEventListener("click", () => {
    if (state.origUrl) URL.revokeObjectURL(state.origUrl);
    if (state.outUrl) URL.revokeObjectURL(state.outUrl);
    Object.assign(state, { file: null, origUrl: null, outUrl: null, blob: null });
    wrap.querySelector("#bg-panel").style.display = "none";
    dz.style.display = "block";
  });

  // Fill buttons
  const FILL_COLORS = {
    none: null, white: "#ffffff", blue: "#1f6feb", red: "#e8453c",
    custom: state.customColor,
  };

  wrap.querySelectorAll("[data-fill]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.fill = btn.dataset.fill;
      wrap.querySelectorAll("[data-fill]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.fill === state.fill)));
      const showColor = state.fill === "custom";
      wrap.querySelector("#bg-custom-color").style.display = showColor ? "inline-block" : "none";
      renderFilled();
    });
  });

  wrap.querySelector("#bg-custom-color").addEventListener("input", (e) => {
    state.customColor = e.target.value;
    renderFilled();
  });

  async function renderFilled() {
    if (!state.blob) return;
    if (state.fill === "none") {
      // Use original blob
      wrap.querySelector("#bg-out").innerHTML = `<img src="${state.outUrl}" style="max-width:100%;max-height:240px;border-radius:var(--pk-radius-sm);object-fit:contain" alt="" />`;
      return;
    }
    const color = state.fill === "custom" ? state.customColor : FILL_COLORS[state.fill];
    // Composite cutout (PNG with alpha) over solid color background
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = state.outUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    const url = URL.createObjectURL(blob);
    wrap.querySelector("#bg-out").innerHTML = `<img src="${url}" style="max-width:100%;max-height:240px;border-radius:var(--pk-radius-sm);object-fit:contain" alt="" />`;
  }

  // Download
  wrap.querySelector("#bg-download").addEventListener("click", async () => {
    if (!state.blob) return;
    let blob = state.blob;
    if (state.fill !== "none") {
      const color = state.fill === "custom" ? state.customColor : FILL_COLORS[state.fill];
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = state.outUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    }
    const baseName = state.file.name.replace(/\.[^.]+$/, "");
    downloadBlob(blob, `${baseName}-cutout.png`);
    toast("PNG downloaded", "success");
  });

  // Info card
  const info = el("div", { class: "pk-card pk-mt-4" });
  info.innerHTML = `
    <h3 style="font-size:0.95rem;margin-bottom:0.5rem">100% local, no watermarks</h3>
    <p class="pk-text-sm pk-text-muted">
      The first time you load this tool, your browser downloads a ~30 MB WebAssembly AI model.
      That model runs entirely in your browser — no images leave your device, no API calls,
      no credits or paywalls. After the first load, the model is cached and subsequent cutouts
      are much faster. <strong>Solid fill</strong> options are perfect for ID/passport photos:
      cutout → white or passport blue background, then download.
    </p>
  `;
  wrap.appendChild(info);

  container.appendChild(wrap);
}
