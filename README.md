# Prodigy Kit

**10 days. 10 tools. Zero backend. Daily reveal series.**

A 10-day daily-release toolkit of in-browser utilities — PDF manipulation, image compression, EXIF scrubbing, encrypted vaults, QR codes, AI background removal, Markdown → PDF, link tracking stripping, crypto utilities, and media extraction. Everything runs in your browser, nothing is uploaded, no tracking.

## Daily Reveal Workflow

This project is structured as a **10-day daily release series**:

- **Day 1 (Oct 12, Monday):** PDF Toolkit goes live — **LIVE**
- **Day 2 (Oct 13, Tuesday):** Image Compressor revealed — **LIVE**
- **Day 3 (Oct 14, Wednesday):** EXIF Scrubber revealed
- …through Day 10

### How to reveal a new day

Each day's folder is **fully standalone** — own HTML, own CSS, own JS. To reveal a future day:

```bash
# Copy the day's folder from _source/ to tools/ (example: Day 3)
cp -r _source/day3-exif tools/

# Deploy to Netlify (or your static host)
# The dashboard auto-detects the new folder and flips its card to LIVE
```

**No config edits needed.** The dashboard probes each day's folder via `fetch HEAD` on every page load. If the folder exists (200 OK), the card shows **LIVE** with a glowing border and clickable link. If 404, the card shows **🔒 LOCKED** and clicking it displays a "unlocks on its reveal day" toast.

## Architecture

```text
prodigy-kit/                  ← Deploy this folder to Netlify
├── index.html                # Central Bento Dashboard
├── credits.html              # R Dinesh + libraries + sarcastic copy
├── README.md
├── assets/                   # Shared dashboard assets (NOT used by day folders)
│   ├── styles/
│   │   ├── tokens.css         # Theme tokens (pro / arcade / pookie)
│   │   ├── base.css           # Reset, typography, aurora background
│   │   └── shell.css          # Bento cards, glass, top bar, command palette
│   ├── lib/
│   │   ├── store.js           # State manager (theme, progress, onboarding)
│   │   └── tools.js           # Tool metadata (10 days, hrefs for probing)
│   └── app.js                # Dashboard logic (folder probe, theme, cmdk)
├── tools/
│   ├── day1-pdf/             # Day 1 — LIVE
│   │   ├── index.html        # Standalone HTML (references ./style.css + ./app.js)
│   │   ├── style.css         # Full CSS stack + tool-specific styles
│   │   └── app.js            # Full JS stack + tool logic
│   └── day2-compressor/      # Day 2 — LIVE
│       ├── index.html
│       ├── style.css
│       └── app.js
└── _source/                  ← Source copies for upcoming days (NOT deployed)
    ├── day2-compressor/      # Day 2 source copy; published version is in tools/
    │   ├── index.html
    │   ├── style.css
    │   └── app.js
    ├── day3-exif/
    ├── day4-vault/
    ├── day5-qr/
    ├── day6-bgremover/
    ├── day7-markdown/
    ├── day8-linkxray/
    ├── day9-cryptokit/
    └── day10-media/
```

### Why each day is fully standalone

Each day folder's `style.css` includes the **entire** CSS stack (theme tokens + base + shell + tool-specific) and `app.js` includes the **entire** JS stack (store + theme switching + tool logic). This means:

- ✅ Editing Day 3's CSS doesn't affect any other day
- ✅ Each day folder works as a 100% self-contained website
- ✅ You can deploy just one day's folder without touching the rest
- ⚠️ Cost: theme tokens are duplicated 10× (updating a theme color means editing all 10 `style.css` files, or just the shared `assets/styles/tokens.css` for the dashboard)

## Tech Stack

**Pure HTML / CSS / JavaScript (ES Modules)** — no React, no TypeScript, no build step, no bundler, no `npm install`.

- **HTML5** — semantic markup in `index.html` files
- **CSS3** — hand-written design tokens (no preprocessor, no Tailwind)
- **Vanilla JavaScript** — ES modules with dynamic `import()` for lazy-loading
- **State management** — tiny custom pub/sub store (~80 lines, no framework)
- **Icons** — Lucide Icons (auto-injected via `lucide.createIcons()`)
- **Brand font** — Pacifico (script font for "Prodigy Kit" wordmark in Pro/Pookie); Press Start 2P in Arcade
- **Libraries** — loaded as ES modules from `esm.sh` CDN at runtime

## Themes

Three modes switchable from the top-right (persisted in `localStorage`):

- **💼 Pro Mode** (default) — Cyber-indigo dark + electric cyan accents. Inter for body, Pacifico for brand. Logo icon: `gem`.
- **🕹️ Arcade Mode** — Pure black + CRT scanlines + neon magenta/cyan glow. Press Start 2P + JetBrains Mono. Logo icon: `trophy`.
- **🎀 Pookie Mode** — Soft cream/pink/lavender pastel + rounded blobs. Quicksand + Nunito, Pacifico for brand. Logo icon: `sparkles`.

The logo mark icon swaps dynamically based on the active theme — each theme has its own unique visual identity.

## How to Run

### Dashboard + Day 1 and Day 2

```bash
cd prodigy-kit
python3 -m http.server 8000
# Visit http://localhost:8000
```

Day 1 and Day 2 are now in `tools/` and ready to test locally:

- Dashboard: `http://localhost:8000/`
- Day 1 — PDF Toolkit: `http://localhost:8000/tools/day1-pdf/`
- Day 2 — Image Compressor: `http://localhost:8000/tools/day2-compressor/`

### To reveal Day 3 (Oct 14)

```bash
cp -r _source/day3-exif tools/
# Refresh the dashboard — Day 3 should flip to LIVE automatically
```

## Deploy to Netlify

Drop the `prodigy-kit/` folder into Netlify. Add this `_headers` file for Day 10's ffmpeg.wasm to work (other days don't need it):

```text
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
```

## The 10 Days

| Day | Tool | Status | Library |
|-----|------|--------|---------|
| 1 | PDF Toolkit | ✅ LIVE | pdf-lib |
| 2 | Image Compressor | ✅ LIVE | Canvas API |
| 3 | EXIF Scrubber | 🔒 in `_source/` | ExifReader |
| 4 | Snippet Vault | 🔒 in `_source/` | Web Crypto API |
| 5 | QR Studio | 🔒 in `_source/` | qrcode |
| 6 | Background Remover | 🔒 in `_source/` | @imgly/background-removal |
| 7 | Markdown → PDF | 🔒 in `_source/` | marked + html2pdf |
| 8 | Link X-Ray | 🔒 in `_source/` | URL API |
| 9 | Crypto Kit | 🔒 in `_source/` | CryptoJS |
| 10 | Media Extractor | 🔒 in `_source/` | ffmpeg.wasm |

## Credits

Built & vibe-coded by **R Dinesh** — Cyber Security Student, Chief Vibe-Coder & Occasional Bug Generator. See [`credits.html`](./credits.html) for the full library list, sarcastic "Anti-Credits", and the Zero-Trust Guarantee.

> "Built out of pure frustration because dodging 15 fake green 'Download' buttons just to merge a college assignment should be illegal."

## License

MIT — fork it, learn from it, ship it as your own.
