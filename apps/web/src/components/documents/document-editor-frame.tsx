import { type ComponentProps, type ReactNode } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { Button } from "@tsu-stack/ui/components/button";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { formatMinorUnits } from "@/utils/accounting-format";

import {
  type DocumentLinesFormValues,
  documentTotalMinor
} from "@/components/documents/document-editor-form";

export function DocumentEditorCard({ className, ...props }: ComponentProps<"form">) {
  return (
    <form
      className={cn("flex flex-col divide-y rounded-lg border bg-card shadow-sm", className)}
      {...props}
    />
  );
}

type DocumentEditorSectionProps = {
  children: ReactNode;
  /** Right-aligned controls in the section header (e.g. Add line). */
  action?: ReactNode;
  bodyClassName?: string;
  description?: ReactNode;
  title: ReactNode;
};

export function DocumentEditorSection({
  action,
  bodyClassName,
  children,
  description,
  title
}: DocumentEditorSectionProps) {
  return (
    <section className="flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("px-4 pb-4 sm:px-5", bodyClassName)}>{children}</div>
    </section>
  );
}

type DocumentEditorFooterProps = {
  isPosting: boolean;
  isSavingDraft: boolean;
  onPost: () => void;
  onSaveDraft: () => void;
  postLabel: string;
  /** Optional summary shown on the left (e.g. line count + total). */
  summary?: ReactNode;
};

export function DocumentEditorFooter({
  isPosting,
  isSavingDraft,
  onPost,
  onSaveDraft,
  postLabel,
  summary
}: DocumentEditorFooterProps) {
  const isBusy = isPosting || isSavingDraft;

  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 rounded-b-lg bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-5">
      <div className="min-w-0">{summary}</div>
      <div className="flex shrink-0 gap-2">
        <Button disabled={isBusy} onClick={onSaveDraft} type="button" variant="outline">
          {isSavingDraft ? <Spinner data-icon="inline-start" /> : null}
          Save draft
        </Button>
        <Button disabled={isBusy} onClick={onPost} type="button">
          {isPosting ? <Spinner data-icon="inline-start" /> : null}
          {postLabel}
        </Button>
      </div>
    </div>
  );
}

type DocumentEditorTotalProps = {
  lineCount: number;
  totalMinor: string;
};

export function DocumentEditorTotal({ lineCount, totalMinor }: DocumentEditorTotalProps) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground">
        {lineCount} {lineCount === 1 ? "line" : "lines"} · Total
      </span>
      <span className="font-amount text-lg tabular-nums">{formatMinorUnits(totalMinor)}</span>
    </div>
  );
}

export function DocumentEditorLiveTotal() {
  const { control } = useFormContext<DocumentLinesFormValues>();
  const summary = useWatch({
    compute: (values: DocumentLinesFormValues) => {
      const lines = values.lines ?? [];
      return `${lines.length}:${documentTotalMinor(lines).toString()}`;
    },
    control
  });
  const [lineCount, totalMinor] = summary.split(":");

  return <DocumentEditorTotal lineCount={Number(lineCount)} totalMinor={totalMinor} />;
}
