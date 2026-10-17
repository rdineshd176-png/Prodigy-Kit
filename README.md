<div align="center">

<h1>🛠️ Prodigy Kit</h1>

<p><strong><big>10 days. 10 tools. Zero backend. Zero sketchy ads.</big></strong></p>

<p><big>Prodigy Kit is a daily-reveal suite of in-browser utilities for PDF manipulation, strict-size image compression, EXIF metadata scrubbing, encrypted snippets, QR codes, AI background removal, Markdown-to-PDF conversion, link tracking removal, crypto utilities, and local media extraction.</big></p>

<p><big>The tools are designed to process user input directly in the browser without an application backend or database. The project includes no tracking scripts.</big></p>

<p>
<a href="https://prodigy-kit.netlify.app/"><strong>🌐 Live Demo</strong></a>
&nbsp; · &nbsp;
<a href="https://github.com/rdineshd176-png/Prodigy-Kit"><strong>💻 GitHub Repository</strong></a>
</p>

</div>

📅 The 10-Day Utility Sprint
Each utility is a standalone folder under tools/. The dashboard checks tool routes and displays published tools as LIVE while upcoming releases remain locked. Day 6, Background Remover, is now live; Days 7–10 remain locked.
Day	Tool	What it does	Engine / Library	Status
Day 1	PDF Toolkit	Merge PDFs, split page ranges, and convert images to PDF.	pdf-lib & PDF.js	✅ LIVE
Day 2	Image Compressor	Compress images to strict KB targets and convert formats.	HTML5 Canvas API	✅ LIVE
Day 3	EXIF Scrubber	Inspect and remove hidden GPS, device, and timestamp metadata.	ExifReader & Canvas API	✅ LIVE
Day 4	Snippet Vault	Encrypt and share text snippets through self-contained URLs.	Web Crypto API · AES-GCM	✅ LIVE
Day 5	QR Studio	Generate static QR codes for URLs, Wi-Fi credentials, and text; customize colors and export PNG/SVG.	qrcode@1.5.4	✅ LIVE
Day 6	Background Remover	Cut out image backgrounds with browser-based AI, choose transparent or solid/custom fills, and export PNGs.	@imgly/background-removal v1.7.0	✅ LIVE
Day 7	Markdown → PDF	Preview Markdown and export it as a formatted PDF.	marked.js & html2pdf.js	🔒 Upcoming
Day 8	Link X-Ray	Remove tracking parameters and inspect URLs.	URL API	🔒 Upcoming
Day 9	Crypto Kit	Encode, decode, and hash values for development and CTF work.	CryptoJS	🔒 Upcoming
Day 10	Media Extractor	Extract audio and trim supported media locally in the browser.	FFmpeg.wasm	🔒 Upcoming


Release schedule: Day 1 — October 12, 2026; Day 5 — October 16, 2026; Day 6 — October 17, 2026. Days 7–10 remain locked until their releases.
🗂️ Project Structure
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
│   │   ├── store.js            # Theme and progress state
│   │   └── tools.js            # Tool metadata and routes
│   └── app.js                  # Dashboard logic and route detection
└── tools/                      # Published tools
    ├── day1-pdf/               # Day 1 — LIVE
    ├── day2-compressor/        # Day 2 — LIVE
    ├── day3-exif/              # Day 3 — LIVE
    ├── day4-vault/             # Day 4 — LIVE
    ├── day5-qr/                # Day 5 — LIVE
    │   ├── index.html
    │   ├── style.css
    │   └── app.js
    └── day6-bgremover/         # Day 6 — LIVE
        ├── index.html
        ├── style.css
        └── app.js
