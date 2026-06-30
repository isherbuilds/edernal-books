export type QueryRenderState =
  | { kind: "loading" }
  | { error?: unknown; kind: "error" }
  | { kind: "empty" }
  | { kind: "ready" };

type QueryRenderStateInput = {
  dataPresent?: boolean;
  empty: boolean;
  error?: unknown;
  errored: boolean;
  loading: boolean;
};

export function getQueryState({
  dataPresent = false,
  empty,
  error,
  errored,
  loading
}: QueryRenderStateInput): QueryRenderState {
  if (loading) {
    return { kind: "loading" };
  }

  if (errored && !dataPresent) {
    return { error, kind: "error" };
  }

  if (empty) {
    return { kind: "empty" };
  }

  return { kind: "ready" };
}
