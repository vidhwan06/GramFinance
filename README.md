# GramFinance

### Multilingual Financial Literacy & Decision-Support Platform

GramFinance is a web-based financial literacy and decision-support platform designed primarily for rural and semi-rural households.

The platform aims to make financial information easier to understand and safer to use by combining **financial education, loan-cost calculation, fraud-awareness assistance, government-scheme discovery, and AI-powered financial explanations** in a simple English/Kannada experience.

> **Project Status:** Active Development
> **Latest Status Checkpoint:** 25 September 2026

---

## 🎯 Problem Statement

Many users interact with banking and digital financial services without having a simple way to understand:

* What a financial product actually means
* What a loan will really cost
* Whether a suspicious message contains common fraud indicators
* Where to find reliable information about government financial-support programs
* How to understand basic financial terminology

GramFinance addresses this gap through an interactive platform that combines **financial learning, practical decision support, fraud-awareness guidance, government-resource discovery, and AI-assisted explanations**.

The project focuses on moving beyond static financial information toward simple, situation-based assistance.

---

## 💡 Key Features

### 1. 📚 Financial Learning

Provides structured financial-literacy content covering areas such as:

* Banking and bank accounts
* Savings and emergency funds
* Loans, interest, EMI and tenure
* Insurance
* UPI and digital payments
* Common digital-financial fraud patterns

Lessons are designed around simple explanations, real-life examples, visuals and quizzes.

**Current status:** Database/schema foundation completed; full user-facing learning experience is in development.

---

### 2. 💰 Loan Understanding Tool :- V2

The Loan Calculator is currently the most complete functional module.

It supports:

* Reducing-balance interest calculation
* Flat-rate interest calculation
* EMI calculation
* Amortization
* Loan comparison
* Loan validation
* Processing-fee handling
* Fee editing and removal
* Fee explanations
* Prepayment simulation
* Prepayment validation
* Tenure adjustment
* Total repayment calculation
* Total interest calculation
* Cash-outflow/cost breakdown
* Clear interest-method explanations

The interface also includes loading/error handling and accessibility improvements.

**Status: ✅ Completed**

---

### 3. 🛡️ Check Before You Pay — Fraud/Scam Protection

The fraud-awareness module is designed to help users identify common warning signs in suspicious financial messages.

The planned workflow is:

```text
Message / Screenshot
        ↓
OCR / Text Extraction
        ↓
Fraud Indicator Detection
        ↓
Risk Indicators
        ↓
AI Explanation
        ↓
Safety Guidance
```

Potential indicators include:

* Urgent language
* Requests for OTP/PIN/password
* Suspicious or shortened links
* Impersonation of banks or officials
* Fake cashback/prize offers
* Fake loan offers
* Guaranteed-return or investment bait

The system is designed to present **risk indicators rather than claiming with certainty that a message is fraudulent**.

The project architecture uses an explainable rules layer, with AI used to explain detected indicators rather than independently determining the fraud score.

**Status: 🚧 In Development**

---

### 4. 🏛️ Government Scheme Finder

GramFinance includes a curated government-scheme module intended to help users discover potentially relevant financial-support programs.

Planned functionality includes:

* Scheme listing
* Search
* Filtering
* State/target-group filtering
* Scheme details
* Broad eligibility information
* Required documents
* Official source links
* Last-verified dates
* English/Kannada support

The database foundation and initial PM-KISAN seed data are already available.

**Status: 🚧 In Development**

> Scheme information is intended to help users discover potentially relevant programs. Users should verify eligibility and current information through the official source.

---

### 5. 🤖 AI Financial Assistant

The AI assistant is planned to help users understand supported financial-literacy topics using simple language.

The planned system includes:

* Server-side Gemini integration
* Validated API route
* Financial-safety system prompt
* Guardrails
* Rate limiting
* Safety/refusal handling
* Structured responses
* Conversation UI
* English/Kannada support

The Gemini API key is designed to remain **server-side** and must never be exposed through public client-side environment variables.

**Status: 🚧 In Development**

---

### 6. 📝 Feedback

Users will be able to provide feedback about the platform and its modules.

Planned functionality includes:

* Ratings
* Comments
* Submission workflow
* Success/error handling
* Navigation entry
* Backend integration

The database table and API placeholder already exist.

**Status: 🚧 In Development**

---

## 🌐 Multilingual Support

GramFinance is designed around:

* 🇬🇧 English
* 🇮🇳 Kannada

The project aims to make financial concepts accessible through simple language and, where technically feasible, voice-based interaction.

---

## 🏗️ System Architecture

```text
                    ┌──────────────────┐
                    │      User        │
                    └────────┬─────────┘
                             │
                             ▼
                ┌────────────────────────┐
                │ Next.js / React Frontend│
                └────────────┬───────────┘
                             │
                             ▼
                 ┌───────────────────────┐
                 │ Next.js API / Backend │
                 └───────┬───────┬──────┘
                         │       │
              ┌──────────┘       └───────────┐
              ▼                              ▼
      ┌─────────────────┐            ┌──────────────┐
      │    Supabase     │            │ Gemini API   │
      │ Auth + Postgres │            │ Server-side  │
      │ + Storage       │            └──────────────┘
      └─────────────────┘
              │
              ▼
      ┌─────────────────┐
      │ Fraud Rules     │
      │ Engine + OCR    │
      └─────────────────┘
```

---

