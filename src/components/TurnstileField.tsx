import { useCallback, useEffect, useRef } from "react";
import { loadPublicConfig } from "@/lib/wish-client";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      execute: (id: string) => void;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Turnstile failed to load")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset["turnstile"] = "1";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Turnstile failed to load"));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function useTurnstile() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const pending = useRef<((token: string) => void) | null>(null);

  useEffect(() => {
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  const execute = useCallback(async () => {
    const config = await loadPublicConfig();
    if (!config.turnstileSiteKey) {
      if (config.turnstileRequired) throw new Error("Greeting protection is not configured yet.");
      return "";
    }
    await loadTurnstileScript();
    const host = hostRef.current;
    if (!host || !window.turnstile) throw new Error("Greeting protection is still loading. Try again.");
    if (!widgetId.current) {
      widgetId.current = window.turnstile.render(host, {
        sitekey: config.turnstileSiteKey,
        size: "invisible",
        execution: "execute",
        callback: (token: string) => pending.current?.(token),
        "error-callback": () => pending.current?.(""),
      });
    }
    const token = await new Promise<string>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Greeting protection timed out. Try again.")), 20000);
      pending.current = (value) => {
        window.clearTimeout(timer);
        pending.current = null;
        if (!value) reject(new Error("Please confirm you are a person and try again."));
        else resolve(value);
      };
      window.turnstile?.execute(widgetId.current!);
    });
    window.turnstile.reset(widgetId.current);
    return token;
  }, []);

  const holder = <div ref={hostRef} className="hidden" aria-hidden />;
  return { execute, holder };
}
