# backend/main.py

import sys
import os
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from jose import JWTError, jwt
import shutil

# Add parent directory to path so we can import the agents
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from orchestrator import process_query
from escalation_agent import get_all_tickets, get_audit_log
from retrieval_agent import build_pipeline, POLICIES_FOLDER

# ============================================================
# Configuration
# ============================================================

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ============================================================
# Secure password hashing (PBKDF2-SHA256 with random salt)
# ============================================================

def hash_password(password: str) -> str:
    """Secure hash using PBKDF2 with a dynamic salt."""
    salt = os.urandom(16)
    db_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"{salt.hex()}:{db_hash.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against PBKDF2 hash using salt from database."""
    try:
        salt_hex, hash_hex = hashed_password.split(":")
        salt = bytes.fromhex(salt_hex)
        db_hash = bytes.fromhex(hash_hex)
        new_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
        return new_hash == db_hash
    except Exception:
        return False

# ============================================================
# Hardcoded users (for demo)
# ============================================================

fake_users_db = {
    "employee@corp.com": {
        "username": "employee@corp.com",
        "full_name": "Employee User",
        "email": "employee@corp.com",
        "hashed_password": hash_password("employee123"),
        "role": "employee",
        "disabled": False,
    },
    "admin@corp.com": {
        "username": "admin@corp.com",
        "full_name": "Admin User",
        "email": "admin@corp.com",
        "hashed_password": hash_password("admin123"),
        "role": "admin",
        "disabled": False,
    },
}

# ============================================================
# Pydantic Models
# ============================================================

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

class QueryRequest(BaseModel):
    query: str

class Citation(BaseModel):
    filename: str
    section: str

class Decision(BaseModel):
    compliance_status: str
    risk_level: str
    reason: str

class TicketInfo(BaseModel):
    ticket_id: str
    status: str

class QueryResponse(BaseModel):
    query: str
    decision: Decision
    explanation: str
    citations: List[Citation]
    needs_escalation: bool
    ticket: Optional[TicketInfo] = None
    retrieved_chunks: Optional[List[Dict[str, Any]]] = None
    confidence: Optional[float] = None
    is_ambiguous: Optional[bool] = None

class Ticket(BaseModel):
    ticket_id: str
    timestamp: str
    query: str
    risk_level: str
    reason: str
    status: str

class AuditLogEntry(BaseModel):
    id: int
    timestamp: str
    query: str
    risk_level: str
    compliance_status: str
    explanation: str
    citations: str

# ============================================================
# Authentication utilities
# ============================================================

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    return None

def authenticate_user(db, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except JWTError:
        raise credentials_exception
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_admin_user(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ============================================================
# Initialize FastAPI app
# ============================================================

app = FastAPI(
    title="Compliance Assistant API",
    description="Multi-agent RAG system for enterprise policy compliance",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# API Endpoints
# ============================================================

@app.get("/")
def root():
    return {"message": "Compliance Assistant API is running", "status": "active"}

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login endpoint - returns JWT token on successful authentication.
    Use email as username and password.
    """
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@app.post("/query", response_model=QueryResponse)
def compliance_query(
    request: QueryRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Main endpoint: Send a natural language policy question.
    Requires authentication.
    """
    try:
        result = process_query(request.query)
        return result
    except Exception as e:
        err = str(e)
        if "429" in err:
            raise HTTPException(status_code=429, detail="The AI is rate-limited. Please wait a moment and try again.")
        raise HTTPException(status_code=500, detail="Something went wrong processing your query. Please try again.")

@app.get("/tickets", response_model=List[Ticket])
def list_tickets(
    current_user: User = Depends(get_admin_user)
):
    """Get all escalation tickets (admin only)."""
    tickets = get_all_tickets()
    return tickets

@app.get("/audit-log", response_model=List[AuditLogEntry])
def list_audit_log(
    limit: int = 100,
    current_user: User = Depends(get_admin_user)
):
    """Get recent audit log entries (admin only)."""
    logs = get_audit_log(limit=limit)
    return logs

@app.get("/policies")
def list_policies(
    current_user: User = Depends(get_admin_user)
):
    """List all uploaded policy PDFs (admin only)."""
    folder = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        POLICIES_FOLDER
    )
    if not os.path.isdir(folder):
        return []
    files = [
        f for f in os.listdir(folder) if f.lower().endswith(".pdf")
    ]
    return sorted(files)

@app.post("/upload-policy")
async def upload_policy(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_admin_user)
):
    """
    Upload a new PDF policy document (admin only).
    Saves the file to the policies folder and re-indexes in the background.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    folder = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        POLICIES_FOLDER
    )
    os.makedirs(folder, exist_ok=True)

    dest = os.path.join(folder, file.filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Re-index all policies in the background so the upload returns immediately
    background_tasks.add_task(build_pipeline)

    return {
        "message": f"'{file.filename}' uploaded successfully. Re-indexing started in background.",
        "filename": file.filename
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user info."""
    return current_user