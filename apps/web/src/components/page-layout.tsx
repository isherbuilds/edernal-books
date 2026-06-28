import { type ReactNode } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

type PageLayoutProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Canonical app-page container. Every authenticated page (records, accounting,
 * reports, settings) renders inside this so width, padding, background, and
 * vertical rhythm stay identical across the app. The surrounding `_shell` route
 * provides the sidebar + header chrome; this owns the page body.
 */
export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 bg-background p-4 sm:p-6",
        className
      )}
    >
      {children}
    </main>
  );
}

type PageHeaderProps = {
  /** Right-aligned action cluster (buttons). Records put actions in the toolbar instead. */
  actions?: ReactNode;
  description: ReactNode;
  eyebrow: ReactNode;
  icon: ReactNode;
  title: ReactNode;
};

/** Page title block: eyebrow (section + icon) → title → description, with optional actions. */
export function PageHeader({ actions, description, eyebrow, icon, title }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {eyebrow}
        </div>
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

type EmptyStateProps = {
  actionLabel?: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  onAction?: () => void;
  title: ReactNode;
};

/** First-run / no-data state: dashed card with icon, title, description, optional action. */
export function EmptyState({ actionLabel, description, icon, onAction, title }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-20 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg border bg-card text-muted-foreground">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction} type="button" variant="outline">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

type NoResultsProps = {
  actionLabel: ReactNode;
  description: ReactNode;
  onAction: () => void;
  title: ReactNode;
};

/** Filtered-to-empty state: same frame as EmptyState but offers a "clear" affordance. */
export function NoResults({ actionLabel, description, onAction, title }: NoResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-20 text-center">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      <Button onClick={onAction} type="button" variant="outline">
        {actionLabel}
      </Button>
    </div>
  );
}
