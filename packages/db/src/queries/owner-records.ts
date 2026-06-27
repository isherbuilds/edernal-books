import { and, asc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";

import {
  type CreateItemInput,
  type Item,
  type ItemKind,
  type ItemUsage,
  type UpdateItemInput,
  normalizeItemName
} from "@tsu-stack/core/items";
import {
  type CreatePartyInput,
  type Party,
  type PartyKind,
  type UpdatePartyInput,
  normalizePartyName
} from "@tsu-stack/core/parties";

import { type Database } from "#@/client";
import { ledgerAccount } from "#@/schema/accounts";
import { item } from "#@/schema/items";
import { party } from "#@/schema/parties";

export const OWNER_RECORD_ERROR_CODES = [
  "ITEM_ACCOUNT_ORGANIZATION_MISMATCH",
  "ITEM_NOT_FOUND",
  "OWNER_RECORD_DUPLICATE_NAME",
  "PARTY_NOT_FOUND"
] as const;

export type OwnerRecordErrorCode = (typeof OWNER_RECORD_ERROR_CODES)[number];

export class OwnerRecordDbError extends Error {
  code: OwnerRecordErrorCode;

  constructor(code: OwnerRecordErrorCode) {
    super(code);
    this.code = code;
  }
}

type OrganizationScopedInput = {
  organizationId: string;
};

type CreatePartyDbInput = Omit<CreatePartyInput, "orgSlug"> & OrganizationScopedInput;
type UpdatePartyDbInput = Omit<UpdatePartyInput, "orgSlug"> & OrganizationScopedInput;
type SetPartyActiveDbInput = OrganizationScopedInput & {
  id: string;
  isActive: boolean;
};
type ListPartiesDbInput = OrganizationScopedInput & {
  includeInactive?: boolean;
  kind?: PartyKind;
  q?: string;
};

type CreateItemDbInput = Omit<CreateItemInput, "orgSlug"> & OrganizationScopedInput;
type UpdateItemDbInput = Omit<UpdateItemInput, "orgSlug"> & OrganizationScopedInput;
type SetItemActiveDbInput = OrganizationScopedInput & {
  id: string;
  isActive: boolean;
};
type ListItemsDbInput = OrganizationScopedInput & {
  includeInactive?: boolean;
  kind?: ItemKind;
  q?: string;
  usage?: ItemUsage;
};

export function toPartyInsert(input: CreatePartyDbInput) {
  const displayName = input.displayName.trim();

  return {
    addressLine1: input.addressLine1 ?? null,
    addressLine2: input.addressLine2 ?? null,
    city: input.city ?? null,
    countryCode: input.countryCode ?? null,
    displayName,
    email: input.email ?? null,
    kind: input.kind,
    legalName: input.legalName ?? null,
    normalizedName: normalizePartyName(displayName),
    organizationId: input.organizationId,
    phone: input.phone ?? null,
    postalCode: input.postalCode ?? null,
    state: input.state ?? null
  };
}

export function toItemInsert(input: CreateItemDbInput) {
  const name = input.name.trim();

  return {
    description: input.description ?? null,
    expenseAccountId: input.expenseAccountId ?? null,
    kind: input.kind,
    name,
    normalizedName: normalizeItemName(name),
    organizationId: input.organizationId,
    purchaseRateMinor: input.purchaseRateMinor ? BigInt(input.purchaseRateMinor) : null,
    salesAccountId: input.salesAccountId ?? null,
    salesRateMinor: input.salesRateMinor ? BigInt(input.salesRateMinor) : null,
    unit: input.unit ?? null,
    usage: input.usage
  };
}

export async function listParties(db: Database, input: ListPartiesDbInput): Promise<Party[]> {
  const whereConditions: SQL[] = [eq(party.organizationId, input.organizationId)];

  if (!input.includeInactive) {
    whereConditions.push(eq(party.isActive, true));
  }

  if (input.kind) {
    whereConditions.push(partyKindCondition(input.kind));
  }

  if (input.q) {
    const query = `%${input.q.trim()}%`;
    const searchCondition = or(
      ilike(party.displayName, query),
      ilike(party.email, query),
      ilike(party.phone, query)
    );

    if (searchCondition) {
      whereConditions.push(searchCondition);
    }
  }

  const rows = await db
    .select()
    .from(party)
    .where(and(...whereConditions))
    .orderBy(asc(party.displayName));

  return rows.map(toPartyDto);
}

export async function createParty(db: Database, input: CreatePartyDbInput): Promise<Party> {
  try {
    const [row] = await db.insert(party).values(toPartyInsert(input)).returning();

    return toPartyDto(row);
  } catch (error) {
    throw mapOwnerRecordDbError(error);
  }
}

export async function updateParty(db: Database, input: UpdatePartyDbInput): Promise<Party> {
  const { id, organizationId, ...values } = input;
  const updateValues = toPartyUpdate(values);

  try {
    const [row] = await db
      .update(party)
      .set(updateValues)
      .where(and(eq(party.id, id), eq(party.organizationId, organizationId)))
      .returning();

    if (!row) {
      throw new OwnerRecordDbError("PARTY_NOT_FOUND");
    }

    return toPartyDto(row);
  } catch (error) {
    throw mapOwnerRecordDbError(error);
  }
}

export async function setPartyActive(db: Database, input: SetPartyActiveDbInput): Promise<Party> {
  return updateParty(db, input);
}

export async function listItems(db: Database, input: ListItemsDbInput): Promise<Item[]> {
  const whereConditions: SQL[] = [eq(item.organizationId, input.organizationId)];

  if (!input.includeInactive) {
    whereConditions.push(eq(item.isActive, true));
  }

  if (input.kind) {
    whereConditions.push(eq(item.kind, input.kind));
  }

  if (input.usage) {
    whereConditions.push(itemUsageCondition(input.usage));
  }

  if (input.q) {
    const query = `%${input.q.trim()}%`;
    const searchCondition = or(ilike(item.name, query), ilike(item.description, query));

    if (searchCondition) {
      whereConditions.push(searchCondition);
    }
  }

  const rows = await db
    .select()
    .from(item)
    .where(and(...whereConditions))
    .orderBy(asc(item.name));

  return rows.map(toItemDto);
}

export async function createItem(db: Database, input: CreateItemDbInput): Promise<Item> {
  await assertItemAccountsBelongToOrganization(db, input);

  try {
    const [row] = await db.insert(item).values(toItemInsert(input)).returning();

    return toItemDto(row);
  } catch (error) {
    throw mapOwnerRecordDbError(error);
  }
}

export async function updateItem(db: Database, input: UpdateItemDbInput): Promise<Item> {
  await assertItemAccountsBelongToOrganization(db, input);

  const { id, organizationId, ...values } = input;
  const updateValues = toItemUpdate(values);

  try {
    const [row] = await db
      .update(item)
      .set(updateValues)
      .where(and(eq(item.id, id), eq(item.organizationId, organizationId)))
      .returning();

    if (!row) {
      throw new OwnerRecordDbError("ITEM_NOT_FOUND");
    }

    return toItemDto(row);
  } catch (error) {
    throw mapOwnerRecordDbError(error);
  }
}

export async function setItemActive(db: Database, input: SetItemActiveDbInput): Promise<Item> {
  return updateItem(db, input);
}

function partyKindCondition(kind: PartyKind): SQL {
  if (kind === "both") {
    return eq(party.kind, "both");
  }

  return inArray(party.kind, [kind, "both"]);
}

function itemUsageCondition(usage: ItemUsage): SQL {
  if (usage === "both") {
    return eq(item.usage, "both");
  }

  return inArray(item.usage, [usage, "both"]);
}

function toPartyUpdate(
  input: Partial<Omit<CreatePartyDbInput, "organizationId">> & { isActive?: boolean }
) {
  const values: Partial<ReturnType<typeof toPartyInsert>> & { isActive?: boolean } = {};

  if (input.displayName !== undefined) {
    values.displayName = input.displayName.trim();
    values.normalizedName = normalizePartyName(values.displayName);
  }
  if (input.kind !== undefined) {
    values.kind = input.kind;
  }
  if (input.legalName !== undefined) {
    values.legalName = input.legalName;
  }
  if (input.email !== undefined) {
    values.email = input.email;
  }
  if (input.phone !== undefined) {
    values.phone = input.phone;
  }
  if (input.addressLine1 !== undefined) {
    values.addressLine1 = input.addressLine1;
  }
  if (input.addressLine2 !== undefined) {
    values.addressLine2 = input.addressLine2;
  }
  if (input.city !== undefined) {
    values.city = input.city;
  }
  if (input.state !== undefined) {
    values.state = input.state;
  }
  if (input.postalCode !== undefined) {
    values.postalCode = input.postalCode;
  }
  if (input.countryCode !== undefined) {
    values.countryCode = input.countryCode;
  }
  if (input.isActive !== undefined) {
    values.isActive = input.isActive;
  }

  return values;
}

function toItemUpdate(
  input: Partial<Omit<CreateItemDbInput, "organizationId">> & { isActive?: boolean }
) {
  const values: Partial<ReturnType<typeof toItemInsert>> & { isActive?: boolean } = {};

  if (input.name !== undefined) {
    values.name = input.name.trim();
    values.normalizedName = normalizeItemName(values.name);
  }
  if (input.kind !== undefined) {
    values.kind = input.kind;
  }
  if (input.usage !== undefined) {
    values.usage = input.usage;
  }
  if (input.description !== undefined) {
    values.description = input.description;
  }
  if (input.unit !== undefined) {
    values.unit = input.unit;
  }
  if (input.salesRateMinor !== undefined) {
    values.salesRateMinor = input.salesRateMinor === null ? null : BigInt(input.salesRateMinor);
  }
  if (input.purchaseRateMinor !== undefined) {
    values.purchaseRateMinor =
      input.purchaseRateMinor === null ? null : BigInt(input.purchaseRateMinor);
  }
  if (input.salesAccountId !== undefined) {
    values.salesAccountId = input.salesAccountId;
  }
  if (input.expenseAccountId !== undefined) {
    values.expenseAccountId = input.expenseAccountId;
  }
  if (input.isActive !== undefined) {
    values.isActive = input.isActive;
  }

  return values;
}

async function assertItemAccountsBelongToOrganization(
  db: Database,
  input: OrganizationScopedInput & {
    expenseAccountId?: string | null;
    salesAccountId?: string | null;
  }
): Promise<void> {
  const accountIds = [input.salesAccountId, input.expenseAccountId].filter(
    (id) => id !== null && id !== undefined
  );

  if (accountIds.length === 0) {
    return;
  }

  const rows = await db
    .select({ id: ledgerAccount.id })
    .from(ledgerAccount)
    .where(
      and(
        eq(ledgerAccount.organizationId, input.organizationId),
        inArray(ledgerAccount.id, accountIds)
      )
    );

  if (rows.length !== new Set(accountIds).size) {
    throw new OwnerRecordDbError("ITEM_ACCOUNT_ORGANIZATION_MISMATCH");
  }
}

function toPartyDto(row: typeof party.$inferSelect): Party {
  return {
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    countryCode: row.countryCode,
    createdAt: row.createdAt.toISOString(),
    displayName: row.displayName,
    email: row.email,
    id: row.id,
    isActive: row.isActive,
    kind: row.kind,
    legalName: row.legalName,
    normalizedName: row.normalizedName,
    organizationId: row.organizationId,
    phone: row.phone,
    postalCode: row.postalCode,
    state: row.state,
    updatedAt: row.updatedAt.toISOString()
  };
}

function toItemDto(row: typeof item.$inferSelect): Item {
  return {
    createdAt: row.createdAt.toISOString(),
    description: row.description,
    expenseAccountId: row.expenseAccountId,
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

function mapOwnerRecordDbError(error: unknown): Error {
  if (error instanceof OwnerRecordDbError) {
    return error;
  }

  if (isPostgresError(error) && error.code === "23505") {
    return new OwnerRecordDbError("OWNER_RECORD_DUPLICATE_NAME");
  }

  return error instanceof Error ? error : new Error(String(error));
}

function isPostgresError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}
