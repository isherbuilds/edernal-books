import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";

type QueryTiming = {
  queryCount: number;
  queryMs: number;
  slowestQueryMs: number;
  slowestQuerySql: string | null;
};

const queryTimingStorage = new AsyncLocalStorage<QueryTiming>();

export async function runWithQueryTiming<T>(callback: () => Promise<T>): Promise<T> {
  return queryTimingStorage.run(
    {
      queryCount: 0,
      queryMs: 0,
      slowestQueryMs: 0,
      slowestQuerySql: null
    },
    callback
  );
}

export function getQueryTiming(): QueryTiming | null {
  const state = queryTimingStorage.getStore();
  if (!state) {
    return null;
  }

  return {
    queryCount: state.queryCount,
    queryMs: roundMs(state.queryMs),
    slowestQueryMs: roundMs(state.slowestQueryMs),
    slowestQuerySql: state.slowestQuerySql
  };
}

export function recordQueryTiming(sql: string, durationMs: number) {
  const state = queryTimingStorage.getStore();
  if (!state) {
    return;
  }

  state.queryCount += 1;
  state.queryMs += durationMs;

  if (durationMs > state.slowestQueryMs) {
    state.slowestQueryMs = durationMs;
    state.slowestQuerySql = summarizeSql(sql);
  }
}

export function nowMs(): number {
  return performance.now();
}

function roundMs(value: number): number {
  return Math.round(value * 100) / 100;
}

function summarizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().slice(0, 240);
}
