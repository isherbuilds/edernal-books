CREATE TABLE "item" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"expense_account_id" uuid,
	"id" uuid PRIMARY KEY,
	"is_active" boolean DEFAULT true NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"organization_id" text NOT NULL,
	"purchase_rate_minor" bigint,
	"sales_account_id" uuid,
	"sales_rate_minor" bigint,
	"unit" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"usage" text NOT NULL,
	CONSTRAINT "item_kind_ck" CHECK ("kind" IN ('goods', 'service')),
	CONSTRAINT "item_usage_ck" CHECK ("usage" IN ('sales', 'purchases', 'both')),
	CONSTRAINT "item_name_not_blank_ck" CHECK (length(trim("name")) > 0),
	CONSTRAINT "item_normalized_name_not_blank_ck" CHECK (length(trim("normalized_name")) > 0),
	CONSTRAINT "item_sales_rate_minor_non_negative_ck" CHECK ("sales_rate_minor" IS NULL OR "sales_rate_minor" >= 0),
	CONSTRAINT "item_purchase_rate_minor_non_negative_ck" CHECK ("purchase_rate_minor" IS NULL OR "purchase_rate_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "party" (
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"country_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"id" uuid PRIMARY KEY,
	"is_active" boolean DEFAULT true NOT NULL,
	"kind" text NOT NULL,
	"legal_name" text,
	"normalized_name" text NOT NULL,
	"organization_id" text NOT NULL,
	"phone" text,
	"postal_code" text,
	"state" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "party_kind_ck" CHECK ("kind" IN ('customer', 'vendor', 'both')),
	CONSTRAINT "party_display_name_not_blank_ck" CHECK (length(trim("display_name")) > 0),
	CONSTRAINT "party_normalized_name_not_blank_ck" CHECK (length(trim("normalized_name")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "item_organization_id_id_uidx" ON "item" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_organization_id_normalized_name_uidx" ON "item" ("organization_id","normalized_name");--> statement-breakpoint
CREATE INDEX "item_organization_id_idx" ON "item" ("organization_id");--> statement-breakpoint
CREATE INDEX "item_organization_id_kind_idx" ON "item" ("organization_id","kind");--> statement-breakpoint
CREATE INDEX "item_organization_id_usage_idx" ON "item" ("organization_id","usage");--> statement-breakpoint
CREATE INDEX "item_organization_id_active_idx" ON "item" ("organization_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "party_organization_id_id_uidx" ON "party" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "party_organization_id_normalized_name_uidx" ON "party" ("organization_id","normalized_name");--> statement-breakpoint
CREATE INDEX "party_organization_id_idx" ON "party" ("organization_id");--> statement-breakpoint
CREATE INDEX "party_organization_id_kind_idx" ON "party" ("organization_id","kind");--> statement-breakpoint
CREATE INDEX "party_organization_id_active_idx" ON "party" ("organization_id","is_active");--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_organization_id_sales_account_id_fkey" FOREIGN KEY ("organization_id","sales_account_id") REFERENCES "ledger_account"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_organization_id_expense_account_id_fkey" FOREIGN KEY ("organization_id","expense_account_id") REFERENCES "ledger_account"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "party" ADD CONSTRAINT "party_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;