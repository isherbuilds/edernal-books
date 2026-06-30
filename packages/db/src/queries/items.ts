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

import { type Database, type DatabaseOrTransaction } from "#@/client";
import {
  createCursorPage,
  decodeCursor,
  encodeNamedKeysetCursor,
  type NamedKeysetCursor,
  parseNamedKeysetCursor
} from "#@/queries/cursors";
import { auditEvent } from "#@/schema/audit";
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
type AuditedMutationInput = {
  userId: string;
};
type GetItemDbInput = OrganizationScopedInput & {
  id: string;
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
  const trimmedQuery = input.q?.trim();
  const search = trimmedQuery ? `%${escapeLikePattern(trimmedQuery)}%` : undefined;
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
  const page = createCursorPage(rows, limit, encodeNamedKeysetCursor);

  return {
    items: page.pageRows.map(toItemDto),
    nextCursor: page.nextCursor
  };
}

export async function getItem(db: DatabaseOrTransaction, input: GetItemDbInput): Promise<Item> {
  const [row] = await db
    .select()
    .from(item)
    .where(and(eq(item.id, input.id), eq(item.organizationId, input.organizationId)))
    .limit(1);

  if (!row) {
    throw new ItemDbError("ITEM_NOT_FOUND");
  }

  return toItemDto(row);
}

export async function createItem(
  db: Database,
  input: CreateItemDbInput & AuditedMutationInput
): Promise<Item> {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(item).values(toItemInsert(input)).returning();
    await insertItemAuditEvent(tx, {
      action: "item.created",
      after: toItemDto(row),
      entityId: row.id,
      organizationId: input.organizationId,
      userId: input.userId
    });

    return toItemDto(row);
  });
}

export async function updateItem(
  db: Database,
  input: UpdateItemDbInput & AuditedMutationInput
): Promise<Item> {
  const { id, organizationId, userId, ...values } = input;

  return db.transaction(async (tx) => {
    const updateValues = toItemUpdate(values);
    const hasUpdateValues = Object.values(updateValues).some((value) => value !== undefined);

    if (!hasUpdateValues) {
      return getItem(tx, { id, organizationId });
    }

    if (Object.keys(values).length === 1 && values.isActive !== undefined) {
      const [row] = await tx
        .update(item)
        .set(updateValues)
        .where(
          and(
            eq(item.id, id),
            eq(item.organizationId, organizationId),
            sql`${item.isActive} <> ${values.isActive}`
          )
        )
        .returning();

      if (!row) {
        return getItem(tx, { id, organizationId });
      }

      await insertItemAuditEvent(tx, {
        action: itemAuditAction(values),
        after: toItemDto(row),
        entityId: row.id,
        organizationId,
        userId
      });

      return toItemDto(row);
    }

    const [row] = await tx
      .update(item)
      .set(updateValues)
      .where(and(eq(item.id, id), eq(item.organizationId, organizationId)))
      .returning();

    if (!row) {
      throw new ItemDbError("ITEM_NOT_FOUND");
    }

    await insertItemAuditEvent(tx, {
      action: itemAuditAction(values),
      after: toItemDto(row),
      entityId: row.id,
      organizationId,
      userId
    });

    return toItemDto(row);
  });
}

async function insertItemAuditEvent(
  tx: DatabaseOrTransaction,
  input: {
    action: string;
    after: Item;
    entityId: string;
    organizationId: string;
    userId: string;
  }
) {
  await tx.insert(auditEvent).values({
    action: input.action,
    entityId: input.entityId,
    entityType: "item",
    organizationId: input.organizationId,
    payloadJson: {
      after: input.after,
      metadata: { source: "user" }
    },
    scopeId: input.entityId,
    scopeType: "item",
    userId: input.userId
  });
}

function itemAuditAction(values: Omit<UpdateItemDbInput, "id" | "organizationId">): string {
  if (Object.keys(values).length === 1 && values.isActive !== undefined) {
    return values.isActive ? "item.activated" : "item.deactivated";
  }

  return "item.updated";
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

function decodeItemCursor(cursor: string): NamedKeysetCursor {
  return decodeCursor(cursor, parseNamedKeysetCursor);
}
