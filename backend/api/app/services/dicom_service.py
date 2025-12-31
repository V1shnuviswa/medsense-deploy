import asyncio
import logging
import os
import tempfile
import zipfile
import shutil
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from pathlib import Path
import nibabel as nib
from PIL import Image
import numpy as np

from app.config import get_settings
from app.schemas.imaging import (
    DicomProcessingRequest, DicomSeriesInfo, ConversionResponse, 
    DicomAnalysisResponse, ConversionFormat, OrientationCode, ResamplingMethod
)

# Import DICOM infrastructure (would be implemented separately)
try:
    from dicom_nifti_infra import (
        DicomNiftiInfrastructure, 
        ConversionRequest, 
        DicomSeriesInfo as InfraSeriesInfo
    )
    DICOM_AVAILABLE = True
except ImportError:
    DICOM_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("DICOM infrastructure not available - using mock implementation")

logger = logging.getLogger(__name__)
settings = get_settings()

class MockDicomSeries:
    """Mock DICOM series for testing when infrastructure not available"""
    def __init__(self, series_uid: str, description: str, modality: str, slice_count: int):
        self.series_uid = series_uid
        self.series_description = description
        self.modality = modality
        self.slice_count = slice_count
        self.patient_id = "PATIENT_001"
        self.study_date = "20240101"
        self.acquisition_date = "20240101"

