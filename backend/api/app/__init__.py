"""
Advanced Medical Imaging API

A comprehensive FastAPI application for medical image analysis with:
- DICOM/NIfTI file processing and conversion
- AI-powered image analysis with multiple modalities (MRI, CT, X-ray)
- Advanced segmentation and classification models
- Statistical analysis and performance comparison
- Quality assessment and anomaly detection
- Batch processing and pipeline automation

Version: 3.1.0
"""

__version__ = "3.1.0"
__author__ = "Medical Imaging API Team"
__email__ = "support@medical-imaging-api.com"

from app.config import get_settings
from app.services.ai_service import AIModelService
from app.services.dicom_service import DicomService
from app.services.file_utils import FileUtilsService

# Package-level exports
__all__ = [
    "__version__",
    "get_settings",
    "AIModelService",
    "DicomService", 
    "FileUtilsService"
]