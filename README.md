# GramFinance

### Understand. Verify. Decide Safely.

**GramFinance** is a free, non-commercial financial literacy and decision-support platform built to help Indian households understand government support schemes, borrowing costs, digital-fraud risks, and everyday financial questions.

🌐 **Live:** https://gram-finance.vercel.app/

GramFinance combines **rule-based eligibility checks, loan-cost calculations, fraud-awareness analysis, financial learning, and AI-assisted explanations** in a simple English/Kannada experience.

> **Project Status: ✅ Completed & Deployed**

---

## 🎯 The Problem

Financial information is often difficult to understand, scattered across different sources, or presented in ways that make comparison difficult.

Users may need help answering questions such as:

* What does this financial term actually mean?
* How much will a loan really cost?
* Is this message showing common signs of a scam?
* Which government schemes might apply to my situation?
* What documents or conditions should I check before applying?
* How can I understand financial concepts in simple Kannada or English?

GramFinance addresses these problems through a single public-interest platform focused on **clarity, transparency, and explainable decision support**.

---

## ✨ Key Features

### 🏛️ Government Support Schemes

Explore government welfare and financial-support schemes using structured, readable information.

The scheme system supports:

* Scheme discovery
* Search and filtering
* Target-group information
* Eligibility checking
* Rule-based eligibility results
* Required information and documents
* Official source references
* Last-verified information
* English/Kannada support

Eligibility results are designed to show **which conditions matched, which failed, and what information may be missing**, rather than producing an unexplained yes/no result.

---

### 🛡️ Digital Fraud Inspector

The Fraud Inspector helps users examine suspicious SMS, WhatsApp messages, loan offers and other financial messages before taking action.

It looks for common warning indicators such as:

* OTP requests
* Urgent payment demands
* Suspicious links
* Unofficial fees
* Personal UPI payment requests
* Impersonation
* Fake government claims
* Suspicious financial offers

The system uses an **explainable rules-based detection layer** and presents the reasons behind detected warning signs.

> GramFinance is designed to identify risk indicators, not to guarantee that a message is fraudulent.

---

### 💰 Loan Cost Calculator

The loan calculator helps users understand the real cost of borrowing rather than focusing only on the advertised EMI or interest rate.

It supports:

* Reducing-balance interest
* Flat-rate interest
* EMI calculation
* Amortization
* Loan comparison
* Processing fees
* Fee editing
* Fee explanations
* Prepayment simulation
* Tenure adjustment
* Total repayment
* Total interest
* Cash-outflow breakdown
* Interest-method explanations

Calculations are performed in the browser, allowing users to understand the numbers before making a borrowing decision.

---

### 📚 Financial Learning

GramFinance provides structured financial-literacy content covering topics including:

* Banking and bank accounts
* Savings
* Emergency funds
* Loans and interest
* EMI and tenure
* Insurance
* UPI and digital payments
* Common financial scams

The learning experience is designed around simple explanations and practical examples rather than financial jargon.

---

### 🤖 Ask GramFinance

The AI assistant allows users to ask everyday financial questions in **English or Kannada**.

It is designed to provide simple explanations grounded in the supported financial-information framework while maintaining safety guardrails.

The assistant is intended to **explain**, not make financial decisions on the user's behalf.

---

### 📝 Feedback

Users can submit feedback about the platform and its modules.

The feedback system includes:

* Ratings
* Comments
* Validation
* Submission handling
* Success/error states
* Backend integration
* Protected database access

---

## 🌐 Bilingual Experience

GramFinance supports:

🇬🇧 **English**

🇮🇳 **ಕನ್ನಡ Kannada**

The goal is to make financial information accessible without requiring users to understand complex financial terminology.

---

## 🏗️ Architecture

