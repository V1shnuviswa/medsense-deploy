# Advanced Medical Imaging API

A comprehensive FastAPI application for medical image analysis with AI-powered segmentation, classification, and advanced analytics capabilities.

## 🏗️ Architecture Overview

```
medical_imaging_api/
├── app/
│   ├── __init__.py                 # Package initialization
│   ├── main.py                     # FastAPI app entry point
│   ├── config.py                   # Configuration management
│   ├── routes/                     # API route definitions
│   │   ├── __init__.py
│   │   ├── imaging.py              # Imaging endpoints (DICOM, models, predictions)
│   │   └── analysis.py             # Analysis endpoints (statistics, reports)
│   ├── schemas/                    # Pydantic models for request/response
│   │   ├── __init__.py
│   │   ├── imaging.py              # Imaging-related schemas
│   │   └── analysis.py             # Analysis-related schemas
│   ├── services/                   # Business logic services
│   │   ├── __init__.py
│   │   ├── ai_service.py           # AI model management and inference
│   │   ├── dicom_service.py        # DICOM processing and conversion
│   │   └── file_utils.py           # File handling utilities
│   └── utils/                      # Utility functions
│       ├── __init__.py
│       ├── logger.py               # Logging configuration
│       └── gpu_utils.py            # GPU and system monitoring
├── tests/                          # Test suite
│   ├── __init__.py
│   ├── test_imaging.py             # Imaging functionality tests
│   └── test_analysis.py            # Analysis functionality tests
├── requirements.txt                # Python dependencies
└── README.md                       # This file
```

## 🚀 Features

### Core Capabilities
- **Multi-Modal AI Models**: Support for MRI, CT, X-ray, Ultrasound, Mammography, PET, and SPECT
- **DICOM Processing**: Complete DICOM to NIfTI conversion with metadata preservation
- **Advanced Segmentation**: U-Net, nnU-Net, V-Net, TransUNet, and other SOTA models
- **Real-time Inference**: GPU-accelerated predictions with intelligent caching
- **Batch Processing**: Concurrent processing of multiple images with progress tracking

### Analysis & Research Tools
- **Performance Analytics**: Model comparison and statistical analysis
- **Quality Assessment**: Automated image quality evaluation
- **Anomaly Detection**: Outlier identification in medical datasets
- **Predictive Analytics**: Machine learning for outcome prediction
- **Report Generation**: Automated analysis reports with visualizations

### Enterprise Features
- **Async Processing**: Background job management for long-running tasks
- **Resource Management**: Intelligent GPU memory management and optimization
- **Preprocessing Pipeline**: Comprehensive image enhancement and normalization
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Health Monitoring**: System resource and model performance tracking

## 🛠️ Installation

### Prerequisites
- Python 3.9+
- CUDA-compatible GPU (recommended)
- 16GB+ RAM (32GB+ recommended)
- 100GB+ free disk space

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd medical_imaging_api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables (optional)
export CUDA_VISIBLE_DEVICES=0
export LOG_LEVEL=INFO
export MAX_FILE_SIZE=536870912  # 512MB
```

### Environment Configuration
Create a `.env` file in the project root:

```env
# API Configuration
HOST=0.0.0.0
PORT=8000
RELOAD=false
LOG_LEVEL=INFO

# Model Configuration
MODEL_CACHE_SIZE=10
DEFAULT_CONFIDENCE_THRESHOLD=0.5
MAX_BATCH_SIZE=20
USE_GPU=true

# File Processing
TEMP_DIR=/tmp/medical_imaging
MAX_FILE_SIZE=536870912
DICOM_MAX_WORKERS=4

# Job Management
MAX_CONCURRENT_JOBS=5
JOB_RETENTION_DAYS=7

# Security (optional)
API_KEY_REQUIRED=false
RATE_LIMIT_ENABLED=false
RATE_LIMIT_PER_MINUTE=100
```

## 🚦 Quick Start

### 1. Start the API Server
```bash
# Development mode
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

### 2. Access API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health Check: http://localhost:8000/health

### 3. Basic Usage Examples

#### Upload and Analyze DICOM Files
```python
import requests

# Upload DICOM ZIP file
files = {'file': open('dicom_series.zip', 'rb')}
response = requests.post('http://localhost:8000/api/v1/dicom/analyze', files=files)
print(response.json())
```

#### Make Predictions
```python
import requests
import json

# Configure model
model_config = {
    "model_id": "chest_pathology",
    "modality": "X-ray",
    "confidence_threshold": 0.7,
    "preprocessing": {
        "normalize": True,
        "contrast_enhancement": True
    }
}

# Make prediction
files = {'file': open('chest_xray.jpg', 'rb')}
data = {'model_config': json.dumps(model_config)}
response = requests.post(
    'http://localhost:8000/api/v1/predict/single',
    files=files,
    data=data
)
print(response.json())
```

## 📚 API Documentation

### Core Endpoints

#### Model Management
- `GET /api/v1/models/` - List all available models
- `GET /api/v1/models/{modality}` - Get models for specific modality
- `POST /api/v1/models/{modality}/{model_id}/load` - Load model into memory
- `DELETE /api/v1/models/{modality}/{model_id}` - Unload model from memory
- `GET /api/v1/models/cache/stats` - Get cache statistics

#### DICOM Processing
- `POST /api/v1/dicom/analyze` - Analyze DICOM series
- `POST /api/v1/dicom/convert` - Convert DICOM to NIfTI

#### Predictions
- `POST /api/v1/predict/single` - Single image prediction
- `POST /api/v1/predict/batch` - Batch image processing
- `POST /api/v1/pipeline/end-to-end` - Complete DICOM-to-prediction pipeline

