# MedSense - Docker Deployment Guide

## 🚀 Quick Start Deployment

### Prerequisites
- GCP VM with Docker and Docker Compose installed
- Cloud SQL PostgreSQL instance created
- GitHub repository set up

---

## Step-by-Step Deployment

### 1️⃣ Prepare Cloud SQL PostgreSQL

```bash
# Create Cloud SQL instance (if not already created)
gcloud sql instances create medsense-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_SECURE_PASSWORD

# Create database
gcloud sql databases create medsense_db --instance=medsense-db

# Get connection details
gcloud sql instances describe medsense-db
```

**Note the connection IP** - you'll need this for `.env` file.

---

### 2️⃣ Push Code to GitHub

On your local machine:

```bash
cd C:\Users\vishn\Downloads\medsense_final-main\medsense_final-main

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial deployment-ready version"

# Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR_USERNAME/medsense.git

# Push to GitHub
git push -u origin main
```

---

### 3️⃣ Setup GCP VM

**Create VM:**
```bash
gcloud compute instances create medsense-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --boot-disk-size=30GB \
  --tags=http-server,https-server
```

**Configure Firewall:**
```bash
# Allow HTTP
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --target-tags=http-server

# Allow Flask backend (if needed for debugging)
gcloud compute firewall-rules create allow-backend \
  --allow tcp:5001 \
  --target-tags=http-server
```

---

### 4️⃣ SSH into VM and Install Docker

```bash
# SSH into VM
gcloud compute ssh medsense-vm --zone=us-central1-a
```

**On the VM, install Docker:**

```bash
# Update packages
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Log out and back in for group changes to take effect
exit
gcloud compute ssh medsense-vm --zone=us-central1-a
```

---

### 5️⃣ Clone Repository on VM

```bash
# Clone your GitHub repository
git clone https://github.com/YOUR_USERNAME/medsense.git
cd medsense
```

---

### 6️⃣ Configure Environment Variables

```bash
# Copy the example env file
cp .env.docker.example .env.docker

# Edit with your actual values
nano .env.docker
```

**Update these values:**
```bash
DB_HOST=YOUR_CLOUD_SQL_IP
DB_PASSWORD=YOUR_ACTUAL_PASSWORD
SECRET_KEY=YOUR_RANDOM_SECRET_KEY
JWT_SECRET_KEY=YOUR_RANDOM_JWT_SECRET
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

**Generate random secrets:**
```bash
# Generate random secret keys
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

### 7️⃣ Deploy with Docker Compose

```bash
# Load environment variables
export $(cat .env.docker | xargs)

# Build and start containers
docker-compose up -d --build

# This will:
# 1. Build backend Docker image
# 2. Build frontend Docker image
# 3. Start both containers
# 4. Set up networking between them
```

**Monitor the deployment:**
```bash
# View logs
docker-compose logs -f

# Check container status
docker-compose ps

# Health check
curl http://localhost/health
curl http://localhost:5001/api/auth/login
```

---

### 8️⃣ Verify Deployment

**Get your VM's external IP:**
```bash
EXTERNAL_IP=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google")
echo "Your application is available at: http://$EXTERNAL_IP"
```

**Test the application:**
1. Visit `http://YOUR_VM_IP` in your browser
2. Try registering a new user
3. Test login
4. Upload a medical report

---

## 🔄 Update / Redeploy

When you make changes:

```bash
# On your local machine - commit and push
git add .
git commit -m "Updated features"
git push

# On the VM - pull and redeploy
cd medsense
git pull
docker-compose down
docker-compose up -d --build
```

---

## 🔧 Common Commands

```bash
# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Access backend container shell
docker exec -it medsense-backend bash

# Access frontend container shell
docker exec -it medsense-frontend sh
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Wrong database credentials
# - Can't connect to Cloud SQL
# - Missing environment variables

# Fix and restart
docker-compose restart backend
```

### Frontend won't build
```bash
# Check logs
docker-compose logs frontend

# Rebuild with no cache
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Database connection issues
```bash
# Test connection from VM
nc -zv YOUR_CLOUD_SQL_IP 5432

# Make sure Cloud SQL allows connections from your VM IP
# In GCP Console: SQL > Connections > Add Network
```

### YOLO model missing
```bash
# Download manually
docker exec -it medsense-backend bash
cd /app
python download_yolo_model.py
exit
docker-compose restart backend
```

---

## 📊 Monitoring

```bash
# Resource usage
docker stats

# Disk usage
docker system df

# Container health
docker-compose ps
```

---

## 🔒 Security Hardening (Production)

1. **Set up SSL/HTTPS:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate (requires domain name)
sudo certbot --nginx -d yourdomain.com
```

2. **Use Docker secrets** instead of environment variables
3. **Set up automatic backups** for ChromaDB and uploads
4. **Configure Cloud SQL private IP**
5. **Add rate limiting** to Nginx

---

## ✅ Deployment Checklist

- [ ] Cloud SQL PostgreSQL created and accessible
- [ ] Code pushed to GitHub
- [ ] VM created with Docker installed
- [ ] Firewall rules configured
- [ ] .env.docker file configured with real values
- [ ] docker-compose up successful
- [ ] Application accessible via browser
- [ ] User registration working
- [ ] File uploads working
- [ ] YOLO model loaded (check fall detection)
- [ ] ChromaDB creating collections (check medical reports)

---

## 🆘 Need Help?

**Check application health:**
```bash
# Frontend
curl http://localhost/health

# Backend
curl http://localhost:5001/api/auth/login

# Containers running
docker-compose ps

# Recent errors
docker-compose logs --tail=50
```

---

Your deployment is now complete! 🎉
