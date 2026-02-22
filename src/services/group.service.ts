import { v4 as uuidv4 } from "uuid";
import { getMasterDB, getGroupDB, closeGroupDB } from "./db.service";
import { Group } from "../types";
import fs from "fs";
import path from "path";

const generatePasscode = (): string => {
    const chars = "0123456789";
    let result = "";
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const createGroup = async (
    name: string,
    currency: string = "VND",
    exchangeFee: number = 0
): Promise<Group> => {
    const group: Group = {
        id: uuidv4(),
        name,
        passcode: generatePasscode(),
        currency,
        exchangeFee,
        createdAt: Date.now(),
    };

    const master = getMasterDB();
    return new Promise((resolve, reject) => {
        master.run(
            `INSERT INTO groups (id, name, passcode, currency, exchangeFee, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            [group.id, group.name, group.passcode, group.currency, group.exchangeFee, group.createdAt],
            async (err) => {
                if (err) return reject(err);
                try {
                    await getGroupDB(group.id);
                    resolve(group);
                } catch (e) {
                    reject(e);
                }
            }
        );
    });
};

export const getGroupDetails = async (
    groupId: string,
    passcode?: string
): Promise<Group> => {
    const master = getMasterDB();
    return new Promise((resolve, reject) => {
        master.get(`SELECT * FROM groups WHERE id = ?`, [groupId], (err, row) => {
            if (err) return reject(err);
            if (!row) return reject(new Error("Group not found"));

            const group = row as Group;
            if (passcode && group.passcode.toUpperCase() !== passcode.toUpperCase()) {
                return reject(new Error("Invalid Passcode"));
            }
            resolve(group);
        });
    });
};

export const deleteGroup = async (groupId: string): Promise<void> => {
    await closeGroupDB(groupId);
    const master = getMasterDB();
    await new Promise<void>((resolve, reject) => {
        master.run(`DELETE FROM groups WHERE id = ?`, [groupId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    const dbPath = path.join(process.cwd(), "data", `${path.basename(groupId)}.db`);
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
};
