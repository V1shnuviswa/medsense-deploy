#!/bin/bash

# Quick Start Script for Symptom Checker Backend
# This script starts the FastAPI symptom checker backend

echo "🏥 Starting Symptom Checker Backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$(dirname "$0")/SymptomChecker-main" || exit 1

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    exit 1
fi

# Check if requirements are installed
echo "📦 Checking dependencies..."
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install requirements if needed
pip install -r requirements.txt --quiet

echo "✅ Dependencies ready"
echo "🚀 Starting FastAPI server on http://localhost:8000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
python main.py
