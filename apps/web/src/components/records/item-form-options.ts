import { type ItemKind, ITEM_KINDS, type ItemUsage, ITEM_USAGES } from "@tsu-stack/core/items";
import { m } from "@tsu-stack/i18n/messages";

export function itemKindLabel(kind: ItemKind): string {
  switch (kind) {
    case "goods":
      return m.owner_records__item_kind_goods();
    case "service":
      return m.owner_records__item_kind_service();
  }
}

export function itemUsageLabel(usage: ItemUsage): string {
  switch (usage) {
    case "sales":
      return m.owner_records__item_usage_sales();
    case "purchases":
      return m.owner_records__item_usage_purchases();
    case "both":
      return m.owner_records__item_usage_both();
  }
}

export const ITEM_KIND_OPTIONS = ITEM_KINDS.map((value) => {
  return {
    label: itemKindLabel(value),
    value
  };
});

export const ITEM_USAGE_OPTIONS = ITEM_USAGES.map((value) => {
  return {
    label: itemUsageLabel(value),
    value
  };
});
