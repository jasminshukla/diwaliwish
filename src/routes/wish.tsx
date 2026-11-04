import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { CardCanvas } from "@/components/CardCanvas";
import { Diya, Mandala } from "@/components/Diya";
import { Fireworks, type FireworksHandle } from "@/components/Fireworks";
import { TEMPLATES } from "@/lib/card";
import { shareMeta } from "@/lib/share-meta";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export const Route = createFileRoute("/wish")({
  validateSearch: (s: Record<string, unknown>) => ({
    from: str(s["from"], 40),
    msg: str(s["msg"], 280),
    lang: str(s["lang"], 2),
    t: str(s["t"], 20),
  }),
  head: () => ({
    meta: shareMeta({
      title: "A Diwali Wish For You",
      description: "Open your personal Diwali 2026 greeting card.",
      path: "/wish",
    }),
  }),
  component: WishPage,
});

const UI = {
  gu: { open: "તમારી શુભેચ્છા ખોલો", for: "દિવાળીની શુભેચ્છાઓ", from: (n: string) => `${n} તરફથી`, back: "દિવાળીની શુભેચ્છા પાછી મોકલો", own: "તમારું પોતાનું કાર્ડ બનાવો" },
  hi: { open: "अपनी शुभकामना खोलें", for: "दीपावली की शुभकामनाएँ", from: (n: string) => `${n} की ओर से`, back: "दीपावली की शुभकामना वापस भेजें", own: "अपना कार्ड बनाएँ" },
  en: { open: "Open your wish", for: "Diwali wishes from", from: (n: string) => `From ${n}`, back: "Send a Diwali Wish Back", own: "Create your own card" },
};

function WishPage() {
  const s = Route.useSearch();
  const lang: Lang = s.lang === "hi" || s.lang === "en" ? s.lang : "gu";
  const t = TEMPLATES.some((x) => x.id === s.t) ? s.t : "royal";
  const ui = UI[lang];
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const fw = useRef<FireworksHandle>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio("/audio/diwali-instrumental.mp3");
    a.loop = true; a.volume = 0.4;
    a.addEventListener("canplaythrough", () => setHasAudio(true), { once: true });
    audio.current = a;
    return () => a.pause();
  }, []);

  const reveal = () => { setOpen(true); setTimeout(() => fw.current?.burst(4), 900); };
  const toggle = () => {
    const a = audio.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else a.play().then(() => setPlaying(true)).catch(() => {});
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-5 pb-16 pt-12 text-center">
      <Fireworks ref={fw} />
      <Mandala className="mandala absolute top-10 w-[140vw] max-w-[700px]" />
      <div className="relative"><Diya lit size={100} /></div>
      <p className="rise mt-4 text-muted-foreground" style={{ animationDelay: ".5s" }}>{ui.for}</p>
      <h1 className="rise font-display text-5xl font-bold text-gold sm:text-6xl" style={{ animationDelay: ".9s" }}>{s.from || "✨"}</h1>
      {!open ? (
        <button onClick={reveal} className="rise btn-gold mt-10 px-8 py-4 text-lg" style={{ animationDelay: "1.4s" }}>🪔 {ui.open}</button>
      ) : (
        <div className="relative mt-8 w-full max-w-sm">
          <div className="rise"><CardCanvas data={{ from: s.from, to: "", msg: s.msg, lang, t }} /></div>
          
          <div className="rise mt-6 flex flex-col gap-3" style={{ animationDelay: ".8s" }}>
            <Link to="/create" search={{}} className="btn-gold py-4 text-lg">💌 {ui.back}</Link>
            <Link to="/create" search={{}} className="glass py-3 font-semibold text-primary">{ui.own}</Link>
          </div>
        </div>
      )}
      {hasAudio && open && (
        <button onClick={toggle} aria-label={playing ? "Pause music" : "Play music"} className="glass glow fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center text-2xl">{playing ? "🔊" : "🔈"}</button>
      )}
    </main>
  );
}