```text
                         ┌──────────────────┐
                         │       User       │
                         └────────┬─────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │   Next.js / React App    │
                    │   English + Kannada UI   │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │    Next.js API Layer     │
                    │ Validation + Security    │
                    └───────┬──────────┬───────┘
                            │          │
                 ┌──────────┘          └──────────┐
                 ▼                                ▼
        ┌─────────────────┐              ┌────────────────┐
        │    Supabase     │              │   Gemini API   │
        │ PostgreSQL/RLS  │              │  Server-side   │
        └────────┬────────┘              └────────────────┘
                 │
                 ▼
        ┌─────────────────────┐
        │ Domain Logic        │
        │ • Eligibility       │
        │ • Fraud Detection   │
        │ • Loan Calculations │
        │ • Learning          │
        └─────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer           | Technology           |
| --------------- | -------------------- |
| Framework       | Next.js              |
| Frontend        | React                |
| Language        | TypeScript           |
| Styling         | Tailwind CSS         |
| Backend         | Next.js API Routes   |
| Database        | Supabase PostgreSQL  |
| Authentication  | Supabase Auth        |
| Storage         | Supabase Storage     |
| AI              | Gemini API           |
| OCR             | OCR integration      |
| Speech          | Web Speech API       |
| Testing         | Automated test suite |
| Version Control | Git + GitHub         |
| Deployment      | Vercel               |

---

## 🔐 Security

Security was treated as a core part of the project rather than a final add-on.

GramFinance includes:

* Supabase Row Level Security
* Server-side API validation
* Protected database operations
* Server-side AI credentials
* Input validation
* Security-focused API handling
* Rate limiting where applicable
* Controlled error handling
* Sensitive-data protection
* Production security hardening

The application is designed not to request or store:

* Bank passwords
* UPI PINs
* OTPs
* Full card numbers
* Transaction credentials

Users should also avoid submitting sensitive personal or financial information when checking suspicious messages.

---

## 🔒 Privacy Principles

GramFinance follows a **privacy-by-design** approach.

The deployed platform does not require traditional account signup or phone verification for normal use. Loan calculations run on the user's device, and the project is designed without building a commercial user profile.

The platform is explicitly positioned as:

> **Free • Non-commercial • No Brokerage • No Commercial Referrals**

---

## 🧪 Verification

The project has gone through extensive automated testing and production-readiness checks covering:

* Unit tests
* Integration tests
* API tests
* UI tests
* Eligibility logic
* Fraud detection
* Localization
* Database integration
* Supabase RLS
* Input validation
* Security hardening
* Production builds
* Type checking
* Linting

The project was developed with a strong emphasis on deterministic and explainable business logic.

---

## 📊 Design Principles

### 1. Explainable by Default

GramFinance should explain **why** a result was produced.

Eligibility checks expose conditions and missing information rather than relying on opaque scoring.

### 2. Assistant, Not Authority

GramFinance provides information and decision support. It does not replace banks, government departments, financial professionals, or official scheme authorities.

### 3. Verified Sources

Government scheme information is tied to official sources and verification dates wherever applicable.

### 4. No Commercial Incentive

GramFinance is not a lender, loan marketplace, lead generator, or lending affiliate.

### 5. Privacy First

The platform avoids collecting unnecessary financial credentials and does not require users to provide sensitive banking information.

---

## 🚀 Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/vidhwan06/GramFinance.git
cd GramFinance
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file with the required Supabase and server-side AI configuration.

Keep private credentials server-side and never expose them through public client-side environment variables.

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

### 6. Type-check

```bash
npx tsc --noEmit
```

### 7. Lint

```bash
npm run lint
```

### 8. Production build

```bash
npm run build
```

---

## 🌍 Live Deployment

GramFinance is deployed using Vercel.

**Live application:**

https://gram-finance.vercel.app/

The deployed application provides the complete public-facing GramFinance experience, including scheme discovery, fraud checking, loan calculations, learning, AI assistance and feedback.

---

## 📌 What GramFinance Does Not Do

GramFinance does **not**:

* Approve or reject loans
* Provide personalized investment advice
* Access users' bank accounts
* Initiate financial transactions
* Request OTPs, UPI PINs or banking passwords
* Guarantee that a message is fraudulent
* Replace official government eligibility decisions
* Replace professional financial advice

For government schemes, users should always verify the final eligibility requirements and application process through the relevant official source.

---

## 👥 Development

GramFinance was developed collaboratively using:

* Git
* GitHub
* Next.js
* TypeScript
* Supabase
* Vercel
* Automated testing
* AI-assisted development workflows

The project evolved from an initial financial-literacy concept into a complete platform combining **financial education, explainable decision support, fraud awareness and government-resource discovery**.

---

## 📄 Project Documentation

The project covers:

* Product requirements
* System architecture
* Database design
* Eligibility-engine design
* Fraud-analysis architecture
* Security model
* Privacy principles
* Localization
* Testing
* Deployment
* Impact goals

---

## 📜 License

This project is currently developed as an academic/community project.

License information can be added when the project's final licensing model is decided.

---

## ⭐ Vision

**GramFinance aims to make financial information simpler, safer and more accessible.**

The goal is not simply to give users an answer.

It is to help them:

**Understand → Verify → Decide Safely**

Whether someone is checking a government scheme, calculating the true cost of a loan, learning a financial concept, or inspecting a suspicious message, GramFinance is designed to provide clear information, transparent reasoning and practical next steps.

