# 🚕 Destow API

[![Node.js](https://img.shields.io/badge/Node.js-v22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Hono](https://img.shields.io/badge/Hono-Ultra--Fast-FF5722?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Managed-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

The high-performance backend infrastructure for **Destow** — the premium intercity cab booking platform. Built with a focus on speed, reliability, and security using modern TypeScript tooling.

---

## 🏗️ Technical Architecture

Destow Backend follows a modular architecture designed for scalability and maintainability.

- **Fastest in Class**: Powered by **Hono**, delivering lightning-fast response times.
- **Type-Safe ORM**: Utilizing **Drizzle ORM** for predictable and efficient database operations.
- **Robust Auth**: Hybrid authentication using **Firebase Admin SDK** for verification and custom **JWT** for application state.
- **Data Integrity**: strict validation across all layers using **Zod**.

---

## 🔥 Key Features

- ✅ **Authentication**: Phone OTP and Google SSO via Firebase integration.
- 👤 **Profile Management**: Secure user identity and profile synchronization.
- 🏠 **Smart Dashboard**: Context-aware user information and cab search analytics.
- 🚗 **Cab Inventory**: Dynamic availability checking and pricing for multiple tiers (Sedan, SUV, Mini).
- 📅 **Intercity Bookings**: End-to-end booking workflow with automated fare calculation.
- 💳 **Payment Orchestration**: Comprehensive tracking of transactions and payment statuses.
- 📜 **Trip History**: Infinite-scroll ready paginated history with status filtering.

---

## 🛠️ Tech Stack & Dependencies

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js v22 (LTS) |
| **Framework** | Hono Framework |
| **Language** | TypeScript |
| **ORM** | Drizzle ORM |
| **Database** | PostgreSQL |
| **Security** | Firebase Admin + JWT + Zod |
| **Tooling** | tsx, drizzle-kit |

---

## 🚦 Getting Started

### 1️⃣ Prerequisites
- **Node.js** v22 or higher
- **PostgreSQL** instance
- **Firebase Project** with Phone & Google Auth enabled

### 2️⃣ Environment Setup
Clone and configure your environment:
```bash
cp .env.example .env
```
Ensure the following variables are defined:
```env
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/destow_db
JWT_SECRET=your_super_secret_key
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### 3️⃣ Installation & DB Initialization
```bash
# Install dependencies
npm install

# Generate and apply migrations
npm run db:generate
npm run db:migrate

# Seed initial data (Cab Types)
npx tsx src/db/seed.ts
```

### 4️⃣ Development
```bash
npm run dev
```
Server will be live at `http://localhost:3000`

---

## 📂 Project Structure

```text
src/
├── config/           # Validated environment & service configurations
├── db/               # Schema definitions, migrations, and seeders
├── middleware/       # Auth guard and request interceptors
├── modules/          # Domain-driven features (Auth, Cabs, Users, etc.)
├── utils/            # Shared helpers and response formatters
└── index.ts          # Application entry point & route registration
```

---

## 📡 API Endpoints (v1)

### Authentication
- `POST /api/v1/auth/verify-otp` - Verify Firebase Phone OTP
- `POST /api/v1/auth/google-sso` - Authenticate via Google

### Users & Home
- `GET  /api/v1/users/me` - Retrieve current profile
- `PUT  /api/v1/users/me` - Update profile details
- `GET  /api/v1/home/user-info` - Dashboard-related data
- `POST /api/v1/home/search` - Regional availability search

### Cabs & Bookings
- `POST /api/v1/cabs/available` - List cabs for a route
- `POST /api/v1/cabs/book` - Initialize a new booking
- `POST /api/v1/cabs/payment` - Update payment status

### History
- `GET  /api/v1/history` - Retrieve trip history (Paginated)

---

## 🧪 Testing
The Postman collection for this API can be found in `/postman`. Import `Destow_API.postman_collection.json` to start testing the endpoints immediately.

---

<p align="center">
  Built with ❤️ for the Destow Ecosystem
</p>
