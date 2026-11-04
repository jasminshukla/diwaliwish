import { Link, useRouterState } from "@tanstack/react-router";

export function PrivacyCorner() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname.startsWith("/admin") || pathname.startsWith("/privacy")) return null;

  return (
    <Link
      to="/privacy"
      aria-label="Privacy"
      title="Privacy"
      className="glass z-50 grid h-9 w-9 place-items-center text-primary"
      style={{ position: "fixed", bottom: "1.25rem", left: "1.25rem" }}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 3.5 5.5 6.2v5.2c0 4.2 2.8 7.2 6.5 8.6 3.7-1.4 6.5-4.4 6.5-8.6V6.2L12 3.5Z" />
        <path d="M9.2 12.1 11 13.9l3.8-4" />
      </svg>
    </Link>
  );
}
