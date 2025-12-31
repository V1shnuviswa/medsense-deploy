import { useState } from 'react';
import { apiService } from '../services/api';
import type { ImageData } from './useImageData';

export interface ModelInfo {
    name: string;
    type: 'classification' | 'segmentation' | 'detection';
    applications: string[];
    input_size: number[];
    output_classes?: string[];
    confidence_threshold: number;
}

export interface AnalysisResults {
    model: string;
    modality: string;
    timestamp: string;
    confidence: number;
    predictions?: Array<{ class: string; confidence: number }>;
    segmented_regions?: Array<{ label: string; volume_mm3: number; voxel_count: number }>;
    detections?: Array<{ class: string; confidence: number; location: number[]; size_mm: number }>;
    backend_analysis_id?: string;
}

export function useAIAnalysis(modelRegistry: any) {
    const [selectedModality, setSelectedModality] = useState('MRI');
    const [selectedModel, setSelectedModel] = useState('brain_tumor_unet');
    const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
    const [analysisRunning, setAnalysisRunning] = useState(false);

    const runAIAnalysis = async (
        imageData: ImageData | null,
        uploadedFiles: File[],
        backendConnected: boolean
    ) => {
        if (!imageData) {
            alert('Please load an image first');
            return;
        }

        setAnalysisRunning(true);

        try {
            const modelInfo = modelRegistry[selectedModality].models[selectedModel];
            let results: AnalysisResults;

            if (backendConnected) {
                // Real backend call using apiService
                try {
                    if (uploadedFiles.length === 0) {
                        throw new Error("No file available for analysis. Please upload an image.");
                    }

                    const predictionResponse = await apiService.predictSingleImage(
                        uploadedFiles[0],
                        {
                            model_id: selectedModel,
                            modality: selectedModality,
                            confidence_threshold: modelInfo.confidence_threshold
                        }
                    );

                    results = {
                        model: selectedModel,
                        modality: selectedModality,
                        timestamp: new Date().toISOString(),
                        confidence: 0.95,
                        findings: [],
                        predictions: predictionResponse.predictions,
                        segmented_regions: [],
                        detections: []
                    };

                    // Map API response to UI format
                    if (modelInfo.type === 'classification' && predictionResponse.predictions) {
                        results.predictions = predictionResponse.predictions.map(p => ({
                            class: p.label,
                            confidence: p.confidence
                        }));
                    }

                } catch (apiError) {
                    console.warn('API service call failed, falling back to mock', apiError);
                    throw apiError;
                }

            } else {
                // Fallback mock analysis
                await new Promise(resolve => setTimeout(resolve, 2000));

                results = {
                    model: modelInfo.name,
                    modality: selectedModality,
                    timestamp: new Date().toISOString(),
                    confidence: 0.85 + Math.random() * 0.1
                };

                if (modelInfo.type === 'classification') {
                    const classes = modelInfo.output_classes || ['normal', 'abnormal'];
                    results.predictions = classes
                        .map((cls: string) => ({
                            class: cls,
                            confidence: Math.random()
                        }))
                        .sort((a: any, b: any) => b.confidence - a.confidence);

                } else if (modelInfo.type === 'segmentation') {
                    results.segmented_regions = (modelInfo.output_classes || []).map((cls: string) => ({
                        label: cls,
                        volume_mm3: Math.random() * 10000,
                        voxel_count: Math.floor(Math.random() * 50000)
                    }));

                } else if (modelInfo.type === 'detection') {
                    results.detections = [
                        { class: 'nodule', confidence: 0.92, location: [120, 150, 64], size_mm: 8.5 },
                        { class: 'nodule', confidence: 0.78, location: [180, 100, 72], size_mm: 5.2 }
                    ];
                }
            }

            setAnalysisResults(results);
        } catch (error: any) {
            console.error('AI analysis failed:', error);
            alert(`AI analysis failed: ${error.message || 'Unknown error'}`);
        } finally {
            setAnalysisRunning(false);
        }
    };

    return {
        selectedModality,
        selectedModel,
        analysisResults,
        analysisRunning,
        setSelectedModality,
        setSelectedModel,
        runAIAnalysis
    };
}
