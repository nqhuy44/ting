import { NextResponse } from "next/server";
import { getGroupDetails, deleteGroup } from "@/services/group.service";
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

        const group = await getGroupDetails(groupId);
        return NextResponse.json(group);
    } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message }, { status: 404 });
    }
}

export async function DELETE(
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

        await deleteGroup(groupId);
        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