#### Analysis & Research
- `POST /api/v1/performance/compare-models` - Compare model performance
- `POST /api/v1/statistics/analyze` - Statistical analysis
- `POST /api/v1/quality/assess` - Image quality assessment
- `POST /api/v1/visualizations/generate` - Generate visualizations
- `POST /api/v1/reports/generate` - Generate analysis reports

### Request/Response Examples

#### Model Loading
```bash
curl -X POST "http://localhost:8000/api/v1/models/MRI/brain_tumor_unet/load"
```

#### DICOM Analysis
```bash
curl -X POST "http://localhost:8000/api/v1/dicom/analyze" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@dicom_series.zip"
```

#### Performance Comparison
```bash
curl -X POST "http://localhost:8000/api/v1/performance/compare-models" \
  -H "Content-Type: application/json" \
  -d '{
    "model_ids": ["chest_pathology", "pneumonia_detector"],
    "modality": "X-ray",
    "metrics": ["accuracy", "sensitivity", "specificity"]
  }'
```

## 🧠 Supported AI Models

### MRI Models
- **Brain Tumor U-Net**: Segmentation of brain tumors (BRATS challenge)
- **Cardiac Segmentation**: Left ventricle and myocardium analysis
- **MS Lesion Detector**: Multiple sclerosis lesion detection

### CT Models
- **Lung Nodule Detector**: Early-stage lung cancer screening
- **COVID-19 Classifier**: COVID-19 vs pneumonia vs normal classification
- **Liver Segmentation**: Automated liver volume measurement

### X-ray Models
- **Chest Pathology Detector**: 14 different chest pathologies (CheXpert)
- **Pneumonia Detector**: Binary pneumonia classification

## 🔧 Configuration Options

### Model Configuration
```python
{
    "model_id": "chest_pathology",
    "modality": "X-ray", 
    "confidence_threshold": 0.7,
    "preprocessing": {
        "normalize": true,
        "histogram_equalization": false,
        "contrast_enhancement": true,
        "noise_reduction": false,
        "resize": true,
        "resize_dimensions": [224, 224]
    }
}
```

### DICOM Processing Configuration
```python
{
    "output_format": "nifti_gz",
    "target_orientation": "RAS",
    "normalize_intensity": true,
    "crop_to_brain": false,
    "anonymize": true,
    "resample_spacing": [1.0, 1.0, 1.0]
}
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
pytest

# Run specific test modules
pytest tests/test_imaging.py
pytest tests/test_analysis.py

# Run with coverage
pytest --cov=app tests/
```

### Test Examples
```python
# Test model loading
def test_model_loading():
    response = client.post("/api/v1/models/MRI/brain_tumor_unet/load")
    assert response.status_code == 200
    assert response.json()["success"] == True

# Test DICOM analysis
def test_dicom_analysis():
    with open("test_dicom.zip", "rb") as f:
        response = client.post(
            "/api/v1/dicom/analyze",
            files={"file": f}
        )
    assert response.status_code == 200
    assert "series_count" in response.json()
```

## 🔒 Security Considerations

### API Security
- Optional API key authentication
- Rate limiting capabilities
- Input validation and sanitization
- Secure file upload handling
- Temporary file cleanup

### Data Privacy
- Automatic DICOM anonymization
- Secure temporary file storage
- Configurable data retention policies
- No persistent storage of patient data

## 📊 Monitoring & Logging

### Health Monitoring
```bash
# Check system health
curl http://localhost:8000/health

# Monitor GPU usage
curl http://localhost:8000/api/v1/models/cache/stats
```

### Logging Configuration
- Structured JSON logging available
- Configurable log levels
- Automatic log rotation
- Performance metrics tracking

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app/ ./app/
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Considerations
- Use single worker (model cache consistency)
- Configure proper logging
- Set up health monitoring
- Implement load balancing if needed
- Regular model cache optimization

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Install development dependencies: `pip install -r requirements-dev.txt`
4. Make changes and add tests
5. Run tests: `pytest`
6. Submit pull request

### Code Standards
- Follow PEP 8 style guidelines
- Add type hints for all functions
- Include docstrings for public APIs
- Maintain test coverage above 80%

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues

**GPU Memory Errors**
- Reduce model cache size in configuration
- Use CPU-only mode for development
- Implement gradient checkpointing

**DICOM Conversion Failures**
- Verify DICOM file integrity
- Check supported modalities
- Review anonymization settings

**Model Loading Issues** 
- Ensure HuggingFace model availability
- Check internet connectivity
- Verify model compatibility

### Getting Help
- Documentation: `/docs` endpoint
- GitHub Issues: [Report bugs or request features]
- Email Support: support@medical-imaging-api.com

## 📈 Performance Benchmarks

### Typical Processing Times
- DICOM Analysis: 2-5 seconds
- Single Prediction: 0.5-2 seconds  
- Batch Processing: 1-3 seconds per image
- Model Loading: 10-30 seconds

### Resource Requirements
- Minimum: 8GB RAM, 4GB GPU VRAM
- Recommended: 32GB RAM, 8GB+ GPU VRAM
- Storage: 50GB+ for model cache

## 🔄 Version History

### v3.1.0 (Current)
- Modular architecture refactor
- Enhanced analysis capabilities
- Improved GPU memory management
- Comprehensive test suite

### v3.0.0
- Multi-modal AI model support
- Advanced segmentation models
- Statistical analysis tools
- Background job processing

### v2.0.0
- DICOM processing integration
- Model caching system
- Basic prediction endpoints

---

Built with ❤️ for the medical imaging community