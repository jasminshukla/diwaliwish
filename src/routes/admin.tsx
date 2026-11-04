import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useEffect, useState, type FormEvent } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TEMPLATES } from "@/lib/card";
import type { AdminStats } from "@/lib/stats-types";
import type { StatsRange } from "@/lib/wish-rules";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Greeting statistics | Happy Diwali 2026" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

const RANGES: { id: StatsRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

const TOKEN_KEY = "diwali-admin-token";
const GOLD = "#D4AF37";
const SAFFRON = "#FF9933";
const CREAM = "#FFF8E7";
const PURPLE = "#C4B5FD";

const EVENT_LABEL: Record<string, string> = {
  wish_created: "Wish created",
  share_clicked: "Share button clicked",
  whatsapp_share_clicked: "WhatsApp clicked",
  copy_link_clicked: "Link copied",
  greeting_opened: "Greeting opened",
  download_clicked: "Download clicked",
  create_wish_started: "Creator opened",
  language_changed: "Language changed",
  music_played: "Music started",
};

const METHOD_LABEL: Record<string, string> = {
  share_clicked: "Share button",
  whatsapp_share_clicked: "WhatsApp",
  copy_link_clicked: "Link copied",
};

function templateLabel(id: string) {
  return TEMPLATES.find((item) => item.id === id)?.name.en ?? id;
}

function AdminPage() {
  const [range, setRange] = useState<StatsRange>("7d");
  const [token, setToken] = useState("");
  const [draft, setDraft] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  const load = async (nextRange: StatsRange, authToken: string) => {
    setLoading(true);
    setError("");
    const headers = new Headers();
    if (authToken) headers.set("authorization", `Bearer ${authToken}`);
    try {
      const response = await fetch(`/api/admin/stats?range=${nextRange}`, { headers });
      const body = (await response.json().catch(() => null)) as (AdminStats & { error?: string }) | null;
      if (response.status === 401 || response.status === 503) {
        setLocked(true);
        setStats(null);
        setError(body?.error || "This dashboard is private.");
        return;
      }
      if (!response.ok || !body || typeof body.wishesCreated !== "number") {
        setError("Statistics could not be loaded.");
        return;
      }
      setLocked(false);
      setStats(body);
    } catch {
      setError("Statistics could not be loaded. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY) ?? "";
    setToken(saved);
    setDraft(saved);
    void load("7d", saved);
    // The first load is intentional. Later loads go through the range and refresh controls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseRange = (next: StatsRange) => {
    setRange(next);
    void load(next, token);
  };

  const submitToken = (event: FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    sessionStorage.setItem(TOKEN_KEY, next);
    setToken(next);
    void load(range, next);
  };

  const languages = stats
    ? [
        { name: "ગુજરાતી", value: stats.languages.gu },
        { name: "हिंदी", value: stats.languages.hi },
        { name: "English", value: stats.languages.en },
      ]
    : [];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-sm text-primary">Happy Diwali 2026</p>
          <h1 className="font-display text-4xl font-bold text-gold sm:text-5xl">Greeting statistics</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Wish and share totals come from the greeting database. They count actions, not unique people. A share click is not a confirmed delivery.
          </p>
        </div>
        <button type="button" className="glass px-4 py-2 text-sm" onClick={() => void load(range, token)} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Time range">
        {RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => chooseRange(item.id)}
            className={range === item.id ? "btn-gold px-4 py-2 text-sm" : "glass px-4 py-2 text-sm text-muted-foreground"}
          >
            {item.label}
          </button>
        ))}
      </div>

      {locked && (
        <form onSubmit={submitToken} className="card-solid mt-6 max-w-md p-5">
          <h2 className="font-display text-2xl text-gold">Private dashboard</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with Cloudflare Access, or enter the admin token. Statistics stay on the server until that check passes.
          </p>
          <label className="mt-4 block text-sm text-muted-foreground">
            Admin token
            <input
              type="password"
              value={draft}
              autoComplete="current-password"
              onChange={(event) => setDraft(event.target.value)}
              className="glass mt-2 w-full px-4 py-3 outline-none"
            />
          </label>
          <button className="btn-gold mt-4 px-5 py-3 text-sm" type="submit">
            Unlock
          </button>
        </form>
      )}

      {error && !locked && <p className="mt-6 text-saffron">{error}</p>}
      {locked && error && <p className="mt-3 text-sm text-saffron">{error}</p>}

      {stats && (
        <div className="mt-8 space-y-8">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <VisitorStat stats={stats} />
            <Stat label="Wishes created" value={stats.wishesCreated} note="Saved greetings" />
            <Stat label="Share button clicks" value={stats.shareClicks} note="Not confirmed deliveries" />
            <Stat label="WhatsApp clicks" value={stats.whatsappShareClicks} note="Opens WhatsApp only" />
            <Stat label="Links copied" value={stats.copiedLinks} note="Clipboard succeeded" />
            <Stat label="Greeting opens" value={stats.greetingOpens} note="Personalized links opened" />
            <Stat label="Downloads" value={stats.downloads} note="Image download started" />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <figure className="card-solid p-4">
              <figcaption className="font-display text-2xl text-gold">Daily wishes</figcaption>
              <div className="mt-4 h-60">
                {stats.daily.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No wishes in this period yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.daily}>
                      <XAxis dataKey="date" tick={{ fill: CREAM, fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={{ fill: CREAM, fontSize: 11 }} width={32} />
                      <Tooltip contentStyle={{ background: "#12182e", border: "1px solid rgba(212,175,55,.45)", color: CREAM }} />
                      <Bar dataKey="wishes" fill={GOLD} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </figure>
            <figure className="card-solid p-4">
              <figcaption className="font-display text-2xl text-gold">Language of wishes</figcaption>
              <div className="mt-4 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={languages} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3}>
                      {languages.map((entry, index) => (
                        <Cell key={entry.name} fill={[GOLD, SAFFRON, PURPLE][index] ?? CREAM} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#12182e", border: "1px solid rgba(212,175,55,.45)", color: CREAM }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {languages.map((item) => (
                  <li key={item.name} className="flex justify-between">
                    <span>{item.name}</span>
                    <span>{item.value}</span>
                  </li>
                ))}
              </ul>
            </figure>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <figure className="card-solid p-4">
              <figcaption className="font-display text-2xl text-gold">Sharing methods</figcaption>
              <div className="mt-4 h-56">
                {stats.shareMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No share actions in this period yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.shareMethods.map((item) => ({ ...item, label: METHOD_LABEL[item.method] ?? item.method }))} layout="vertical">
                      <XAxis type="number" allowDecimals={false} tick={{ fill: CREAM, fontSize: 11 }} />
                      <YAxis type="category" dataKey="label" width={110} tick={{ fill: CREAM, fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "#12182e", border: "1px solid rgba(212,175,55,.45)", color: CREAM }} />
                      <Bar dataKey="count" fill={SAFFRON} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </figure>
            <section className="card-solid p-4">
              <h2 className="font-display text-2xl text-gold">Popular designs</h2>
              {stats.templates.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No wishes in this period yet.</p>
              ) : (
                <ol className="mt-4 space-y-2">
                  {stats.templates.map((item) => (
                    <li key={item.template} className="flex items-center justify-between gap-3 text-sm">
                      <span>{templateLabel(item.template)}</span>
                      <span className="text-primary">{item.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </section>

          <section className="card-solid p-4">
            <h2 className="font-display text-2xl text-gold">Recent activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">Names and greeting text stay out of this list.</p>
            {stats.recent.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No activity in this period yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {stats.recent.map((item, index) => (
                  <li key={`${item.createdAt}-${index}`} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span>{EVENT_LABEL[item.type] ?? item.type}</span>
                    <span className="text-muted-foreground">
                      {[item.language, item.template ? templateLabel(item.template) : "", item.action].filter(Boolean).join(" · ")}
                      {" · "}
                      {safeAgo(item.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <section className="card-solid p-4">
      <h2 className="text-sm text-muted-foreground">{label}</h2>
      <p className="mt-2 font-sans text-4xl font-semibold tabular-nums text-gold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </section>
  );
}

function VisitorStat({ stats }: { stats: AdminStats }) {
  return (
    <section className="card-solid p-4 sm:col-span-2 lg:col-span-1">
      <h2 className="text-sm text-muted-foreground">Website visitors</h2>
      {stats.visitors.available ? (
        <>
          <p className="mt-2 font-sans text-4xl font-semibold tabular-nums text-gold">{stats.visitors.totalUsers}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Google Analytics 4 users · {stats.visitors.sessions} sessions
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 font-display text-2xl text-gold">Not connected</p>
          <p className="mt-1 text-xs text-muted-foreground">{stats.visitors.reason}</p>
        </>
      )}
    </section>
  );
}

function safeAgo(value: string) {
  try {
    return formatDistanceToNow(parseISO(value), { addSuffix: true });
  } catch {
    return value;
  }
}
