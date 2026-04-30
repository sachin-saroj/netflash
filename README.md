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
- Google Gemini API Key

### Local Installation

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/netflash.git
cd netflash
```

**2. Configure the Backend**
```bash
cd backend
npm install
```
Rename `.env.example` to `.env` and inject your credentials:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
RAPIDAPI_KEY=your_rapidapi_key
```
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

## 🗺️ Future Roadmap

- [ ] **Background Price Polling:** Implement cron jobs (`node-cron` or `BullMQ`) to alert users when items in their Watchlist drop in price.
- [ ] **Enhanced Visualizations:** Transition from mock historical price data to persistent data logging for true long-term price tracking.
- [ ] **Browser Extension Integration:** Build a companion Chrome extension to overlay NETflash Trust Scores directly on Amazon/Flipkart product pages.
- [ ] **Redis Caching:** Introduce Redis to cache frequent AI analysis results, reducing latency and LLM token costs.

---

## 📄 License

This project is licensed under the MIT License - feel free to use it for your own portfolio or educational purposes.
