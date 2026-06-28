import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { type Database } from "#@/client";
import { organization, user } from "#@/schema/auth.schema";

import { createItem, setItemActive, type ItemDbError } from "./items";
import { createParty, setPartyActive, type PartyDbError } from "./parties";

const shouldRunIntegration = process.env.DB_INTEGRATION_TESTS === "1";
const describeIntegration = shouldRunIntegration ? describe : describe.skip;

let integrationDb: Database;
let closeIntegrationDb: (() => Promise<void>) | undefined;

beforeAll(async () => {
  if (!shouldRunIntegration) {
    return;
  }

  const client = await import("#@/client");
  integrationDb = client.db;
  closeIntegrationDb = client.closeDb;
});

afterAll(async () => {
  await closeIntegrationDb?.();
});

describeIntegration("parties and items database integration", () => {
  it("frees a party name for reuse once the holder is deactivated", async () => {
    const context = await createOwnerContext();

    try {
      const original = await createParty(integrationDb, {
        displayName: "Acme Traders",
        gstRegistrationType: "unregistered",
        kind: "both",
        organizationId: context.organizationId
      });

      await expect(
        createParty(integrationDb, {
          displayName: "  acme   traders ",
          gstRegistrationType: "unregistered",
          kind: "customer",
          organizationId: context.organizationId
        })
      ).rejects.toMatchObject({
        code: "PARTY_DUPLICATE_NAME"
      } satisfies Partial<PartyDbError>);

      await setPartyActive(integrationDb, {
        id: original.id,
        isActive: false,
        organizationId: context.organizationId
      });

      const reused = await createParty(integrationDb, {
        displayName: "Acme Traders",
        gstRegistrationType: "unregistered",
        kind: "vendor",
        organizationId: context.organizationId
      });

      expect(reused.id).not.toBe(original.id);
      expect(reused.normalizedName).toBe("acme traders");
    } finally {
      await context.cleanup();
    }
  });

  it("frees an item name for reuse once the holder is deactivated", async () => {
    const context = await createOwnerContext();

    try {
      const original = await createItem(integrationDb, {
        kind: "service",
        name: "Consulting",
        organizationId: context.organizationId,
        usage: "sales"
      });

      await setItemActive(integrationDb, {
        id: original.id,
        isActive: false,
        organizationId: context.organizationId
      });

      const reused = await createItem(integrationDb, {
        kind: "service",
        name: "Consulting",
        organizationId: context.organizationId,
        usage: "sales"
      });

      expect(reused.id).not.toBe(original.id);
    } finally {
      await context.cleanup();
    }
  });

  it("maps a foreign-key violation on an unknown account ref to the account-mismatch error", async () => {
    const context = await createOwnerContext();

    try {
      await expect(
        createItem(integrationDb, {
          kind: "goods",
          name: "Mismatched Item",
          organizationId: context.organizationId,
          salesAccountId: randomUUID(),
          usage: "sales"
        })
      ).rejects.toMatchObject({
        code: "ITEM_ACCOUNT_ORGANIZATION_MISMATCH"
      } satisfies Partial<ItemDbError>);
    } finally {
      await context.cleanup();
    }
  });
});

type OwnerContext = {
  cleanup: () => Promise<void>;
  organizationId: string;
};

async function createOwnerContext(): Promise<OwnerContext> {
  const testId = randomUUID();
  const userId = `test_user_${testId}`;
  const organizationId = `test_org_${testId}`;

  await integrationDb.insert(user).values({
    email: `parties-items-${testId}@example.test`,
    emailVerified: true,
    id: userId,
    name: "Parties Items Integration Test"
  });

  await integrationDb.insert(organization).values({
    createdAt: new Date(),
    id: organizationId,
    name: "Parties Items Integration Test",
    slug: `parties-items-${testId}`
  });

  return {
    cleanup: async () => {
      await integrationDb.delete(organization).where(eq(organization.id, organizationId));
      await integrationDb.delete(user).where(eq(user.id, userId));
    },
    organizationId
  };
}
