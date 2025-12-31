import React, { useState, useEffect, useRef } from 'react';
import {
    FileText, Upload, TrendingUp, TrendingDown, AlertTriangle,
    CheckCircle, MessageCircle, Send, Sparkles, Activity,
    Clock, Calendar, FileCheck, Loader, ChevronDown, ChevronUp,
    Heart, PieChart, Shield, Trash2
} from 'lucide-react';
import FeedbackButtons from '../components/FeedbackButtons';

interface Biomarker {
    name: string;
    value: string;
    normal_range: string;
    explanation?: string;
}

interface MedicalReport {
    id: number;
    filename: string;
    uploaded_at: string;
    analysis_status: string;
    summary: string;
    biomarkers: {
        high: Biomarker[];
        low: Biomarker[];
        borderline: Biomarker[];
        normal: Biomarker[];
    };
    precautions: string[];
    recommendations: string[];
    daily_routine: string[];
    complete_analysis: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

const MedicalReportAnalysis: React.FC = () => {
    const [reports, setReports] = useState<MedicalReport[]>([]);
    const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        summary: true,
        biomarkers: true,
        recommendations: true,
        routine: false,
        complete: false
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Helper function to clean markdown symbols from text
    const cleanMarkdown = (text: string): string => {
        return text
            .replace(/\*\*/g, '')  // Remove bold **
            .replace(/\*/g, '')     // Remove italic *
            .replace(/#{1,6}\s/g, '') // Remove headers #
            .replace(/_/g, '')      // Remove underscores _
            .replace(/`/g, '')      // Remove backticks `
            .trim();
    };

    useEffect(() => {
        loadReports();
    }, []);

    useEffect(() => {
        if (selectedReport) {
            loadChatHistory(selectedReport.id);
        }
    }, [selectedReport]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const loadReports = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/medical-reports', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load reports');
            }

            const data = await response.json();
            setReports(data);
        } catch (error) {
            console.error('Error loading reports:', error);
            setReports([]); // Set to empty array on error
        }
    };

