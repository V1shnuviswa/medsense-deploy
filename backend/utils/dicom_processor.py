import pydicom
import numpy as np
from PIL import Image
import io
import base64
import os
from typing import Dict, Any, Optional, Tuple

class DicomProcessor:
    """Utility class for processing DICOM files"""
    
    @staticmethod
    def read_dicom_metadata(file_path: str) -> Dict[str, Any]:
        """Extract metadata from DICOM file"""
        try:
            ds = pydicom.dcmread(file_path)
            
            metadata = {
                # Patient information
                'patient_name': str(getattr(ds, 'PatientName', '')),
                'patient_id': str(getattr(ds, 'PatientID', '')),
                'patient_birth_date': str(getattr(ds, 'PatientBirthDate', '')),
                'patient_sex': str(getattr(ds, 'PatientSex', '')),
                
                # Study information
                'study_instance_uid': str(getattr(ds, 'StudyInstanceUID', '')),
                'study_date': str(getattr(ds, 'StudyDate', '')),
                'study_time': str(getattr(ds, 'StudyTime', '')),
                'study_description': str(getattr(ds, 'StudyDescription', '')),
                'accession_number': str(getattr(ds, 'AccessionNumber', '')),
                
                # Series information
                'series_instance_uid': str(getattr(ds, 'SeriesInstanceUID', '')),
                'series_number': getattr(ds, 'SeriesNumber', None),
                'series_description': str(getattr(ds, 'SeriesDescription', '')),
                'modality': str(getattr(ds, 'Modality', '')),
                'body_part_examined': str(getattr(ds, 'BodyPartExamined', '')),
                
                # Instance information
                'sop_instance_uid': str(getattr(ds, 'SOPInstanceUID', '')),
                'instance_number': getattr(ds, 'InstanceNumber', None),
                'slice_location': getattr(ds, 'SliceLocation', None),
                'slice_thickness': getattr(ds, 'SliceThickness', None),
                
                # Image information
                'rows': getattr(ds, 'Rows', None),
                'columns': getattr(ds, 'Columns', None),
                'pixel_spacing': getattr(ds, 'PixelSpacing', None),
                'bits_allocated': getattr(ds, 'BitsAllocated', None),
                'bits_stored': getattr(ds, 'BitsStored', None),
                'image_orientation_patient': getattr(ds, 'ImageOrientationPatient', None),
                'image_position_patient': getattr(ds, 'ImagePositionPatient', None),
                
                # Window/Level information
                'window_center': getattr(ds, 'WindowCenter', None),
                'window_width': getattr(ds, 'WindowWidth', None),
                
                # Equipment information
                'manufacturer': str(getattr(ds, 'Manufacturer', '')),
                'manufacturer_model_name': str(getattr(ds, 'ManufacturerModelName', '')),
                'station_name': str(getattr(ds, 'StationName', '')),
            }
            
            return metadata
            
        except Exception as e:
            raise Exception(f"Error reading DICOM metadata: {str(e)}")
    
    @staticmethod
    def dicom_to_image(file_path: str, window_center: Optional[float] = None, 
                      window_width: Optional[float] = None) -> str:
        """Convert DICOM to base64 encoded PNG image"""
        try:
            ds = pydicom.dcmread(file_path)
            
            # Get pixel array
            pixel_array = ds.pixel_array.astype(float)
            
            # Apply window/level if provided
            if window_center is not None and window_width is not None:
                pixel_array = DicomProcessor._apply_window_level(
                    pixel_array, window_center, window_width
                )
            else:
                # Auto-normalize
                pixel_array = DicomProcessor._normalize_pixel_array(pixel_array)
            
            # Convert to 8-bit
            pixel_array = (pixel_array * 255).astype(np.uint8)
            
            # Handle different image orientations
            if len(pixel_array.shape) == 3:
                # Multi-frame or color image
                if pixel_array.shape[2] == 3:
                    # RGB image
                    image = Image.fromarray(pixel_array, 'RGB')
                else:
                    # Take first frame for multi-frame
                    image = Image.fromarray(pixel_array[0], 'L')
            else:
                # Grayscale image
                image = Image.fromarray(pixel_array, 'L')
            
            # Convert to base64
            img_buffer = io.BytesIO()
            image.save(img_buffer, format='PNG')
            img_str = base64.b64encode(img_buffer.getvalue()).decode()
            
            return f"data:image/png;base64,{img_str}"
            
        except Exception as e:
            raise Exception(f"Error converting DICOM to image: {str(e)}")
    
    @staticmethod
    def _normalize_pixel_array(pixel_array: np.ndarray) -> np.ndarray:
        """Normalize pixel array to 0-1 range"""
        min_val = pixel_array.min()
        max_val = pixel_array.max()
        
        if max_val > min_val:
            return (pixel_array - min_val) / (max_val - min_val)
        else:
            return np.zeros_like(pixel_array)
    
    @staticmethod
    def _apply_window_level(pixel_array: np.ndarray, center: float, width: float) -> np.ndarray:
        """Apply window/level transformation"""
        min_val = center - width / 2
        max_val = center + width / 2
        
        # Clip values to window range
        windowed = np.clip(pixel_array, min_val, max_val)
        
        # Normalize to 0-1
        if max_val > min_val:
            windowed = (windowed - min_val) / (max_val - min_val)
        else:
            windowed = np.zeros_like(windowed)
        
        return windowed
    
    @staticmethod
    def get_image_dimensions(file_path: str) -> Tuple[int, int]:
        """Get image dimensions from DICOM file"""
        try:
            ds = pydicom.dcmread(file_path)
            rows = getattr(ds, 'Rows', 0)
            columns = getattr(ds, 'Columns', 0)
            return (rows, columns)
        except Exception:
            return (0, 0)
    
    @staticmethod
    def validate_dicom_file(file_path: str) -> bool:
        """Validate if file is a valid DICOM file"""
        try:
            pydicom.dcmread(file_path)
            return True
        except Exception:
            return False
    
    @staticmethod
    def get_series_info(file_paths: list) -> Dict[str, list]:
        """Group DICOM files by series"""
        series_dict = {}
        
        for file_path in file_paths:
            try:
                ds = pydicom.dcmread(file_path)
                series_uid = str(getattr(ds, 'SeriesInstanceUID', 'unknown'))
                
                if series_uid not in series_dict:
                    series_dict[series_uid] = []
                
                series_dict[series_uid].append({
                    'file_path': file_path,
                    'instance_number': getattr(ds, 'InstanceNumber', 0),
                    'slice_location': getattr(ds, 'SliceLocation', 0)
                })
                
            except Exception:
                continue
        
        # Sort each series by instance number or slice location
        for series_uid in series_dict:
            series_dict[series_uid].sort(
                key=lambda x: (x['instance_number'], x['slice_location'])
            )
        
        return series_dict