"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

type ComboboxItem = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ComboboxProps<T extends ComboboxItem> = {
  items: readonly T[];
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  inputValue?: string;
  onInputValueChange?: (inputValue: string) => void;
  manualFiltering?: boolean;
  loading?: boolean;
  emptyText?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  renderItem?: (item: T) => React.ReactNode;
  itemToLabel?: (item: T) => string;
  name?: string;
  id?: string;
  selectedItem?: T | null;
  className?: string;
  contentClassName?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

function ComboboxOption({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function Combobox<T extends ComboboxItem>({
  items,
  value,
  onValueChange,
  inputValue,
  onInputValueChange,
  manualFiltering = false,
  loading = false,
  emptyText = "No results found.",
  placeholder,
  disabled,
  open,
  defaultOpen,
  onOpenChange,
  renderItem,
  itemToLabel,
  name,
  id,
  selectedItem: selectedItemProp,
  className,
  contentClassName,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid
}: ComboboxProps<T>) {
  const selectedItem = React.useMemo<ComboboxItem | null>(
    () =>
      value == null
        ? null
        : (items.find((item) => item.value === value) ??
          (selectedItemProp?.value === value ? selectedItemProp : null)),
    [items, selectedItemProp, value]
  );

  const handleInputValueChange = (next: string) => {
    onInputValueChange?.(next);
  };

  const handleValueChange = (next: ComboboxItem | null) => {
    onValueChange?.(next ? next.value : null);
  };

  return (
    <ComboboxPrimitive.Root
      items={items}
      value={selectedItem}
      onValueChange={handleValueChange}
      inputValue={inputValue}
      onInputValueChange={handleInputValueChange}
      filter={manualFiltering ? null : undefined}
      itemToStringLabel={itemToLabel ? (item) => itemToLabel(item as T) : undefined}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
      disabled={disabled}
      name={name}
    >
      <div data-slot="combobox" className="relative w-full">
        <ComboboxPrimitive.Input
          id={id}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          placeholder={placeholder}
          disabled={disabled}
          data-slot="combobox-input"
          className={cn(
            "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
            className
          )}
        />
        <ComboboxPrimitive.Icon
          render={
            <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2" />
          }
        >
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </ComboboxPrimitive.Icon>
      </div>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner sideOffset={4} className="isolate z-50 outline-none">
          <ComboboxPrimitive.Popup
            data-slot="combobox-content"
            className={cn(
              "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-[8rem] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              contentClassName
            )}
          >
            {loading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                Loading...
              </div>
            ) : (
              <>
                <ComboboxPrimitive.Empty className="px-2 py-3 text-center text-sm text-muted-foreground">
                  {emptyText}
                </ComboboxPrimitive.Empty>
                <ComboboxPrimitive.List>
                  {(item: ComboboxItem) => (
                    <ComboboxOption key={item.value} value={item} disabled={item.disabled}>
                      {renderItem ? renderItem(item as T) : item.label}
                    </ComboboxOption>
                  )}
                </ComboboxPrimitive.List>
              </>
            )}
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}

export { Combobox, type ComboboxItem, type ComboboxProps };
