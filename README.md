````
<div align="center">

<h1>🛠️ Prodigy Kit</h1>

<p><strong><big>10 days. 10 tools. Zero backend. Zero sketchy ads.</big></strong></p>

<p><big>Prodigy Kit is a daily-reveal suite of in-browser utilities for PDF manipulation, strict-size image compression, EXIF metadata scrubbing, encrypted snippets, QR codes, AI background removal, Markdown-to-PDF conversion, link tracking removal, crypto utilities, and local media extraction.</big></p>

<p><big>Everything is designed to run locally in your browser. No application backend or database is required, and the project includes no tracking scripts.</big></p>

<p>
<a href="https://prodigy-kit.netlify.app/"><strong>🌐 Live Demo</strong></a>
&nbsp; · &nbsp;
<a href="https://github.com/rdineshd176-png/Prodigy-Kit"><strong>💻 GitHub Repository</strong></a>
</p>

</div>

---

## 📅 The 10-Day Utility Sprint

Each utility lives in its own standalone folder under `tools/`. The dashboard checks tool routes and displays available tools as LIVE while unreleased tools remain locked.

| Day | Tool | What it does | Engine / Library | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Day 1** | **PDF Toolkit** | Merge PDFs, split page ranges, and convert images to PDF. | `pdf-lib` & `PDF.js` | ✅ **LIVE** |
| **Day 2** | **Image Compressor** | Compress images to strict KB targets and convert formats. | `HTML5 Canvas API` | ✅ **LIVE** |
| **Day 3** | **EXIF Scrubber** | Inspect and remove hidden GPS, device, and timestamp metadata. | `ExifReader` & Canvas API | ✅ **LIVE** |
| **Day 4** | **Snippet Vault** | Encrypt and share sensitive text through self-contained URLs. | `Web Crypto API` · AES-GCM | ✅ **LIVE** |
| **Day 5** | **QR Studio** | Generate static, non-expiring QR codes. | `qrcode.js` | 🔒 Upcoming |
| **Day 6** | **Background Remover** | Remove image backgrounds locally using browser-based AI. | `@imgly/background-removal` | 🔒 Upcoming |
| **Day 7** | **Markdown → PDF** | Preview Markdown and export it as a formatted PDF. | `marked.js` & `html2pdf.js` | 🔒 Upcoming |
| **Day 8** | **Link X-Ray** | Remove tracking parameters and inspect URLs. | `URL API` | 🔒 Upcoming |
| **Day 9** | **Crypto Kit** | Encode, decode, and hash values for development and CTF work. | `CryptoJS` | 🔒 Upcoming |
| **Day 10** | **Media Extractor** | Extract audio and trim supported media locally in the browser. | `FFmpeg.wasm` | 🔒 Upcoming |

## 🗂️ Project Structure

