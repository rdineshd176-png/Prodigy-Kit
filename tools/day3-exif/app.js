// =========================================================================
// Day 3 — EXIF & Metadata Scrubber
// Sub-tools: Creepy Data Inspector (ExifReader) + Zero-Trace Scrubber (canvas redraw)
// All client-side, nothing leaves the browser
// =========================================================================

import ExifReader from "https://esm.sh/exifreader@4.49.0";

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

// Categorize EXIF tags for friendlier display
function categorizeTags(tags) {
  const cats = {
    camera: { label: "📷 Camera", keys: ["Make", "Model", "LensModel", "LensMake", "LensSerialNumber", "BodySerialNumber", "Software", "SerialNumber"] },
    exposure: { label: "⚙️ Exposure", keys: ["FNumber", "ExposureTime", "ExposureProgram", "ExposureMode", "ISOSpeedRatings", "ShutterSpeedValue", "ApertureValue", "BrightnessValue", "ExposureBiasValue", "Flash", "FocalLength", "FocalLengthIn35mmFilm", "FocusDistance"] },
    gps: { label: "📍 GPS", keys: ["GPSLatitude", "GPSLongitude", "GPSAltitude", "GPSLatitudeRef", "GPSLongitudeRef", "GPSAltitudeRef", "GPSDateStamp", "GPSTimeStamp", "GPSImgDirection", "GPSPosition"] },
    date: { label: "🕐 Date", keys: ["DateTimeOriginal", "DateTimeDigitized", "DateTime", "OffsetTime", "OffsetTimeOriginal"] },
    image: { label: "🖼️ Image", keys: ["ImageWidth", "ImageLength", "BitsPerSample", "Compression", "PhotometricInterpretation", "Orientation", "SamplesPerPixel", "ColorSpace", "PixelXDimension", "PixelYDimension", "ResolutionUnit", "XResolution", "YResolution"] },
    other: { label: "📦 Other", keys: [] },
  };

  const grouped = { camera: [], exposure: [], gps: [], date: [], image: [], other: [] };
  Object.entries(tags).forEach(([key, val]) => {
    let placed = false;
    Object.entries(cats).forEach(([cat, def]) => {
      if (def.keys.includes(key) && !placed) {
        grouped[cat].push({ key, val });
        placed = true;
      }
    });
    if (!placed) grouped.other.push({ key, val });
  });
  return grouped;
}

function formatValue(v) {
  if (v == null) return "—";
  if (typeof v === "object") {
    if (Array.isArray(v)) return v.map(formatValue).join(", ");
    if (v.description) return v.description;
    if (v.value !== undefined) return Array.isArray(v.value) ? v.value.join(", ") : String(v.value);
    return JSON.stringify(v);
  }
  return String(v);
}