🧱 Standalone Daily Releases
Each daily tool is designed to contain its own HTML, CSS, and JavaScript. This makes it possible to test or host a tool independently without changing the other days.
Benefits:
- Isolation: Changes to one tool are less likely to affect another.
- Portability: Individual tools can be hosted separately.
- No build pipeline: No bundler or compilation step is needed.
- Independent styling: Each tool can maintain its own UI and theme implementation.
The trade-off is duplicated code: updates to theme tokens or shared logic may need to be copied into multiple standalone tools.
✂️ Day 6 Spotlight: Background Remover
Cut out a person or object from an image, then keep the background transparent or replace it with a clean solid color.
Day 6 uses IMG.LY's browser-based background-removal model through WebAssembly. The original image and generated cutout are shown side by side, so you can inspect the result before exporting it.
Features
- Image upload: Choose a file or drag and drop it into the upload area. The interface is designed for JPG, PNG, and WEBP images.
- AI background removal: Automatically separates the main foreground subject from its background in the browser.
- Original and cutout preview: Compare the source image with the transparent cutout before downloading.
- Background options: Keep transparency, use solid white, passport blue, or red, or choose a custom color.
- PNG export: Download a PNG named <original-name>-cutout.png. Transparent output is preserved when the transparent option is selected.
- Progress feedback: Shows model-download and processing progress while the cutout is being generated.
- Three themes: Supports Pro, Arcade, and Pookie modes.
- No watermark or usage credits: The tool does not add a watermark or require an account or credits.
How It Works
1. Select an image or drag it into the drop area.
2. Wait for the AI model to load and process the image. Progress appears in the result panel.
3. Review the original and cutout previews.
4. Choose Transparent, Solid white, Passport blue, Red, or Custom and set a color if needed.
5. Select Download PNG to save the cutout.
Privacy and First-Run Notes
The image-removal inference runs in your browser; the tool does not upload the selected image to a Prodigy Kit application backend. On first use, the browser downloads an approximately 30 MB WebAssembly AI model and the required web resources. The model is cached by the browser, so later use can be faster. This initial model/resource download means an internet connection is needed for the first load, and normal external CDN requests may still occur.
Solid-color backgrounds can be useful for ID-style photos, product images, profile pictures, and other graphics. Check the cutout carefully around hair, fine edges, and transparent objects before using the exported image.
✨ Day 5 Spotlight: QR Studio
Generate static QR codes without relying on a QR redirect or tracking service.
QR Studio creates QR codes directly in the browser for URLs, Wi-Fi network details, and plain text.
Features
- Three content types: URLs, Wi-Fi credentials, and plain text.
- Custom colors: Choose foreground and background colors.
- Preset palettes: Classic, Dark Mode, Forest, Sunset, and CMYK Print.
- Error correction: Select L, M, Q, or H to balance density and recovery from damage.
- Adjustable preview size: Choose a preview size from 128px to 1024px.
- PNG export: Download a 1024 × 1024 PNG.
- SVG export: Download a scalable vector QR code.
- Tri-theme interface: Pro, Arcade, and Pookie modes.
- Browser-side generation: QR content is encoded by the client-side qrcode library.
How It Works
1. Select URL, Wi-Fi, or Text.
2. Enter the content to encode.
3. Customize colors, error correction, and preview size.
4. Preview the generated QR code.
5. Download it as PNG or SVG.
The QR code is static: the content is encoded directly into the QR matrix rather than routed through a dedicated tracking redirect. A QR code itself does not expire, but a website or resource encoded inside it can still be changed, removed, or become unavailable.
Wi-Fi privacy note: A Wi-Fi QR code contains the network information you entered, including the password for password-protected networks. Anyone who scans or decodes that code may be able to retrieve those details. Share Wi-Fi QR codes only with people you trust.
🎨 Tri-Theme Engine
The dashboard and standalone tools support three visual themes:
- 💼 Pro Mode (default): Cyber-indigo dark styling with electric cyan accents.
- 🕹️ Arcade Mode: CRT-inspired scanlines with neon magenta and cyan accents.
- 🎀 Pookie Mode: Soft cream, pink, and lavender pastel styling.
Theme selection is persisted through localStorage where configured. The theme switcher also updates the visual identity, including the logo icon and color palette.
🧰 Tech Stack
Core Technologies
- HTML5, CSS3, and vanilla JavaScript ES modules.
- Native browser APIs for image processing, encryption, and URL handling.
- A small custom pub/sub store for application state.
- localStorage for supported local preferences.
- Lucide icons for interface iconography.
- Static hosting through Netlify or another compatible web server.
External Libraries
Library	Purpose
pdf-lib	PDF manipulation
PDF.js	PDF rendering and previews, where configured
ExifReader	Image metadata inspection
qrcode@1.5.4	QR code generation in Day 5
marked.js	Markdown parsing
html2pdf.js	PDF generation
@imgly/background-removal v1.7.0	Browser-based AI background removal in Day 6
CryptoJS	Cryptographic utilities
FFmpeg.wasm	Browser-based media processing


