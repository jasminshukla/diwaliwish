import { useEffect, useRef } from "react";
import { drawCard, loadCardFonts, type CardData } from "@/lib/card";

export function CardCanvas({ data, className = "" }: { data: CardData; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let off = false;
    if (ref.current) drawCard(ref.current, data);
    loadCardFonts(data.lang).then(() => { if (!off && ref.current) drawCard(ref.current, data); });
    return () => { off = true; };
  }, [data.from, data.to, data.msg, data.lang, data.t]);
  return <canvas ref={ref} className={`h-auto w-full rounded-2xl glow ${className}`} aria-label="Greeting card preview" />;
}
