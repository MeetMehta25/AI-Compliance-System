# ComplianceAI – Enterprise Policy Compliance Assistant

<div align="center">

![ComplianceAI Banner](https://img.shields.io/badge/ComplianceAI-v1.0.0-blue)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-teal)
![Next.js](https://img.shields.io/badge/Next.js-15+-black)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-38B2AC)
![License](https://img.shields.io/badge/License-MIT-yellow)

**An AI-powered multi-agent system that helps employees understand company policies, assess compliance risks, and escalate issues automatically.**

[🚀 Live Demo](#) • [📚 Documentation](#) • [🎥 Demo Video](#)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Why This Project?](#-why-this-project)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [API Endpoints](#-api-endpoints)
- [Frontend Application](#-frontend-application)
- [Demo Queries](#-demo-queries)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Future Enhancements](#-future-enhancements)
- [License](#-license)

---

## 🎯 Overview

**ComplianceAI** is an intelligent policy assistant that uses **Retrieval-Augmented Generation (RAG)** and a **multi-agent architecture** to help employees understand company policies, assess compliance risks, and automatically escalate high-risk situations.

### Who is this for?

- **New Employees** – Understand company policies quickly
- **HR & Compliance Teams** – Reduce repetitive queries
- **Employees** – Get instant, policy-backed answers
- **Managers** – Monitor compliance risks

### Key Capabilities

| Feature | Description |
|---------|-------------|
| 🔍 **Natural Language Queries** | Ask questions in plain English |
| 📄 **Policy Retrieval** | Finds relevant sections from policy documents |
| 🤖 **AI Interpretation** | Explains policies in simple language with citations |
| ⚠️ **Risk Assessment** | Classifies queries as Low/Medium/High risk |
| 🎫 **Auto-Escalation** | Creates tickets for high-risk cases |
| 📊 **Admin Dashboard** | View all tickets and audit logs |
| 🔐 **Role-Based Access** | Employee vs Admin views |

---

## ❓ Why This Project?

### The Problem

- Modern organizations have **dozens of policies** covering HR, security, data privacy, remote work, expenses, and more
- Employees struggle to find and interpret relevant policies
- HR and compliance teams spend **hours answering repetitive questions**
- Misinterpretation leads to **policy violations, security risks, and operational inefficiencies**

### The Solution

ComplianceAI automates policy interpretation and compliance decision-making through:
1. **Intelligent Retrieval** – Semantic search across policy documents
2. **Multi-Agent Architecture** – Specialized agents for retrieval, interpretation, risk assessment, and escalation
3. **Explainable AI** – Every decision includes citations to source policies
4. **Human-in-the-Loop** – High-risk cases automatically create tickets for compliance officers

---

## 🏗️ Architecture

### System Architecture Diagram
┌──────────────────────────────────────────────────────────────────────┐
│ EMPLOYEE │
│ (Natural Language Query) │
└─────────────────────────────┬────────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────────────────────┐
│ FRONTEND (Next.js) │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ Chat │ │ Login │ │Dashboard │ │ Audit │ │
│ │ Interface│ │ Page │ │ (Admin) │ │ Log │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────┬────────────────────────────────────────┘
│ HTTP / JWT Auth
▼
┌──────────────────────────────────────────────────────────────────────┐
│ BACKEND (FastAPI) │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ AGENT ORCHESTRATOR │ │
│ └──────────────┬───────────────────┬──────────────────────────┘ │
│ │ │ │
│ ┌──────────────▼──────┐ ┌─────────▼──────────┐ │
│ │ RETRIEVAL AGENT │ │ INTERPRETATION │ │
│ │ (ChromaDB + RAG) │──│ AGENT (Gemini) │ │
│ └─────────────────────┘ └────────────────────┘ │
│ │ │ │
│ ┌──────────────▼──────┐ ┌─────────▼──────────┐ │
│ │ RISK ASSESSMENT │ │ ESCALATION AGENT │ │
│ │ AGENT (Gemini) │──│ (SQLite Tickets) │ │
│ └─────────────────────┘ └────────────────────┘ │
│ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ SQLite Database │ │
│ │ ┌───────────┐ ┌─────────────┐ ┌────────────────────────┐ │ │
│ │ │audit_log │ │ tickets │ │ chroma_db (vectors) │ │ │
│ │ └───────────┘ └─────────────┘ └────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

text

### Agent Workflow

1. **User Query** → Frontend sends request with JWT token
2. **Retrieval Agent** – Searches ChromaDB for relevant policy chunks
3. **Interpretation Agent** – Gemini explains policies in plain English with citations
4. **Risk Assessment Agent** – Classifies risk (Low/Medium/High) and compliance status
5. **Escalation Agent** – Creates ticket if risk is High or query is ambiguous
6. **Audit Log** – Every query is logged for compliance
7. **Final Response** – Returns structured JSON to frontend

---

## 💻 Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Python 3.11+** | Core programming language |
| **FastAPI** | REST API framework with automatic docs |
| **ChromaDB** | Vector database for semantic search |
| **sentence-transformers** | Embedding model (all-MiniLM-L6-v2) |
| **Google Gemini 2.5 Flash** | LLM for policy interpretation & risk assessment |
| **PyMuPDF** | PDF text extraction |
| **LangChain** | Text chunking & utilities |
| **SQLite** | Local database for tickets & audit logs |
| **JWT (python-jose)** | Authentication tokens |
| **Uvicorn** | ASGI server |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 15+** | React framework with App Router |
| **TypeScript** | Type-safe JavaScript |
| **Tailwind CSS 4.0** | Styling & dark theme |
| **Lucide React** | Icons |
| **React Hooks** | State management |

### Deployment (Optional)
| Technology | Purpose |
|------------|---------|
| **Render.com** | Backend hosting (free tier) |
| **Vercel** | Frontend hosting (free tier) |

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication with access tokens
- Two demo users:
  - **Employee** (employee@corp.com / employee123) – Can query policies
  - **Admin** (admin@corp.com / admin123) – Can view dashboard, tickets, audit log
- Role-based access control (RBAC)

### 💬 Chat Interface
- Natural language query input
- Real-time responses with decision badges (Risk + Compliance Status)
- Policy citations with document name and section number
- Ticket creation alerts for escalated cases
- Suggested questions for quick access
- Dark theme (DeepSeek/ChatGPT style)

### 📊 Admin Dashboard
- Statistics cards: Total queries, Total tickets, Pending review, High-risk queries
- Tickets table: View all escalated cases with status
- Audit log: Complete history of all queries with risk levels

### 🔍 RAG Pipeline
- PDF text extraction using PyMuPDF
- Smart text chunking (500 chars with overlap)
- Sentence embeddings with `all-MiniLM-L6-v2`
- Semantic search using ChromaDB
- Citation extraction (section numbers)

### 🤖 Multi-Agent System
| Agent | Responsibility |
|-------|---------------|
| **Retrieval Agent** | Finds relevant policy chunks |
| **Interpretation Agent** | Explains policies with citations |
| **Risk Assessment Agent** | Classifies risk & compliance status |
| **Escalation Agent** | Creates tickets, logs to audit trail |
| **Orchestrator** | Chains all agents together |

### 📁 Policy Documents (10 Policies)
1. Data Protection Policy
2. Remote Work Policy
3. Expense Reimbursement Policy
4. Vendor Access Policy
5. Device Usage Policy
6. Compensation & Benefits
7. Code of Conduct
8. Work Rules & Attendance
9. Onboarding & IT
10. Office Facilities & Travel

---

## 📂 Project Structure
COMPLIANCESYSTEM/
│
├── backend/
│ ├── main.py # FastAPI app with auth
│ └── routes/ # (future route separation)
│
├── frontend/
│ ├── app/
│ │ ├── page.tsx # Chat interface
│ │ ├── login/page.tsx # Login page
│ │ ├── dashboard/page.tsx # Admin dashboard
│ │ ├── globals.css # Tailwind styles
│ │ └── layout.tsx # Root layout
│ ├── tailwind.config.ts # Tailwind config
│ └── package.json # Dependencies
│
├── data/
│ ├── policies/ # 10 policy PDFs
│ ├── chroma_db/ # ChromaDB vector store
│ └── compliance.db # SQLite database
│
├── agents/
│ ├── retrieval_agent.py # RAG pipeline
│ ├── policy_agent.py # Interpretation agent
│ ├── risk_agent.py # Risk assessment agent
│ ├── escalation_agent.py # Tickets & audit log
│ └── orchestrator.py # Agent orchestrator
│
├── test_demo.py # End-to-end test script
├── demo_script.md # Demo guide for interviewers
├── requirements.txt # Python dependencies
├── venv/ # Python virtual environment
└── README.md # This file

text

---

## 🔧 Installation & Setup

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- npm or yarn
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/compliance-ai.git
cd compliance-ai
2. Backend Setup
Create and activate a virtual environment:

bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
Install Python dependencies:

bash
pip install -r requirements.txt
Or install individually:

bash
pip install fastapi uvicorn chromadb sentence-transformers langchain pymupdf \
    google-generativeai python-jose[cryptography] passlib python-multipart \
    pydantic requests
Set up Google Gemini API key:

bash
# Windows
setx GEMINI_API_KEY "your-api-key-here"

# macOS/Linux
export GEMINI_API_KEY="your-api-key-here"
3. Frontend Setup
bash
cd frontend
npm install
Create .env.local file:

text
NEXT_PUBLIC_API_URL=http://localhost:8000
4. Initial Data Setup
Add your 10 policy PDFs to data/policies/. The system expects 1-2 page policies with clear section numbers.

Run the retrieval pipeline once:

bash
python retrieval_agent.py
This will:

Extract text from all PDFs

Split into chunks

Generate embeddings

Store in ChromaDB

🚀 Running the Application
Start Backend Server
bash
uvicorn backend.main:app --reload --port 8000
Server will be available at: http://localhost:8000

API Documentation: http://localhost:8000/docs

Start Frontend Server
bash
cd frontend
npm run dev
Frontend will be available at: http://localhost:3000

Run Test Script
bash
python test_demo.py
Full System Demo
Component	Terminal	Command
Backend	Terminal 1	uvicorn backend.main:app --reload --port 8000
Frontend	Terminal 2	cd frontend && npm run dev
Testing	Terminal 3	python test_demo.py
📡 API Endpoints
All endpoints require authentication via JWT token.

Method	Endpoint	Description	Auth Required
POST	/token	Login – returns JWT token	Public
POST	/query	Ask a policy question	Employee+
GET	/tickets	List all escalation tickets	Admin only
GET	/audit-log	View audit log entries	Admin only
GET	/health	Health check	Public
GET	/me	Get current user info	Employee+
Example: Login Request
bash
POST /token
Content-Type: application/x-www-form-urlencoded

username=employee@corp.com&password=employee123
Example: Login Response
json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "role": "employee"
}
Example: Query Request
bash
POST /query
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "Can I share customer data with a vendor without approval?"
}
Example: Query Response
json
{
  "query": "Can I share customer data with a vendor without approval?",
  "decision": {
    "compliance_status": "Not Recommended",
    "risk_level": "High",
    "reason": "Sharing customer data without approval violates policy."
  },
  "explanation": "No, you cannot share customer data without approval...",
  "citations": [
    {"filename": "Data_Protection_Policy.pdf", "section": "3.1"},
    {"filename": "Vendor_Access_Policy.pdf", "section": "4.2"}
  ],
  "needs_escalation": true,
  "ticket": {
    "ticket_id": "COMP-1004",
    "status": "Pending Review"
  }
}
🎨 Frontend Application
Pages
Page	Route	Description
Login	/login	Authentication page
Chat	/	Main policy query interface
Dashboard	/dashboard	Admin dashboard (admin only)
Features
Dark Theme – Full dark mode with custom styling (like DeepSeek/ChatGPT)

Responsive Design – Works on desktop and mobile

Real-time Updates – Instant responses with loading states

Decision Badges – Color-coded risk and compliance status

Citations Display – Shows source documents and sections

Ticket Alerts – Notification when a ticket is created

Suggested Questions – Quick access to common queries

User Roles
Role	Access
Employee	Ask questions, view responses
Admin	Dashboard, tickets, audit log
🧪 Demo Queries
Low Risk (Approved)
Query: "Can I work from another country for a week?"

Expected: Low Risk, Approved, No escalation

High Risk (Escalation)
Query: "Can I share customer data with a vendor without approval?"

Expected: High Risk, Not Recommended, Ticket created

Informational
Query: "What is my in-hand salary after deductions?"

Expected: Low Risk, Not Recommended (use HR portal), No escalation

Restricted (Medium Risk)
Query: "Is my lunch expense of $30 with a client reimbursable?"

Expected: Low Risk, Restricted, No escalation

Personal Device Usage
Query: "Can I use my personal laptop to check work emails?"

Expected: High Risk, Not Recommended, Ticket created

Incident
Query: "I lost my company laptop. What should I do?"

Expected: High Risk, Approved action, Ticket created

🧪 Testing
Run End-to-End Tests
bash
python test_demo.py
This script:

Logs in as employee

Runs 8-10 demo queries

Validates responses against expected values

Prints comparison (Expected vs Actual)

Waits between queries to avoid rate limits

Test Individual Endpoints
bash
# Health check
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:8000/token \
  -d "username=employee@corp.com&password=employee123" \
  -H "Content-Type: application/x-www-form-urlencoded"

# Query (replace token)
curl -X POST http://localhost:8000/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "Can I work remotely?"}'

  🔮 Future Enhancements
Feature	Description	Priority
Real User Database	Replace hardcoded users with PostgreSQL	High
Email Notifications	Alert admins when tickets created	High
Policy Versioning	Track policy updates	Medium
User Feedback	Collect feedback on responses	Medium
Analytics Dashboard	Detailed usage statistics	Medium
Export Reports	PDF/CSV export of tickets	Low
Slack Integration	Query via Slack bot	Low
Multi-Organization Support	Tenant isolation	Low
GDPR Compliant	Data privacy features	Low
📝 License
This project is licensed under the MIT License – see the LICENSE file for details.

🙏 Acknowledgments
Google Gemini API – Free LLM access for policy interpretation

ChromaDB – Open-source vector database

sentence-transformers – Free embedding models

FastAPI – Amazing Python API framework

Next.js – React framework with App Router

Tailwind CSS – Utility-first CSS framework