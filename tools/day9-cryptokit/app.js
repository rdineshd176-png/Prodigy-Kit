// =========================================================================
// Crypto Kit — Standalone app.js (Day 9 of Prodigy Kit)
// Fully self-contained: store + theme logic + tool rendering
// No external dependencies except the library imports below
// =========================================================================

// Library imports (must be at top of ES module)
import CryptoJS from "https://esm.sh/crypto-js@4.2.0";

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
// Tool rendering (inlined from day-09-crypto-kit.js)
// =========================================================================

// =========================================================================
// Day 9 — CTF & Dev Swiss Army Knife
// Multi-Translator (Base64/Hex/Bin/ASCII/URL), JWT decoder, hash generators
// All offline, nothing leaves the browser
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

// Convert string to/from various encodings
function strToBytes(s) {
  return Array.from(new TextEncoder().encode(s));
}

function bytesToStr(bytes) {
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function bytesToHex(bytes) {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const clean = hex.replace(/\s+/g, "").replace(/^0x/i, "");
  if (clean.length % 2 !== 0) throw new Error("Hex must have even length");
  const out = [];
  for (let i = 0; i < clean.length; i += 2) {
    out.push(parseInt(clean.substr(i, 2), 16));
  }
  return out;
}

function bytesToBin(bytes) {
  return bytes.map((b) => b.toString(2).padStart(8, "0")).join(" ");
}

function binToBytes(bin) {
  const clean = bin.replace(/[\s_]/g, "");
  if (!/^[01]+$/.test(clean)) throw new Error("Binary must only contain 0 and 1");
  if (clean.length % 8 !== 0) throw new Error("Binary length must be multiple of 8");
  const out = [];
  for (let i = 0; i < clean.length; i += 8) {
    out.push(parseInt(clean.substr(i, 8), 2));
  }
  return out;
}

function bytesToAscii(bytes) {
  // Decode bytes as ASCII; for non-printable, show \xNN
  return bytes.map((b) => (b >= 32 && b <= 126) ? String.fromCharCode(b) : `\\x${b.toString(16).padStart(2, "0")}`).join("");
}

function asciiToBytes(s) {
  // Parse \xNN escapes, otherwise raw chars
  const out = [];
  const re = /\\x([0-9a-fA-F]{2})|./g;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m[1]) out.push(parseInt(m[1], 16));
    else {
      const charCode = m[0].charCodeAt(0);
      // Encode the char as UTF-8
      const encoded = new TextEncoder().encode(m[0]);
      encoded.forEach((b) => out.push(b));
    }
  }
  return out;
}

function bytesToBase64(bytes) {
  return btoa(bytes.map((b) => String.fromCharCode(b)).join(""));
}

function base64ToBytes(b64) {
  const clean = b64.replace(/\s/g, "");
  const bin = atob(clean);
  return Array.from(bin, (c) => c.charCodeAt(0));
}

// JWT decode (no signature verification — just decode header.payload)
function decodeJwt(token) {
  const parts = token.trim().split(".");
  if (parts.length < 2 || parts.length > 3) {
    throw new Error("JWT must have 2 or 3 parts separated by dots");
  }
  const decode = (part, name) => {
    try {
      // JWT base64 is URL-safe, no padding
      const padded = part.replace(/-/g, "+").replace(/_/g, "/");
      const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
      const json = atob(padded + pad);
      return JSON.parse(json);
    } catch (e) {
      throw new Error(`Could not decode ${name}: ${e.message}`);
    }
  };
  return {
    header: decode(parts[0], "header"),
    payload: decode(parts[1], "payload"),
    signature: parts[2] || "",
  };
}