```text
prodigy-kit/
├── index.html                  # Central Bento dashboard
├── credits.html                # Builder identity and library credits
├── README.md
├── assets/                     # Shared dashboard assets
│   ├── styles/
│   │   ├── tokens.css          # Pro, Arcade, and Pookie theme tokens
│   │   ├── base.css            # Reset, typography, and background
│   │   └── shell.css           # Dashboard layout and components
│   ├── lib/
│   │   ├── store.js            # Theme, progress, and UI state
│   │   └── tools.js            # Tool metadata and routes
│   └── app.js                  # Dashboard logic and folder detection
├── tools/                      # Published tools
│   ├── day1-pdf/               # Day 1 — LIVE
│   ├── day2-compressor/        # Day 2 — LIVE
│   ├── day3-exif/              # Day 3 — LIVE
│   └── day4-vault/             # Day 4 — LIVE
│       ├── index.html
│       ├── style.css
│       └── app.js
└── _source/                    # Source copies and upcoming releases
    ├── day2-compressor/
    ├── day3-exif/
    ├── day4-vault/
    ├── day5-qr/
    ├── day6-bgremover/
    ├── day7-markdown/
    ├── day8-linkxray/
    ├── day9-cryptokit/
    └── day10-media/
````

Deployment note: Keep `_source/` out of the public deployment when it contains unreleased tools. Only publish the dashboard, shared assets, and folders intended to be live.

## 🧱 Standalone Daily Releases

Each day's folder is designed to contain its own HTML, CSS, and JavaScript. This makes it possible to test or host individual tools independently without changing the other releases.

The standalone architecture provides:

- Isolation: Changes to one tool are less likely to affect another.
- Portability: Individual tools can be hosted separately.
- No build step: No bundler or compilation is needed.
- Independent styling: Each tool can maintain its own visual identity and theme implementation.

The trade-off is duplicated code. Shared design tokens and theme logic may need to be maintained across multiple standalone folders.

### 🔓 Revealing a New Day

To publish Day 5, copy its completed source folder into `tools/`:

```
cp -r _source/day5-qr tools/
```

Deploy the updated project and refresh the dashboard.

The QR Studio page should become available at:

`/tools/day5-qr/`

The dashboard uses tool-route availability to determine which cards can be opened. Verify that the published entry point returns successfully and that the dashboard's detection logic works correctly on your hosting provider.

No separate configuration edit should be necessary when the folder structure, route metadata, and detection logic are configured correctly.

## 🎨 Tri-Theme Engine

The dashboard and standalone tools support three visual themes.

### 💼 Pro Mode

Cyber-indigo dark backgrounds with electric-cyan accents. Clean, focused, and built for getting work done.

### 🕹️ Arcade Mode

Pure-black backgrounds, neon magenta and cyan, CRT-inspired scanlines, and retro gaming aesthetics.

### 🎀 Pookie Mode

Soft cream, pink, and lavender pastel styling with rounded elements and frosted-glass effects.

Theme selection is designed to persist using `localStorage` where configured.

The visual identity changes with the selected theme, including the brand styling, typography, colors, and logo icon.

## 🔐 Day 4 Spotlight: Snippet Vault

Share encrypted text without maintaining a server-side database.

The Snippet Vault uses the native Web Crypto API to encrypt text directly in the browser.

### Features

- AES-GCM encryption: Encrypt snippets locally in the browser.
- Optional passcode protection: Add an extra access step before decryption.
- Self-contained URLs: Package encrypted data and decryption material into a shareable URL.
- Zero application backend: No custom server or database is required to store snippets.
- Three visual themes: Switch between Pro, Arcade, and Pookie modes.

### How It Works

1. Enter the text you want to share.
2. Encrypt it locally using the browser's cryptographic APIs.
3. Package the encrypted payload and the required decryption information into the URL fragment.
4. Send the generated link to the recipient.
5. The recipient opens the link and decrypts the contents in their browser.

URL fragments—the part of a URL after `#`—are not included in ordinary HTTP requests. This helps keep the fragment's contents out of requests sent to the hosting server.

Security reminder: Anyone who obtains a URL containing the decryption key may be able to decrypt the snippet. A PIN provides meaningful additional protection only when it is correctly integrated into the encryption process, such as through a suitable password-based key-derivation mechanism. Browser history, copied links, and recipient access also matter. Review the implementation before using the tool for highly sensitive credentials.

## 🧰 Tech Stack

### Core Technologies

- HTML5 for semantic structure.
- CSS3 for responsive styling, custom properties, and design tokens.
- Vanilla JavaScript with native ES modules.
- Browser APIs for image processing, encryption, and URL handling.
- `localStorage` for supported local preferences.
- Lucide Icons for interface iconography.
- A lightweight custom pub/sub store for application state.
- Static hosting through Netlify or another compatible provider.

### External Libraries

| Library                     | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `pdf-lib`                   | PDF manipulation                            |
| `PDF.js`                    | PDF rendering and preview, where configured |
| `ExifReader`                | Image metadata inspection                   |
| `marked.js`                 | Markdown parsing                            |
| `html2pdf.js`               | PDF generation                              |
| `qrcode.js`                 | QR code generation                          |
| `@imgly/background-removal` | AI-assisted background removal              |
| `CryptoJS`                  | Cryptographic utilities                     |
| `FFmpeg.wasm`               | Browser-based media processing              |

Libraries are loaded at runtime from configured CDNs. Refer to the relevant source files to verify the versions and exact dependencies used by each tool.

### What This Project Doesn't Need

- React
- TypeScript
- Tailwind CSS
- A Node.js backend
- A database
- A bundler
- A build pipeline

Just HTML, CSS, JavaScript, browser APIs, and a healthy willingness to debug things that worked five minutes ago.

## 🚀 Run Locally