class DicomService:
    """Service for DICOM file processing and conversion"""
    
    def __init__(self):
        self.temp_dir = Path(settings.create_temp_dir())
        self.max_workers = settings.dicom_max_workers
        
        # Initialize DICOM infrastructure if available
        if DICOM_AVAILABLE:
            self.dicom_infra = DicomNiftiInfrastructure(max_workers=self.max_workers)
        else:
            self.dicom_infra = None
            logger.warning("Using mock DICOM implementation")
    
    async def analyze_dicom_files(self, zip_file_path: str) -> DicomAnalysisResponse:
        """Analyze DICOM files from ZIP archive"""
        try:
            # Extract ZIP file
            extract_dir = self.temp_dir / f"extract_{int(datetime.now().timestamp())}"
            extract_dir.mkdir(exist_ok=True)
            
            try:
                with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
                    zip_ref.extractall(extract_dir)
                
                # Analyze DICOM series
                if self.dicom_infra:
                    series_list = await self.dicom_infra.analyze_dicom_directory(str(extract_dir))
                    series_info = self._convert_series_info(series_list)
                else:
                    # Mock analysis
                    series_info = self._mock_dicom_analysis(extract_dir)
                
                # Detect modality and recommend series
                detected_modality = self._detect_modality(series_info)
                recommended_series = self._recommend_series(series_info)
                
                # Calculate file size
                file_size_mb = self._calculate_directory_size(extract_dir) / (1024 * 1024)
                
                return DicomAnalysisResponse(
                    success=True,
                    series_count=len(series_info),
                    series_info=series_info,
                    total_files=sum(s.slice_count for s in series_info),
                    recommended_series=recommended_series,
                    detected_modality=detected_modality,
                    file_size_mb=round(file_size_mb, 2),
                    message="DICOM analysis completed successfully"
                )
                
            finally:
                # Cleanup extraction directory
                if extract_dir.exists():
                    shutil.rmtree(extract_dir, ignore_errors=True)
                
        except Exception as e:
            logger.error(f"DICOM analysis failed: {e}")
            return DicomAnalysisResponse(
                success=False,
                series_count=0,
                series_info=[],
                total_files=0,
                error_code="ANALYSIS_FAILED",
                error_details={"error": str(e)}
            )
    
    async def convert_dicom_to_nifti(
        self, 
        zip_file_path: str, 
        request: DicomProcessingRequest
    ) -> ConversionResponse:
        """Convert DICOM files to NIfTI format"""
        try:
            if self.dicom_infra:
                # Use real DICOM infrastructure
                conversion_request = ConversionRequest(
                    series_uid=request.series_uid,
                    output_format=request.output_format,
                    target_orientation=request.target_orientation,
                    resample_spacing=tuple(request.resample_spacing) if request.resample_spacing else None,
                    resample_method=request.resample_method,
                    normalize_intensity=request.normalize_intensity,
                    crop_to_brain=request.crop_to_brain,
                    anonymize=request.anonymize
                )
                
                # Perform conversion
                with open(zip_file_path, 'rb') as f:
                    result = await self.dicom_infra.convert_from_zip(f, conversion_request)
                
                return ConversionResponse(
                    success=result.success,
                    output_file=result.output_file,
                    series_info=self._convert_single_series_info(result.series_info),
                    conversion_stats=result.conversion_stats,
                    processing_time=result.processing_time,
                    output_size_mb=os.path.getsize(result.output_file) / (1024 * 1024) if result.success else 0
                )
            else:
                # Mock conversion
                return await self._mock_dicom_conversion(zip_file_path, request)
                
        except Exception as e:
            logger.error(f"DICOM conversion failed: {e}")
            return ConversionResponse(
                success=False,
                output_file="",
                series_info=DicomSeriesInfo(
                    series_uid="",
                    series_description="",
                    modality="",
                    slice_count=0
                ),
                conversion_stats={},
                processing_time=0,
                output_size_mb=0,
                error_code="CONVERSION_FAILED",
                error_details={"error": str(e)}
            )
    
    def nifti_to_image(
        self, 
        nifti_path: str, 
        slice_idx: Optional[int] = None
    ) -> Image.Image:
        """Convert NIfTI file to PIL Image for model inference"""
        try:
            # Load NIfTI file
            nifti_img = nib.load(nifti_path)
            data = nifti_img.get_fdata()
            
            # Handle different dimensionalities
            if len(data.shape) == 3:
                # 3D volume - extract middle slice or specified slice
                if slice_idx is None:
                    slice_idx = data.shape[2] // 2
                elif slice_idx >= data.shape[2]:
                    slice_idx = data.shape[2] - 1
                slice_data = data[:, :, slice_idx]
            elif len(data.shape) == 2:
                # 2D image
                slice_data = data
            elif len(data.shape) == 4:
                # 4D volume (e.g., fMRI) - take middle slice of middle volume
                if slice_idx is None:
                    slice_idx = data.shape[2] // 2
                volume_idx = data.shape[3] // 2
                slice_data = data[:, :, slice_idx, volume_idx]
            else:
                raise ValueError(f"Unsupported data shape: {data.shape}")
            
            # Normalize to 0-255 range
            if slice_data.max() > slice_data.min():
                slice_data = ((slice_data - slice_data.min()) / 
                             (slice_data.max() - slice_data.min()) * 255).astype(np.uint8)
            else:
                slice_data = np.zeros_like(slice_data, dtype=np.uint8)
            
            # Convert to PIL Image
            if len(slice_data.shape) == 2:
                # Grayscale image
                pil_image = Image.fromarray(slice_data, mode='L')
                # Convert to RGB for model compatibility
                pil_image = pil_image.convert('RGB')
            else:
                pil_image = Image.fromarray(slice_data)
            
            return pil_image
            
        except Exception as e:
            logger.error(f"Failed to convert NIfTI to image: {e}")
            raise ValueError(f"NIfTI conversion failed: {str(e)}")
    
    def validate_nifti_file(self, nifti_path: str) -> Tuple[bool, Dict[str, Any]]:
        """Validate NIfTI file and extract metadata"""
        try:
            nifti_img = nib.load(nifti_path)
            data = nifti_img.get_fdata()
            header = nifti_img.header
            
            metadata = {
                "shape": data.shape,
                "data_type": str(data.dtype),
                "voxel_size": header.get_zooms() if hasattr(header, 'get_zooms') else None,
                "orientation": nib.orientations.io_orientation(nifti_img.affine),
                "file_size_mb": os.path.getsize(nifti_path) / (1024 * 1024)
            }
            
            # Basic validation
            if len(data.shape) < 2 or len(data.shape) > 4:
                return False, {"error": f"Invalid dimensions: {data.shape}"}
            
            if data.size == 0:
                return False, {"error": "Empty data array"}
            
            return True, metadata
            
        except Exception as e:
            return False, {"error": str(e)}
    
    def get_nifti_slices_info(self, nifti_path: str) -> Dict[str, Any]:
        """Get information about slices in NIfTI file"""
        try:
            nifti_img = nib.load(nifti_path)
            data = nifti_img.get_fdata()
            
            info = {
                "total_slices": data.shape[2] if len(data.shape) >= 3 else 1,
                "recommended_slice": data.shape[2] // 2 if len(data.shape) >= 3 else 0,
                "slice_range": [0, data.shape[2] - 1] if len(data.shape) >= 3 else [0, 0],
                "dimensions": data.shape,
                "non_zero_slices": []
            }
            
            # Find slices with actual data
            if len(data.shape) >= 3:
                for i in range(data.shape[2]):
                    slice_data = data[:, :, i]
                    if np.sum(slice_data) > 0:
                        info["non_zero_slices"].append(i)
            
            return info
            
        except Exception as e:
            logger.error(f"Failed to get NIfTI slice info: {e}")
            return {"error": str(e)}
    
    async def cleanup_temp_files(self, max_age_hours: int = 24):
        """Cleanup temporary files older than specified hours"""
        try:
            current_time = datetime.now()
            cleanup_count = 0
            
            for item in self.temp_dir.iterdir():
                try:
                    item_time = datetime.fromtimestamp(item.stat().st_mtime)
                    age_hours = (current_time - item_time).total_seconds() / 3600
                    
                    if age_hours > max_age_hours:
                        if item.is_file():
                            item.unlink()
                        elif item.is_dir():
                            shutil.rmtree(item, ignore_errors=True)
                        cleanup_count += 1
                        
                except Exception as e:
                    logger.warning(f"Failed to cleanup {item}: {e}")
            
            logger.info(f"Cleaned up {cleanup_count} temporary files")
            return cleanup_count
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            return 0
    
    # Private helper methods
    def _convert_series_info(self, series_list: List) -> List[DicomSeriesInfo]:
        """Convert infrastructure series info to schema format"""
        result = []
        for series in series_list:
            result.append(DicomSeriesInfo(
                series_uid=series.series_uid,
                series_description=series.series_description,
                modality=series.modality,
                slice_count=series.slice_count,
                patient_id=getattr(series, 'patient_id', None),
                study_date=getattr(series, 'study_date', None),
                acquisition_date=getattr(series, 'acquisition_date', None),
                image_dimensions=getattr(series, 'image_dimensions', None),
                pixel_spacing=getattr(series, 'pixel_spacing', None),
                slice_thickness=getattr(series, 'slice_thickness', None)
            ))
        return result
    
    def _convert_single_series_info(self, series) -> DicomSeriesInfo:
        """Convert single series info"""
        return DicomSeriesInfo(
            series_uid=series.series_uid,
            series_description=series.series_description,
            modality=series.modality,
            slice_count=series.slice_count,
            patient_id=getattr(series, 'patient_id', None),
            study_date=getattr(series, 'study_date', None),
            acquisition_date=getattr(series, 'acquisition_date', None)
        )
    
    def _mock_dicom_analysis(self, extract_dir: Path) -> List[DicomSeriesInfo]:
        """Mock DICOM analysis for testing"""
        # Count files to simulate real analysis
        file_count = len(list(extract_dir.rglob("*")))
        
        # Create mock series
        return [
            DicomSeriesInfo(
                series_uid="1.2.3.4.5.6789.1",
                series_description="Axial T1 MPRAGE",
                modality="MR",
                slice_count=max(1, file_count // 3),
                patient_id="MOCK_PATIENT_001",
                study_date="20240101",
                acquisition_date="20240101",
                image_dimensions=(512, 512),
                pixel_spacing=(0.5, 0.5),
                slice_thickness=1.0
            ),
            DicomSeriesInfo(
                series_uid="1.2.3.4.5.6789.2",
                series_description="Sagittal T2 FLAIR",
                modality="MR",
                slice_count=max(1, file_count // 4),
                patient_id="MOCK_PATIENT_001",
                study_date="20240101",
                acquisition_date="20240101",
                image_dimensions=(256, 256),
                pixel_spacing=(0.8, 0.8),
                slice_thickness=3.0
            )
        ]
    
    async def _mock_dicom_conversion(
        self, 
        zip_file_path: str, 
        request: DicomProcessingRequest
    ) -> ConversionResponse:
        """Mock DICOM to NIfTI conversion"""
        # Create a simple NIfTI file for testing
        output_file = self.temp_dir / f"mock_output_{int(datetime.now().timestamp())}.nii.gz"
        
        # Create mock 3D volume
        data = np.random.randint(0, 255, size=(64, 64, 32), dtype=np.uint8)
        nifti_img = nib.Nifti1Image(data, np.eye(4))
        nib.save(nifti_img, str(output_file))
        
        return ConversionResponse(
            success=True,
            output_file=str(output_file),
            series_info=DicomSeriesInfo(
                series_uid="1.2.3.4.5.6789.1",
                series_description="Mock Conversion",
                modality="MR",
                slice_count=32
            ),
            conversion_stats={
                "input_files": 32,
                "output_format": request.output_format.value,
                "orientation": request.target_orientation.value,
                "normalized": request.normalize_intensity
            },
            processing_time=0.5,
            output_size_mb=round(os.path.getsize(output_file) / (1024 * 1024), 2)
        )
    
    def _detect_modality(self, series_info: List[DicomSeriesInfo]) -> Optional[str]:
        """Detect primary modality from series list"""
        if not series_info:
            return None
        
        modalities = [s.modality for s in series_info if s.modality]
        if not modalities:
            return None
        
        # Return most common modality
        return max(set(modalities), key=modalities.count)
    
    def _recommend_series(self, series_info: List[DicomSeriesInfo]) -> Optional[str]:
        """Recommend best series for analysis"""
        if not series_info:
            return None
        
        # Prioritize by modality and slice count
        priority_modalities = ['MR', 'CT', 'CR', 'DX', 'US']
        
        for modality in priority_modalities:
            matching_series = [s for s in series_info if s.modality == modality]
            if matching_series:
                # Return series with most slices
                best_series = max(matching_series, key=lambda x: x.slice_count)
                return best_series.series_uid
        
        # Fallback to series with most slices
        best_series = max(series_info, key=lambda x: x.slice_count)
        return best_series.series_uid
    
    def _calculate_directory_size(self, directory: Path) -> int:
        """Calculate total size of directory in bytes"""
        total_size = 0
        try:
            for item in directory.rglob("*"):
                if item.is_file():
                    total_size += item.stat().st_size
        except Exception as e:
            logger.warning(f"Failed to calculate directory size: {e}")
        return total_size
    
    def get_service_info(self) -> Dict[str, Any]:
        """Get service information"""
        return {
            "service_name": "DICOM Processing Service",
            "infrastructure_available": DICOM_AVAILABLE,
            "temp_directory": str(self.temp_dir),
            "max_workers": self.max_workers,
            "supported_formats": [f.value for f in ConversionFormat],
            "supported_orientations": [o.value for o in OrientationCode],
            "resampling_methods": [r.value for r in ResamplingMethod]
        }