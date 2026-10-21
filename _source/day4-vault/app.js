// =========================================================================
// Snippet Vault — Standalone app.js (Day 4 of Prodigy Kit)
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
// Tool rendering (inlined from day-04-snippet-vault.js)
// =========================================================================

// =========================================================================
// Day 4 — Self-Destructing Encrypted Snippet Vault
// Uses Web Crypto API (AES-GCM) to encrypt text in-browser
// Packs ciphertext + key + IV into URL hash; optional PIN protection
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

function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBuf(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(pin, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptVault(plaintext, pin) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  return {
    salt: bufToB64(salt),
    iv: bufToB64(iv),
    ct: bufToB64(ct),
  };
}

async function decryptVault(parts, pin) {
  const salt = new Uint8Array(b64ToBuf(parts.salt));
  const iv = new Uint8Array(b64ToBuf(parts.iv));
  const ct = b64ToBuf(parts.ct);
  const key = await deriveKey(pin, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// Build URL hash format: #vault=parts.base64pinHash if pin, else just parts
function buildVaultUrl(parts, pin) {
  const json = JSON.stringify(parts);
  const b64 = btoa(json);
  const base = window.location.origin + window.location.pathname;
  return `${base}#vault=${b64}`;
}

function parseVaultFromHash() {
  const hash = window.location.hash.slice(1);
  const m = hash.match(/^vault=([^&]+)/);
  if (!m) return null;
  try {
    return JSON.parse(atob(decodeURIComponent(m[1])));
  } catch {
    return null;
  }
}

function renderTool(container, { toast, markDone }) {
  container.innerHTML = "";
  const wrap = el("div");

  // Detect mode: are we decrypting (vault= in hash) or encrypting (new)?
  const incoming = parseVaultFromHash();
  if (incoming) {
    wrap.appendChild(createDecryptView(incoming, toast, markDone));
  } else {
    wrap.appendChild(createEncryptView(toast, markDone));
  }

  container.appendChild(wrap);
}

function createEncryptView(toast, markDone) {
  const view = el("div", { class: "pk-card" });
  view.innerHTML = `
    <h3 style="font-size:1rem;margin-bottom:0.75rem">🔐 Encrypt a snippet</h3>
    <p class="pk-text-sm pk-text-muted pk-mb-3">
      Paste text, an API key, or code. We'll encrypt it in your browser with AES-GCM (256-bit)
      and pack the ciphertext + key into a shareable URL. The URL is the only key — lose it, lose the data.
    </p>

    <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Snippet to encrypt</label>
    <textarea id="vault-input" rows="8" placeholder="Paste your secret here…" style="width:100%;font-family:var(--pk-font-mono);font-size:0.825rem;resize:vertical;margin-bottom:1rem"></textarea>

    <label class="pk-flex pk-gap-2 pk-mb-3" style="align-items:center">
      <input type="checkbox" id="vault-usepin" />
      <span class="pk-text-sm">Protect with a PIN (recommended for sensitive data)</span>
    </label>

    <div id="vault-pinwrap" style="display:none;margin-bottom:1rem">
      <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">PIN (any text — make it memorable)</label>
      <input type="text" id="vault-pin" placeholder="e.g. correct-horse-battery-staple" style="width:100%;font-family:var(--pk-font-mono)" />
    </div>

    <button class="pk-btn pk-btn--primary pk-btn--lg" id="vault-encrypt" style="width:100%">
      🔐 Encrypt & generate URL
    </button>

    <div id="vault-result" style="display:none;margin-top:1rem">
      <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Share this URL (the snippet is encrypted inside the #hash)</label>
      <textarea id="vault-url" rows="3" readonly style="width:100%;font-family:var(--pk-font-mono);font-size:0.75rem;resize:vertical"></textarea>
      <div class="pk-flex pk-gap-2 pk-mt-2">
        <button class="pk-btn pk-btn--primary" id="vault-copy" style="flex:1">📋 Copy URL</button>
        <button class="pk-btn" id="vault-open" style="flex:1">↗ Open in new tab</button>
      </div>
      <p class="pk-text-xs pk-text-muted pk-mt-2">
        ⚠️ Whoever has this URL can decrypt the snippet. For PIN-protected snippets, they also need the PIN.
      </p>
    </div>
  `;

  const pinCheckbox = view.querySelector("#vault-usepin");
  const pinWrap = view.querySelector("#vault-pinwrap");
  pinCheckbox.addEventListener("change", () => {
    pinWrap.style.display = pinCheckbox.checked ? "block" : "none";
  });

  view.querySelector("#vault-encrypt").addEventListener("click", async () => {
    const input = view.querySelector("#vault-input").value;
    if (!input.trim()) {
      toast("Enter some text to encrypt", "error");
      return;
    }
    if (input.length > 10000) {
      toast("Snippet too large (max 10,000 chars for URL safety)", "error");
      return;
    }
    const usePin = view.querySelector("#vault-usepin").checked;
    const pin = view.querySelector("#vault-pin").value || "anon";

    const btn = view.querySelector("#vault-encrypt");
    btn.disabled = true;
    btn.innerHTML = `<span class="pk-spinner"></span> Encrypting…`;
    try {
      const parts = await encryptVault(input, pin);
      const url = buildVaultUrl(parts, usePin ? pin : null);
      view.querySelector("#vault-url").value = url;
      view.querySelector("#vault-result").style.display = "block";
      toast("Snippet encrypted — copy the URL below", "success");
      markDone();
    } catch (e) {
      console.error(e);
      toast("Encryption failed: " + e.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "🔐 Encrypt & generate URL";
    }
  });

  view.querySelector("#vault-copy").addEventListener("click", () => {
    const url = view.querySelector("#vault-url").value;
    navigator.clipboard.writeText(url).then(() => {
      toast("URL copied to clipboard", "success");
    }).catch(() => {
      const input = view.querySelector("#vault-url");
      input.select();
      document.execCommand("copy");
      toast("URL copied", "success");
    });
  });

  view.querySelector("#vault-open").addEventListener("click", () => {
    const url = view.querySelector("#vault-url").value;
    window.open(url, "_blank");
  });

  return view;
}

function createDecryptView(parts, toast, markDone) {
  const view = el("div", { class: "pk-card" });
  view.innerHTML = `
    <h3 style="font-size:1rem;margin-bottom:0.75rem">🔓 Decrypt snippet</h3>
    <p class="pk-text-sm pk-text-muted pk-mb-3">
      A vault URL was detected. If the snippet was PIN-protected, enter the PIN below.
    </p>

    <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">PIN (if any)</label>
    <input type="text" id="dec-pin" placeholder="Enter PIN or leave empty" style="width:100%;font-family:var(--pk-font-mono);margin-bottom:1rem" />

    <button class="pk-btn pk-btn--primary pk-btn--lg" id="dec-go" style="width:100%">
      🔓 Decrypt
    </button>

    <div id="dec-result" style="display:none;margin-top:1rem">
      <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Decrypted content</label>
      <textarea id="dec-output" rows="8" readonly style="width:100%;font-family:var(--pk-font-mono);font-size:0.825rem;resize:vertical"></textarea>
      <div class="pk-flex pk-gap-2 pk-mt-2">
        <button class="pk-btn pk-btn--primary" id="dec-copy" style="flex:1">📋 Copy content</button>
        <button class="pk-btn" id="dec-new" style="flex:1">＋ Encrypt new</button>
      </div>
    </div>
  `;

  view.querySelector("#dec-go").addEventListener("click", async () => {
    const pin = view.querySelector("#dec-pin").value || "anon";
    const btn = view.querySelector("#dec-go");
    btn.disabled = true;
    btn.innerHTML = `<span class="pk-spinner"></span> Decrypting…`;
    try {
      const pt = await decryptVault(parts, pin);
      view.querySelector("#dec-output").value = pt;
      view.querySelector("#dec-result").style.display = "block";
      toast("Decrypted successfully", "success");
      markDone();
    } catch (e) {
      console.error(e);
      toast("Wrong PIN or corrupted vault", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "🔓 Decrypt";
    }
  });

  view.querySelector("#dec-copy").addEventListener("click", () => {
    const text = view.querySelector("#dec-output").value;
    navigator.clipboard.writeText(text).then(() => {
      toast("Copied to clipboard", "success");
    });
  });

  view.querySelector("#dec-new").addEventListener("click", () => {
    // Clear hash and reload
    history.replaceState(null, "", window.location.pathname + window.location.search);
    location.reload();
  });

  return view;
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
  const container = document.getElementById("day4-mount");
  if (container && typeof renderTool === "function") {
    renderTool(container, {
      toast,
      markDone: () => markDone("day4-vault"),
    });
  }

  // Refresh Lucide icons
  if (window.lucide) window.lucide.createIcons();
  else window.addEventListener("load", () => window.lucide && window.lucide.createIcons());

  console.log("Day 4 — Snippet Vault loaded.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
