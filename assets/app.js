// =========================================================================
// Prodigy Kit — Dashboard App Module
// Handles: theme switching (with theme-based logo icon), command palette,
// onboarding, bento grid rendering with FOLDER PROBE for live/locked status
// =========================================================================

import { TOOLS, CATEGORY_LABELS, accentVar } from "./lib/tools.js";
import {
  hydrate,
  getState,
  subscribe,
  setTheme,
  setOnboarded,
  isDone,
  toast,
} from "./lib/store.js";

// Theme-based unique icons for the logo mark
const LOGO_ICONS = {
  pro: "gem",
  arcade: "trophy",
  pookie: "sparkles",
};

// ---------- Lucide icon initialization ----------
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

// ---------- Theme application ----------
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
  refreshIcons();
}

// ---------- Folder probe: detect which days are deployed ----------
async function probeDay(href) {
  try {
    const r = await fetch(href, { method: "HEAD", cache: "no-cache" });
    return r.ok;
  } catch {
    return false;
  }
}

async function probeAllDays() {
  const results = {};
  await Promise.all(
    TOOLS.map(async (tool) => {
      if (tool.status === "live") {
        results[tool.id] = await probeDay(tool.href);
      } else {
        results[tool.id] = false;
      }
    })
  );
  return results;
}

// ---------- Bento grid rendering ----------
function renderBentoGrid(probeResults = {}) {
  const grid = document.getElementById("bento-grid");
  if (!grid) return;

  grid.innerHTML = "";
  TOOLS.forEach((tool) => {
    const isLive = probeResults[tool.id] === true;
    const card = document.createElement(isLive ? "a" : "button");
    card.className = "pk-bento__card";
    if (isLive) {
      card.classList.add("pk-bento__card--live", "pk-bento__card--featured", "pk-card--interactive");
      card.href = tool.href;
    } else {
      card.classList.add("pk-bento__card--locked");
      card.type = "button";
    }
    card.dataset.toolId = tool.id;
    card.style.setProperty("--pk-accent", accentVar(tool.accent));
    card.setAttribute("aria-label", `${isLive ? "Open" : "Locked"}: ${tool.title}`);

    const done = isDone(tool.id);
    const statusBadge = isLive
      ? `<span class="pk-bento__status pk-bento__status--live">
           <i data-lucide="circle-dot"></i> LIVE
         </span>`
      : `<span class="pk-bento__status pk-bento__status--locked">
           <i data-lucide="lock"></i> LOCKED
         </span>`;

    card.innerHTML = `
      ${done ? `<span class="pk-progress-badge" title="Completed">✓</span>` : ""}
      <div class="pk-bento__header">
        <div class="pk-bento__icon">
          <i data-lucide="${tool.icon}"></i>
        </div>
        <span class="pk-bento__day">Day ${tool.day}</span>
      </div>
      <h3 class="pk-bento__title">${tool.title}</h3>
      <p class="pk-bento__desc">${tool.description}</p>
      <div class="pk-bento__footer">
        <span class="pk-bento__cat">${CATEGORY_LABELS[tool.category]}</span>
        ${statusBadge}
      </div>
    `;

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    });

    if (!isLive) {
      card.addEventListener("click", (e) => {
        e.preventDefault();
        toast(`🔒 Day ${tool.day}: ${tool.title} unlocks on its reveal day.`, "info", 3000);
      });
    }

    grid.appendChild(card);
  });

  refreshIcons();
}

// ---------- Bottom nav rendering (mobile) ----------
function renderBottomNav(probeResults = {}) {
  const scroll = document.getElementById("bottomnav-scroll");
  if (!scroll) return;

  scroll.innerHTML = "";
  TOOLS.forEach((tool) => {
    const isLive = probeResults[tool.id] === true;
    const btn = document.createElement(isLive ? "a" : "button");
    btn.className = "pk-bottomnav__btn";
    btn.dataset.toolId = tool.id;
    btn.setAttribute("aria-label", `Day ${tool.day}: ${tool.title}`);
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = tool.day;
    btn.title = `${tool.title} — ${tool.short}`;
    if (isLive) {
      btn.href = tool.href;
    } else {
      btn.type = "button";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        toast(`🔒 Day ${tool.day} unlocks on its reveal day.`, "info", 2500);
      });
    }
    scroll.appendChild(btn);
  });
}

// ---------- Command palette ----------
const cmdkState = {
  open: false,
  filtered: [],
  activeIdx: 0,
  query: "",
  probeResults: {},
};

function openCmdk() {
  const overlay = document.getElementById("cmdk-overlay");
  if (!overlay) return;
  cmdkState.open = true;
  overlay.setAttribute("data-open", "true");
  cmdkState.query = "";
  cmdkState.activeIdx = 0;
  const input = document.getElementById("cmdk-input");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 50);
  }
  filterCmdk("");
}

function closeCmdk() {
  const overlay = document.getElementById("cmdk-overlay");
  if (!overlay) return;
  cmdkState.open = false;
  overlay.setAttribute("data-open", "false");
}

