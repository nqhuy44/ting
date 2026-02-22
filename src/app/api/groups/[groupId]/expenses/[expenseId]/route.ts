import { NextResponse } from "next/server";
import { deleteExpense, updateExpense } from "@/services/expense.service";
import { verifyGroupAuth, authErrorResponse } from "@/lib/auth-helpers";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ groupId: string; expenseId: string }> }
) {
    try {
        const { groupId, expenseId } = await params;

        try {
            await verifyGroupAuth(groupId, request);
        } catch (authError: any) {
            return authErrorResponse(authError);
        }

        await deleteExpense(groupId, expenseId);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ groupId: string; expenseId: string }> }
) {
    try {
        const { groupId, expenseId } = await params;

        try {
            await verifyGroupAuth(groupId, request);
        } catch (authError: any) {
            return authErrorResponse(authError);
        }

        const { description, amount, currency, paidBy, sharedBy } = await request.json();

        const expense = await updateExpense(
            groupId,
            expenseId,
            description,
            Number(amount),
            currency,
            paidBy,
            sharedBy
        );

        return NextResponse.json(expense);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
