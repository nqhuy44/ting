import { NextResponse } from "next/server";
import { createGroup } from "@/services/group.service";
import { initMasterDB } from "@/services/db.service";

export async function POST(request: Request) {
    try {
        await initMasterDB();
        const { name, currency, exchangeFee } = await request.json();
        if (!name) {
            return NextResponse.json({ error: "Group name is required" }, { status: 400 });
        }
        const group = await createGroup(name, currency, Number(exchangeFee));
        return NextResponse.json(group);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
