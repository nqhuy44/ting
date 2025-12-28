import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "../data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const masterDBPath = path.join(DATA_DIR, "master.db");
const masterDB = new sqlite3.Database(masterDBPath);

// Cache for active connections
const dbCache: { [key: string]: sqlite3.Database } = {};

export const initMasterDB = () => {
  return new Promise<void>((resolve, reject) => {
    masterDB.serialize(() => {
      masterDB.run(
        `CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY,
                name TEXT,
                passcode TEXT,
                currency TEXT DEFAULT 'VND',
                exchangeFee REAL DEFAULT 0,
                createdAt INTEGER
            )`,
        (err) => (err ? reject(err) : resolve())
      );
    });
  });
};

export const getMasterDB = () => masterDB;

export const getGroupDB = (groupId: string): Promise<sqlite3.Database> => {
  // Return cached connection if exists
  if (dbCache[groupId]) return Promise.resolve(dbCache[groupId]);

  return new Promise((resolve, reject) => {
    const safeId = path.basename(groupId); // Security
    const dbPath = path.join(DATA_DIR, `${safeId}.db`);

    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) return reject(err);
    });

    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, name TEXT)`
      );
      db.run(
        `CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY, description TEXT, amount INTEGER, 
                originalCurrency TEXT, originalAmount REAL, exchangeRate REAL, 
                paidBy TEXT, sharedBy TEXT, createdAt INTEGER
            )`,
        (err) => {
          if (err) reject(err);
          else {
            dbCache[groupId] = db; // Cache it
            resolve(db);
          }
        }
      );
    });
  });
};

// NEW: Close and remove connection from cache
export const closeGroupDB = (groupId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!dbCache[groupId]) return resolve(); // Already closed

    dbCache[groupId].close((err) => {
      if (err) return reject(err);
      delete dbCache[groupId];
      resolve();
    });
  });
};
