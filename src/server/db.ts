import { bindings } from "./env";

export function getDb(): D1Database {
  const db = bindings().DB;
  if (!db) throw new Error("D1 binding DB is not available");
  return db;
}

export async function first<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const row = await getDb().prepare(sql).bind(...params).first<T>();
  return row ?? null;
}

export async function all<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await getDb().prepare(sql).bind(...params).all<T>();
  return result.results ?? [];
}

export async function run(sql: string, params: unknown[] = []): Promise<void> {
  await getDb().prepare(sql).bind(...params).run();
}
