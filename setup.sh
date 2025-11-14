#!/bin/bash

# PyArchInit Mobile PWA - Automated Setup Script
# This script sets up the development environment for both frontend and backend

set -e  # Exit on error

echo "======================================="
echo "PyArchInit Mobile PWA - Setup"
echo "======================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env and add your API keys before continuing${NC}"
    echo ""
    read -p "Press Enter when you've configured .env, or Ctrl+C to exit..."
fi

# Backend setup
echo -e "${BLUE}=== Backend Setup ===${NC}"
cd backend

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Python 3 not found. Please install Python 3.8+${NC}"
    exit 1
fi

echo "Creating Python virtual environment..."
python3 -m venv venv

echo "Activating virtual environment..."
source venv/bin/activate || . venv/Scripts/activate 2>/dev/null

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo -e "${GREEN}✓ Backend setup complete${NC}"
echo ""

# Create media directories
echo "Creating media directories..."
mkdir -p /tmp/pyarchinit_media/{original,thumb,resize}
chmod 755 /tmp/pyarchinit_media
echo -e "${GREEN}✓ Media directories created${NC}"
echo ""

# Frontend setup
cd ..
echo -e "${BLUE}=== Frontend Setup ===${NC}"
cd frontend

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Please install Node.js 16+${NC}"
    exit 1
fi

echo "Installing Node.js dependencies..."
npm install

echo -e "${GREEN}✓ Frontend setup complete${NC}"
echo ""

# Back to root
cd ..

echo ""
echo -e "${GREEN}======================================="
echo "Setup Complete!"
echo "=======================================${NC}"
echo ""
echo "To start the development servers:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend"
echo "    source venv/bin/activate"
echo "    python main.py"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo "Then visit: http://localhost:5173"
echo ""
