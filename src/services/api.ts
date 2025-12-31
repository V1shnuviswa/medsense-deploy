// Advanced Medical Imaging API service for MedSense
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-backend-url.com/api'
  : 'http://localhost:5001/api';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

export interface ModelInfo {
  model_id: string;
  name: string;
  type: 'segmentation' | 'classification' | 'detection';
  modality: 'MRI' | 'CT' | 'X-ray' | 'Ultrasound';
  applications: string[];
  input_size: [number, number];
  output_classes?: string[];
  confidence_threshold: number;
  is_loaded: boolean;
  last_used?: string;
  loading_time?: number;
}

export interface DicomAnalysisResponse {
  success: boolean;
  series_count: number;
  series_info: Array<{
    series_uid: string;
    series_description: string;
    modality: string;
    slice_count: number;
    patient_id?: string;
    study_date?: string;
  }>;
  total_files: number;
  recommended_series?: string;
  detected_modality?: string;
  file_size_mb?: number;
}

export interface PredictionResult {
  label: string;
  confidence: number;
  bounding_box?: number[];
  mask?: string;
  probability_distribution?: Record<string, number>;
}

export interface PredictionResponse {
  success: boolean;
  model_id: string;
  modality: string;
  model_type: string;
  predictions: PredictionResult[];
  processing_time: number;
  slice_used?: number;
  preprocessing_applied: boolean;
  metadata: Record<string, any>;
}

