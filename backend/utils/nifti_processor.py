import nibabel as nib
import numpy as np
from PIL import Image
import io
import base64
import os
import dicom2nifti
from typing import Dict, Any, Optional, Tuple, List

class NiftiProcessor:
    """Utility class for processing NIfTI files and converting DICOM to NIfTI"""
    
    @staticmethod
    def read_nifti_metadata(file_path: str) -> Dict[str, Any]:
        """Extract metadata from NIfTI file"""
        try:
            img = nib.load(file_path)
            header = img.header
            
            metadata = {
                'dims': [int(d) for d in header.get_data_shape()],
                'voxel_sizes': [float(z) for z in header.get_zooms()],
                'data_type': str(header.get_data_dtype()),
                'affine': header.get_best_affine().tolist(),
                'description': str(header.get('descrip', b'').decode('utf-8', 'ignore').strip()),
                'intent_code': int(header.get('intent_code', 0)),
                'intent_name': str(header.get('intent_name', b'').decode('utf-8', 'ignore').strip()),
                'slice_duration': float(header.get('slice_duration', 0.0)),
                'time_units': int(header.get('xyzt_units', 0) & 0x38), # Mask for time units
                'spatial_units': int(header.get('xyzt_units', 0) & 0x07), # Mask for spatial units
                'qform_code': int(header.get('qform_code', 0)),
                'sform_code': int(header.get('sform_code', 0)),
            }
            
            return metadata
            
        except Exception as e:
            raise Exception(f"Error reading NIfTI metadata: {str(e)}")
    
    @staticmethod
    def nifti_to_image(file_path: str, slice_index: Optional[int] = None, 
                      axis: int = 2, window_center: Optional[float] = None, 
                      window_width: Optional[float] = None) -> str:
        """
        Convert NIfTI slice to base64 encoded PNG image
        axis: 0=sagittal, 1=coronal, 2=axial
        """
        try:
            img = nib.load(file_path)
            data = img.get_fdata()
            
            # Handle 4D data (time series) - take first volume
            if len(data.shape) > 3:
                data = data[..., 0]
                
            # Select slice
            if axis == 0:
                if slice_index is None: slice_index = data.shape[0] // 2
                slice_data = data[slice_index, :, :]
                # Rotate for display
                slice_data = np.rot90(slice_data)
            elif axis == 1:
                if slice_index is None: slice_index = data.shape[1] // 2
                slice_data = data[:, slice_index, :]
                slice_data = np.rot90(slice_data)
            else: # axis == 2 (axial)
                if slice_index is None: slice_index = data.shape[2] // 2
                slice_data = data[:, :, slice_index]
                slice_data = np.rot90(slice_data)
            
            # Normalize and window
            if window_center is not None and window_width is not None:
                slice_data = NiftiProcessor._apply_window_level(slice_data, window_center, window_width)
            else:
                slice_data = NiftiProcessor._normalize_pixel_array(slice_data)
            
            # Convert to 8-bit
            slice_data = (slice_data * 255).astype(np.uint8)
            
            image = Image.fromarray(slice_data, 'L')
            
            # Convert to base64
            img_buffer = io.BytesIO()
            image.save(img_buffer, format='PNG')
            img_str = base64.b64encode(img_buffer.getvalue()).decode()
            
            return f"data:image/png;base64,{img_str}"
            
        except Exception as e:
            raise Exception(f"Error converting NIfTI to image: {str(e)}")
    
    @staticmethod
    def convert_dicom_to_nifti(dicom_directory: str, output_folder: str) -> str:
        """
        Convert a directory of DICOM files to NIfTI
        Returns the path to the generated NIfTI file
        """
        try:
            os.makedirs(output_folder, exist_ok=True)
            
            # dicom2nifti converts the whole directory
            dicom2nifti.convert_directory(dicom_directory, output_folder, compression=True, reorient=True)
            
            # Find the generated file (it usually has a random name or based on series)
            generated_files = [f for f in os.listdir(output_folder) if f.endswith('.nii.gz') or f.endswith('.nii')]
            
            if not generated_files:
                raise Exception("No NIfTI file generated")
                
            # Return the first generated file (assuming one series per directory)
            return os.path.join(output_folder, generated_files[0])
            
        except Exception as e:
            raise Exception(f"Error converting DICOM to NIfTI: {str(e)}")

    @staticmethod
    def _normalize_pixel_array(pixel_array: np.ndarray) -> np.ndarray:
        """Normalize pixel array to 0-1 range"""
        min_val = np.nanmin(pixel_array)
        max_val = np.nanmax(pixel_array)
        
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
