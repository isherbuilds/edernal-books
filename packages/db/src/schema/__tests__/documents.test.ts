import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vite-plus/test";

import {
  purchaseDocument,
  purchaseDocumentLine,
  salesDocument,
  salesDocumentLine,
  settlementAllocation,
  settlementDocument
} from "#@/schema/index";

const migrationsDir = fileURLToPath(new URL("../../../migrations", import.meta.url));

function readAllMigrations(): string {
  return readdirSync(migrationsDir)
    .toSorted()
    .map((dir) => join(migrationsDir, dir, "migration.sql"))
    .filter((migrationPath) => existsSync(migrationPath))
    .map((migrationPath) => readFileSync(migrationPath, "utf8"))
    .join("\n");
}

describe("documents schema", () => {
  it("uses separate typed tables for each owner workflow", () => {
    expect(salesDocument.customerPartyId).toBeDefined();
    expect(salesDocumentLine.incomeAccountId).toBeDefined();
    expect(purchaseDocument.vendorPartyId).toBeDefined();
    expect(purchaseDocumentLine.expenseAccountId).toBeDefined();
    expect(settlementDocument.direction).toBeDefined();
    expect(settlementAllocation.targetDocumentKind).toBeDefined();
  });

  it("keeps official numbers separate from draft references", () => {
    expect(salesDocument.documentNumber).toBeDefined();
    expect(salesDocument.draftReference).toBeDefined();
    expect("postedOperationKey" in salesDocument).toBe(false);
    expect("voidedOperationKey" in salesDocument).toBe(false);
  });
});

describe("documents migration", () => {
  const migration = readAllMigrations();

  it("creates typed document tables", () => {
    expect(migration).toContain('CREATE TABLE "sales_document"');
    expect(migration).toContain('CREATE TABLE "sales_document_line"');
    expect(migration).toContain('CREATE TABLE "purchase_document"');
    expect(migration).toContain('CREATE TABLE "purchase_document_line"');
    expect(migration).toContain('CREATE TABLE "settlement_document"');
    expect(migration).toContain('CREATE TABLE "settlement_allocation"');
  });

  it("allocates official document numbers only on posted rows", () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "sales_document_organization_id_document_number_uidx"'
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "purchase_document_organization_id_document_number_uidx"'
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "settlement_document_organization_id_document_number_uidx"'
    );
    expect(migration).toContain("WHERE document_number IS NOT NULL");
    expect(migration).toContain("draft_reference");
  });

  it("does not persist replay operation keys", () => {
    expect(migration).not.toContain("posted_operation_key");
    expect(migration).not.toContain("voided_operation_key");
  });

  it("enforces outstanding balances within document totals", () => {
    expect(migration).toContain("sales_document_outstanding_lte_total_ck");
    expect(migration).toContain("purchase_document_outstanding_lte_total_ck");
  });

  it("indexes status-only purchase and settlement register filters", () => {
    expect(migration).toContain('CREATE INDEX "purchase_document_status_register_idx"');
    expect(migration).toContain('CREATE INDEX "settlement_document_status_register_idx"');
  });

  it("enforces tenant-scoped foreign keys for parties, accounts, and journals", () => {
    expect(migration).toContain(
      'FOREIGN KEY ("organization_id","customer_party_id") REFERENCES "party"("organization_id","id") ON DELETE RESTRICT'
    );
    expect(migration).toContain(
      'FOREIGN KEY ("organization_id","income_account_id") REFERENCES "ledger_account"("organization_id","id") ON DELETE RESTRICT'
    );
    expect(migration).toContain(
      'FOREIGN KEY ("organization_id","journal_entry_id") REFERENCES "journal_entry"("organization_id","id") ON DELETE RESTRICT'
    );
  });

  it("keeps settlement allocations relational instead of storing polymorphic ids only", () => {
    const settlementAllocationCreateTable = migration.match(
      /CREATE TABLE "settlement_allocation" \([\s\S]*?\n\);/
    )?.[0];

    expect(settlementAllocationCreateTable).toContain('"sales_document_id" uuid');
    expect(settlementAllocationCreateTable).toContain('"purchase_document_id" uuid');
    expect(settlementAllocationCreateTable).not.toContain('"target_document_id" uuid');
  });

  it("prevents duplicate allocation rows for one settlement target", () => {
    expect(migration).toContain('CREATE UNIQUE INDEX "settlement_allocation_sales_target_uidx"');
    expect(migration).toContain("WHERE sales_document_id IS NOT NULL");
    expect(migration).toContain('CREATE UNIQUE INDEX "settlement_allocation_purchase_target_uidx"');
    expect(migration).toContain("WHERE purchase_document_id IS NOT NULL");
  });
});
