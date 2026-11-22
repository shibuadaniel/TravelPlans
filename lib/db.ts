import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import postgres from "postgres";

type SqlValue = string | number | null;
type Sql = postgres.Sql | postgres.TransactionSql;

const globalForSql = globalThis as unknown as { travelSql?: postgres.Sql };
const transactionSql = new AsyncLocalStorage<postgres.TransactionSql>();

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!globalForSql.travelSql) {
    globalForSql.travelSql = postgres(url, {
      prepare: false,
      max: 8,
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 10,
      connection: { statement_timeout: 20000, lock_timeout: 3000 },
      ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
    });
  }
  return globalForSql.travelSql;
}

function client(): Sql {
  return transactionSql.getStore() ?? getSql();
}

function bind(query: string) {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code) : "";
}

async function query(sql: string, params: SqlValue[]) {
  const run = () => client().unsafe(bind(sql), params);
  try {
    return await run();
  } catch (error) {
    // A cancelled read is safe to repeat. A transaction has to roll back instead.
    if (transactionSql.getStore() || errorCode(error) !== "57014") throw error;
    return await run();
  }
}

export async function dbAll<T>(sql: string, ...params: SqlValue[]) {
  const rows = await query(sql, params);
  return rows as unknown as T[];
}

export async function dbGet<T>(sql: string, ...params: SqlValue[]) {
  const rows = await dbAll<T>(sql, ...params);
  return rows[0];
}

export async function dbRun(sql: string, ...params: SqlValue[]) {
  await query(sql, params);
}

export async function transaction<T>(fn: () => Promise<T>) {
  return getSql().begin(async (tx) => transactionSql.run(tx, fn));
}
