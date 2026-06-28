import { and, asc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { clampCursorLimit } from "@tsu-stack/core/pagination";
import {
  type CreatePartyInput,
  type ListPartiesOutput,
  type Party,
  type PartyErrorCode,
  type PartyKind,
  type UpdatePartyInput
} from "@tsu-stack/core/parties";
import { normalizeName } from "@tsu-stack/core/text";

import { type Database, type TransactionClient } from "#@/client";
import {
  createCursorPage,
  DbCursorError,
  decodeCursor,
  encodeCursor,
  type NamedKeysetCursor,
  parseNamedKeysetCursor
} from "#@/queries/cursors";
import { auditEvent } from "#@/schema/audit";
import { party } from "#@/schema/parties";
import { escapeLikePattern } from "#@/utils/sql";

export class PartyDbError extends Error {
  code: PartyErrorCode;

  constructor(code: PartyErrorCode) {
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
type AuditedMutationInput = {
  userId: string;
};
type GetPartyDbInput = OrganizationScopedInput & {
  id: string;
};
type ListPartiesDbInput = OrganizationScopedInput & {
  cursor?: string;
  includeInactive?: boolean;
  kind?: PartyKind;
  limit?: number;
  q?: string;
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
    gstRegistrationType: input.gstRegistrationType,
    gstin: input.gstin ?? null,
    kind: input.kind,
    legalName: input.legalName ?? null,
    normalizedName: normalizeName(displayName),
    organizationId: input.organizationId,
    pan: input.pan ?? null,
    phone: input.phone ?? null,
    postalCode: input.postalCode ?? null,
    state: input.state ?? null
  };
}

export async function listParties(
  db: Database,
  input: ListPartiesDbInput
): Promise<ListPartiesOutput> {
  const limit = clampCursorLimit(input);
  const cursor = input.cursor ? decodePartyCursor(input.cursor) : undefined;
  const trimmedQuery = input.q?.trim();
  const search = trimmedQuery ? `%${escapeLikePattern(trimmedQuery)}%` : undefined;
  const whereConditions = [
    eq(party.organizationId, input.organizationId),
    input.includeInactive ? undefined : eq(party.isActive, true),
    input.kind ? partyKindCondition(input.kind) : undefined,
    search
      ? or(
          ilike(party.displayName, search),
          ilike(party.email, search),
          ilike(party.phone, search),
          ilike(party.gstin, search)
        )
      : undefined,
    cursor
      ? sql`(${party.normalizedName}, ${party.id}) > (${cursor.normalizedName}, ${cursor.id})`
      : undefined
  ].filter((condition): condition is SQL => condition !== undefined);

  const rows = await db
    .select()
    .from(party)
    .where(and(...whereConditions))
    .orderBy(asc(party.normalizedName), asc(party.id))
    .limit(limit + 1);
  const page = createCursorPage(rows, limit, encodePartyCursor);

  return {
    nextCursor: page.nextCursor,
    parties: page.pageRows.map(toPartyDto)
  };
}

export async function getParty(db: Database, input: GetPartyDbInput): Promise<Party> {
  const row = await selectPartyRow(db, input);

  if (!row) {
    throw new PartyDbError("PARTY_NOT_FOUND");
  }

  return toPartyDto(row);
}

export async function createParty(
  db: Database,
  input: CreatePartyDbInput & AuditedMutationInput
): Promise<Party> {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx.insert(party).values(toPartyInsert(input)).returning();
      await insertPartyAuditEvent(tx, {
        action: "party.created",
        after: toPartyDto(row),
        entityId: row.id,
        organizationId: input.organizationId,
        userId: input.userId
      });

      return toPartyDto(row);
    });
  } catch (error) {
    throw mapPartyDbError(error);
  }
}

