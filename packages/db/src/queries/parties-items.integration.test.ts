import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { type Database } from "#@/client";
import { organization, user } from "#@/schema/auth.schema";

import { createItem, updateItem } from "./items";
import { createParty, updateParty } from "./parties";

const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";

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
        organizationId: context.organizationId,
        userId: context.userId
      });

      await expectPostgresErrorCode(
        createParty(integrationDb, {
          displayName: "  acme   traders ",
          gstRegistrationType: "unregistered",
          kind: "customer",
          organizationId: context.organizationId,
          userId: context.userId
        }),
        PG_UNIQUE_VIOLATION
      );

      await updateParty(integrationDb, {
        id: original.id,
        isActive: false,
        organizationId: context.organizationId,
        userId: context.userId
      });

      const reused = await createParty(integrationDb, {
        displayName: "Acme Traders",
        gstRegistrationType: "unregistered",
        kind: "vendor",
        organizationId: context.organizationId,
        userId: context.userId
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
        userId: context.userId,
        usage: "sales"
      });

      await expectPostgresErrorCode(
        createItem(integrationDb, {
          kind: "service",
          name: "  consulting ",
          organizationId: context.organizationId,
          userId: context.userId,
          usage: "purchases"
        }),
        PG_UNIQUE_VIOLATION
      );

      await updateItem(integrationDb, {
        id: original.id,
        isActive: false,
        organizationId: context.organizationId,
        userId: context.userId
      });

      const reused = await createItem(integrationDb, {
        kind: "service",
        name: "Consulting",
        organizationId: context.organizationId,
        userId: context.userId,
        usage: "sales"
      });

      expect(reused.id).not.toBe(original.id);
    } finally {
      await context.cleanup();
    }
  });

  it("fails fast on a foreign-key violation for an unknown account ref", async () => {
    expect.hasAssertions();
    const context = await createOwnerContext();

    try {
      await expectPostgresErrorCode(
        createItem(integrationDb, {
          kind: "goods",
          name: "Mismatched Item",
          organizationId: context.organizationId,
          salesAccountId: randomUUID(),
          userId: context.userId,
          usage: "sales"
        }),
        PG_FOREIGN_KEY_VIOLATION
      );
    } finally {
      await context.cleanup();
    }
  });
});

async function expectPostgresErrorCode(promise: Promise<unknown>, code: string) {
  await promise.then(
    () => {
      throw new Error("Expected Postgres error");
    },
    (error: unknown) => {
      expect(postgresErrorCode(error)).toBe(code);
    }
  );
}

function postgresErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const candidate = error as { cause?: unknown; code?: unknown };
  return typeof candidate.code === "string" ? candidate.code : postgresErrorCode(candidate.cause);
}

type OwnerContext = {
  cleanup: () => Promise<void>;
  organizationId: string;
  userId: string;
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
    organizationId,
    userId
  };
}
