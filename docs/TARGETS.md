# Destow Project Targets & Roadmap

This document outlines everything that has been accomplished so far and provides a clear, step-by-step checklist of targets for you to complete next.

---

## ✅ What We Have Accomplished (Phase 1 Complete)

*   [x] **Removed Firebase:** Stripped all Firebase dependencies from the mobile app and backend to prepare for AWS.
*   [x] **AWS Serverless Conversion:** Wrapped the Express.js backend with `serverless-http` so it runs natively on AWS Lambda.
*   [x] **Infrastructure as Code:** Created `cloudformation.yaml` to automatically provision API Gateway and Lambda.
*   [x] **Automated Deployments:** Built `./deploy.sh` and a GitHub Actions workflow for 1-click deployments.
*   [x] **Database Integration:** Swapped hardcoded mock data with the `pg` library to connect to a real PostgreSQL database.
*   [x] **Local Environment:** Provided `docker-compose.yml` and `init-db.sql` to instantly spin up a local database for development.
*   [x] **Documentation:** Detailed the architecture and API click-flow in `ARCHITECTURE.md`.

---

## 🎯 Next Targets (Your To-Do List)

Work through these targets one by one to finish the application and get it live.

### Target 1: Local Database Setup & Testing
*Goal: Ensure your backend can talk to the database on your computer.*
- [ ] Install Docker on your machine.
- [ ] Run `docker-compose up -d` inside the `destow-backend` folder to start the database.
- [ ] Run `npm start` in the backend.
- [ ] Open `http://localhost:3000/cabs` in your browser to verify it returns the database rows.

### Target 2: Mobile App Integration
*Goal: Connect the React Native app to your local backend.*
- [ ] In `destow-mobile`, install `axios` (or use `fetch`).
- [ ] Update the "Search Cabs" button to fetch data from `http://localhost:3000/cabs`.
- [ ] Update the React Native UI to map over the returned JSON and display the cab cards dynamically.

### Target 3: Real SMS Authentication
*Goal: Replace the mocked OTP logic with real text messages.*
- [ ] Install the AWS SDK in the backend: `npm install @aws-sdk/client-sns`.
- [ ] Update `POST /auth/send-otp` in `server.js` to use AWS SNS to send a real text message.
- [ ] Update `POST /auth/verify-otp` to validate the real code and generate a secure JWT token.

### Target 4: AWS Cloud Provisioning
*Goal: Set up the required AWS services in the cloud.*
- [ ] Create an AWS Account and configure the AWS CLI (`aws configure`) on your laptop.
- [ ] Create an Amazon S3 Bucket in the AWS Console (to hold your deployment code).
- [ ] Create an Amazon RDS (PostgreSQL) database in the AWS Console.

### Target 5: Production Deployment! 🚀
*Goal: Put the backend on the internet and launch the app.*
- [ ] Update `cloudformation.yaml` to inject your new RDS Database credentials (`DB_HOST`, `DB_PASSWORD`, etc.) into the Lambda Environment variables.
- [ ] Run `./deploy.sh -b <your-s3-bucket-name>` to deploy the backend to AWS.
- [ ] Take the generated `ApiUrl`, put it into your React Native app, and build your final mobile APK/IPA!
