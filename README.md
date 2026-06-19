# NETflash — AI Product Intelligence Platform

<div align="center">

![NETflash Home](./screenshots/01_home.png)

**An AI-driven e-commerce analytics tool designed to evaluate review authenticity, track price volatility, and generate structured purchasing insights.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Gemini AI](https://img.shields.io/badge/Google-Gemini_AI-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)

</div>

---

## 📌 Overview

NETflash addresses the growing challenge of information asymmetry in e-commerce. By leveraging Large Language Models (LLMs), the platform aggregates unstructured review data from major marketplaces (Amazon, Flipkart, Meesho) and transforms it into structured, quantifiable intelligence. 

This project demonstrates full-stack proficiency, API integration, prompt engineering, and modern UI/UX principles.

---

## ✨ Core Features

* **Authenticity Scoring (Review Radar):** Utilizes Google's Gemini AI to analyze linguistic patterns across review datasets, flagging potential burst-posting anomalies and incentivized reviews.
* **Time-Series Price Tracking:** Visualizes 30-day price volatility using responsive area charts, providing historical context to current valuations.
* **Structured Intelligence Extraction:** Processes raw text to isolate recurring genuine complaints, verified positives, and outputs a normalized Trust Score.
* **Cross-Platform Price Aggregation:** Queries multiple marketplaces simultaneously to identify the most cost-effective purchasing option.
* **User Retention Engine:** Implements secure JWT-based authentication, allowing users to persist analyzed products to a personal MongoDB-backed Watchlist.

---

## 📸 Interface & Workflow

### Intelligence Dashboard
![Dashboard Top](./screenshots/02_dashboard_top.png)
*Displays the calculated Trust Score, Review Radar metrics, and the synthesized AI Verdict based on the aggregated dataset.*

### Deep-Dive Analytics
![Dashboard Middle](./screenshots/03_dashboard_middle.png)
*Categorical breakdown of Build Quality, Value, and Performance alongside the 30-day price volatility chart.*

### Actionable Insights
![Dashboard Bottom](./screenshots/04_dashboard_bottom.png)
*Presents isolated consumer complaints and dynamic, AI-suggested product alternatives.*

---

## 🛠️ Technology Stack

| Architecture Layer | Technologies Utilized |
|-------------------|----------------------|
| **Client / Frontend** | React 18, Vite, React Router DOM, Recharts, Custom CSS Modules |
| **Server / API** | Node.js, Express.js, RESTful Architecture |
| **Data Persistence** | MongoDB Atlas, Mongoose ODM |
| **AI / Machine Learning** | Google Generative AI SDK (Gemini Pro) |
| **Authentication & Security**| JSON Web Tokens (JWT), bcryptjs |
| **External Integrations** | RapidAPI Scrapers (Amazon, Flipkart, Meesho) |

---

## 🧠 Engineering Challenges Solved

Building NETflash required addressing several technical hurdles common in data-aggregation platforms:

1. **Unpredictable API Limits (Rate Limiting):** 
   Implemented a **Mock Data Fallback Engine**. If external scraper APIs fail due to rate limits or region blocks (common with free-tier RapidAPI keys), the system gracefully catches the error and serves realistic, localized mock data. This guarantees 100% uptime for portfolio demonstrations.
2. **LLM Output Instability:** 
   Raw LLM outputs are notoriously unstructured. Designed strict JSON-schema prompts for Gemini AI, coupled with server-side validation, ensuring the frontend always receives predictable, render-safe data structures.
3. **Database Dependency Failures:** 
   Engineered the Express backend to support a "DB-less Graceful Degradation" mode. If MongoDB Atlas blocks the connection (e.g., due to dynamic IP changes), the core analysis features bypass caching and continue to function seamlessly.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas Cluster (Ensure your IP `0.0.0.0/0` is whitelisted)
- Google Gemini API Key (Required for LLM review analysis)

### Local Installation

**1. Clone the repository**
```bash
git clone https://github.com/sachin-saroj/netflash.git
cd netflash
```

**2. Configure the Backend**
```bash
cd backend
npm install
```

Rename `.env.example` to `.env` and configure your environment variables.

#### Environment Variables Reference

| Variable | Required | Default / Example | Purpose | Fallback / Failure Behavior |
| :--- | :---: | :--- | :--- | :--- |
| `PORT` | No | `5000` | Port for the backend server to listen on. | Defaults to `5000`. |
| `NODE_ENV` | No | `development` | Running environment mode (`development`, `production`, `test`). | Defaults to `development`. |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed origin for CORS verification. | Defaults to allowing local React server. |
| `JWT_SECRET` | **Yes** | *See Generation below* | Cryptographic key used to sign and verify user JWT authentication sessions. | **Critical:** The server will crash and fail to start if this is missing. |
| `MONGODB_URI` | **Yes** | `mongodb+srv://...` | Connection URI for the MongoDB database/cluster. | **Bypassed:** Bypasses caching and watchlist features gracefully (runs DB-less). |
| `GEMINI_API_KEY` | **Yes** | `AIzaSy...` | Access token for the Google Generative AI (Gemini Pro) SDK. | Falls back to the mock data generator (Demo Mode). |
| `RAPIDAPI_KEY` | No | `rapid_key...` | Key for e-commerce scraper APIs (Amazon, Flipkart, Meesho). | Falls back to the mock data generator (Demo Mode). |
| `YOUTUBE_API_KEY` | No | `yt_key...` | Google Cloud API key for searching product review videos. | **Optional:** Returns `[]` and logs a warning; does not affect analysis functionality. |

#### Generating JWT_SECRET
To generate a secure 256-bit cryptographically strong key, run the following command in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the printed output and set it as `JWT_SECRET` in your `.env` file.

Start the backend server:
```bash
node index.js
```

**3. Configure the Frontend**
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` to interact with the platform.

---

## 🧪 Demo Mode & Mock Data (Graceful Degradation)

To ensure high availability and robust performance during portfolio demonstrations, NETflash includes a fallback execution path when external APIs are rate-limited or blocked:

1. **Activation Triggers:**
   - **Gemini API Failures:** API quota exhaustion or connection timeouts.
   - **Scraper Errors:** RapidAPI quota expiration, IP blocking, or invalid API credentials.
   - **Database Outages:** MongoDB Atlas connection rejection (e.g. IP whitelist block) triggers a degraded "DB-less" caching bypass.

2. **System Behavior:**
   - The backend catches these exceptions, logs a warning, and switches to a local **Mock Data Engine** that returns a structure-compliant, realistic analysis.
   - The API response contains a `demoMode: true` status flag.
   - The React frontend detects this flag and overlays a prominent **"Demo Mode" banner** across the dashboard.

> [!WARNING]
> **Data Integrity Disclaimer**
> Mock data served during Demo Mode is for visual evaluation and application stability purposes only. It should **never** be interpreted as authentic product sentiment or live intelligence.


### 📸 Documentation Screenshots

To regenerate or capture screenshots of the platform for documentation:
1. Ensure both the backend and frontend servers are running locally.
2. Run the capture script from the `backend/` directory:
   ```bash
   npm run capture
   ```
This launches a headless browser via Puppeteer, triggers a demo analysis, and saves the generated screenshots directly to the root `screenshots/` directory.

## 🧪 Automated Testing & Coverage

NETflash enforces high quality standards through extensive test coverage across both backend and frontend layers:

- **Backend Integration & Unit Tests (Jest):** 63 automated tests covering:
  - Auth routes, payload validations, and rate-limiting limits.
  - Price comparisons, cache hit/miss flows, and partial marketplace scraper failovers.
  - CRUD operations and strict user-data ownership (IDOR prevention) on Watchlist.
  - Helper logic unit tests (`extractProductId`, `cleanReviews`, and retry client `rapidApi` loops).
- **Frontend Component & Routing Tests (Vitest & RTL):** 27 automated tests covering:
  - Watchlist Dashboard loading spinners, empty lists, and error feedback modals.
  - Form validation rules and input boundaries inside `SearchBar`.
  - Color-coded threshold styling and label checks inside `TrustScoreCard`.
  - Authentication interceptors checking automatic JWT header injection.

### Running Tests Locally

To run the entire test suite:

**Backend Tests:**
```bash
cd backend
npm run test          # Execute tests once
npm run test:coverage # Generate HTML coverage report
```

**Frontend Tests:**
```bash
cd frontend
npm run test          # Execute Vitest suite once
npm run test:coverage # Generate HTML coverage report
```

---

## 🗺️ Future Roadmap

- [ ] **Background Price Polling:** Implement cron jobs (`node-cron` or `BullMQ`) to alert users when items in their Watchlist drop in price.
- [ ] **Enhanced Visualizations:** Transition from mock historical price data to persistent data logging for true long-term price tracking.
- [ ] **Browser Extension Integration:** Build a companion Chrome extension to overlay NETflash Trust Scores directly on Amazon/Flipkart product pages.
- [ ] **Redis Caching:** Introduce Redis to cache frequent AI analysis results, reducing latency and LLM token costs.

---

## 📄 License

This project is licensed under the MIT License - feel free to use it for your own portfolio or educational purposes.
