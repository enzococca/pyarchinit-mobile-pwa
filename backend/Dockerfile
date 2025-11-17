FROM python:3.11-slim

WORKDIR /app

# Force cache invalidation - Change this value to force rebuild
ARG CACHEBUST=2

# Installa dipendenze sistema per image processing
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    g++ \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements e installa dipendenze Python
# CRITICAL: Force complete reinstall to bypass Railway cache
COPY requirements.txt .
RUN pip install --no-cache-dir --force-reinstall --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --force-reinstall -r requirements.txt

# Copia applicazione
COPY . .

# Crea directory media
RUN mkdir -p /app/media/{original,thumb,resize}

# Esponi porta
EXPOSE 8000

# Comando default - Railway provides PORT env var
CMD ["sh", "-c", "cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
