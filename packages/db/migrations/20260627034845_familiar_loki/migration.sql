CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_period" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"end_date" date NOT NULL,
	"fiscal_year_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY,
	"locked_at" timestamp,
	"locked_by" text,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"start_date" date NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	CONSTRAINT "accounting_period_status_ck" CHECK ("status" IN ('open', 'locked', 'closed')),
	CONSTRAINT "accounting_period_date_order_ck" CHECK ("start_date" <= "end_date")
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"id" uuid PRIMARY KEY,
	"organization_id" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"scope_id" text NOT NULL,
	"scope_type" text NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "currency" (
	"active" boolean DEFAULT true NOT NULL,
	"code" text PRIMARY KEY,
	"decimal_places" integer NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL
);
--> statement-breakpoint
INSERT INTO "currency" ("active", "code", "decimal_places", "name", "symbol") VALUES
	(true, 'INR', 2, 'Indian Rupee', 'Rs'),
	(true, 'USD', 2, 'US Dollar', '$'),
	(true, 'EUR', 2, 'Euro', 'EUR'),
	(true, 'GBP', 2, 'Pound Sterling', 'GBP')
ON CONFLICT ("code") DO UPDATE SET
	"active" = excluded."active",
	"decimal_places" = excluded."decimal_places",
	"name" = excluded."name",
	"symbol" = excluded."symbol";
