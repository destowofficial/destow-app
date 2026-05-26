# Destow Mobile App

Destow is a **travel agency discovery mobile application** where users can search and compare travel agencies based on **destination, travel dates, and availability**.

The mobile app provides a **simple, fast, and intuitive interface** that helps users discover travel agencies and travel packages without complicated map-based navigation.

---

# Overview

The **Destow Mobile App** allows users to:

* Search travel agencies by **From / To location**
* Select **travel dates**
* View **available travel agencies**
* Compare agencies based on services
* View agency details and packages
* Contact agencies directly

The application focuses on **simplicity, performance, and mobile-friendly UI**.

---

# Tech Stack

## Mobile Application

* React Native
* Expo / React Native CLI
* JavaScript / TypeScript
* Axios (API communication)

## Backend

* Node.js (AWS Serverless API Gateway + Lambda)
* Hono (Web Framework)
* PostgreSQL via Drizzle ORM
* Authentication: Custom OTP flow using AWS SNS
* JWT-based Session Management

## DevOps & Tools

* Git
* GitHub
* Docker
* CI/CD pipelines

---

# Architecture (AWS Serverless)

The backend has been migrated from a traditional Node/Express server to an **AWS Serverless Architecture**.

```
Mobile App (React Native)
        │
        │ HTTPS API Calls
        ▼
AWS API Gateway (HTTP API)
        │
        │ Proxies all requests
        ▼
AWS Lambda Function (Node.js 20.x)
        │
        ├── index.ts (Hono wrapped with handle(app))
        │
        └── Database (PostgreSQL)
```

## Why this Architecture?
- **Zero Server Management**: No need to provision or maintain EC2 instances.
- **Auto-scaling**: Automatically scales from 0 to thousands of concurrent requests.
- **Cost-effective**: You only pay for the exact compute time used when users make API requests.

---

# Project Structure

```
destow-mobile/
│
├── assets/
│   ├── images
│   └── icons
│
├── src/
│
│   ├── components/
│   │   ├── AgencyCard
│   │   ├── SearchForm
│   │   ├── Header
│   │   └── Button
│   │
│   ├── screens/
│   │   ├── HomeScreen
│   │   ├── SearchResultsScreen
│   │   ├── AgencyDetailsScreen
│   │   └── ContactScreen
│   │
│   ├── navigation/
│   │   └── AppNavigator
│   │
│   ├── services/
│   │   └── apiService
│   │
│   ├── utils/
│   │
│   └── App.js
│
├── package.json
└── README.md
```

---

# Setup Instructions

## 1 Clone the Repository

```bash
git clone https://github.com/your-username/destow-mobile.git
```

Navigate to the project directory:

```bash
cd destow-mobile
```

---

# 2 Install Dependencies

Using npm:

```bash
npm install
```

or using yarn:

```bash
yarn install
```

---

# 3 Run the Application

Start the development server:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

---

# Mobile UI Flow

## 1 Home Screen

Main screen of the application.

Features:

* Destination search
* Travel date selection
* Search button

Example layout:

```
------------------------
From Location
Destination
Travel Date
[ Search ]
------------------------
```

---

# 2 Search Results Screen

Displays travel agencies based on search criteria.

Each agency card contains:

* Agency name
* Destination
* Rating
* Price range
* View details button

Example:

```
-------------------------
Agency Name
Destination: Manali
Rating: ⭐⭐⭐⭐
Price: ₹8000 onwards
[View Details]
-------------------------
```

---

# 3 Agency Details Screen

Displays detailed information about the selected agency.

Includes:

* Agency description
* Travel packages
* Price details
* Contact option

---

# 4 Contact / Booking Screen

Allows users to:

* Contact travel agencies
* Send booking inquiry
* View agency contact details

---

# UI Design Principles

The application focuses on:

* Simple navigation
* Mobile-friendly layout
* Fast loading screens
* Clean UI components
* Card-based design for agencies

---

# Future Enhancements

Planned improvements:

* Agency dashboard
* Booking system
* Reviews and ratings
* Payment integration
* Advanced search filters
* Push notifications
* Admin panel

---

# AWS Deployment Workflow

The backend application is configured for a fully automated deployment to AWS using CloudFormation.

## 1. Local Bash Deployment (`deploy.sh`)

You can deploy the entire AWS infrastructure directly from your terminal using the provided script.

1. Ensure the **AWS CLI** is installed and configured (`aws configure`).
2. Create an S3 Bucket in AWS (e.g., `destow-deployment-bucket`).
3. Make the script executable and run it:

```bash
chmod +x deploy.sh
./deploy.sh -b your-s3-bucket-name
```

**What the script does:**
1. Installs backend NPM dependencies.
2. Runs `aws cloudformation package`, which automatically zips your `destow-backend` folder and uploads it to your S3 bucket.
3. Runs `aws cloudformation deploy` to create/update your API Gateway and Lambda functions.
4. Outputs the live **ApiUrl** which you can plug into your mobile app.

## 2. CI/CD Deployment (GitHub Actions)

We have also set up a GitHub Actions workflow (`.github/workflows/deploy.yml`).

Every time you push code to the `main` branch, GitHub will automatically run the CloudFormation deployment.
**Requirements:**
Add the following secrets to your GitHub Repository Settings:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_DEPLOYMENT_BUCKET`

---

# Development Workflow

Create a feature branch:

```bash
git checkout -b feature/mobile-ui
```

Commit changes:

```bash
git commit -m "Added agency card component"
```

Push branch:

```bash
git push origin feature/mobile-ui
```

Create a Pull Request on GitHub.

---

# Screens to Implement

* Home Screen
* Search Results Screen
* Agency Details Screen
* Contact Screen
* Login / OTP Verification Screen

---

# Contributors

Destow Development Team
