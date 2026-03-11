# Destow App

Destow is a travel agency discovery platform where users can search and compare travel agencies based on **destination, travel dates, and availability**. The platform focuses on providing a **simple and clean interface** to help users find agencies offering travel services without complex map interfaces.

---

## Overview

Destow allows users to:

* Search travel agencies by **From / To location**
* Select **travel dates**
* View available **travel agencies**
* Compare agencies based on services offered
* Easily contact or book through agencies

The application focuses primarily on **UI simplicity and performance**.

---

## Tech Stack

### Frontend

* React.js
* TailwindCSS / CSS
* Axios (for API calls)

### Backend (Optional / Future Integration)

* Node.js
* Express.js

### Other Tools

* Git & GitHub
* NPM / Yarn

---

## Project Structure

```
destow/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── Navbar
│   │   ├── SearchForm
│   │   ├── AgencyCard
│   │   └── Footer
│   │
│   ├── pages/
│   │   ├── Home
│   │   ├── SearchResults
│   │   └── AgencyDetails
│   │
│   ├── assets/
│   │
│   ├── App.js
│   └── index.js
│
├── package.json
└── README.md
```

---

# Setup Instructions

## 1. Clone the Repository

```bash
git clone https://github.com/your-username/destow.git
```

Navigate to the project directory:

```bash
cd destow
```

---

## 2. Install Dependencies

Using npm:

```bash
npm install
```

or using yarn:

```bash
yarn install
```

---

## 3. Run the Application

Start the development server:

```bash
npm start
```

The app will run at:

```
http://localhost:3000
```

---

# UI Development

The UI is designed to be **simple, responsive, and agency-focused**.

## Core UI Components

### 1. Navbar

Contains:

* App logo
* Navigation links
* Login / Signup (optional)

---

### 2. Search Section

Main search interface containing:

* **From Location**
* **Destination**
* **Travel Dates**
* **Search Button**

Example Layout:

```
--------------------------------
| From | To | Dates | Search   |
--------------------------------
```

---

### 3. Agency Listing

Displays travel agencies in a **card format**.

Each card contains:

* Agency name
* Destination covered
* Price range
* Ratings
* View details button

Example Card:

```
---------------------------
| Agency Name             |
| Destination: Manali     |
| Rating: ⭐⭐⭐⭐           |
| Price: ₹8000 onwards    |
| [View Details]          |
---------------------------
```

---

### 4. Agency Details Page

Displays:

* Agency description
* Package details
* Travel schedule
* Contact / booking option

---

# UI Design Principles

* Minimal design
* Mobile responsive
* Clear typography
* Fast loading components
* Card-based layout

---

# Future Enhancements

Planned improvements:

* User authentication
* Agency dashboard
* Booking system
* Reviews and ratings
* Payment integration
* Filters (budget, duration, rating)
* Admin panel

---

# Development Workflow

1. Create a feature branch

```bash
git checkout -b feature/ui-improvements
```

2. Commit changes

```bash
git commit -m "Added agency card UI"
```

3. Push branch

```bash
git push origin feature/ui-improvements
```

4. Create Pull Request

---

# Screens to Implement

* Home Page
* Search Results Page
* Agency Details Page
* Contact Page

---

# Contributors

* Destow Development Team

---
