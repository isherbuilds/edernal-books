import "@tanstack/react-start/server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { nowMs, recordQueryTiming } from "#@/query-timing";
import { relations as authRelations } from "#@/schema/auth.schema";
import { relations } from "#@/schema/relations";

type UnsafeQuery = ReturnType<Sql["unsafe"]>;
type UnsafeFn = Sql["unsafe"];
type TransactionRunner = (sql: Sql) => Promise<unknown>;

const instrumentedSql = Symbol("instrumentedSql");

const client = instrumentSql(postgres(ENV_SERVER.DATABASE_URL));

export const db = drizzle({
  client,
  // `defineRelationsPart()` must be merged after the main `defineRelations()` config.
  // https://orm.drizzle.team/docs/relations-v2#relations-parts
  relations: { ...relations, ...authRelations }
});

export type Database = typeof db;
export type TransactionClient = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DatabaseOrTransaction = Database | TransactionClient;

export async function connectDb(): Promise<Database> {
  return db;
}

export async function closeDb(): Promise<void> {
  await client.end();
}

function instrumentSql<TSql extends Sql>(sql: TSql): TSql {
  const taggedSql = sql as TSql & {
    [instrumentedSql]?: true;
    begin: (...args: unknown[]) => Promise<unknown>;
    savepoint?: (...args: unknown[]) => Promise<unknown>;
    unsafe: UnsafeFn;
  };

  if (taggedSql[instrumentedSql]) {
    return sql;
  }

  const unsafe = taggedSql.unsafe.bind(taggedSql);
  taggedSql.unsafe = ((...args: Parameters<UnsafeFn>) =>
    trackUnsafeQuery(args[0], unsafe(...args))) as UnsafeFn;

  if (typeof taggedSql.begin === "function") {
    const begin = taggedSql.begin.bind(taggedSql);
    taggedSql.begin = (...args: unknown[]) => begin(...instrumentTransactionArgs(args));
  }

  if (typeof taggedSql.savepoint === "function") {
    const savepoint = taggedSql.savepoint.bind(taggedSql);
    taggedSql.savepoint = (...args: unknown[]) => savepoint(...instrumentTransactionArgs(args));
  }

  taggedSql[instrumentedSql] = true;
  return sql;
}

function instrumentTransactionArgs(args: unknown[]): unknown[] {
  const callbackIndex = args.findIndex((arg) => typeof arg === "function");
  if (callbackIndex === -1) {
    return args;
  }

  const nextArgs = [...args];
  const callback = nextArgs[callbackIndex] as TransactionRunner;
  nextArgs[callbackIndex] = (tx: Sql) => callback(instrumentSql(tx));
  return nextArgs;
}

function trackUnsafeQuery(query: string, pendingQuery: UnsafeQuery): UnsafeQuery {
  const startedAt = nowMs();
  let recorded = false;

  const recordOnce = () => {
    if (recorded) {
      return;
    }

    recorded = true;
    recordQueryTiming(query, nowMs() - startedAt);
  };

  return new Proxy(pendingQuery, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);

      if (property === "then" && typeof value === "function") {
        return (onFulfilled?: unknown, onRejected?: unknown) =>
          value.call(
            target,
            (result: unknown) => {
              recordOnce();
              return typeof onFulfilled === "function" ? onFulfilled(result) : result;
            },
            (error: unknown) => {
              recordOnce();
              if (typeof onRejected === "function") {
                return onRejected(error);
              }
              throw error;
            }
          );
      }

      if (property === "values" && typeof value === "function") {
        return (...args: unknown[]) => {
          const result = value.apply(target, args) as Promise<unknown>;
          return result.finally(recordOnce);
        };
      }

      return typeof value === "function" ? value.bind(target) : value;
    }
  });
}
