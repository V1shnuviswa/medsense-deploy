import React, { useState, useRef, useEffect } from 'react';
import { Upload, Save, FileText, Brain, Loader, Zap, CheckCircle, Cpu } from 'lucide-react';
import PatientCard from '../components/PatientCard';
import ITKDicomViewer from '../components/ITKDicomViewer';
import { MODEL_REGISTRY } from '../config/models';
import { useImageData } from '../hooks/useImageData';
import { useAIAnalysis } from '../hooks/useAIAnalysis';
import { useVLMChat } from '../hooks/useVLMChat';
import { useReport } from '../hooks/useReport';

const MedicalImageViewer = () => {
  // UI State
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [segmentationData, setSegmentationData] = useState(null);
  const [currentSlice, setCurrentSlice] = useState({ axial: 0, sagittal: 0, coronal: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 128, y: 128, z: 64 });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState({
    name: '---',
    id: '---',
    age: 0,
    gender: '---',
    studyDate: '---',
    modality: '---',
    bodyPart: '---',
    studyDescription: '---',
    mrn: '---',
    diagnosis: '---',
    physician: '---',
    priority: '---',
    status: '---'
  });

  const fileInputRef = useRef(null);

  // Custom Hooks for domain logic
  const {
    imageData,
    uploadedFiles,
    loadingImage,
    backendConnected,
    currentStudyId,
    handleFileUpload
  } = useImageData();

  const {
    selectedModality,
    selectedModel,
    analysisResults,
    analysisRunning,
    setSelectedModality,
    setSelectedModel,
    runAIAnalysis
  } = useAIAnalysis(MODEL_REGISTRY);

  const {
    vlmPrompt,
    vlmResponse,
    vlmProcessing,
    setVlmPrompt,
    runVLMQuery
  } = useVLMChat();

  const {
    reportData,
    showReportPanel,
    setReportData,
    setShowReportPanel,
    generateReport,
    exportReport
  } = useReport();


  // Wrapper for file upload to call hook
  const handleFileUpload_ITK = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event, selectedPatient, {
      onSliceUpdate: setCurrentSlice,
      onCursorUpdate: setCursorPosition,
      onPatientUpdate: (updates) => setSelectedPatient(prev => ({ ...prev, ...updates })),
      onModalClose: () => { }
    });
  };

  // Wrapper functions to call hooks with proper parameters
  const handleRunAnalysis = () => runAIAnalysis(imageData, uploadedFiles, backendConnected);

  const handleRunVLMQuery = () => runVLMQuery(backendConnected, currentStudyId, selectedModality);

  const handleGenerateReport = () => generateReport(analysisResults, imageData);

  const handleExportReport = () => exportReport(currentStudyId, imageData, analysisResults, selectedModality);

  const currentModel = selectedModel && (MODEL_REGISTRY as any)[selectedModality]?.models[selectedModel];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const toggleDropdown = (menu, e) => {
    e.stopPropagation();
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Patient Information Bar */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 p-3">
        <PatientCard
          patient={selectedPatient}
          compact={true}
          showActions={false}
        />
      </div>

      {/* Menu Bar */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex items-center px-2 py-1 text-sm">
          <button className="px-3 py-1 hover:bg-gray-700">File</button>
          <button className="px-3 py-1 hover:bg-gray-700">Segmentation</button>
          <button className="px-3 py-1 hover:bg-gray-700">Tools</button>
          <button className="px-3 py-1 hover:bg-gray-700">View</button>
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`px-3 py-1 hover:bg-gray-700 flex items-center gap-1 ${showAIPanel ? 'bg-purple-600' : ''}`}
          >
            <Brain size={14} />
            AI Analysis
          </button>
          <button
            onClick={() => setShowReportPanel(!showReportPanel)}
            className={`px-3 py-1 hover:bg-gray-700 flex items-center gap-1 ${showReportPanel ? 'bg-green-600' : ''}`}
          >
            <FileText size={14} />
            Report
          </button>
          <button className="px-3 py-1 hover:bg-gray-700">Help</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-800 px-3 py-2 border-b border-gray-700 flex items-center gap-2 flex-wrap">

        {/* Backend Connection Status */}
        <div className="flex items-center gap-2 ml-4">
          <div className={`w-2 h-2 rounded-full ${currentStudyId ? 'bg-green-400' : 'bg-gray-500'}`}></div>
          <span className="text-xs text-gray-400">
            {currentStudyId ? `Study: ${currentStudyId.slice(-8)}` : 'No backend connection'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center - Viewports (Full Width) */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-black p-0.5 relative">
            <ITKDicomViewer
              imageData={imageData?.itkImage}
              patientInfo={selectedPatient}
              seriesInfo={imageData ? {
                seriesNumber: 1,
                seriesDescription: imageData.seriesDescription || 'Loaded Volume',
                sliceCount: imageData.dimensions?.z || 1,
                currentSlice: currentSlice.axial
              } : undefined}
              onSliceChange={(slice) => setCurrentSlice(prev => ({ ...prev, axial: slice }))}
              className="w-full h-full"
            />
          </div>


        </div>

        {/* Right Sidebar - Segmentation Labels, AI Analysis, Image Info, or Report */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto flex flex-col">
          {showReportPanel ? (
            <div className="flex-1 flex flex-col">
              <div className="p-3 border-b border-gray-700 bg-green-900 bg-opacity-30">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <FileText size={16} />
                  Radiology Report
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Patient Information */}
                <div className="bg-gray-700 rounded p-3">
                  <h4 className="text-xs font-semibold mb-3 text-gray-300">Patient Information</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Patient Name</label>
                      <input
                        type="text"
                        value={reportData.patientName}
                        onChange={(e) => setReportData(prev => ({ ...prev, patientName: e.target.value }))}
                        className="w-full bg-gray-800 rounded px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Patient ID</label>
                      <input
                        type="text"
                        value={reportData.patientID}
                        onChange={(e) => setReportData(prev => ({ ...prev, patientID: e.target.value }))}
                        className="w-full bg-gray-800 rounded px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={reportData.patientDOB}
                        onChange={(e) => setReportData(prev => ({ ...prev, patientDOB: e.target.value }))}
                        className="w-full bg-gray-800 rounded px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Study Date</label>
                      <input
                        type="date"
                        value={reportData.studyDate}
                        onChange={(e) => setReportData(prev => ({ ...prev, studyDate: e.target.value }))}
                        className="w-full bg-gray-800 rounded px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Referring Physician</label>
                      <input
                        type="text"
                        value={reportData.referringPhysician}
                        onChange={(e) => setReportData(prev => ({ ...prev, referringPhysician: e.target.value }))}
                        className="w-full bg-gray-800 rounded px-2 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Study Information */}
                {imageData && (
                  <div className="bg-gray-700 rounded p-3">
                    <h4 className="text-xs font-semibold mb-2 text-gray-300">Examination Details</h4>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Modality:</span>
                        <span>{imageData.modality}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Series:</span>
                        <span className="text-right">{imageData.seriesDescription}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Dimensions:</span>
                        <span>{imageData.dimensions.x}×{imageData.dimensions.y}×{imageData.dimensions.z}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Clinical Indication */}
                <div className="bg-gray-700 rounded p-3">
                  <h4 className="text-xs font-semibold mb-2 text-gray-300">Clinical Indication</h4>
                  <textarea
                    value={reportData.indication}
                    onChange={(e) => setReportData(prev => ({ ...prev, indication: e.target.value }))}
                    placeholder="Enter clinical indication and reason for examination..."
                    className="w-full bg-gray-800 rounded px-2 py-2 text-xs h-20 resize-none"
                  />
                </div>

                {/* AI-Generated Content Button */}
                {analysisResults && (
                  <button
                    onClick={handleGenerateReport}
                    className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center justify-center gap-2"
                  >
                    <Zap size={14} />
                    Auto-Generate from AI Analysis
                  </button>
                )}

                {/* Findings */}
                <div className="bg-gray-700 rounded p-3">
                  <h4 className="text-xs font-semibold mb-2 text-gray-300">Findings</h4>
                  <textarea
                    value={reportData.findings}
                    onChange={(e) => setReportData(prev => ({ ...prev, findings: e.target.value }))}
                    placeholder="Enter detailed findings..."
                    className="w-full bg-gray-800 rounded px-2 py-2 text-xs h-32 resize-none font-mono"
                  />
                </div>

                {/* Impression */}
                <div className="bg-gray-700 rounded p-3">
                  <h4 className="text-xs font-semibold mb-2 text-gray-300">Impression</h4>
                  <textarea
                    value={reportData.impression}
                    onChange={(e) => setReportData(prev => ({ ...prev, impression: e.target.value }))}
                    placeholder="Enter impression and diagnostic conclusion..."
                    className="w-full bg-gray-800 rounded px-2 py-2 text-xs h-24 resize-none"
                  />
                </div>

                {/* Recommendations */}
                <div className="bg-gray-700 rounded p-3">
                  <h4 className="text-xs font-semibold mb-2 text-gray-300">Recommendations</h4>
                  <textarea
                    value={reportData.recommendations}
                    onChange={(e) => setReportData(prev => ({ ...prev, recommendations: e.target.value }))}
                    placeholder="Enter recommendations and follow-up..."
                    className="w-full bg-gray-800 rounded px-2 py-2 text-xs h-20 resize-none"
                  />
                </div>

                {/* Report Preview */}
                {(reportData.findings || reportData.impression) && (
                  <div className="bg-gray-900 rounded p-3 border border-gray-600">
                    <h4 className="text-xs font-semibold mb-2 text-green-400">Report Preview</h4>
                    <div className="text-xs text-gray-300 space-y-2 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                      <div><strong>PATIENT:</strong> {reportData.patientName} ({reportData.patientID})</div>
                      <div><strong>DATE:</strong> {reportData.studyDate}</div>
                      <div><strong>EXAM:</strong> {imageData?.modality} - {imageData?.seriesDescription}</div>
                      {reportData.indication && (
                        <>
                          <div className="mt-2"><strong>INDICATION:</strong></div>
                          <div>{reportData.indication}</div>
                        </>
                      )}
                      {reportData.findings && (
                        <>
                          <div className="mt-2"><strong>FINDINGS:</strong></div>
                          <div>{reportData.findings.substring(0, 200)}{reportData.findings.length > 200 ? '...' : ''}</div>
                        </>
                      )}
                      {reportData.impression && (
                        <>
                          <div className="mt-2"><strong>IMPRESSION:</strong></div>
                          <div>{reportData.impression.substring(0, 150)}{reportData.impression.length > 150 ? '...' : ''}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pb-4">
                  <button
                    onClick={handleExportReport}
                    disabled={!reportData.findings && !reportData.impression}
                    className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm flex items-center justify-center gap-2"
                  >
                    <Save size={14} />
                    Export Report (.txt)
                  </button>
                  <button
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center justify-center gap-2"
                  >
                    <FileText size={14} />
                    Generate PDF
                  </button>
                  <button
                    onClick={() => setReportData({
                      ...reportData,
                      indication: '',
                      findings: '',
                      impression: '',
                      recommendations: ''
                    })}
                    className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    Clear Report
                  </button>
                </div>
              </div>
            </div>
          ) : showAIPanel ? (
            <div className="flex-1 flex flex-col">
              <div className="p-3 border-b border-gray-700 bg-purple-900 bg-opacity-30">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Brain size={16} />
                  AI-Powered Analysis
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Model Selection */}
                <div className="bg-gray-700 rounded p-3">
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <Cpu size={14} />
                    Model Selection
                  </h4>

                  <div className="mb-3">
                    <label className="text-xs text-gray-400 block mb-1">Modality</label>
                    <select
                      value={selectedModality}
                      onChange={(e) => {
                        setSelectedModality(e.target.value);
                        const firstModel = Object.keys(MODEL_REGISTRY[e.target.value].models)[0];
                        setSelectedModel(firstModel);
                      }}
                      className="w-full bg-gray-800 rounded px-2 py-1.5 text-sm"
                    >
                      {Object.keys(MODEL_REGISTRY).map((mod: string) => (
                        <option key={mod} value={mod}>{mod}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="text-xs text-gray-400 block mb-1">AI Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-gray-800 rounded px-2 py-1.5 text-sm"
                    >
                      {Object.entries((MODEL_REGISTRY as any)[selectedModality].models).map(([key, model]: [string, any]) => (
                        <option key={key} value={key}>{model.name}</option>
                      ))}
                    </select>
                  </div>

                  {currentModel && (
                    <div className="bg-gray-800 rounded p-2 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="capitalize">{currentModel.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Input:</span>
                        <span>{currentModel.input_size[0]}×{currentModel.input_size[1]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Threshold:</span>
                        <span>{currentModel.confidence_threshold}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleRunAnalysis}
                    disabled={!imageData || analysisRunning}
                    className="w-full mt-3 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm flex items-center justify-center gap-2"
                  >
                    {analysisRunning ? (
                      <>
                        <Loader size={14} className="animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap size={14} />
                        Run Analysis
                      </>
                    )}
                  </button>
                </div>

                {/* Analysis Results */}
                {analysisResults && (
                  <div className="bg-gray-700 rounded p-3">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1 text-green-400">
                      <CheckCircle size={14} />
                      Analysis Results
                    </h4>

                    <div className="text-xs space-y-2">
                      <div className="bg-gray-800 rounded p-2">
                        <div className="text-gray-400 mb-1">Model: {analysisResults.model}</div>
                        <div className="text-gray-400">Confidence: {(analysisResults.confidence * 100).toFixed(1)}%</div>
                      </div>

                      {analysisResults.predictions && (
                        <div>
                          <div className="text-gray-400 mb-1 font-semibold">Classifications:</div>
                          {analysisResults.predictions.slice(0, 5).map((pred, idx) => (
                            <div key={idx} className="bg-gray-800 rounded p-2 mb-1 flex justify-between items-center">
                              <span className="capitalize">{pred.class.replace('_', ' ')}</span>
                              <span className={pred.confidence > 0.7 ? 'text-green-400' : 'text-yellow-400'}>
                                {(pred.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {analysisResults.segmented_regions && (
                        <div>
                          <div className="text-gray-400 mb-1 font-semibold">Segmented Regions:</div>
                          {analysisResults.segmented_regions.map((region, idx) => (
                            <div key={idx} className="bg-gray-800 rounded p-2 mb-1">
                              <div className="capitalize font-semibold">{region.label.replace('_', ' ')}</div>
                              <div className="text-gray-400">Volume: {region.volume_mm3.toFixed(1)} mm³</div>
                              <div className="text-gray-400">Voxels: {region.voxel_count.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {analysisResults.detections && (
                        <div>
                          <div className="text-gray-400 mb-1 font-semibold">Detections:</div>
                          {analysisResults.detections.map((det, idx) => (
                            <div key={idx} className="bg-gray-800 rounded p-2 mb-1">
                              <div className="flex justify-between">
                                <span className="capitalize font-semibold">{det.class}</span>
                                <span className="text-green-400">{(det.confidence * 100).toFixed(1)}%</span>
                              </div>
                              <div className="text-gray-400">Location: ({det.location.join(', ')})</div>
                              <div className="text-gray-400">Size: {det.size_mm} mm</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* VLM Query Interface */}
                <div className="bg-gray-700 rounded p-3">
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <Brain size={14} />
                    Vision Language Model
                  </h4>

                  <textarea
                    value={vlmPrompt}
                    onChange={(e) => setVlmPrompt(e.target.value)}
                    placeholder="Ask about the scan... e.g., 'Describe what you see' or 'Identify any tumors'"
                    className="w-full bg-gray-800 rounded px-2 py-2 text-xs mb-2 h-20 resize-none"
                    disabled={!imageData}
                  />

                  <button
                    onClick={handleRunVLMQuery}
                    disabled={!imageData || !vlmPrompt.trim() || analysisRunning}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm flex items-center justify-center gap-2"
                  >
                    {analysisRunning ? (
                      <>
                        <Loader size={14} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Brain size={14} />
                        Ask VLM
                      </>
                    )}
                  </button>

                  {vlmResponse && (
                    <div className="mt-3 bg-gray-800 rounded p-2 text-xs">
                      <div className="text-blue-400 font-semibold mb-2">VLM Response:</div>
                      <div className="text-gray-300 whitespace-pre-line">{vlmResponse}</div>
                    </div>
                  )}
                </div>

                {/* Model Applications */}
                {currentModel && (
                  <div className="bg-gray-700 rounded p-3">
                    <h4 className="text-xs font-semibold mb-2">Applications</h4>
                    <ul className="text-xs text-gray-300 space-y-1">
                      {currentModel.applications.map((app, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-400">•</span>
                          <span>{app}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FileText size={14} />
                Image Information
              </h3>

              {imageData ? (
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded p-3">
                    <div className="text-xs space-y-2">
                      <div>
                        <span className="text-gray-400">Modality:</span>
                        <span className="ml-2">{imageData.modality}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Series:</span>
                        <span className="ml-2 block text-xs">{imageData.seriesDescription}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Dimensions:</span>
                        <span className="ml-2">{imageData.dimensions.x} × {imageData.dimensions.y} × {imageData.dimensions.z}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Spacing:</span>
                        <span className="ml-2 block">{imageData.spacing.x.toFixed(2)} × {imageData.spacing.y.toFixed(2)} × {imageData.spacing.z.toFixed(2)} mm</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded p-3">
                    <h4 className="text-xs font-semibold mb-2 text-gray-300">Cursor Position</h4>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">X:</span>
                        <span>{cursorPosition.x}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Y:</span>
                        <span>{cursorPosition.y}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Z:</span>
                        <span>{cursorPosition.z}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center justify-center gap-2">
                      <Save size={14} />
                      Save Segmentation
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm">No image loaded</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 px-3 py-1.5 border-t border-gray-700 text-xs text-gray-400 flex justify-between items-center">
        <div className="flex gap-4">
          <span>Tool: Navigation</span>
          {imageData && showAIPanel && currentModel && (
            <span>Active Model: {currentModel.name}</span>
          )}
        </div>
        <span>ITK-SNAP Style Viewer with AI | ITK-wasm + HuggingFace Models</span>
      </div>
    </div>
  );
};
};

export default MedicalImageViewer;