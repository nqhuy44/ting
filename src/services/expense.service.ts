import { v4 as uuidv4 } from "uuid";
import { getGroupDB } from "./db.service";
import { getGroupDetails } from "./group.service";
import { Expense } from "../types";
import axios from "axios";

// Helper for exchange rates (can be moved to a separate service if complex)
const getExchangeRate = async (from: string, to: string): Promise<number> => {
    if (from === to) return 1;
    try {
        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
        return response.data.rates[to] || 1;
    } catch (e) {
        console.error("Exchange rate fetch failed", e);
        return 1;
    }
};

export const addExpense = async (
    groupId: string,
    description: string,
    originalAmount: number,
    originalCurrency: string,
    paidBy: string,
    sharedBy: string[]
): Promise<Expense> => {
    const group = await getGroupDetails(groupId);
    const baseCurrency = group.currency;

    let exchangeRate = 1;
    let finalAmount = originalAmount;

    if (originalCurrency !== baseCurrency) {
        exchangeRate = await getExchangeRate(originalCurrency, baseCurrency);
        finalAmount = originalAmount * exchangeRate * (1 + group.exchangeFee / 100);
    }

    // Integer math for amounts
    const zeroDecimalCurrencies = ["VND", "JPY", "KRW"];
    const amount = zeroDecimalCurrencies.includes(baseCurrency)
        ? Math.round(finalAmount)
        : Math.round(finalAmount * 100);

    const expense: Expense = {
        id: uuidv4(),
        groupId,
        description,
        amount,
        originalCurrency,
        originalAmount,
        exchangeRate,
        paidBy,
        sharedBy,
        createdAt: Date.now(),
    };

    const db = await getGroupDB(groupId);
    return new Promise((resolve, reject) => {
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
        db.all(`SELECT * FROM expenses ORDER BY createdAt DESC`, (err, rows: any[]) => {
            if (err) return reject(err);
            resolve(
                rows.map((r) => ({
                    ...r,
                    groupId,
                    sharedBy: JSON.parse(r.sharedBy),
                }))
            );
        });
    });
};

export const deleteExpense = async (groupId: string, expenseId: string): Promise<void> => {
    const db = await getGroupDB(groupId);
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM expenses WHERE id = ?`, [expenseId], (err) => (err ? reject(err) : resolve()));
    });
};

export const updateExpense = async (
    groupId: string,
    expenseId: string,
    description: string,
    originalAmount: number,
    originalCurrency: string,
    paidBy: string,
    sharedBy: string[]
): Promise<Expense> => {
    const group = await getGroupDetails(groupId);
    const baseCurrency = group.currency;

    let exchangeRate = 1;
    let finalAmount = originalAmount;

    if (originalCurrency !== baseCurrency) {
        exchangeRate = await getExchangeRate(originalCurrency, baseCurrency);
        finalAmount = originalAmount * exchangeRate * (1 + group.exchangeFee / 100);
    }

    const zeroDecimalCurrencies = ["VND", "JPY", "KRW"];
    const amount = zeroDecimalCurrencies.includes(baseCurrency)
        ? Math.round(finalAmount)
        : Math.round(finalAmount * 100);

    const db = await getGroupDB(groupId);
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE expenses SET description = ?, amount = ?, originalCurrency = ?, originalAmount = ?, exchangeRate = ?, paidBy = ?, sharedBy = ? WHERE id = ?`,
            [
                description,
                amount,
                originalCurrency,
                originalAmount,
                exchangeRate,
                paidBy,
                JSON.stringify(sharedBy),
                expenseId,
            ],
            (err) => {
                if (err) return reject(err);
                resolve({
                    id: expenseId,
                    groupId,
                    description,
                    amount,
                    originalCurrency,
                    originalAmount,
                    exchangeRate,
                    paidBy,
                    sharedBy,
                    createdAt: Date.now(), // This value won't be used for updates usually but needs to conform to type
                });
            }
        );
    });
};
