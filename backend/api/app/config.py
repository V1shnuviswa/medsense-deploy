from pydantic import BaseSettings, Field
from typing import List, Optional
import os
import torch
import sys
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # API Configuration
    app_name: str = Field(default="Medical Imaging API", env="APP_NAME")
    version: str = Field(default="3.1.0", env="API_VERSION")
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    reload: bool = Field(default=False, env="RELOAD")
    
    # CORS Configuration
    cors_origins: List[str] = Field(
        default=["*"], 
        env="CORS_ORIGINS",
        description="Allowed CORS origins"
    )
    
    # Logging Configuration
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        env="LOG_FORMAT"
    )
    
    # File Storage Configuration
    temp_dir: str = Field(default="/tmp/medical_imaging", env="TEMP_DIR")
    max_file_size: int = Field(default=500 * 1024 * 1024, env="MAX_FILE_SIZE")  # 500MB
    allowed_file_extensions: List[str] = Field(
        default=[".dcm", ".nii", ".nii.gz", ".zip", ".png", ".jpg", ".jpeg"],
        env="ALLOWED_EXTENSIONS"
    )
    
    # AI/ML Configuration
    model_cache_size: int = Field(default=10, env="MODEL_CACHE_SIZE")
    default_confidence_threshold: float = Field(default=0.5, env="DEFAULT_CONFIDENCE_THRESHOLD")
    max_batch_size: int = Field(default=20, env="MAX_BATCH_SIZE")
    model_timeout: int = Field(default=300, env="MODEL_TIMEOUT")  # 5 minutes
    
    # DICOM Processing Configuration
    dicom_max_workers: int = Field(default=4, env="DICOM_MAX_WORKERS")
    dicom_temp_retention_hours: int = Field(default=24, env="DICOM_TEMP_RETENTION_HOURS")
    
    # Job Management Configuration
    max_concurrent_jobs: int = Field(default=5, env="MAX_CONCURRENT_JOBS")
    job_retention_days: int = Field(default=7, env="JOB_RETENTION_DAYS")
    job_cleanup_interval_hours: int = Field(default=6, env="JOB_CLEANUP_INTERVAL_HOURS")
    
    # GPU Configuration
    use_gpu: bool = Field(default=True, env="USE_GPU")
    gpu_memory_fraction: float = Field(default=0.8, env="GPU_MEMORY_FRACTION")
    
    # Security Configuration
    api_key_required: bool = Field(default=False, env="API_KEY_REQUIRED")
    api_key: Optional[str] = Field(default=None, env="API_KEY")
    rate_limit_enabled: bool = Field(default=False, env="RATE_LIMIT_ENABLED")
    rate_limit_per_minute: int = Field(default=100, env="RATE_LIMIT_PER_MINUTE")
    
    # Database Configuration (for future use)
    database_url: Optional[str] = Field(default=None, env="DATABASE_URL")
    redis_url: Optional[str] = Field(default=None, env="REDIS_URL")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    @property
    def python_version(self) -> str:
        """Get Python version"""
        return f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    
    @property
    def cuda_available(self) -> bool:
        """Check if CUDA is available"""
        return torch.cuda.is_available()
    
    @property
    def gpu_count(self) -> int:
        """Get number of available GPUs"""
        return torch.cuda.device_count() if torch.cuda.is_available() else 0
    
    @property
    def device(self) -> str:
        """Get the device to use for ML models"""
        if self.use_gpu and torch.cuda.is_available():
            return "cuda"
        return "cpu"
    
    def create_temp_dir(self):
        """Create temporary directory if it doesn't exist"""
        os.makedirs(self.temp_dir, exist_ok=True)
        return self.temp_dir
    
    def validate_file_extension(self, filename: str) -> bool:
        """Validate if file extension is allowed"""
        return any(filename.lower().endswith(ext) for ext in self.allowed_file_extensions)
    
    def get_model_cache_config(self) -> dict:
        """Get model cache configuration"""
        return {
            "max_size": self.model_cache_size,
            "timeout": self.model_timeout,
            "device": self.device
        }

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

# Environment-specific configurations
class DevelopmentSettings(Settings):
    """Development environment settings"""
    reload: bool = True
    log_level: str = "DEBUG"
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8080"]

class ProductionSettings(Settings):
    """Production environment settings"""
    reload: bool = False
    log_level: str = "INFO"
    api_key_required: bool = True
    rate_limit_enabled: bool = True

