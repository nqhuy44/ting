import { getGroupDetails } from "@/services/group.service";
import { NextResponse } from "next/server";

/**
 * Verifies if the provided passcode is valid for the given group.
 * Passcode should be provided in 'x-passcode' header.
 */
export async function verifyGroupAuth(groupId: string, request: Request) {
    const passcode = request.headers.get("x-passcode");

    if (!passcode) {
        throw new Error("Authorization Required: Missing x-passcode header");
    }

    try {
        await getGroupDetails(groupId, passcode);
        return true;
    } catch (_e: unknown) {
        throw new Error("Authorization Failed: Invalid passcode");
    }
}

/**
 * Standard error response for auth failures
 */
export function authErrorResponse(error: Error) {
    const status = error.message.includes("Missing") ? 401 : 403;
    return NextResponse.json({ error: error.message }, { status });
}
