#!/bin/bash
#######################################################
# MedSense Complete Deployment Script - Part 3
# Nginx Configuration
#######################################################

set -e

echo "============================================"
echo "MedSense Deployment - Nginx Setup"
echo "============================================"

# Create Nginx configuration
echo "[1/3] Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/medsense << 'EOF'
# Backend API
server {
    listen 80;
    server_name _;  # Replace with your domain: api.yourdomain.com

    # Increase upload size for video files
    client_max_body_size 100M;

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }

    # API endpoints
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts for AI/ML processing
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Serve uploaded files (videos, reports)
    location /uploads {
        alias /var/www/medsense-uploads;
        autoindex off;
        
        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
    }

    # Serve frontend (optional - if hosting on same VM)
    location / {
        root /var/www/medsense-frontend;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Enable the site
echo "[2/3] Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/medsense /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "[3/3] Testing Nginx configuration..."
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "✓ Nginx configuration complete!"
echo ""
echo "Backend API will be available at: http://YOUR_VM_IP/api"
echo "Frontend will be available at: http://YOUR_VM_IP"
echo ""
echo "Next: Run deploy_frontend.sh"
