import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { CardCanvas } from "@/components/CardCanvas";
import { Diya, Mandala } from "@/components/Diya";
import { Fireworks, type FireworksHandle } from "@/components/Fireworks";
import { track } from "@/lib/analytics";
import { T, type Lang } from "@/lib/i18n";
import type { PublicWish } from "@/lib/public-wish";
import { isPublicId } from "@/lib/wish-rules";
import { recordEvent } from "@/lib/wish-client";

const loadWish = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data }): Promise<PublicWish | null> => {
    if (!isPublicId(data)) return null;
    const { findWishByPublicId } = await import("@/server/wishes");
    return findWishByPublicId(data);
  });

export const Route = createFileRoute("/w/$id")({
  loader: async ({ params }) => {
    const wish = await loadWish({ data: params.id });
    if (!wish) throw notFound();
    return wish;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Happy Diwali 2026 — a wish from ${loaderData.senderName}` : "Happy Diwali 2026" },
      { name: "description", content: "Open a personal Diwali 2026 greeting." },
      { property: "og:title", content: loaderData ? `A Diwali wish from ${loaderData.senderName}` : "Happy Diwali 2026" },
      { property: "og:description", content: "A personal Diwali 2026 greeting is waiting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  notFoundComponent: WishMissing,
  component: WishLinkPage,
});

const OWN = {
  gu: "તમારી પોતાની દિવાળી શુભેચ્છા બનાવો",
  hi: "अपनी दिवाली शुभकामना बनाएँ",
  en: "Create Your Own Wish",
};

function WishLinkPage() {
  const wish = Route.useLoaderData();
  const lang: Lang = wish.language;
  const copy = T[lang];
  const [playing, setPlaying] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const fw = useRef<FireworksHandle>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    track("greeting_opened", { language: wish.language, template: wish.template }, `open:${wish.id}`);
    recordEvent({
      type: "greeting_opened",
      wishId: wish.id,
      language: wish.language,
      template: wish.template,
      action: "open",
    });
    const timer = window.setTimeout(() => fw.current?.burst(4), 900);
    return () => window.clearTimeout(timer);
  }, [wish.id, wish.language, wish.template]);

  useEffect(() => {
    const a = new Audio("/audio/diwali-instrumental.mp3");
    a.loop = true;
    a.volume = 0.4;
    a.addEventListener("canplaythrough", () => setHasAudio(true), { once: true });
    audio.current = a;
    return () => a.pause();
  }, []);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play()
        .then(() => {
          setPlaying(true);
          track("music_played", { language: lang }, "music");
          recordEvent({ type: "music_played", language: lang, template: wish.template, wishId: wish.id });
        })
        .catch(() => {});
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-5 pb-24 pt-16 text-center">
      <Fireworks ref={fw} />
      <Mandala className="mandala absolute top-10 w-[140vw] max-w-[700px]" />
      <div className="relative">
        <Diya lit size={110} />
      </div>
      <h1 className="rise relative mt-6 font-display text-5xl font-bold leading-tight text-gold sm:text-7xl">{copy.title}</h1>
      <div className="rise card-solid relative mt-6 w-full max-w-xl p-6 text-lg leading-relaxed">
        <p>{wish.customMessage || copy.p1}</p>
        {!wish.customMessage && <p className="mt-3 text-muted-foreground">{copy.p2}</p>}
        <p className="mt-5 text-sm text-muted-foreground">{copy.sig}</p>
        <p className="font-display text-2xl text-gold">{wish.senderName}</p>
      </div>
      {wish.customMessage && (
        <div className="relative mt-8 w-full max-w-sm">
          <CardCanvas data={{ from: wish.senderName, to: "", msg: wish.customMessage, lang, t: wish.template }} />
        </div>
      )}
      <Link to="/create" className="rise btn-gold mt-8 px-8 py-4 text-lg">
        💌 {OWN[lang]}
      </Link>
      {hasAudio && (
        <button
          onClick={toggle}
          aria-label={playing ? "Pause music" : "Play music"}
          className="glass glow fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center text-2xl"
        >
          {playing ? "🔊" : "🔈"}
        </button>
      )}
    </main>
  );
}

function WishMissing() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl text-gold">This greeting is unavailable</h1>
      <p className="mt-3 max-w-md text-muted-foreground">The link may have expired or the greeting was removed.</p>
      <Link to="/" className="btn-gold mt-8 px-8 py-4">
        Happy Diwali 2026
      </Link>
    </main>
  );
}
