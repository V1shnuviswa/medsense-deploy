import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

// Generic hook for API calls
export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook for model management
export function useModels(modality?: string) {
  return useApi(
    () => apiService.getAvailableModels(modality),
    [modality]
  );
}

// Hook for job status polling
export function useJobStatus(jobId: string | null, pollInterval = 2000) {
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let intervalId: NodeJS.Timeout;

    const pollJobStatus = async () => {
      try {
        setLoading(true);
        const response = await apiService.getJobStatus(jobId);
        setJobStatus(response.job);
        
        // Stop polling if job is completed or failed
        if (response.job.status === 'completed' || response.job.status === 'failed') {
          clearInterval(intervalId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch job status');
        clearInterval(intervalId);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    pollJobStatus();

    // Set up polling
    intervalId = setInterval(pollJobStatus, pollInterval);

    return () => clearInterval(intervalId);
  }, [jobId, pollInterval]);

  return { jobStatus, loading, error };
}

// Hook for file upload with progress
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      // Simulate progress for now (in real implementation, use XMLHttpRequest for progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await apiService.uploadFile(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploadFile, uploading, progress, error };
}

// Hook for batch processing
export function useBatchProcessing() {
  const [processing, setProcessing] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startBatchProcessing = useCallback(async (
    files: FileList,
    modelConfigs: Array<{
      model_id: string;
      modality: string;
      confidence_threshold?: number;
    }>
  ) => {
    try {
      setProcessing(true);
      setError(null);
      
      const response = await apiService.predictBatchImages(files, {
        model_configs: modelConfigs,
        max_concurrent: 3
      });
      
      setJobId(response.job_id);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch processing failed');
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  return { startBatchProcessing, processing, jobId, error };
}

// Hook for model cache management
export function useModelCache() {
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refreshCacheStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getModelCacheStats();
      setCacheStats(response.cache_stats);
    } catch (err) {
      console.error('Failed to fetch cache stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModel = useCallback(async (modality: string, modelId: string) => {
    try {
      await apiService.loadModel(modality, modelId);
      await refreshCacheStats(); // Refresh stats after loading
    } catch (err) {
      throw err;
    }
  }, [refreshCacheStats]);

  const unloadModel = useCallback(async (modality: string, modelId: string) => {
    try {
      await apiService.unloadModel(modality, modelId);
      await refreshCacheStats(); // Refresh stats after unloading
    } catch (err) {
      throw err;
    }
  }, [refreshCacheStats]);

  useEffect(() => {
    refreshCacheStats();
  }, [refreshCacheStats]);

  return {
    cacheStats,
    loading,
    refreshCacheStats,
    loadModel,
    unloadModel
  };
}

// Hook for analysis results
export function useAnalysisResults(analysisIds: string[]) {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    if (analysisIds.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      
      const resultPromises = analysisIds.map(async (id) => {
        try {
          const response = await fetch(`${apiService}/results/${id}`);
          return { id, data: await response.json() };
        } catch (err) {
          return { id, error: err };
        }
      });

      const allResults = await Promise.all(resultPromises);
      const resultsMap: Record<string, any> = {};
      
      allResults.forEach(({ id, data, error }) => {
        resultsMap[id] = error ? { error } : data;
      });

      setResults(resultsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  }, [analysisIds]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return { results, loading, error, refetch: fetchResults };
}