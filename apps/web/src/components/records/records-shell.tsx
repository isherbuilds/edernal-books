import { ListFilterIcon, MoreHorizontalIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@tsu-stack/ui/components/dropdown-menu";
import { Input } from "@tsu-stack/ui/components/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@tsu-stack/ui/components/sheet";

import { PageHeader, PageLayout } from "@/components/page-layout";

type RecordsPageLayoutProps = {
  children: ReactNode;
  description: ReactNode;
  eyebrow: ReactNode;
  icon: ReactNode;
  title: ReactNode;
};

export function RecordsPageLayout({
  children,
  description,
  eyebrow,
  icon,
  title
}: RecordsPageLayoutProps) {
  return (
    <PageLayout>
      <PageHeader description={description} eyebrow={eyebrow} icon={icon} title={title} />
      {children}
    </PageLayout>
  );
}

type RecordsToolbarProps = {
  children: ReactNode;
  pills?: ReactNode;
  search: ReactNode;
};

export function RecordsToolbar({ children, pills, search }: RecordsToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {search}
        <div className="flex items-center gap-2">{children}</div>
      </div>
      {pills}
    </div>
  );
}

type RecordSearchFieldProps = {
  ariaLabel: string;
  maxLength?: number;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

export function RecordSearchField({
  ariaLabel,
  maxLength,
  onChange,
  placeholder,
  value
}: RecordSearchFieldProps) {
  return (
    <div className="relative w-full sm:max-w-[360px]">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label={ariaLabel}
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        className="pl-9"
        maxLength={maxLength}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        spellCheck={false}
        value={value}
      />
    </div>
  );
}

type RecordFilterOption = {
  label: ReactNode;
  value: string;
};

export type RecordFilterGroup = {
  allLabel: ReactNode;
  id: string;
  label: ReactNode;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<RecordFilterOption>;
  value: string;
};

type RecordFilterMenuProps = {
  ariaLabel: string;
  groups: ReadonlyArray<RecordFilterGroup>;
  label: ReactNode;
};

export function RecordFilterMenu({ ariaLabel, groups, label }: RecordFilterMenuProps) {
  const activeCount = groups.filter((group) => group.value !== "all").length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button aria-label={ariaLabel} size="sm" variant="outline" />}>
        <ListFilterIcon data-icon="inline-start" />
        {label}
        {activeCount > 0 ? (
          <Badge className="ml-0.5 size-4 justify-center rounded-full px-0 text-[0.65rem]">
            {activeCount}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {groups.map((group, index) => (
          <Fragment key={group.id}>
            {index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              onValueChange={(value) => group.onValueChange(value)}
              value={group.value}
            >
              <DropdownMenuRadioItem value="all">{group.allLabel}</DropdownMenuRadioItem>
              {group.options.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type RecordFilterPill = {
  key: string;
  label: ReactNode;
};

type RecordFilterPillsProps = {
  clearLabel: ReactNode;
  onClear: () => void;
  onRemove: (key: string) => void;
  pills: ReadonlyArray<RecordFilterPill>;
};

export function RecordFilterPills({
  clearLabel,
  onClear,
  onRemove,
  pills
}: RecordFilterPillsProps) {
  if (pills.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((pill) => (
        <button
          className="group inline-flex h-7 items-center gap-1 rounded-md bg-secondary px-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
          key={pill.key}
          onClick={() => onRemove(pill.key)}
          type="button"
        >
          <span className="sr-only">Remove filter: </span>
          {pill.label}
          <XIcon className="size-3 text-muted-foreground transition-colors group-hover:text-foreground" />
        </button>
      ))}
      <Button
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={onClear}
        size="sm"
        type="button"
        variant="ghost"
      >
        {clearLabel}
      </Button>
    </div>
  );
}

type RecordPrimaryActionProps = {
  label: ReactNode;
  onClick: () => void;
};

export function RecordPrimaryAction({ label, onClick }: RecordPrimaryActionProps) {
  return (
    <Button onClick={onClick} size="sm" type="button">
      <PlusIcon data-icon="inline-start" />
      {label}
    </Button>
  );
}

type RecordSheetProps = {
  children: ReactNode;
  description?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
};

export function RecordSheet({
  children,
  description,
  onOpenChange,
  open,
  title
}: RecordSheetProps) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="border-b p-6 pb-4">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

type RecordActiveBadgeProps = {
  activeLabel: ReactNode;
  inactiveLabel: ReactNode;
  isActive: boolean;
};

export function RecordActiveBadge({
  activeLabel,
  inactiveLabel,
  isActive
}: RecordActiveBadgeProps) {
  return isActive ? (
    <Badge variant="secondary">{activeLabel}</Badge>
  ) : (
    <Badge variant="outline">{inactiveLabel}</Badge>
  );
}

type RecordRowActionsProps = {
  activateLabel: ReactNode;
  ariaLabel: string;
  deactivateLabel: ReactNode;
  editLabel: ReactNode;
  isActive: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
};

export function RecordRowActions({
  activateLabel,
  ariaLabel,
  deactivateLabel,
  editLabel,
  isActive,
  onEdit,
  onToggleActive
}: RecordRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button aria-label={ariaLabel} size="icon-sm" variant="ghost" />}
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>{editLabel}</DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleActive}>
          {isActive ? deactivateLabel : activateLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