function filterCmdk(query) {
  cmdkState.query = query.toLowerCase().trim();
  cmdkState.filtered = TOOLS.filter((item) => {
    if (!cmdkState.query) return true;
    return (
      item.title.toLowerCase().includes(cmdkState.query) ||
      item.short.toLowerCase().includes(cmdkState.query) ||
      item.description.toLowerCase().includes(cmdkState.query) ||
      String(item.day) === cmdkState.query ||
      String(item.day).padStart(2, "0") === cmdkState.query
    );
  });
  cmdkState.activeIdx = 0;
  renderCmdkList();
}

function renderCmdkList() {
  const list = document.getElementById("cmdk-list");
  if (!list) return;

  if (cmdkState.filtered.length === 0) {
    list.innerHTML = `<div class="pk-cmdk-empty">No tools match "${cmdkState.query}".</div>`;
    return;
  }

  list.innerHTML = "";
  cmdkState.filtered.forEach((item, idx) => {
    const isLive = cmdkState.probeResults[item.id] === true;
    const el = document.createElement("button");
    el.className = "pk-cmdk-item";
    el.setAttribute("role", "option");
    el.setAttribute("data-active", String(idx === cmdkState.activeIdx));
    el.style.setProperty("--pk-accent", accentVar(item.accent));
    el.innerHTML = `
      <span class="pk-cmdk-item__icon"><i data-lucide="${item.icon}"></i></span>
      <span class="pk-cmdk-item__body">
        <div class="pk-cmdk-item__title">${item.title}</div>
        <div class="pk-cmdk-item__desc">${isLive ? item.short : "🔒 Locked — unlocks on reveal day"}</div>
      </span>
      <span class="pk-cmdk-item__day">${isLive ? `Day ${item.day}` : "🔒"}</span>
    `;
    el.addEventListener("click", () => {
      closeCmdk();
      openTool(item, isLive);
    });
    list.appendChild(el);
  });
  refreshIcons();
}

function openTool(tool, isLive) {
  if (isLive && tool.href) {
    window.location.href = tool.href;
  } else {
    toast(`🔒 Day ${tool.day}: ${tool.title} unlocks on its reveal day.`, "info", 3000);
  }
}

// ---------- Onboarding banner ----------
function showOnboarding() {
  const banner = document.getElementById("onboarding-banner");
  if (!banner) return;
  const state = getState();
  banner.style.display = state.onboarded ? "none" : "flex";
}

// ---------- Event wiring ----------
function wireEvents() {
  document.querySelectorAll(".pk-themeswitch__btn").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(btn.dataset.theme));
  });

  document.querySelector('[data-action="dismiss-onboarding"]')?.addEventListener("click", () => {
    setOnboarded(true);
    showOnboarding();
  });

  document.querySelector('[data-action="reset-progress"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Reset all progress badges? This cannot be undone.")) {
      localStorage.removeItem("prodigy_kit_progress");
      location.reload();
    }
  });

  document.querySelectorAll('[data-action="open-cmdk"]').forEach((btn) => {
    btn.addEventListener("click", () => openCmdk());
  });

  const cmdkInput = document.getElementById("cmdk-input");
  if (cmdkInput) {
    cmdkInput.addEventListener("input", (e) => filterCmdk(e.target.value));
    cmdkInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        cmdkState.activeIdx = (cmdkState.activeIdx + 1) % cmdkState.filtered.length;
        renderCmdkList();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        cmdkState.activeIdx = (cmdkState.activeIdx - 1 + cmdkState.filtered.length) % cmdkState.filtered.length;
        renderCmdkList();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = cmdkState.filtered[cmdkState.activeIdx];
        if (item) {
          closeCmdk();
          openTool(item, cmdkState.probeResults[item.id] === true);
        }
      } else if (e.key === "Escape") {
        closeCmdk();
      }
    });
  }

  const cmdkOverlay = document.getElementById("cmdk-overlay");
  if (cmdkOverlay) {
    cmdkOverlay.addEventListener("click", (e) => {
      if (e.target === cmdkOverlay) closeCmdk();
    });
  }

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (cmdkState.open) closeCmdk();
      else openCmdk();
    }
    if (e.key === "Escape" && cmdkState.open) closeCmdk();
    if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
      e.preventDefault();
      openCmdk();
    }
  });
}

// ---------- Init ----------
async function init() {
  hydrate();
  applyTheme(getState().theme);
  showOnboarding();

  // Render initial grid (all locked) before probing
  renderBentoGrid({});
  renderBottomNav({});
  wireEvents();

  // Subscribe to store changes
  subscribe("theme", (state) => {
    applyTheme(state.theme);
    renderBentoGrid(cmdkState.probeResults);
    renderBottomNav(cmdkState.probeResults);
  });
  subscribe("progress", () => renderBentoGrid(cmdkState.probeResults));
  subscribe("onboarded", () => showOnboarding());

  // Probe all days for live/locked status
  const probeResults = await probeAllDays();
  cmdkState.probeResults = probeResults;
  renderBentoGrid(probeResults);
  renderBottomNav(probeResults);
  filterCmdk("");

  // Lucide loads via defer, so wait for it
  if (window.lucide) {
    refreshIcons();
  } else {
    window.addEventListener("load", refreshIcons);
  }

  const liveCount = Object.values(probeResults).filter(Boolean).length;
  console.log(`Prodigy Kit loaded. ${liveCount}/10 tools live. Press ⌘K to search.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
