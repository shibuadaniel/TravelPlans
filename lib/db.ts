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
      max: 5,
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

export async function dbAll<T>(query: string, ...params: SqlValue[]) {
  const rows = await client().unsafe(bind(query), params);
  return rows as unknown as T[];
}

export async function dbGet<T>(query: string, ...params: SqlValue[]) {
  const rows = await dbAll<T>(query, ...params);
  return rows[0];
}

export async function dbRun(query: string, ...params: SqlValue[]) {
  await client().unsafe(bind(query), params);
}

export async function transaction<T>(fn: () => Promise<T>) {
  return getSql().begin(async (tx) => transactionSql.run(tx, fn));
}
