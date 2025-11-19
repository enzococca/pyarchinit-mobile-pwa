# Installation Guide

This guide covers all methods for installing pyArchInit Mobile PWA.

## 📋 Prerequisites

Before installing, ensure you have:

### Required Software
- **Python 3.8 or higher** - [Download Python](https://www.python.org/downloads/)
- **Node.js 16 or higher** - [Download Node.js](https://nodejs.org/)
- **PostgreSQL 12+** (or SQLite for development) - [Download PostgreSQL](https://www.postgresql.org/download/)

### Required Accounts & API Keys
- **OpenAI API Key** - For audio transcription (Whisper)
  - Get it at: https://platform.openai.com/api-keys
- **Anthropic API Key** - For AI data extraction (Claude)
  - Get it at: https://console.anthropic.com/

## 🚀 Method 1: Automated Setup (Recommended)

The quickest way to get started:

```bash
# Clone the repository
git clone https://github.com/enzococca/pyarchinit-mobile-pwa.git
cd pyarchinit-mobile-pwa

# Run setup script
chmod +x setup.sh
./setup.sh
```

The setup script will:
1. ✅ Create Python virtual environment
2. ✅ Install backend dependencies
3. ✅ Install frontend dependencies
4. ✅ Create media directories
5. ✅ Guide you through .env configuration
6. ✅ Test database connection
7. ✅ Verify API keys

## 💻 Method 2: Manual Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/enzococca/pyarchinit-mobile-pwa.git
cd pyarchinit-mobile-pwa
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Configure API endpoint (optional, defaults to http://localhost:8000)
echo "VITE_API_URL=http://localhost:8000" > .env
```

### Step 4: Configure Environment Variables

Copy the example environment file:

```bash
cd ..
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Database Configuration
# Option 1: PostgreSQL (Production)
PYARCHINIT_DB_HOST=localhost
PYARCHINIT_DB_PORT=5432
PYARCHINIT_DB_NAME=pyarchinit_db
PYARCHINIT_DB_USER=postgres
PYARCHINIT_DB_PASSWORD=your_password

# Option 2: SQLite (Development)
USE_SQLITE=true
SQLITE_DB_PATH=./backend/pyarchinit_db.sqlite

# AI Services (Required)
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Media Storage
PYARCHINIT_MEDIA_ROOT=/path/to/media
PYARCHINIT_MEDIA_THUMB=/path/to/media/thumb
PYARCHINIT_MEDIA_RESIZE=/path/to/media/resize

# Security (Change in production!)
SECRET_KEY=your-secret-key-change-in-production
JWT_SECRET=your-jwt-secret-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=43200

# Multi-User Mode (optional)
DB_MODE=sqlite  # Options: sqlite, separate, hybrid
```

### Step 5: Create Media Directories

```bash
# Create media directories
mkdir -p /path/to/media/{original,thumb,resize}

# Set permissions (Linux/Mac)
chmod -R 755 /path/to/media
```

### Step 6: Initialize Database

#### For PostgreSQL:

```bash
# Create database
psql -U postgres -c "CREATE DATABASE pyarchinit_db;"

# Run migrations (if using multi-user mode)
psql -U postgres -d pyarchinit_db -f backend/migrations/001_create_auth_tables.sql

# For hybrid mode only:
psql -U postgres -d pyarchinit_db -f backend/migrations/002_enable_row_level_security.sql
```

#### For SQLite:

The database will be created automatically on first run.

## 🐳 Method 3: Docker Installation

### Prerequisites
- Docker 20.10 or higher
- Docker Compose 2.0 or higher

### Development with Docker

```bash
# Clone repository
git clone https://github.com/enzococca/pyarchinit-mobile-pwa.git
cd pyarchinit-mobile-pwa

# Copy environment file
cp .env.example .env

# Edit .env with your API keys
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **PostgreSQL**: localhost:5432

### Production with Docker

```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d --build
```

See [[Production Deployment]] for complete production setup instructions.

## ✅ Verify Installation

### Test Backend

```bash
cd backend
source venv/bin/activate  # Skip if using Docker
python main.py
```

Expected output:
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

Visit http://localhost:8000/docs to see the API documentation.

### Test Frontend

```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Visit http://localhost:5173 to see the PWA.

### Test API Connection

```bash
# Test health endpoint
curl http://localhost:8000/health

# Expected response:
{"status":"healthy","version":"1.0.0"}
```

### Test Database Connection

```bash
# Test sites endpoint
curl http://localhost:8000/api/sites

# Expected response (may be empty array if no data):
[]
```

## 🔧 Common Installation Issues

### Python Virtual Environment Issues

**Problem**: `python3: command not found`

**Solution**:
```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-venv python3-pip

# On macOS (with Homebrew)
brew install python3

# On Windows
# Download and install from https://www.python.org/downloads/
```

### Node.js Issues

**Problem**: `npm: command not found`

**Solution**:
```bash
# On Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# On macOS (with Homebrew)
brew install node

# On Windows
# Download and install from https://nodejs.org/
```

### PostgreSQL Connection Issues

**Problem**: `could not connect to server: Connection refused`

**Solution**:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Enable autostart
sudo systemctl enable postgresql
```

### Permission Denied on Media Directories

**Problem**: `PermissionError: [Errno 13] Permission denied`

**Solution**:
```bash
# Fix permissions
sudo chown -R $USER:$USER /path/to/media
chmod -R 755 /path/to/media
```

### Port Already in Use

**Problem**: `OSError: [Errno 98] Address already in use`

**Solution**:
```bash
# Find process using the port
sudo lsof -i :8000  # For backend
sudo lsof -i :5173  # For frontend

# Kill the process
kill -9 <PID>

# Or use different ports
# Backend:
python main.py --port 8001

# Frontend:
npm run dev -- --port 5174
```

## 📱 Mobile Device Testing

To test on physical mobile devices:

### Same Network Testing

```bash
# Find your computer's IP address
# On Linux/Mac:
ifconfig | grep "inet "
# On Windows:
ipconfig

# Start backend with external access
cd backend
python main.py --host 0.0.0.0

# Start frontend with external access
cd frontend
npm run dev -- --host

# Access from mobile device:
http://192.168.1.XXX:5173
```

### HTTPS Testing (Required for Camera/Microphone)

iOS requires HTTPS for camera and microphone access. Use ngrok for local testing:

```bash
# Install ngrok
# Download from: https://ngrok.com/download

# Start backend on localhost:8000
cd backend
python main.py

# In another terminal, create HTTPS tunnel
ngrok http 5173

# Use the HTTPS URL provided by ngrok on your mobile device
```

## 🔄 Updating Installation

To update to the latest version:

```bash
# Pull latest changes
git pull origin main

# Update backend dependencies
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Update frontend dependencies
cd ../frontend
npm install

# Restart services
```

## ⏭️ Next Steps

Now that you have pyArchInit Mobile PWA installed:

1. **[[Configuration]]** - Configure advanced settings
2. **[[Quick Start]]** - Learn basic usage in 5 minutes
3. **[[User Guide]]** - Explore all features in detail
4. **[[Multi-User Setup]]** - Set up multi-user databases (optional)

## 📞 Need Help?

- Check [[Troubleshooting]] for common issues
- Check [[FAQ]] for frequently asked questions
- Open an issue on [GitHub](https://github.com/enzococca/pyarchinit-mobile-pwa/issues)
