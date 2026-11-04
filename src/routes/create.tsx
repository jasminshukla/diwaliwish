import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LANGS, type Lang } from "@/lib/i18n";
import { CardCanvas } from "@/components/CardCanvas";
import { useTurnstile } from "@/components/TurnstileField";
import { track } from "@/lib/analytics";
import { SUGGESTIONS, TEMPLATES, canvasToBlob, drawCard, loadCardFonts, type CardData } from "@/lib/card";
import { createWishRequest, recordEvent } from "@/lib/wish-client";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create Your Own Diwali Wish | Happy Diwali 2026" },
      { name: "description", content: "Design a personal Diwali 2026 greeting card in Gujarati, Hindi or English, then download or share it on WhatsApp." },
      { property: "og:title", content: "Create Your Own Diwali Wish" },
      { property: "og:description", content: "Pick a design, add names and a message, and share your Diwali card." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatePage,
});

const UI = {
  gu: { h: "તમારી પોતાની દિવાળી શુભેચ્છા બનાવો", from: "તમારું નામ", msg: "તમારો સંદેશ", sug: "સૂચનો", lang: "ભાષા", tpl: "ડિઝાઇન પસંદ કરો", dl: "ગ્રીટિંગ કાર્ડ ડાઉનલોડ કરો", insta: "પોસ્ટ 1080×1350", story: "સ્ટોરી 1080×1920", wa: "WhatsApp પર મોકલો", share: "અન્ય એપ્સ પર શેર કરો", copy: "લિંક કૉપી કરો", copied: "લિંક કૉપી થઈ!", need: "કૃપા કરીને તમારું નામ અને સંદેશ લખો.", back: "← મુખ્ય પાનું", wishText: (from: string) => `શુભ દિવાળી ૨૦૨૬! 🪔 ${from} તરફથી દિવાળીની હાર્દિક શુભેચ્છાઓ` },
  hi: { h: "अपनी दिवाली शुभकामना बनाएँ", from: "आपका नाम", msg: "आपका संदेश", sug: "सुझाव", lang: "भाषा", tpl: "डिज़ाइन चुनें", dl: "ग्रीटिंग कार्ड डाउनलोड करें", insta: "पोस्ट 1080×1350", story: "स्टोरी 1080×1920", wa: "WhatsApp पर भेजें", share: "अन्य ऐप्स पर शेयर करें", copy: "लिंक कॉपी करें", copied: "लिंक कॉपी हो गया!", need: "कृपया अपना नाम और संदेश लिखें।", back: "← मुख्य पेज", wishText: (from: string) => `शुभ दीपावली २०२६! 🪔 ${from} की ओर से हार्दिक शुभकामनाएँ` },
  en: { h: "Create Your Own Diwali Wish", from: "Your name", msg: "Your message", sug: "Suggestions", lang: "Language", tpl: "Choose a design", dl: "Download Greeting Card", insta: "Post 1080×1350", story: "Story 1080×1920", wa: "Share on WhatsApp", share: "Share with other apps", copy: "Copy Greeting Link", copied: "Link copied!", need: "Please add your name and a message.", back: "← Home", wishText: (from: string) => `Happy Diwali 2026! 🪔 Warm wishes from ${from}` },
};

const DRAFT = "diwali-card-draft";

