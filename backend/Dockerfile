FROM python:3.11-slim

WORKDIR /app

# Installa dipendenze sistema per image processing
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    g++ \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements e installa dipendenze Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia applicazione
COPY . .

# Crea directory media
RUN mkdir -p /app/media/{original,thumb,resize}

# Esponi porta
EXPOSE 8000

# Comando default
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