Libraries are loaded from configured CDNs where applicable. Check individual tool source files for exact versions and imports.
What This Project Doesn't Need
- React
- TypeScript
- Tailwind CSS
- A custom application backend
- An application database
- A bundler or build pipeline
Just HTML, CSS, JavaScript, browser APIs, and the occasional debugging session.
🚀 Run Locally
Because the tools use ES modules, run a local HTTP server instead of opening index.html directly.
1. Clone the Repository
git clone https://github.com/rdineshd176-png/Prodigy-Kit.git
cd Prodigy-Kit
2. Start the Server
python3 -m http.server 8000
On Windows, python -m http.server 8000 may be the correct command depending on your Python installation.
3. Open the Dashboard
Visit http://localhost:8000.
Available Tools
- Dashboard: http://localhost:8000/
- Day 1 — PDF Toolkit: http://localhost:8000/tools/day1-pdf/
- Day 2 — Image Compressor: http://localhost:8000/tools/day2-compressor/
- Day 3 — EXIF Scrubber: http://localhost:8000/tools/day3-exif/
- Day 4 — Snippet Vault: http://localhost:8000/tools/day4-vault/
- Day 5 — QR Studio: http://localhost:8000/tools/day5-qr/
- Day 6 — Background Remover: http://localhost:8000/tools/day6-bgremover/
🚀 Deploy to Netlify
Deploy the project root containing index.html, assets/, and the published tools/ folders. You can connect the GitHub repository or deploy the prepared project directory.
Before Deploying
1. Confirm the dashboard and each published tool load correctly.
2. Verify that CDN imports work on the deployed domain.
3. Deploy only tools intended for public release.
4. Test responsive layouts and theme switching.
5. Check the browser console for JavaScript errors.
6. Test each export with small sample inputs.
Cross-Origin Isolation for FFmpeg.wasm
Some FFmpeg.wasm configurations require cross-origin isolation. If the selected version and processing mode need it, a root-level _headers file may include:
/*
     Cross-Origin-Embedder-Policy: require-corp
     Cross-Origin-Opener-Policy: same-origin
These headers are not required by every utility. They can affect third-party resource loading, so test all external dependencies before applying them site-wide.
🛡️ Privacy by Design
Prodigy Kit is designed for everyday file and text utilities that should not automatically require uploading user input to an online converter.
- Supported files and inputs are intended to be processed through browser APIs.
- The tools do not require a custom upload endpoint or application database.
- The EXIF Scrubber is designed to remove metadata by redrawing supported images onto a clean canvas.
- The Snippet Vault encrypts and decrypts text in the browser.
- QR Studio generates QR codes locally using its client-side library.
- The Background Remover runs its image inference in the browser; its AI model and required web resources are downloaded on first use.
- The dashboard stores supported preferences, such as the selected theme, locally.
External libraries, fonts, and icons may still load from CDNs at runtime, so the site does make network requests. The design avoids sending tool input to a QR-generation service, but every tool should be reviewed independently before handling sensitive information.
Always inspect the result before sharing it. In particular, treat generated QR codes containing Wi-Fi passwords and shared vault links as sensitive.
🧪 Testing a Tool
1. Start the local server from the project root.
2. Open the dashboard and select a tool marked LIVE.
3. Begin with a small, non-sensitive sample input.
4. Confirm the operation completes without browser errors.
5. Open the downloaded result and verify its contents.
6. Test the tool directly through its own URL.
7. Check responsive layouts and all three themes.
For QR Studio, test URL, Wi-Fi, and text inputs, each color preset, error-correction levels, and both PNG and SVG exports. Scan the downloaded QR codes with a device before sharing or printing them.
For the Snippet Vault, test encryption, decryption, malformed links, and passcode handling.
For the Background Remover, test file-picker and drag-and-drop uploads, JPG/PNG/WEBP samples, transparent and each solid/custom background option, and the downloaded PNG. Also check first-run model loading, repeat use after the model is cached, and the browser console for errors.
🤝 Contributions
Bug reports, usability improvements, accessibility fixes, and useful feature suggestions are welcome.
When reporting an issue, include the affected day, browser, reproduction steps, and a small sample input when possible. Do not publish private files, passwords, API keys, Wi-Fi credentials, or personal metadata in issues or pull requests.
🏆 Credits
Created and vibe-coded by:
- R Dinesh — Cyber Security Student · Chief Vibe-Coder · Occasional Bug Generator
Find me here:
- GitHub
- LinkedIn
- [Full Credits Page](./credits.html)
Built out of pure frustration because dodging 15 fake green "Download" buttons just to merge a college assignment should be illegal.

📄 License
MIT — fork it, learn from it, modify it, and ship your own version.
Check the licenses of third-party libraries before redistributing them.
<div align="center">

<h3>Don't consume. Construct. 🛠️</h3>

<p><strong>Consistency &gt; Motivation. Always.</strong></p>

<sub>Built one day at a time. Debugged one headache at a time.</sub>
</div>
