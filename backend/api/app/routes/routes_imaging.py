from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks, Depends
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional
import logging
import tempfile
import json
from datetime import datetime

from app.config import get_settings
from app.schemas.imaging import (
    DicomProcessingRequest, DicomAnalysisResponse, ConversionResponse,
    ModelConfiguration, PredictionResponse, EndToEndRequest, EndToEndResponse,
    BatchProcessingRequest, BatchProcessingResponse, ModelListResponse,
    ProcessingJob, JobStatusResponse, JobListResponse, FileUploadResponse
)
from app.services.ai_service import AIModelService
from app.services.dicom_service import DicomService
from app.services.file_utils import FileUtilsService
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

router = APIRouter()

# Dependency to get services from app state
def get_ai_service(request) -> AIModelService:
    return request.app.state.ai_service

def get_dicom_service() -> DicomService:
    return DicomService()

def get_file_service() -> FileUtilsService:
    return FileUtilsService()

# Model Management Endpoints
@router.get("/models/", response_model=ModelListResponse)
async def list_models(
    modality: Optional[str] = None,
    ai_service: AIModelService = Depends(get_ai_service)
):
    """List all available models or filter by modality"""
    try:
        from app.schemas.imaging import ModalityType
        modality_enum = None
        
        if modality:
            try:
                modality_enum = ModalityType(modality)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid modality. Supported: {[m.value for m in ModalityType]}"
                )
        
        models = ai_service.get_available_models(modality_enum)
        loaded_count = sum(1 for model in models if model.is_loaded)
        
        return ModelListResponse(
            success=True,
            models=models,
            total_count=len(models),
            loaded_count=loaded_count,
            message=f"Retrieved {len(models)} models"
        )
        
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/{modality}/{model_id}/load")
async def load_model(
    modality: str,
    model_id: str,
    force_reload: bool = False,
    ai_service: AIModelService = Depends(get_ai_service)
):
    """Load a specific model into memory"""
    try:
        await ai_service.load_model(modality, model_id, force_reload)
        
        return {
            "success": True,
            "message": f"Model {modality}/{model_id} loaded successfully",
            "model_id": model_id,
            "modality": modality
        }
        
    except Exception as e:
        logger.error(f"Failed to load model {modality}/{model_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/models/{modality}/{model_id}")
async def unload_model(
    modality: str,
    model_id: str,
    ai_service: AIModelService = Depends(get_ai_service)
):
    """Unload a specific model from memory"""
    try:
        success = await ai_service.unload_model(modality, model_id)
        
        if success:
            return {
                "success": True,
                "message": f"Model {modality}/{model_id} unloaded successfully"
            }
        else:
            return {
                "success": False,
                "message": f"Model {modality}/{model_id} was not loaded"
            }
            
    except Exception as e:
        logger.error(f"Failed to unload model {modality}/{model_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/cache/stats")
