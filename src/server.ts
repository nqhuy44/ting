import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { initMasterDB } from "./db";
import * as core from "./core";
import { calculateSettlements } from "./algorithm";

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

// --- API ROUTES ---

// 1. Create Group (FIXED: Removed passcode argument)
app.post("/api/groups", async (req, res) => {
  try {
    const { name, currency, exchangeFee } = req.body;
    if (!name) throw new Error("Group name is required");

    // Core now auto-generates passcode, so we only pass 3 args
    const group = await core.createGroup(
      name,
      currency || "VND",
      Number(exchangeFee) || 0
    );
    res.json(group);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Get Group Details (Requires Passcode Query Param)
app.get("/api/groups/:groupId", async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const passcode = req.query.passcode as string;

    if (!passcode) throw new Error("Passcode required");

    const group = await core.getGroupDetails(groupId, passcode);
    res.json(group);
  } catch (e: any) {
    const status = e.message === "Invalid Passcode" ? 403 : 404;
    res.status(status).json({ error: e.message });
  }
});

// 3. Delete Group
app.delete("/api/groups/:groupId", async (req, res) => {
  try {
    const groupId = req.params.groupId;
    await core.deleteGroup(groupId);
    res.json({ success: true, message: "Group deleted" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Add Member
app.post("/api/members", async (req, res) => {
  try {
    const { groupId, name } = req.body;
    if (!groupId || !name) throw new Error("Group ID and Name are required");

    const member = await core.addMember(groupId, name);
    res.json(member);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Get Members
app.get("/api/groups/:groupId/members", async (req, res) => {
  try {
    const members = await core.getMembers(req.params.groupId);
    res.json(members);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 6. Add Expense
app.post("/api/expenses", async (req, res) => {
  try {
    const { groupId, description, amount, currency, paidBy, sharedBy } =
      req.body;

    if (!groupId || !amount || !paidBy || !sharedBy) {
      throw new Error("Missing required fields");
    }

    const expense = await core.addExpense(
      groupId,
      description,
      Number(amount),
      currency,
      paidBy,
      sharedBy
    );
    res.json(expense);
  } catch (e: any) {
    console.error("Add Expense Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// 7. Delete Expense
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const { groupId } = req.body;
    const expenseId = req.params.id;

    if (!groupId) throw new Error("Group ID required for deletion context");

    await core.deleteExpense(groupId, expenseId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 8. Get Report
app.get("/api/groups/:groupId/report", async (req, res) => {
  try {
    const groupId = req.params.groupId;

    const [members, expenses] = await Promise.all([
      core.getMembers(groupId),
      core.getExpenses(groupId),
    ]);

    const settlement = calculateSettlements(members, expenses);

    res.json({ expenses, settlement });
  } catch (e: any) {
    console.error("Report Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- SERVER STARTUP ---

const startServer = async () => {
  try {
    await initMasterDB();
    console.log("✅ Master Database Initialized");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