export async function updateParty(
  db: Database,
  input: UpdatePartyDbInput & AuditedMutationInput
): Promise<Party> {
  const { id, organizationId, userId, ...values } = input;

  try {
    return await db.transaction(async (tx) => {
      const before = await selectPartyRow(tx, { id, organizationId });

      if (!before) {
        throw new PartyDbError("PARTY_NOT_FOUND");
      }

      const updateValues = toPartyUpdate(values);
      const hasUpdateValues = Object.values(updateValues).some((value) => value !== undefined);
      const beforeDto = toPartyDto(before);

      if (!hasUpdateValues) {
        return beforeDto;
      }

      if (
        Object.keys(values).length === 1 &&
        values.isActive !== undefined &&
        values.isActive === beforeDto.isActive
      ) {
        return beforeDto;
      }

      const [row] = await tx
        .update(party)
        .set(updateValues)
        .where(and(eq(party.id, id), eq(party.organizationId, organizationId)))
        .returning();

      if (!row) {
        throw new PartyDbError("PARTY_NOT_FOUND");
      }

      await insertPartyAuditEvent(tx, {
        action: partyAuditAction(values, beforeDto),
        after: toPartyDto(row),
        before: beforeDto,
        entityId: row.id,
        organizationId,
        userId
      });

      return toPartyDto(row);
    });
  } catch (error) {
    throw mapPartyDbError(error);
  }
}

export async function setPartyActive(
  db: Database,
  input: SetPartyActiveDbInput & AuditedMutationInput
): Promise<Party> {
  return updateParty(db, input);
}

async function selectPartyRow(db: Database | TransactionClient, input: GetPartyDbInput) {
  const [row] = await db
    .select()
    .from(party)
    .where(and(eq(party.id, input.id), eq(party.organizationId, input.organizationId)))
    .limit(1);

  return row ?? null;
}

async function insertPartyAuditEvent(
  tx: TransactionClient,
  input: {
    action: string;
    after: Party;
    before?: Party;
    entityId: string;
    organizationId: string;
    userId: string;
  }
) {
  await tx.insert(auditEvent).values({
    action: input.action,
    entityId: input.entityId,
    entityType: "party",
    organizationId: input.organizationId,
    payloadJson: {
      after: input.after,
      before: input.before,
      metadata: { source: "user" }
    },
    scopeId: input.entityId,
    scopeType: "party",
    userId: input.userId
  });
}

function partyAuditAction(
  values: Omit<UpdatePartyDbInput, "id" | "organizationId">,
  before: Party
): string {
  if (Object.keys(values).length === 1 && values.isActive !== undefined) {
    return values.isActive && !before.isActive ? "party.activated" : "party.deactivated";
  }

  return "party.updated";
}

function partyKindCondition(kind: PartyKind): SQL {
  return kind === "both" ? eq(party.kind, "both") : inArray(party.kind, [kind, "both"]);
}

function toPartyUpdate(
  input: Partial<Omit<CreatePartyDbInput, "organizationId">> & { isActive?: boolean }
) {
  const displayName = input.displayName?.trim();

  return {
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    city: input.city,
    countryCode: input.countryCode,
    displayName,
    email: input.email,
    gstRegistrationType: input.gstRegistrationType,
    gstin: input.gstin,
    isActive: input.isActive,
    kind: input.kind,
    legalName: input.legalName,
    normalizedName: displayName === undefined ? undefined : normalizeName(displayName),
    pan: input.pan,
    phone: input.phone,
    postalCode: input.postalCode,
    state: input.state
  };
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
    gstRegistrationType: row.gstRegistrationType,
    gstin: row.gstin,
    id: row.id,
    isActive: row.isActive,
    kind: row.kind,
    legalName: row.legalName,
    normalizedName: row.normalizedName,
    organizationId: row.organizationId,
    pan: row.pan,
    phone: row.phone,
    postalCode: row.postalCode,
    state: row.state,
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapPartyDbError(error: unknown): Error {
  if (error instanceof PartyDbError) {
    return error;
  }

  if (error instanceof DbCursorError) {
    return new PartyDbError("PARTY_CURSOR_INVALID");
  }

  if (isPostgresError(error) && error.code === "23505") {
    return new PartyDbError("PARTY_DUPLICATE_NAME");
  }

  return error instanceof Error ? error : new Error(String(error));
}

function isPostgresError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

function encodePartyCursor(row: NamedKeysetCursor): string {
  return encodeCursor({
    id: row.id,
    normalizedName: row.normalizedName
  });
}

function decodePartyCursor(cursor: string): NamedKeysetCursor {
  try {
    return decodeCursor(cursor, parseNamedKeysetCursor);
  } catch (error) {
    throw mapPartyDbError(error);
  }
}
