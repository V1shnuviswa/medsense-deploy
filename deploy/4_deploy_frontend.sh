#!/bin/bash
#######################################################
# MedSense Complete Deployment Script - Part 4
# Frontend Deployment
#######################################################

set -e

echo "============================================"
echo "MedSense Deployment - Frontend Build & Deploy"
echo "============================================"

# Build frontend locally (on your development machine)
# OR build on server if you have enough RAM

cd /opt/medsense

# Create production environment file for frontend
echo "[1/4] Creating frontend environment..."
cat > .env.production << 'EOF'
REACT_APP_API_URL=http://YOUR_VM_IP/api
# Or use your domain: https://api.yourdomain.com
EOF

echo "⚠️  Update .env.production with your VM's external IP!"

# Install frontend dependencies
echo "[2/4] Installing frontend dependencies..."
cd /opt/medsense
npm install

# Build frontend for production
echo "[3/4] Building frontend (this may take a few minutes)..."
npm run build

# Deploy to web directory
echo "[4/4] Deploying frontend..."
sudo mkdir -p /var/www/medsense-frontend
sudo cp -r dist/* /var/www/medsense-frontend/
sudo chown -R www-data:www-data /var/www/medsense-frontend

echo "✓ Frontend deployment complete!"
echo ""
echo "Your application is now accessible at: http://YOUR_VM_IP"
echo ""
echo "Next steps:"
echo "1. Get your VM's external IP: gcloud compute instances describe YOUR_INSTANCE_NAME --format='get(networkInterfaces[0].accessConfigs[0].natIP)'"
echo "2. Visit http://YOUR_VM_IP in your browser"
echo "3. (Optional) Set up SSL certificate for HTTPS"
