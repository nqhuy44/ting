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

// --- API Routes ---

// 1. Create Group (with Currency & Fee settings)
app.post("/api/groups", async (req, res) => {
  try {
    const { name, passcode, currency, exchangeFee } = req.body;

    if (!name) throw new Error("Group name is required");

    const group = await core.createGroup(
      name,
      passcode,
      currency || "VND",
      Number(exchangeFee) || 0
    );
    res.json(group);
  } catch (e: any) {
    console.error("Create Group Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// 2. Get Group Details (Currency, Fee, Name)
app.get("/api/groups/:groupId", async (req, res) => {
  try {
    const group = await core.getGroupDetails(req.params.groupId);
    if (!group) throw new Error("Group not found");
    res.json(group);
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});

// 3. Add Member
app.post("/api/members", async (req, res) => {
  try {
    const { groupId, name } = req.body;
    if (!groupId || !name) throw new Error("Group ID and Name are required");

    const member = await core.addMember(groupId, name);
    res.json(member);
  } catch (e: any) {
    console.error("Add Member Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// 4. Get Members List
app.get("/api/groups/:groupId/members", async (req, res) => {
  try {
    const members = await core.getMembers(req.params.groupId);
    res.json(members);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Add Expense (Handles Currency Conversion inputs)
app.post("/api/expenses", async (req, res) => {
  try {
    const { groupId, description, amount, currency, paidBy, sharedBy } =
      req.body;

    if (!groupId || !amount || !paidBy || !sharedBy) {
      throw new Error("Missing required expense fields");
    }

    // We pass the raw inputs to core.ts, which handles the API conversion logic
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

// 6. Get Report (Expenses + Spending Breakdown)
app.get("/api/groups/:groupId/report", async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Fetch all data
    const [members, expenses] = await Promise.all([
      core.getMembers(groupId),
      core.getExpenses(groupId),
    ]);

    // Calculate using new logic
    const report = calculateSettlements(members, expenses);

    // Return structured data
    res.json({
      expenses,
      settlement: report, // This now contains { totalGroupSpend, stats, plan }
    });
  } catch (e: any) {
    console.error("Report Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Delete Expense Route
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const { groupId } = req.body; // We need groupId to find the correct DB file
    const expenseId = req.params.id;

    if (!groupId) throw new Error("Group ID required");

    await core.deleteExpense(groupId, expenseId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Delete Group Route
app.delete("/api/groups/:groupId", async (req, res) => {
  try {
    const { passcode } = req.body; // Optional: Verify passcode before delete for security
    const groupId = req.params.groupId;

    // Simple verification: Check if group exists first
    const group = await core.getGroupDetails(groupId);
    if (!group) throw new Error("Group not found");

    // In a real app, check passcode here.
    // For now, we trust the UI warning.

    await core.deleteGroup(groupId);
    res.json({ success: true, message: "Group deleted" });
  } catch (e: any) {
    console.error("Delete Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- Server Startup Logic ---

const startServer = async () => {
  try {
    // Initialize Master DB (Registry) before accepting requests
    await initMasterDB();
    console.log("✅ Master Database Initialized");

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
