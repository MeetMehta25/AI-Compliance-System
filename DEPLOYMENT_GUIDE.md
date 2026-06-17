# ComplianceAI Deployment Guide

This guide describes how to run and deploy **ComplianceAI** on local servers or cloud environments using **Docker Compose** or directly from source.

---

## Prerequisites

Before starting, make sure you have the following installed:
- **Git**
- **Docker** and **Docker Compose** (Recommended)
- **Python 3.11** (If running without Docker)
- **Node.js 20+** (If running without Docker)

---

## 1. Quick Start with Docker Compose (Recommended)

Docker Compose starts the backend server, builds/indexes your documents, and launches the frontend interface in isolated containers.

### Step A: Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```
Open the newly created `.env` file and replace the placeholder values:
- `GEMINI_API_KEY`: Get a free key from [Google AI Studio](https://aistudio.google.com/).
- `JWT_SECRET_KEY`: Set a secure random string (e.g., run `openssl rand -hex 32` to generate one).
- `NEXT_PUBLIC_API_URL`: Keep as `http://localhost:8000` unless you change the backend host port.

### Step B: Add Policy Documents
1. Place any policy PDF documents you want ComplianceAI to parse inside the folder:
   ```
   data/policies/
   ```
2. Run the validator tool to check your configurations:
   ```bash
   python verify_env.py
   ```

### Step C: Build and Run
Start the containers in detached (background) mode:
```bash
docker compose up --build -d
```

### Step D: Access the App
- **Web App**: Open [http://localhost:3000](http://localhost:3000) in your browser.
- **Backend API**: Check health at [http://localhost:8000/health](http://localhost:8000/health).
- **Interactive API Docs**: View Swagger docs at [http://localhost:8000/docs](http://localhost:8000/docs).

To stop the containers:
```bash
docker compose down
```

---

## 2. Running Manually from Source

If you prefer to run both applications directly on your host machine, follow these steps:

### Step A: Set Environment Variables
Set these variables in your shell environment, or place a `.env` file inside the root workspace and use a package like `python-dotenv`.

### Step B: Setup Backend
1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Place company policies in `data/policies/` (PDF files only).
4. Run the document pipeline indexing:
   ```bash
   python retrieval_agent.py
   ```
5. Start the FastAPI server:
   ```bash
   uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Step C: Setup Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Set your environment variables in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Build and start:
   ```bash
   npm run build
   npm run start
   ```
   *(For development mode, run `npm run dev` instead)*.

---

## 3. Production Readiness Checks

- **Persistent Vector Database**: The SQLite ChromaDB data is mounted on a named Docker volume (`backend-data`) so your search indexes persist across container restarts.
- **CORS Configuration**: If deploying the backend on a different domain than the frontend, update `allow_origins=["*"]` in `backend/main.py` to target your frontend URL specifically.
- **Background Re-indexing**: When admins upload new policy PDFs via the web interface, the pipeline automatically rebuilds the search database in the background without causing service interruptions.
