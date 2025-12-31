import React, { useState, useEffect } from 'react';
import { useModels, useFileUpload, useJobStatus } from '../hooks/useApi';
import { apiService } from '../services/api';
import { Upload, Play, MessageCircle, Info, User, Calendar, Activity, Brain } from 'lucide-react';
import ITKDicomViewer from '../components/ITKDicomViewer';
import PatientCard from '../components/PatientCard';
import FileUploadZone from '../components/FileUploadZone';
import { MODEL_REGISTRY } from '../config/models';

const VLMAnalysis: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [selectedSlice, setSelectedSlice] = useState(0);
  const [currentImageData, setCurrentImageData] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [currentMessage, setCurrentMessage] = useState('');

  // Get available modalities from registry
  const modalities = Object.keys(MODEL_REGISTRY);
  const [selectedModality, setSelectedModality] = useState<string>(modalities[0]);

  // Get models for selected modality
  // @ts-ignore - Dynamic access to registry
  const availableModels = MODEL_REGISTRY[selectedModality]?.models || {};
  const modelKeys = Object.keys(availableModels);
  const [selectedModel, setSelectedModel] = useState<string>(modelKeys[0] || '');

  // Update selected model when modality changes
  useEffect(() => {
    // @ts-ignore
    const models = MODEL_REGISTRY[selectedModality]?.models || {};
    const keys = Object.keys(models);
    if (keys.length > 0) {
      setSelectedModel(keys[0]);
    }
  }, [selectedModality]);

  const [selectedPatient, setSelectedPatient] = useState({
    name: 'Sarah Johnson',
    id: 'PAT-12847',
    age: 45,
    gender: 'Female',
    studyDate: '2024-01-15',
    modality: 'MRI',
    bodyPart: 'Brain',
    studyDescription: 'Brain MRI with contrast'
  });

  // API hooks
  const { data: modelsData, loading: modelsLoading } = useModels();
  const { uploadFile, uploading, progress } = useFileUpload();
  const { jobStatus } = useJobStatus(analysisJobId);

  // Get findings from analysis results or use mock data
  const findings = analysisResults?.predictions || [
    { region: 'Left temporal lobe', finding: 'Hypointense lesion', confidence: 92, severity: 'High' },
    { region: 'Corpus callosum', finding: 'Normal morphology', confidence: 98, severity: 'Normal' },
    { region: 'Ventricles', finding: 'Mild dilation', confidence: 76, severity: 'Medium' },
    { region: 'White matter', finding: 'Age-related changes', confidence: 84, severity: 'Low' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploadedFiles(files);

      // Upload first file for analysis
      if (files[0]) {
        await uploadFile(files[0]);
        // Simulate loading image data
        const reader = new FileReader();
        reader.onload = (e) => {
          setCurrentImageData(e.target?.result as string);
        };
        reader.readAsDataURL(files[0]);
      }
    } catch (error) {
      console.error('File upload failed:', error);
    }
  };

  const handleRunAnalysis = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload files first');
      return;
    }

    try {
      const response = await apiService.predictSingleImage(
        uploadedFiles[0],
        {
          model_id: selectedModel,
          modality: selectedModality,
          confidence_threshold: 0.7,
          preprocessing: {
            normalize: true,
            resize: true,
            resize_dimensions: [224, 224]
          }
        }
      );

      setAnalysisResults(response);

      // Update patient info if available from response
      if (response.metadata?.patient_info) {
        setSelectedPatient(prev => ({
          ...prev,
          ...response.metadata.patient_info
        }));
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    if (currentMessage.trim()) {
      const userMessage = currentMessage;
      setChatMessages([
        ...chatMessages,
        { role: 'user', content: userMessage },
      ]);
      setCurrentMessage('');

      // Simulate AI response (in real implementation, call VLM chat API)
      setTimeout(() => {
        setChatMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Based on the advanced VLM analysis, I can identify key findings in the uploaded image. The AI model has processed the medical imaging data and identified several regions of interest with varying confidence levels. Would you like me to explain any specific findings in more detail?' }
        ]);
      }, 1000);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-900/30 text-red-300 border-red-700/50';
      case 'Medium': return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
      case 'Low': return 'bg-blue-900/30 text-blue-300 border-blue-700/50';
      case 'Normal': return 'bg-green-900/30 text-green-300 border-green-700/50';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 page-transition px-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-2">
            <Brain className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white tracking-tight">VLM Analysis</h1>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl">Vision Language Model powered medical image analysis with AI-driven insights and interactive Q&A</p>
        </div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Panel */}
          <div className="space-y-6 lg:-ml-4">
            {/* Patient Information */}
            <PatientCard
              patient={{
                ...selectedPatient,
                mrn: 'MRN-789456',
                diagnosis: 'Brain MRI Follow-up',
                physician: 'Dr. Smith',
                priority: 'High',
                status: 'Active'
              }}
              showActions={false}
            />

            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Upload className="h-5 w-5 text-blue-400" />
              <span>Upload Medical Images</span>
            </h2>

            <FileUploadZone
              onFileUpload={(files) => {
                setUploadedFiles(files);
                if (files[0]) {
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
              acceptedTypes={['.dcm', '.nii', '.nii.gz', '.nrrd', '.mha', '.mhd']}
              title="Upload Medical Images"
              description="ITK-wasm powered medical image viewer"
              disabled={uploading}
            />

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Modality
                </label>
                <select
                  value={selectedModality}
                  onChange={(e) => setSelectedModality(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {modalities.map(modality => (
                    <option key={modality} value={modality}>{modality}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(availableModels).map(([id, model]: [string, any]) => (
                    <option key={id} value={id}>{model.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={!currentImageData || uploading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4" />
              <span>{uploading ? 'Processing...' : 'Run VLM Analysis'}</span>
            </button>

            {uploading && (
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Medical Image Viewer */}
          <div className="lg:col-span-2 space-y-4">
            <ITKDicomViewer
              imageData={currentImageData}
              patientInfo={selectedPatient}
              seriesInfo={{
                seriesNumber: 1,
                seriesDescription: 'Axial T1 FLAIR',
                sliceCount: 100,
                currentSlice: selectedSlice + 1
              }}
              onSliceChange={(slice) => setSelectedSlice(slice - 1)}
              className="aspect-square"
            />
          </div>
        </div>
      </div>

      {/* VLM Output Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Info className="h-5 w-5 text-blue-400" />
            <span>AI Findings</span>
          </h2>

          <div className="space-y-4">
            {findings.map((finding, index) => (
              <div key={index} className="border border-slate-600/50 rounded-lg p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{finding.region || finding.label}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(finding.severity)}`}>
                      {finding.severity}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${finding.confidence >= 90 ? 'bg-emerald-900/30 text-emerald-300' :
                      finding.confidence >= 75 ? 'bg-yellow-900/30 text-yellow-300' :
                        'bg-red-900/30 text-red-300'
                      }`}>
                      {Math.round(finding.confidence * 100)}%
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-sm">{finding.finding}</p>
              </div>
            ))}
          </div>

          {analysisResults && (
            <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-700/30">
              <h4 className="font-medium text-blue-300 mb-2 flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Analysis Summary</span>
              </h4>
              <p className="text-sm text-blue-200">
                Processing time: {analysisResults.processing_time?.toFixed(2)}s
              </p>
              <p className="text-sm text-blue-200">
                Model: {analysisResults.model_id}
              </p>
              <p className="text-sm text-blue-200">
                Patient: {selectedPatient.name} ({selectedPatient.id})
              </p>
            </div>
          )}

          <button className="w-full mt-4 bg-slate-700/50 text-slate-300 py-3 px-4 rounded-lg hover:bg-slate-600/50 transition-colors text-sm border border-slate-600/50 font-medium">
            View Reasoning Trace
          </button>
        </div>

        {/* Q&A Chat Interface */}
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Ask the AI</span>
          </h2>

          <div className="space-y-4 h-64 overflow-y-auto mb-4">
            {chatMessages.length === 0 ? (
              <div className="text-center text-slate-400 py-8 bg-slate-800/20 rounded-lg">
                <p>Start a conversation with the AI about the imaging findings.</p>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => setCurrentMessage("What is the likely diagnosis?")}
                    className="block w-full text-left p-3 bg-slate-700/50 rounded-lg text-sm hover:bg-slate-600/50 transition-colors text-slate-300 border border-slate-600/50"
                  >
                    "What is the likely diagnosis?"
                  </button>
                  <button
                    onClick={() => setCurrentMessage("Explain in layman terms.")}
                    className="block w-full text-left p-3 bg-slate-700/50 rounded-lg text-sm hover:bg-slate-600/50 transition-colors text-slate-300 border border-slate-600/50"
                  >
                    "Explain in layman terms."
                  </button>
                </div>
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div key={index} className={`${message.role === 'user' ? 'text-right' : 'text-left'
                  }`}>
                  <div className={`inline-block p-3 rounded-lg max-w-xs shadow-lg ${message.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                    : 'bg-slate-800/70 text-slate-200 border border-slate-600/50'
                    }`}>
                    {message.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Ask about the imaging findings..."
              className="flex-1 px-4 py-3 border border-slate-600 bg-slate-800/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400 transition-all"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VLMAnalysis;