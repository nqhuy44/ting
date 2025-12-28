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
    totalGroupSpend += exp.amount;

    // Add to Payer
    const currentPaid = paidMap.get(exp.paidBy) || 0;
    paidMap.set(exp.paidBy, currentPaid + exp.amount);

    // Add to Sharers (Distribute logic)
    const splitCount = exp.sharedBy.length;
    if (splitCount > 0) {
      const baseShare = Math.floor(exp.amount / splitCount);
      const remainder = exp.amount % splitCount;

      exp.sharedBy.forEach((memberId, index) => {
        // Distribute remainder cents to first few people to ensure exact sum
        const amountOwed = baseShare + (index < remainder ? 1 : 0);
        const currentShare = shareMap.get(memberId) || 0;
        shareMap.set(memberId, currentShare + amountOwed);
      });
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
  // We filter out 0 balances to optimize
  const debtors = balances
    .filter((b) => b.net < -0.01)
    .sort((a, b) => a.net - b.net); // Ascending
  const creditors = balances
    .filter((b) => b.net > 0.01)
    .sort((a, b) => b.net - a.net); // Descending

  const plan: Transaction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    let debtor = debtors[i];
    let creditor = creditors[j];

    // Match the smaller of the two magnitudes
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
