# ComplianceAI — Deployment Security Audit

**Audit Date:** 2026-06-17  
**Audited Files:** `backend/main.py`, `policy_agent.py`, `risk_agent.py`, `orchestrator.py`, `escalation_agent.py`, `retrieval_agent.py`, `frontend/app/login/page.tsx`, `frontend/app/page.tsx`, `test_demo.py`, `test_gemini.py`, `.gitignore`, `docker-compose.yml`

---

## Critical Issues

> [!CAUTION]
> These **must be fixed** before going to production. They represent active security vulnerabilities.

### C1 — Demo Credentials Exposed in the Login UI
**File:** [`frontend/app/login/page.tsx:L134–139`](file:///d:/Projects/ComplianceSystem/frontend/app/login/page.tsx)  
**Finding:** A visible "Demo Credentials" box displays `employee@corp.com / employee123` and `admin@corp.com / admin123` directly on the public login page.  
**Risk:** Any visitor to the application can log in as admin.  
**Fix:** Remove the entire demo credentials `<div>` block before deploying.

---

### C2 — Plaintext Passwords Hardcoded in Source Code
**File:** [`backend/main.py:L61,L69`](file:///d:/Projects/ComplianceSystem/backend/main.py)  
**Finding:** User passwords are baked into source code as literals:
```python
"hashed_password": hash_password("employee123"),
"hashed_password": hash_password("admin123"),
```
Even though they are hashed at runtime, the plaintext originals are visible in the repo history forever.  
**Risk:** Anyone with repo access knows the passwords. Git history cannot be easily purged.  
**Fix:** Move credentials to environment variables (`ADMIN_PASSWORD`, `EMPLOYEE_PASSWORD`) and read them at startup. Alternatively, load an external user config file that is gitignored.

---

### C3 — CORS Wildcard in Production
**File:** [`backend/main.py:L215`](file:///d:/Projects/ComplianceSystem/backend/main.py)  
**Finding:**
```python
allow_origins=["*"]
```
**Risk:** Any website in the world can make authenticated API requests to the backend, enabling cross-origin attacks.  
**Fix:** Set `allow_origins` to your specific frontend domain:
```python
allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")]
```

---

### C4 — JWT Secret Has a Weak Fallback Default
**File:** [`backend/main.py:L27`](file:///d:/Projects/ComplianceSystem/backend/main.py)  
**Finding:**
```python
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-super-secret-key-change-in-production")
```
If `JWT_SECRET_KEY` is not set, the application silently uses a known public string to sign tokens.  
**Risk:** Anyone can forge valid JWT tokens using this fallback value and gain authenticated access.  
**Fix:** Raise a startup error if the variable is missing:
```python
SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable is not set.")
```

---

## High Issues

> [!WARNING]
> These should be resolved before deployment — they create significant operational or security risk.

### H1 — Test Files With Hardcoded Credentials Deployed
**Files:** [`test_demo.py:L10–11`](file:///d:/Projects/ComplianceSystem/test_demo.py), [`test_gemini.py`](file:///d:/Projects/ComplianceSystem/test_gemini.py)  
**Finding:**
```python
EMAIL = "employee@corp.com"
PASSWORD = "employee123"
```
Test files containing plaintext credentials are present in the repository root and will be included in the Docker image.  
**Fix:** Add to `.gitignore` and the Docker build's `.dockerignore`:
```
test_demo.py
test_gemini.py
```

---

### H2 — Employee Queries Logged to stdout (PII Exposure)
**Files:** [`orchestrator.py:L14`](file:///d:/Projects/ComplianceSystem/orchestrator.py), [`escalation_agent.py:L87,L116`](file:///d:/Projects/ComplianceSystem/escalation_agent.py)  
**Finding:**
```python
print(f"\n🚀 Processing query: {query}")       # full query to stdout
print(f"📝 Logged query: {query[:50]}...")      # query snippet to stdout
print(f"🎫 Created ticket: {ticket_id} for query: {query[:50]}...")
```
Employee compliance queries may contain personally identifiable information (PII), sensitive business details, or confidential data. Printing these to stdout means they appear in container logs, which are often aggregated by cloud log services and stored unencrypted.  
**Fix:** Replace with structured Python `logging` at `DEBUG` level. Set log level to `WARNING` or `ERROR` in production.

---

### H3 — No File Size Limit on PDF Upload
**File:** [`backend/main.py:L300–328`](file:///d:/Projects/ComplianceSystem/backend/main.py)  
**Finding:** The `/upload-policy` endpoint accepts any file up to server memory limits. There is no size check.  
**Risk:** An admin could accidentally (or maliciously) upload a multi-gigabyte file, causing the server to run out of memory or disk space.  
**Fix:** Add a size guard at the start of the upload handler:
```python
MAX_PDF_SIZE_MB = 50
contents = await file.read()
if len(contents) > MAX_PDF_SIZE_MB * 1024 * 1024:
    raise HTTPException(status_code=413, detail=f"File exceeds {MAX_PDF_SIZE_MB}MB limit.")
```

---

## Medium Issues

> [!NOTE]
> Recommended improvements that reduce risk and improve maintainability.

### M1 — Policy PDF Files Not Gitignored
**File:** [`.gitignore:L78`](file:///d:/Projects/ComplianceSystem/.gitignore)  
**Finding:** The PDF ignore rule is commented out:
```
# data/policies/*.pdf
```
**Risk:** Confidential company policy documents could be accidentally committed to the repository.  
**Fix:** Uncomment the line:
```
data/policies/*.pdf
```

---

### M2 — Hardcoded In-Memory User Database
**File:** [`backend/main.py:L56–73`](file:///d:/Projects/ComplianceSystem/backend/main.py)  
**Finding:** `fake_users_db` is a Python dict in source code. Adding or changing users requires a code change and redeployment.  
**Risk:** Not scalable; credential changes are tied to deployments.  
**Fix (minimal):** Load user credentials from environment variables at startup. A full database-backed user store is a future enhancement.

---

### M3 — `GEMINI_API_KEY` Not Validated at Startup
**Files:** [`policy_agent.py:L15`](file:///d:/Projects/ComplianceSystem/policy_agent.py), [`risk_agent.py:L9`](file:///d:/Projects/ComplianceSystem/risk_agent.py)  
**Finding:** The API key is read but never validated before the server accepts traffic. A missing key causes a runtime error only when the first query is processed.  
**Fix:** Add a startup check in `backend/main.py` using FastAPI's `lifespan` event or a simple guard at import time.

---

### M4 — No `.dockerignore` File
**Finding:** Without a `.dockerignore`, `docker build` copies the entire project into the image context, including `venv/`, `node_modules/`, `.git/`, `test_demo.py`, `data/chroma_db/`, etc. This bloats the image and may include sensitive data.  
**Fix:** Create `.dockerignore` at the project root:
```
venv/
.git/
.env
*.pyc
__pycache__/
node_modules/
frontend/.next/
data/chroma_db/
test_demo.py
test_gemini.py
```

---

## Deployment Checklist

| # | Check | Status |
|---|---|---|
| ☐ | Remove demo credentials block from login UI (`login/page.tsx:L134–139`) | ❌ Needs fix |
| ☐ | Move hardcoded passwords out of `main.py` to env vars | ❌ Needs fix |
| ☐ | Set `allow_origins` to specific frontend domain | ❌ Needs fix |
| ☐ | Remove `JWT_SECRET_KEY` fallback default; raise error if unset | ❌ Needs fix |
| ☐ | Add `test_demo.py` and `test_gemini.py` to `.dockerignore` and remove from image | ❌ Needs fix |
| ☐ | Replace `print()` query logging with structured `logging` at DEBUG level | ❌ Needs fix |
| ☐ | Add file size limit to `/upload-policy` endpoint | ❌ Needs fix |
| ☐ | Uncomment `data/policies/*.pdf` in `.gitignore` | ❌ Needs fix |
| ☐ | Create `.dockerignore` at project root | ❌ Missing |
| ☐ | Set `GEMINI_API_KEY` in production environment | ⚠️ Verify |
| ☐ | Set `JWT_SECRET_KEY` to a secure 256-bit random value | ⚠️ Verify |
| ☐ | Set `NEXT_PUBLIC_API_URL` to production backend URL | ⚠️ Verify |
| ☐ | Place at least one policy PDF in `data/policies/` before launch | ⚠️ Verify |
| ☐ | Run `python verify_env.py` and confirm all checks pass | ⚠️ Verify |
| ☐ | Confirm `data/chroma_db/` and `data/compliance.db` are on a persistent volume | ✅ Done |
| ☐ | `.env` file is gitignored | ✅ Done |
| ☐ | Passwords are PBKDF2-hashed (not stored in plaintext) | ✅ Done |
| ☐ | JWT tokens expire after 60 minutes | ✅ Done |
| ☐ | Admin-only routes are protected by role check | ✅ Done |
| ☐ | File upload restricted to `.pdf` extension | ✅ Done |

---

## Summary

| Severity | Count | Status |
|---|---|---|
| 🔴 Critical | 4 | Must fix before deployment |
| 🟠 High | 3 | Should fix before deployment |
| 🟡 Medium | 4 | Recommended before or shortly after launch |
| ✅ Passing | 6 | No action needed |

**The application should not go to production until at minimum the 4 Critical issues are resolved.**
