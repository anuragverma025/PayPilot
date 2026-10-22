# 🧭 PayPilot — AI Shopping Decision & Checkout Agent

> **"Think smarter. Shop better. Stay in control."**  
> Developed for the **PayPal AI Hackathon 2026**

---

## 🎯 Executive Product Vision

**PayPilot** is an AI-powered shopping decision and checkout agent engineered to guide users through a transparent, high-integrity shopping journey. Unlike conventional shopping chatbots that hallucinate product attributes or try to force purchases, PayPilot enforces strict architectural boundaries:

1. **Understand needs**: Extract user requirements, budget ceilings, and workload priorities.
2. **Match products**: Deterministically filter and rank curated catalog models with mathematical transparency.
3. **Compare options**: Side-by-side spec difference analysis highlighting compute, upgradability, and portability.
4. **Review order**: User explicitly inspects and approves the authoritative order total (Phase 3).
5. **Checkout**: Secure server-authoritative payment capture via PayPal Developer Sandbox (Phase 3).

> [!IMPORTANT]
> **User Agency Guarantee**: PayPilot will **never** initiate a purchase without the user's explicit, informed approval. Product facts and authoritative prices are strictly decoupled from AI-generated explanations.

---

## 🏗️ Architecture & Technology Stack

```
PayPilot/
├── backend/
│   ├── src/
│   │   ├── config/             # Environment & service config
│   │   ├── controllers/        # Express route controllers
│   │   ├── data/               # Curated sample catalog (32 laptops)
│   │   ├── middleware/         # Centralized error handler & logging
│   │   ├── models/             # Mongoose schemas (Product & Order)
│   │   ├── routes/             # REST endpoints (/health, /products, /compare)
│   │   ├── services/
│   │   │   ├── catalog.service.js    # Data access & memory fallback
│   │   │   ├── ranking.service.js    # Deterministic scoring engine (0-100%)
│   │   │   └── comparison.service.js # Spec divergence & matrix evaluator
│   │   ├── validators/         # Zod schemas for input validation
│   │   ├── app.js              # Express app setup & CORS
│   │   └── server.js           # Server bootstrap & Mongo connector
│   └── tests/                  # Vitest suite for health, products, ranking & compare
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── common/         # Button, Badge, Card, Modal, Skeleton
    │   │   ├── layout/         # Sidebar (brandmark, navigation) & Header
    │   │   ├── workspace/      # WorkflowSteps, SearchHero, FilterBar, PreferencesPanel
    │   │   ├── products/       # ProductCard, ProductGrid, ProductDetailModal
    │   │   └── comparison/     # ComparisonDrawer & ComparisonModal
    │   ├── services/           # Typed API client connecting to backend
    │   ├── utils/              # Currency formatters & query presets
    │   ├── App.jsx             # Main interactive shopping dashboard
    │   └── main.jsx
    ├── tailwind.config.js      # PayPilot custom design tokens
    └── vite.config.js          # Fast HMR Vite bundler
```

---

## 🎨 Visual Design Tokens

PayPilot adheres to a polished fintech-grade design system:
- **Main background:** `#F6F7FB`
- **Primary surface:** `#FFFFFF`
- **Primary text:** `#15172B`
- **Secondary text:** `#687086`
- **Primary brand:** `#635BFF` (Indigo/Violet)
- **Brand hover:** `#5148E5`
- **Deep navy:** `#11142A`
- **Subtle violet background:** `#F0EEFF`
- **Borders:** `#E6E8F0`
- **Success:** `#16845B` / `#E8F7EF`
- **Warning:** `#B76E00` / `#FFF5DF`
- **Error:** `#C23B48` / `#FFF0F1`

---

## 📊 Deterministic Ranking Algorithm

Match scores are calculated entirely on the backend using verifiable hardware criteria:
- **Budget & Savings (30 pts):** Evaluates price ceiling proximity and financial headroom.
- **RAM Multitasking (20 pts):** Assesses memory requirements (8GB vs 16GB+).
- **Workload Alignment (25 pts):** Allocates compute points based on user goal (e.g., dedicated NVIDIA CUDA GPU for AI/ML vs high single-core CPU for compilers).
- **Battery & Portability (15 pts):** Scores real-world runtime hours and chassis weight.
- **Modular Upgradability (10 pts):** Rewards user-replaceable SO-DIMM RAM slots and open secondary M.2 SSD bays.

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v22)
- **npm**: v9+
- *(Optional)* **MongoDB**: Local MongoDB instance or Atlas connection string. If MongoDB is not running, PayPilot automatically operates in zero-config in-memory mode using the verified catalog data.

### 1. Backend Setup
```bash
cd backend
npm install
npm test            # Run unit tests for ranking, products & compare
npm run seed        # (Optional) Seed 32 curated laptops to MongoDB
npm run dev         # Starts backend API on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev         # Starts Vite client on http://localhost:5173
```

---

## 🔒 Security & Data Integrity
- **Zero Hallucinated Specs**: All 32 laptop records reflect genuine OEM hardware specifications.
- **Input Validation**: Every API query and mutation is strictly validated through Zod.
- **Authoritative Calculations**: Product totals and difference matrices are always computed server-side.
- **No Client Secrets**: PayPal sandbox credentials and AI tokens remain strictly on the backend.

---

## 📄 License
Apache License 2.0. Built for the PayPal AI Hackathon 2026.
