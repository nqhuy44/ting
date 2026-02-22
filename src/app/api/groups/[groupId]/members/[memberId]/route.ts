import { NextResponse } from "next/server";
import { updateMemberPaymentInfo } from "@/services/member.service";
import { verifyGroupAuth, authErrorResponse } from "@/lib/auth-helpers";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ groupId: string, memberId: string }> }
) {
    try {
        const { groupId, memberId } = await params;

        try {
            await verifyGroupAuth(groupId, request);
        } catch (authError: any) {
            return authErrorResponse(authError);
        }

        const { paymentInfo } = await request.json();
        await updateMemberPaymentInfo(groupId, memberId, paymentInfo);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