export function mount(container, { toast, markDone }) {
  container.innerHTML = "";
  const wrap = el("div");

  // Dropzone
  const dz = el("div", { class: "pk-dropzone", role: "button", tabindex: "0" });
  dz.innerHTML = `
    <div class="pk-dropzone__icon">🧽</div>
    <div class="pk-dropzone__title">Drop a photo to inspect & scrub</div>
    <div class="pk-dropzone__hint">JPG · PNG · HEIC · TIFF — all metadata stays in your browser</div>
  `;
  const fileInput = el("input", { type: "file", accept: "image/*", style: "display:none" });
  dz.appendChild(fileInput);

  // Inspector panel
  const panel = el("div", { class: "pk-card", style: "display:none" });
  panel.innerHTML = `
    <div class="pk-flex" style="justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem">
      <div>
        <h3 style="font-size:1rem;margin:0" id="exif-filename">photo.jpg</h3>
        <p class="pk-text-xs pk-text-muted pk-text-mono" id="exif-fileinfo"></p>
      </div>
      <div class="pk-flex pk-gap-2">
        <button class="pk-btn pk-btn--ghost" data-action="clear">Remove</button>
        <button class="pk-btn pk-btn--primary" data-action="scrub">🧽 Scrub & Download</button>
      </div>
    </div>

    <div id="exif-content"></div>
  `;

  const state = { file: null, url: null, tags: null, img: null };

  // Wire dropzone
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
    if (state.url) URL.revokeObjectURL(state.url);
    state.url = URL.createObjectURL(file);
    panel.querySelector("#exif-filename").textContent = file.name;
    panel.querySelector("#exif-fileinfo").textContent = `${formatBytes(file.size)} · ${file.type}`;
    panel.style.display = "block";
    dz.style.display = "block";

    try {
      const tags = await ExifReader.load(state.url, { includeUnknown: false });
      // Filter out "undefined" non-value tags
      Object.keys(tags).forEach((k) => {
        if (tags[k].value === undefined && tags[k].description === undefined) delete tags[k];
      });
      state.tags = tags;
      renderInspector();

      // Load image for scrubbing
      state.img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = state.url;
      });

      const numTags = Object.keys(tags).length;
      const gpsTags = ["GPSLatitude", "GPSLongitude", "GPSAltitude"].some((k) => tags[k]);
      toast(`Found ${numTags} metadata tags${gpsTags ? " — GPS coordinates detected!" : ""}`, gpsTags ? "error" : "info", 4000);
    } catch (e) {
      console.error(e);
      panel.querySelector("#exif-content").innerHTML = `
        <div class="pk-text-center pk-text-muted pk-text-sm">No readable EXIF metadata in this image (or format not supported).</div>
      `;
      state.tags = {};
      state.img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = state.url;
      });
      renderInspector();
    }
  }

  function renderInspector() {
    const content = panel.querySelector("#exif-content");
    const grouped = categorizeTags(state.tags || {});
    const tagCount = Object.keys(state.tags || {}).length;

    if (tagCount === 0) {
      content.innerHTML = `
        <div style="text-align:center;padding:2rem 0">
          <div style="font-size:2.5rem;margin-bottom:0.5rem">✨</div>
          <p class="pk-text-sm pk-text-muted">No readable EXIF metadata found in this image. It's already clean!</p>
        </div>
      `;
      return;
    }

    const gpsPresent = grouped.gps.length > 0;
    let html = "";

    if (gpsPresent) {
      html += `
        <div class="pk-card pk-card--pad-sm" style="border-color:#ef4444;background:rgba(239,68,68,0.08);margin-bottom:1rem">
          <div class="pk-flex pk-gap-2 pk-text-sm" style="align-items:center">
            <span style="font-size:1.5rem">⚠️</span>
            <div>
              <strong style="color:#ef4444">GPS coordinates detected.</strong>
              This photo leaks your exact location. Scrub to remove.
            </div>
          </div>
        </div>
      `;
    }

    html += `<div class="pk-flex pk-gap-2" style="flex-wrap:wrap;margin-bottom:1rem">`;
    Object.entries(grouped).forEach(([cat, items]) => {
      if (items.length === 0) return;
      const catLabel = categorizeTags({}).other; // placeholder; use direct lookup
      const labels = {
        camera: "📷 Camera", exposure: "⚙️ Exposure", gps: "📍 GPS",
        date: "🕐 Date", image: "🖼️ Image", other: "📦 Other",
      };
      html += `<span class="pk-text-xs pk-text-mono pk-text-muted" style="padding:0.25rem 0.625rem;border:1px solid var(--pk-border);border-radius:var(--pk-radius-full)">${labels[cat]} · ${items.length}</span>`;
    });
    html += `</div>`;

    // Detailed table
    Object.entries(grouped).forEach(([cat, items]) => {
      if (items.length === 0) return;
      const labels = {
        camera: "📷 Camera & Lens", exposure: "⚙️ Exposure & Capture",
        gps: "📍 GPS & Location", date: "🕐 Date & Time",
        image: "🖼️ Image Properties", other: "📦 Other Metadata",
      };
      html += `<h4 style="font-size:0.875rem;margin:1rem 0 0.5rem;color:var(--pk-fg-strong)">${labels[cat]}</h4>`;
      html += `<div style="display:grid;grid-template-columns:1fr;gap:0.25rem;margin-bottom:0.75rem">`;
      items.forEach(({ key, val }) => {
        const isSensitive = /GPS|Serial|Location|Position/i.test(key);
        html += `
          <div class="pk-flex" style="justify-content:space-between;align-items:flex-start;gap:1rem;padding:0.4rem 0.5rem;border-bottom:1px solid var(--pk-border)">
            <span class="pk-text-xs pk-text-mono pk-text-muted" style="flex-shrink:0">${key}</span>
            <span class="pk-text-sm ${isSensitive ? "" : ""}" style="text-align:right;color:${isSensitive ? "#ef4444" : "var(--pk-fg)"};word-break:break-word">${formatValue(val)}</span>
          </div>
        `;
      });
      html += `</div>`;
    });

    content.innerHTML = html;
  }

  panel.querySelector('[data-action=clear]').addEventListener("click", () => {
    if (state.url) URL.revokeObjectURL(state.url);
    state.file = null; state.url = null; state.tags = null; state.img = null;
    panel.style.display = "none";
    panel.querySelector("#exif-content").innerHTML = "";
  });

  panel.querySelector('[data-action=scrub]').addEventListener("click", async () => {
    if (!state.img) {
      toast("Load an image first", "error");
      return;
    }
    const btn = panel.querySelector('[data-action=scrub]');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="pk-spinner"></span> Scrubbing…`;
    try {
      // Redraw image onto a clean canvas — this strips ALL metadata (EXIF, IPTC, XMP)
      const canvas = document.createElement("canvas");
      canvas.width = state.img.naturalWidth;
      canvas.height = state.img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(state.img, 0, 0);
      // Use original format (PNG if it was PNG, JPG otherwise — JPG strips alpha)
      const outType = state.file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise((r) => canvas.toBlob(r, outType, 0.95));
      if (!blob) throw new Error("Canvas conversion failed");
      const baseName = state.file.name.replace(/\.[^.]+$/, "");
      downloadBlob(blob, `${baseName}-scrubbed.${outType === "image/png" ? "png" : "jpg"}`);
      const strippedCount = Object.keys(state.tags || {}).length;
      toast(`Stripped ${strippedCount} metadata tag${strippedCount !== 1 ? "s" : ""}`, "success");
      markDone();
    } catch (e) {
      console.error(e);
      toast("Scrub failed: " + e.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  });

  wrap.appendChild(dz);
  wrap.appendChild(panel);

  // Info card
  const info = el("div", { class: "pk-card pk-mt-4" });
  info.innerHTML = `
    <h3 style="font-size:0.95rem;margin-bottom:0.5rem">Why this matters</h3>
    <p class="pk-text-sm pk-text-muted">
      Every photo you take with a phone stores <strong>EXIF metadata</strong> — exact GPS coordinates
      (often accurate to within a few meters), phone model, serial number, shutter speed, time and date.
      When you upload or share that photo, you leak all of that. The scrubber redraws your image onto a
      fresh HTML5 canvas, which produces a brand-new file with <strong>zero embedded metadata</strong>.
      Nothing is uploaded. Inspected and cleaned in your browser only.
    </p>
  `;
  wrap.appendChild(info);

  container.appendChild(wrap);
}
