# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for compilation (e.g., for sentence-transformers/chromadb if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt /app/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend code, orchestrator, and agents
COPY backend/ /app/backend/
COPY orchestrator.py policy_agent.py retrieval_agent.py risk_agent.py escalation_agent.py /app/

# Ensure directories for persistent volumes exist
RUN mkdir -p /app/data/policies /app/data/chroma_db

# Expose port
EXPOSE 8000

# CMD: First run the retrieval agent to build the initial pipeline if data is available, then start fastapi
CMD python -c "import os; from retrieval_agent import build_pipeline; os.makedirs('data/policies', exist_ok=True); build_pipeline() if os.listdir('data/policies') else print('No policies found yet. Skipping index build.')" && \
    uvicorn backend.main:app --host 0.0.0.0 --port 8000
