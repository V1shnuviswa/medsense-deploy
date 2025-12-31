import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///openrad.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or 'uploads'
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB
    
    # Medical imaging specific settings
    DICOM_STORAGE_PATH = os.environ.get('DICOM_STORAGE_PATH') or 'dicom_storage'
    SUPPORTED_FORMATS = ['.dcm', '.nii', '.nii.gz']
    
    # AI Model settings
    VLM_MODEL_PATH = os.environ.get('VLM_MODEL_PATH') or 'models/vlm'
    SEGMENTATION_MODELS_PATH = os.environ.get('SEGMENTATION_MODELS_PATH') or 'models/segmentation'
    
    # HIPAA Compliance settings
    AUDIT_LOG_ENABLED = True
    ENCRYPTION_ENABLED = True
    SESSION_TIMEOUT = 3600  # 1 hour

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///openrad_dev.db'

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'postgresql://user:pass@localhost/openrad'

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}