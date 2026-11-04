import type { Lang } from "./i18n";

export type Template = {
  id: string;
  name: Record<Lang, string>;
  bg: [string, string];
  accent: string;
  text: string;
  deco: "diyas" | "rangoli" | "minimal" | "mandala" | "family" | "corporate";
};

export const TEMPLATES: Template[] = [
  { id: "royal", name: { gu: "રોયલ ગોલ્ડ", hi: "रॉयल गोल्ड", en: "Royal Gold" }, bg: ["#0B1736", "#080F24"], accent: "#D4AF37", text: "#FFF8E7", deco: "diyas" },
  { id: "traditional", name: { gu: "પરંપરાગત", hi: "पारंपरिक", en: "Traditional" }, bg: ["#7A1F0E", "#3B0A05"], accent: "#FF9933", text: "#FFF8E7", deco: "rangoli" },
  { id: "minimal", name: { gu: "મોડર્ન મિનિમલ", hi: "मॉडर्न मिनिमल", en: "Modern Minimal" }, bg: ["#FFF8E7", "#F3E6C8"], accent: "#B8862B", text: "#2A1A08", deco: "minimal" },
  { id: "purple", name: { gu: "લક્ઝરી પર્પલ", hi: "लक्ज़री पर्पल", en: "Luxury Purple" }, bg: ["#4A1A70", "#1E0833"], accent: "#D4AF37", text: "#FFF8E7", deco: "mandala" },
  { id: "family", name: { gu: "પરિવાર ઉજવણી", hi: "पारिवारिक उत्सव", en: "Family Celebration" }, bg: ["#FF8A3D", "#B8340F"], accent: "#FFE08A", text: "#FFF8E7", deco: "family" },
  { id: "corporate", name: { gu: "કોર્પોરેટ", hi: "कॉर्पोरेट", en: "Corporate" }, bg: ["#12233F", "#0A1426"], accent: "#C9A548", text: "#F2EEE4", deco: "corporate" },
];

export const CARD_TEXT: Record<Lang, { title: string; dear: (n: string) => string; warm: string }> = {
  gu: { title: "શુભ દિવાળી ૨૦૨૬", dear: (n) => `પ્રિય ${n},`, warm: "હાર્દિક શુભેચ્છાઓ સાથે," },
  hi: { title: "शुभ दीपावली २०२६", dear: (n) => `प्रिय ${n},`, warm: "हार्दिक शुभकामनाओं सहित," },
  en: { title: "Happy Diwali 2026", dear: (n) => `Dear ${n},`, warm: "With Warm Wishes," },
};

export const SUGGESTIONS: Record<Lang, string[]> = {
  gu: [
    "આ દિવાળી તમારા જીવનમાં સુખ, સમૃદ્ધિ, શાંતિ અને સફળતા લાવે.",
    "દીવાઓનો પ્રકાશ તમારા ઘરને આનંદ અને પ્રેમથી ભરી દે.",
    "તમને અને તમારા પરિવારને દિવાળી અને નૂતન વર્ષની હાર્દિક શુભકામનાઓ.",
  ],
  hi: [
    "यह दीपावली आपके जीवन में सुख, समृद्धि, शांति और सफलता लाए।",
    "दीयों की रोशनी आपके घर को आनंद और प्रेम से भर दे।",
    "आपको और आपके परिवार को दीपावली की हार्दिक शुभकामनाएँ।",
  ],
  en: [
    "Wishing you and your family happiness, prosperity, good health, and success.",
    "May the glow of diyas fill your home with joy and love.",
    "Wishing you and your family a bright, joyful and prosperous Diwali.",
  ],
};

export type CardData = { from: string; to: string; msg: string; lang: Lang; t: string };

const FONT: Record<Lang, { display: string; body: string }> = {
  gu: { display: '"Noto Serif Gujarati"', body: '"Hind Vadodara"' },
  hi: { display: '"Yatra One"', body: '"Hind"' },
  en: { display: '"Cormorant Garamond"', body: '"Hind"' },
};

export async function loadCardFonts(lang: Lang) {
  const f = FONT[lang];
  try {
    await Promise.all([
      document.fonts.load(`700 80px ${f.display}`, CARD_TEXT[lang].title),
      document.fonts.load(`400 40px ${f.body}`, CARD_TEXT[lang].warm),
      document.fonts.load(`700 60px "Cormorant Garamond"`, "A"),
    ]);
  } catch { /* fall back to system fonts */ }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

function diya(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, accent: string) {
  const g = ctx.createRadialGradient(x, y - s * 0.9, 0, x, y - s * 0.9, s * 1.6);
  g.addColorStop(0, "rgba(255,200,90,0.55)"); g.addColorStop(1, "rgba(255,150,50,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - s * 0.9, s * 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FF9933";
  ctx.beginPath(); ctx.moveTo(x, y - s * 1.5);
  ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x, y - s * 0.35);
  ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y - s * 1.5); ctx.fill();
  ctx.fillStyle = "#FFF8E7"; ctx.beginPath(); ctx.ellipse(x, y - s * 0.6, s * 0.1, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.moveTo(x - s, y - s * 0.3); ctx.quadraticCurveTo(x, y + s * 0.9, x + s, y - s * 0.3); ctx.closePath(); ctx.fill();
}

function mandala(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 0.35) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 2;
  for (const k of [1, 0.75, 0.5, 0.3]) { ctx.beginPath(); ctx.arc(0, 0, r * k, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 24; i++) {
    ctx.rotate(Math.PI / 12);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.3); ctx.quadraticCurveTo(r * 0.12, -r * 0.65, 0, -r); ctx.quadraticCurveTo(-r * 0.12, -r * 0.65, 0, -r * 0.3); ctx.stroke();
  }
  ctx.restore();
}

