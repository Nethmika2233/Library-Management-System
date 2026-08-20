# Bookshelf — Library Management System

A full-stack library management system. React frontend, Node/Express + Prisma API, MySQL database. Two roles — **staff** (full catalogue/member/loan/reservation management, analytics, policy settings) and **students** (self-registration, browse the catalogue, reserve books, track their own loans and fines).

## Features

- **Auth**: JWT sessions, bcrypt-hashed passwords, role-based access enforced server-side
- **Book catalogue**: full CRUD, ISBN lookup (auto-fills title/author/cover from Open Library), cover images
- **Members & borrowings**: issue/return flow with atomic stock checks (no double-issuing the last copy), searchable borrow/return history with status filters
- **Loans**: standard loan period + automatic overdue fines, both editable by staff from a Settings page (not hardcoded)
- **Reservations**: reserve a book that's checked out, automatically flagged "ready" the moment it's returned, staff can fulfill it into a loan. Email notification hook included (no-ops until a `RESEND_API_KEY` is set)
- **Analytics**: borrow trends, top categories, most-borrowed books, overdue/fine totals
- **UI**: light/dark mode, responsive (mobile/tablet/desktop), Framer Motion throughout

## Tech stack

**Frontend** — React, Tailwind CSS, Framer Motion, Axios
**Backend** — Node.js, Express, Prisma ORM, MySQL, JWT, bcryptjs
**External** — Open Library API (ISBN lookup, free/keyless), Resend (optional, for email)

## Getting started

### 1. Database

Start MySQL (e.g. via XAMPP), then create the database/user:

```sql
CREATE DATABASE IF NOT EXISTS librarydb;
CREATE USER IF NOT EXISTS 'libraryuser'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON librarydb.* TO 'libraryuser'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in your DB password and a JWT secret
npx prisma db push     # creates all tables from prisma/schema.prisma
node server.js
```

Server runs at `http://localhost:5000`.

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Opens `http://localhost:3000` automatically.

### 4. First login

Register a student account from the landing page, or seed a staff account directly:

```sql
INSERT INTO users (username, password, role) VALUES ('admin', '$2a$10$...bcrypt-hash...', 'staff');
```

(Passwords are bcrypt-hashed — easiest is to register via `/api/register` with `role` patched to `staff` afterward, or hash a password with `bcryptjs` and insert it directly.)

## Project structure

```
backend/
  server.js              REST API — auth, books, members, borrowings, reservations, analytics, settings
  prisma/schema.prisma   Database schema (Prisma models)
  scripts/                One-off migration scripts

frontend/
  src/
    App.js                Main app shell — staff/student dashboard, all tabs
    Login.js               Sign in / student self-registration
    GetStarted.js           Landing page
    components/ui/          Shared UI primitives (Button, etc.)
    components/ThemeToggle.js
    lib/api.js               Axios instance with JWT auth interceptor
```

## Known limitations

- No automated test suite — verified manually through the UI during development
- Email notifications require a Resend API key (or swap `sendEmail` in `server.js` for another provider)
- No pagination on catalogue/members/borrowings tables — fine at current scale, would need it for a large dataset
