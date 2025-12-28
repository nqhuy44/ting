import axios from "axios";
import fs from "fs"; // NEW
import path from "path"; // NEW
import { v4 as uuidv4 } from "uuid";
import { getMasterDB, getGroupDB, closeGroupDB } from "./db"; // Import closeGroupDB
import { Group, Member, Expense } from "./types";

// --- HELPER: Fetch Live Exchange Rate ---
const getExchangeRate = async (from: string, to: string): Promise<number> => {
  // Optimization: If currencies match, no API call needed.
  if (from === to) return 1;

  try {
    // Using a reliable free API
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${from}`
    );
    const rate = response.data.rates[to];

    if (!rate) {
      console.warn(`Warning: Rate for ${to} not found in ${from} response.`);
      return 1; // Fallback to 1:1 to prevent crash, but logs warning
    }
    return rate;
  } catch (error) {
    console.error("❌ Exchange Rate API Failed:", error);
    return 1; // Fallback
  }
};

// --- GROUP MANAGEMENT ---

// 1. Create Group (Saved to Master DB)
export const createGroup = (
  name: string,
  passcode: string,
  currency: string,
  exchangeFee: number
): Promise<Group> => {
  return new Promise((resolve, reject) => {
    const group: Group = {
      id: uuidv4(),
      name,
      passcode,
      currency: currency || "VND", // Default Base Currency
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

// 2. Get Group Details (From Master DB)
export const getGroupDetails = (groupId: string): Promise<Group> => {
  const master = getMasterDB();
  return new Promise((resolve, reject) => {
    master.get(`SELECT * FROM groups WHERE id = ?`, [groupId], (err, row) => {
      if (err) return reject(err);
      if (!row) return reject(new Error("Group not found"));
      resolve(row as Group);
    });
  });
};

// --- MEMBER MANAGEMENT (Specific Group DB) ---

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
      // Append groupId to the objects for consistency with the interface
      else resolve(rows.map((r) => ({ ...r, groupId })));
    });
  });
};

// --- EXPENSE MANAGEMENT (Specific Group DB + Currency Logic) ---

export const addExpense = async (
  groupId: string,
  description: string,
  originalAmount: number,
  originalCurrency: string,
  paidBy: string,
  sharedBy: string[]
): Promise<Expense> => {
  // 1. Fetch Group Settings (Base Currency & Fee %)
  const group = await getGroupDetails(groupId);
  const baseCurrency = group.currency;
  const feePercent = group.exchangeFee;

  let exchangeRate = 1;
  let finalAmount = originalAmount;

  // 2. Currency Conversion Logic
  if (originalCurrency !== baseCurrency) {
    console.log(
      `💱 Converting ${originalAmount} ${originalCurrency} -> ${baseCurrency}...`
    );

    exchangeRate = await getExchangeRate(originalCurrency, baseCurrency);

    const converted = originalAmount * exchangeRate;
    const feeAmount = converted * (feePercent / 100);
    finalAmount = converted + feeAmount;

    console.log(
      `   Rate: ${exchangeRate}, Fee: ${feeAmount.toFixed(
        2
      )}, Final: ${finalAmount.toFixed(2)}`
    );
  }

  // 3. Determine Storage Format (Integer Math)
  // - Currencies with NO decimals (VND, JPY, KRW): Store as rounded integer.
  // - Currencies WITH decimals (USD, EUR): Store as Cents (x100).
  const zeroDecimalCurrencies = ["VND", "JPY", "KRW", "HUF", "CLP"];
  const isZeroDecimal = zeroDecimalCurrencies.includes(baseCurrency);

  // If base is VND: 50000.5 -> 50001
  // If base is USD: 10.50 -> 1050
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
      amount: dbAmount, // The normalized amount used for calculation
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
        JSON.stringify(expense.sharedBy), // Arrays must be stringified for SQLite
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
        // Parse JSON string back to Array
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

// Delete Group
export const deleteGroup = async (groupId: string): Promise<void> => {
  // 1. Close connection to release file lock
  await closeGroupDB(groupId);

  // 2. Delete from Master DB
  const master = getMasterDB();
  await new Promise<void>((resolve, reject) => {
    master.run(`DELETE FROM groups WHERE id = ?`, [groupId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // 3. Delete the file
  const safeId = path.basename(groupId);
  const dbPath = path.join(__dirname, "../data", `${safeId}.db`);

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
};

// Delete Expense (For "Undo Payment" or fixing mistakes)
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
