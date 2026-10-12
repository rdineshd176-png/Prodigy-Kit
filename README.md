# 🛠️ Prodigy Kit

**10 days. 10 tools. Zero backend. Zero sketchy ads.**

> *"Built out of pure frustration because dodging 15 fake green 'Download' buttons just to merge a college assignment should be illegal."*

Every "free" online converter you have ever googled is a minefield of pop-up ads, fake download buttons, "7-day free trial" traps, and questionable servers that hold your files hostage (and probably sell your data). **Prodigy Kit** is a 10-day daily-reveal suite of in-browser utilities—covering PDF manipulation, strict-size image compression, EXIF metadata scrubbing, encrypted snippet vaults, non-expiring QR codes, AI background removal, Markdown-to-PDF formatting, link tracker stripping, CTF/crypto utilities, and local media extraction.

Everything runs **100% locally in your browser's CPU and RAM**. Nothing is uploaded, nothing touches a backend database, and there are zero tracking scripts. Don't take my word for it—open `Inspect → Network` and watch the silence.

---

## 📅 The 10-Day Utility Sprint

One new tool unlocks on the central Bento dashboard every single day:

| Day | Tool | The Annoying Problem It Fixes | Engine / Library | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Day 1** | **PDF Toolkit** | Merging lab reports, splitting page ranges, and converting note photos to PDF without uploading sensitive docs. | `pdf-lib` & `PDF.js` | ✅ **LIVE** |
| **Day 2** | **Image Compressor** | Hitting strict KB targets via binary search for college/government portals that still demand photos between 20KB and 50KB. | `HTML5 Canvas API` | 🔒 Unlocking Day 2 |
| **Day 3** | **EXIF Scrubber** | Inspecting and wiping hidden GPS coordinates, device serials, and timestamps before sharing photos online. | `ExifReader` | 🔒 Unlocking Day 3 |
| **Day 4** | **Snippet Vault** | Sharing sensitive text or keys via client-side AES-GCM + PBKDF2 encryption without storing secrets on a server. | `Web Crypto API` | 🔒 Unlocking Day 4 |
| **Day 5** | **QR Studio** | Generating forever-working QR codes without the "7-day free trial" hostage trap. | `qrcode.js` | 🔒 Unlocking Day 5 |
| **Day 6** | **Background Remover** | Running in-browser AI cutouts via WebAssembly with zero watermarks or credit paywalls. | `@imgly/background-removal` | 🔒 Unlocking Day 6 |
| **Day 7** | **Markdown → PDF** | Live Markdown preview and clean PDF export so you never have to fight document margins at 2 AM. | `marked.js` & `html2pdf.js` | 🔒 Unlocking Day 7 |
| **Day 8** | **Link X-Ray** | Stripping creepy tracking parameters and inspecting URLs before you click them. | `URL API` | 🔒 Unlocking Day 8 |
| **Day 9** | **Crypto Kit** | A single-screen Dev & CTF workbench for hashing, encoding, and crypto operations. | `CryptoJS` | 🔒 Unlocking Day 9 |
| **Day 10** | **Media Extractor** | Local audio extraction and video trimming directly in browser RAM. | `FFmpeg.wasm` | 🔒 Unlocking Day 10 |

---

## 🎨 Tri-Theme Engine

Switch vibes instantly from the top-right toggle (persisted across all tools via `localStorage`):

* **💼 Pro Mode (Default):** Deep cyber-indigo dark palette with electric cyan accents, `Inter` typography, `Pacifico` brand script, and a `gem` logo mark.
* **🕹️ Arcade Mode:** Pure black CRT scanlines, 8-bit neon magenta/cyan glow, `Press Start 2P` + `JetBrains Mono` fonts, and a `trophy` logo mark.
* **🎀 Pookie Mode:** Soft pastel cream, pink, and lavender frosted glass cards, rounded `Quicksand` + `Nunito` fonts, and a `sparkles` logo mark.

