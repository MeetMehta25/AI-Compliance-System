# ComplianceAI Deployment Guide

This guide describes how to deploy **ComplianceAI** in production using **Render** for the FastAPI backend and **Vercel** for the Next.js frontend, as well as how to run it locally.

---

## Production Architecture

- **Backend (FastAPI)**: Deployed as a Dockerized Web Service on **Render**. It mounts a **Persistent Disk** to store the SQLite database and ChromaDB vector embeddings so your indexed policy documents persist across restarts.
- **Frontend (Next.js)**: Deployed on **Vercel** for optimal speed, performance, and globally distributed edge serving.

---

## 1. Backend Deployment on Render

You can deploy the backend using the Render Blueprint configuration (`render.yaml`) or manually via the Render dashboard.

### Option A: Using Render Blueprints (Recommended)
Render Blueprints allow you to configure infrastructure as code.
1. Connect your repository to Render.
2. In the Render Dashboard, click **New** -> **Blueprint**.
3. Select this repository. Render will read the `render.yaml` file automatically.
4. Input the required environment variables when prompted:
   - `GEMINI_API_KEY`: Get a key from [Google AI Studio](https://aistudio.google.com/).
   - `JWT_SECRET_KEY`: Render will auto-generate a secure random hex key.
   - `ADMIN_PASSWORD`: A secure password for the Admin account (`admin@corp.com`).
   - `EMPLOYEE_PASSWORD`: A secure password for the Employee account (`employee@corp.com`).
   - `FRONTEND_URL`: Leave blank initially, and update once your Vercel frontend is deployed.
5. Click **Apply**. Render will automatically build the backend Docker container and mount a persistent 1GB disk at `/app/data`.

### Option B: Manual Web Service Setup
If you prefer to configure the service manually on the Render dashboard:
1. Click **New** -> **Web Service**.
2. Connect your Git repository.
3. Choose **Docker** as the Runtime (Render will automatically detect the root `Dockerfile`).
4. Select the **Starter** instance type or higher (necessary to attach persistent disks).
5. Add the following **Environment Variables**:
   - `GEMINI_API_KEY` (Your Google Gemini Key)
   - `JWT_SECRET_KEY` (Generate with `openssl rand -hex 32` or a password generator)
   - `ADMIN_PASSWORD` (Password for admin@corp.com)
   - `EMPLOYEE_PASSWORD` (Password for employee@corp.com)
   - `FRONTEND_URL` (URL of your Vercel frontend)
6. Under **Advanced Settings**, click **Add Disk**:
   - **Name**: `backend-data`
   - **Mount Path**: `/app/data`
   - **Size**: `1GB` (or more as needed)
7. Click **Create Web Service**.

---

## 2. Frontend Deployment on Vercel

Vercel provides native, zero-config support for Next.js applications.

1. Go to the [Vercel Dashboard](https://vercel.com/) and click **Add New** -> **Project**.
2. Import your Git repository.
3. In the **Configure Project** step:
   - **Framework Preset**: Next.js
   - **Root Directory**: Click *Edit* and select the `frontend` folder.
4. Expand **Environment Variables** and add:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: The URL of your deployed Render backend (e.g., `https://compliance-backend.onrender.com`).
     > [!IMPORTANT]
     > Do not include a trailing slash in the backend URL.
5. Click **Deploy**. Vercel will build the frontend and host it at a public `.vercel.app` domain.
6. Once the frontend deployment finishes, copy its URL, go back to your **Render Backend Settings**, and set the `FRONTEND_URL` environment variable to this frontend URL to restrict CORS access securely.

---

## 3. Local Development (Optional)

### Running with Docker Compose
To run both backend and frontend locally in isolated containers:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in `GEMINI_API_KEY` and define passwords in `.env`.
3. Put a test policy PDF document inside `data/policies/`.
4. Run the validator:
   ```bash
   python verify_env.py
   ```
5. Build and launch:
   ```bash
   docker compose up --build -d
   ```
6. Access the frontend at `http://localhost:3000` and backend at `http://localhost:8000`.

### Running Manually from Source
1. **Backend**:
   ```bash
   python -m venv venv
   # Activate virtualenv (Windows: venv\Scripts\activate | Unix: source venv/bin/activate)
   pip install -r backend/requirements.txt
   # Run retrieval agent to index policies
   python retrieval_agent.py
   # Start server
   uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   # Create frontend/.env.local with NEXT_PUBLIC_API_URL=http://localhost:8000
   npm run dev
   ```

---

## 4. Post-Deployment Verification

1. Log in to the frontend dashboard using `admin@corp.com` and the secure `ADMIN_PASSWORD` you set in the environment.
2. Go to the Admin Dashboard and verify you can upload a PDF policy.
3. Check the logs on the Render backend to confirm the background re-indexing task runs successfully.
4. Try typing a query into the employee workspace to verify AI responses, citations, and confidence scores are functioning correctly.
