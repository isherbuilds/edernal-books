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

**Posted Business Document**:
A finalized owner-facing document whose accounting-impacting fields are part of the books. Corrections create a new accounting event rather than editing the original accounting fact.
_Avoid_: Editable invoice, mutable bill

**Sales Document**:
An owner-facing source document with sales semantics such as customer, line items, payment terms, and tax details. A manual journal entry that posts to a sales account is not a sales document.
_Avoid_: Sales journal entry, ledger-derived invoice

**Purchase Document**:
An owner-facing source document with purchase semantics such as vendor, line items, due dates, and tax details. A manual journal entry that posts to a purchase or expense account is not a purchase document.
_Avoid_: Purchase journal entry, ledger-derived bill

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

**Control Account**:
A ledger account whose balance is normally driven by a supporting workflow such as customers, vendors, payments, or bank reconciliation. Manual posting to a control account should be blocked unless that workflow exists.
_Avoid_: Ordinary posting account
