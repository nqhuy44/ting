import { NextResponse } from "next/server";
import { addExpense } from "@/services/expense.service";
import { verifyGroupAuth, authErrorResponse } from "@/lib/auth-helpers";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ groupId: string }> }
) {
    try {
        const { groupId } = await params;

        try {
            await verifyGroupAuth(groupId, request);
        } catch (authError: any) {
            return authErrorResponse(authError);
        }

        const { description, amount, currency, paidBy, sharedBy } = await request.json();

        if (!amount || !paidBy || !sharedBy) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const expense = await addExpense(groupId, description, Number(amount), currency, paidBy, sharedBy);
        return NextResponse.json(expense);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
