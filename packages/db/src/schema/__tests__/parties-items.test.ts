import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vite-plus/test";

import { item, party } from "#@/schema/index";

const migrationsDir = fileURLToPath(new URL("../../../migrations", import.meta.url));

function readAllMigrations(): string {
  return readdirSync(migrationsDir)
    .toSorted()
    .map((dir) => join(migrationsDir, dir, "migration.sql"))
    .filter((migrationPath) => existsSync(migrationPath))
    .map((migrationPath) => readFileSync(migrationPath, "utf8"))
    .join("\n");
}

describe("parties and items migration", () => {
  const migration = readAllMigrations();

  it("makes the normalized-name unique index partial on active rows so names free up after deactivation", () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "item_organization_id_normalized_name_uidx" ON "item" ("organization_id","normalized_name") WHERE is_active;'
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "party_organization_id_normalized_name_uidx" ON "party" ("organization_id","normalized_name") WHERE is_active;'
    );
  });

  it("derives classification CHECK constraints from the shared enum arrays", () => {
    expect(migration).toContain(`CONSTRAINT "item_kind_ck" CHECK ("kind" IN ('goods', 'service'))`);
    expect(migration).toContain(
      `CONSTRAINT "item_usage_ck" CHECK ("usage" IN ('sales', 'purchases', 'both'))`
    );
    expect(migration).toContain(
      `CONSTRAINT "party_kind_ck" CHECK ("kind" IN ('customer', 'vendor', 'both'))`
    );
  });

  it("keeps party tax and country invariants at the database boundary", () => {
    expect(migration).toContain(`CONSTRAINT "party_country_code_ck"`);
    expect(migration).toContain(`CONSTRAINT "party_gstin_ck"`);
    expect(migration).toContain(`CONSTRAINT "party_pan_ck"`);
  });

  it("keeps the composite account foreign keys that enforce org-scoped account refs at the database", () => {
    expect(migration).toContain(
      'FOREIGN KEY ("organization_id","sales_account_id") REFERENCES "ledger_account"("organization_id","id") ON DELETE RESTRICT'
    );
    expect(migration).toContain(
      'FOREIGN KEY ("organization_id","expense_account_id") REFERENCES "ledger_account"("organization_id","id") ON DELETE RESTRICT'
    );
  });
});

describe("parties and items schema", () => {
  it("tenant-scopes Phase 2 owner workflow tables", () => {
    expect(party.organizationId).toBeDefined();
    expect(item.organizationId).toBeDefined();
  });

  it("supports party and item classification fields", () => {
    expect(party.kind).toBeDefined();
    expect(party.normalizedName).toBeDefined();
    expect(item.kind).toBeDefined();
    expect(item.usage).toBeDefined();
    expect(item.normalizedName).toBeDefined();
  });

  it("keeps optional item defaults without requiring inventory", () => {
    expect(item.salesRateMinor).toBeDefined();
    expect(item.purchaseRateMinor).toBeDefined();
    expect(item.salesAccountId).toBeDefined();
    expect(item.expenseAccountId).toBeDefined();
  });

  it("does not add stock inventory fields in Phase 2", () => {
    expect("trackInventory" in item).toBe(false);
    expect("maintainStock" in item).toBe(false);
    expect("warehouseId" in item).toBe(false);
    expect("quantityOnHand" in item).toBe(false);
    expect("batchSeries" in item).toBe(false);
    expect("serialNumberSeries" in item).toBe(false);
    expect("valuationRateMinor" in item).toBe(false);
  });
});
