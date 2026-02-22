import { NextResponse } from "next/server";
import { getMembers } from "@/services/member.service";
import { getExpenses } from "@/services/expense.service";
import { calculateSettlements } from "@/services/algorithm.service";
import { syncSettlementPlan } from "@/services/settlement.service";
import { verifyGroupAuth, authErrorResponse } from "@/lib/auth-helpers";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ groupId: string }> }
) {
    try {
        const { groupId } = await params;

        try {
            await verifyGroupAuth(groupId, request);
        } catch (authError: unknown) {
            return authErrorResponse(authError as Error);
        }

        const [members, expenses] = await Promise.all([
            getMembers(groupId),
            getExpenses(groupId),
        ]);
        const calculatedPlan = calculateSettlements(members, expenses);
        const plan = await syncSettlementPlan(groupId, calculatedPlan.plan);

        return NextResponse.json({
            expenses,
            settlement: {
                totalGroupSpend: calculatedPlan.totalGroupSpend,
                stats: calculatedPlan.stats,
                plan: plan
            }
        });
    } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
