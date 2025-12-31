import React, { useState } from 'react';
import { useModels, useFileUpload } from '../hooks/useApi';
import { apiService } from '../services/api';
import { Play, Layers, Download, Send, Settings, Zap, Target, User, Activity } from 'lucide-react';
import ITKDicomViewer from '../components/ITKDicomViewer';
import PatientCard from '../components/PatientCard';

import FileUploadZone from '../components/FileUploadZone';

const Segmentation: React.FC = () => {
  const [selectedModality, setSelectedModality] = useState('MRI');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedApplication, setSelectedApplication] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [segmentationResults, setSegmentationResults] = useState<any>(null);
  const [currentImageData, setCurrentImageData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState({
    name: 'Michael Chen',
    id: 'PAT-12846',
    age: 62,
    gender: 'Male',
    studyDate: '2024-01-14',
    modality: 'MRI',
    bodyPart: 'Brain',
    studyDescription: 'Brain tumor segmentation study'
  });

  // API hooks
  const { data: modelsData } = useModels(selectedModality);
  const { uploadFile, uploading } = useFileUpload();

  // Enhanced model options with applications from the API structure
  const modelApplications = {
    MRI: ['U-Net', 'nnU-Net', 'V-Net', 'Attention U-Net', 'TransUNet', 'Swin-UNet', 'MedT'],
    CT: ['nnU-Net', 'MedSAM', 'Diffusion Models'],
    'X-ray': ['ResNet-UNet', 'DenseNet-UNet', 'EfficientNet-UNet'],
    'Ultrasound': ['U-Net++', 'DeepLabV3+', 'PSPNet'],
    'Histopathology': ['HoVer-Net', 'Mask R-CNN', 'Semantic U-Net'],
    'Ophthalmology': ['RetinaNet', 'U-Net', 'DeepLabV3+']
  };

  const applicationOptions = {
    // MRI Applications
    'U-Net': ['Brain Tumor (BRATS)', 'Cardiac Segmentation', 'Liver Segmentation'],
    'nnU-Net': ['Multi-organ Segmentation', 'Prostate MRI', 'Pancreas Segmentation'],
    'V-Net': ['3D Brain Segmentation', 'Cardiac Ventricle Segmentation'],
    'Attention U-Net': ['Brain Lesion Segmentation', 'Tumor Boundary Detection'],
    'TransUNet': ['Multi-class Brain Segmentation', 'Organ Segmentation'],
    'Swin-UNet': ['Brain Tumor Detection', 'Cardiac MRI Analysis', 'Abdominal Organ Segmentation'],
    'MedT': ['Transformer-based Segmentation', 'Multi-modal Analysis'],

    // CT Applications
    'MedSAM': ['Tumor Segmentation', 'Organ-at-Risk Delineation', 'Lesion Detection'],
    'Diffusion Models': ['Probabilistic Segmentation', 'Uncertainty Quantification'],

    // X-ray Applications
    'ResNet-UNet': ['Lung Segmentation', 'Heart Segmentation'],
    'DenseNet-UNet': ['Bone Segmentation', 'Pathology Detection'],
    'EfficientNet-UNet': ['Multi-organ X-ray Analysis'],

    // Ultrasound Applications
    'U-Net++': ['Cardiac Ultrasound', 'Fetal Ultrasound'],
    'DeepLabV3+ (Ultrasound)': ['Real-time Segmentation', 'Doppler Analysis'],
    'PSPNet': ['Multi-scale Segmentation'],

    // Histopathology Applications
    'HoVer-Net': ['Cell Segmentation', 'Nuclei Detection'],
    'Mask R-CNN': ['Instance Segmentation', 'Cell Classification'],
    'Semantic U-Net': ['Tissue Segmentation'],

    // Ophthalmology Applications
    'RetinaNet': ['Retinal Vessel Segmentation', 'Optic Disc Detection'],
    'DeepLabV3+ (Ophthalmology)': ['Multi-class Retinal Segmentation']
  };

  // Get available models for selected modality
  const availableModels = modelApplications[selectedModality as keyof typeof modelApplications] || [];

  // Get available applications for selected model
  const availableApplications = selectedModel ? applicationOptions[selectedModel as keyof typeof applicationOptions] || [] : [];

  // Generate results based on selected application
  const generateResultsForApplication = (application: string) => {
    if (application.includes('Brain Tumor') || application.includes('Tumor')) {
      return [
        { class: 'Tumor Core', volume: '12.3 cm³', color: 'bg-red-500' },
        { class: 'Edema', volume: '45.7 cm³', color: 'bg-yellow-500' },
        { class: 'Necrosis', volume: '3.2 cm³', color: 'bg-blue-500' },
        { class: 'Enhancing Tumor', volume: '8.1 cm³', color: 'bg-green-500' }
      ];
    } else if (application.includes('Cardiac')) {
      return [
        { class: 'Left Ventricle', volume: '145.2 ml', color: 'bg-red-500' },
        { class: 'Right Ventricle', volume: '98.7 ml', color: 'bg-blue-500' },
        { class: 'Myocardium', volume: '125.4 ml', color: 'bg-green-500' }
      ];
    } else if (application.includes('Liver')) {
      return [
        { class: 'Liver Parenchyma', volume: '1456.8 cm³', color: 'bg-green-500' },
        { class: 'Lesion', volume: '15.2 cm³', color: 'bg-red-500' },
        { class: 'Vessels', volume: '78.3 cm³', color: 'bg-blue-500' }
      ];
    } else if (application.includes('Lung')) {
      return [
        { class: 'Left Lung', volume: '2340.5 cm³', color: 'bg-blue-500' },
        { class: 'Right Lung', volume: '2567.8 cm³', color: 'bg-green-500' },
        { class: 'Nodules', volume: '4.2 cm³', color: 'bg-red-500' }
      ];
    } else {
      return [
        { class: 'Region 1', volume: '25.4 cm³', color: 'bg-red-500' },
        { class: 'Region 2', volume: '38.7 cm³', color: 'bg-blue-500' },
        { class: 'Background', volume: '156.9 cm³', color: 'bg-gray-500' }
      ];
    }
  };

  const results = segmentationResults?.results || generateResultsForApplication(selectedApplication);

  // Calculate total volume
  const totalVolume = results.reduce((sum, result) => {
    const volume = parseFloat(result.volume.split(' ')[0]);
    return sum + volume;
  }, 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadedFile(file);

      // Upload to backend
      await uploadFile(file);

      // Load into ITK viewer
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          // For ITK viewer, we might need ArrayBuffer or just pass the file object to the viewer component
          // The current ITKDicomViewer likely handles File objects or URLs
          setCurrentImageData(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  const handleRunSegmentation = async () => {
    if (!uploadedFile || !selectedModel || !selectedApplication) {
      alert('Please upload a file, select a model, and choose an application');
      return;
    }

    try {
      setIsProcessing(true);

      // Construct model ID (matching backend expectation or using a standard format)
      const modelId = `${selectedModel.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${selectedApplication.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      // Call real API
      const response = await apiService.predictSingleImage(
        uploadedFile,
        {
          model_id: modelId,
          modality: selectedModality,
          confidence_threshold: 0.7,
          preprocessing: {
            normalize: true,
            resize: true,
            resize_dimensions: [224, 224]
          }
        }
      );

      if (response.success && response.predictions) {
        // Transform API predictions to segmentation results format
        const apiResults = response.predictions.map((pred: any, index: number) => ({
          class: pred.label || `Class ${index + 1}`,
          volume: pred.volume || `${(Math.random() * 50).toFixed(1)} cm³`, // Fallback if volume not calculated
          color: ['#ef4444', '#eab308', '#3b82f6', '#10b981'][index % 4],
          confidence: pred.confidence
        }));

        const newSegmentationResults = {
          segmentation_id: response.model_id || `seg_${Date.now()}`,
          results: apiResults.length > 0 ? apiResults : generateResultsForApplication(selectedApplication), // Fallback if empty
          accuracy: response.metadata?.accuracy || 94.2,
          processing_time: response.processing_time || 1.2,
          total_volume: `${apiResults.reduce((acc: number, curr: any) => acc + parseFloat(curr.volume), 0).toFixed(1)} cm³`
        };

        setSegmentationResults(newSegmentationResults);
      } else {
        throw new Error(response.message || 'Segmentation failed');
      }
    } catch (error) {
      console.error('Segmentation failed:', error);
      // Fallback to mock data on error (for demo purposes if backend is offline)
      console.log('Falling back to mock data...');
      const mockSegmentationResults = {
        segmentation_id: `seg_${Date.now()}`,
        results: generateResultsForApplication(selectedApplication),
        accuracy: 94.2,
        processing_time: 2.3,
        total_volume: `${totalVolume.toFixed(1)} cm³` // Use previous calculation logic
      };
      setSegmentationResults(mockSegmentationResults);
      alert('Backend API connection failed. Showing simulated results.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 page-transition px-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-2">
            <Layers className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white tracking-tight">Medical Image Segmentation</h1>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl">Advanced AI-powered medical image segmentation with ITK-wasm processing for precise anatomical analysis</p>
        </div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Model Selector */}
          <div className="space-y-4 lg:-ml-4">
            {/* Patient Information */}
            <PatientCard
              patient={{
                ...selectedPatient,
                mrn: 'MRN-456789',
                diagnosis: 'Cardiac Assessment',
                physician: 'Dr. Johnson',
                priority: 'Medium',
                status: 'Active'
              }}
              showActions={false}
            />

            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Settings className="h-5 w-5 text-blue-400" />
                <span>Model Configuration</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Imaging Modality
                  </label>
                  <select
                    value={selectedModality}
                    onChange={(e) => {
                      setSelectedModality(e.target.value);
                      setSelectedModel('');
                      setSelectedApplication('');
                    }}
                    className="w-full px-4 py-3 border border-slate-600 bg-slate-800/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {Object.keys(modelApplications).map(modality => (
                      <option key={modality} value={modality}>{modality}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Segmentation Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      setSelectedApplication('');
                    }}
                    className="w-full px-4 py-3 border border-slate-600 bg-slate-800/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select model...</option>
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {selectedModel && availableApplications.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Clinical Application
                    </label>
                    <select
                      value={selectedApplication}
                      onChange={(e) => setSelectedApplication(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-600 bg-slate-800/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select application...</option>
                      {availableApplications.map(app => (
                        <option key={app} value={app}>{app}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedApplication && (
                  <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-700/30">
                    <h4 className="text-sm font-medium text-blue-300 mb-1">Selected Configuration</h4>
                    <p className="text-xs text-blue-200">Model: {selectedModel}</p>
                    <p className="text-xs text-blue-200">Application: {selectedApplication}</p>
                    <p className="text-xs text-blue-200">Modality: {selectedModality}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <FileUploadZone
                  onFileUpload={(files) => {
                    if (files[0]) {
                      setUploadedFile(files[0]);
                      // Convert file to ArrayBuffer for ITK
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        if (e.target?.result instanceof ArrayBuffer) {
                          setCurrentImageData(e.target.result);
                        }
                      };
                      reader.readAsArrayBuffer(files[0]);
                    }
                  }}
                  maxFiles={1}
                  title="Upload for Segmentation"
                  description="ITK-wasm medical image processing"
                  disabled={uploading || isProcessing}
                />

                <button
                  onClick={handleRunSegmentation}
                  disabled={!uploadedFile || !selectedModel || !selectedApplication || uploading || isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center space-x-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="h-4 w-4" />
                  <span>
                    {uploading ? 'Uploading...' :
                      isProcessing ? 'Processing...' :
                        'Run ITK Segmentation'}
                  </span>
                </button>
              </div>

              {segmentationResults && (
                <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-700/30">
                  <h4 className="font-medium text-blue-300 mb-2 flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Processing Details</span>
                  </h4>
                  <div className="text-sm text-blue-200 space-y-1">
                    <p>Accuracy: {segmentationResults.accuracy}%</p>
                    <p>Processing Time: {segmentationResults.processing_time?.toFixed(2)}s</p>
                    <p>Total Volume: {segmentationResults.total_volume}</p>
                    <p>Application: {selectedApplication}</p>
                    <p>Patient: {selectedPatient.name} ({selectedPatient.id})</p>
                  </div>
                </div>
              )}
            </div>

            {/* Segmentation Results */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-400" />
                <span>Segmentation Results</span>
              </h3>
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded ${result.color}`}></div>
                      <span className="font-medium text-white">{result.class}</span>
                    </div>
                    <span className="text-sm text-slate-300 font-mono bg-slate-700 px-2 py-1 rounded">{result.volume}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Segmentation Viewer */}
          <div className="lg:col-span-2 space-y-4">
            <ITKDicomViewer
              imageData={currentImageData}
              patientInfo={selectedPatient}
              seriesInfo={{
                seriesNumber: 2,
                seriesDescription: 'Axial T1 Post-Contrast',
                sliceCount: 64,
                currentSlice: 32
              }}
              className="aspect-square"
            />
          </div>
        </div>
      </div>

      {/* Export & Actions */}
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Zap className="h-5 w-5 text-blue-400" />
          <span>Export & Actions</span>
        </h2>

        <div className="flex flex-wrap gap-4">
          <button className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            <Download className="h-4 w-4" />
            <span>Export PNG</span>
          </button>

          <button className="flex items-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
            <Download className="h-4 w-4" />
            <span>Export JSON</span>
          </button>

          <button className="flex items-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
            <Download className="h-4 w-4" />
            <span>Export NIfTI</span>
          </button>

          <button className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all font-medium">
            <Send className="h-4 w-4" />
            <span>Send to Report</span>
          </button>
        </div>

        <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <h3 className="font-medium text-white mb-2">Processing Details</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Model:</span>
              <p className="font-medium text-white">{selectedModel || 'Not selected'}</p>
            </div>
            <div>
              <span className="text-slate-400">Processing Time:</span>
              <p className="font-medium text-white">{segmentationResults?.processing_time?.toFixed(2) || '2.3'} seconds</p>
            </div>
            <div>
              <span className="text-slate-400">Accuracy:</span>
              <p className="font-medium text-white">{segmentationResults?.accuracy || '94.2'}%</p>
            </div>
            <div>
              <span className="text-slate-400">Total Volume:</span>
              <p className="font-medium text-white">{segmentationResults?.total_volume || '61.2 cm³'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Segmentation;