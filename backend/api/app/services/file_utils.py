import os
import shutil
import tempfile
import zipfile
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple, Union
from datetime import datetime
import hashlib
import mimetypes
from PIL import Image
import magic  # python-magic for file type detection

from app.config import get_settings
from app.schemas.imaging import FileValidation, FileUploadResponse

logger = logging.getLogger(__name__)
settings = get_settings()

class FileUtilsService:
    """Utility service for file handling and validation"""
    
    def __init__(self):
        self.temp_dir = Path(settings.create_temp_dir())
        self.max_file_size = settings.max_file_size
        self.allowed_extensions = settings.allowed_file_extensions
        
        # Ensure temp directory exists
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    def validate_file(self, file_path: str, filename: str) -> FileValidation:
        """Comprehensive file validation"""
        try:
            file_path = Path(file_path)
            
            if not file_path.exists():
                return FileValidation(
                    is_valid=False,
                    file_type="unknown",
                    file_size=0,
                    validation_errors=["File does not exist"]
                )
            
            # Get file info
            file_size = file_path.stat().st_size
            file_type = self._detect_file_type(str(file_path), filename)
            validation_errors = []
            metadata = {}
            
            # Size validation
            if file_size > self.max_file_size:
                validation_errors.append(
                    f"File too large: {file_size} bytes (max: {self.max_file_size})"
                )
            
            if file_size == 0:
                validation_errors.append("File is empty")
            
            # Extension validation
            if not self._is_extension_allowed(filename):
                validation_errors.append(
                    f"File extension not allowed. Allowed: {self.allowed_extensions}"
                )
            
            # Content validation based on file type
            content_validation = self._validate_file_content(file_path, file_type)
            validation_errors.extend(content_validation["errors"])
            metadata.update(content_validation["metadata"])
            
            return FileValidation(
                is_valid=len(validation_errors) == 0,
                file_type=file_type,
                file_size=file_size,
                validation_errors=validation_errors,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"File validation failed: {e}")
            return FileValidation(
                is_valid=False,
                file_type="unknown",
                file_size=0,
                validation_errors=[f"Validation error: {str(e)}"]
            )
    
    def save_uploaded_file(
        self, 
        file_content: bytes, 
        filename: str, 
        file_id: Optional[str] = None
    ) -> FileUploadResponse:
        """Save uploaded file to temporary storage"""
        try:
            # Generate file ID if not provided
            if not file_id:
                file_id = self._generate_file_id(filename, file_content)
            
            # Create file path
            file_extension = Path(filename).suffix
            file_path = self.temp_dir / f"{file_id}{file_extension}"
            
            # Save file
            with open(file_path, 'wb') as f:
                f.write(file_content)
            
            # Validate saved file
            validation = self.validate_file(str(file_path), filename)
            
            if not validation.is_valid:
                # Remove invalid file
                file_path.unlink(missing_ok=True)
                raise ValueError(f"File validation failed: {validation.validation_errors}")
            
            return FileUploadResponse(
                success=True,
                file_id=file_id,
                filename=filename,
                file_size=len(file_content),
                file_type=validation.file_type,
                upload_time=datetime.now(),
                message="File uploaded successfully"
            )
            
        except Exception as e:
            logger.error(f"File upload failed: {e}")
            raise ValueError(f"File upload failed: {str(e)}")
    
    def get_file_path(self, file_id: str) -> Optional[Path]:
        """Get file path for given file ID"""
        # Search for file with this ID (any extension)
        for file_path in self.temp_dir.glob(f"{file_id}.*"):
            if file_path.is_file():
                return file_path
        return None
    
    def extract_zip_archive(self, zip_path: str, extract_to: Optional[str] = None) -> str:
        """Extract ZIP archive and return extraction directory"""
        try:
            zip_path = Path(zip_path)
            
            if not extract_to:
                extract_to = self.temp_dir / f"extract_{int(datetime.now().timestamp())}"
            
            extract_dir = Path(extract_to)
            extract_dir.mkdir(parents=True, exist_ok=True)
            
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                # Validate ZIP contents
                self._validate_zip_contents(zip_ref)
                zip_ref.extractall(extract_dir)
            
            logger.info(f"Extracted ZIP to: {extract_dir}")
            return str(extract_dir)
            
        except Exception as e:
            logger.error(f"ZIP extraction failed: {e}")
            raise ValueError(f"ZIP extraction failed: {str(e)}")
    
    def create_zip_archive(self, source_paths: List[str], output_path: str) -> str:
        """Create ZIP archive from source files/directories"""
        try:
            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zip_ref:
                for source_path in source_paths:
                    source = Path(source_path)
                    
                    if source.is_file():
                        zip_ref.write(source, source.name)
                    elif source.is_dir():
                        for file_path in source.rglob('*'):
                            if file_path.is_file():
                                archive_name = file_path.relative_to(source.parent)
                                zip_ref.write(file_path, archive_name)
            
            return output_path
            
        except Exception as e:
            logger.error(f"ZIP creation failed: {e}")
            raise ValueError(f"ZIP creation failed: {str(e)}")
    
    def cleanup_old_files(self, max_age_hours: int = 24) -> int:
        """Cleanup files older than specified hours"""
        try:
            current_time = datetime.now()
            cleanup_count = 0
            
            for file_path in self.temp_dir.rglob("*"):
                try:
                    if file_path.is_file():
                        file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                        age_hours = (current_time - file_time).total_seconds() / 3600
                        
                        if age_hours > max_age_hours:
                            file_path.unlink()
                            cleanup_count += 1
                    elif file_path.is_dir() and file_path != self.temp_dir:
                        # Check if directory is empty and old
                        if not any(file_path.iterdir()):
                            dir_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                            age_hours = (current_time - dir_time).total_seconds() / 3600
                            
                            if age_hours > max_age_hours:
                                file_path.rmdir()
                                cleanup_count += 1
                                
                except Exception as e:
                    logger.warning(f"Failed to cleanup {file_path}: {e}")
            
            logger.info(f"Cleaned up {cleanup_count} old files/directories")
            return cleanup_count
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            return 0
    
    def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Get comprehensive file information"""
        try:
            path = Path(file_path)
            
            if not path.exists():
                return {"error": "File does not exist"}
            
            stat = path.stat()
            
            info = {
                "filename": path.name,
                "size_bytes": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "file_type": self._detect_file_type(str(path), path.name),
                "extension": path.suffix,
                "is_readable": os.access(path, os.R_OK),
                "is_writable": os.access(path, os.W_OK)
            }
            
            # Add file-specific metadata
            if path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
                info.update(self._get_image_metadata(path))
            elif path.suffix.lower() in ['.nii', '.nii.gz']:
                info.update(self._get_nifti_metadata(path))
            elif path.suffix.lower() == '.zip':
                info.update(self._get_zip_metadata(path))
            
            return info
            
        except Exception as e:
            logger.error(f"Failed to get file info: {e}")
            return {"error": str(e)}
    
    def copy_file(self, source: str, destination: str) -> bool:
        """Copy file with error handling"""
        try:
            shutil.copy2(source, destination)
            logger.info(f"Copied file: {source} -> {destination}")
            return True
        except Exception as e:
            logger.error(f"File copy failed: {e}")
            return False
    
    def move_file(self, source: str, destination: str) -> bool:
        """Move file with error handling"""
        try:
            shutil.move(source, destination)
            logger.info(f"Moved file: {source} -> {destination}")
            return True
        except Exception as e:
            logger.error(f"File move failed: {e}")
            return False
    
    def delete_file(self, file_path: str) -> bool:
        """Delete file with error handling"""
        try:
            Path(file_path).unlink(missing_ok=True)
            logger.info(f"Deleted file: {file_path}")
            return True
        except Exception as e:
            logger.error(f"File deletion failed: {e}")
            return False
    
    def calculate_checksum(self, file_path: str, algorithm: str = "md5") -> str:
        """Calculate file checksum"""
        try:
            hash_algo = getattr(hashlib, algorithm.lower())()
            
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_algo.update(chunk)
            
            return hash_algo.hexdigest()
            
        except Exception as e:
            logger.error(f"Checksum calculation failed: {e}")
            raise ValueError(f"Checksum calculation failed: {str(e)}")
    
    def get_directory_size(self, directory: str) -> Dict[str, Any]:
        """Get directory size and file count"""
        try:
            dir_path = Path(directory)
            
            if not dir_path.exists() or not dir_path.is_dir():
                return {"error": "Directory does not exist"}
            
            total_size = 0
            file_count = 0
            dir_count = 0
            
            for item in dir_path.rglob("*"):
                if item.is_file():
                    total_size += item.stat().st_size
                    file_count += 1
                elif item.is_dir():
                    dir_count += 1
            
            return {
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "file_count": file_count,
                "directory_count": dir_count,
                "path": str(dir_path)
            }
            
        except Exception as e:
            logger.error(f"Directory size calculation failed: {e}")
            return {"error": str(e)}
    
    # Private helper methods
    def _detect_file_type(self, file_path: str, filename: str) -> str:
        """Detect file type using multiple methods"""
        try:
            # Try python-magic first
            mime_type = magic.from_file(file_path, mime=True)
            if mime_type:
                return mime_type
        except:
            pass
        
        # Fallback to mimetypes
        mime_type, _ = mimetypes.guess_type(filename)
        if mime_type:
            return mime_type
        
        # Fallback to extension-based detection
        extension = Path(filename).suffix.lower()
        extension_map = {
            '.dcm': 'application/dicom',
            '.nii': 'application/nifti',
            '.nii.gz': 'application/nifti+gzip',
            '.zip': 'application/zip',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.bmp': 'image/bmp',
            '.tiff': 'image/tiff'
        }
        
        return extension_map.get(extension, 'application/octet-stream')
    
    def _is_extension_allowed(self, filename: str) -> bool:
        """Check if file extension is allowed"""
        extension = Path(filename).suffix.lower()
        return extension in self.allowed_extensions
    
    def _validate_file_content(self, file_path: Path, file_type: str) -> Dict[str, Any]:
        """Validate file content based on type"""
        errors = []
        metadata = {}
        
        try:
            if 'image' in file_type:
                # Validate image files
                try:
                    with Image.open(file_path) as img:
                        metadata.update({
                            "image_format": img.format,
                            "image_mode": img.mode,
                            "image_size": img.size,
                            "has_transparency": img.mode in ('RGBA', 'LA') or 'transparency' in img.info
                        })
                except Exception as e:
                    errors.append(f"Invalid image file: {str(e)}")
            
            elif file_type == 'application/zip':
                # Validate ZIP files
                try:
                    with zipfile.ZipFile(file_path, 'r') as zip_ref:
                        file_list = zip_ref.namelist()
                        metadata.update({
                            "zip_file_count": len(file_list),
                            "zip_compressed_size": file_path.stat().st_size,
                            "zip_has_dicom": any(f.endswith('.dcm') for f in file_list)
                        })
                except Exception as e:
                    errors.append(f"Invalid ZIP file: {str(e)}")
            
            elif 'nifti' in file_type:
                # Validate NIfTI files
                try:
                    import nibabel as nib
                    nii = nib.load(str(file_path))
                    data = nii.get_fdata()
                    metadata.update({
                        "nifti_shape": data.shape,
                        "nifti_data_type": str(data.dtype),
                        "nifti_dimensions": len(data.shape)
                    })
                except Exception as e:
                    errors.append(f"Invalid NIfTI file: {str(e)}")
                    
        except Exception as e:
            errors.append(f"Content validation error: {str(e)}")
        
        return {"errors": errors, "metadata": metadata}
    
    def _validate_zip_contents(self, zip_ref: zipfile.ZipFile):
        """Validate ZIP file contents"""
        file_list = zip_ref.namelist()
        
        # Check for suspicious files
        suspicious_extensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs']
        for filename in file_list:
            ext = Path(filename).suffix.lower()
            if ext in suspicious_extensions:
                raise ValueError(f"Suspicious file type in ZIP: {filename}")
        
        # Check file count
        if len(file_list) > 10000:
            raise ValueError("ZIP contains too many files")
        
        # Check for zip bombs (basic check)
        total_size = sum(info.file_size for info in zip_ref.filelist)
        if total_size > 10 * 1024 * 1024 * 1024:  # 10GB uncompressed
            raise ValueError("ZIP file too large when uncompressed")
    
    def _generate_file_id(self, filename: str, content: bytes) -> str:
        """Generate unique file ID"""
        timestamp = str(int(datetime.now().timestamp()))
        content_hash = hashlib.md5(content).hexdigest()[:8]
        filename_hash = hashlib.md5(filename.encode()).hexdigest()[:4]
        return f"{timestamp}_{content_hash}_{filename_hash}"
    
    def _get_image_metadata(self, file_path: Path) -> Dict[str, Any]:
        """Get image-specific metadata"""
        try:
            with Image.open(file_path) as img:
                return {
                    "image_format": img.format,
                    "image_mode": img.mode,
                    "image_size": img.size,
                    "image_dpi": img.info.get('dpi', (0, 0))
                }
        except:
            return {"image_error": "Failed to read image metadata"}
    
    def _get_nifti_metadata(self, file_path: Path) -> Dict[str, Any]:
        """Get NIfTI-specific metadata"""
        try:
            import nibabel as nib
            nii = nib.load(str(file_path))
            data = nii.get_fdata()
            header = nii.header
            
            return {
                "nifti_shape": data.shape,
                "nifti_data_type": str(data.dtype),
                "nifti_voxel_size": header.get_zooms() if hasattr(header, 'get_zooms') else None,
                "nifti_orientation": str(nii.affine.shape)
            }
        except:
            return {"nifti_error": "Failed to read NIfTI metadata"}
    
    def _get_zip_metadata(self, file_path: Path) -> Dict[str, Any]:
        """Get ZIP-specific metadata"""
        try:
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                file_list = zip_ref.namelist()
                return {
                    "zip_file_count": len(file_list),
                    "zip_has_directories": any('/' in f for f in file_list),
                    "zip_total_uncompressed": sum(info.file_size for info in zip_ref.filelist)
                }
        except:
            return {"zip_error": "Failed to read ZIP metadata"}
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        try:
            temp_dir_info = self.get_directory_size(str(self.temp_dir))
            
            return {
                "temp_directory": str(self.temp_dir),
                "temp_dir_size": temp_dir_info,
                "max_file_size_mb": self.max_file_size / (1024 * 1024),
                "allowed_extensions": self.allowed_extensions,
                "service_healthy": True
            }
        except Exception as e:
            return {
                "service_healthy": False,
                "error": str(e)
            }