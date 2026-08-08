# Kriti Marketplace - Monorepo Workspace

This workspace is organized as a professional Node.js / React e-commerce monorepo.

## 📂 Workspace Structure

```
DropByRikkas-Ecommerce/ (Workspace Root)
├── customer-app/            # Premium physical e-commerce store (React + Vite + Tailwind v4)
├── admin-dashboard/         # Live metrics and configuration panel (React + Vite + Tailwind v4)
├── backend/                 # Database REST server (Node.js + Express + Prisma + PostgreSQL)
├── README.md                # Workspace setup and run documentation
└── .gitignore               # Unified git ignore config
```

---

## ⚡ Subsystems & Ports Mapping

To prevent local conflicts, the applications are configured on dedicated ports:

| Service | Technology | Local Port | Run Command |
| :--- | :--- | :--- | :--- |
| **Customer App** | React SPA, Tailwind v4, Framer Motion | `5173` | `npm run dev` (inside `customer-app/`) |
| **Admin Dashboard** | React SPA, Tailwind v4 | `5174` | `npm run dev` (inside `admin-dashboard/`) |
| **REST Backend** | Express, Prisma, Bcrypt, JWT | `5000` | `npm run dev` (inside `backend/`) |

---

## 🚀 Getting Started

### 1. Customer Application
Our customer shopping experience:
```bash
cd customer-app
npm run dev
# App will open at http://localhost:5173/
```

### 2. Admin Dashboard
A brand new standalone administration panel:
```bash
cd admin-dashboard
npm run dev
# Dashboard will open at http://localhost:5174/
```

### 3. Node.js Backend Server
The server handles authentication and product management:
```bash
cd backend
npm run dev
# Server will listen at http://localhost:5000/
```

*Note: Database configuration is modeled in `backend/prisma/schema.prisma` mapping to PostgreSQL. Run `npx prisma migrate dev` inside `backend/` to sync models once a live PostgreSQL server is active.*
