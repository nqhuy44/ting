import { NextResponse } from "next/server";
import { getMembers, addMember } from "@/services/member.service";
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

        const members = await getMembers(groupId);
        return NextResponse.json(members);
    } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}

export async function POST(
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

        const { name } = await request.json();
        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const member = await addMember(groupId, name);
        return NextResponse.json(member);
    } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
