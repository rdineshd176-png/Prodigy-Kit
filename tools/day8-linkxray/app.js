// =========================================================================
// Day 8 — Sketchy Link X-Ray & Tracker Stripper
// Strips utm_*, fbclid, gclid, igsh, etc. via URL API
// Detects shortened URLs, Punycode/homograph domains — fully client-side
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

const TRACKER_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "utm_name", "utm_referrer", "utm_brand", "utm_creative", "utm_format",
  "fbclid", "gclid", "gclsrc", "dclid", "msclkid", "yclid",
  "igshid", "igsh",
  "mc_cid", "mc_eid", "_hsenc", "_hsmi", "hsCtaTracking",
  "vero_id", "vero_conv",
  "wt_zmc", "wt_mc",
  "wickedid", "oly_enc_id", "oly_anon_id",
  "ref", "ref_src", "referrer", "source",
  "_ga", "gad_source", "srsltid",
  "spm", "share_source", "share_token", "share_session_id",
  "scrape_id", "tracking_source",
  "aoi", "oni", "si",
];

const SHORTENER_DOMAINS = new Set([
  "bit.ly", "bitly.com", "t.co", "tinyurl.com", "ow.ly", "is.gd",
  "buff.ly", "adf.ly", "shorte.st", "soo.gd", "tiny.cc", "lnkd.in",
  "rebrand.ly", "cutt.ly", "shorturl.at", "s.id", "rb.gy", "lnk.to",
  "snip.ly", "q.gs", "x.co", "short.link", "v.gd", "tr.im", "x.gd",
]);

function looksPunycode(hostname) {
  // xn-- prefix means internationalized domain name (IDN) — could be homograph attack
  return hostname.split(".").some((part) => part.startsWith("xn--"));
}

function hasMixedScripts(hostname) {
  // Check if hostname has mixed Latin + Cyrillic/Greek characters (homograph attack)
  const parts = hostname.split(".");
  for (const p of parts) {
    const cyrillic = /[\u0400-\u04FF]/.test(p);
    const greek = /[\u0370-\u03FF]/.test(p);
    const latin = /[a-z]/i.test(p);
    if ((latin && cyrillic) || (latin && greek)) return true;
  }
  return false;
}

