import { type ReactNode } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Spinner } from "@tsu-stack/ui/components/spinner";

type DataTableLoadMoreProps = {
  isFetchingNextPage: boolean;
  loadingLabel: ReactNode;
  loadLabel: ReactNode;
  onLoadMore: () => void;
};

export function DataTableLoadMore({
  isFetchingNextPage,
  loadingLabel,
  loadLabel,
  onLoadMore
}: DataTableLoadMoreProps) {
  return (
    <div className="flex justify-center py-3">
      <Button
        disabled={isFetchingNextPage}
        onClick={onLoadMore}
        size="sm"
        type="button"
        variant="outline"
      >
        {isFetchingNextPage ? <Spinner data-icon="inline-start" /> : null}
        {isFetchingNextPage ? loadingLabel : loadLabel}
      </Button>
    </div>
  );
}
