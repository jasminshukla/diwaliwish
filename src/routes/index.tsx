import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { LANGS, T, type Lang } from "@/lib/i18n";
import { Diya, Mandala } from "@/components/Diya";
import { Fireworks, type FireworksHandle } from "@/components/Fireworks";
import heroImg from "@/assets/diwali-hero.jpg";
import rangoliImg from "@/assets/rangoli.jpg";
import toranImg from "@/assets/marigold-toran.png";
import { useTurnstile } from "@/components/TurnstileField";
import { track } from "@/lib/analytics";
import { createWishRequest, recordEvent } from "@/lib/wish-client";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { from?: string } => {
    const out: { from?: string } = {};
    if (typeof s["from"] === "string" && s["from"].trim()) out.from = s["from"].trim().slice(0, 40);
    return out;
  },
  head: () => ({
    meta: [
      { title: "Happy Diwali 2026 | Create & Share Wishes" },
      { name: "description", content: "A glowing Diwali 2026 greeting. Light a diya, celebrate with fireworks, and send personal wishes." },
      { property: "og:title", content: "Happy Diwali 2026 | Create & Share Wishes" },
      { property: "og:description", content: "Light a diya and share personal Diwali wishes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULT_SENDER = "Jasmin Shukla";
const hasNativeShare = () => typeof navigator.share === "function";
const SENDER_KEY = "diwali-sender-name";
const cleanName = (v: string) => v.replace(/[<>{}\[\]\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);

function Index() {
  const { from } = Route.useSearch();
  const sender = from || DEFAULT_SENDER;
  const [editorOpen, setEditorOpen] = useState(false);
  const [senderInput, setSenderInput] = useState("");
  const [senderError, setSenderError] = useState("");
  useEffect(() => { setSenderInput(localStorage.getItem(SENDER_KEY) || ""); }, []);
  const navigate = useNavigate({ from: "/" });
  const [lang, setLang] = useState<Lang>("gu");
  const [started, setStarted] = useState(false);
  const [lit, setLit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const fw = useRef<FireworksHandle>(null);
  const turnstile = useTurnstile();
  const idempotencyKeys = useRef(new Map<string, string>());
  const savedWish = useRef<{ key: string; id: string; url: string } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const t = T[lang];

  useEffect(() => {
    const a = new Audio("/audio/diwali-instrumental.mp3");
    a.loop = true; a.volume = 0.4;
    a.addEventListener("canplaythrough", () => setHasAudio(true), { once: true });
    a.addEventListener("error", () => setHasAudio(false));
    audio.current = a;
    return () => a.pause();
  }, []);

  const noteMusic = () => {
    track("music_played", { language: lang }, "music");
    recordEvent({ type: "music_played", language: lang });
  };
  const begin = () => {
    setStarted(true);
    setTimeout(() => fw.current?.burst(3), 2600);
    audio.current?.play().then(() => { setPlaying(true); noteMusic(); }).catch(() => {});
  };
  const toggleMusic = () => {
    const a = audio.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else a.play().then(() => { setPlaying(true); noteMusic(); }).catch(() => {});
  };

  const persistWish = async (name: string) => {
    const key = `${name}|${lang}|royal`;
    if (savedWish.current?.key === key) return savedWish.current;
    let idempotencyKey = idempotencyKeys.current.get(key);
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      idempotencyKeys.current.set(key, idempotencyKey);
    }
    const turnstileToken = await turnstile.execute();
    const saved = await createWishRequest({
      senderName: name,
      language: lang,
      template: "royal",
      customMessage: null,
      turnstileToken,
      idempotencyKey,
    });
    savedWish.current = { key, ...saved };
    track("wish_created", { language: lang, template: "royal" }, `wish:${saved.id}`);
    return savedWish.current;
  };
  const linkForShare = async () => {
    if (!from) return { url: `${window.location.origin}/`, id: null as string | null };
    const saved = await persistWish(from);
    return { url: saved.url, id: saved.id };
  };
  const failShare = (error: unknown) => {
    setShareNote(error instanceof Error ? error.message : t.saveError);
  };
  const nativeShare = async () => {
    try {
      const link = await linkForShare();
      track("share_clicked", { language: lang, template: from ? "royal" : "homepage", method: "native" });
      recordEvent({ type: "share_clicked", wishId: link.id, action: hasNativeShare() ? "native" : "whatsapp-fallback", language: lang, template: from ? "royal" : null });
      const text = t.shareText(undefined, sender);
      if (hasNativeShare()) {
        try { await navigator.share({ text, url: link.url }); } catch { /* A closed dialog is not a confirmed delivery. */ }
        return;
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${link.url}`)}`, "_blank", "noopener,noreferrer");
    } catch (error) { failShare(error); }
  };
  const shareWhatsApp = async () => {
    try {
      const link = await linkForShare();
      const text = `${t.shareText(undefined, sender)}\n${link.url}`;
      track("whatsapp_share_clicked", { language: lang, template: from ? "royal" : "homepage", method: "whatsapp" });
      recordEvent({ type: "whatsapp_share_clicked", wishId: link.id, action: "whatsapp", language: lang, template: from ? "royal" : null });
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    } catch (error) { failShare(error); }
  };
  const copy = async () => {
    try {
      const link = await linkForShare();
      await navigator.clipboard.writeText(link.url);
      track("copy_link_clicked", { language: lang, template: from ? "royal" : "homepage", method: "copy" });
      recordEvent({ type: "copy_link_clicked", wishId: link.id, action: "copy", language: lang, template: from ? "royal" : null });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) { failShare(error); }
  };

  const saveSender = async (e: FormEvent) => {
    e.preventDefault();
    const n = cleanName(senderInput);
    if (!n) { setSenderError(t.nameError); return; }
    setSaving(true);
    try {
      await persistWish(n);
      localStorage.setItem(SENDER_KEY, n);
      navigate({ search: { from: n } });
      setEditorOpen(false);
      setShareNote("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      fw.current?.burst(3);
    } catch (error) {
      setSenderError(error instanceof Error ? error.message : t.saveError);
    } finally {
      setSaving(false);
    }
  };
  const shareMine = async () => {
    try {
      const link = await linkForShare();
      const text = t.waMsg(sender, link.url);
      track("share_clicked", { language: lang, template: "royal", method: "native" });
      recordEvent({ type: "share_clicked", wishId: link.id, action: hasNativeShare() ? "native" : "whatsapp-fallback", language: lang, template: "royal" });
      if (hasNativeShare()) {
        try { await navigator.share({ text }); } catch { /* not a confirmed delivery */ }
        return;
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    } catch (error) { failShare(error); }
  };
  const openEditor = () => {
    setEditorOpen(true);
    track("create_wish_started", { language: lang, template: "royal" }, "create-started-home");
    recordEvent({ type: "create_wish_started", language: lang, template: "royal" });
  };
  const lightDiya = () => { setLit(true); fw.current?.burst(1); };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Fireworks ref={fw} />
      <Particles />

      {/* Language selector */}
      <nav className="fixed left-1/2 top-3 z-50 -translate-x-1/2 glass flex gap-1 p-1">
        {LANGS.map((l) => (
          <button key={l.code} onClick={() => {
            if (l.code !== lang) {
              track("language_changed", { language: l.code });
              recordEvent({ type: "language_changed", language: l.code, action: l.code });
            }
            setLang(l.code);
          }}
            className={`rounded-full px-4 py-2 text-sm transition ${lang === l.code ? "btn-gold" : "text-muted-foreground"}`}>
            {l.label}
          </button>
        ))}
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-10 pt-24 text-center">
        <img src={heroImg} alt="Glowing diyas, marigolds and rangoli on Diwali night" width={1920} height={1088}
          className="hero-photo absolute inset-0 h-full w-full object-cover" />
        <div className="hero-veil absolute inset-0" aria-hidden />
        <img src={toranImg} alt="" aria-hidden width={1536} height={512} className="toran absolute left-0 right-0 top-0 mx-auto w-full max-w-4xl" />
        <Mandala className={`absolute w-[140vw] max-w-[760px] ${started ? "mandala mandala-soft" : "opacity-0"}`} />
        <div className="relative">
          <Diya lit={started} size={started ? 110 : 150} />
        </div>
        {!started ? (
          <div className="relative rise">
            <p className="font-display text-4xl font-bold text-gold sm:text-6xl">{t.title}</p>
            <p className="mx-auto mt-3 max-w-sm text-muted-foreground">✨ {t.p1}</p>
            <button onClick={begin} className="btn-gold mt-8 px-10 py-5 text-lg">🪔 {t.tap}</button>
          </div>
        ) : (
          <>
            <h1 className="rise relative mt-6 font-display text-5xl font-bold leading-tight text-gold drop-shadow-lg sm:text-7xl" style={{ animationDelay: "1.2s" }}>{t.title}</h1>
            <div className="rise card-solid relative mt-6 max-w-xl p-6 text-lg leading-relaxed" style={{ animationDelay: "1.9s" }}>
              <p>{t.p1}</p>
              <p className="mt-3 text-muted-foreground">{t.p2}</p>
              <p className="mt-5 text-sm text-muted-foreground">{t.sig}</p>
              <p className="font-display text-2xl text-gold">{sender}</p>
            </div>
            <button onClick={() => fw.current?.burst(5)} className="rise btn-gold mt-8 px-8 py-4 text-lg" style={{ animationDelay: "2.4s" }}>🎆 {t.celebrate}</button>
            <Link to="/create" className="rise glass glow mt-4 px-8 py-4 text-lg font-semibold text-primary" style={{ animationDelay: "2.7s" }}>💌 {({ gu: "તમારી પોતાની દિવાળી શુભેચ્છા બનાવો", hi: "अपनी दिवाली शुभकामना बनाएँ", en: "Create Your Own Diwali Wish" })[lang]}</Link>
            <div className="rise mt-4 flex w-full max-w-md flex-col gap-3" style={{ animationDelay: "3s" }}>
              <button onClick={openEditor} className="btn-gold px-8 py-4 text-lg">✍️ {t.yours}</button>
              {from && <button onClick={shareMine} className="glass px-8 py-4 text-lg font-semibold text-saffron">📲 {t.shareMine}</button>}
            </div>
          </>
        )}
      </section>

      {started && (
        <>
          {/* Diya lighting */}
          <section className="mx-auto max-w-xl px-5 py-16 text-center">
            <h2 className="font-display text-3xl font-bold text-gold sm:text-4xl">{t.diyaTitle}</h2>
            <div className="card-solid relative mt-8 flex flex-col items-center overflow-hidden p-8">
              <img src={rangoliImg} alt="" aria-hidden loading="lazy" width={1024} height={1024} className="absolute inset-0 h-full w-full object-cover opacity-25" />
              <div className="absolute inset-0 hero-veil" aria-hidden />
              <div className={lit ? "rounded-full glow" : ""}><Diya lit={lit} size={160} /></div>
              {!lit ? (
                <button onClick={lightDiya} className="btn-gold mt-6 px-8 py-4">🪔 {t.lightBtn}</button>
              ) : (
                <div className="rise mt-6">
                  <p className="text-saffron font-semibold">{t.lit}</p>
                  <p className="mt-2 text-lg">{t.blessing}</p>
                </div>
              )}
            </div>
          </section>

          {from && (
            <section className="mx-auto max-w-xl px-5 py-6 text-center">
              <div className="card-solid p-6">
                <p className="font-display text-2xl font-bold text-gold">{t.wantOwn}</p>
                <button onClick={openEditor} className="btn-gold mt-4 px-8 py-4 text-lg">✍️ {t.createWithName}</button>
              </div>
            </section>
          )}

          {/* Personalized */}
          <section className="mx-auto max-w-xl px-5 py-12 text-center">
            <h2 className="font-display text-3xl font-bold text-gold sm:text-4xl">{t.share}</h2>
            <div className="mt-8 flex flex-col gap-3">
              <button onClick={nativeShare} className="btn-gold px-6 py-4 text-lg">💌 {t.share}</button>
              <div className="flex gap-3">
                <button type="button" onClick={shareWhatsApp} className="glass flex-1 py-3 font-semibold text-saffron">{t.whatsapp}</button>
                <button onClick={copy} className="glass flex-1 py-3 font-semibold text-primary">{copied ? t.copied : t.copy}</button>
              </div>
              {shareNote && <p role="alert" className="text-sm text-saffron">{shareNote}</p>}
            </div>
          </section>

          <footer className="mt-12 flex flex-col items-center gap-3 pb-16 text-center">
            <div className="h-px w-48" style={{ background: "var(--gradient-gold)" }} />
            <Diya lit size={56} />
            <p className="text-muted-foreground">{t.footer1}</p>
            <p className="text-sm text-muted-foreground">{t.sig} <span className="font-display text-lg text-gold">{sender}</span></p>
            <p className="font-display text-2xl text-gold">{t.title}</p>
          </footer>
        </>
      )}

      {hasAudio && started && (
        <button onClick={toggleMusic} aria-label={playing ? "Pause music" : "Play music"}
          className="glass glow fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center text-2xl">
          {playing ? "🔊" : "🔈"}
        </button>
      )}
      {editorOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label={t.yours}
          onClick={(e) => { if (e.target === e.currentTarget) setEditorOpen(false); }}>
          <form onSubmit={saveSender} className="card-solid rise w-full max-w-md rounded-b-none p-6 text-center sm:rounded-b-[var(--radius-2xl)]">
            <div className="flex items-center justify-between">
              <p className="font-display text-2xl font-bold text-gold">{t.yours}</p>
              <button type="button" onClick={() => setEditorOpen(false)} aria-label={t.close} className="text-2xl text-muted-foreground">×</button>
            </div>
            <label className="mt-5 block text-left">
              <span className="mb-2 block text-sm text-muted-foreground">{t.enterName}</span>
              <input autoFocus value={senderInput} maxLength={40} placeholder="Rahul Patel"
                onChange={(e) => { setSenderInput(e.target.value); setSenderError(""); }}
                className="glass w-full px-5 py-4 text-lg outline-none placeholder:text-muted-foreground focus:glow" />
            </label>
            {senderError && <p role="alert" className="mt-2 text-sm text-saffron">{senderError}</p>}
            <div className="glass mt-5 p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.preview}</p>
              <p className="mt-2 font-display text-3xl font-bold text-gold">{t.title}</p>
              <p className="mt-2 text-sm">{t.p1}</p>
              <p className="mt-3 text-sm text-muted-foreground">{t.sig}</p>
              <p className="font-display text-2xl text-gold">{cleanName(senderInput) || "…"}</p>
            </div>
            {turnstile.holder}
            <button disabled={saving} className="btn-gold mt-5 w-full py-4 text-lg">🪔 {saving ? "…" : t.createWish}</button>
          </form>
        </div>
      )}
    </main>
  );
}

function Particles() {
  const [dots, setDots] = useState<{ l: number; d: number; s: number; delay: number }[]>([]);
  useEffect(() => {
    setDots(Array.from({ length: 24 }, () => ({ l: Math.random() * 100, d: 10 + Math.random() * 14, s: 2 + Math.random() * 4, delay: Math.random() * -20 })));
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      {dots.map((p, i) => (
        <span key={i} className="floaty absolute bottom-0 rounded-full bg-primary glow"
          style={{ left: `${p.l}%`, width: p.s, height: p.s, animationDuration: `${p.d}s`, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
}
