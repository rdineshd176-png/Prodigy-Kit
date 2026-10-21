// =========================================================================
// Prodigy Kit — Tool Metadata
// All 10 days LIVE. Each tool is a standalone HTML page under /tools/
// =========================================================================

export const TOOLS = [
  {
    id: "day1-pdf",
    day: 1,
    title: "PDF Toolkit",
    short: "Merge · Split · Images-to-PDF",
    description: "Drag-and-drop multiple PDFs, reorder visually and combine. Pull specific page ranges out of massive textbooks. Batch-convert photos of handwritten notes into one clean PDF.",
    category: "pdf",
    accent: "pdf",
    icon: "file-text",
    emoji: "📄",
    status: "live",
    href: "./tools/day1-pdf/index.html",
  },
  {
    id: "day2-compressor",
    day: 2,
    title: "Image Compressor",
    short: "Exact-KB target, format swap",
    description: "Compress passport photos or signatures to strict government/college portal limits. Side-by-side preview shows original vs compressed size. Convert between PNG, JPG and WEBP in one click.",
    category: "images",
    accent: "images",
    icon: "image",
    emoji: "🖼️",
    status: "live",
    href: "./tools/day2-compressor/index.html",
  },
  {
    id: "day3-exif",
    day: 3,
    title: "EXIF Scrubber",
    short: "Inspect & strip hidden metadata",
    description: "Displays hidden metadata inside a photo — exact GPS coordinates, phone model, shutter data and timestamps. Strips 100% of EXIF/IPTC tags by redrawing on a clean canvas.",
    category: "images",
    accent: "images",
    icon: "camera",
    emoji: "🧽",
    status: "live",
    href: "./tools/day3-exif/index.html",
  },
  {
    id: "day4-vault",
    day: 4,
    title: "Snippet Vault",
    short: "AES-GCM in URL, self-destructing",
    description: "Encrypts sensitive text, API keys or code in the browser using AES-GCM. Packs ciphertext + key into the URL hash so no backend database is needed. Optional PIN protection.",
    category: "privacy",
    accent: "privacy",
    icon: "lock",
    emoji: "🔐",
    status: "live",
    href: "./tools/day4-vault/index.html",
  },
  {
    id: "day5-qr",
    day: 5,
    title: "QR Studio",
    short: "Forever QRs, custom colors",
    description: "Generates static QR codes for URLs, Wi-Fi auto-connect credentials or plain text — zero tracking redirects, no trial traps. Custom colors and one-click PNG/SVG export.",
    category: "generators",
    accent: "generators",
    icon: "qr-code",
    emoji: "📱",
    status: "live",
    href: "./tools/day5-qr/index.html",
  },
  {
    id: "day6-bgremover",
    day: 6,
    title: "Background Remover",
    short: "100% local AI cutout",
    description: "Runs a WebAssembly model inside the browser to strip backgrounds without watermarks or pay-per-credit walls. One-click toggle for solid white or passport blue fill.",
    category: "images",
    accent: "images",
    icon: "scissors",
    emoji: "✂️",
    status: "live",
    href: "./tools/day6-bgremover/index.html",
  },
  {
    id: "day7-markdown",
    day: 7,
    title: "Markdown → PDF",
    short: "Split-screen live preview",
    description: "Type raw Markdown or paste AI-generated notes on the left; preview a clean, formatted A4 page on the right. One-click PDF download with code syntax highlighting.",
    category: "pdf",
    accent: "pdf",
    icon: "file-edit",
    emoji: "📝",
    status: "live",
    href: "./tools/day7-markdown/index.html",
  },
  {
    id: "day8-linkxray",
    day: 8,
    title: "Link X-Ray",
    short: "Strip trackers, decode URLs",
    description: "Automatically strips creepy tracking parameters (utm_source, fbclid, gclid, igsh) from messy shared links. Detects shortened URLs and Punycode homograph attacks.",
    category: "privacy",
    accent: "privacy",
    icon: "link",
    emoji: "🔍",
    status: "live",
    href: "./tools/day8-linkxray/index.html",
  },
  {
    id: "day9-cryptokit",
    day: 9,
    title: "Crypto Kit",
    short: "Base64/Hex/Bin + JWT + hashes",
    description: "Real-time conversion between Base64, Hex, Binary, ASCII and URL encoding on a single screen. Offline JWT decoder plus instant MD5, SHA-1 and SHA-256 hash generators.",
    category: "privacy",
    accent: "privacy",
    icon: "binary",
    emoji: "🧰",
    status: "live",
    href: "./tools/day9-cryptokit/index.html",
  },
  {
    id: "day10-attendance",
    day: 10,
    title: "Attendance Calculator",
    short: "Bunk or recover — sarcastic",
    description: "Enter your attendance numbers and target percentage. Find out how many classes you can safely bunk, or how many you need to attend in a row to claw your way back. Sarcastic commentary included.",
    category: "generators",
    accent: "generators",
    icon: "calendar-check",
    emoji: "📊",
    status: "live",
    href: "./tools/day10-attendance/index.html",
  },
];

export const CATEGORY_LABELS = {
  pdf: "PDF & Docs",
  images: "Images",
  privacy: "Privacy & Crypto",
  generators: "Generators",
  media: "Media",
};

export function getLiveTools() {
  return TOOLS.filter((t) => t.status === "live");
}

export function getLockedTools() {
  return TOOLS.filter((t) => t.status === "locked");
}

export function getTool(id) {
  return TOOLS.find((t) => t.id === id);
}

export function accentVar(accent) {
  return `var(--pk-accent-${accent})`;
}
