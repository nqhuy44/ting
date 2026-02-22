import { NextResponse } from "next/server";
import { completeSettlement } from "@/services/settlement.service";
import { verifyGroupAuth, authErrorResponse } from "@/lib/auth-helpers";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ groupId: string, id: string }> }
) {
    try {
        const { groupId, id } = await params;

        try {
            await verifyGroupAuth(groupId, request);
        } catch (authError: any) {
            return authErrorResponse(authError);
        }

        await completeSettlement(groupId, id);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
