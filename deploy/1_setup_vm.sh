#!/bin/bash
#######################################################
# MedSense Complete Deployment Script - Part 1
# VM Setup and System Dependencies
#######################################################

set -e  # Exit on error

echo "============================================"
echo "MedSense Deployment - System Setup"
echo "============================================"

# Update system
echo "[1/6] Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install Python 3.11
echo "[2/6] Installing Python 3.11..."
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install system dependencies
echo "[3/6] Installing system dependencies..."
sudo apt install -y \
    nginx \
    git \
    curl \
    postgresql-client \
    libpq-dev \
    build-essential \
    libssl-dev \
    libffi-dev \
    ffmpeg \
    libsm6 \
    libxext6

# Install Node.js (for building frontend)
echo "[4/6] Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Create application directory
echo "[5/6] Creating application directories..."
sudo mkdir -p /opt/medsense
sudo chown -R $USER:$USER /opt/medsense

# Create uploads directory
sudo mkdir -p /var/www/medsense-uploads
sudo chown -R www-data:www-data /var/www/medsense-uploads

# Install pip
echo "[6/6] Upgrading pip..."
python3.11 -m pip install --upgrade pip

echo "✓ System setup complete!"
echo ""
echo "Next: Run deploy_backend.sh"
