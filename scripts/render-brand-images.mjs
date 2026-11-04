import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "public");
const fontDir = resolve(root, "scripts/.fonts");
mkdirSync(fontDir, { recursive: true });

const fonts = [
  ["CormorantGaramond-SemiBold.ttf", "https://cdn.jsdelivr.net/fontsource/fonts/cormorant-garamond@5.2.8/latin-600-normal.ttf"],
  ["Hind-Regular.ttf", "https://cdn.jsdelivr.net/fontsource/fonts/hind@5.2.8/latin-400-normal.ttf"],
  ["Hind-Medium.ttf", "https://cdn.jsdelivr.net/fontsource/fonts/hind@5.2.8/latin-500-normal.ttf"],
];

for (const [name, url] of fonts) {
  const path = resolve(fontDir, name);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font download failed: ${name} (${response.status})`);
  writeFileSync(path, Buffer.from(await response.arrayBuffer()));
}

const fontFiles = fonts.map(([name]) => resolve(fontDir, name));

function iconSvg(rounded) {
  const rx = rounded ? 112 : 0;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rx}" fill="#080F24"/>
  <circle cx="256" cy="236" r="128" fill="#FF9933" opacity="0.2"/>
  <path d="M256 64c18 52 68 74 68 122 0 38-29 60-68 60s-68-22-68-60c0-48 50-70 68-122z" fill="#FF9933"/>
  <path d="M256 118c8 26 26 36 26 54 0 15-11 24-26 24s-26-9-26-24c0-18 18-28 26-54z" fill="#FFF8E7"/>
  <path d="M78 328c16 92 110 124 178 124s162-32 178-124c-32 46-98 62-178 62s-146-16-178-62z" fill="#D4AF37"/>
  <path d="M124 332c14 46 62 62 132 62s118-16 132-62H124z" fill="#FF6B20"/>
  <circle cx="196" cy="360" r="11" fill="#FFD86B"/>
  <circle cx="256" cy="372" r="11" fill="#FFD86B"/>
  <circle cx="316" cy="360" r="11" fill="#FFD86B"/>
</svg>`;
}

function marigolds() {
  let marks = "";
  for (let i = 0; i < 17; i++) {
    const x = 48 + i * 70;
    const y = 42 + (i % 2) * 10;
    const fill = i % 2 === 0 ? "#FF9933" : "#E2B43A";
    marks += `<g><circle cx="${x}" cy="${y}" r="18" fill="${fill}"/><circle cx="${x}" cy="${y}" r="6" fill="#7A1F12"/>`;
    marks += `<path d="M${x} ${y + 16} v28" stroke="#6B8F3C" stroke-width="2" fill="none"/>`;
    if (i % 3 === 1) marks += `<path d="M${x - 7} ${y + 48} q7 14 14 0 q-7 5-14 0z" fill="#D4AF37"/>`;
    marks += `</g>`;
  }
  return marks;
}

const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3A1460"/>
      <stop offset="0.55" stop-color="#140826"/>
      <stop offset="1" stop-color="#080F24"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="46%" r="32%">
      <stop offset="0" stop-color="#FF9933" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FF9933" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFF1C2"/>
      <stop offset="0.45" stop-color="#D4AF37"/>
      <stop offset="1" stop-color="#FF8A2A"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#night)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g opacity="0.35" fill="none" stroke="#D4AF37" stroke-width="1">
    <circle cx="600" cy="250" r="150"/>
    <circle cx="600" cy="250" r="118"/>
    <circle cx="600" cy="250" r="86"/>
  </g>
  ${marigolds()}
  <g transform="translate(472 150) scale(2)">
    <path d="M64 8c6 18 22 26 22 42 0 13-10 20-22 20S42 63 42 50c0-16 16-24 22-42z" fill="#FF9933"/>
    <path d="M64 26c3 9 9 13 9 18 0 5-4 8-9 8s-9-3-9-8c0-5 6-9 9-18z" fill="#FFF8E7"/>
    <path d="M8 78c5 28 32 38 56 38s51-10 56-38c-10 14-30 19-56 19S18 92 8 78z" fill="#D4AF37"/>
    <path d="M22 80c4 14 18 18 42 18s38-4 42-18H22z" fill="#FF6B20"/>
    <circle cx="44" cy="90" r="3.2" fill="#FFD86B"/>
    <circle cx="64" cy="94" r="3.2" fill="#FFD86B"/>
    <circle cx="84" cy="90" r="3.2" fill="#FFD86B"/>
  </g>
  <text x="600" y="455" text-anchor="middle" font-family="Cormorant Garamond" font-size="84" fill="url(#gold)">Happy Diwali 2026</text>
  <text x="600" y="512" text-anchor="middle" font-family="Hind" font-size="32" fill="#FFF8E7">Create &amp; share a personal wish</text>
  <text x="600" y="572" text-anchor="middle" font-family="Hind" font-size="20" letter-spacing="3" fill="#D4AF37">bestwishes.jasminshukla.com</text>
  <rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="#D4AF37" stroke-opacity="0.45"/>
</svg>`;

function png(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Hind" },
  });
  return resvg.render().asPng();
}

const outputs = [
  ["favicon-32.png", png(iconSvg(true), 32)],
  ["apple-touch-icon.png", png(iconSvg(false), 180)],
  ["icon-192.png", png(iconSvg(false), 192)],
  ["icon-512.png", png(iconSvg(false), 512)],
  ["og-image.png", png(ogSvg, 1200)],
];

for (const [name, bytes] of outputs) {
  writeFileSync(resolve(publicDir, name), bytes);
  console.log(name, bytes.length);
}
