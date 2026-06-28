import { type ReactNode } from "react";

import { Spinner } from "@tsu-stack/ui/components/spinner";

type QueryStateProps = {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  hasData?: boolean;
  isEmpty: boolean;
  errorTitle: ReactNode;
  errorFallback: ReactNode;
  empty: ReactNode;
  children: ReactNode;
};

export function QueryState({
  isLoading,
  isError,
  error,
  hasData = false,
  isEmpty,
  errorTitle,
  errorFallback,
  empty,
  children
}: QueryStateProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError && !hasData) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h2 className="text-sm font-medium text-destructive">{errorTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message || errorFallback : errorFallback}
        </p>
      </div>
    );
  }

  if (isEmpty) {
    return <>{empty}</>;
  }

  return <>{children}</>;
}