---

## 🧰 The Zero-Bloat Tech Stack

Built on the raw web platform—no React, no TypeScript, no Tailwind, no bundler, no build step, and no 500MB `node_modules` black hole:

* **Pure HTML5, CSS3 Variables & Vanilla JavaScript (ES Modules):** Semantic markup, hand-crafted design tokens, and dynamic `import()` for lazy-loading.
* **80-Line Custom Pub/Sub Store:** Lightweight reactive state management handling themes, tool completion badges, toast alerts, and `⌘K` command palette navigation without a framework.
* **CDN Runtime Engines (`esm.sh` & `unpkg`):** Heavy-lifting open-source libraries (`pdf-lib`, `ExifReader`, `@imgly/background-removal`, `FFmpeg.wasm`, `CryptoJS`, and `Lucide Icons`) streamed straight to the browser as ES modules.
* **Netlify + Your Device's CPU / RAM:** Netlify serves the static files at the edge while your own hardware does 100% of the actual file processing locally.

---

## 🏗️ Architecture

```text
prodigy-kit/
├── index.html                # Central Bento Dashboard + ⌘K Command Palette
├── credits.html              # Builder identity, open-source engines & anti-credits
├── assets/                   # Shared dashboard shell
│   ├── styles/
│   │   ├── tokens.css        # Design tokens (pro / arcade / pookie)
│   │   ├── base.css          # Reset, typography, drifting aurora background
│   │   └── shell.css         # Bento grid, glass cards, top bar, command palette
│   ├── lib/
│   │   ├── store.js          # Pub/sub state manager (theme, progress, toasts)
│   │   └── tools.js          # Tool metadata (10 days, categories, routes)
│   └── app.js                # Dashboard logic (auto-probe, theme sync, ⌘K search)
└── tools/
    ├── day1-pdf/             # Standalone Day 1 utility
    │   ├── index.html        # Self-contained tool markup
    │   ├── style.css         # Complete CSS stack + tool-specific styles
    │   └── app.js            # Complete store + theme sync + pdf-lib logic
    └── ...                   # Days 2–10 unlock daily
```

### Zero-Config Daily Unlocks & Standalone Design
* **Auto-Probing Dashboard:** On every load, the dashboard probes each tool's folder via `fetch HEAD`. If a day's folder exists (`200 OK`), its Bento card automatically lights up as **LIVE**. If it returns `404`, the card stays **🔒 LOCKED**.
* **100% Self-Contained Tools:** Each day's directory includes its own complete CSS and JS stack. Tweaking Day 3's styles will never accidentally break Day 1, and any single tool folder can be hosted as an independent mini-site.

---

## 🚀 How to Run & Deploy

### Run Locally
```bash
git clone [https://github.com/rdineshd176-png/Prodigy-Kit.git](https://github.com/rdineshd176-png/Prodigy-Kit.git)
cd Prodigy-Kit
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

### Deploy to Netlify
Drop the project folder into Netlify (or connect your GitHub repo). For Day 10's `ffmpeg.wasm` (`SharedArrayBuffer`) to run smoothly, include a `_headers` file in the root directory:

```text
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
```

---

## 🏆 Credits & Sarcastic "Special Thanks"

**Created & Vibe-Coded By:**
* **R Dinesh** — *Cyber Security Student · Chief Vibe-Coder · Occasional Bug Generator*
* [GitHub](https://github.com/rdineshd176-png) · [LinkedIn](https://www.linkedin.com/in/dinesh-r-cybersec/) · [Full Credits Page](./credits.html)

**The Anti-Credits (Inspiration):**
> *Special thanks to sketchy free converter websites with pop-up ads, "free" QR generators that hold your link hostage after 7 days, and government/college portals that still demand photos between 20KB and 50KB. You are the villains this toolkit was built to defeat.*

## 📄 License

MIT — fork it, learn from it, ship it as your own.
