import { type ReactNode } from "react";

import { Spinner } from "@tsu-stack/ui/components/spinner";

import { type QueryRenderState } from "@/components/query-state-model";

type QueryStateProps = {
  errorTitle: ReactNode;
  errorFallback: ReactNode;
  empty: ReactNode;
  state: QueryRenderState;
  children: ReactNode;
};

export function QueryState({ errorTitle, errorFallback, empty, state, children }: QueryStateProps) {
  if (state.kind === "loading") {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h2 className="text-sm font-medium text-destructive">{errorTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {state.error instanceof Error ? state.error.message || errorFallback : errorFallback}
        </p>
      </div>
    );
  }

  if (state.kind === "empty") {
    return <>{empty}</>;
  }

  return <>{children}</>;
}
