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
CREATE TABLE "item" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"expense_account_id" uuid,
	"hsn_code" text,
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
CREATE TABLE "journal_entry" (
	"accounting_period_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"entry_number" text NOT NULL,
	"id" uuid PRIMARY KEY,
	"organization_id" text NOT NULL,
	"posted_at" timestamp NOT NULL,
	"posted_by" text,
	"posting_date" date NOT NULL,
	"reversal_of_entry_id" uuid,
	"source_number" text,
	"source_record_id" uuid,
	"source_type" text,
	"total_minor" bigint NOT NULL,
	CONSTRAINT "journal_entry_reversal_not_self_ck" CHECK ("reversal_of_entry_id" IS NULL OR "reversal_of_entry_id" <> "id"),
	CONSTRAINT "journal_entry_source_all_or_none_ck" CHECK (
        (
          "source_type" IS NULL
          AND "source_record_id" IS NULL
          AND "source_number" IS NULL
        )
        OR (
          "source_type" IS NOT NULL
          AND "source_record_id" IS NOT NULL
          AND "source_number" IS NOT NULL
        )
      ),
	CONSTRAINT "journal_entry_source_type_ck" CHECK ("source_type" IN ('sales_invoice', 'purchase_bill', 'expense', 'settlement_received', 'settlement_paid')),
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
CREATE TABLE "party" (
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"country_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"gst_registration_type" text DEFAULT 'unregistered' NOT NULL,
	"gstin" text,
	"id" uuid PRIMARY KEY,
	"is_active" boolean DEFAULT true NOT NULL,
	"kind" text NOT NULL,
	"legal_name" text,
	"normalized_name" text NOT NULL,
	"organization_id" text NOT NULL,
	"pan" text,
	"phone" text,
	"postal_code" text,
	"state" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "party_kind_ck" CHECK ("kind" IN ('customer', 'vendor', 'both')),
	CONSTRAINT "party_gst_registration_type_ck" CHECK ("gst_registration_type" IN ('registered_regular', 'registered_composition', 'unregistered', 'consumer')),
	CONSTRAINT "party_country_code_ck" CHECK ("country_code" is null or "country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "party_gstin_ck" CHECK ("gstin" is null or "gstin" ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
	CONSTRAINT "party_pan_ck" CHECK ("pan" is null or "pan" ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
	CONSTRAINT "party_display_name_not_blank_ck" CHECK (length(trim("display_name")) > 0),
	CONSTRAINT "party_normalized_name_not_blank_ck" CHECK (length(trim("normalized_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "purchase_document" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"document_number" text,
	"draft_reference" text NOT NULL,
	"id" uuid PRIMARY KEY,
	"journal_entry_id" uuid,
	"organization_id" text NOT NULL,
	"posted_at" timestamp,
	"posted_by_user_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"void_reason" text,
	"voided_at" timestamp,
	"voided_by_user_id" text,
	"document_kind" text NOT NULL,
	"due_date" date,
	"notes" text,
	"outstanding_minor" bigint DEFAULT 0 NOT NULL,
	"purchase_date" date NOT NULL,
	"total_minor" bigint DEFAULT 0 NOT NULL,
	"vendor_party_id" uuid NOT NULL,
	"vendor_reference_number" text,
	CONSTRAINT "purchase_document_status_ck" CHECK ("status" IN ('draft', 'posted', 'voided')),
	CONSTRAINT "purchase_document_kind_ck" CHECK ("document_kind" IN ('purchase_bill', 'expense')),
	CONSTRAINT "purchase_document_lifecycle_ck" CHECK (
    (
      "status" = 'draft'
      AND "document_number" IS NULL
      AND "journal_entry_id" IS NULL
      AND "posted_at" IS NULL
      AND "posted_by_user_id" IS NULL
      AND "voided_at" IS NULL
      AND "voided_by_user_id" IS NULL
      AND "void_reason" IS NULL
    )
    OR (
      "status" = 'posted'
      AND "document_number" IS NOT NULL
      AND "journal_entry_id" IS NOT NULL
      AND "posted_at" IS NOT NULL
      AND "posted_by_user_id" IS NOT NULL
      AND "voided_at" IS NULL
      AND "voided_by_user_id" IS NULL
      AND "void_reason" IS NULL
    )
    OR (
      "status" = 'voided'
      AND "document_number" IS NOT NULL
      AND "journal_entry_id" IS NOT NULL
      AND "posted_at" IS NOT NULL
      AND "posted_by_user_id" IS NOT NULL
      AND "voided_at" IS NOT NULL
      AND "voided_by_user_id" IS NOT NULL
      AND "void_reason" IS NOT NULL
    )
  ),
	CONSTRAINT "purchase_document_date_order_ck" CHECK ("due_date" IS NULL OR "purchase_date" <= "due_date"),
	CONSTRAINT "purchase_document_total_minor_ck" CHECK ("total_minor" >= 0),
	CONSTRAINT "purchase_document_outstanding_minor_ck" CHECK ("outstanding_minor" >= 0),
	CONSTRAINT "purchase_document_outstanding_lte_total_ck" CHECK ("outstanding_minor" <= "total_minor")
);
--> statement-breakpoint
CREATE TABLE "purchase_document_line" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"expense_account_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY,
	"item_id" uuid,
	"line_number" integer NOT NULL,
	"organization_id" text NOT NULL,
	"hsn_code" text,
	"purchase_document_id" uuid NOT NULL,
	"quantity" numeric(18,6) NOT NULL,
	"rate_minor" bigint NOT NULL,
	"total_minor" bigint NOT NULL,
	"unit" text,
	CONSTRAINT "purchase_document_line_line_number_ck" CHECK ("line_number" > 0),
	CONSTRAINT "purchase_document_line_description_not_blank_ck" CHECK (length(trim("description")) > 0),
	CONSTRAINT "purchase_document_line_quantity_ck" CHECK ("quantity" > 0),
	CONSTRAINT "purchase_document_line_rate_minor_ck" CHECK ("rate_minor" > 0),
	CONSTRAINT "purchase_document_line_total_minor_ck" CHECK ("total_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales_document" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"document_number" text,
	"draft_reference" text NOT NULL,
	"id" uuid PRIMARY KEY,
	"journal_entry_id" uuid,
	"organization_id" text NOT NULL,
	"posted_at" timestamp,
	"posted_by_user_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"void_reason" text,
	"voided_at" timestamp,
	"voided_by_user_id" text,
	"customer_party_id" uuid NOT NULL,
	"due_date" date,
	"invoice_date" date NOT NULL,
	"notes" text,
	"outstanding_minor" bigint DEFAULT 0 NOT NULL,
	"terms" text,
	"total_minor" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "sales_document_status_ck" CHECK ("status" IN ('draft', 'posted', 'voided')),
	CONSTRAINT "sales_document_lifecycle_ck" CHECK (
    (
      "status" = 'draft'
      AND "document_number" IS NULL
      AND "journal_entry_id" IS NULL
      AND "posted_at" IS NULL
      AND "posted_by_user_id" IS NULL
      AND "voided_at" IS NULL
      AND "voided_by_user_id" IS NULL
      AND "void_reason" IS NULL
    )
    OR (
      "status" = 'posted'
      AND "document_number" IS NOT NULL
      AND "journal_entry_id" IS NOT NULL
      AND "posted_at" IS NOT NULL
      AND "posted_by_user_id" IS NOT NULL
      AND "voided_at" IS NULL
      AND "voided_by_user_id" IS NULL
      AND "void_reason" IS NULL
    )
    OR (
      "status" = 'voided'
      AND "document_number" IS NOT NULL
      AND "journal_entry_id" IS NOT NULL
      AND "posted_at" IS NOT NULL
      AND "posted_by_user_id" IS NOT NULL
      AND "voided_at" IS NOT NULL
      AND "voided_by_user_id" IS NOT NULL
      AND "void_reason" IS NOT NULL
    )
  ),
	CONSTRAINT "sales_document_date_order_ck" CHECK ("due_date" IS NULL OR "invoice_date" <= "due_date"),
	CONSTRAINT "sales_document_total_minor_ck" CHECK ("total_minor" >= 0),
	CONSTRAINT "sales_document_outstanding_minor_ck" CHECK ("outstanding_minor" >= 0),
	CONSTRAINT "sales_document_outstanding_lte_total_ck" CHECK ("outstanding_minor" <= "total_minor")
);
--> statement-breakpoint
CREATE TABLE "sales_document_line" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"id" uuid PRIMARY KEY,
	"income_account_id" uuid NOT NULL,
	"item_id" uuid,
	"line_number" integer NOT NULL,
	"organization_id" text NOT NULL,
	"quantity" numeric(18,6) NOT NULL,
	"rate_minor" bigint NOT NULL,
	"hsn_code" text,
	"sales_document_id" uuid NOT NULL,
	"total_minor" bigint NOT NULL,
	"unit" text,
	CONSTRAINT "sales_document_line_line_number_ck" CHECK ("line_number" > 0),
	CONSTRAINT "sales_document_line_description_not_blank_ck" CHECK (length(trim("description")) > 0),
	CONSTRAINT "sales_document_line_quantity_ck" CHECK ("quantity" > 0),
	CONSTRAINT "sales_document_line_rate_minor_ck" CHECK ("rate_minor" > 0),
	CONSTRAINT "sales_document_line_total_minor_ck" CHECK ("total_minor" > 0)
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
CREATE TABLE "settlement_allocation" (
	"amount_minor" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY,
	"organization_id" text NOT NULL,
	"purchase_document_id" uuid,
	"sales_document_id" uuid,
	"settlement_document_id" uuid NOT NULL,
	"target_document_kind" text NOT NULL,
	CONSTRAINT "settlement_allocation_target_document_kind_ck" CHECK ("target_document_kind" IN ('sales_invoice', 'purchase_bill', 'expense')),
	CONSTRAINT "settlement_allocation_amount_minor_ck" CHECK ("amount_minor" > 0),
	CONSTRAINT "settlement_allocation_target_ck" CHECK (
        (
          "target_document_kind" = 'sales_invoice'
          AND "sales_document_id" IS NOT NULL
          AND "purchase_document_id" IS NULL
        )
        OR (
          "target_document_kind" IN ('purchase_bill', 'expense')
          AND "sales_document_id" IS NULL
          AND "purchase_document_id" IS NOT NULL
        )
      )
);
--> statement-breakpoint
CREATE TABLE "settlement_document" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"document_number" text,
	"draft_reference" text NOT NULL,
	"id" uuid PRIMARY KEY,
	"journal_entry_id" uuid,
	"organization_id" text NOT NULL,
	"posted_at" timestamp,
	"posted_by_user_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"void_reason" text,
	"voided_at" timestamp,
	"voided_by_user_id" text,
	"amount_minor" bigint NOT NULL,
	"cash_account_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"notes" text,
	"party_id" uuid NOT NULL,
	"payment_mode" text NOT NULL,
	"reference" text,
	"settlement_date" date NOT NULL,
	CONSTRAINT "settlement_document_status_ck" CHECK ("status" IN ('draft', 'posted', 'voided')),
	CONSTRAINT "settlement_document_direction_ck" CHECK ("direction" IN ('received', 'paid')),
	CONSTRAINT "settlement_document_payment_mode_ck" CHECK ("payment_mode" IN ('cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other')),
	CONSTRAINT "settlement_document_lifecycle_ck" CHECK (
    (
      "status" = 'draft'
      AND "document_number" IS NULL
      AND "journal_entry_id" IS NULL
      AND "posted_at" IS NULL
      AND "posted_by_user_id" IS NULL
      AND "voided_at" IS NULL
      AND "voided_by_user_id" IS NULL
      AND "void_reason" IS NULL
    )
    OR (
      "status" = 'posted'
      AND "document_number" IS NOT NULL
      AND "journal_entry_id" IS NOT NULL
      AND "posted_at" IS NOT NULL
      AND "posted_by_user_id" IS NOT NULL
      AND "voided_at" IS NULL
      AND "voided_by_user_id" IS NULL
      AND "void_reason" IS NULL
    )
    OR (
      "status" = 'voided'
      AND "document_number" IS NOT NULL
      AND "journal_entry_id" IS NOT NULL
      AND "posted_at" IS NOT NULL
      AND "posted_by_user_id" IS NOT NULL
      AND "voided_at" IS NOT NULL
      AND "voided_by_user_id" IS NOT NULL
      AND "void_reason" IS NOT NULL
    )
  ),
	CONSTRAINT "settlement_document_amount_minor_ck" CHECK ("amount_minor" > 0)
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
CREATE UNIQUE INDEX "item_organization_id_id_uidx" ON "item" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_organization_id_normalized_name_uidx" ON "item" ("organization_id","normalized_name") WHERE is_active;--> statement-breakpoint
CREATE INDEX "item_organization_id_normalized_name_id_idx" ON "item" ("organization_id","normalized_name","id");--> statement-breakpoint
CREATE INDEX "item_organization_id_idx" ON "item" ("organization_id");--> statement-breakpoint
CREATE INDEX "item_organization_id_kind_idx" ON "item" ("organization_id","kind");--> statement-breakpoint
CREATE INDEX "item_organization_id_usage_idx" ON "item" ("organization_id","usage");--> statement-breakpoint
CREATE INDEX "item_organization_id_active_idx" ON "item" ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "item_organization_id_sales_account_id_idx" ON "item" ("organization_id","sales_account_id");--> statement-breakpoint
CREATE INDEX "item_organization_id_expense_account_id_idx" ON "item" ("organization_id","expense_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entry_organization_id_id_uidx" ON "journal_entry" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entry_organization_id_entry_number_uidx" ON "journal_entry" ("organization_id","entry_number");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entry_one_reversal_per_original_uidx" ON "journal_entry" ("organization_id","reversal_of_entry_id") WHERE "reversal_of_entry_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entry_one_original_per_source_uidx" ON "journal_entry" ("organization_id","source_type","source_record_id") WHERE "source_record_id" IS NOT NULL AND "reversal_of_entry_id" IS NULL;--> statement-breakpoint
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
CREATE UNIQUE INDEX "party_organization_id_id_uidx" ON "party" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "party_organization_id_normalized_name_uidx" ON "party" ("organization_id","normalized_name") WHERE is_active;--> statement-breakpoint
CREATE INDEX "party_organization_id_normalized_name_id_idx" ON "party" ("organization_id","normalized_name","id");--> statement-breakpoint
CREATE INDEX "party_organization_id_idx" ON "party" ("organization_id");--> statement-breakpoint
CREATE INDEX "party_organization_id_kind_idx" ON "party" ("organization_id","kind");--> statement-breakpoint
CREATE INDEX "party_organization_id_active_idx" ON "party" ("organization_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_document_organization_id_id_uidx" ON "purchase_document" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_document_organization_id_draft_reference_uidx" ON "purchase_document" ("organization_id","draft_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_document_organization_id_document_number_uidx" ON "purchase_document" ("organization_id","document_number") WHERE document_number IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_document_organization_id_journal_entry_id_uidx" ON "purchase_document" ("organization_id","journal_entry_id") WHERE journal_entry_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "purchase_document_register_idx" ON "purchase_document" ("organization_id","document_kind","status","purchase_date","id");--> statement-breakpoint
CREATE INDEX "purchase_document_register_all_idx" ON "purchase_document" ("organization_id","purchase_date","id");--> statement-breakpoint
CREATE INDEX "purchase_document_kind_register_idx" ON "purchase_document" ("organization_id","document_kind","purchase_date","id");--> statement-breakpoint
CREATE INDEX "purchase_document_status_register_idx" ON "purchase_document" ("organization_id","status","purchase_date","id");--> statement-breakpoint
CREATE INDEX "purchase_document_vendor_idx" ON "purchase_document" ("organization_id","vendor_party_id");--> statement-breakpoint
CREATE INDEX "purchase_document_open_allocation_target_idx" ON "purchase_document" ("organization_id","vendor_party_id","purchase_date","id") WHERE status = 'posted' AND outstanding_minor > 0;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_document_line_organization_id_id_uidx" ON "purchase_document_line" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_document_line_document_line_uidx" ON "purchase_document_line" ("organization_id","purchase_document_id","line_number");--> statement-breakpoint
CREATE INDEX "purchase_document_line_document_idx" ON "purchase_document_line" ("organization_id","purchase_document_id");--> statement-breakpoint
CREATE INDEX "purchase_document_line_expense_account_idx" ON "purchase_document_line" ("organization_id","expense_account_id");--> statement-breakpoint
CREATE INDEX "purchase_document_line_item_idx" ON "purchase_document_line" ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_document_organization_id_id_uidx" ON "sales_document" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_document_organization_id_draft_reference_uidx" ON "sales_document" ("organization_id","draft_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_document_organization_id_document_number_uidx" ON "sales_document" ("organization_id","document_number") WHERE document_number IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_document_organization_id_journal_entry_id_uidx" ON "sales_document" ("organization_id","journal_entry_id") WHERE journal_entry_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "sales_document_register_idx" ON "sales_document" ("organization_id","status","invoice_date","id");--> statement-breakpoint
CREATE INDEX "sales_document_register_all_idx" ON "sales_document" ("organization_id","invoice_date","id");--> statement-breakpoint
CREATE INDEX "sales_document_customer_idx" ON "sales_document" ("organization_id","customer_party_id");--> statement-breakpoint
CREATE INDEX "sales_document_open_allocation_target_idx" ON "sales_document" ("organization_id","customer_party_id","invoice_date","id") WHERE status = 'posted' AND outstanding_minor > 0;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_document_line_organization_id_id_uidx" ON "sales_document_line" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_document_line_document_line_uidx" ON "sales_document_line" ("organization_id","sales_document_id","line_number");--> statement-breakpoint
CREATE INDEX "sales_document_line_document_idx" ON "sales_document_line" ("organization_id","sales_document_id");--> statement-breakpoint
CREATE INDEX "sales_document_line_income_account_idx" ON "sales_document_line" ("organization_id","income_account_id");--> statement-breakpoint
CREATE INDEX "sales_document_line_item_idx" ON "sales_document_line" ("organization_id","item_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_allocation_organization_id_id_uidx" ON "settlement_allocation" ("organization_id","id");--> statement-breakpoint
CREATE INDEX "settlement_allocation_settlement_document_idx" ON "settlement_allocation" ("organization_id","settlement_document_id");--> statement-breakpoint
CREATE INDEX "settlement_allocation_sales_document_idx" ON "settlement_allocation" ("organization_id","sales_document_id");--> statement-breakpoint
CREATE INDEX "settlement_allocation_purchase_document_idx" ON "settlement_allocation" ("organization_id","purchase_document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_allocation_sales_target_uidx" ON "settlement_allocation" ("organization_id","settlement_document_id","sales_document_id") WHERE sales_document_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_allocation_purchase_target_uidx" ON "settlement_allocation" ("organization_id","settlement_document_id","purchase_document_id") WHERE purchase_document_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_document_organization_id_id_uidx" ON "settlement_document" ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_document_organization_id_draft_reference_uidx" ON "settlement_document" ("organization_id","draft_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_document_organization_id_document_number_uidx" ON "settlement_document" ("organization_id","document_number") WHERE document_number IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_document_organization_id_journal_entry_id_uidx" ON "settlement_document" ("organization_id","journal_entry_id") WHERE journal_entry_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "settlement_document_register_idx" ON "settlement_document" ("organization_id","direction","status","settlement_date","id");--> statement-breakpoint
CREATE INDEX "settlement_document_register_all_idx" ON "settlement_document" ("organization_id","settlement_date","id");--> statement-breakpoint
CREATE INDEX "settlement_document_direction_register_idx" ON "settlement_document" ("organization_id","direction","settlement_date","id");--> statement-breakpoint
CREATE INDEX "settlement_document_status_register_idx" ON "settlement_document" ("organization_id","status","settlement_date","id");--> statement-breakpoint
CREATE INDEX "settlement_document_party_idx" ON "settlement_document" ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "settlement_document_cash_account_idx" ON "settlement_document" ("organization_id","cash_account_id");--> statement-breakpoint
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
ALTER TABLE "item" ADD CONSTRAINT "item_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_organization_id_sales_account_id_fkey" FOREIGN KEY ("organization_id","sales_account_id") REFERENCES "ledger_account"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_organization_id_expense_account_id_fkey" FOREIGN KEY ("organization_id","expense_account_id") REFERENCES "ledger_account"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_posted_by_user_id_fkey" FOREIGN KEY ("posted_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_organization_id_accounting_period_id_fkey" FOREIGN KEY ("organization_id","accounting_period_id") REFERENCES "accounting_period"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
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
ALTER TABLE "party" ADD CONSTRAINT "party_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "purchase_document" ADD CONSTRAINT "purchase_document_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "purchase_document" ADD CONSTRAINT "purchase_document_organization_id_vendor_party_id_fkey" FOREIGN KEY ("organization_id","vendor_party_id") REFERENCES "party"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "purchase_document" ADD CONSTRAINT "purchase_document_organization_id_journal_entry_id_fkey" FOREIGN KEY ("organization_id","journal_entry_id") REFERENCES "journal_entry"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "purchase_document_line" ADD CONSTRAINT "purchase_document_line_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "purchase_document_line" ADD CONSTRAINT "purchase_document_line_organization_id_purchase_document_id_fkey" FOREIGN KEY ("organization_id","purchase_document_id") REFERENCES "purchase_document"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "purchase_document_line" ADD CONSTRAINT "purchase_document_line_organization_id_expense_account_id_fkey" FOREIGN KEY ("organization_id","expense_account_id") REFERENCES "ledger_account"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "purchase_document_line" ADD CONSTRAINT "purchase_document_line_organization_id_item_id_fkey" FOREIGN KEY ("organization_id","item_id") REFERENCES "item"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales_document" ADD CONSTRAINT "sales_document_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales_document" ADD CONSTRAINT "sales_document_organization_id_customer_party_id_fkey" FOREIGN KEY ("organization_id","customer_party_id") REFERENCES "party"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales_document" ADD CONSTRAINT "sales_document_organization_id_journal_entry_id_fkey" FOREIGN KEY ("organization_id","journal_entry_id") REFERENCES "journal_entry"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales_document_line" ADD CONSTRAINT "sales_document_line_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales_document_line" ADD CONSTRAINT "sales_document_line_organization_id_sales_document_id_fkey" FOREIGN KEY ("organization_id","sales_document_id") REFERENCES "sales_document"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales_document_line" ADD CONSTRAINT "sales_document_line_organization_id_income_account_id_fkey" FOREIGN KEY ("organization_id","income_account_id") REFERENCES "ledger_account"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales_document_line" ADD CONSTRAINT "sales_document_line_organization_id_item_id_fkey" FOREIGN KEY ("organization_id","item_id") REFERENCES "item"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "settlement_allocation" ADD CONSTRAINT "settlement_allocation_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "settlement_allocation" ADD CONSTRAINT "settlement_allocation_organization_id_settlement_document_id_fkey" FOREIGN KEY ("organization_id","settlement_document_id") REFERENCES "settlement_document"("organization_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "settlement_allocation" ADD CONSTRAINT "settlement_allocation_organization_id_sales_document_id_fkey" FOREIGN KEY ("organization_id","sales_document_id") REFERENCES "sales_document"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "settlement_allocation" ADD CONSTRAINT "settlement_allocation_organization_id_purchase_document_id_fkey" FOREIGN KEY ("organization_id","purchase_document_id") REFERENCES "purchase_document"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "settlement_document" ADD CONSTRAINT "settlement_document_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "settlement_document" ADD CONSTRAINT "settlement_document_organization_id_party_id_fkey" FOREIGN KEY ("organization_id","party_id") REFERENCES "party"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "settlement_document" ADD CONSTRAINT "settlement_document_organization_id_cash_account_id_fkey" FOREIGN KEY ("organization_id","cash_account_id") REFERENCES "ledger_account"("organization_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "settlement_document" ADD CONSTRAINT "settlement_document_organization_id_journal_entry_id_fkey" FOREIGN KEY ("organization_id","journal_entry_id") REFERENCES "journal_entry"("organization_id","id") ON DELETE RESTRICT;