function rangoli(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const cols = ["#FF9933", "#FFD23F", "#E8336A", "#2BB673", "#FFF8E7"];
  ctx.save(); ctx.translate(x, y);
  for (let ring = 5; ring >= 1; ring--) {
    ctx.fillStyle = cols[ring % cols.length]!;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath(); ctx.ellipse(0, -r * ring * 0.17, r * 0.06 * ring * 0.6, r * 0.1 * ring * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function marigolds(ctx: CanvasRenderingContext2D, W: number) {
  for (let i = 0; i < 18; i++) {
    const x = (W / 17) * i, y = 30 + Math.sin(i / 17 * Math.PI) * 60;
    ctx.fillStyle = i % 2 ? "#FF9933" : "#FFC21A";
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawCard(canvas: HTMLCanvasElement, d: CardData, W = 1080, H = 1350) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const tpl = TEMPLATES.find((x) => x.id === d.t) ?? TEMPLATES[0]!;
  const f = FONT[d.lang];
  const txt = CARD_TEXT[d.lang];

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, tpl.bg[0]); bg.addColorStop(1, tpl.bg[1]);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // decorations
  const cy = H * 0.5;
  if (tpl.deco === "mandala" || tpl.deco === "diyas") mandala(ctx, W / 2, cy, W * 0.62, tpl.accent, 0.22);
  if (tpl.deco === "rangoli") { rangoli(ctx, W / 2, H - 130, 260); marigolds(ctx, W); }
  if (tpl.deco === "family") { marigolds(ctx, W); }
  if (tpl.deco === "corporate") {
    ctx.strokeStyle = tpl.accent; ctx.lineWidth = 3; ctx.strokeRect(50, 50, W - 100, H - 100);
    ctx.lineWidth = 1; ctx.strokeRect(66, 66, W - 132, H - 132);
  } else if (tpl.deco !== "family" && tpl.deco !== "rangoli") {
    ctx.strokeStyle = tpl.accent; ctx.globalAlpha = 0.6; ctx.lineWidth = 2; ctx.strokeRect(40, 40, W - 80, H - 80); ctx.globalAlpha = 1;
  }
  if (tpl.deco === "minimal") {
    const g = ctx.createRadialGradient(W / 2, H * 0.22, 0, W / 2, H * 0.22, 380);
    g.addColorStop(0, "rgba(255,170,60,0.35)"); g.addColorStop(1, "rgba(255,170,60,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // diyas on top
  const topY = H * 0.2;
  if (tpl.deco === "family") [0.2, 0.35, 0.5, 0.65, 0.8].forEach((p, i) => diya(ctx, W * p, topY + (i % 2) * 30, 50, tpl.accent));
  else if (tpl.deco === "diyas") [0.3, 0.5, 0.7].forEach((p, i) => diya(ctx, W * p, topY + (i === 1 ? -20 : 10), i === 1 ? 75 : 55, tpl.accent));
  else diya(ctx, W / 2, topY, 65, tpl.accent);

  // text
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  let y = H * 0.2 + 150 * (H / 1350) + 40;
  ctx.fillStyle = tpl.accent;
  let titleSize = 92;
  ctx.font = `700 ${titleSize}px ${f.display}, serif`;
  while (ctx.measureText(txt.title).width > W - 160 && titleSize > 50) { titleSize -= 4; ctx.font = `700 ${titleSize}px ${f.display}, serif`; }
  ctx.fillText(txt.title, W / 2, y);
  y += 50;
  ctx.fillRect(W / 2 - 120, y, 240, 3);
  y += 90;

  ctx.fillStyle = tpl.text;
  ctx.font = `600 50px ${f.body}, sans-serif`;
  if (d.to.trim()) { ctx.fillText(txt.dear(d.to.trim()), W / 2, y); y += 80; }

  ctx.font = `400 42px ${f.body}, sans-serif`;
  const lines = wrap(ctx, d.msg.trim(), W - 220).slice(0, 9);
  for (const l of lines) { ctx.fillText(l, W / 2, y); y += 64; }

  const sigY = Math.max(y + 60, H - (tpl.deco === "rangoli" ? 420 : 240));
  ctx.globalAlpha = 0.85; ctx.font = `400 36px ${f.body}, sans-serif`;
  ctx.fillText(txt.warm, W / 2, sigY); ctx.globalAlpha = 1;
  ctx.fillStyle = tpl.accent; ctx.font = `700 64px "Cormorant Garamond", ${f.display}, serif`;
  ctx.fillText(d.from.trim() || "—", W / 2, sigY + 80);
}

export function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("export failed"))), "image/png"));
}

export function wishUrl(d: CardData) {
  const u = new URL(window.location.origin + "/wish");
  u.searchParams.set("from", d.from.trim());
  u.searchParams.set("msg", d.msg.trim());
  u.searchParams.set("lang", d.lang);
  u.searchParams.set("t", d.t);
  return u.toString();
}
