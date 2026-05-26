# 🚕 Destow API (Backend)

[![Node.js](https://img.shields.io/badge/Node.js-v20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![AWS Serverless](https://img.shields.io/badge/AWS-Serverless-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com/serverless/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Managed-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

The high-performance backend infrastructure for **Destow** — the premium intercity cab booking platform. Built with a focus on cost-effectiveness, zero-maintenance scaling, and seamless cloud integrations.

---

## 🏗️ Technical Architecture

Destow Backend has been migrated to a fully **AWS Serverless Architecture**.

- **Zero Server Management**: Powered by **AWS Lambda** via `serverless-http`.
- **Fast Web Framework**: Built on **Express.js** for easy routing and middleware support.
- **Relational Database**: Connected natively to **PostgreSQL** using the `pg` package.
- **Cloud-Native Deployments**: Managed via **AWS CloudFormation** (`cloudformation.yaml`).

*(Note: Firebase and Drizzle ORM have been entirely removed in favor of native PostgreSQL and planned AWS SNS integrations).*

---

## 🛠️ Tech Stack & Dependencies

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js v20.x |
| **Framework** | Express.js |
| **Serverless Adapter** | `serverless-http` |
| **Database Driver** | `pg` (PostgreSQL) |
| **Infrastructure** | AWS API Gateway + AWS Lambda |

---

## 🚦 Getting Started (Local Development)

We use Docker to instantly spin up a local PostgreSQL database for local testing.

### 1️⃣ Prerequisites
- **Node.js** v20 or higher
- **Docker** and **Docker Compose**

### 2️⃣ Start the Local Database
```bash
# Spins up PostgreSQL and automatically seeds it with initial tables and data via init-db.sql
docker-compose up -d
```

### 3️⃣ Environment & Dependencies
```bash
npm install
```

Ensure the following variables are defined in your `.env` file:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://postgres:password@localhost:5432/destow
JWT_SECRET=replace_with_a_very_long_local_secret
JWT_EXPIRES_IN=7d
```

### 4️⃣ Start the Server
```bash
npm start
```
Server will be live at `http://localhost:3000`

---

## 🚀 AWS Deployment Workflow

Deploying this backend to the live internet is fully automated.

1. Create an AWS S3 Bucket (e.g., `destow-my-bucket`).
2. Run the deployment script from the project root:

```bash
cd ..
./deploy.sh -b destow-my-bucket
```

The deployment creates a private PostgreSQL RDS database, connects Lambda to it, and prompts for the DB password and JWT secret.

This will output your live **ApiUrl** which you can plug directly into the React Native app.

---

## 📂 Project Structure

```text
destow-backend/
├── server.js             # Main Express app, Database connection, & AWS Lambda handler
├── docker-compose.yml    # Local Database configuration
├── init-db.sql           # Database schema and mock data
├── package.json          # Dependencies
└── .env                  # Local Environment Variables
```

---

## 📡 Core API Endpoints

### Authentication (Currently Mocked)
- `POST /auth/send-otp` - Simulates sending an OTP.
- `POST /auth/verify-otp` - Verifies code (accepts `123456`).

### Cabs & Agencies (Connected to DB)
- `GET /cabs` - Retrieves available cabs with agency details.
- `GET /agencies` - Retrieves registered travel agencies.
- `POST /booking` - Creates a mock ride booking.

---

<p align="center">
  Built with ❤️ for the Destow Ecosystem
</p>
