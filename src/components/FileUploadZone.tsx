import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';

interface FileUploadZoneProps {
  onFileUpload: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
  maxSizeMB?: number;
  title?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileUpload,
  acceptedTypes = ['.dcm', '.nii', '.nii.gz', '.nrrd', '.mha', '.mhd'],
  maxFiles = 10,
  maxSizeMB = 500,
  title = 'Upload Medical Images',
  description = 'Drag & drop or click to select',
  className = '',
  disabled = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB (max: ${maxSizeMB}MB)`;
    }

    // Check file type
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.some(type => file.name.toLowerCase().endsWith(type.toLowerCase()))) {
      return `Unsupported file type: ${extension}`;
    }

    return null;
  };

  const handleFiles = useCallback((files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    // Validate each file
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    // Check total file count
    if (uploadedFiles.length + validFiles.length > maxFiles) {
      newErrors.push(`Too many files. Maximum: ${maxFiles}`);
      return;
    }

    setErrors(newErrors);
    
    if (validFiles.length > 0) {
      const allFiles = [...uploadedFiles, ...validFiles];
      setUploadedFiles(allFiles);
      onFileUpload(validFiles);
    }
  }, [uploadedFiles, maxFiles, onFileUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles, disabled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
          dragActive 
            ? 'border-cyan-400 bg-cyan-900/20' 
            : disabled
            ? 'border-slate-600 bg-slate-800/20 opacity-50 cursor-not-allowed'
            : 'border-slate-600 hover:border-cyan-400 bg-slate-800/30 hover:bg-slate-800/50 cursor-pointer'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
          id="file-upload-itk"
          disabled={disabled}
        />
        <label htmlFor="file-upload-itk" className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}>
          <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
            dragActive ? 'text-cyan-400' : 'text-slate-400'
          }`} />
          <p className="text-lg font-medium text-white mb-2">{title}</p>
          <p className="text-sm text-slate-400 mb-2">{description}</p>
          <p className="text-xs text-slate-500">
            Supports: {acceptedTypes.join(', ')} • Max: {maxSizeMB}MB per file
          </p>
        </label>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-300">Upload Errors</span>
            </div>
            <button
              onClick={clearErrors}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="text-sm text-red-200 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span>Uploaded Files ({uploadedFiles.length})</span>
            </h3>
            <button
              onClick={() => setUploadedFiles([])}
              className="text-slate-400 hover:text-red-400 transition-colors text-sm"
            >
              Clear All
            </button>
          </div>
          
          <div className="max-h-32 overflow-y-auto space-y-1">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  <span className="text-slate-300 truncate">{file.name}</span>
                  <span className="text-slate-500 text-xs">
                    ({(file.size / (1024 * 1024)).toFixed(1)}MB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-slate-400 hover:text-red-400 transition-colors ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;