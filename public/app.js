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

  openImage: (src) => {
    const w = window.open("");
    w.document.write(`<img src="${src}" style="max-width:100%;">`);
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

      if (!res.ok) {
        throw new Error(data.error || "Failed to create group");
      }

      app.loadGroup(data.id, data.passcode);
    } catch (e) {
      alert("Error: " + e.message);
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
      app.refresh();
    } catch (e) {
      // FIX: Unmask real backend error
      const msg = e.message;
      if (msg === "Invalid Passcode") alert("❌ Wrong Passcode");
      else if (msg === "Group not found") alert("❌ Group Not Found");
      else alert("❌ Error: " + msg);
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
    if (!confirm("Are you sure you want to delete this expense permanently?")) return;
    await fetch(`/api/expenses/${expenseId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: app.state.GID }),
    });
    app.refresh();
  },

  doDeleteGroup: async () => {
    if (!confirm("Are you sure? This will delete all members, expenses, and payment info permanently.")) return;
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
      // Payer Option
      payerSel.innerHTML += `<option value="${m.id}">${m.name}</option>`;

      // Shared Grid Option
      const tag = document.createElement("div");
      tag.className = "user-tag selected";
      tag.dataset.id = m.id;
      tag.innerText = m.name;
      tag.onclick = () => tag.classList.toggle("selected");
      sharedGrid.appendChild(tag);

      // --- NEW MEMBER LIST ITEM ---
      const div = document.createElement("div");
      div.className = "member-item";

      const info = m.paymentInfo || {};
      let paymentHtml = ""; // Default empty

      if (info.qrCode) {
        paymentHtml = `
            <div class="payment-detail qr-mode">
                <img src="${info.qrCode}" class="qr-thumb" onclick="app.openImage('${info.qrCode}')" style="cursor:zoom-in;">
                ${info.note ? `<div style="margin-top:0.5rem; font-weight:500;">${info.note}</div>` : ''}
            </div>`;
      } else if (info.bankName || info.accountNumber) {
        paymentHtml = `
            <div class="payment-detail bank-mode">
                <div class="bank-row">
                    <span class="bank-label">BANK</span>
                    <span class="bank-val">${info.bankName || '-'}</span>
                </div>
                <div class="bank-row">
                    <span class="bank-label">ACCOUNT NO.</span>
                    <span class="bank-val" style="font-family:monospace; font-size:1.1em; letter-spacing:0.05em;">${info.accountNumber || '-'}</span>
                </div>
                <div class="bank-row">
                    <span class="bank-label">NAME</span>
                    <span class="bank-val">${info.accountName || '-'}</span>
                </div>
                ${info.note ? `<div style="margin-top:0.5rem; border-top:1px dashed var(--border); padding-top:0.5rem; font-size:0.85rem;">Note: ${info.note}</div>` : ''}
            </div>`;
      }

      div.innerHTML = `
        <div class="member-header">
            <span class="member-name">${m.name}</span>
            <div class="member-actions">
                <button class="sm secondary" onclick="app.openMemberInfo('${m.id}', 'edit')">💳 Update Info</button>
            </div>
        </div>
        ${paymentHtml}
      `;
      mList.appendChild(div);
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

    // Delete Button State (Legacy removal: Always enabled now)
    // const delBtn = document.getElementById("btnDelete"); 
    // delBtn.disabled = false;

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
        row.querySelector("button").onclick = (e) => {
          e.target.disabled = true;
          e.target.innerText = "Processing...";
          app.doSettle(t.from, t.to, t.amount, fromId, toId).catch(() => {
            e.target.disabled = false;
            e.target.innerText = "Mark Paid";
          });
        };
        planDiv.appendChild(row);
      });
    }

    // 5. Separate Expenses & History
    const expDiv = document.getElementById("repExpenses");
    const histDiv = document.getElementById("repHistory");
    expDiv.innerHTML = "";
    histDiv.innerHTML = "";

    const allItems = rep.expenses;
    const expenses = allItems.filter(e => !e.description.startsWith("SETTLEMENT:"));
    const settlements = allItems.filter(e => e.description.startsWith("SETTLEMENT:"));

    // A. Render Expenses
    if (expenses.length === 0) {
      expDiv.innerHTML = '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center;">No expenses yet.</div>';
    } else {
      expenses.forEach((e) => {
        const row = document.createElement("div");
        row.className = "settle-row";

        let amount = app.fmtMoney(e.amount, app.state.G_CURRENCY);
        // Show original currency
        if (e.originalCurrency && e.originalCurrency !== app.state.G_CURRENCY) {
          amount += ` <small style="color:var(--text-muted); font-weight:400;">(${e.originalAmount} ${e.originalCurrency})</small>`;
        }

        // Shared By logic
        const sharedNames = e.sharedBy.map(id => app.getMemberName(id)).join(", ");

        row.innerHTML = `
                <div style="font-size:0.9rem; flex:1; overflow:hidden;">
                    <span style="font-weight:500;">${e.description}</span>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                        ${new Date(e.createdAt).toLocaleDateString()} • Paid by <b>${app.getMemberName(e.paidBy)}</b>
                    </div>
                    <div style="font-size:0.75rem; color:var(--primary); margin-top:2px;">
                        ↳ Shared with: ${sharedNames}
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-weight:600; color:var(--text-main);">${amount}</span>
                    <button class="undo sm" title="Delete Expense" style="color:var(--text-muted); border-color:var(--border);">Remove</button>
                </div>`;

        row.querySelector("button").onclick = () => app.undoSettlement(e.id);
        expDiv.appendChild(row);
      });
    }

    // B. Render Settlements
    if (settlements.length === 0) {
      histDiv.innerHTML = '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center;">No payments yet.</div>';
    } else {
      settlements.forEach((s) => {
        const row = document.createElement("div");
        row.className = "settle-row paid";
        const desc = s.description.replace("SETTLEMENT:", "").trim();

        row.innerHTML = `
                <div style="font-size:0.9rem; flex:1;">
                    <span style="color:var(--success-text)">✔ Paid:</span> ${desc}
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                        ${new Date(s.createdAt).toLocaleDateString()}
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-weight:600; color:var(--success-text);">${app.fmtMoney(s.amount, app.state.G_CURRENCY)}</span>
                    <button class="undo sm danger" title="Undo Payment">Refute</button>
                </div>`;
        row.querySelector("button").onclick = () => {
          if (confirm("Undo this payment?")) app.undoSettlement(s.id);
        };
        histDiv.appendChild(row);
      });
    }
  },

  getMemberName: (id) => {
    const m = app.state.MEMBERS.find(x => x.id === id);
    return m ? m.name : 'Unknown';
  },

  // --- MODAL & PAYMENT INFO ---

  // --- MODAL & PAYMENT INFO ---

  closeModal: () => {
    document.getElementById("modal-payment").classList.add("hidden");
  },

  switchTab: (tab) => {
    app.state.ACTIVE_TAB = tab;

    // UI Update
    document.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    if (tab === 'qr') {
      document.getElementById('section-qr').classList.remove('hidden');
      document.getElementById('section-bank').classList.add('hidden');
    } else {
      document.getElementById('section-qr').classList.add('hidden');
      document.getElementById('section-bank').classList.remove('hidden');
    }
  },

  openMemberInfo: (memberId, mode = 'view') => {
    const m = app.state.MEMBERS.find(x => x.id === memberId);
    if (!m) return alert("Member not found");

    const modal = document.getElementById("modal-payment");
    modal.classList.remove("hidden");

    const info = m.paymentInfo || {};

    // For Edit Mode
    if (mode === 'edit') {
      document.getElementById("pmTitle").innerText = `Edit Info: ${m.name}`;
      document.getElementById("pmView").classList.add("hidden");
      document.getElementById("pmEdit").classList.remove("hidden");

      document.getElementById("pmBank").value = info.bankName || "";
      document.getElementById("pmAccNum").value = info.accountNumber || "";
      document.getElementById("pmAccName").value = info.accountName || "";
      document.getElementById("pmNote").value = info.note || "";
      document.getElementById("pmQr").value = ""; // Clear file input

      app.state.EDIT_MEMBER_ID = memberId;

      // Decide which tab to show
      if (info.qrCode) {
        app.switchTab('qr');
      } else if (info.bankName || info.accountNumber) {
        app.switchTab('bank');
      } else {
        app.switchTab('qr'); // Default
      }
    }
    // Fallback View Mode (Should rarely be used now as info is in list)
    else {
      // Just alerting for now or keeping legacy behavior if user clicks something I missed
      // But implementation plan says render directly in list.
    }
  },

  savePaymentInfo: async () => {
    const memberId = app.state.EDIT_MEMBER_ID;
    if (!memberId) return;

    // Get Common Fields
    const note = document.getElementById("pmNote").value;

    // Get Tab Specifics
    let bankName = "";
    let accountNumber = "";
    let accountName = "";
    let qrCode = "";

    const activeTab = app.state.ACTIVE_TAB || 'qr'; // Default if undefined

    if (activeTab === 'bank') {
      bankName = document.getElementById("pmBank").value;
      accountNumber = document.getElementById("pmAccNum").value;
      accountName = document.getElementById("pmAccName").value;
      // Should we keep existing QR if switching to bank? 
      // User request says "not necessarily input both". Implies exclusive or.
      // Let's clear QR if Bank is chosen to avoid confusion in display
      qrCode = "";
    } else {
      // QR Mode
      // Keep existing bank info? No, clear it to be clean.
      bankName = "";
      accountNumber = "";
      accountName = "";

      // Handle File
      const fileInput = document.getElementById("pmQr");
      const existingQr = app.state.MEMBERS.find(x => x.id === memberId).paymentInfo?.qrCode || "";
      qrCode = existingQr; // Default to old one

      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 500 * 1024) return alert("File too large (Max 500KB)");
        try {
          qrCode = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } catch (e) {
          return alert("Error reading file");
        }
      }
    }

    const btn = document.querySelector('#pmEdit button');
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
      await fetch(`/api/groups/${app.state.GID}/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentInfo: { bankName, accountNumber, accountName, qrCode, note }
        })
      });

      app.closeModal();
      app.refresh();
    } catch (e) {
      alert("Error saving: " + e.message);
    } finally {
      btn.innerText = "Save Info";
      btn.disabled = false;
    }
  },

  // --- SHARE ---
  doShare: (el) => {
    const url = `${window.location.origin}/?join=${app.state.GID}`;
    app.copyToClip(el, url);
  },

  // --- INIT ---
  init: () => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get("join");

    if (joinId) {
      document.getElementById("jId").value = joinId;
      document.getElementById("jId").disabled = true; // Lock it
      document.getElementById("jPass").focus();

      // Auto-scroll to join section if needed (though it's on top)
    }
  }
};

// Start
app.init();
