import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export type FireworksHandle = { burst: (count?: number) => void };

type P = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; g: number };
const COLORS = ["#D4AF37", "#FF9933", "#FF6B20", "#FFF8E7", "#FFD86B"];

export const Fireworks = forwardRef<FireworksHandle>(function Fireworks(_, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const parts = useRef<P[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const resize = () => { c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); };
    resize();
    addEventListener("resize", resize);
    const loop = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = "lighter";
      parts.current = parts.current.filter((p) => p.life > 0);
      for (const p of parts.current) {
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.vy *= 0.985; p.life -= 0.012;
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
      raf.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf.current); removeEventListener("resize", resize); };
  }, []);

  useImperativeHandle(ref, () => ({
    burst(count = 4) {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const n = reduced ? 1 : count;
      const per = innerWidth < 500 ? 45 : 80;
      for (let b = 0; b < n; b++) {
        setTimeout(() => {
          const x = innerWidth * (0.15 + Math.random() * 0.7);
          const y = innerHeight * (0.15 + Math.random() * 0.35);
          for (let i = 0; i < per; i++) {
            const a = (i / per) * Math.PI * 2, s = 1.5 + Math.random() * 3.5;
            parts.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color: COLORS[(Math.random() * COLORS.length) | 0]!, size: 1.2 + Math.random() * 1.8, g: 0.04 });
          }
          for (let i = 0; i < 20; i++) {
            parts.current.push({ x: Math.random() * innerWidth, y: -10, vx: (Math.random() - 0.5) * 1.5, vy: 1 + Math.random() * 2, life: 1.4, color: COLORS[(Math.random() * COLORS.length) | 0]!, size: 2.5, g: 0.01 });
          }
        }, b * 350);
      }
    },
  }));

  return <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-40 h-full w-full" aria-hidden />;
});
