# MedSense - AI-Powered Healthcare Platform

A comprehensive healthcare platform with AI-powered medical report analysis, symptom checking, and patient management.

## 🚀 Features

- **Medical Report Analysis**: Upload and analyze medical reports using AI
- **Symptom Checker**: AI-powered symptom analysis and recommendations
- **Fall Detection**: Real-time fall detection using YOLO
- **Mental Wellness**: Mood tracking and CBT resources
- **Doctor Notes**: AI-assisted clinical documentation
- **Health Vault**: Secure storage for medical records
- **Video Consultations**: Upload and manage consultation videos
- **Clinical Evidence Search**: Search medical literature and guidelines

## 🛠️ Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS
- Lucide React (icons)

**Backend:**
- Python 3.11
- Flask + Flask-CORS
- PostgreSQL (Cloud SQL)
- ChromaDB (vector database)
- LangChain (AI orchestration)
- Ultralytics YOLOv8 (fall detection)

## 📦 Deployment

### Docker Deployment (Recommended)

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for complete deployment instructions.

**Quick Start:**

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/medsense.git
cd medsense

# Create environment file
cp .env.docker.example .env.docker
# Edit .env.docker with your credentials

# Deploy with Docker Compose
docker-compose up -d --build
```

### Manual Deployment

See [deploy/DEPLOYMENT_GUIDE.md](./deploy/DEPLOYMENT_GUIDE.md) for manual deployment instructions.

## 🔧 Local Development

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**Frontend:**

```bash
npm install
npm run dev
```

## 📝 Environment Variables

Copy `.env.example` to `.env` and configure:

- `DB_HOST` - PostgreSQL host
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `CHROMA_DB_PATH` - Path for ChromaDB storage

See `.env.example` for all available options.

## 🏥 Key Components

### Medical Report Analysis
- Upload PDF medical reports
- AI-powered analysis with biomarker extraction
- Interactive chat about your reports
- Comprehensive health recommendations

### Symptom Checker
- Conversational AI symptom analysis
- Evidence-based recommendations
- Severity assessment
- Next steps guidance

### Fall Detection
- Real-time video analysis using YOLOv8
- Fall event detection and alerts
- Camera management
- Historical event tracking

## 🔐 Security

- JWT-based authentication
- Password hashing with Werkzeug
- SQL injection protection with SQLAlchemy ORM
- CORS configuration
- Secure file upload handling

## 📊 Database Schema

PostgreSQL database with tables for:
- Users and authentication
- Medical reports and analyses
- Symptom checks
- Health records
- Fall detection events
- Video consultations
- Doctor notes

## 🤝 Contributing

This is a production healthcare application. For contributions or issues, please contact the maintainers.

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For deployment issues, see:
- [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) - Docker deployment guide
- [deploy/DEPLOYMENT_GUIDE.md](./deploy/DEPLOYMENT_GUIDE.md) - Manual deployment guide

## 🏗️ Architecture

```
Frontend (React/Vite) → Nginx (Port 80)
                          ↓
Backend (Flask) ← → PostgreSQL (Cloud SQL)
    ↓                    ↓
ChromaDB (RAG)      File Storage
    ↓
OpenAI/LLM APIs
```

## ⚙️ Requirements

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (for containerized deployment)
- 2GB+ RAM
- 10GB+ storage

---

**Built with ❤️ for better healthcare**
