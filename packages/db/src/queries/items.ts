import { and, asc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import {
  type CreateItemInput,
  type Item,
  type ItemErrorCode,
  type ItemKind,
  type ItemUsage,
  type ListItemsOutput,
  type UpdateItemInput
} from "@tsu-stack/core/items";
import { clampCursorLimit } from "@tsu-stack/core/pagination";
import { normalizeName } from "@tsu-stack/core/text";

import { type Database } from "#@/client";
import {
  createCursorPage,
  DbCursorError,
  decodeCursor,
  encodeCursor,
  type NamedKeysetCursor,
  parseNamedKeysetCursor
} from "#@/queries/cursors";
import { item } from "#@/schema/items";
import { escapeLikePattern } from "#@/utils/sql";

export class ItemDbError extends Error {
  code: ItemErrorCode;

  constructor(code: ItemErrorCode) {
    super(code);
    this.code = code;
  }
}

type OrganizationScopedInput = {
  organizationId: string;
};

type CreateItemDbInput = Omit<CreateItemInput, "orgSlug"> & OrganizationScopedInput;
type UpdateItemDbInput = Omit<UpdateItemInput, "orgSlug"> & OrganizationScopedInput;
type SetItemActiveDbInput = OrganizationScopedInput & {
  id: string;
  isActive: boolean;
};
type ListItemsDbInput = OrganizationScopedInput & {
  cursor?: string;
  includeInactive?: boolean;
  kind?: ItemKind;
  limit?: number;
  q?: string;
  usage?: ItemUsage;
};

export function toItemInsert(input: CreateItemDbInput) {
  const name = input.name.trim();

  return {
    description: input.description ?? null,
    expenseAccountId: input.expenseAccountId ?? null,
    hsnCode: input.hsnCode ?? null,
    kind: input.kind,
    name,
    normalizedName: normalizeName(name),
    organizationId: input.organizationId,
    purchaseRateMinor: input.purchaseRateMinor != null ? BigInt(input.purchaseRateMinor) : null,
    salesAccountId: input.salesAccountId ?? null,
    salesRateMinor: input.salesRateMinor != null ? BigInt(input.salesRateMinor) : null,
    unit: input.unit ?? null,
    usage: input.usage
  };
}

export async function listItems(db: Database, input: ListItemsDbInput): Promise<ListItemsOutput> {
  const limit = clampCursorLimit(input);
  const cursor = input.cursor ? decodeItemCursor(input.cursor) : undefined;
  const search = input.q ? `%${escapeLikePattern(input.q.trim())}%` : undefined;
  const whereConditions = [
    eq(item.organizationId, input.organizationId),
    input.includeInactive ? undefined : eq(item.isActive, true),
    input.kind ? eq(item.kind, input.kind) : undefined,
    input.usage ? itemUsageCondition(input.usage) : undefined,
    search
      ? or(ilike(item.name, search), ilike(item.description, search), ilike(item.hsnCode, search))
      : undefined,
    cursor
      ? sql`(${item.normalizedName}, ${item.id}) > (${cursor.normalizedName}, ${cursor.id})`
      : undefined
  ].filter((condition): condition is SQL => condition !== undefined);

  const rows = await db
    .select()
    .from(item)
    .where(and(...whereConditions))
    .orderBy(asc(item.normalizedName), asc(item.id))
    .limit(limit + 1);
  const page = createCursorPage(rows, limit, encodeItemCursor);

  return {
    items: page.pageRows.map(toItemDto),
    nextCursor: page.nextCursor
  };
}

export async function createItem(db: Database, input: CreateItemDbInput): Promise<Item> {
  try {
    const [row] = await db.insert(item).values(toItemInsert(input)).returning();

    return toItemDto(row);
  } catch (error) {
    throw mapItemDbError(error);
  }
}

export async function updateItem(db: Database, input: UpdateItemDbInput): Promise<Item> {
  const { id, organizationId, ...values } = input;

  try {
    const [row] = await db
      .update(item)
      .set(toItemUpdate(values))
      .where(and(eq(item.id, id), eq(item.organizationId, organizationId)))
      .returning();

    if (!row) {
      throw new ItemDbError("ITEM_NOT_FOUND");
    }

    return toItemDto(row);
  } catch (error) {
    throw mapItemDbError(error);
  }
}

export async function setItemActive(db: Database, input: SetItemActiveDbInput): Promise<Item> {
  return updateItem(db, input);
}

function itemUsageCondition(usage: ItemUsage): SQL {
  return usage === "both" ? eq(item.usage, "both") : inArray(item.usage, [usage, "both"]);
}

function toItemUpdate(
  input: Partial<Omit<CreateItemDbInput, "organizationId">> & { isActive?: boolean }
) {
  const name = input.name?.trim();

  return {
    description: input.description,
    expenseAccountId: input.expenseAccountId,
    hsnCode: input.hsnCode,
    isActive: input.isActive,
    kind: input.kind,
    name,
    normalizedName: name === undefined ? undefined : normalizeName(name),
    purchaseRateMinor:
      input.purchaseRateMinor === undefined
        ? undefined
        : input.purchaseRateMinor === null
          ? null
          : BigInt(input.purchaseRateMinor),
    salesAccountId: input.salesAccountId,
    salesRateMinor:
      input.salesRateMinor === undefined
        ? undefined
        : input.salesRateMinor === null
          ? null
          : BigInt(input.salesRateMinor),
    unit: input.unit,
    usage: input.usage
  };
}

function toItemDto(row: typeof item.$inferSelect): Item {
  return {
    createdAt: row.createdAt.toISOString(),
    description: row.description,
    expenseAccountId: row.expenseAccountId,
    hsnCode: row.hsnCode,
    id: row.id,
    isActive: row.isActive,
    kind: row.kind,
    name: row.name,
    normalizedName: row.normalizedName,
    organizationId: row.organizationId,
    purchaseRateMinor: row.purchaseRateMinor?.toString() ?? null,
    salesAccountId: row.salesAccountId,
    salesRateMinor: row.salesRateMinor?.toString() ?? null,
    unit: row.unit,
    updatedAt: row.updatedAt.toISOString(),
    usage: row.usage
  };
}

function mapItemDbError(error: unknown): Error {
  if (error instanceof ItemDbError) {
    return error;
  }

  if (error instanceof DbCursorError) {
    return new ItemDbError("ITEM_CURSOR_INVALID");
  }

  if (isPostgresError(error)) {
    if (error.code === "23505") {
      return new ItemDbError("ITEM_DUPLICATE_NAME");
    }

    if (error.code === "23503") {
      return new ItemDbError("ITEM_ACCOUNT_ORGANIZATION_MISMATCH");
    }
  }

  return error instanceof Error ? error : new Error(String(error));
}

function isPostgresError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

function encodeItemCursor(row: NamedKeysetCursor): string {
  return encodeCursor({
    id: row.id,
    normalizedName: row.normalizedName
  });
}

function decodeItemCursor(cursor: string): NamedKeysetCursor {
  try {
    return decodeCursor(cursor, parseNamedKeysetCursor);
  } catch (error) {
    throw mapItemDbError(error);
  }
}