async def get_cache_stats(ai_service: AIModelService = Depends(get_ai_service)):
    """Get model cache statistics"""
    try:
        stats = ai_service.get_cache_stats()
        return {
            "success": True,
            "cache_stats": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# DICOM Processing Endpoints
@router.post("/dicom/analyze", response_model=DicomAnalysisResponse)
async def analyze_dicom_files(
    file: UploadFile = File(...),
    dicom_service: DicomService = Depends(get_dicom_service),
    file_service: FileUtilsService = Depends(get_file_service)
):
    """Analyze DICOM files from ZIP archive"""
    try:
        # Validate file
        content = await file.read()
        upload_response = file_service.save_uploaded_file(content, file.filename)
        file_path = file_service.get_file_path(upload_response.file_id)
        
        if not file_path:
            raise HTTPException(status_code=400, detail="Failed to save uploaded file")
        
        # Analyze DICOM
        result = await dicom_service.analyze_dicom_files(str(file_path))
        
        return result
        
    except Exception as e:
        logger.error(f"DICOM analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/dicom/convert", response_model=ConversionResponse)
async def convert_dicom_to_nifti(
    file: UploadFile = File(...),
    request_json: str = Form(...),
    dicom_service: DicomService = Depends(get_dicom_service),
    file_service: FileUtilsService = Depends(get_file_service)
):
    """Convert DICOM files to NIfTI format"""
    try:
        # Parse request
        request = DicomProcessingRequest.model_validate_json(request_json)
        
        # Save uploaded file
        content = await file.read()
        upload_response = file_service.save_uploaded_file(content, file.filename)
        file_path = file_service.get_file_path(upload_response.file_id)
        
        if not file_path:
            raise HTTPException(status_code=400, detail="Failed to save uploaded file")
        
        # Convert DICOM
        result = await dicom_service.convert_dicom_to_nifti(str(file_path), request)
        
        return result
        
    except Exception as e:
        logger.error(f"DICOM conversion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Prediction Endpoints
@router.post("/predict/single", response_model=PredictionResponse)
async def predict_single_image(
    file: UploadFile = File(...),
    model_config: str = Form(...),
    slice_index: Optional[int] = Form(None),
    ai_service: AIModelService = Depends(get_ai_service),
    file_service: FileUtilsService = Depends(get_file_service),
    dicom_service: DicomService = Depends(get_dicom_service)
):
    """Make predictions on a single image"""
    try:
        # Parse model configuration
        config = ModelConfiguration.model_validate_json(model_config)
        
        # Save and validate file
        content = await file.read()
        upload_response = file_service.save_uploaded_file(content, file.filename)
        file_path = file_service.get_file_path(upload_response.file_id)
        
        if not file_path:
            raise HTTPException(status_code=400, detail="Failed to save uploaded file")
        
        # Convert to image based on file type
        if file.filename.lower().endswith(('.nii', '.nii.gz')):
            image = dicom_service.nifti_to_image(str(file_path), slice_index)
        else:
            from PIL import Image
            image = Image.open(file_path).convert('RGB')
        
        # Make prediction
        predictions = await ai_service.predict(
            image=image,
            modality=config.modality.value,
            model_id=config.model_id,
            confidence_threshold=config.confidence_threshold,
            preprocessing_options=config.preprocessing
        )
        
        return PredictionResponse(
            success=True,
            model_id=config.model_id,
            modality=config.modality,
            model_type="classification",  # Would be determined from model info
            predictions=predictions,
            processing_time=0.0,  # Would be calculated
            slice_used=slice_index,
            preprocessing_applied=config.preprocessing is not None,
            metadata={
                "filename": file.filename,
                "file_size": len(content)
            }
        )
        
    except Exception as e:
        logger.error(f"Single prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/batch", response_model=BatchProcessingResponse)
async def predict_batch_images(
    files: List[UploadFile] = File(...),
    batch_config: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Process multiple images in batch"""
    try:
        if len(files) > settings.max_batch_size:
            raise HTTPException(
                status_code=400,
                detail=f"Too many files. Maximum: {settings.max_batch_size}"
            )
        
        # Parse batch configuration
        request = BatchProcessingRequest.model_validate_json(batch_config)
        
        # Generate job ID
        job_id = f"batch_{int(datetime.now().timestamp())}_{len(files)}"
        
        # Store job info (in production, use database)
        # This is a simplified in-memory storage
        
        # Schedule background processing
        background_tasks.add_task(
            process_batch_background,
            job_id, files, request
        )
        
        return BatchProcessingResponse(
            success=True,
            job_id=job_id,
            total_files=len(files),
            model_count=len(request.model_configs),
            message=f"Batch processing started for {len(files)} files"
        )
        
    except Exception as e:
        logger.error(f"Batch processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_batch_background(
    job_id: str,
    files: List[UploadFile],
    request: BatchProcessingRequest
):
    """Background task for batch processing"""
    logger.info(f"Starting batch processing job {job_id}")
    
    try:
        # Initialize services
        ai_service = AIModelService()
        file_service = FileUtilsService()
        dicom_service = DicomService()
        
        results = []
        
        for i, file in enumerate(files):
            try:
                content = await file.read()
                upload_response = file_service.save_uploaded_file(content, file.filename)
                file_path = file_service.get_file_path(upload_response.file_id)
                
                if not file_path:
                    continue
                
                # Convert to image
                if file.filename.lower().endswith(('.nii', '.nii.gz')):
                    image = dicom_service.nifti_to_image(str(file_path))
                else:
                    from PIL import Image
                    image = Image.open(file_path).convert('RGB')
                
                # Process with each model configuration
                file_results = []
                for config in request.model_configs:
                    predictions = await ai_service.predict(
                        image=image,
                        modality=config.modality.value,
                        model_id=config.model_id,
                        confidence_threshold=config.confidence_threshold,
                        preprocessing_options=config.preprocessing
                    )
                    
                    file_results.append(PredictionResponse(
                        success=True,
                        model_id=config.model_id,
                        modality=config.modality,
                        model_type="classification",
                        predictions=predictions,
                        processing_time=0.0,
                        preprocessing_applied=config.preprocessing is not None,
                        metadata={"filename": file.filename}
                    ))
                
                results.append({
                    "filename": file.filename,
                    "file_index": i,
                    "results": file_results,
                    "success": True
                })
                
            except Exception as e:
                logger.error(f"Failed to process file {file.filename}: {e}")
                results.append({
                    "filename": file.filename,
                    "file_index": i,
                    "results": [],
                    "success": False,
                    "error": str(e)
                })
        
        # Store results (in production, use database)
        logger.info(f"Batch processing job {job_id} completed with {len(results)} results")
        
    except Exception as e:
        logger.error(f"Batch processing job {job_id} failed: {e}")

# Pipeline Endpoints
@router.post("/pipeline/end-to-end", response_model=EndToEndResponse)
async def end_to_end_pipeline(
    file: UploadFile = File(...),
    pipeline_config: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """End-to-end pipeline: DICOM -> NIfTI -> Prediction"""
    try:
        request = EndToEndRequest.model_validate_json(pipeline_config)
        job_id = f"e2e_{int(datetime.now().timestamp())}"
        
        # Schedule background processing
        background_tasks.add_task(
            process_end_to_end_background,
            job_id, file, request
        )
        
        return EndToEndResponse(
            success=True,
            job_id=job_id,
            pipeline_steps=[],
            total_processing_time=0.0,
            message="End-to-end pipeline started"
        )
        
    except Exception as e:
        logger.error(f"End-to-end pipeline failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_end_to_end_background(
    job_id: str,
    file: UploadFile,
    request: EndToEndRequest
):
    """Background task for end-to-end processing"""
    logger.info(f"Starting end-to-end processing job {job_id}")
    
    try:
        # Initialize services
        ai_service = AIModelService()
        file_service = FileUtilsService()
        dicom_service = DicomService()
        
        # Step 1: Save and validate file
        content = await file.read()
        upload_response = file_service.save_uploaded_file(content, file.filename)
        file_path = file_service.get_file_path(upload_response.file_id)
        
        # Step 2: Convert DICOM to NIfTI
        conversion_result = await dicom_service.convert_dicom_to_nifti(
            str(file_path), request.dicom_config
        )
        
        if not conversion_result.success:
            logger.error(f"DICOM conversion failed for job {job_id}")
            return
        
        # Step 3: Make prediction
        image = dicom_service.nifti_to_image(conversion_result.output_file)
        
        predictions = await ai_service.predict(
            image=image,
            modality=request.model_config.modality.value,
            model_id=request.model_config.model_id,
            confidence_threshold=request.model_config.confidence_threshold,
            preprocessing_options=request.model_config.preprocessing
        )
        
        logger.info(f"End-to-end processing job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"End-to-end processing job {job_id} failed: {e}")

# File Management Endpoints
@router.post("/files/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    file_service: FileUtilsService = Depends(get_file_service)
):
    """Upload and validate file"""
    try:
        content = await file.read()
        result = file_service.save_uploaded_file(content, file.filename)
        return result
        
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/{file_id}/info")
async def get_file_info(
    file_id: str,
    file_service: FileUtilsService = Depends(get_file_service)
):
    """Get file information"""
    try:
        file_path = file_service.get_file_path(file_id)
        if not file_path:
            raise HTTPException(status_code=404, detail="File not found")
        
        info = file_service.get_file_info(str(file_path))
        return {"success": True, "file_info": info}
        
    except Exception as e:
        logger.error(f"Failed to get file info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    file_service: FileUtilsService = Depends(get_file_service)
):
    """Delete uploaded file"""
    try:
        file_path = file_service.get_file_path(file_id)
        if not file_path:
            raise HTTPException(status_code=404, detail="File not found")
        
        success = file_service.delete_file(str(file_path))
        return {"success": success, "message": "File deleted" if success else "Failed to delete file"}
        
    except Exception as e:
        logger.error(f"Failed to delete file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Utility Endpoints
@router.post("/maintenance/cleanup")
async def cleanup_resources(
    max_age_hours: int = 24,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    file_service: FileUtilsService = Depends(get_file_service),
    dicom_service: DicomService = Depends(get_dicom_service)
):
    """Cleanup old files and resources"""
    try:
        background_tasks.add_task(file_service.cleanup_old_files, max_age_hours)
        background_tasks.add_task(dicom_service.cleanup_temp_files, max_age_hours)
        
        return {
            "success": True,
            "message": f"Cleanup scheduled for files older than {max_age_hours} hours"
        }
        
    except Exception as e:
        logger.error(f"Cleanup scheduling failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))