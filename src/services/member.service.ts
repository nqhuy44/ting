import { v4 as uuidv4 } from "uuid";
import { getGroupDB } from "./db.service";
import { Member, PaymentInfo } from "../types";

export const addMember = async (
    groupId: string,
    name: string
): Promise<Member> => {
    const db = await getGroupDB(groupId);
    const member: Member = { id: uuidv4(), groupId, name };
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO members (id, name) VALUES (?, ?)`,
            [member.id, member.name],
            (err) => (err ? reject(err) : resolve(member))
        );
    });
};

export const getMembers = async (groupId: string): Promise<Member[]> => {
    const db = await getGroupDB(groupId);
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM members`, (err, rows: any[]) => {
            if (err) return reject(err);
            resolve(
                rows.map((r) => ({
                    ...r,
                    groupId,
                    paymentInfo: r.paymentInfo ? JSON.parse(r.paymentInfo) : undefined,
                }))
            );
        });
    });
};

export const updateMemberPaymentInfo = async (
    groupId: string,
    memberId: string,
    paymentInfo: PaymentInfo
): Promise<void> => {
    const db = await getGroupDB(groupId);
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE members SET paymentInfo = ? WHERE id = ?`,
            [JSON.stringify(paymentInfo), memberId],
            (err) => (err ? reject(err) : resolve())
        );
    });
};
