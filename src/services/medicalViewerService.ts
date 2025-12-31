// Medical Image Viewer Backend Integration Service
import { apiService } from './api';

export interface DicomUploadResponse {
  success: boolean;
  study_id: string;
  files: Array<{
    id: string;
    filename: string;
    series_number?: number;
    instance_number?: number;
  }>;
  message: string;
}

export interface DicomImageResponse {
  image: string; // base64 encoded image
  metadata: {
    patient_name: string;
    study_date: string;
    modality: string;
    series_number: string;
    instance_number: string;
  };
}

export interface VLMAnalysisResponse {
  analysis_id: string;
  findings: Array<{
    region: string;
    finding: string;
    confidence: number;
    severity: string;
  }>;
  confidence_scores: {
    overall: number;
  };
  reasoning_trace: string;
}

export interface VLMChatResponse {
  response: string;
}

export interface SegmentationResponse {
  segmentation_id: string;
  results: Array<{
    class: string;
    volume: string;
    color: string;
  }>;
  accuracy: number;
  processing_time: number;
  total_volume: string;
}

class MedicalViewerService {
  private baseUrl = 'http://localhost:5000/api';

  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private getFormHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async uploadDicomFiles(files: FileList, patientId: string, modality: string, description: string): Promise<DicomUploadResponse> {
    try {
      const formData = new FormData();
      
      // Add files
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      
      // Add metadata
      formData.append('patient_id', patientId);
      formData.append('modality', modality);
      formData.append('description', description);

      const response = await fetch(`${this.baseUrl}/upload/dicom`, {
        method: 'POST',
        headers: this.getFormHeaders(),
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('DICOM upload failed:', error);
      throw error;
    }
  }

  async getDicomImage(fileId: string): Promise<DicomImageResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/dicom/${fileId}/image`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get DICOM image: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get DICOM image:', error);
      throw error;
    }
  }

  async runVLMAnalysis(studyId: string): Promise<VLMAnalysisResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/vlm/analyze`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ study_id: studyId }),
      });

      if (!response.ok) {
        throw new Error(`VLM analysis failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('VLM analysis failed:', error);
      throw error;
    }
  }

  async chatWithVLM(message: string, studyId: string): Promise<VLMChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/vlm/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ 
          message: message,
          study_id: studyId 
        }),
      });

      if (!response.ok) {
        throw new Error(`VLM chat failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('VLM chat failed:', error);
      throw error;
    }
  }

  async runSegmentation(studyId: string, modelName: string, application: string): Promise<SegmentationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/segmentation/run`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          study_id: studyId,
          model_name: modelName,
          application: application
        }),
      });

      if (!response.ok) {
        throw new Error(`Segmentation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Segmentation failed:', error);
      throw error;
    }
  }

  async createReport(reportData: {
    study_id: string;
    template_name: string;
    impression: string;
    findings: string;
    recommendations: string;
    technique: string;
  }): Promise<{ report_id: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/reports`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        throw new Error(`Report creation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Report creation failed:', error);
      throw error;
    }
  }

  async getReport(reportId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${reportId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get report: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get report:', error);
      throw error;
    }
  }

  async updateReport(reportId: string, updates: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${reportId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update report: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update report:', error);
      throw error;
    }
  }

  async getDashboardStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/dashboard/stats`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get dashboard stats: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      throw error;
    }
  }

  async getRecentActivity(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/dashboard/recent-activity`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get recent activity: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get recent activity:', error);
      throw error;
    }
  }

  // Helper method to convert File to ArrayBuffer for ITK processing
  async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Helper method to validate medical image files
  validateMedicalImageFile(file: File): { valid: boolean; error?: string } {
    const allowedExtensions = ['.dcm', '.nii', '.nii.gz', '.nrrd', '.mha', '.mhd'];
    const maxSize = 500 * 1024 * 1024; // 500MB

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB (max: 500MB)`
      };
    }

    // Check file extension
    const hasValidExtension = allowedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      return {
        valid: false,
        error: `Unsupported file type. Supported: ${allowedExtensions.join(', ')}`
      };
    }

    return { valid: true };
  }
}

export const medicalViewerService = new MedicalViewerService();
export default medicalViewerService;