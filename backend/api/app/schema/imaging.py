from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union, Tuple
from enum import Enum
from datetime import datetime

# Enums
class ModalityType(str, Enum):
    MRI = "MRI"
    CT = "CT"
    XRAY = "X-ray"
    ULTRASOUND = "Ultrasound"
    MAMMOGRAPHY = "Mammography"
    PET = "PET"
    SPECT = "SPECT"

class ModelType(str, Enum):
    SEGMENTATION = "segmentation"
    CLASSIFICATION = "classification"
    DETECTION = "detection"
    FEATURE_EXTRACTION = "feature_extraction"
    ZERO_SHOT = "zero_shot"

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ConversionFormat(str, Enum):
    NIFTI = "nifti"
    NIFTI_GZ = "nifti_gz"
    ANALYZE = "analyze"
    MGZ = "mgz"

class OrientationCode(str, Enum):
    RAS = "RAS"
    LAS = "LAS"
    RPS = "RPS"
    LPS = "LPS"

class ResamplingMethod(str, Enum):
    LINEAR = "linear"
    NEAREST = "nearest"
    CUBIC = "cubic"

# Base schemas
class BaseResponse(BaseModel):
    """Base response schema"""
    success: bool
    timestamp: datetime = Field(default_factory=datetime.now)
    message: Optional[str] = None

class ErrorResponse(BaseResponse):
    """Error response schema"""
    success: bool = False
    error_code: str
    error_details: Optional[Dict[str, Any]] = None

# DICOM Processing Schemas
class DicomProcessingRequest(BaseModel):
    """Request schema for DICOM processing"""
    series_uid: Optional[str] = Field(None, description="Specific DICOM series UID to process")
    output_format: ConversionFormat = Field(ConversionFormat.NIFTI_GZ, description="Output format")
    target_orientation: OrientationCode = Field(OrientationCode.RAS, description="Target orientation")
    resample_spacing: Optional[List[float]] = Field(None, description="Resampling spacing [x, y, z]")
    resample_method: ResamplingMethod = Field(ResamplingMethod.LINEAR, description="Resampling method")
    normalize_intensity: bool = Field(True, description="Apply intensity normalization")
    crop_to_brain: bool = Field(False, description="Crop to brain region (MRI only)")
    anonymize: bool = Field(True, description="Remove patient identifiers")
    
    @validator('resample_spacing')
    def validate_spacing(cls, v):
        if v is not None and len(v) != 3:
            raise ValueError('resample_spacing must have exactly 3 values [x, y, z]')
        return v

class DicomSeriesInfo(BaseModel):
    """DICOM series information"""
    series_uid: str
    series_description: str
    modality: str
    slice_count: int
    patient_id: Optional[str] = None
    study_date: Optional[str] = None
    acquisition_date: Optional[str] = None
    image_dimensions: Optional[Tuple[int, int]] = None
    pixel_spacing: Optional[Tuple[float, float]] = None
    slice_thickness: Optional[float] = None

class DicomAnalysisResponse(BaseResponse):
    """Response schema for DICOM analysis"""
    series_count: int
    series_info: List[DicomSeriesInfo]
    total_files: int
    recommended_series: Optional[str] = None
    detected_modality: Optional[ModalityType] = None
    file_size_mb: Optional[float] = None

class ConversionResponse(BaseResponse):
    """Response schema for DICOM conversion"""
    output_file: str
    series_info: DicomSeriesInfo
    conversion_stats: Dict[str, Any]
    processing_time: float
    output_size_mb: float

# Model and Preprocessing Schemas
class PreprocessingOptions(BaseModel):
    """Preprocessing configuration"""
    normalize: bool = Field(False, description="Apply normalization")
    normalize_range: Tuple[float, float] = Field((0.0, 1.0), description="Normalization range")
    histogram_equalization: bool = Field(False, description="Apply histogram equalization")
    contrast_enhancement: bool = Field(False, description="Enhance contrast")
    contrast_factor: float = Field(1.2, description="Contrast enhancement factor")
    noise_reduction: bool = Field(False, description="Apply noise reduction")
    noise_sigma: float = Field(0.5, description="Gaussian noise reduction sigma")
    resize: bool = Field(False, description="Resize image")
    resize_dimensions: Optional[Tuple[int, int]] = Field(None, description="Target dimensions")
    
    @validator('normalize_range')
    def validate_normalize_range(cls, v):
        if v[0] >= v[1]:
            raise ValueError('normalize_range: min must be less than max')
        return v
    
    @validator('contrast_factor')
    def validate_contrast_factor(cls, v):
        if v <= 0:
            raise ValueError('contrast_factor must be positive')
        return v