export interface SegmentationResult {
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

export interface BatchProcessingResponse {
  success: boolean;
  job_id: string;
  total_files: number;
  model_count: number;
  message: string;
}

export interface JobStatusResponse {
  success: boolean;
  job: {
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    results?: any[];
    error_message?: string;
  };
}

export interface PerformanceComparisonResponse {
  success: boolean;
  comparison_id: string;
  models_compared: string[];
  modality: string;
  comparisons: Array<{
    model_a: string;
    model_b: string;
    metric_type: string;
    value_a: number;
    value_b: number;
    difference: number;
    p_value?: number;
    significant: boolean;
    winner?: string;
  }>;
  statistical_summary: Record<string, any>;
  recommendations: string[];
}

class AdvancedApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private getFormHeaders(): HeadersInit {
    const headers: HeadersInit = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Model Management
  async getAvailableModels(modality?: string): Promise<{
    success: boolean;
    models: ModelInfo[];
    total_count: number;
    loaded_count: number;
  }> {
    const params = modality ? `?modality=${modality}` : '';
    const response = await fetch(`${API_BASE_URL}/models/${params}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async loadModel(modality: string, modelId: string, forceReload = false): Promise<{
    success: boolean;
    message: string;
  }> {
    const params = forceReload ? '?force_reload=true' : '';
    const response = await fetch(`${API_BASE_URL}/models/${modality}/${modelId}/load${params}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async unloadModel(modality: string, modelId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/models/${modality}/${modelId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getModelCacheStats(): Promise<{
    success: boolean;
    cache_stats: Record<string, any>;
  }> {
    const response = await fetch(`${API_BASE_URL}/models/cache/stats`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // DICOM Processing
  async analyzeDicomFiles(file: File): Promise<DicomAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/dicom/analyze`, {
      method: 'POST',
      headers: this.getFormHeaders(),
      body: formData,
    });

    return this.handleResponse(response);
  }

  async convertDicomToNifti(file: File, config: {
    series_uid?: string;
    output_format?: string;
    target_orientation?: string;
    normalize_intensity?: boolean;
    anonymize?: boolean;
  }): Promise<{
    success: boolean;
    output_file: string;
    conversion_stats: Record<string, any>;
    processing_time: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('request_json', JSON.stringify(config));

    const response = await fetch(`${API_BASE_URL}/dicom/convert`, {
      method: 'POST',
      headers: this.getFormHeaders(),
      body: formData,
    });

    return this.handleResponse(response);
  }

  // Predictions
  async predictSingleImage(
    file: File,
    modelConfig: {
      model_id: string;
      modality: string;
      confidence_threshold?: number;
      preprocessing?: Record<string, any>;
    },
    sliceIndex?: number
  ): Promise<PredictionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model_config', JSON.stringify(modelConfig));

    if (sliceIndex !== undefined) {
      formData.append('slice_index', sliceIndex.toString());
    }

    const response = await fetch(`${API_BASE_URL}/predict/single`, {
      method: 'POST',
      headers: this.getFormHeaders(),
      body: formData,
    });

    return this.handleResponse(response);
  }

  async predictBatchImages(
    files: FileList,
    batchConfig: {
      model_configs: Array<{
        model_id: string;
        modality: string;
        confidence_threshold?: number;
        preprocessing?: Record<string, any>;
      }>;
      max_concurrent?: number;
    }
  ): Promise<BatchProcessingResponse> {
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    formData.append('batch_config', JSON.stringify(batchConfig));

    const response = await fetch(`${API_BASE_URL}/predict/batch`, {
      method: 'POST',
      headers: this.getFormHeaders(),
      body: formData,
    });

    return this.handleResponse(response);
  }

  // End-to-End Pipeline
  async runEndToEndPipeline(
    file: File,
    pipelineConfig: {
      dicom_config: Record<string, any>;
      model_config: {
        model_id: string;
        modality: string;
        confidence_threshold?: number;
      };
      generate_report?: boolean;
    }
  ): Promise<{
    success: boolean;
    job_id: string;
    message: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pipeline_config', JSON.stringify(pipelineConfig));

    const response = await fetch(`${API_BASE_URL}/pipeline/end-to-end`, {
      method: 'POST',
      headers: this.getFormHeaders(),
      body: formData,
    });

    return this.handleResponse(response);
  }

  // Job Management
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async listJobs(status?: string, limit = 50, offset = 0): Promise<{
    success: boolean;
    jobs: any[];
    total_count: number;
  }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await fetch(`${API_BASE_URL}/jobs?${params}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // Analysis and Performance
  async compareModelPerformance(request: {
    model_ids: string[];
    modality: string;
    metrics: string[];
    significance_threshold?: number;
  }): Promise<PerformanceComparisonResponse> {
    const response = await fetch(`${API_BASE_URL}/performance/compare-models`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse(response);
  }

  async performStatisticalAnalysis(request: {
    analysis_type: string;
    job_ids: string[];
    statistical_tests: string[];
    confidence_level?: number;
  }): Promise<{
    success: boolean;
    analysis_id: string;
    tests_performed: any[];
    conclusions: string[];
  }> {
    const response = await fetch(`${API_BASE_URL}/statistics/analyze`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse(response);
  }

  async assessImageQuality(request: {
    job_ids: string[];
    assessment_type?: string;
  }): Promise<{
    success: boolean;
    assessment_id: string;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/quality/assess`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse(response);
  }

  async generateVisualizations(request: {
    job_ids: string[];
    visualization_types: string[];
    variables?: string[];
  }): Promise<{
    success: boolean;
    visualizations: Array<{
      visualization_id: string;
      visualization_type: string;
      title: string;
      image_base64: string;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/visualizations/generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse(response);
  }

  async detectAnomalies(request: {
    job_ids: string[];
    detection_method?: string;
    contamination_rate?: number;
  }): Promise<{
    success: boolean;
    detection_id: string;
    anomalies_found: number;
    anomalous_cases: any[];
  }> {
    const response = await fetch(`${API_BASE_URL}/anomaly/detect`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse(response);
  }

  async generateReport(request: {
    analysis_ids: string[];
    template: string;
    include_visualizations?: boolean;
  }): Promise<{
    success: boolean;
    report: {
      report_id: string;
      sections: any[];
      conclusions: string[];
      recommendations: string[];
    };
    download_urls: Record<string, string>;
  }> {
    const response = await fetch(`${API_BASE_URL}/reports/generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse(response);
  }

  // File Management
  async uploadFile(file: File): Promise<{
    success: boolean;
    file_id: string;
    filename: string;
    file_size: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers: this.getFormHeaders(),
      body: formData,
    });

    return this.handleResponse(response);
  }

  async getFileInfo(fileId: string): Promise<{
    success: boolean;
    file_info: Record<string, any>;
  }> {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}/info`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async deleteFile(fileId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // System Health
  async getSystemHealth(): Promise<{
    status: string;
    version: string;
    services: Record<string, string>;
    system_info: Record<string, any>;
  }> {
    const response = await fetch(`${API_BASE_URL}/../health`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // Maintenance
  async cleanupResources(maxAgeHours = 24): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/maintenance/cleanup`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ max_age_hours: maxAgeHours }),
    });

    return this.handleResponse(response);
  }

  // Authentication (if needed)
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

// Create singleton instance
export const apiService = new AdvancedApiService();
export default apiService;