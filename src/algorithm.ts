import {
  Expense,
  Member,
  MemberStat,
  SettlementReport,
  Transaction,
} from "./types";

export const calculateSettlements = (
  members: Member[],
  expenses: Expense[]
): SettlementReport => {
  const paidMap = new Map<string, number>();
  const shareMap = new Map<string, number>();
  const memberNameMap = new Map<string, string>();

  // 1. Initialize maps
  members.forEach((m) => {
    paidMap.set(m.id, 0);
    shareMap.set(m.id, 0);
    memberNameMap.set(m.id, m.name);
  });

  let totalGroupSpend = 0;

  // 2. Aggregate Totals
  expenses.forEach((exp) => {
    const isSettlement = exp.description.startsWith("SETTLEMENT:");

    if (isSettlement) {
      // --- SETTLEMENT LOGIC (Transfer) ---
      // 1. Debtor (Payer) effectively contributes cash
      const debtorPaid = paidMap.get(exp.paidBy) || 0;
      paidMap.set(exp.paidBy, debtorPaid + exp.amount);

      // 2. Creditor (Receiver) gets money back, reducing their "Advance"
      exp.sharedBy.forEach((creditorId) => {
        const creditorPaid = paidMap.get(creditorId) || 0;
        // We subtract from their "Paid" because they have been reimbursed
        paidMap.set(creditorId, creditorPaid - exp.amount);
      });

      // NOTE: We do NOT touch shareMap. Settlements don't change consumption.
    } else {
      // --- NORMAL EXPENSE LOGIC ---
      totalGroupSpend += exp.amount;

      // 1. Add to Payer
      const currentPaid = paidMap.get(exp.paidBy) || 0;
      paidMap.set(exp.paidBy, currentPaid + exp.amount);

      // 2. Add to Sharers (Consumption)
      const splitCount = exp.sharedBy.length;
      if (splitCount > 0) {
        const baseShare = Math.floor(exp.amount / splitCount);
        const remainder = exp.amount % splitCount;

        exp.sharedBy.forEach((memberId, index) => {
          const amountOwed = baseShare + (index < remainder ? 1 : 0);
          const currentShare = shareMap.get(memberId) || 0;
          shareMap.set(memberId, currentShare + amountOwed);
        });
      }
    }
  });

  // 3. Build Stats Objects
  const stats: MemberStat[] = [];
  const balances: { id: string; name: string; net: number }[] = [];

  members.forEach((m) => {
    const paid = paidMap.get(m.id) || 0;
    const share = shareMap.get(m.id) || 0;
    const net = paid - share;

    stats.push({
      memberId: m.id,
      memberName: m.name,
      totalPaid: paid,
      totalShare: share,
      netBalance: net,
    });

    balances.push({ id: m.id, name: m.name, net: net });
  });

  // 4. Calculate Settlement Plan (Greedy Algorithm)
  const debtors = balances
    .filter((b) => b.net < -0.01)
    .sort((a, b) => a.net - b.net);
  const creditors = balances
    .filter((b) => b.net > 0.01)
    .sort((a, b) => b.net - a.net);

  const plan: Transaction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    let debtor = debtors[i];
    let creditor = creditors[j];

    let amount = Math.min(Math.abs(debtor.net), creditor.net);

    if (amount > 0) {
      plan.push({
        from: debtor.name,
        to: creditor.name,
        amount: amount,
      });
    }

    debtor.net += amount;
    creditor.net -= amount;

    if (Math.abs(debtor.net) < 0.01) i++;
    if (creditor.net < 0.01) j++;
  }

  return { totalGroupSpend, stats, plan };
};