    const loadChatHistory = async (reportId: number) => {
        try {
            const response = await fetch(`http://localhost:5001/api/medical-reports/${reportId}/chat/history`);
            const data = await response.json();
            setChatMessages(data);
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            alert('Please upload a PDF file');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 100);

            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/medical-reports/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.ok) {
                const data = await response.json();

                // Start analysis
                setTimeout(() => {
                    analyzeReport(data.id);
                }, 500);
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file. Please try again.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const analyzeReport = async (reportId: number) => {
        setIsAnalyzing(true);

        try {
            const response = await fetch(`http://localhost:5001/api/medical-reports/${reportId}/analyze`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedReport(data.report);
                await loadReports();
            } else {
                throw new Error('Analysis failed');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Failed to analyze report. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSendMessage = async () => {
        if (!currentMessage.trim() || !selectedReport) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: currentMessage,
            timestamp: new Date().toISOString()
        };

        setChatMessages(prev => [...prev, userMessage]);
        setCurrentMessage('');
        setIsChatLoading(true);

        try {
            const response = await fetch(`http://localhost:5001/api/medical-reports/${selectedReport.id}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: currentMessage })
            });

            if (response.ok) {
                const data = await response.json();
                const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: data.answer,
                    timestamp: data.timestamp
                };
                setChatMessages(prev => [...prev, assistantMessage]);
            } else {
                throw new Error('Chat failed');
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toISOString()
            };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleDeleteReport = async (reportId: number, filename: string) => {
        if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:5001/api/medical-reports/${reportId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove from list
                setReports(prev => prev.filter(r => r.id !== reportId));

                // If this was the selected report, clear selection
                if (selectedReport?.id === reportId) {
                    setSelectedReport(null);
                    setChatMessages([]);
                }
            } else {
                throw new Error('Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete report. Please try again.');
        }
    };

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const renderBiomarker = (biomarker: Biomarker, type: 'high' | 'low' | 'borderline' | 'normal') => {
        const colors = {
            high: 'bg-red-900/20 border-red-800/30 text-red-300',
            low: 'bg-blue-900/20 border-blue-800/30 text-blue-300',
            borderline: 'bg-yellow-900/20 border-yellow-800/30 text-yellow-300',
            normal: 'bg-green-900/20 border-green-800/30 text-green-300'
        };

        const icons = {
            high: <TrendingUp className="h-4 w-4" />,
            low: <TrendingDown className="h-4 w-4" />,
            borderline: <AlertTriangle className="h-4 w-4" />,
            normal: <CheckCircle className="h-4 w-4" />
        };

        return (
            <div className={`p-4 rounded-lg border ${colors[type]} mb-3`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        {icons[type]}
                        <span className="font-semibold">{biomarker.name}</span>
                    </div>
                    <span className="text-sm font-mono">{biomarker.value}</span>
                </div>
                <div className="text-xs opacity-75 mb-1">Normal Range: {biomarker.normal_range}</div>
                {biomarker.explanation && (
                    <div className="text-sm mt-2 opacity-90">{biomarker.explanation}</div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 page-transition">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <Activity className="h-8 w-8 text-blue-400" />
                            <span>Medical Report Analysis</span>
                        </h1>
                        <p className="text-slate-300">Upload your medical report for comprehensive AI-powered analysis and insights</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || isAnalyzing}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/50"
                        >
                            <Upload className="h-5 w-5" />
                            <span className="font-semibold">Upload Report</span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                </div>
            </div>

            {/* Upload/Analysis Progress */}
            {(isUploading || isAnalyzing) && (
                <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-8 text-center">
                    <Loader className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {isUploading ? 'Uploading your report...' : 'Analyzing with AI...'}
                    </h3>
                    <p className="text-slate-400 mb-4">
                        {isUploading ? 'Please wait while we securely upload your file' : 'Our AI is extracting biomarkers and generating insights'}
                    </p>
                    {isUploading && uploadProgress > 0 && (
                        <div className="max-w-md mx-auto">
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar - Report List */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-400" />
                            <span>Your Reports</span>
                        </h2>

                        {reports.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No reports yet</p>
                                <p className="text-xs mt-1">Upload a PDF to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {reports.map(report => (
                                    <div
                                        key={report.id}
                                        onClick={() => setSelectedReport(report)}
                                        className={`p-4 rounded-lg cursor-pointer transition-all ${selectedReport?.id === report.id
                                            ? 'bg-blue-600/20 border-2 border-blue-500'
                                            : 'bg-slate-800/50 border border-slate-700 hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2 flex-1">
                                                <FileCheck className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                                <span className="text-white text-sm font-medium truncate">
                                                    {report.filename}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteReport(report.id, report.filename);
                                                }}
                                                className="ml-2 p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                                                title="Delete report"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(report.uploaded_at).toLocaleDateString()}
                                        </div>
                                        {report.analysis_status === 'completed' && (
                                            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                                                <CheckCircle className="h-3 w-3" />
                                                Analysis Complete
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Stats */}
                    {selectedReport && selectedReport.analysis_status === 'completed' && (
                        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Quick Overview</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-red-900/10 rounded-lg border border-red-800/30">
                                    <span className="text-red-300 text-sm flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" />
                                        High
                                    </span>
                                    <span className="text-white font-bold">{selectedReport.biomarkers.high.length}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-blue-900/10 rounded-lg border border-blue-800/30">
                                    <span className="text-blue-300 text-sm flex items-center gap-2">
                                        <TrendingDown className="h-4 w-4" />
                                        Low
                                    </span>
                                    <span className="text-white font-bold">{selectedReport.biomarkers.low.length}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-yellow-900/10 rounded-lg border border-yellow-800/30">
                                    <span className="text-yellow-300 text-sm flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        Borderline
                                    </span>
                                    <span className="text-white font-bold">{selectedReport.biomarkers.borderline.length}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chat Interface */}
                    {selectedReport && selectedReport.analysis_status === 'completed' && (
                        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-xl overflow-hidden">
                            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600">
                                <h3 className="text-white font-semibold flex items-center gap-2">
                                    <Sparkles className="h-5 w-5" />
                                    Ask AI About Your Report
                                </h3>
                            </div>

                            <div className="h-[400px] flex flex-col">
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {chatMessages.length === 0 ? (
                                        <div className="text-center text-slate-500 py-12">
                                            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p className="text-sm">Ask me anything about your report!</p>
                                            <p className="text-xs mt-2">Example: "What does high cholesterol mean?"</p>
                                        </div>
                                    ) : (
                                        chatMessages.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] p-3 rounded-lg ${msg.role === 'user'
                                                    ? 'bg-blue-600 text-white rounded-br-none'
                                                    : 'bg-slate-800 text-slate-200 rounded-bl-none'
                                                    }`}>
                                                    <p className="text-sm whitespace-pre-line">{cleanMarkdown(msg.content)}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {isChatLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-slate-800 p-3 rounded-lg rounded-bl-none">
                                                <div className="flex space-x-1">
                                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                <div className="p-4 border-t border-slate-700">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={currentMessage}
                                            onChange={(e) => setCurrentMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Type your question..."
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                            disabled={isChatLoading}
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!currentMessage.trim() || isChatLoading}
                                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Daily Healthcare Routine - Moved to sidebar */}
                    {selectedReport && selectedReport.daily_routine?.length > 0 && (
                        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-xl overflow-hidden">
                            <div className="p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
                                <h3 className="text-white font-semibold flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-purple-400" />
                                    Daily Healthcare Routine
                                </h3>
                            </div>
                            <div className="p-4">
                                <ul className="space-y-2">
                                    {selectedReport.daily_routine.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                            <Clock className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                                            <span className="text-slate-200 text-sm">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {!selectedReport ? (
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-16 text-center">
                            <Heart className="h-20 w-20 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-semibold text-white mb-3">Welcome to Medical Report Analysis</h3>
                            <p className="text-slate-400 max-w-2xl mx-auto mb-6">
                                Upload your medical reports (lab tests, blood work, etc.) to get:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                                <div className="bg-slate-800/50 p-4 rounded-lg">
                                    <PieChart className="h-6 w-6 text-blue-400 mb-2" />
                                    <h4 className="text-white font-medium mb-1">Biomarker Analysis</h4>
                                    <p className="text-sm text-slate-400">Detailed breakdown of all your test results</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-lg">
                                    <Shield className="h-6 w-6 text-green-400 mb-2" />
                                    <h4 className="text-white font-medium mb-1">Personalized Recommendations</h4>
                                    <p className="text-sm text-slate-400">Tailored health advice and precautions</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-lg">
                                    <Clock className="h-6 w-6 text-purple-400 mb-2" />
                                    <h4 className="text-white font-medium mb-1">Daily Routine</h4>
                                    <p className="text-sm text-slate-400">Custom healthcare schedule</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-lg">
                                    <MessageCircle className="h-6 w-6 text-yellow-400 mb-2" />
                                    <h4 className="text-white font-medium mb-1">AI Chatbot</h4>
                                    <p className="text-sm text-slate-400">Ask questions about your report</p>
                                </div>
                            </div>
                        </div>
                    ) : selectedReport.analysis_status === 'completed' ? (
                        <>
                            {/* Summary Section */}
                            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
                                <div
                                    className="p-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 cursor-pointer flex items-center justify-between"
                                    onClick={() => toggleSection('summary')}
                                >
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Sparkles className="h-6 w-6 text-blue-400" />
                                        Summary
                                    </h2>
                                    {expandedSections.summary ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>
                                {expandedSections.summary && (
                                    <div className="p-6">
                                        <p className="text-slate-200 leading-relaxed whitespace-pre-line">{selectedReport.summary}</p>
                                    </div>
                                )}
                            </div>

                            {/* Biomarkers Section */}
                            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
                                <div
                                    className="p-6 bg-gradient-to-r from-red-900/20 to-green-900/20 cursor-pointer flex items-center justify-between"
                                    onClick={() => toggleSection('biomarkers')}
                                >
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Activity className="h-6 w-6 text-blue-400" />
                                        Biomarkers
                                    </h2>
                                    {expandedSections.biomarkers ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>
                                {expandedSections.biomarkers && (
                                    <div className="p-6 space-y-6">
                                        {selectedReport.biomarkers.high.length > 0 && (
                                            <div>
                                                <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                                                    <TrendingUp className="h-5 w-5" />
                                                    High Values
                                                </h3>
                                                {selectedReport.biomarkers.high.map((bio) => renderBiomarker(bio, 'high'))}
                                            </div>
                                        )}
                                        {selectedReport.biomarkers.low.length > 0 && (
                                            <div>
                                                <h3 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                                                    <TrendingDown className="h-5 w-5" />
                                                    Low Values
                                                </h3>
                                                {selectedReport.biomarkers.low.map((bio) => renderBiomarker(bio, 'low'))}
                                            </div>
                                        )}
                                        {selectedReport.biomarkers.borderline.length > 0 && (
                                            <div>
                                                <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                                                    <AlertTriangle className="h-5 w-5" />
                                                    Borderline Values
                                                </h3>
                                                {selectedReport.biomarkers.borderline.map((bio) => renderBiomarker(bio, 'borderline'))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Recommendations Section */}
                            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
                                <div
                                    className="p-6 bg-gradient-to-r from-green-900/20 to-blue-900/20 cursor-pointer flex items-center justify-between"
                                    onClick={() => toggleSection('recommendations')}
                                >
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Shield className="h-6 w-6 text-green-400" />
                                        Recommendations & Precautions
                                    </h2>
                                    {expandedSections.recommendations ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>
                                {expandedSections.recommendations && (
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-green-400 font-semibold mb-3">Recommendations</h3>
                                            <ul className="space-y-2">
                                                {selectedReport.recommendations.map((rec, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                        <span>{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <h3 className="text-yellow-400 font-semibold mb-3">Precautions</h3>
                                            <ul className="space-y-2">
                                                {selectedReport.precautions.map((prec, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                                                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                                        <span>{prec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Complete Analysis Section */}
                            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
                                <div
                                    className="p-6 bg-gradient-to-r from-slate-800 to-slate-900 cursor-pointer flex items-center justify-between"
                                    onClick={() => toggleSection('complete')}
                                >
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <FileText className="h-6 w-6 text-slate-400" />
                                        Complete Analysis
                                    </h2>
                                    {expandedSections.complete ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>
                                {expandedSections.complete && (
                                    <div className="p-6">
                                        <p className="text-slate-200 leading-relaxed whitespace-pre-line">{selectedReport.complete_analysis}</p>
                                    </div>
                                )}
                            </div>

                            {/* Feedback Buttons - Compact horizontal layout */}
                            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-lg p-4 shadow-lg">
                                <div className="flex items-center justify-center">
                                    <FeedbackButtons
                                        featureType="report_analysis"
                                        referenceId={selectedReport.id.toString()}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-12 text-center">
                            <p className="text-slate-400">Report is being processed. Please check back soon.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MedicalReportAnalysis;
