import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vite-plus/test";

const migrationsDir = fileURLToPath(new URL("../../../migrations", import.meta.url));

function readAccountingKernelMigrations(): string {
  return readdirSync(migrationsDir)
    .toSorted()
    .map((dir) => join(migrationsDir, dir, "migration.sql"))
    .filter((migrationPath) => existsSync(migrationPath))
    .map((migrationPath) => readFileSync(migrationPath, "utf8"))
    .join("\n");
}

describe("accounting kernel migration", () => {
  const migration = readAccountingKernelMigrations();

  it("enforces composite tenant foreign keys", () => {
    expect(migration).toContain(
      'FOREIGN KEY ("organization_id","account_id") REFERENCES "ledger_account"("organization_id","id")'
    );
    expect(migration).toContain(
      'FOREIGN KEY ("organization_id","journal_entry_id") REFERENCES "journal_entry"("organization_id","id")'
    );
    expect(migration).toContain(
      'FOREIGN KEY ("organization_id","parent_account_id") REFERENCES "ledger_account"("organization_id","id")'
    );
  });

  it("keeps posting workflow invariants out of custom database triggers", () => {
    expect(migration).not.toContain("CREATE TRIGGER");
    expect(migration).not.toContain("CREATE CONSTRAINT TRIGGER");
    expect(migration).not.toContain("DEFERRABLE INITIALLY DEFERRED");
    expect(migration).not.toContain("EXCLUDE USING gist");
  });

  it("does not persist journal replay keys", () => {
    expect(migration).not.toContain("journal_entry_organization_id_operation_key_uidx");
    expect(migration).not.toContain('"operation_key"');
    expect(migration).not.toContain('"request_hash"');
  });

  it("keeps account hierarchy tenant-scoped without category-coupling", () => {
    expect(migration).not.toContain(
      'CREATE UNIQUE INDEX "ledger_account_organization_id_id_category_uidx"'
    );
    expect(migration).toContain(
      'CONSTRAINT "ledger_account_organization_id_parent_account_id_fkey" FOREIGN KEY'
    );
    expect(migration).not.toContain(
      'CONSTRAINT "ledger_account_organization_id_parent_account_id_category_fkey" FOREIGN KEY'
    );
  });

  it("keeps reviewed Phase 1 period and journal columns", () => {
    expect(migration).toContain(
      `CONSTRAINT "accounting_period_status_ck" CHECK ("status" IN ('open', 'locked', 'closed'))`
    );
    expect(migration).not.toContain("soft_locked");
    expect(migration).not.toContain("hard_locked");
    expect(migration).not.toContain("journal_entry_status_ck");
    expect(migration).not.toContain('"transaction_currency_code"');
    expect(migration).not.toContain('"transaction_debit_minor"');
    expect(migration).not.toContain('"transaction_credit_minor"');
    expect(migration).not.toContain('"exchange_rate" numeric(20,10) NOT NULL');
  });

  it("enforces one reversal per original entry", () => {
    expect(migration).toContain("journal_entry_one_reversal_per_original_uidx");
    expect(migration).not.toContain(
      ["journal_entry_one_original_per_source", "document_uidx"].join("_")
    );
  });

  it("stores document provenance on journal entries", () => {
    expect(migration).toContain("journal_entry_source_all_or_none_ck");
    expect(migration).toContain("journal_entry_source_type_ck");
    expect(migration).toContain("journal_entry_one_original_per_source_uidx");
  });

  it("enforces line-level money-side invariants", () => {
    const journalLineCreateTable = migration.match(
      /CREATE TABLE "journal_line" \([\s\S]*?\n\);/
    )?.[0];

    expect(migration).toContain('CONSTRAINT "journal_line_one_sided_ck"');
    expect(journalLineCreateTable).toContain('"debit_minor" bigint NOT NULL');
    expect(journalLineCreateTable).toContain('"credit_minor" bigint NOT NULL');
    expect(journalLineCreateTable).not.toContain('"base_debit_minor"');
    expect(journalLineCreateTable).not.toContain('"base_credit_minor"');
    expect(journalLineCreateTable).not.toContain('"base_currency_code"');
    expect(migration).not.toContain("journal_line_base_currency_code_currency_code_fkey");
  });
});
