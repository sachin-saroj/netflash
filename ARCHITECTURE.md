# NETflash — Architectural Documentation

This document outlines the software architecture, request pipelines, and database flow schemas of the NETflash AI Product Intelligence platform.

---

## 📌 High-Level Overview

NETflash utilizes a decoupled client-server architecture with persistent caching and generative AI components.

```
┌────────────────────────────────────────────────────────┐
│                   Client (React / Vite)                │
└───────────────────────────┬────────────────────────────┘
                            │ (HTTPS REST API Requests)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Server (Node.js / Express)           │
├───────────────────────────┼────────────────────────────┤
│  External Scraper APIs    │ Google Gemini AI SDK       │
│  (RapidAPI)               │ (Generative Review Parse)  │
└─────────────┬─────────────┴─────────────┬──────────────┘
              │                           │
              ▼                           ▼
┌────────────────────────────────────────────────────────┐
│               Database (MongoDB Atlas)                 │
│  Watchlist  │ User Auth │ AI Cache (TTL) │ Telemetry   │
└────────────────────────────────────────────────────────┘
```

- **Frontend (Client)**: A Single Page Application (SPA) built using React 18, Vite, React Router DOM, and Recharts. It handles user authentication state, aggregates chart visualization data, and dynamically renders alert metrics.
- **Backend (Server)**: A RESTful API built on Express.js. Handles client requests, performs validation, coordinates scraping tasks, interacts with Google Gemini Generative AI, generates security tokens, and implements caching bypass routes.
- **Database (MongoDB)**: Hosted on MongoDB Atlas, managed via Mongoose ODM. Persists user credential records, watchlist profiles, search telemetry logs, and caches generated analysis outputs to control API usage.
- **External Integrations**:
  - **Google Gemini Pro**: Analyzes scraped review datasets to identify red flags, pros/cons, and authentic sentiment metrics.
  - **RapidAPI Scrapers**: Gathers live product reviews and metadata from Amazon, Flipkart, and Meesho.
  - **YouTube Data API v3**: Supplies video review resources and metadata matching queried products.

---

## 🔄 System Flows

### 1. Analysis Request Flow
This flow details how a submitted product URL is validated, scraped, analyzed, and cached.

```mermaid
graph TD
    A["Client: Product URL Submission"] --> B["Backend: Validation Middleware"]
    B --> C["Backend: extractProductId Helper"]
    C --> D["Backend: Platform Scraper Service (Amazon/Flipkart/Meesho)"]
    D --> E["Backend: Review & Price Aggregation"]
    E --> F{"Is Cache Available?"}
    F -- Yes --> G["Retrieve from MongoDB (Analysis Cache)"]
    F -- No --> H["Backend: Gemini AI LLM Analysis (Structured Prompt)"]
    H --> I["Save Analysis to cache (TTL: 24h)"]
    G --> J["Client Response Payload"]
    I --> J
```

---

### 2. User Authentication Flow
Details session security, password verification, and JWT issuing.

```mermaid
graph TD
    A["User: Input Credentials"] --> B["Client: POST /api/auth/login or /register"]
    B --> C["Backend: Verify credentials (bcrypt comparison)"]
    C --> D["Backend: Sign JWT (using JWT_SECRET)"]
    D --> E["Client: Store JWT (localStorage) & set Auth Context"]
    E --> F["Client: Include Authorization Bearer Token in requests"]
    F --> G["Backend: JWT Validation Middleware"]
    G --> H["Access Protected Routes (/api/watchlist)"]
```

---

### 3. Watchlist Flow
Shows how analyzed products are persisted and displayed in the user dashboard.

```mermaid
graph TD
    A["Client: Click 'Add to Watchlist'"] --> B["Client: POST /api/watchlist (Authenticated)"]
    B --> C["Backend: Retrieve User ID from JWT"]
    C --> D["Backend: Mongoose saves product details to MongoDB"]
    D --> E["Client: Redirects / Fetch dashboard"]
    E --> F["Client: Render watchlist cards on Dashboard page"]
```

---

### 4. Demo Mode & Graceful Degradation Flow
Visualizes how the system handles scraper or Gemini AI API limits without failing.

```mermaid
graph TD
    A["Backend: Fetch review data or run Gemini analysis"] --> B{"Scraper/Gemini API fails?"}
    B -- No --> C["Proceed with real analysis (demoMode: false)"]
    B -- Yes (Rate Limit / Outage) --> D["Log warning & trigger local Mock Data Engine"]
    D --> E["Generate structure-compliant mock JSON (demoMode: true)"]
    E --> F["Client: Detect `demoMode: true` in response payload"]
    F --> G["Client: Display 'Demo Mode' banner & warning notices"]
```

---

## 📁 Repository Directory Structure

```
netflash/
├── .github/                  # GitHub actions and CI/CD pipelines
├── screenshots/              # Screenshots used for documentation
├── LICENSE                   # Project MIT License
├── README.md                 # Primary user documentation
├── ARCHITECTURE.md           # This architecture overview
├── CONTRIBUTING.md           # Development and workflow guidelines
├── backend/                  # REST API Server
│   ├── index.js              # Express entrypoint
│   ├── .env.example          # Template for backend config variables
│   ├── middleware/           # auth.js (JWT validation), rate limiting, error formatting
│   ├── models/               # Mongoose database schemas (User, Analysis, Cache, Search, etc.)
│   ├── routes/               # API endpoints (auth, analysis, watchlist)
│   ├── services/             # API connections (gemini, scraper, youtube, fallback engine)
│   ├── utils/                # logger (winston), parser helpers, and data validators
│   └── tests/                # Jest & Supertest integration files
└── frontend/                 # Client Single Page Application (SPA)
    ├── package.json          # Vite and frontend packages configuration
    ├── src/
    │   ├── components/       # Shared UI parts (Header, SellerTrustCard, Banner, etc.)
    │   ├── context/          # AuthContext for session propagation
    │   ├── pages/            # View states (Home, Results, Watchlist, Login, Register)
    │   └── utils/            # URL checkers and format helpers
    └── e2e/                  # Playwright browser automation tests
```
