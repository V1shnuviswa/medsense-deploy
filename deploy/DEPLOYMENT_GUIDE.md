# MedSense GCP Deployment Guide - Complete Instructions

## Prerequisites Checklist

- [x] GCP e2-medium VM instance created
- [ ] Cloud SQL PostgreSQL instance created
- [ ] SSH access to VM
- [ ] Git repository URL (or code ready to upload)

---

## Step-by-Step Deployment

### Step 1: Set Up Cloud SQL PostgreSQL

**Option A: Using GCP Console**
1. Go to SQL → Create Instance → PostgreSQL
2. Instance ID: `medsense-db`
3. Password: Set a strong password
4. Region: Same as your VM (check VM region)
5. Machine type: `db-f1-micro` or `db-g1-small`
6. Storage: 10GB SSD
7. **Important**: Enable "Private IP" if in same VPC

**Option B: Using gcloud CLI**
```bash
gcloud sql instances create medsense-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_SECURE_PASSWORD
  
# Create database
gcloud sql databases create medsense_db --instance=medsense-db

# Get connection name
gcloud sql instances describe medsense-db --format='get(connectionName)'
```

---

### Step 2: Connect to Your VM

```bash
# SSH into your VM
gcloud compute ssh YOUR_VM_NAME --zone=YOUR_ZONE

# OR use the GCP Console SSH button
```

---

### Step 3: Upload Code to VM

**Option A: From Git Repository**
```bash
# On your VM
cd /tmp
git clone https://github.com/YOUR_USERNAME/medsense.git
sudo mv medsense /opt/
```

**Option B: Upload from Local Machine**
```bash
# On your LOCAL machine (Windows PowerShell)
# First, create a zip of your code
cd C:\Users\vishn\Downloads\medsense_final-main\medsense_final-main
tar -czf medsense.tar.gz *

# Upload to VM
gcloud compute scp medsense.tar.gz YOUR_VM_NAME:~ --zone=YOUR_ZONE

# Then on VM, extract
ssh YOUR_VM_NAME
mkdir -p /opt/medsense
tar -xzf medsense.tar.gz -C /opt/medsense
```

---

### Step 4: Run Deployment Scripts

**On your VM, execute in order:**

```bash
# 1. System setup
cd /opt/medsense/deploy
chmod +x *.sh
./1_setup_vm.sh

# 2. Deploy backend
./2_deploy_backend.sh

# IMPORTANT: Edit the .env file first!
sudo nano /opt/medsense/backend/.env
# Update:
#   - DB_PASSWORD (from Cloud SQL)
#   - DB_HOST (Cloud SQL IP or 'localhost' if using proxy)

# 3. Set up Cloud SQL Proxy (to connect securely)
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy
sudo mv cloud_sql_proxy /usr/local/bin/

# Start proxy (replace CONNECTION_NAME)
nohup /usr/local/bin/cloud_sql_proxy -instances=PROJECT:REGION:medsense-db=tcp:5432 &

# 4. Configure Nginx
./3_deploy_nginx.sh

# 5. Start backend service
sudo systemctl start medsense-backend
sudo systemctl enable medsense-backend
sudo systemctl status medsense-backend

# 6. Deploy frontend
# First, get your VM's external IP
EXTERNAL_IP=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google")
echo "Your VM IP: $EXTERNAL_IP"

# Update frontend API URL
cd /opt/medsense
echo "REACT_APP_API_URL=http://$EXTERNAL_IP/api" > .env.production

# Build and deploy frontend
./deploy/4_deploy_frontend.sh
```

---

### Step 5: Configure Firewall Rules

```bash
# Allow HTTP traffic (port 80)
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --source-ranges 0.0.0.0/0 \
  --target-tags=http-server

# Allow HTTPS traffic (port 443) - for later
gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --target-tags=https-server

# Apply tags to your VM
gcloud compute instances add-tags YOUR_VM_NAME \
  --tags=http-server,https-server \
  --zone=YOUR_ZONE
```

---

### Step 6: Verify Deployment

```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Check Nginx
sudo systemctl status nginx

# Check backend service
sudo systemctl status medsense-backend

# View logs
sudo journalctl -u medsense-backend -f
```

**Test in browser:**
1. Get external IP: `gcloud compute instances describe YOUR_VM_NAME --format='get(networkInterfaces[0].accessConfigs[0].natIP)'`
2. Visit: `http://YOUR_EXTERNAL_IP`
3. Try login/register

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
sudo journalctl -u medsense-backend -n 50

# Check if port 5000 is in use
sudo netstat -tlnp | grep 5000

# Restart service
sudo systemctl restart medsense-backend
```

### Can't connect to database
```bash
# Check Cloud SQL Proxy
ps aux | grep cloud_sql_proxy

# Test connection
psql -h localhost -U postgres -d medsense_db

# Restart proxy
pkill cloud_sql_proxy
nohup /usr/local/bin/cloud_sql_proxy -instances=PROJECT:REGION:medsense-db=tcp:5432 &
```

### Frontend shows errors
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if files exist
ls -la /var/www/medsense-frontend/

# Rebuild frontend
cd /opt/medsense
npm run build
sudo cp -r dist/* /var/www/medsense-frontend/
```

---

## Post-Deployment Tasks

### 1. Set Up SSL Certificate (HTTPS)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
sudo certbot renew --dry-run
```

### 2. Set Up Cloud Storage for Videos

```bash
# Create bucket
gsutil mb -l us-central1 gs://medsense-uploads-RANDOM123

# Set up CORS
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://medsense-uploads-RANDOM123

# Update backend to use Cloud Storage
# In backend/app.py, change UPLOAD_FOLDER to use google-cloud-storage
```

### 3. Set Up Monitoring

```bash
# Install Cloud Monitoring agent
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install
```

### 4. Enable Auto-Backup

```bash
# Cloud SQL automatic backups
gcloud sql instances patch medsense-db --backup-start-time=03:00

# Create snapshot schedule for VM
gcloud compute resource-policies create snapshot-schedule daily-backup \
  --region us-central1 \
  --start-time 04:00 \
  --daily-schedule
```

---

## Deployment Checklist

- [ ] Cloud SQL PostgreSQL created
- [ ] VM has required firewall rules
- [ ] Code uploaded to `/opt/medsense` 
- [ ] System dependencies installed
- [ ] Backend `.env` file configured
- [ ] Cloud SQL Proxy running
- [ ] Backend service started and enabled
- [ ] Nginx configured and running
- [ ] Frontend built and deployed
- [ ] Application accessible via browser
- [ ] SSL certificate installed (optional)
- [ ] Monitoring enabled

---

## Maintenance Commands

```bash
# Update code
cd /opt/medsense
git pull origin main

# Restart backend
sudo systemctl restart medsense-backend

# Rebuild frontend
npm run build
sudo cp -r dist/* /var/www/medsense-frontend/

# View logs
sudo journalctl -u medsense-backend -f
sudo tail -f /var/log/nginx/access.log

# Database backup
pg_dump -h localhost -U postgres medsense_db > backup_$(date +%Y%m%d).sql
```

---

## Cost Optimization Tips

1. **Use Preemptible VM** (70% cheaper but can be terminated)
2. **Schedule VM shutdown** during non-business hours
3. **Use Cloud Storage** instead of disk for large files
4. **Set up auto-scaling** only when needed
5. **Monitor usage** with GCP cost reports

---

**Need help? Check logs and error messages, or refer to troubleshooting section above!**