function renderTool(container, { toast, markDone }) {
  container.innerHTML = "";
  const wrap = el("div");

  // ----- TABS -----
  wrap.innerHTML = `
    <div class="pk-tabs" role="tablist">
      <button class="pk-tab" role="tab" data-tab="trans" aria-selected="true">🔁 Multi-Translator</button>
      <button class="pk-tab" role="tab" data-tab="jwt" aria-selected="false">🎫 JWT Decoder</button>
      <button class="pk-tab" role="tab" data-tab="hash" aria-selected="false"># Hash Generators</button>
    </div>

    <!-- Multi-Translator -->
    <div class="ctf-tab-panel" data-panel="trans">
      <div class="pk-card">
        <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Input (paste text or encoded data)</label>
        <textarea id="mt-input" rows="3" placeholder="Type here…" style="width:100%;font-family:var(--pk-font-mono);font-size:0.825rem;resize:vertical;margin-bottom:0.75rem"></textarea>
        <div class="pk-flex pk-gap-2 pk-mb-3" style="flex-wrap:wrap;align-items:center">
          <span class="pk-text-xs pk-text-muted">Decode as:</span>
          <button class="pk-btn pk-btn--ghost pk-text-xs" data-dec="base64">Base64</button>
          <button class="pk-btn pk-btn--ghost pk-text-xs" data-dec="hex">Hex</button>
          <button class="pk-btn pk-btn--ghost pk-text-xs" data-dec="binary">Binary</button>
          <button class="pk-btn pk-btn--ghost pk-text-xs" data-dec="ascii">ASCII / 0xNN</button>
          <button class="pk-btn pk-btn--ghost pk-text-xs" data-dec="url">URL encoded</button>
        </div>
        <button class="pk-btn pk-btn--ghost pk-text-xs pk-mb-3" id="mt-clear">Clear</button>
      </div>

      <div class="pk-card pk-mt-2">
        <h3 style="font-size:0.95rem;margin-bottom:0.75rem">All representations</h3>
        <div class="pk-text-sm" style="display:grid;grid-template-columns:1fr;gap:0.75rem">
          <div>
            <div class="pk-flex" style="justify-content:space-between;align-items:center">
              <span class="pk-text-xs pk-text-muted pk-text-mono">BASE64</span>
              <button class="pk-btn pk-btn--ghost pk-text-xs" data-copy="#mt-b64">📋</button>
            </div>
            <textarea id="mt-b64" rows="2" readonly style="width:100%;font-family:var(--pk-font-mono);font-size:0.75rem;resize:vertical;margin-top:0.25rem"></textarea>
          </div>
          <div>
            <div class="pk-flex" style="justify-content:space-between;align-items:center">
              <span class="pk-text-xs pk-text-muted pk-text-mono">HEX</span>
              <button class="pk-btn pk-btn--ghost pk-text-xs" data-copy="#mt-hex">📋</button>
            </div>
            <textarea id="mt-hex" rows="2" readonly style="width:100%;font-family:var(--pk-font-mono);font-size:0.75rem;resize:vertical;margin-top:0.25rem"></textarea>
          </div>
          <div>
            <div class="pk-flex" style="justify-content:space-between;align-items:center">
              <span class="pk-text-xs pk-text-muted pk-text-mono">BINARY</span>
              <button class="pk-btn pk-btn--ghost pk-text-xs" data-copy="#mt-bin">📋</button>
            </div>
            <textarea id="mt-bin" rows="2" readonly style="width:100%;font-family:var(--pk-font-mono);font-size:0.75rem;resize:vertical;margin-top:0.25rem"></textarea>
          </div>
          <div>
            <div class="pk-flex" style="justify-content:space-between;align-items:center">
              <span class="pk-text-xs pk-text-muted pk-text-mono">URL ENCODED</span>
              <button class="pk-btn pk-btn--ghost pk-text-xs" data-copy="#mt-url">📋</button>
            </div>
            <textarea id="mt-url" rows="2" readonly style="width:100%;font-family:var(--pk-font-mono);font-size:0.75rem;resize:vertical;margin-top:0.25rem"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- JWT Decoder -->
    <div class="ctf-tab-panel" data-panel="jwt" style="display:none">
      <div class="pk-card">
        <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Paste a JWT (eyJhbGciOi…)</label>
        <textarea id="jwt-input" rows="4" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIx…" style="width:100%;font-family:var(--pk-font-mono);font-size:0.825rem;resize:vertical;margin-bottom:0.75rem" spellcheck="false"></textarea>
        <div class="pk-flex pk-gap-2">
          <button class="pk-btn pk-btn--primary" id="jwt-decode">Decode JWT</button>
          <button class="pk-btn pk-btn--ghost" id="jwt-clear">Clear</button>
        </div>
      </div>

      <div id="jwt-result" style="display:none;margin-top:1rem">
        <div class="pk-card pk-mb-2">
          <div class="pk-flex pk-text-xs pk-text-muted pk-mb-2" style="justify-content:space-between;align-items:center">
            <span>HEADER</span><span id="jwt-header-alg" class="pk-text-mono"></span>
          </div>
          <pre id="jwt-header-json" style="font-family:var(--pk-font-mono);font-size:0.8rem;background:var(--pk-card-bg);padding:0.75rem;border-radius:var(--pk-radius-sm);overflow-x:auto;color:var(--pk-fg)"></pre>
        </div>
        <div class="pk-card pk-mb-2">
          <div class="pk-flex pk-text-xs pk-text-muted pk-mb-2" style="justify-content:space-between;align-items:center">
            <span>PAYLOAD</span><span id="jwt-exp" class="pk-text-mono"></span>
          </div>
          <pre id="jwt-payload-json" style="font-family:var(--pk-font-mono);font-size:0.8rem;background:var(--pk-card-bg);padding:0.75rem;border-radius:var(--pk-radius-sm);overflow-x:auto;color:var(--pk-fg)"></pre>
        </div>
        <div class="pk-card pk-mb-2">
          <div class="pk-text-xs pk-text-muted pk-mb-2">SIGNATURE (HMAC input)</div>
          <code class="pk-text-mono pk-text-xs" id="jwt-sig" style="word-break:break-all"></code>
          <p class="pk-text-xs pk-text-muted pk-mt-2">
            ⚠️ This decoder does <strong>not</strong> verify the signature. Decoding a JWT only tells you
            what the issuer <em>claims</em>. Never trust claims without server-side signature verification.
          </p>
        </div>
      </div>
    </div>

    <!-- Hash Generators -->
    <div class="ctf-tab-panel" data-panel="hash" style="display:none">
      <div class="pk-card">
        <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Input text</label>
        <textarea id="hash-input" rows="3" placeholder="Type text to hash…" style="width:100%;font-family:var(--pk-font-mono);font-size:0.825rem;resize:vertical;margin-bottom:0.75rem"></textarea>
        <div class="pk-flex pk-gap-2 pk-mb-2" style="flex-wrap:wrap;align-items:center">
          <label class="pk-flex pk-gap-2 pk-text-sm" style="align-items:center">
            <input type="checkbox" id="hash-hmac" />
            <span>Use HMAC (with secret)</span>
          </label>
          <input type="text" id="hash-secret" placeholder="HMAC secret (if enabled)" style="flex:1;min-width:200px;font-family:var(--pk-font-mono)" disabled />
        </div>
        <button class="pk-btn pk-btn--primary" id="hash-go">Generate hashes</button>
      </div>

      <div id="hash-results" style="display:none;margin-top:1rem"></div>
    </div>
  `;

  // ----- TAB SWITCHING -----
  wrap.querySelectorAll(".pk-tab[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const id = tab.dataset.tab;
      wrap.querySelectorAll(".pk-tab[data-tab]").forEach((t) =>
        t.setAttribute("aria-selected", String(t.dataset.tab === id)));
      wrap.querySelectorAll(".ctf-tab-panel").forEach((p) => {
        p.style.display = p.dataset.panel === id ? "block" : "none";
      });
    });
  });

  // ----- COPY BUTTONS -----
  wrap.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = wrap.querySelector(btn.dataset.copy);
      if (target) {
        navigator.clipboard.writeText(target.value).then(() => {
          toast("Copied", "success", 1200);
        });
      }
    });
  });

  // ----- MULTI-TRANSLATOR -----
  const mtInput = wrap.querySelector("#mt-input");
  const mtB64 = wrap.querySelector("#mt-b64");
  const mtHex = wrap.querySelector("#mt-hex");
  const mtBin = wrap.querySelector("#mt-bin");
  const mtUrl = wrap.querySelector("#mt-url");

  function renderAll(bytes) {
    mtB64.value = bytesToBase64(bytes);
    mtHex.value = bytesToHex(bytes);
    mtBin.value = bytesToBin(bytes);
    mtUrl.value = encodeURIComponent(bytesToStr(bytes));
  }

  let renderTimer;
  mtInput.addEventListener("input", () => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      try {
        renderAll(strToBytes(mtInput.value));
      } catch (e) {
        // Silent — render on valid input
      }
    }, 150);
  });

  // Decode buttons
  wrap.querySelectorAll("[data-dec]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = mtInput.value.trim();
      if (!v) { toast("Paste input first", "error"); return; }
      try {
        let bytes;
        switch (btn.dataset.dec) {
          case "base64": bytes = base64ToBytes(v); break;
          case "hex": bytes = hexToBytes(v); break;
          case "binary": bytes = binToBytes(v); break;
          case "ascii": bytes = asciiToBytes(v); break;
          case "url": bytes = strToBytes(decodeURIComponent(v)); break;
          default: return;
        }
        mtInput.value = bytesToStr(bytes);
        renderAll(bytes);
        toast(`Decoded as ${btn.dataset.dec}`, "success", 1500);
        markDone();
      } catch (e) {
        toast("Decode failed: " + e.message, "error");
      }
    });
  });

  wrap.querySelector("#mt-clear").addEventListener("click", () => {
    mtInput.value = "";
    mtB64.value = mtHex.value = mtBin.value = mtUrl.value = "";
  });

  // Initial render with sample
  mtInput.value = "Hello, Prodigy Kit!";
  renderAll(strToBytes(mtInput.value));

  // ----- JWT DECODER -----
  const jwtInput = wrap.querySelector("#jwt-input");
  wrap.querySelector("#jwt-decode").addEventListener("click", () => {
    const token = jwtInput.value.trim();
    if (!token) { toast("Paste a JWT first", "error"); return; }
    try {
      const decoded = decodeJwt(token);
      wrap.querySelector("#jwt-header-json").textContent = JSON.stringify(decoded.header, null, 2);
      wrap.querySelector("#jwt-header-alg").textContent = decoded.header.alg ? `alg=${decoded.header.alg}` : "";
      wrap.querySelector("#jwt-payload-json").textContent = JSON.stringify(decoded.payload, null, 2);
      // Check exp
      if (decoded.payload.exp) {
        const expDate = new Date(decoded.payload.exp * 1000);
        const expired = expDate < new Date();
        wrap.querySelector("#jwt-exp").textContent = expired
          ? `❌ expired ${expDate.toISOString()}`
          : `valid until ${expDate.toISOString()}`;
      }
      wrap.querySelector("#jwt-sig").textContent = decoded.signature || "(none — unsecured JWT)";
      wrap.querySelector("#jwt-result").style.display = "block";
      toast("JWT decoded", "success");
      markDone();
    } catch (e) {
      toast("Decode failed: " + e.message, "error");
    }
  });

  wrap.querySelector("#jwt-clear").addEventListener("click", () => {
    jwtInput.value = "";
    wrap.querySelector("#jwt-result").style.display = "none";
  });

  // ----- HASH GENERATORS -----
  const hashInput = wrap.querySelector("#hash-input");
  const hashHmac = wrap.querySelector("#hash-hmac");
  const hashSecret = wrap.querySelector("#hash-secret");
  hashHmac.addEventListener("change", () => {
    hashSecret.disabled = !hashHmac.checked;
  });

  wrap.querySelector("#hash-go").addEventListener("click", () => {
    const input = hashInput.value;
    if (!input) { toast("Enter text to hash", "error"); return; }
    const useHmac = hashHmac.checked;
    const secret = hashSecret.value;
    if (useHmac && !secret) { toast("Enter an HMAC secret", "error"); return; }

    const algos = [
      { name: "MD5", fn: (s) => (useHmac ? CryptoJS.HmacMD5(s, secret) : CryptoJS.MD5(s)).toString() },
      { name: "SHA-1", fn: (s) => (useHmac ? CryptoJS.HmacSHA1(s, secret) : CryptoJS.SHA1(s)).toString() },
      { name: "SHA-256", fn: (s) => (useHmac ? CryptoJS.HmacSHA256(s, secret) : CryptoJS.SHA256(s)).toString() },
      { name: "SHA-512", fn: (s) => (useHmac ? CryptoJS.HmacSHA512(s, secret) : CryptoJS.SHA512(s)).toString() },
      { name: "SHA-224", fn: (s) => (useHmac ? CryptoJS.HmacSHA224(s, secret) : CryptoJS.SHA224(s)).toString() },
      { name: "SHA-384", fn: (s) => (useHmac ? CryptoJS.HmacSHA384(s, secret) : CryptoJS.SHA384(s)).toString() },
      { name: "SHA-3 (256)", fn: (s) => (useHmac ? CryptoJS.HmacSHA3(s, secret, { outputLength: 256 }) : CryptoJS.SHA3(s, { outputLength: 256 })).toString() },
      { name: "RIPEMD-160", fn: (s) => (useHmac ? CryptoJS.HmacRIPEMD160(s, secret) : CryptoJS.RIPEMD160(s)).toString() },
    ];

    const results = algos.map((a) => ({
      name: a.name,
      hash: a.fn(input),
    }));

    const resultsEl = wrap.querySelector("#hash-results");
    resultsEl.innerHTML = "";
    resultsEl.style.display = "block";
    results.forEach((r) => {
      const card = el("div", { class: "pk-card pk-card--pad-sm pk-mb-2" });
      card.innerHTML = `
        <div class="pk-flex pk-text-xs pk-text-muted pk-mb-2" style="justify-content:space-between;align-items:center">
          <span class="pk-text-mono" style="color:var(--pk-fg-strong)">${r.name}</span>
          <span class="pk-text-mono">${r.hash.length} chars</span>
        </div>
        <code class="pk-text-mono pk-text-xs" style="word-break:break-all;display:block;color:var(--pk-fg)">${r.hash}</code>
        <button class="pk-btn pk-btn--ghost pk-text-xs pk-mt-2" data-copy-hash="${r.hash}">📋 Copy</button>
      `;
      resultsEl.appendChild(card);
    });

    // Wire copy buttons
    resultsEl.querySelectorAll("[data-copy-hash]").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(btn.dataset.copyHash).then(() => {
          toast("Hash copied", "success", 1200);
        });
      });
    });

    toast(`Generated ${results.length} hashes`, "success");
    markDone();
  });

  // Info card
  const info = el("div", { class: "pk-card pk-mt-4" });
  info.innerHTML = `
    <h3 style="font-size:0.95rem;margin-bottom:0.5rem">All offline. Nothing leaves your browser.</h3>
    <p class="pk-text-sm pk-text-muted pk-mb-2">
      Pasting tokens into random "JWT decoder" websites is a known way to leak API credentials —
      many of these sites log every token pasted. This tool runs entirely in your browser using
      <code class="pk-text-mono">crypto-js</code> and the browser's native APIs.
    </p>
    <p class="pk-text-sm pk-text-muted">
      <strong>Multi-Translator</strong> shows all encodings (Base64, Hex, Binary, URL) at once —
      paste encoded text, click "Decode as …" to convert it to plain text. <strong>JWT Decoder</strong>
      extracts header, payload, and signature without any server calls. <strong>Hash Generators</strong>
      produce MD5, SHA-1, SHA-2 family, SHA-3, RIPEMD-160 — with optional HMAC.
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
  const container = document.getElementById("day9-mount");
  if (container && typeof renderTool === "function") {
    renderTool(container, {
      toast,
      markDone: () => markDone("day9-cryptokit"),
    });
  }

  // Refresh Lucide icons
  if (window.lucide) window.lucide.createIcons();
  else window.addEventListener("load", () => window.lucide && window.lucide.createIcons());

  console.log("Day 9 — Crypto Kit loaded.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
