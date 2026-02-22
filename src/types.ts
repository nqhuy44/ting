export interface Group {
    id: string;
    name: string;
    passcode: string;
    currency: string;
    exchangeFee: number;
    createdAt: number;
}

export interface PaymentInfo {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    qrCode?: string; // Base64 string
    note?: string;
}

export interface Member {
    id: string;
    groupId: string;
    name: string;
    paymentInfo?: PaymentInfo;
}

export interface Expense {
    id: string;
    groupId: string;
    description: string;
    amount: number; // Normalized amount in Base Currency (Integer/Cents)
    originalCurrency: string;
    originalAmount: number;
    exchangeRate: number;
    paidBy: string; // Member ID
    sharedBy: string[]; // List of Member IDs
    createdAt: number;
}

export interface MemberStat {
    memberId: string;
    memberName: string;
    totalPaid: number; // Total amount they pulled from their wallet
    totalShare: number; // Total value of things they enjoyed/consumed
    netBalance: number; // The difference (Paid - Share)
}

export interface Transaction {
    id: string;
    fromId: string;
    from: string; // Member Name
    toId: string;
    to: string; // Member Name
    amount: number;
    status: 'pending' | 'completed';
    paidAt?: number;
}

export interface SettlementReport {
    totalGroupSpend: number;
    stats: MemberStat[];
    plan: Transaction[]; // Who transfers to whom
}