function CreatePage() {
  const [d, setD] = useState<CardData>({ from: "", to: "", msg: SUGGESTIONS.gu[0]!, lang: "gu", t: "royal" });
  const [size, setSize] = useState<"post" | "story">("post");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const ui = UI[d.lang];
  const turnstile = useTurnstile();
  const idempotencyKeys = useRef(new Map<string, string>());
  const savedWish = useRef<{ key: string; id: string; url: string } | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT) || "null");
      if (saved) setD((p) => ({ ...p, ...saved, to: "" }));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { localStorage.setItem(DRAFT, JSON.stringify(d)); }, [d]);
  useEffect(() => {
    track("create_wish_started", { template: "royal" }, "create-started-card");
    recordEvent({ type: "create_wish_started", template: "royal" });
  }, []);

  const set = (k: keyof CardData, v: string) => setD((p) => ({ ...p, [k]: v }));
  const changeLang = (l: Lang) => {
    if (l !== d.lang) {
      track("language_changed", { language: l });
      recordEvent({ type: "language_changed", language: l, action: l });
    }
    setD((p) => {
    const isSuggestion = Object.values(SUGGESTIONS).some((arr) => arr.includes(p.msg));
    return { ...p, lang: l, msg: isSuggestion ? SUGGESTIONS[l][0]! : p.msg };
  });
  };
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 2500); };
  const payloadKey = () => `${d.from.trim()}|${d.lang}|${d.t}|${d.msg.trim()}`;
  const ensureWish = async () => {
    if (!d.from.trim() || !d.msg.trim()) { flash(ui.need); return null; }
    const key = payloadKey();
    if (savedWish.current?.key === key) return savedWish.current;
    let idempotencyKey = idempotencyKeys.current.get(key);
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      idempotencyKeys.current.set(key, idempotencyKey);
    }
    const turnstileToken = await turnstile.execute();
    const created = await createWishRequest({
      senderName: d.from.trim(),
      language: d.lang,
      template: d.t,
      customMessage: d.msg.trim(),
      turnstileToken,
      idempotencyKey,
    });
    savedWish.current = { key, ...created };
    track("wish_created", { language: d.lang, template: d.t }, `wish:${created.id}`);
    return savedWish.current;
  };

  const render = async () => {
    await loadCardFonts(d.lang);
    const c = document.createElement("canvas");
    drawCard(c, d, 1080, size === "post" ? 1350 : 1920);
    return canvasToBlob(c);
  };
  const fileName = () => `diwali-wish-${(d.from || "card").replace(/[^\p{L}\p{N}]+/gu, "-")}.png`;

  const download = async () => {
    setBusy(true);
    try {
      const wish = await ensureWish();
      if (!wish) return;
      const blob = await render();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fileName();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      track("download_clicked", { language: d.lang, template: d.t });
      recordEvent({ type: "download_clicked", wishId: wish.id, action: "download", language: d.lang, template: d.t });
    } catch (error) { flash(error instanceof Error ? error.message : "Could not create image, please try again."); }
    finally { setBusy(false); }
  };
  const whatsapp = async () => {
    try {
      const wish = await ensureWish();
      if (!wish) return;
      const text = `${ui.wishText(d.from.trim())}\n${wish.url}`;
      track("whatsapp_share_clicked", { language: d.lang, template: d.t, method: "whatsapp" });
      recordEvent({ type: "whatsapp_share_clicked", wishId: wish.id, action: "whatsapp", language: d.lang, template: d.t });
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    } catch (error) { flash(error instanceof Error ? error.message : ui.need); }
  };
  const shareOther = async () => {
    try {
      const wish = await ensureWish();
      if (!wish) return;
      const text = `${ui.wishText(d.from.trim())}\n${wish.url}`;
      const blob = await render();
      const file = new File([blob], fileName(), { type: "image/png" });
      if (navigator.canShare?.({ files: [file] }) || navigator.share) {
        track("share_clicked", { language: d.lang, template: d.t, method: "native" });
        recordEvent({ type: "share_clicked", wishId: wish.id, action: "native", language: d.lang, template: d.t });
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text });
        else await navigator.share({ text: ui.wishText(d.from.trim()), url: wish.url });
        return;
      }
      await navigator.clipboard.writeText(text);
      track("copy_link_clicked", { language: d.lang, template: d.t, method: "copy" });
      recordEvent({ type: "copy_link_clicked", wishId: wish.id, action: "copy", language: d.lang, template: d.t });
      flash(ui.copied);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof Error && error.name !== "AbortError" && error.message) flash(error.message);
    }
  };
  const copy = async () => {
    try {
      const wish = await ensureWish();
      if (!wish) return;
      await navigator.clipboard.writeText(wish.url);
      track("copy_link_clicked", { language: d.lang, template: d.t, method: "copy" });
      recordEvent({ type: "copy_link_clicked", wishId: wish.id, action: "copy", language: d.lang, template: d.t });
      flash(ui.copied);
    } catch (error) { flash(error instanceof Error ? error.message : ui.need); }
  };

  const input = "glass w-full px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:glow";

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-20 pt-6">
      <Link to="/" className="text-sm text-muted-foreground">{ui.back}</Link>
      <h1 className="mt-4 text-center font-display text-4xl font-bold text-gold sm:text-5xl">{ui.h}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="order-2 space-y-5 lg:order-1">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">{ui.lang}</p>
            <div className="glass flex gap-1 p-1">
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => changeLang(l.code)} className={`flex-1 rounded-full py-2 text-sm ${d.lang === l.code ? "btn-gold" : "text-muted-foreground"}`}>{l.label}</button>
              ))}
            </div>
          </div>
          <label className="block"><span className="mb-2 block text-sm text-muted-foreground">{ui.from}</span>
            <input className={input} value={d.from} maxLength={40} placeholder="Rahul Patel" onChange={(e) => set("from", e.target.value)} /></label>
          <label className="block"><span className="mb-2 block text-sm text-muted-foreground">{ui.msg} ({d.msg.length}/280)</span>
            <textarea className={`${input} min-h-28`} value={d.msg} maxLength={280} onChange={(e) => set("msg", e.target.value)} /></label>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">{ui.sug}</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS[d.lang].map((s) => (
                <button key={s} onClick={() => set("msg", s)} className={`glass px-4 py-2 text-left text-sm ${d.msg === s ? "glow" : ""}`}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">{ui.tpl}</p>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
              {TEMPLATES.map((tp) => (
                <button key={tp.id} onClick={() => set("t", tp.id)}
                  className={`glass w-32 shrink-0 snap-start p-2 text-sm ${d.t === tp.id ? "glow" : "opacity-80"}`}>
                  <span className="block h-20 rounded-lg" style={{ background: `linear-gradient(${tp.bg[0]}, ${tp.bg[1]})`, border: `2px solid ${tp.accent}` }} />
                  <span className="mt-2 block">{tp.name[d.lang]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
          <div className="mx-auto max-w-sm"><CardCanvas data={d} /></div>
          <div className="mx-auto mt-5 flex max-w-sm flex-col gap-3">
            <div className="glass flex gap-1 p-1">
              {(["post", "story"] as const).map((s) => (
                <button key={s} onClick={() => setSize(s)} className={`flex-1 rounded-full py-2 text-sm ${size === s ? "btn-gold" : "text-muted-foreground"}`}>{s === "post" ? ui.insta : ui.story}</button>
              ))}
            </div>
            {turnstile.holder}
            <button disabled={busy} onClick={download} className="btn-gold py-4 text-lg">⬇ {ui.dl}</button>
            <button onClick={whatsapp} className="glass py-3 font-semibold text-saffron">{ui.wa}</button>
            <div className="flex gap-3">
              <button onClick={shareOther} className="glass flex-1 py-3 text-sm font-semibold text-primary">{ui.share}</button>
              <button onClick={copy} className="glass flex-1 py-3 text-sm font-semibold text-primary">{ui.copy}</button>
            </div>
            {note && <p role="status" className="rise text-center text-saffron">{note}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
