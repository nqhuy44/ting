import { NextResponse } from "next/server";
import { getSettlements } from "@/services/settlement.service";
import { verifyGroupAuth, authErrorResponse } from "@/lib/auth-helpers";

export async function GET(
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

        const settlements = await getSettlements(groupId);
        return NextResponse.json(settlements);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
