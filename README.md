<div align="center">

<h1>🛠️ Prodigy Kit</h1>

<p><strong><big>10 days. 10 tools. Zero backend. Zero sketchy ads.</big></strong></p>

<p><big>Prodigy Kit is a daily-reveal suite of in-browser utilities for PDF manipulation, strict-size image compression, EXIF metadata scrubbing, encrypted snippets, QR codes, AI background removal, Markdown-to-PDF conversion, link tracking removal, crypto utilities, and local media extraction.</big></p>

<p><big>Everything runs locally in your browser. Files are not uploaded, no backend database is required, and the project includes no tracking scripts.</big></p>

</div>

## 📅 The 10-Day Utility Sprint

Each utility is a standalone folder under `tools/`. The dashboard detects available tool folders and marks them as live.

| Day | Tool | What it does | Engine / Library | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Day 1** | **PDF Toolkit** | Merge PDFs, split page ranges, and convert images to PDF. | `pdf-lib` & `PDF.js` | ✅ **LIVE** |
| **Day 2** | **Image Compressor** | Compress images to strict KB targets and convert formats. | `HTML5 Canvas API` | ✅ **LIVE** |
| **Day 3** | **EXIF Scrubber** | Inspect and remove hidden GPS, device, and timestamp metadata. | `ExifReader` | ✅ **LIVE** |
| **Day 4** | **Snippet Vault** | Encrypt sensitive text locally with AES-GCM and PBKDF2. | `Web Crypto API` | 🔒 Upcoming |
| **Day 5** | **QR Studio** | Generate static, non-expiring QR codes. | `qrcode.js` | 🔒 Upcoming |
| **Day 6** | **Background Remover** | Remove image backgrounds locally with WebAssembly. | `@imgly/background-removal` | 🔒 Upcoming |
| **Day 7** | **Markdown → PDF** | Preview Markdown and export it as a formatted PDF. | `marked.js` & `html2pdf.js` | 🔒 Upcoming |
| **Day 8** | **Link X-Ray** | Remove tracking parameters and inspect URLs. | `URL API` | 🔒 Upcoming |
| **Day 9** | **Crypto Kit** | Encode, decode, and hash values for development and CTF work. | `CryptoJS` | 🔒 Upcoming |
| **Day 10** | **Media Extractor** | Extract audio and trim media locally in the browser. | `FFmpeg.wasm` | 🔒 Upcoming |

## 🗂️ Project Structure

```text
prodigy-kit/
├── index.html                # Central Bento dashboard
├── credits.html              # Builder identity and library credits
├── README.md
├── assets/                   # Shared dashboard assets
│   ├── styles/
│   │   ├── tokens.css        # Pro, Arcade, and Pookie theme tokens
│   │   ├── base.css          # Reset, typography, and background
│   │   └── shell.css         # Dashboard layout and components
│   ├── lib/
│   │   ├── store.js          # Theme and progress state
│   │   └── tools.js          # Tool metadata and routes
│   └── app.js                # Dashboard logic
└── tools/
    ├── day1-pdf/             # Day 1 — LIVE
    ├── day2-compressor/      # Day 2 — LIVE
    └── day3-exif/            # Day 3 — LIVE
```

## 🧱 Standalone Daily Releases

Each day's folder contains its own HTML, CSS, and JavaScript. A tool can therefore be tested or hosted independently without changing the other days.

To publish a future day, copy its completed folder into `tools/`:

```bash
# Example: publish Day 4 after its folder is ready
cp -r day4-vault tools/
```

Refresh the dashboard after deployment. The new folder will be available at `/tools/day4-vault/`.

## 🎨 Tri-Theme Engine

The dashboard and tools support three themes, persisted with `localStorage`:

- **💼 Pro Mode (default):** Cyber-indigo dark palette with electric cyan accents.
- **🕹️ Arcade Mode:** CRT scanlines with neon magenta and cyan accents.
- **🎀 Pookie Mode:** Soft cream, pink, and lavender pastel styling.

## 🧰 Tech Stack

- Pure HTML5, CSS3, and vanilla JavaScript ES modules
- No React, TypeScript, Tailwind, bundler, or build step
- A small custom pub/sub store for themes, progress, and notifications
- Runtime libraries loaded as ES modules from `esm.sh` and `unpkg`
- Static hosting with Netlify or any compatible web server

## 🚀 Run Locally

Because the tools use ES modules, serve the project through a local HTTP server instead of opening `index.html` directly:

```bash
git clone https://github.com/rdineshd176-png/Prodigy-Kit.git
cd Prodigy-Kit
python3 -m http.server 8000
```

Open <http://localhost:8000> in your browser.

Available tools:

- Dashboard: <http://localhost:8000/>
- Day 1 — PDF Toolkit: <http://localhost:8000/tools/day1-pdf/>
- Day 2 — Image Compressor: <http://localhost:8000/tools/day2-compressor/>
- Day 3 — EXIF Scrubber: <http://localhost:8000/tools/day3-exif/>

## 🚀 Deploy to Netlify

Drop the `prodigy-kit/` folder into Netlify or connect the GitHub repository. Day 10's `ffmpeg.wasm` may require these headers in a root-level `_headers` file:

```text
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
```

## 🔐 Privacy by Design
Prodigy Kit is designed for files and text that should not be sent to an online converter:

- Files are read through browser APIs and processed in local memory.
- The project does not require an upload endpoint or application database.
- EXIF removal redraws images onto a clean canvas before download.
- The dashboard stores only local preferences such as the selected theme.
- External CDN libraries load at runtime; tool input is not sent to those libraries.

Always review a tool's output before sharing it, especially when handling sensitive or regulated information.

## 🧪 Testing a Tool
1. Start the local server from the project root.
2. Open the dashboard and select a tool marked **LIVE**.
3. Choose a small sample file first.
4. Confirm the downloaded result opens correctly.
5. Test the tool directly from its folder if you are working on an isolated release.

The dashboard uses the presence of each tool route to determine whether a daily card can be opened. Keep each tool's `index.html`, `style.css`, and `app.js` together when moving or deploying it.

## 🛠️ Adding a New Daily Tool
1. Create a folder under `tools/` using the matching day identifier.
2. Add the standalone HTML, CSS, and JavaScript files.
3. Register the tool metadata and route in `assets/lib/tools.js`.
4. Add the tool to the README sprint table and project structure.
5. Open the dashboard and verify the card, route, and theme behavior.
6. Test the tool through a local HTTP server before deploying.

## 🤝 Contributions
Bug reports, usability improvements, and accessibility fixes are welcome. Please include the affected day, browser, reproduction steps, and a small sample input when possible. Do not include private files, credentials, API keys, or personal metadata in an issue or pull request.
## 🏆 Credits

**Created and vibe-coded by:**

- **R Dinesh** — Cyber Security Student · Chief Vibe-Coder · Occasional Bug Generator
- [GitHub](https://github.com/rdineshd176-png) · [LinkedIn](https://www.linkedin.com/in/dinesh-r-cybersec/) · [Full Credits Page](./credits.html)

## 📄 License

MIT — fork it, learn from it, and ship it as your own.
