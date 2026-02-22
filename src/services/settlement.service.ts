import { getGroupDB } from "./db.service";
import { Transaction } from "../types";
import { v4 as uuidv4 } from "uuid";

export const getSettlements = async (groupId: string): Promise<Transaction[]> => {
    const db = await getGroupDB(groupId);
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT s.*, m1.name as fromName, m2.name as toName 
             FROM settlements s
             JOIN members m1 ON s.fromId = m1.id
             JOIN members m2 ON s.toId = m2.id`,
            (err, rows) => {
                if (err) return reject(err);
                const results = (rows as any[]) || [];
                resolve(results.map((row: any) => ({
                    id: row.id,
                    fromId: row.fromId,
                    from: row.fromName,
                    toId: row.toId,
                    to: row.toName,
                    amount: row.amount,
                    status: row.status as 'pending' | 'completed',
                    paidAt: row.paidAt
                })));
            }
        );
    });
};

export const completeSettlement = async (groupId: string, settlementId: string): Promise<void> => {
    const db = await getGroupDB(groupId);
    const paidAt = Date.now();
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE settlements SET status = 'completed', paidAt = ? WHERE id = ?`,
            [paidAt, settlementId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
};

export const syncSettlementPlan = async (groupId: string, plan: Transaction[]): Promise<Transaction[]> => {
    const db = await getGroupDB(groupId);
    const existing = await getSettlements(groupId);

    const results: Transaction[] = [];

    // Ensure plan is an array to avoid crashes
    const transactions = Array.isArray(plan) ? plan : [];

    for (const t of transactions) {
        // Find existing match (same fromId, toId, and amount)
        const match = existing.find(ex => ex.fromId === t.fromId && ex.toId === t.toId && ex.amount === t.amount);

        if (match) {
            results.push(match);
        } else {
            const id = uuidv4();
            const newSettlement: Transaction = { ...t, id, status: 'pending' };
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO settlements (id, fromId, toId, amount, status) VALUES (?, ?, ?, ?, ?)`,
                    [id, newSettlement.fromId, newSettlement.toId, newSettlement.amount, newSettlement.status],
                    (err) => err ? reject(err) : resolve(null)
                );
            });
            results.push(newSettlement);
        }
    }

    return results;
};
