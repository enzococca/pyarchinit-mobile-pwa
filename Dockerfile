# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Initialize auth tables and start server (stay in /app, not /app/backend)
CMD cd backend && python init_auth_tables.py && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
