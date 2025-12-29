const app = {
  state: {
    GID: null,
    GPASS: null,
    G_CURRENCY: "VND",
    MEMBERS: [],
    IS_CLEAN: false,
  },

  // --- UTILS ---

  formatStrictMoney: (input) => {
    // 1. Get cursor position to handle editing in the middle
    let cursorPosition = input.selectionStart;
    const originalLength = input.value.length;

    // 2. Strip non-numeric chars except dot
    let val = input.value.replace(/[^0-9.]/g, "");

    // 3. Handle multiple dots
    const parts = val.split(".");
    if (parts.length > 2) {
      val = parts[0] + "." + parts.slice(1).join("");
    }

    // 4. Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
      val = parts.join(".");
    }

    // 5. Add Thousand Separators
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? "." + parts[1] : "";
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    const newVal = formattedInteger + decimalPart;
    input.value = newVal;

    // 6. Restore Cursor
    const newLength = newVal.length;
    cursorPosition = cursorPosition + (newLength - originalLength);
    input.setSelectionRange(cursorPosition, cursorPosition);
  },

  fmtMoney: (amt, curr) => {
    let val = amt;
    // Assume database stores integers (cents/units)
    if (!["VND", "JPY", "KRW"].includes(curr)) {
      val = amt / 100;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
    }).format(val);
  },

  copyToClip: (el, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);

    // Visual Feedback
    el.classList.add("copied");
    const labelSpan = el.querySelector(".label");
    const originalLabel = labelSpan.innerText;
    labelSpan.innerText = "COPIED! ✓";

    setTimeout(() => {
      el.classList.remove("copied");
      labelSpan.innerText = originalLabel;
    }, 1500);
  },

  // --- ACTIONS ---

  doCreate: async () => {
    const name = document.getElementById("cName").value;
    const curr = document.getElementById("cCurr").value;
    const fee = document.getElementById("cFee").value;

    if (!name) return alert("Name required");

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, currency: curr, exchangeFee: fee }),
      });
      const data = await res.json();
      app.loadGroup(data.id, data.passcode);
    } catch (e) {
      alert("Error creating group");
    }
  },

  doJoin: async () => {
    const id = document.getElementById("jId").value;
    const pass = document.getElementById("jPass").value.toUpperCase().trim();
    if (id && pass) app.loadGroup(id, pass);
    else alert("ID and Passcode required");
  },

  loadGroup: async (id, passcode) => {
    try {
      const res = await fetch(`/api/groups/${id}?passcode=${passcode}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed");

      // Update State
      app.state.GID = data.id;
      app.state.GPASS = data.passcode;
      app.state.G_CURRENCY = data.currency;

      // Update UI Headers
      document.getElementById("dTitle").innerText = data.name;
      document.getElementById("dId").innerText = data.id;
      document.getElementById("dPass").innerText = data.passcode;
      document.getElementById("dBase").innerText = data.currency;
      document.getElementById("dFee").innerText = data.exchangeFee;
      document.getElementById("eCurr").value = data.currency;

      // Switch View
      document.getElementById("view-auth").classList.add("hidden");
      document.getElementById("view-dash").classList.remove("hidden");

      app.refresh();
    } catch (e) {
      alert(
        e.message === "Invalid Passcode"
          ? "❌ Wrong Passcode"
          : "❌ Group Not Found"
      );
    }
  },

  doAddMember: async () => {
    const name = document.getElementById("mName").value;
    if (!name) return;
    await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: app.state.GID, name }),
    });
    document.getElementById("mName").value = "";
    app.refresh();
  },

  doAddExpense: async () => {
    const desc = document.getElementById("eDesc").value;
    let rawAmt = document.getElementById("eAmt").value;
    const currency = document.getElementById("eCurr").value;
    const paidBy = document.getElementById("ePayer").value;
    const sharedBy = [];
    document
      .querySelectorAll(".user-tag.selected")
      .forEach((tag) => sharedBy.push(tag.dataset.id));

    // FIX: Remove commas before parsing to number
    const cleanAmt = parseFloat(rawAmt.replace(/,/g, ""));

    if (!cleanAmt || !paidBy || sharedBy.length === 0)
      return alert("Fill all fields");

    const btn = document.querySelector('button[onclick="app.doAddExpense()"]');
    btn.innerText = "Processing...";
    btn.disabled = true;

    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: app.state.GID,
        description: desc,
        amount: cleanAmt,
        currency,
        paidBy,
        sharedBy,
      }),
    });

    document.getElementById("eDesc").value = "";
    document.getElementById("eAmt").value = "";
    btn.innerText = "Add Expense";
    btn.disabled = false;
    app.refresh();
  },

  doSettle: async (fromName, toName, amount, fromId, toId) => {
    const niceAmt = app.fmtMoney(amount, app.state.G_CURRENCY);
    if (!confirm(`Confirm ${fromName} paid ${niceAmt} to ${toName}?`)) return;

    const isZeroDecimal = ["VND", "JPY", "KRW"].includes(app.state.G_CURRENCY);
    const floatAmt = isZeroDecimal ? amount : amount / 100;

    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: app.state.GID,
        description: `SETTLEMENT: ${fromName} -> ${toName}`,
        amount: floatAmt,
        currency: app.state.G_CURRENCY,
        paidBy: fromId,
        sharedBy: [toId],
      }),
    });
    app.refresh();
  },

  undoSettlement: async (expenseId) => {
    if (!confirm("Undo payment?")) return;
    await fetch(`/api/expenses/${expenseId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: app.state.GID }),
    });
    app.refresh();
  },

  doDeleteGroup: async () => {
    if (!app.state.IS_CLEAN) return alert("Clear debts first!");
    if (!confirm("Are you sure? This is permanent.")) return;
    const res = await fetch(`/api/groups/${app.state.GID}`, {
      method: "DELETE",
    });
    if (res.ok) location.reload();
  },

  refresh: async () => {
    // 1. Members
    const mRes = await fetch(`/api/groups/${app.state.GID}/members`);
    app.state.MEMBERS = await mRes.json();

    const payerSel = document.getElementById("ePayer");
    const mList = document.getElementById("mList");
    const sharedGrid = document.getElementById("eShared");
    const curPayer = payerSel.value;

    payerSel.innerHTML = "";
    mList.innerHTML = "";
    sharedGrid.innerHTML = "";

    app.state.MEMBERS.forEach((m) => {
      mList.innerHTML += `<div class="user-tag" style="background:#f1f5f9; cursor:default;">${m.name}</div>`;
      payerSel.innerHTML += `<option value="${m.id}">${m.name}</option>`;

      // Shared Grid Items
      const tag = document.createElement("div");
      tag.className = "user-tag selected";
      tag.dataset.id = m.id;
      tag.innerText = m.name;
      tag.onclick = () => tag.classList.toggle("selected");
      sharedGrid.appendChild(tag);
    });
    if (curPayer) payerSel.value = curPayer;

    // 2. Report
    const rRes = await fetch(`/api/groups/${app.state.GID}/report`);
    const rep = await rRes.json();
    const sett = rep.settlement;

    document.getElementById("repTotal").innerText = app.fmtMoney(
      sett.totalGroupSpend,
      app.state.G_CURRENCY
    );

    // 3. Stats (Balances)
    const sBody = document.getElementById("repStats");
    sBody.innerHTML = "";
    app.state.IS_CLEAN = true;

    sett.stats.forEach((s) => {
      let pillClass = "neu";
      let sign = "";
      if (s.netBalance > 0.01) {
        pillClass = "pos";
        sign = "+";
      } else if (s.netBalance < -0.01) {
        pillClass = "neg";
      }

      if (Math.abs(s.netBalance) > 1) app.state.IS_CLEAN = false;

      sBody.innerHTML += `<tr>
                <td style="font-weight: 500;">${s.memberName}</td>
                <td style="text-align:right; color: var(--text-muted);">${app.fmtMoney(
                  s.totalPaid,
                  app.state.G_CURRENCY
                )}</td>
                <td style="text-align:right; color: var(--text-muted);">${app.fmtMoney(
                  s.totalShare,
                  app.state.G_CURRENCY
                )}</td>
                <td style="text-align:right">
                    <span class="pill ${pillClass}">
                        ${sign}${app.fmtMoney(
        s.netBalance,
        app.state.G_CURRENCY
      )}
                    </span>
                </td>
            </tr>`;
    });

    // Delete Button State
    const delBtn = document.getElementById("btnDelete");
    const delMsg = document.getElementById("deleteMsg");
    if (app.state.IS_CLEAN) {
      delBtn.disabled = false;
      delMsg.innerText = "Safe to delete.";
      delMsg.style.color = "#166534";
    } else {
      delBtn.disabled = true;
      delMsg.innerText = "Clear debts first.";
      delMsg.style.color = "#991b1b";
    }

    // 4. Plan
    const planDiv = document.getElementById("repPlan");
    planDiv.innerHTML = "";
    if (sett.plan.length === 0) {
      planDiv.innerHTML =
        '<div style="text-align:center; color:var(--text-muted); font-style:italic;">All settled! No debts pending.</div>';
    } else {
      sett.plan.forEach((t) => {
        const fromId = app.state.MEMBERS.find((m) => m.name === t.from)?.id;
        const toId = app.state.MEMBERS.find((m) => m.name === t.to)?.id;

        const row = document.createElement("div");
        row.className = "settle-row";
        row.innerHTML = `
                    <span><b>${t.from}</b> owes <b>${t.to}</b></span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:700; color:var(--primary);">${app.fmtMoney(
                          t.amount,
                          app.state.G_CURRENCY
                        )}</span>
                        <button class="sm" style="background:var(--success-bg); color:var(--success-text); border:1px solid var(--success-bg);">Mark Paid</button>
                    </div>`;
        row.querySelector("button").onclick = () =>
          app.doSettle(t.from, t.to, t.amount, fromId, toId);
        planDiv.appendChild(row);
      });
    }

    // 5. History
    const histDiv = document.getElementById("repHistory");
    histDiv.innerHTML = "";
    const settlements = rep.expenses.filter((e) =>
      e.description.startsWith("SETTLEMENT:")
    );

    if (settlements.length === 0) {
      histDiv.innerHTML =
        '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center;">No payment history yet.</div>';
    } else {
      settlements.forEach((s) => {
        const row = document.createElement("div");
        row.className = "settle-row paid";
        row.innerHTML = `
                    <div style="font-size:0.9rem;">
                        <span style="color:var(--success-text)">✔ Paid:</span> ${s.description.replace(
                          "SETTLEMENT:",
                          ""
                        )}
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:600; color:var(--success-text);">${app.fmtMoney(
                          s.amount,
                          app.state.G_CURRENCY
                        )}</span>
                        <button class="undo sm">Undo</button>
                    </div>`;
        row.querySelector("button").onclick = () => app.undoSettlement(s.id);
        histDiv.appendChild(row);
      });
    }
  },
};
