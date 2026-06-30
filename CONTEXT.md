# Edernal Books Context

Owner-first accounting language for India SMB bookkeeping. This glossary keeps product and accounting terms consistent across planning, implementation, and review.

## Language

**Accounting Kernel**:
The smallest books foundation that keeps accountant-grade ledger records and reports. It is not the owner workflow for invoices, expenses, receipts, or payments.
_Avoid_: Phase 1 product, bookkeeping MVP

**Journal Entry**:
A posted accounting fact made of balanced debit and credit lines. Unposted form state is a journal draft, not a journal entry.
_Avoid_: Journal draft, journal batch

**Source Document**:
The business-document anchor that explains why a posted accounting fact exists. It carries document identity, while document-specific amounts and lifecycle belong to the document workflow.
_Avoid_: Idempotency record, journal draft

**Posted Document**:
A finalized owner-facing document whose accounting-impacting fields are part of the books. Corrections create a new accounting event rather than editing the original accounting fact.
_Avoid_: Editable invoice, mutable bill

**Document Spine**:
The owner-facing document workflow that turns sales, purchase, receipt, and payment activity into source-backed posted documents. It defines document lifecycle semantics, not GST calculation or tax reporting.
_Avoid_: Phase 2.5, invoice UI, GST workflow

**Tax-Ready Metadata**:
Optional party and item identity or classification details, such as GSTIN, PAN, and HSN/SAC, kept for later tax workflows. It is not tax calculation, tax registration setup, or compliance reporting.
_Avoid_: GST workflow, tax engine, compliance state

**Sales Document**:
An owner-facing source document with sales semantics such as customer, line items, payment terms, and tax details. A manual journal entry that posts to a sales account is not a sales document.
_Avoid_: Sales journal entry, ledger-derived invoice

**Purchase Document**:
An owner-facing source document with purchase semantics such as vendor, line items, due dates, and tax details. A manual journal entry that posts to a purchase or expense account is not a purchase document.
_Avoid_: Purchase journal entry, ledger-derived bill

**Settlement**:
A money movement that settles one or more sales or purchase documents, either fully or partially. Product copy may say money received or money paid, but the domain concept is the same.
_Avoid_: Receipt workflow, payment workflow, bank reconciliation

**Operation Key**:
A caller-provided key that identifies one intended accounting command so retries do not create duplicate posted facts. It is not a public API replay record.
_Avoid_: Request ID, replay ledger

**Base-Currency Posting**:
A journal entry recorded only in the business base currency. Foreign-currency document amounts and exchange-rate effects belong to later workflows.
_Avoid_: Phase 1 FX posting, same-currency FX

**Ledger Account**:
A chart-of-accounts node that classifies posted journal lines. It may be a grouping node or a posting account.
_Avoid_: Account group, bank account record

**Accounting Period**:
A date range that controls whether accounting facts can be posted for that range. A locked or closed period does not accept normal postings.
_Avoid_: Soft lock, calendar month

**Reversal**:
A posted journal entry that cancels another posted journal entry by posting opposite lines. The original remains a posted accounting fact.
_Avoid_: Reversed status, journal edit

**Void**:
The business-document state that says a posted document is no longer operationally active, while its original accounting fact stays intact and is offset by a reversal.
_Avoid_: Delete posted document, edit posted document, cancel as mutation

**Audit Event**:
A compact trace record for an accounting or settings mutation. It proves who performed a sensitive action without duplicating immutable ledger rows.
_Avoid_: Fire-and-forget log, full ledger snapshot

**Trial Balance**:
A report that totals posted debit and credit balances by ledger account to prove the books balance at a date.
_Avoid_: Profit and loss, balance sheet

**General Ledger**:
A report of posted journal lines for one ledger account, ordered as an account history.
_Avoid_: Transaction list, sales register

**Viewer**:
A business member who can see only explicitly granted owner-facing information. Viewer does not imply access to accounting-kernel reports.
_Avoid_: Report reader, accountant

**Owner**:
The business member with authority over business settings, accounting setup, accounting reports, manual postings, reversals, and period locks.
_Avoid_: Operator, admin user

**Accountant**:
A business member trusted with accounting-kernel actions and reports but not ownership settings or member management.
_Avoid_: Viewer, business owner

**Opening Balance**:
The starting balance brought into the books at the books start date. It is posted as a journal entry, while later period balances are derived from posted accounting facts.
_Avoid_: Balance cache, monthly opening entry

**Journal Entry Number**:
A human-readable voucher number assigned to a posted journal entry for accountant reference, audit, export, and reversal traceability.
_Avoid_: UUID, document number

**Draft Reference**:
A non-official identifier for an editable document before posting. It is
safe for UI, assistant, and support references, but it is not an invoice number,
receipt number, settlement number, or compliance serial.
_Avoid_: Invoice number, posted document number, GST serial

**Official Document Number**:
A human-readable document number assigned only when a draft is posted. It
comes from `number_sequence` inside the posting transaction and stays attached
to posted and voided documents.
_Avoid_: Draft reference, UUID, user-entered number

**Control Account**:
A ledger account whose balance is normally driven by a supporting workflow such as customers, vendors, payments, or bank reconciliation. Manual posting to a control account should be blocked unless that workflow exists.
_Avoid_: Ordinary posting account