--> statement-breakpoint
CREATE TABLE "exchange_rate" (
	"base_currency_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"quote_currency_code" text,
	"rate" numeric(20,10) NOT NULL,
	"rate_date" date,
	"source" text,
	CONSTRAINT "exchange_rate_pk" PRIMARY KEY("base_currency_code","quote_currency_code","rate_date","source"),
	CONSTRAINT "exchange_rate_distinct_currency_ck" CHECK ("base_currency_code" <> "quote_currency_code"),
	CONSTRAINT "exchange_rate_positive_rate_ck" CHECK ("rate"::numeric > 0)
);
--> statement-breakpoint
CREATE TABLE "fiscal_year" (
	"closed_at" timestamp,
	"closed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"end_date" date NOT NULL,
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"start_date" date NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	CONSTRAINT "fiscal_year_status_ck" CHECK ("status" IN ('open', 'closed')),
	CONSTRAINT "fiscal_year_date_order_ck" CHECK ("start_date" <= "end_date")
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entry" (
	"accounting_period_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"entry_number" text NOT NULL,
	"id" uuid PRIMARY KEY,
	"operation_key" text NOT NULL,
	"organization_id" text NOT NULL,
	"posted_at" timestamp NOT NULL,
	"posted_by" text,
	"posting_date" date NOT NULL,
	"request_hash" text NOT NULL,
	"reversal_of_entry_id" uuid,
	"source_document_id" uuid,
	"total_minor" bigint NOT NULL,
	CONSTRAINT "journal_entry_reversal_not_self_ck" CHECK ("reversal_of_entry_id" IS NULL OR "reversal_of_entry_id" <> "id"),
	CONSTRAINT "journal_entry_total_minor_ck" CHECK ("total_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "journal_line" (
	"account_id" uuid NOT NULL,
	"credit_minor" bigint NOT NULL,
	"debit_minor" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"id" uuid PRIMARY KEY,
	"journal_entry_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "journal_line_line_number_ck" CHECK ("line_number" > 0),
	CONSTRAINT "journal_line_debit_ck" CHECK ("debit_minor" >= 0),
	CONSTRAINT "journal_line_credit_ck" CHECK ("credit_minor" >= 0),
	CONSTRAINT "journal_line_one_sided_ck" CHECK (("debit_minor" > 0 AND "credit_minor" = 0) OR ("debit_minor" = 0 AND "credit_minor" > 0))
);
--> statement-breakpoint
CREATE TABLE "ledger_account" (
	"account_category" text NOT NULL,
	"account_type" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"allow_manual_posting" boolean DEFAULT true NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"id" uuid PRIMARY KEY,
	"is_group" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"normal_balance" text NOT NULL,
	"organization_id" text NOT NULL,
	"parent_account_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"system_key" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_account_category_ck" CHECK ("account_category" IN ('asset', 'liability', 'equity', 'income', 'expense')),
	CONSTRAINT "ledger_account_normal_balance_ck" CHECK ("normal_balance" IN ('debit', 'credit'))
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "number_sequence" (
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"entity_type" text NOT NULL,
	"fiscal_year_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY,
	"next_number" bigint DEFAULT 1 NOT NULL,
	"organization_id" text NOT NULL,
	"padding" integer DEFAULT 0 NOT NULL,
	"prefix" text DEFAULT '' NOT NULL,
	"reset_policy" text DEFAULT 'never' NOT NULL,
	"suffix" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "number_sequence_next_number_ck" CHECK ("next_number" > 0),
	CONSTRAINT "number_sequence_padding_ck" CHECK ("padding" >= 0),
	CONSTRAINT "number_sequence_reset_policy_ck" CHECK ("reset_policy" IN ('never', 'fiscal_year'))
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"onboarding_completed_at" timestamp,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "organization_setting" (
	"base_currency_code" text DEFAULT 'INR' NOT NULL,
	"books_start_date" date NOT NULL,
	"country_code" text DEFAULT 'IN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"fiscal_year_start_month" integer DEFAULT 4 NOT NULL,
	"legal_name" text NOT NULL,
	"organization_id" text PRIMARY KEY,
	"primary_email" text,
	"primary_phone" text,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"trade_name" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_setting_fiscal_year_start_month_ck" CHECK ("fiscal_year_start_month" BETWEEN 1 AND 12)
);
--> statement-breakpoint
CREATE TABLE "outbox_event" (
	"aggregate_id" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"available_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"error" text,
	"event_type" text NOT NULL,
	"id" uuid PRIMARY KEY,
	"organization_id" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"processed_at" timestamp,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "outbox_event_status_ck" CHECK ("status" IN ('pending', 'processing', 'processed', 'failed')),
	CONSTRAINT "outbox_event_retry_count_ck" CHECK ("retry_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text
);
--> statement-breakpoint
CREATE TABLE "source_document" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"document_number" text,
	"id" uuid PRIMARY KEY,
	"organization_id" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_period_organization_id_id_uidx" ON "accounting_period" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_period_organization_id_start_date_uidx" ON "accounting_period" ("organization_id","start_date");--> statement-breakpoint
CREATE INDEX "accounting_period_organization_id_idx" ON "accounting_period" ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_event_organization_id_idx" ON "audit_event" ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_event_entity_idx" ON "audit_event" ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_year_organization_id_id_uidx" ON "fiscal_year" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_year_organization_id_start_date_uidx" ON "fiscal_year" ("organization_id","start_date");--> statement-breakpoint
CREATE INDEX "fiscal_year_organization_id_idx" ON "fiscal_year" ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entry_organization_id_id_uidx" ON "journal_entry" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entry_organization_id_operation_key_uidx" ON "journal_entry" ("organization_id","operation_key");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entry_organization_id_entry_number_uidx" ON "journal_entry" ("organization_id","entry_number");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entry_one_reversal_per_original_uidx" ON "journal_entry" ("organization_id","reversal_of_entry_id") WHERE "reversal_of_entry_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "journal_entry_posted_date_idx" ON "journal_entry" ("organization_id","posting_date","id");--> statement-breakpoint
CREATE INDEX "journal_entry_organization_id_idx" ON "journal_entry" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_line_organization_id_id_uidx" ON "journal_line" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_line_organization_id_journal_entry_id_line_number_uidx" ON "journal_line" ("organization_id","journal_entry_id","line_number");--> statement-breakpoint
CREATE INDEX "journal_line_organization_id_idx" ON "journal_line" ("organization_id");--> statement-breakpoint
CREATE INDEX "journal_line_account_ledger_idx" ON "journal_line" ("organization_id","account_id","journal_entry_id","line_number");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_account_organization_id_id_uidx" ON "ledger_account" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_account_organization_id_code_uidx" ON "ledger_account" ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_account_organization_id_system_key_uidx" ON "ledger_account" ("organization_id","system_key") WHERE "system_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ledger_account_organization_id_idx" ON "ledger_account" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_organizationId_userId_uidx" ON "member" ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "number_sequence_organization_id_id_uidx" ON "number_sequence" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "number_sequence_scope_uidx" ON "number_sequence" ("organization_id","entity_type","fiscal_year_id");--> statement-breakpoint
CREATE INDEX "number_sequence_organization_id_idx" ON "number_sequence" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" ("slug");--> statement-breakpoint
CREATE INDEX "outbox_event_organization_id_idx" ON "outbox_event" ("organization_id");--> statement-breakpoint
CREATE INDEX "outbox_event_status_available_at_idx" ON "outbox_event" ("status","available_at");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_document_organization_id_id_uidx" ON "source_document" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_document_organization_id_type_number_uidx" ON "source_document" ("organization_id","type","document_number") WHERE "document_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "source_document_organization_id_idx" ON "source_document" ("organization_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "accounting_period" ADD CONSTRAINT "accounting_period_locked_by_user_id_fkey" FOREIGN KEY ("locked_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "accounting_period" ADD CONSTRAINT "accounting_period_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "accounting_period" ADD CONSTRAINT "accounting_period_organization_id_fiscal_year_id_fkey" FOREIGN KEY ("organization_id","fiscal_year_id") REFERENCES "fiscal_year"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "exchange_rate" ADD CONSTRAINT "exchange_rate_base_currency_code_currency_code_fkey" FOREIGN KEY ("base_currency_code") REFERENCES "currency"("code");--> statement-breakpoint
ALTER TABLE "exchange_rate" ADD CONSTRAINT "exchange_rate_quote_currency_code_currency_code_fkey" FOREIGN KEY ("quote_currency_code") REFERENCES "currency"("code");--> statement-breakpoint
ALTER TABLE "fiscal_year" ADD CONSTRAINT "fiscal_year_closed_by_user_id_fkey" FOREIGN KEY ("closed_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "fiscal_year" ADD CONSTRAINT "fiscal_year_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_posted_by_user_id_fkey" FOREIGN KEY ("posted_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_organization_id_accounting_period_id_fkey" FOREIGN KEY ("organization_id","accounting_period_id") REFERENCES "accounting_period"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_organization_id_source_document_id_fkey" FOREIGN KEY ("organization_id","source_document_id") REFERENCES "source_document"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_organization_id_reversal_of_entry_id_fkey" FOREIGN KEY ("organization_id","reversal_of_entry_id") REFERENCES "journal_entry"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_organization_id_journal_entry_id_fkey" FOREIGN KEY ("organization_id","journal_entry_id") REFERENCES "journal_entry"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_organization_id_account_id_fkey" FOREIGN KEY ("organization_id","account_id") REFERENCES "ledger_account"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ledger_account" ADD CONSTRAINT "ledger_account_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ledger_account" ADD CONSTRAINT "ledger_account_organization_id_parent_account_id_fkey" FOREIGN KEY ("organization_id","parent_account_id") REFERENCES "ledger_account"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "number_sequence" ADD CONSTRAINT "number_sequence_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "number_sequence" ADD CONSTRAINT "number_sequence_organization_id_fiscal_year_id_fkey" FOREIGN KEY ("organization_id","fiscal_year_id") REFERENCES "fiscal_year"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "organization_setting" ADD CONSTRAINT "organization_setting_base_currency_code_currency_code_fkey" FOREIGN KEY ("base_currency_code") REFERENCES "currency"("code");--> statement-breakpoint
ALTER TABLE "organization_setting" ADD CONSTRAINT "organization_setting_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "outbox_event" ADD CONSTRAINT "outbox_event_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "source_document" ADD CONSTRAINT "source_document_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;
