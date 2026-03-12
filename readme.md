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

## Backend (Planned / Future Integration)

* Node.js
* Express.js
* PostgreSQL / MongoDB
* Authentication (Cognito / Keycloak)
* Authorization using Cerbos

## DevOps & Tools

* Git
* GitHub
* Docker
* CI/CD pipelines

---

# Mobile Application Architecture

```
Mobile App (React Native)
        │
        │ HTTPS API Calls
        ▼
Backend API (Node.js / Express)
        │
        ├── Authentication Service
        │
        ├── Authorization Layer (Cerbos)
        │
        ├── Database (PostgreSQL / MongoDB)
        │
        └── Notification Service (Push Notifications)
```

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

* User authentication
* Agency dashboard
* Booking system
* Reviews and ratings
* Payment integration
* Advanced search filters
* Push notifications
* Admin panel

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
* Login / Signup Screen (Future)

---

# Contributors

Destow Development Team
