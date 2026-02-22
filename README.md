# Ting - Minimalist Group Expense Manager

Ting is a modern, privacy-focused group expense management application designed for simplicity and speed. Built with Next.js 15, SQLite, and PWA support.

## 🚀 Quick Start

Ensure you have **Node.js 20+** installed.

```bash
# Setup dependencies and environment
make setup

# Run development server
make dev
```

Visit [http://localhost:3000](http://localhost:3000) to start managing your groups.

## 📱 Features

- **PWA Support**: Install Ting on your phone for an app-like experience.
- **Master-Detail Splitting**: Advanced algorithm to simplify debts.
- **Privacy First**: Each group has its own isolated SQLite database.
- **Deep Linking**: Share group links that automatically prompt for entry.
- **Multi-language**: Seamlessly switch between Vietnamese and English.

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Shadcn UI.
- **State Management**: Zustand (UI) & TanStack Query (Server).
- **Persistence**: SQLite (Local file-based storage).
- **Deployment**: Docker and Docker Compose support included.

## 📚 Documentation

Detailed technical documentation is available in the `/docs` directory:

- [**Architecture**](./docs/ARCHITECTURE.md): System design and layers.
- [**Tech Stack**](./docs/TECH_STACK.md): Detailed toolset and versions.
- [**Database Schema**](./docs/DATABASE.md): SQLite tables and ERD.
- [**System Flows**](./docs/FLOWS.md): Mermaid diagrams of core logic.
- [**Feature Specs**](./docs/FEATURES.md): API contracts and feature details.

## 🏗️ Development & Deployment

Use the `Makefile` for common tasks:

| Command | Description |
|---|---|
| `make setup` | Install dependencies and create data folders. |
| `make dev` | Start the development server. |
| `make build` | Build the production package. |
| `make start` | Run the production build locally. |
| `make clean` | Remove build artifacts and local databases. |

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
