import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics";

export function SiteAnalytics() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
