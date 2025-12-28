export interface Group {
  id: string;
  name: string;
  passcode: string;
  createdAt: number;
}

export interface Member {
  id: string;
  groupId: string;
  name: string;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number; // Stored in cents
  paidBy: string; // Member ID
  sharedBy: string[]; // List of Member IDs
  createdAt: number;
}

export interface Balance {
  memberId: string;
  memberName: string;
  netBalance: number; // Positive = Owed to them, Negative = They owe
}

export interface Transaction {
  from: string; // Member Name
  to: string; // Member Name
  amount: number;
}

export interface Group {
  id: string;
  name: string;
  passcode: string;
  currency: string; // NEW: e.g., 'VND', 'USD'
  exchangeFee: number; // NEW: e.g., 1.5 (%)
  createdAt: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number; // Normalized amount in Base Currency (Integer/Cents)
  originalCurrency: string; // NEW: e.g., 'USD'
  originalAmount: number; // NEW: e.g., 10.50
  exchangeRate: number; // NEW: e.g., 24500
  paidBy: string;
  sharedBy: string[];
  createdAt: number;
}

// ... Member, Balance, Transaction remain the same
export interface Member {
  id: string;
  groupId: string;
  name: string;
}
export interface Balance {
  memberId: string;
  memberName: string;
  netBalance: number;
}
export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

export interface MemberStat {
  memberId: string;
  memberName: string;
  totalPaid: number; // Total amount they pulled from their wallet
  totalShare: number; // Total value of things they enjoyed/consumed
  netBalance: number; // The difference (Paid - Share)
}

// UPDATED: The full report structure
export interface SettlementReport {
  totalGroupSpend: number;
  stats: MemberStat[];
  plan: Transaction[]; // Who transfers to whom
}
