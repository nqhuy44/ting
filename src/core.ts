import axios from "axios";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getMasterDB, getGroupDB, closeGroupDB } from "./db";
import { Group, Member, Expense } from "./types";

// --- HELPERS ---

// Generate a random 6-character alphanumeric passcode (Uppercase)
const generatePasscode = (): string => {
  // Removed confusing characters like I, O, 1, 0
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Fetch real-time exchange rate
const getExchangeRate = async (from: string, to: string): Promise<number> => {
  if (from === to) return 1;
  try {
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${from}`
    );
    const rate = response.data.rates[to];
    if (!rate) {
      throw new Error(`Rate for ${to} not found in ${from} response.`);
    }
    return rate;
  } catch (error) {
    console.error("❌ Exchange Rate API Failed:", error);
    throw new Error(`Failed to fetch exchange rate for ${from} -> ${to}`);
  }
};

// --- GROUP MANAGEMENT ---

// 1. Create Group (Auto-generates Passcode)
export const createGroup = (
  name: string,
  currency: string,
  exchangeFee: number
): Promise<Group> => {
  return new Promise((resolve, reject) => {
    const passcode = generatePasscode(); // Auto-generate
    const group: Group = {
      id: uuidv4(),
      name,
      passcode,
      currency: currency || "VND",
      exchangeFee: Number(exchangeFee) || 0,
      createdAt: Date.now(),
    };

    const master = getMasterDB();
    master.run(
      `INSERT INTO groups (id, name, passcode, currency, exchangeFee, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        group.id,
        group.name,
        group.passcode,
        group.currency,
        group.exchangeFee,
        group.createdAt,
      ],
      async (err) => {
        if (err) return reject(err);

        // Initialize the specific SQLite file for this group immediately
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

// 2. Get Group Details (Verifies Passcode - Case Insensitive)
export const getGroupDetails = (
  groupId: string,
  providedPasscode?: string
): Promise<Group> => {
  const master = getMasterDB();
  return new Promise((resolve, reject) => {
    master.get(`SELECT * FROM groups WHERE id = ?`, [groupId], (err, row) => {
      if (err) return reject(err);
      if (!row) return reject(new Error("Group not found"));

      const group = row as Group;

      // If a passcode is provided, verify it (Case Insensitive)
      if (providedPasscode) {
        if (group.passcode.toUpperCase() !== providedPasscode.toUpperCase()) {
          return reject(new Error("Invalid Passcode"));
        }
      } else {
        // Internal calls without passcode (e.g. deletion logic might check elsewhere)
      }

      resolve(group);
    });
  });
};

// 3. Delete Group
export const deleteGroup = async (groupId: string): Promise<void> => {
  // Close connection to release file lock
  await closeGroupDB(groupId);

  // Delete from Master DB
  const master = getMasterDB();
  await new Promise<void>((resolve, reject) => {
    master.run(`DELETE FROM groups WHERE id = ?`, [groupId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Delete the physical file
  const safeId = path.basename(groupId);
  const dbPath = path.join(__dirname, "../data", `${safeId}.db`);

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
};

// --- MEMBER MANAGEMENT ---

export const addMember = async (
  groupId: string,
  name: string
): Promise<Member> => {
  const db = await getGroupDB(groupId);
  return new Promise((resolve, reject) => {
    const member: Member = { id: uuidv4(), groupId, name };
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
      if (err) reject(err);
      else
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

// 4. Update Member Details (Payment Info)
export const updateMember = async (
  groupId: string,
  memberId: string,
  paymentInfo: any
): Promise<void> => {
  const db = await getGroupDB(groupId);
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE members SET paymentInfo = ? WHERE id = ?`,
      [JSON.stringify(paymentInfo), memberId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

// --- EXPENSE MANAGEMENT ---

export const addExpense = async (
  groupId: string,
  description: string,
  originalAmount: number,
  originalCurrency: string,
  paidBy: string,
  sharedBy: string[]
): Promise<Expense> => {
  // 1. Fetch Group Settings manually to avoid recursive passcode requirement
  const master = getMasterDB();
  const groupSettings: any = await new Promise((resolve, reject) => {
    master.get(
      `SELECT currency, exchangeFee FROM groups WHERE id = ?`,
      [groupId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!groupSettings)
    throw new Error("Group not found during expense addition");

  const baseCurrency = groupSettings.currency;
  const feePercent = groupSettings.exchangeFee;

  let exchangeRate = 1;
  let finalAmount = originalAmount;

  // 2. Conversion Logic
  if (originalCurrency !== baseCurrency) {
    exchangeRate = await getExchangeRate(originalCurrency, baseCurrency);
    const converted = originalAmount * exchangeRate;
    const feeAmount = converted * (feePercent / 100);
    finalAmount = converted + feeAmount;
  }

  // 3. Storage Logic (Integer Math)
  const zeroDecimalCurrencies = ["VND", "JPY", "KRW", "HUF", "CLP"];
  const isZeroDecimal = zeroDecimalCurrencies.includes(baseCurrency);
  const dbAmount = isZeroDecimal
    ? Math.round(finalAmount)
    : Math.round(finalAmount * 100);

  // 4. Insert into DB
  const db = await getGroupDB(groupId);
  return new Promise((resolve, reject) => {
    const expense: Expense = {
      id: uuidv4(),
      groupId,
      description,
      amount: dbAmount,
      originalCurrency,
      originalAmount,
      exchangeRate,
      paidBy,
      sharedBy,
      createdAt: Date.now(),
    };

    db.run(
      `INSERT INTO expenses (id, description, amount, originalCurrency, originalAmount, exchangeRate, paidBy, sharedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.id,
        expense.description,
        expense.amount,
        expense.originalCurrency,
        expense.originalAmount,
        expense.exchangeRate,
        expense.paidBy,
        JSON.stringify(expense.sharedBy),
        expense.createdAt,
      ],
      (err) => (err ? reject(err) : resolve(expense))
    );
  });
};

export const getExpenses = async (groupId: string): Promise<Expense[]> => {
  const db = await getGroupDB(groupId);
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM expenses ORDER BY createdAt DESC`,
      (err, rows: any[]) => {
        if (err) return reject(err);
        const expenses = rows.map((r) => ({
          ...r,
          groupId,
          sharedBy: JSON.parse(r.sharedBy),
        }));
        resolve(expenses);
      }
    );
  });
};

// Delete Expense (Undo)
export const deleteExpense = async (
  groupId: string,
  expenseId: string
): Promise<void> => {
  const db = await getGroupDB(groupId);
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM expenses WHERE id = ?`, [expenseId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};
