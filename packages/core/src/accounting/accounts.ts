import { type LedgerAccountCategory, type NormalBalance } from "./types";

export type DefaultLedgerAccountDefinition = {
  accountCategory: LedgerAccountCategory;
  accountType: string;
  allowManualPosting: boolean;
  code: string;
  isGroup: boolean;
  name: string;
  normalBalance: NormalBalance;
  parentSystemKey: null | string;
  sortOrder: number;
  systemKey: string;
};

export const DEFAULT_LEDGER_ACCOUNTS = [
  {
    accountCategory: "asset",
    accountType: "group",
    allowManualPosting: false,
    code: "1000",
    isGroup: true,
    name: "Assets",
    normalBalance: "debit",
    parentSystemKey: null,
    sortOrder: 100,
    systemKey: "assets"
  },
  {
    accountCategory: "asset",
    accountType: "cash",
    allowManualPosting: true,
    code: "1010",
    isGroup: false,
    name: "Cash",
    normalBalance: "debit",
    parentSystemKey: "assets",
    sortOrder: 110,
    systemKey: "cash"
  },
  {
    accountCategory: "asset",
    accountType: "bank",
    allowManualPosting: true,
    code: "1020",
    isGroup: false,
    name: "Bank",
    normalBalance: "debit",
    parentSystemKey: "assets",
    sortOrder: 120,
    systemKey: "bank"
  },
  {
    accountCategory: "asset",
    accountType: "receivable",
    allowManualPosting: false,
    code: "1100",
    isGroup: false,
    name: "Accounts Receivable",
    normalBalance: "debit",
    parentSystemKey: "assets",
    sortOrder: 130,
    systemKey: "accounts_receivable"
  },
  {
    accountCategory: "liability",
    accountType: "group",
    allowManualPosting: false,
    code: "2000",
    isGroup: true,
    name: "Liabilities",
    normalBalance: "credit",
    parentSystemKey: null,
    sortOrder: 200,
    systemKey: "liabilities"
  },
  {
    accountCategory: "liability",
    accountType: "payable",
    allowManualPosting: false,
    code: "2100",
    isGroup: false,
    name: "Accounts Payable",
    normalBalance: "credit",
    parentSystemKey: "liabilities",
    sortOrder: 210,
    systemKey: "accounts_payable"
  },
  {
    accountCategory: "equity",
    accountType: "group",
    allowManualPosting: false,
    code: "3000",
    isGroup: true,
    name: "Equity",
    normalBalance: "credit",
    parentSystemKey: null,
    sortOrder: 300,
    systemKey: "equity"
  },
  {
    accountCategory: "equity",
    accountType: "owners_equity",
    allowManualPosting: true,
    code: "3100",
    isGroup: false,
    name: "Owner's Equity",
    normalBalance: "credit",
    parentSystemKey: "equity",
    sortOrder: 310,
    systemKey: "owners_equity"
  },
  {
    accountCategory: "equity",
    accountType: "retained_earnings",
    allowManualPosting: false,
    code: "3200",
    isGroup: false,
    name: "Retained Earnings",
    normalBalance: "credit",
    parentSystemKey: "equity",
    sortOrder: 320,
    systemKey: "retained_earnings"
  },
  {
    accountCategory: "equity",
    accountType: "opening_balance_difference",
    allowManualPosting: true,
    code: "3900",
    isGroup: false,
    name: "Opening Balance Difference",
    normalBalance: "credit",
    parentSystemKey: "equity",
    sortOrder: 390,
    systemKey: "opening_balance_difference"
  },
  {
    accountCategory: "income",
    accountType: "group",
    allowManualPosting: false,
    code: "4000",
    isGroup: true,
    name: "Income",
    normalBalance: "credit",
    parentSystemKey: null,
    sortOrder: 400,
    systemKey: "income"
  },
  {
    accountCategory: "income",
    accountType: "sales",
    allowManualPosting: true,
    code: "4100",
    isGroup: false,
    name: "Sales",
    normalBalance: "credit",
    parentSystemKey: "income",
    sortOrder: 410,
    systemKey: "sales"
  },
  {
    accountCategory: "expense",
    accountType: "group",
    allowManualPosting: false,
    code: "5000",
    isGroup: true,
    name: "Expenses",
    normalBalance: "debit",
    parentSystemKey: null,
    sortOrder: 500,
    systemKey: "expenses"
  },
  {
    accountCategory: "expense",
    accountType: "purchase",
    allowManualPosting: true,
    code: "5100",
    isGroup: false,
    name: "Purchases",
    normalBalance: "debit",
    parentSystemKey: "expenses",
    sortOrder: 510,
    systemKey: "purchases"
  },
  {
    accountCategory: "expense",
    accountType: "operating_expense",
    allowManualPosting: true,
    code: "5200",
    isGroup: false,
    name: "General Expenses",
    normalBalance: "debit",
    parentSystemKey: "expenses",
    sortOrder: 520,
    systemKey: "general_expenses"
  },
  {
    accountCategory: "expense",
    accountType: "bank_charge",
    allowManualPosting: true,
    code: "5300",
    isGroup: false,
    name: "Bank Charges",
    normalBalance: "debit",
    parentSystemKey: "expenses",
    sortOrder: 530,
    systemKey: "bank_charges"
  }
] as const satisfies readonly DefaultLedgerAccountDefinition[];
