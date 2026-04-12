# Destow Backend API

Node.js + TypeScript + Hono backend for the Destow intercity cab booking app.

## Tech Stack
- **Runtime**: Node.js v22
- **Framework**: [Hono](https://hono.dev/) — ultra-fast TypeScript web framework
- **ORM**: Drizzle ORM + `pg` driver
- **Database**: PostgreSQL (local dev)
- **Auth**: Firebase Admin SDK (Phone OTP + Google SSO) → our own JWT
- **Validation**: Zod

---

## 🔥 Firebase Setup (First-Time)

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add project** → name it `destow`
2. In your project: **Authentication** → **Sign-in method** → Enable **Phone** and **Google**
3. Go to **Project Settings** → **Service Accounts** tab
4. Click **Generate New Private Key** → download the JSON file
5. From the JSON file, copy these values into your `.env`:
   - `FIREBASE_PROJECT_ID` → `project_id`
   - `FIREBASE_CLIENT_EMAIL` → `client_email`
   - `FIREBASE_PRIVATE_KEY` → `private_key` (copy the whole string including `-----BEGIN PRIVATE KEY-----`)
6. In your React Native mobile app: add **Firebase SDK** and use `firebase/auth` for `signInWithPhoneNumber` and `GoogleAuthProvider` — after the user authenticates, send the `idToken` to our backend.

---

## 🗄️ Local PostgreSQL Setup

1. Install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)
2. Create the database:
   ```sql
   CREATE DATABASE destow_db;
   ```
3. Copy `.env.example` to `.env` and update `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/destow_db
   ```

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Copy env template
cp .env.example .env
# → Fill in your PostgreSQL URL, Firebase credentials, JWT secret

# Generate DB migrations (run after any schema changes)
npm run db:generate

# Run migrations to create tables
npm run db:migrate

# Seed default cab types (Sedan, SUV, Mini)
npx tsx src/db/seed.ts

# Start development server with hot reload
npm run dev
```

Server starts at **http://localhost:3000**

---

## 📌 API Reference

Base URL: `http://localhost:3000/api/v1`

All protected routes (🔒) require: `Authorization: Bearer <token>`

### Auth
| Method | Path | Body | Auth |
|--------|------|------|------|
| `POST` | `/auth/verify-otp` | `{ firebaseIdToken }` | ❌ |
| `POST` | `/auth/google-sso` | `{ firebaseIdToken }` | ❌ |

### Users
| Method | Path | Body | Auth |
|--------|------|------|------|
| `GET` | `/users/me` | — | 🔒 |
| `PUT` | `/users/me` | `{ name?, avatarUrl? }` | 🔒 |

### Home
| Method | Path | Body | Auth |
|--------|------|------|------|
| `GET` | `/home/user-info` | — | 🔒 |
| `POST` | `/home/search` | `{ from, to, date, time }` | 🔒 |

### Cabs
| Method | Path | Body | Auth |
|--------|------|------|------|
| `POST` | `/cabs/available` | `{ from, to, date, time, distanceKm? }` | 🔒 |
| `POST` | `/cabs/book` | `{ cabId, from, to, pickupDatetime, distanceKm, totalFare, paymentMethod }` | 🔒 |
| `POST` | `/cabs/payment` | `{ bookingId, method, transactionRef? }` | 🔒 |

### History
| Method | Path | Query | Auth |
|--------|------|-------|------|
| `GET` | `/history` | `?page=1&limit=10&status=completed` | 🔒 |

---

## 📁 Project Structure

```
src/
├── index.ts              # Server entry point
├── config/
│   ├── env.ts            # Zod-validated env vars
│   └── firebase.ts       # Firebase Admin init
├── db/
│   ├── schema.ts         # Drizzle ORM schema
│   ├── connection.ts     # DB pool
│   ├── seed.ts           # Seed cab types
│   └── migrations/       # Auto-generated SQL migrations
├── middleware/
│   └── auth.middleware.ts
├── modules/
│   ├── auth/             # verify-otp, google-sso
│   ├── users/            # GET/PUT /me
│   ├── home/             # user-info, search
│   ├── cabs/             # available, book, payment
│   └── history/          # paginated trip history
└── utils/
    └── response.ts       # JSON response helpers
```

---

## 🧪 Testing with Postman

Import the collection from `postman/Destow_API.postman_collection.json`.

Set the `baseUrl` collection variable to `http://localhost:3000/api/v1` and `token` after authenticating.
