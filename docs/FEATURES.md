# Features & API - Ting

## Core Features

### 1. Group Management
- **Persistence**: Groups are identified via a UUID and protected by a 4-digit numeric passcode.
- **Deep Linking**: Direct links (e.g., `/group/[id]?join=true`) automatically prompt password entry.
- **Member Management**: Add and customize members with payment details.

### 2. Expense Management
- **Smart Splitting**: Intelligent algorithm that simplifies debts into the minimum number of transactions.
- **Edit/Delete**: Full CRUD for expenses with automatic settlement recalculation.
- **Multi-currency**: Set a base currency for the group (VND, USD, etc.).

### 3. Progressive Web App (PWA)
- **Installable**: Can be "Added to Home Screen" on iOS and Android.
- **Offline Aware**: Read-only access to cached data when disconnected.
- **Performance**: High Lighthouse scores for speed and accessibility.

## API Contracts

### Groups
- `POST /api/groups`: Create a new group.
- `GET /api/groups/[id]`: Retrieve group metadata.

### Members
- `GET /api/groups/[id]/members`: List all members.
- `POST /api/groups/[id]/members`: Add a member.
- `PUT /api/groups/[id]/members/[memberId]`: Update member info.

### Expenses
- `GET /api/groups/[id]/report`: Get debt report and activities.
- `POST /api/groups/[id]/expenses`: Add an expense.
- `PUT /api/groups/[id]/expenses/[expenseId]`: Update an expense.
- `DELETE /api/groups/[id]/expenses/[expenseId]`: Remove an expense.

### Settlements
- `POST /api/groups/[id]/settlements/[settlementId]/complete`: Mark debt as paid.
