# System Flows - Ting

Visualizing the core business logic flows using Mermaid.js.

## 1. Group Creation & Access
```mermaid
sequenceDiagram
    participant User
    participant App
    participant API
    participant DB

    User->>App: Enter Group Name & Currency
    App->>API: POST /api/groups
    API->>DB: Initialize group.db & Generate Passcode
    DB-->>API: Success
    API-->>App: {id, passcode}
    App->>App: Store {id, passcode} in Zustand
    App-->>User: Redirect to Group Page
```

## 2. Expense Lifecycle
```mermaid
flowchart TD
    Start([User Adds Expense]) --> Input[Input Amount, Description, Payer]
    Input --> API[POST /api/groups/groupId/expenses]
    API --> Save[(Save to SQLite)]
    Save --> Recalc[Recalculate Settlement Report]
    Recalc --> Notification[Toast: Expense Added!]
    Notification --> Finish([End])
```

## 3. Debt Settlement Algorithm
```mermaid
graph TD
    A[Collect all members balances] --> B[Calculate total paid vs total spent per person]
    B --> C{Balance == 0?}
    C -->|Yes| D[Done]
    C -->|No| E[Identify Debtors & Creditors]
    E --> F[Max Creditor matches Max Debtor]
    F --> G[Record Transaction]
    G --> H[Update Balances]
    H --> B
```

## 4. Payment Confirmation
```mermaid
sequenceDiagram
    participant Debtor
    participant Modal
    participant API
    participant DB

    Debtor->>Modal: Click Mark as Paid
    Modal->>API: POST /api/groups/groupId/settlements/id/complete
    API->>DB: Update status = 'completed'
    DB-->>API: Updated
    API-->>Modal: Success
    Modal-->>Debtor: UI Updates (Line-through)
```