Because the tools use ES modules, serve the project through a local HTTP server instead of opening `index.html` directly.

### 1. Clone the Repository

```
git clone https://github.com/rdineshd176-png/Prodigy-Kit.git
cd Prodigy-Kit
```

### 2. Start the Local Server

With Python 3 installed:

```
python3 -m http.server 8000
```

On Windows, this also works when Python is available through the `python` command:

```
python -m http.server 8000
```

### 3. Open the Dashboard

Visit:

### Available Tools

- Dashboard:
- Day 1 — PDF Toolkit:
- Day 2 — Image Compressor:
- Day 3 — EXIF Scrubber:
- Day 4 — Snippet Vault:

## 🚀 Deploy to Netlify

Deploy the project root containing `index.html`, `assets/`, and the published `tools/` folders.

You can connect the GitHub repository to Netlify or deploy the prepared project directory directly.

### Before Deploying

1. Confirm that the dashboard loads correctly.
2. Test each published utility independently.
3. Verify that CDN imports work on the deployed domain.
4. Keep unreleased source folders out of the public deployment.
5. Check the browser console for JavaScript errors.
6. Test theme switching and persistence.
7. Review sensitive operations, especially encryption and file handling.

### Cross-Origin Isolation for FFmpeg.wasm

Some FFmpeg.wasm configurations require cross-origin isolation. Depending on the selected version and processing mode, a root-level `_headers` file may need the following configuration:

```
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
```

These headers are not required by every utility. Applying them across the entire site may affect third-party resource loading, so test all CDN dependencies before enabling them.

## 🛡️ Privacy by Design

Prodigy Kit is built around the idea that everyday files and text should not automatically need to visit an online converter.

The project is designed to:

- Process supported files directly through browser APIs.
- Avoid requiring a custom upload endpoint or application database.
- Remove image metadata by redrawing supported images onto a clean canvas.
- Store interface preferences, such as the selected theme, locally.
- Perform snippet encryption and decryption in the browser.
- Avoid including tracking scripts in the project.

External libraries may still be downloaded from CDNs, and some tools may load models or other resources at runtime. This means the application can make network requests even when user files are processed locally.

Local processing is not a substitute for a security review. Always inspect a tool's implementation and output before using it to handle sensitive or regulated information.

## 🧪 Testing a Tool

1. Start the local server from the project root.
2. Open the dashboard.
3. Select a utility marked LIVE.
4. Begin with a small, non-sensitive sample file or text.
5. Confirm that the operation completes without browser errors.
6. Open the downloaded result and verify its contents.
7. Test the tool directly through its own URL.
8. Check responsive layouts and all three themes.

For the Snippet Vault, additionally verify encryption, decryption, malformed links, optional passcode handling, and the behavior of shared URLs.

The dashboard and each published utility should be tested independently before a new daily release.

## 🛠️ Adding a New Daily Tool

1. Create the tool folder in `_source/` while it is under development.
2. Add the standalone HTML, CSS, and JavaScript files.
3. Implement the interface and tool-specific functionality.
4. Register the tool metadata and route in `assets/lib/tools.js` if required.
5. Test the tool through a local HTTP server.
6. Verify the card, route detection, responsiveness, and theme behavior.
7. Copy the completed folder into `tools/` when it is ready for release.
8. Update the README sprint table and project structure.
9. Deploy the updated project and verify the live page.

Keep the tool's `index.html`, `style.css`, and `app.js` together when moving or deploying it.

## 🤝 Contributions

Bug reports, usability improvements, accessibility fixes, and useful feature suggestions are welcome.

When reporting an issue, include the affected day, browser, reproduction steps, and a small sample input when possible.

Please do not publish private files, passwords, API keys, sensitive snippets, or personal metadata in issues or pull requests.

## 🏆 Credits

Created and vibe-coded by:

\- R Dinesh — Cyber Security Student · Chief Vibe-Coder · Occasional Bug Generator

Find me here:

- [GitHub](https://github.com/rdineshd176-png)
- [LinkedIn](https://www.linkedin.com/in/dinesh-r-cybersec/)
- Full Credits Page

> Built out of pure frustration because dodging 15 fake green "Download" buttons just to merge a college assignment should be illegal.

## 📄 License

MIT — fork it, learn from it, modify it, and ship your own version.

Check the licenses of third-party libraries before redistributing them.

```
```