## 🛠️ Technology Stack

| Layer           | Technology                     |
| --------------- | ------------------------------ |
| Frontend        | Next.js                        |
| UI              | React                          |
| Language        | TypeScript                     |
| Styling         | Tailwind CSS                   |
| Backend         | Next.js API Routes             |
| Database        | Supabase PostgreSQL            |
| Authentication  | Supabase Auth                  |
| Storage         | Supabase Storage               |
| AI              | Gemini API                     |
| OCR             | Tesseract.js / OCR integration |
| Speech          | Browser Web Speech API         |
| Testing         | Project test suite             |
| Version Control | Git + GitHub                   |
| Deployment      | Vercel                         |

The current implementation uses **Next.js 15 App Router, React 19, TypeScript strict mode and Tailwind CSS**.

---

## 🗄️ Database

The current Supabase database contains six primary tables:

```text
users
lessons
quizzes
schemes
fraud_patterns
feedback
```

The database currently includes:

* Row Level Security (RLS)
* Authentication relationship
* Foreign-key indexes
* Signup profile trigger
* Seed data
* Security policies
* Typed database models

Six live tables and nine verified RLS policies are currently in place.

---

## 🔐 Security & Privacy

GramFinance follows a privacy-first approach.

The system is designed **not to collect or store**:

* Bank passwords
* UPI PINs
* OTPs
* Full card numbers
* Transaction credentials

For fraud-check screenshots, the project specification recommends warning users to blur/crop sensitive information and processing images without permanently storing the raw screenshot.

The application also uses Supabase Row Level Security to restrict protected data.

---

## 🧪 Current Verification Status

The current project baseline has been verified with:

| Check                     | Status       |
| ------------------------- | ------------ |
| `npm run build`           | ✅ PASS       |
| `npx tsc --noEmit`        | ✅ PASS       |
| `npm run lint`            | ✅ PASS       |
| `npm test`                | ✅ 63/63 PASS |
| Supabase migrations       | ✅ PASS       |
| Supabase RLS verification | ✅ PASS       |
| Supabase live integration | ✅ PASS       |

The latest report confirms **63/63 automated tests passing** and successful build, TypeScript and lint checks.

---

## 📊 Current Project Progress

### ✅ Completed

* Project foundation and architecture
* Next.js/React/TypeScript/Tailwind setup
* Loan Calculator V2
* Loan calculations and validation
* Fee handling
* Prepayment simulation
* Supabase database
* Supabase authentication relationship
* Row Level Security
* Database policies
* Seed data
* Supabase/Next.js integration
* Error/loading boundaries
* Accessibility improvements
* Automated testing

### 🚧 Remaining

* Government Schemes user interface
* Financial Learning experience
* Fraud/Scam Checker workflow
* AI Financial Assistant
* Feedback UI/workflow
* Content population
* Further integration testing
* Security review
* Production hardening

The recommended development order is Government Schemes → Financial Learning → Fraud/Scam Checker → AI Financial Assistant → Feedback, followed by content population and final hardening.

---

## 🗺️ Development Roadmap

```text
Phase 1
Project Research & Requirements
        ↓
Phase 2
System Design & Architecture
        ↓
Phase 3
Next.js + Supabase Foundation
        ↓
Phase 4
Core Modules
        ↓
Phase 5
Fraud / Scam Checker
        ↓
Phase 6
Government Schemes + AI Assistant
        ↓
Phase 7
Feedback + Integration Testing
        ↓
Phase 8
Security Review & Production Hardening
```

---

## 📌 Project Scope

GramFinance is intended as a **financial-literacy and decision-support platform**, not as a replacement for:

* Banks
* Financial advisors
* Government departments
* Law-enforcement agencies

The system does not:

* Approve or reject loans
* Provide investment advice
* Access bank accounts
* Initiate financial transactions
* Guarantee that a message is fraudulent
* Determine legal eligibility for government schemes

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <YOUR-GITHUB-REPOSITORY-URL>
cd <PROJECT-FOLDER>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file and configure the required Supabase credentials.

For AI functionality, keep the Gemini API key **server-side only**.

### 4. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### 5. Run tests

```bash
npm test
```

### 6. Run type checking

```bash
npx tsc --noEmit
```

### 7. Run linting

```bash
npm run lint
```

### 8. Build for production

```bash
npm run build
```

---

## 👥 Team Development

GramFinance is being developed collaboratively using Git and GitHub.

Before beginning a major new feature, the current stable baseline should be committed so the team has a clean rollback point.

Recommended checkpoint:

```bash
git add .
git commit -m "feat: complete loan v2 and supabase integration"
git push origin main
```

Development should preserve the existing **RLS configuration, database security and 63-test baseline**.

---

## 📄 Project Documentation

The project documentation covers:

* Problem statement
* Product goals
* Functional requirements
* Non-functional requirements
* System architecture
* Technology stack
* Database schema
* Fraud-analysis architecture
* Privacy and security
* Development roadmap
* Impact measurement

---

## 📜 License

This project is currently developed as an academic/community project.

License information can be added when the team decides on the project's final licensing model.

---

## ⭐ Project Vision

**GramFinance aims to make financial information simpler, safer and more accessible — especially for users who may find traditional financial information difficult to understand.**

The goal is not simply to provide information, but to help users **understand financial concepts, recognize risks, compare loan costs and discover reliable resources before making financial decisions.**