class TestingSettings(Settings):
    """Testing environment settings"""
    temp_dir: str = "/tmp/test_medical_imaging"
    model_cache_size: int = 2
    max_batch_size: int = 5
    log_level: str = "WARNING"

def get_environment_settings() -> Settings:
    """Get settings based on environment"""
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "production":
        return ProductionSettings()
    elif env == "testing":
        return TestingSettings()
    else:
        return DevelopmentSettings()

# Model Registry Configuration
MODEL_REGISTRY = {
    "MRI": {
        "description": "Magnetic Resonance Imaging models",
        "applications": [
            "Brain tumor detection and segmentation",
            "Multiple sclerosis lesion detection",
            "Cardiac function analysis",
            "Prostate cancer detection"
        ],
        "models": {
            "brain_tumor_unet": {
                "name": "Brain Tumor U-Net",
                "type": "segmentation",
                "huggingface_id": "nielsr/unet-segmentation",
                "applications": ["Brain tumor segmentation", "BRATS challenge"],
                "input_size": (224, 224),
                "output_classes": ["background", "tumor_core", "edema", "enhancing_tumor"],
                "confidence_threshold": 0.7
            },
            "cardiac_segmentation": {
                "name": "Cardiac MRI Segmentation",
                "type": "segmentation",
                "huggingface_id": "Project-MONAI/nnUNet",
                "applications": ["Left ventricle segmentation", "Myocardium analysis"],
                "input_size": (224, 224),
                "output_classes": ["background", "lv_cavity", "myocardium", "rv_cavity"],
                "confidence_threshold": 0.6
            }
        }
    },
    "CT": {
        "description": "Computed Tomography models",
        "applications": [
            "Lung nodule detection",
            "Liver segmentation",
            "COVID-19 detection",
            "Bone fracture detection"
        ],
        "models": {
            "lung_nodule_detector": {
                "name": "Lung Nodule Detector",
                "type": "detection",
                "huggingface_id": "microsoft/resnet-50",
                "applications": ["Lung cancer screening", "Nodule detection"],
                "input_size": (512, 512),
                "confidence_threshold": 0.7
            },
            "covid_classifier": {
                "name": "COVID-19 CT Classifier",
                "type": "classification",
                "huggingface_id": "microsoft/resnet-50",
                "applications": ["COVID-19 detection", "Pneumonia classification"],
                "input_size": (224, 224),
                "output_classes": ["normal", "covid", "pneumonia"],
                "confidence_threshold": 0.8
            }
        }
    },
    "X-ray": {
        "description": "X-ray imaging models",
        "applications": [
            "Chest X-ray pathology detection",
            "Pneumonia detection",
            "Bone fracture detection"
        ],
        "models": {
            "chest_pathology": {
                "name": "Chest Pathology Detector",
                "type": "classification",
                "huggingface_id": "google/vit-base-patch16-224",
                "applications": ["14 chest pathologies", "CheXpert dataset"],
                "input_size": (224, 224),
                "output_classes": [
                    "Atelectasis", "Cardiomegaly", "Consolidation", "Edema",
                    "Effusion", "Emphysema", "Fibrosis", "Hernia",
                    "Infiltration", "Mass", "Nodule", "Pleural_Thickening",
                    "Pneumonia", "Pneumothorax"
                ],
                "confidence_threshold": 0.6
            },
            "pneumonia_detector": {
                "name": "Pneumonia Detector",
                "type": "classification",
                "huggingface_id": "ryefoxlime/PneumoniaDetection",
                "applications": ["Pneumonia vs Normal classification"],
                "input_size": (224, 224),
                "confidence_threshold": 0.8
            }
        }
    }
}

# Preprocessing Configuration
PREPROCESSING_CONFIG = {
    "normalize": {
        "default_range": (0.0, 1.0),
        "description": "Normalize pixel values to specified range"
    },
    "histogram_equalization": {
        "description": "Enhance contrast using histogram equalization"
    },
    "contrast_enhancement": {
        "default_factor": 1.2,
        "description": "Enhance image contrast"
    },
    "noise_reduction": {
        "default_sigma": 0.5,
        "description": "Reduce image noise using Gaussian filtering"
    },
    "resize": {
        "default_size": (224, 224),
        "description": "Resize image to specified dimensions"
    }
}