export function mount(container, { toast, markDone }) {
  container.innerHTML = "";
  const wrap = el("div");

  wrap.innerHTML = `
    <div class="pk-card">
      <label class="pk-text-xs pk-text-muted pk-mb-2" style="display:block">Paste any link here</label>
      <textarea id="lx-input" rows="3" placeholder="https://example.com/?utm_source=newsletter&fbclid=IwAR0x…&utm_campaign=launch" style="width:100%;font-family:var(--pk-font-mono);font-size:0.825rem;resize:vertical;margin-bottom:0.75rem" spellcheck="false"></textarea>

      <div class="pk-flex pk-gap-2" style="flex-wrap:wrap">
        <button class="pk-btn pk-btn--primary" id="lx-analyze">🔍 Analyze & Strip</button>
        <button class="pk-btn" id="lx-clear">Clear</button>
      </div>
    </div>

    <div id="lx-results" style="display:none;margin-top:1rem">
      <!-- Cleaned URL -->
      <div class="pk-card pk-mb-3">
        <div class="pk-flex pk-text-xs pk-text-muted pk-mb-2" style="justify-content:space-between;align-items:center">
          <span>CLEANED URL</span>
          <span class="pk-text-mono" id="lx-stripped-count"></span>
        </div>
        <textarea id="lx-clean" rows="2" readonly style="width:100%;font-family:var(--pk-font-mono);font-size:0.8rem;background:rgba(16,185,129,0.05);border-color:rgba(16,185,129,0.4);color:var(--pk-fg);resize:vertical"></textarea>
        <div class="pk-flex pk-gap-2 pk-mt-2">
          <button class="pk-btn pk-btn--primary" id="lx-copy" style="flex:1">📋 Copy clean URL</button>
          <button class="pk-btn" id="lx-open" style="flex:1">↗ Open in new tab</button>
        </div>
      </div>

      <!-- Warnings -->
      <div id="lx-warnings"></div>

      <!-- URL anatomy -->
      <div class="pk-card pk-mb-3">
        <h3 style="font-size:0.95rem;margin-bottom:0.75rem">URL Anatomy</h3>
        <div id="lx-anatomy"></div>
      </div>

      <!-- Stripped parameters -->
      <div class="pk-card" id="lx-stripped-card" style="display:none">
        <h3 style="font-size:0.95rem;margin-bottom:0.75rem">Stripped parameters</h3>
        <div id="lx-stripped-list"></div>
      </div>
    </div>
  `;

  const input = wrap.querySelector("#lx-input");
  const results = wrap.querySelector("#lx-results");
  let strippedCount = 0;

  wrap.querySelector("#lx-analyze").addEventListener("click", () => analyze());
  wrap.querySelector("#lx-clear").addEventListener("click", () => {
    input.value = "";
    results.style.display = "none";
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.metaKey) analyze();
  });

  function analyze() {
    const text = input.value.trim();
    if (!text) {
      toast("Paste a URL first", "error");
      return;
    }

    let url;
    try {
      url = new URL(text);
    } catch {
      toast("Not a valid URL — try adding https://", "error");
      return;
    }

    results.style.display = "block";

    // ---- Strip trackers ----
    const params = url.searchParams;
    const stripped = [];
    TRACKER_PARAMS.forEach((name) => {
      if (params.has(name)) {
        const vals = params.getAll(name);
        stripped.push({ name, values: vals });
        params.delete(name);
      }
    });

    // Also remove empty utm variants
    Array.from(params.keys()).forEach((k) => {
      if (k.startsWith("utm_")) {
        stripped.push({ name: k, values: params.getAll(k) });
        params.delete(k);
      }
    });

    strippedCount = stripped.length;
    const cleanUrl = url.toString();
    wrap.querySelector("#lx-clean").value = cleanUrl;
    wrap.querySelector("#lx-stripped-count").textContent =
      strippedCount === 0 ? "0 trackers stripped" : `${strippedCount} tracker${strippedCount > 1 ? "s" : ""} stripped`;

    // ---- Warnings ----
    const warnings = [];
    const hostname = url.hostname.toLowerCase();

    if (SHORTENER_DOMAINS.has(hostname)) {
      warnings.push({
        level: "warn",
        icon: "⚠️",
        title: "This is a shortened URL",
        detail: `${hostname} is a known URL shortener. The real destination is hidden — this tool can't safely follow redirects without a server, so we recommend not opening it if you don't trust the source.`,
      });
    }
    if (looksPunycode(hostname)) {
      warnings.push({
        level: "danger",
        icon: "🚨",
        title: "Internationalized domain (Punycode)",
        detail: `${hostname} contains <code class="pk-text-mono">xn--</code> parts, which means it uses non-Latin characters that <em>look</em> like Latin ones. This is a common phishing vector (homograph attack). Verify the domain carefully before visiting.`,
      });
    }
    if (hasMixedScripts(hostname)) {
      warnings.push({
        level: "danger",
        icon: "🚨",
        title: "Mixed-script domain detected",
        detail: `${hostname} mixes Latin and Cyrillic/Greek characters. This is almost certainly a phishing attempt to look like a legitimate domain.`,
      });
    }
    if (url.username || url.password) {
      warnings.push({
        level: "warn",
        icon: "⚠️",
        title: "URL contains embedded credentials",
        detail: `This URL embeds a username${url.password ? " and password" : ""} in the format <code class="pk-text-mono">user:pass@host</code>. Don't open this — it's a classic phishing trick to obscure the real hostname.`,
      });
    }
    if (hostname.match(/^\d{1,3}(\.\d{1,3}){3}$/)) {
      warnings.push({
        level: "warn",
        icon: "⚠️",
        title: "IP address instead of domain",
        detail: `This URL points directly to <code class="pk-text-mono">${hostname}</code>, an IP address. Legitimate sites almost never use this; treat as suspicious.`,
      });
    }
    if (url.protocol === "http:") {
      warnings.push({
        level: "warn",
        icon: "⚠️",
        title: "Not HTTPS — insecure",
        detail: `This URL uses <code class="pk-text-mono">http://</code>, which is unencrypted. Anyone on the same network can read or modify your traffic.`,
      });
    }
    if (hostname.split(".").pop() && hostname.split(".").pop().length > 10) {
      // Suspiciously long TLD
      warnings.push({
        level: "info",
        icon: "ℹ️",
        title: "Unusual top-level domain",
        detail: `The TLD <code class="pk-text-mono">.${hostname.split(".").pop()}</code> is uncommon. Verify it's a real domain.`,
      });
    }

    const warningsEl = wrap.querySelector("#lx-warnings");
    if (warnings.length === 0) {
      warningsEl.innerHTML = `
        <div class="pk-card pk-card--pad-sm pk-mb-3" style="border-color:#10b981;background:rgba(16,185,129,0.08)">
          <div class="pk-flex pk-gap-2 pk-text-sm" style="align-items:center">
            <span style="font-size:1.5rem">✅</span>
            <div><strong style="color:#10b981">No threats detected.</strong> The domain looks legit. Always use your own judgment too.</div>
          </div>
        </div>
      `;
    } else {
      warningsEl.innerHTML = warnings.map((w) => {
        const color = w.level === "danger" ? "#ef4444" : w.level === "warn" ? "#f59e0b" : "#1f6feb";
        return `
          <div class="pk-card pk-card--pad-sm pk-mb-2" style="border-color:${color};background:color-mix(in srgb,${color} 8%, transparent)">
            <div class="pk-flex pk-gap-2 pk-text-sm" style="align-items:flex-start">
              <span style="font-size:1.5rem;flex-shrink:0">${w.icon}</span>
              <div>
                <strong style="color:${color}">${w.title}</strong>
                <div class="pk-text-xs pk-text-muted pk-mt-2">${w.detail}</div>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }

    // ---- Anatomy ----
    const anatomy = wrap.querySelector("#lx-anatomy");
    anatomy.innerHTML = `
      <div class="pk-text-sm" style="display:grid;grid-template-columns:auto 1fr;gap:0.5rem 1rem">
        <span class="pk-text-muted pk-text-mono">Protocol</span>
        <span class="pk-text-mono" style="word-break:break-all">${url.protocol}</span>
        <span class="pk-text-muted pk-text-mono">Host</span>
        <span class="pk-text-mono" style="word-break:break-all">${url.host}</span>
        <span class="pk-text-muted pk-text-mono">Path</span>
        <span class="pk-text-mono" style="word-break:break-all">${url.pathname}</span>
        ${url.search ? `
        <span class="pk-text-muted pk-text-mono">Query</span>
        <span class="pk-text-mono" style="word-break:break-all">${url.search}</span>
        ` : ""}
        ${url.hash ? `
        <span class="pk-text-muted pk-text-mono">Fragment</span>
        <span class="pk-text-mono" style="word-break:break-all">${url.hash}</span>
        ` : ""}
      </div>
    `;

    // ---- Stripped list ----
    const strippedList = wrap.querySelector("#lx-stripped-list");
    const strippedCard = wrap.querySelector("#lx-stripped-card");
    if (stripped.length === 0) {
      strippedCard.style.display = "none";
    } else {
      strippedCard.style.display = "block";
      strippedList.innerHTML = stripped.map((s) => `
        <div class="pk-flex pk-text-sm" style="justify-content:space-between;gap:1rem;padding:0.4rem 0;border-bottom:1px solid var(--pk-border)">
          <code class="pk-text-mono pk-text-xs" style="color:var(--pk-fg)">${s.name}</code>
          <code class="pk-text-mono pk-text-xs pk-text-muted" style="text-align:right;word-break:break-all">${s.values.join(", ")}</code>
        </div>
      `).join("");
    }

    markDone();
  }

  // Copy / open
  wrap.querySelector("#lx-copy").addEventListener("click", () => {
    const text = wrap.querySelector("#lx-clean").value;
    navigator.clipboard.writeText(text).then(() => {
      toast("Clean URL copied", "success");
    });
  });

  wrap.querySelector("#lx-open").addEventListener("click", () => {
    const url = wrap.querySelector("#lx-clean").value;
    if (url) window.open(url, "_blank", "noopener");
  });

  // Info card
  const info = el("div", { class: "pk-card pk-mt-4" });
  info.innerHTML = `
    <h3 style="font-size:0.95rem;margin-bottom:0.5rem">What gets stripped</h3>
    <p class="pk-text-sm pk-text-muted pk-mb-3">
      We remove the <strong>40+ most common tracking parameters</strong> — UTM tags, click IDs
      (fbclid, gclid, igshid), email-marketing IDs (mc_cid, _hsenc), and more — without breaking
      legitimate URL parameters like session IDs or pagination.
    </p>
    <p class="pk-text-sm pk-text-muted">
      <strong>Unshortener scope:</strong> truly following a redirect requires a server-side call.
      We detect shortened URLs (bit.ly, t.co, etc.) and warn you, but we don't fake-resolve them —
      that would require a backend, which contradicts the "no servers" promise. For homograph attacks
      (Punycode <code class="pk-text-mono">xn--</code> domains), we flag them on the spot.
    </p>
  `;
  wrap.appendChild(info);

  container.appendChild(wrap);
}
