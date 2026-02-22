# Security Model - Ting Application

## Overview
Ting is designed as a multi-tenant application where data is isolated at the database level. Each group has its own SQLite database file, and access is protected by a 4-digit numeric passcode.

## 1. Data Isolation
- **Master Database**: Stores group metadata (IDs, names, passcodes).
- **Group Databases**: Each group has a unique database file located in the `/data` directory (e.g., `/data/<group-id>.db`).
- **Database Access**: The application uses a dynamic database service that loads the correct group database based on the `groupId` provided in the request.

## 2. API Authorization
All group-specific API routes are secured using a mandatory passcode verification mechanism.

### Authorization Header
Clients must provide the group's passcode in the `x-passcode` HTTP header for all requests to `/api/groups/[groupId]/*`.

```http
x-passcode: 1234
```

### Server-side Verification
The server verifies the passcode against the master database for every request. If the passcode is missing or incorrect, the server returns:
- `401 Unauthorized`: If the `x-passcode` header is missing.
- `403 Forbidden`: If the passcode is invalid for the requested group.

## 3. Deployment Security
- **Non-Root User**: The application runs as a dedicated `nextjs` user inside the Docker container to minimize the impact of any potential security breach.
- **Minimal Image**: The Docker image uses Next.js `standalone` mode, including only the bare minimum files required for production, reducing the attack surface.
- **Data Persistence**: The `/data` directory should be mounted as a persistent volume. Ensure proper file-level permissions for the `nextjs` user.

## 4. Best Practices for Users
- **Passcode Privacy**: Group creators should share the group URL (which contains the ID) only with trusted participants. 
- **Ephemeral Access**: While passcodes provide a layer of security, Ting is intended for convenient shared expense tracking among friends and family, not for storing highly sensitive cryptographic secrets.
