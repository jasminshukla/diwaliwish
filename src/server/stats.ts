import type { AdminStats } from "@/lib/stats-types";
import { rangeStartIso, type StatsRange } from "@/lib/wish-rules";
import { all, first } from "./db";
import { ga4Visitors } from "./ga4";

type CountRow = { n: number };
type GroupRow = { key: string; n: number };
type DayRow = { day: string; n: number };
type RecentRow = { event_type: string; language: string; template: string; action: string; created_at: string };

function sinceClause(start: string | null, column = "created_at"): { sql: string; params: string[] } {
  if (!start) return { sql: "", params: [] };
  return { sql: ` WHERE ${column} >= ?`, params: [start] };
}

export async function loadAdminStats(range: StatsRange, now = new Date()): Promise<AdminStats> {
  const start = rangeStartIso(range, now);
  const wishWhere = sinceClause(start);
  const eventWhere = sinceClause(start);
  const [wishCount, eventGroups, languages, templates, daily, methods, recent, visitors] = await Promise.all([
    first<CountRow>(`SELECT COUNT(*) AS n FROM wishes${wishWhere.sql}`, wishWhere.params),
    all<GroupRow>(
      `SELECT event_type AS key, COUNT(*) AS n FROM events${eventWhere.sql} GROUP BY event_type`,
      eventWhere.params,
    ),
    all<GroupRow>(
      `SELECT language AS key, COUNT(*) AS n FROM wishes${wishWhere.sql} GROUP BY language`,
      wishWhere.params,
    ),
    all<GroupRow>(
      `SELECT template AS key, COUNT(*) AS n FROM wishes${wishWhere.sql} GROUP BY template ORDER BY n DESC`,
      wishWhere.params,
    ),
    all<DayRow>(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM wishes${wishWhere.sql} GROUP BY day ORDER BY day`,
      wishWhere.params,
    ),
    all<GroupRow>(
      `SELECT event_type AS key, COUNT(*) AS n FROM events
       ${eventWhere.sql ? eventWhere.sql + " AND" : " WHERE"} event_type IN ('share_clicked', 'whatsapp_share_clicked', 'copy_link_clicked')
       GROUP BY event_type ORDER BY n DESC`,
      eventWhere.params,
    ),
    all<RecentRow>(
      `SELECT event_type, language, template, action, created_at FROM (
         SELECT 'wish_created' AS event_type, language, template, '' AS action, created_at FROM wishes${wishWhere.sql}
         UNION ALL
         SELECT event_type, ifnull(language, ''), ifnull(template, ''), ifnull(action, ''), created_at FROM events${eventWhere.sql}
       ) ORDER BY created_at DESC LIMIT 12`,
      [...wishWhere.params, ...eventWhere.params],
    ),
    ga4Visitors(range),
  ]);

  const events = new Map(eventGroups.map((row) => [row.key, Number(row.n)]));
  const languageCounts = { gu: 0, hi: 0, en: 0 };
  for (const row of languages) {
    if (row.key === "gu" || row.key === "hi" || row.key === "en") languageCounts[row.key] = Number(row.n);
  }

  return {
    range,
    generatedAt: now.toISOString(),
    wishesCreated: Number(wishCount?.n ?? 0),
    shareClicks: events.get("share_clicked") ?? 0,
    whatsappShareClicks: events.get("whatsapp_share_clicked") ?? 0,
    copiedLinks: events.get("copy_link_clicked") ?? 0,
    greetingOpens: events.get("greeting_opened") ?? 0,
    downloads: events.get("download_clicked") ?? 0,
    languages: languageCounts,
    templates: templates.map((row) => ({ template: row.key, count: Number(row.n) })),
    daily: daily.map((row) => ({ date: row.day, wishes: Number(row.n) })),
    shareMethods: methods.map((row) => ({ method: row.key, count: Number(row.n) })),
    recent: recent.map((row) => ({
      type: row.event_type,
      language: row.language,
      template: row.template,
      action: row.action,
      createdAt: row.created_at,
    })),
    visitors,
  };
}
