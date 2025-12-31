import React, { useState } from 'react';
import { Save, Download, Share, FileText, BookTemplate as Template, History, Clock, CheckCircle, AlertCircle, Zap, User, Activity } from 'lucide-react';
import { useReportTemplates, useReportGeneration, useReportExport } from '../hooks/useReports';

const Report: React.FC = () => {
  const [activeTab, setActiveTab] = useState('impression');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  // Report generation hooks
  const { templates, loading: templatesLoading } = useReportTemplates();
  const { generateReport, generating, generatedReport, error: generationError } = useReportGeneration();
  const { exportPDF, exportJSON, exporting } = useReportExport();

  // Form state
  const [reportForm, setReportForm] = useState({
    findings: '',
    impression: '',
    recommendations: '',
    technique: ''
  });

  // Mock patient data (in real app, this would come from props or context)
  const patientInfo = {
    name: 'Sarah Johnson',
    id: 'PAT-12847',
    age: 45,
    gender: 'Female',
    study_date: '2024-01-15',
    mrn: 'MRN-789456'
  };

  // Mock AI analysis results (would come from VLM analysis)
  const mockAIAnalysis = {
    findings: [
      { region: 'Left temporal lobe', finding: 'Hypointense lesion', confidence: 92, severity: 'High' },
      { region: 'Corpus callosum', finding: 'Normal morphology', confidence: 98, severity: 'Normal' },
      { region: 'Ventricles', finding: 'Mild dilation', confidence: 76, severity: 'Medium' }
    ],
    confidence_scores: { overall: 88.7 },
    reasoning_trace: 'Advanced VLM analysis identified multiple regions of interest...'
  };

  // Mock segmentation results
  const mockSegmentationResults = {
    results: [
      { class: 'Tumor Core', volume: '12.3 cm³', color: '#ef4444' },
      { class: 'Edema', volume: '45.7 cm³', color: '#eab308' }
    ],
    accuracy: 94.2,
    total_volume: '57.6 cm³'
  };

  const reportVersions = [
    { version: 'v1.0', date: '2024-01-15 14:30', status: 'Draft', author: 'Dr. Smith' },
    { version: 'v0.9', date: '2024-01-15 13:45', status: 'Draft', author: 'Dr. Smith' },
    { version: 'v0.8', date: '2024-01-15 12:20', status: 'Final', author: 'Dr. Johnson' },
  ];

  const handleGenerateReport = async () => {
    if (!selectedTemplate) {
      alert('Please select a template first');
      return;
    }

    try {
      const request = {
        template_name: selectedTemplate.toLowerCase().replace(/\s+/g, '_'),
        patient_info: patientInfo,
        findings_text: reportForm.findings || 'No specific findings documented.',
        ai_analysis: mockAIAnalysis,
        segmentation_results: mockSegmentationResults
      };

      const report = await generateReport(request);
      
      // Update form with generated content
      setReportForm({
        findings: report.sections.findings || '',
        impression: report.sections.impression || '',
        recommendations: report.sections.recommendations || '',
        technique: report.sections.technique || ''
      });

      alert('Report generated successfully!');
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  const handleExportPDF = async () => {
    if (generatedReport) {
      await exportPDF(generatedReport.report_id);
    }
  };

  return (
    <div className="space-y-6 page-transition">
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-6">Medical Report Generator</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Templates & History Sidebar */}
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-400" />
                <span>Patient Information</span>
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Name:</span>
                  <span className="text-white font-medium">{patientInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MRN:</span>
                  <span className="text-white font-mono">{patientInfo.mrn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Study Date:</span>
                  <span className="text-white">{patientInfo.study_date}</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Template className="h-5 w-5" />
                <span>Templates</span>
              </h2>
              <div className="space-y-2">
                {templates.map((template, index) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.name)}
                    className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                      selectedTemplate === template.name
                        ? 'border-cyan-500 bg-cyan-900/30 text-cyan-300'
                        : 'border-slate-600 hover:bg-slate-700/50 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-slate-400 mt-1">{template.modality}</div>
                  </button>
                ))}
                {templatesLoading && (
                  <div className="text-center text-slate-400 py-4">
                    Loading templates...
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Version History</span>
              </h2>
              <div className="space-y-2">
                {reportVersions.map((version, index) => (
                  <div key={index} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-white">{version.version}</span>
                      <div className="flex items-center space-x-1">
                        {version.status === 'Final' ? (
                          <CheckCircle className="h-3 w-3 text-green-400" />
                        ) : (
                          <Clock className="h-3 w-3 text-yellow-400" />
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          version.status === 'Final' 
                            ? 'bg-green-900/30 text-green-300 border border-green-700/50' 
                            : 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50'
                        }`}>
                          {version.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{version.date}</p>
                    <p className="text-xs text-slate-500 mt-1">by {version.author}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Report Editor */}
          <div className="lg:col-span-3 space-y-6">
            {/* AI Generation Controls */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-400" />
                  <span>AI-Assisted Report Generation</span>
                </h3>
                <button
                  onClick={handleGenerateReport}
                  disabled={!selectedTemplate || generating}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>{generating ? 'Generating...' : 'Generate Report'}</span>
                </button>
              </div>
              
              {generationError && (
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">
                  {generationError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('impression')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'impression' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  Impression
                </button>
                <button
                  onClick={() => setActiveTab('detailed')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'detailed' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  Detailed Report
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                <button className="p-2 text-slate-400 ho\ver:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors">
                  <Save className="h-4 w-4" />
                </button>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400 font-medium">Auto-saved</span>
                </div>
              </div>
            </div>

            {/* Patient & Study Information */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <h3 className="font-semibold text-white mb-3 flex items-center space-x-2">
               <FileText className="h-4 w-4 text-blue-400" />
                <span>Patient & Study Information</span>
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Patient ID:</span>
                  <p className="font-medium text-white font-mono">PAT-12847</p>
                </div>
                <div>
                  <span className="text-slate-400">Study Date:</span>
                  <p className="font-medium text-white">2024-01-15</p>
                </div>
                <div>
                  <span className="text-slate-400">Modality:</span>
                  <p className="font-medium text-white">MRI Brain</p>
                </div>
                <div>
                  <span className="text-slate-400">Radiologist:</span>
                  <p className="font-medium text-white">Dr. Smith</p>
                </div>
              </div>
            </div>

            {/* Generated Report Summary */}
            {generatedReport && (
              <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/30">
                <h4 className="font-medium text-blue-300 mb-2 flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>Generated Report Summary</span>
                </h4>
                <p className="text-sm text-blue-200">Report ID: {generatedReport.report_id}</p>
                <p className="text-sm text-blue-200">Structured findings: {generatedReport.structured_findings.length}</p>
                <p className="text-sm text-blue-200">AI assisted: {generatedReport.metadata.ai_assisted ? 'Yes' : 'No'}</p>
              </div>
            )}

            {/* Report Content */}
            <div className="space-y-4">
              {activeTab === 'impression' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Clinical Impression
                    </label>
                    <textarea
                      value={reportForm.impression}
                      onChange={(e) => setReportForm({...reportForm, impression: e.target.value})}
                      className="w-full h-32 px-4 py-3 border border-slate-600 bg-slate-800/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-slate-400 transition-all"
                      placeholder="Enter clinical impression..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Recommendations
                    </label>
                    <textarea
                      value={reportForm.recommendations}
                      onChange={(e) => setReportForm({...reportForm, recommendations: e.target.value})}
                      className="w-full h-24 px-4 py-3 border border-slate-600 bg-slate-800/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-slate-400 transition-all"
                      placeholder="Enter recommendations..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Technique
                    </label>
                    <textarea
                      value={reportForm.technique}
                      onChange={(e) => setReportForm({...reportForm, technique: e.target.value})}
                      className="w-full h-20 px-4 py-3 border border-slate-600 bg-slate-800/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-slate-400 transition-all"
                      placeholder="Describe imaging technique..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Findings
                    </label>
                    <textarea
                      value={reportForm.findings}
                      onChange={(e) => setReportForm({...reportForm, findings: e.target.value})}
                      className="w-full h-48 px-4 py-3 border border-slate-600 bg-slate-800/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-slate-400 transition-all"
                      placeholder="Describe detailed findings..."
                    />
                  </div>
                  
                  {/* AI Analysis Summary */}
                  {mockAIAnalysis && (
                    <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      AI Analysis Summary
                    </label>
                    <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/30">
                      <h4 className="font-medium text-blue-300 mb-2 flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>Automated Findings</span>
                      </h4>
                      <ul className="text-sm text-blue-200 space-y-1">
                        {mockAIAnalysis.findings.map((finding, index) => (
                          <li key={index}>
                            • {finding.region}: {finding.finding} ({finding.confidence}% confidence)
                          </li>
                        ))}
                      </ul>
                    </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Export & Sharing Actions */}
            <div className="border-t border-slate-600 pt-6">
              <h3 className="font-semibold text-white mb-4 flex items-center space-x-2">
               <Share className="h-5 w-5 text-blue-400" />
                <span>Export & Sharing</span>
              </h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleExportPDF}
                  disabled={!generatedReport || exporting}
                  className="flex items-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  <Download className="h-4 w-4" />
                  <span>{exporting ? 'Exporting...' : 'Export PDF'}</span>
                </button>
                
                <button className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  <Download className="h-4 w-4" />
                  <span>Export DOCX</span>
                </button>
                
                <button className="flex items-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                  <FileText className="h-4 w-4" />
                  <span>HL7-FHIR JSON</span>
                </button>
                
                <button className="flex items-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                  <Share className="h-4 w-4" />
                  <span>Push to PACS</span>
                </button>
                
                <button className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all font-medium">
                  <Share className="h-4 w-4" />
                  <span>Secure Share</span>
                </button>
              </div>

              <div className="mt-4 p-4 bg-green-900/20 rounded-lg border border-green-700/30">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300 font-medium">HIPAA Compliant</span>
                </div>
                <p className="text-sm text-green-200 mt-1">
                  All exports and sharing options maintain full HIPAA compliance with end-to-end encryption.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;