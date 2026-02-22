import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const masterDBPath = path.join(DATA_DIR, "master.db");
const masterDB = new sqlite3.Database(masterDBPath);

// Cache for active group database connections
const dbCache: { [key: string]: sqlite3.Database } = {};

export const initMasterDB = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        masterDB.serialize(() => {
            masterDB.run(
                `CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          passcode TEXT NOT NULL,
          currency TEXT DEFAULT 'VND',
          exchangeFee REAL DEFAULT 0,
          createdAt INTEGER NOT NULL
        )`,
                (err) => (err ? reject(err) : resolve())
            );
        });
    });
};

export const getMasterDB = () => masterDB;

export const getGroupDB = (groupId: string): Promise<sqlite3.Database> => {
    if (dbCache[groupId]) return Promise.resolve(dbCache[groupId]);

    return new Promise((resolve, reject) => {
        // Basic security to ensure groupId is a valid filename
        const safeId = path.basename(groupId);
        const dbPath = path.join(DATA_DIR, `${safeId}.db`);

        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) return reject(err);
        });

        db.serialize(() => {
            // 1. Members Table
            db.run(
                `CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY, 
          name TEXT NOT NULL, 
          paymentInfo TEXT
        )`
            );

            // 2. Expenses Table
            db.run(
                `CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY, 
          description TEXT NOT NULL, 
          amount INTEGER NOT NULL, 
          originalCurrency TEXT NOT NULL, 
          originalAmount REAL NOT NULL, 
          exchangeRate REAL NOT NULL, 
          paidBy TEXT NOT NULL, 
          sharedBy TEXT NOT NULL, 
          createdAt INTEGER NOT NULL
        )`
            );

            // 3. Settlements Table
            db.run(
                `CREATE TABLE IF NOT EXISTS settlements (
          id TEXT PRIMARY KEY,
          fromId TEXT NOT NULL,
          toId TEXT NOT NULL,
          amount INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          paidAt INTEGER
        )`,
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        dbCache[groupId] = db;
                        resolve(db);
                    }
                }
            );
        });
    });
};

export const closeGroupDB = (groupId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!dbCache[groupId]) return resolve();

        dbCache[groupId].close((err) => {
            if (err) return reject(err);
            delete dbCache[groupId];
            resolve();
        });
    });
};

// Graceful shutdown
process.on("SIGTERM", () => {
    masterDB.close();
    Object.values(dbCache).forEach((db) => db.close());
});