class ModelConfiguration(BaseModel):
    """Model configuration for predictions"""
    model_id: str = Field(..., description="Model identifier")
    modality: ModalityType = Field(..., description="Medical imaging modality")
    confidence_threshold: float = Field(0.5, description="Minimum confidence threshold")
    batch_size: int = Field(1, description="Batch size for processing")
    preprocessing: Optional[PreprocessingOptions] = Field(None, description="Preprocessing options")
    
    @validator('confidence_threshold')
    def validate_confidence(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('confidence_threshold must be between 0 and 1')
        return v
    
    @validator('batch_size')
    def validate_batch_size(cls, v):
        if v < 1:
            raise ValueError('batch_size must be at least 1')
        return v

class ModelInfo(BaseModel):
    """Model information schema"""
    model_id: str
    name: str
    type: ModelType
    modality: ModalityType
    applications: List[str]
    input_size: Tuple[int, int]
    output_classes: Optional[List[str]] = None
    confidence_threshold: float
    is_loaded: bool = False
    last_used: Optional[datetime] = None
    loading_time: Optional[float] = None

class ModelListResponse(BaseResponse):
    """Response schema for model listing"""
    models: List[ModelInfo]
    total_count: int
    loaded_count: int

# Prediction Schemas
class PredictionRequest(BaseModel):
    """Request schema for predictions"""
    model_config: ModelConfiguration
    slice_index: Optional[int] = Field(None, description="Specific slice index for 3D volumes")
    return_probabilities: bool = Field(True, description="Return prediction probabilities")
    return_visualizations: bool = Field(False, description="Generate visualization overlays")

class PredictionResult(BaseModel):
    """Individual prediction result"""
    label: str
    confidence: float
    bounding_box: Optional[List[float]] = Field(None, description="Bounding box coordinates")
    mask: Optional[str] = Field(None, description="Base64 encoded segmentation mask")
    probability_distribution: Optional[Dict[str, float]] = None

class PredictionResponse(BaseResponse):
    """Response schema for predictions"""
    model_id: str
    modality: ModalityType
    model_type: ModelType
    predictions: List[PredictionResult]
    processing_time: float
    slice_used: Optional[int] = None
    preprocessing_applied: bool
    metadata: Dict[str, Any]

# Batch Processing Schemas
class BatchProcessingRequest(BaseModel):
    """Request schema for batch processing"""
    model_configs: List[ModelConfiguration] = Field(..., min_items=1, max_items=5)
    max_concurrent: int = Field(3, ge=1, le=10, description="Maximum concurrent processing")
    priority: str = Field("normal", description="Processing priority")
    
    @validator('model_configs')
    def validate_model_configs(cls, v):
        if len(v) == 0:
            raise ValueError('At least one model configuration is required')
        return v

class BatchResult(BaseModel):
    """Batch processing result for single file"""
    filename: str
    file_index: int
    results: List[PredictionResponse]
    total_processing_time: float
    success: bool
    error_message: Optional[str] = None

class BatchProcessingResponse(BaseResponse):
    """Response schema for batch processing"""
    job_id: str
    total_files: int
    model_count: int
    estimated_completion_time: Optional[datetime] = None

# Job Management Schemas
class ProcessingJob(BaseModel):
    """Processing job information"""
    job_id: str
    status: ProcessingStatus
    job_type: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: float = Field(0.0, ge=0.0, le=1.0, description="Job progress (0-1)")
    results: Optional[List[Union[PredictionResponse, BatchResult]]] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class JobStatusResponse(BaseResponse):
    """Job status response"""
    job: ProcessingJob

class JobListResponse(BaseResponse):
    """Job list response"""
    jobs: List[ProcessingJob]
    total_count: int
    active_count: int
    completed_count: int
    failed_count: int

# Pipeline Schemas
class EndToEndRequest(BaseModel):
    """End-to-end pipeline request"""
    dicom_config: DicomProcessingRequest
    model_config: ModelConfiguration
    generate_report: bool = Field(True, description="Generate analysis report")
    save_intermediate: bool = Field(False, description="Save intermediate results")

class PipelineStep(BaseModel):
    """Pipeline step information"""
    step_name: str
    status: ProcessingStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None

class EndToEndResponse(BaseResponse):
    """End-to-end pipeline response"""
    job_id: str
    pipeline_steps: List[PipelineStep]
    conversion_result: Optional[ConversionResponse] = None
    prediction_result: Optional[PredictionResponse] = None
    report: Optional[Dict[str, Any]] = None
    total_processing_time: float

# File Upload Schemas
class FileUploadResponse(BaseResponse):
    """File upload response"""
    file_id: str
    filename: str
    file_size: int
    file_type: str
    upload_time: datetime

class FileValidation(BaseModel):
    """File validation result"""
    is_valid: bool
    file_type: str
    file_size: int
    validation_errors: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

# System and Health Schemas
class SystemInfo(BaseModel):
    """System information"""
    python_version: str
    torch_version: str
    cuda_available: bool
    gpu_count: int
    gpu_memory: Optional[Dict[int, Dict[str, float]]] = None
    cpu_count: int
    memory_total_gb: float
    memory_available_gb: float

class SystemHealth(BaseResponse):
    """System health response"""
    status: str
    version: str
    uptime_seconds: float
    models_loaded: int
    active_jobs: int
    system_info: SystemInfo
    service_status: Dict[str, str]

# Export and Reporting Schemas
class ReportSection(BaseModel):
    """Report section"""
    title: str
    content: Union[str, Dict[str, Any], List[Any]]
    section_type: str = Field("text", description="Section type: text, table, image, etc.")

class AnalysisReport(BaseModel):
    """Analysis report"""
    report_id: str
    title: str
    generated_at: datetime
    modality: ModalityType
    model_used: str
    sections: List[ReportSection]
    summary: Dict[str, Any]
    recommendations: List[str]
    confidence_metrics: Dict[str, float]

class ExportRequest(BaseModel):
    """Export request"""
    job_id: str
    format: str = Field("json", description="Export format: json, pdf, csv")
    include_images: bool = Field(False, description="Include image data in export")
    include_metadata: bool = Field(True, description="Include metadata")

class ExportResponse(BaseResponse):
    """Export response"""
    export_id: str
    download_url: str
    expires_at: datetime
    file_size: int
    format: str