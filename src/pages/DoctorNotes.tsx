import React, { useState, useEffect } from 'react';
import { FileText, Pill, History, Plus, Search, Filter, ChevronRight, Activity, Mic, Square, Save, LayoutTemplate, AlertCircle, Loader2, Trash2, Video } from 'lucide-react';
import { doctorNotesAPI, DoctorNote } from '../api/doctorNotes';
import VideoConsultation from '../components/VideoConsultation';

const DoctorNotes: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'consultation' | 'records' | 'medications' | 'history' | 'video'>('consultation');
    const [isRecording, setIsRecording] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [savedNotes, setSavedNotes] = useState<DoctorNote[]>([]);
    const [recentVideos, setRecentVideos] = useState<any[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);

    // Load saved notes and video consultations on component mount
    useEffect(() => {
        loadNotes();
        loadVideoConsultations();
    }, []);

    const loadNotes = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await doctorNotesAPI.getAllNotes();
            console.log('Loaded notes:', response.notes.length, 'notes');
            setSavedNotes(response.notes);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load notes');
            console.error('Error loading notes:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadVideoConsultations = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/video-consultation/videos', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Loaded video consultations:', data.videos);
                setRecentVideos(data.videos || []);
            }
        } catch (err) {
            console.error('Error loading video consultations:', err);
        }
    };

    const handleVideoClick = async (video: any) => {
        setSelectedVideo(video);

        // Fetch video with authentication
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5001/api/video-consultation/video/${video.video_id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const videoUrl = URL.createObjectURL(blob);
                setSelectedVideo({ ...video, videoUrl });
            }
        } catch (err) {
            console.error('Error loading video:', err);
        }
    };

    const closeVideoModal = () => {
        setSelectedVideo(null);
    };

    const handleDeleteVideo = async (videoId: string) => {
        if (!window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5001/api/video-consultation/video/${videoId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                console.log('Video deleted successfully');
                closeVideoModal();
                loadVideoConsultations(); // Refresh the list
            } else {
                alert('Failed to delete video');
            }
        } catch (err) {
            console.error('Error deleting video:', err);
            alert('Error deleting video');
        }
    };

    const extractMedicationsFromNote = (content: string): string[] => {
        const medications: string[] = [];
        const lines = content.split('\n');

        // Words to exclude (common non-medication words)
        const excludeWords = [
            'routine', 'continue', 'current', 'medications', 'plan', 'assessment',
            'follow', 'followup', 'advise', 'encourage', 'patient', 'reports',
            'controlled', 'stable', 'mild', 'severe', 'chronic', 'acute'
        ];

        let inMedicationSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lowerLine = line.toLowerCase();

            // Check if we're entering a medication section
            if (lowerLine.match(/^medications?:/i)) {
                inMedicationSection = true;
                // Try to extract medications from the same line
                const afterColon = line.split(':')[1];
                if (afterColon && afterColon.trim() && afterColon.trim().length > 3) {
                    const cleaned = afterColon.trim();
                    if (!excludeWords.includes(cleaned.toLowerCase())) {
                        medications.push(cleaned);
                    }
                }
                continue;
            }

            // Check if we're leaving the medication section
            if (inMedicationSection && lowerLine.match(/^(plan|assessment|follow|next|recommendation|clinical|reason):/i)) {
                inMedicationSection = false;
            }

            // Extract medications from the section
            if (inMedicationSection && line) {
                // Remove bullet points, dashes, numbers
                let cleaned = line.replace(/^[-•*\d.)\s]+/, '').trim();

                // Skip if it's too short or is an excluded word
                if (cleaned && cleaned.length > 2 && !excludeWords.includes(cleaned.toLowerCase())) {
                    // Only add if it looks like a medication (has letters and optionally dosage)
                    if (cleaned.match(/^[A-Za-z]/)) {
                        medications.push(cleaned);
                    }
                }
            }
        }

        // Also scan for medication patterns with dosages (more reliable)
        const medPattern = /\b([A-Z][a-z]+(?:stat|pril|cillin|mycin|olol|pine|zole|mab|xin|ide|one|tin|vir|mide|azole|oxin|afil|etine|azine)\w*)\s+(\d+\s*(?:mg|mcg|g|ml|units?))/gi;
        const contentMatches = content.matchAll(medPattern);
        for (const match of contentMatches) {
            const med = `${match[1]} ${match[2]}`;
            if (!medications.some(m => m.toLowerCase().includes(med.toLowerCase()))) {
                medications.push(med);
            }
        }

        // Remove duplicates and filter out excluded words
        const unique = [...new Set(medications)]
            .filter(m => m && m.length > 2 && !excludeWords.includes(m.toLowerCase()));

        return unique;
    };

    const extractConditionsFromNote = (content: string): string[] => {
        const conditions: string[] = [];
        const lines = content.toLowerCase().split('\n');

        // Common condition patterns
        const conditionPatterns = [
            /(?:diagnosis|diagnosed with|history of|condition)s?:?\s*(.+)/i,
            /(?:assessment|impression)s?:?\s*(.+)/i,
        ];

        // Common medical conditions
        const commonConditions = [
            'hypertension', 'diabetes', 'asthma', 'copd', 'heart disease',
            'arthritis', 'depression', 'anxiety', 'obesity', 'hyperlipidemia',
            'hypothyroidism', 'hyperthyroidism', 'chronic kidney disease',
            'coronary artery disease', 'atrial fibrillation', 'heart failure'
        ];

        lines.forEach(line => {
            // Check for condition sections
            conditionPatterns.forEach(pattern => {
                const match = line.match(pattern);
                if (match && match[1]) {
                    const extracted = match[1].trim();
                    // Split by common delimiters
                    const parts = extracted.split(/[,;•\-]/);
                    parts.forEach(part => {
                        const cleaned = part.trim().replace(/^\d+\.\s*/, '');
                        if (cleaned.length > 3) {
                            conditions.push(cleaned);
                        }
                    });
                }
            });

            // Look for common conditions mentioned anywhere
            commonConditions.forEach(condition => {
                if (line.includes(condition) && !conditions.some(c => c.toLowerCase().includes(condition))) {
                    // Capitalize first letter
                    const formatted = condition.charAt(0).toUpperCase() + condition.slice(1);
                    conditions.push(formatted);
                }
            });
        });

        return [...new Set(conditions)]; // Remove duplicates
    };

    const extractDoctorName = (content: string): string => {
        const lines = content.split('\n');
        for (const line of lines) {
            const match = line.match(/(?:doctor|dr\.?|physician)s?:?\s*(.+)/i);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return 'Unknown Doctor';
    };

    const handleSaveNote = async () => {
        if (!noteContent.trim()) {
            setError('Please enter some content before saving');
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Extract data from note content
            const extractedMedications = extractMedicationsFromNote(noteContent);
            const extractedConditions = extractConditionsFromNote(noteContent);
            const extractedDoctor = extractDoctorName(noteContent);

            console.log('Extracted data:', {
                medications: extractedMedications,
                conditions: extractedConditions,
                doctor: extractedDoctor
            });

            const noteData = {
                content: noteContent,
                date: new Date().toISOString(),
                doctor: extractedDoctor,
                conditions: extractedConditions,
                medications: extractedMedications,
                patient_name: 'Patient', // You can make this dynamic
                type: 'Consultation',
                title: `Consultation - ${new Date().toLocaleDateString()}`
            };

            if (currentNoteId) {
                await doctorNotesAPI.updateNote(currentNoteId, noteData);
                setSuccessMessage('Note updated successfully!');
            } else {
                const response = await doctorNotesAPI.createNote(noteData);
                setSuccessMessage('Note saved successfully!');
                setCurrentNoteId(response.note_id);
            }

            // Reload notes to show the new one
            await loadNotes();

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save note');
        } finally {
            setIsSaving(false);
        }
    };

    const handleNewNote = () => {
        setNoteContent('');
        setCurrentNoteId(null);
        setError(null);
        setSuccessMessage(null);
    };

    const handleTabChange = (tab: 'consultation' | 'records' | 'medications' | 'history' | 'video') => {
        setActiveTab(tab);
        // Refresh notes when switching to tabs that display saved data
        if (tab === 'records' || tab === 'medications' || tab === 'history') {
            loadNotes();
        }
    };

    const handleLoadNote = (note: DoctorNote) => {
        setNoteContent(note.content);
        setCurrentNoteId(note.id);
        setActiveTab('consultation');
        setError(null);
        setSuccessMessage(null);
    };

    const handleDeleteNote = async (noteId: string, event?: React.MouseEvent) => {
        // Prevent event bubbling if called from within a clickable element
        if (event) {
            event.stopPropagation();
        }

        if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
            return;
        }

        try {
            await doctorNotesAPI.deleteNote(noteId);
            setSuccessMessage('Note deleted successfully!');

            // If we're editing the deleted note, clear the editor
            if (currentNoteId === noteId) {
                setNoteContent('');
                setCurrentNoteId(null);
            }

            // Reload notes
            await loadNotes();

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete note');
        }
    };

    // Recording timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } else {
            setRecordingDuration(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const insertTemplate = (type: 'soap' | 'followup') => {
        let template = "";
        if (type === 'soap') {
            template = `SUBJECTIVE:
Patient presents with...

OBJECTIVE:
Vitals: BP: __ HR: __ Temp: __
Exam Findings:

ASSESSMENT:
1. 

PLAN:
1. 
2. Follow up in __ weeks.`;
        } else {
            template = `FOLLOW-UP NOTE
Reason for Visit: Routine check-up

Interval History:
- No new complaints.
- Adherent to medications.

Assessment: Stable.

Plan: Continue current management.`;
        }
        setNoteContent(prev => prev + (prev ? "\n\n" : "") + template);
    };

    return (
        <div className="space-y-6 page-transition">
            {/* Header */}
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2 flex items-center space-x-2">
                            <FileText className="h-7 w-7 text-blue-400" />
                            <span>My Health Vault</span>
                        </h1>
                        <p className="text-slate-400">Your personal, longitudinal health record</p>
                    </div>
                    {activeTab !== 'consultation' && (
                        <button
                            onClick={() => handleTabChange('consultation')}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            <span>New Consultation</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-slate-700/50 pb-1 overflow-x-auto">
                <button
                    onClick={() => handleTabChange('consultation')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'consultation' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    New Consultation
                </button>
                <button
                    onClick={() => handleTabChange('records')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'records' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    Health Records
                </button>
                <button
                    onClick={() => handleTabChange('medications')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'medications' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    Medications
                </button>
                <button
                    onClick={() => handleTabChange('history')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'history' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    History & Conditions
                </button>
                <button
                    onClick={() => handleTabChange('video')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'video' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    <Video className="h-4 w-4 inline mr-1" />
                    Video Consultation
                </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-4">

                    {activeTab === 'consultation' && (
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6 shadow-xl h-[600px] flex flex-col">
                            {/* Status Messages */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400">
                                    <AlertCircle className="h-5 w-5" />
                                    <span>{error}</span>
                                </div>
                            )}
                            {successMessage && (
                                <div className="mb-4 p-3 bg-emerald-900/20 border border-emerald-500/50 rounded-lg flex items-center gap-2 text-emerald-400">
                                    <Save className="h-5 w-5" />
                                    <span>{successMessage}</span>
                                </div>
                            )}

                            {/* Toolbar */}
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setIsRecording(!isRecording)}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${isRecording
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                                            : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700'
                                            }`}
                                    >
                                        {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
                                        <span>{isRecording ? formatTime(recordingDuration) : 'Record Session'}</span>
                                    </button>

                                    <div className="h-6 w-px bg-slate-700 mx-2"></div>

                                    <button
                                        onClick={() => insertTemplate('soap')}
                                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                                        title="Insert SOAP Template"
                                    >
                                        <LayoutTemplate className="h-5 w-5" />
                                    </button>

                                    {currentNoteId && (
                                        <button
                                            onClick={handleNewNote}
                                            className="flex items-center space-x-2 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm"
                                        >
                                            <Plus className="h-4 w-4" />
                                            <span>New</span>
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={handleSaveNote}
                                    disabled={isSaving}
                                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-600/90 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            <span>{currentNoteId ? 'Update Note' : 'Save Note'}</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Editor */}
                            <textarea
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="Start typing or recording..."
                                className="flex-1 w-full bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-500 resize-none font-mono leading-relaxed"
                            />
                        </div>
                    )}

                    {activeTab === 'records' && (
                        <>
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search records..."
                                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <button className="p-2 bg-slate-800/50 border border-slate-600 rounded-lg text-slate-300 hover:text-white">
                                    <Filter className="h-4 w-4" />
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                                    <span className="ml-3 text-slate-400">Loading notes...</span>
                                </div>
                            ) : savedNotes.length === 0 ? (
                                <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-8 text-center">
                                    <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">No consultation notes yet</p>
                                    <p className="text-sm text-slate-500 mt-2">Create your first note in the Consultation tab</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {savedNotes.map(note => (
                                        <div
                                            key={note.id}
                                            className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/50 transition-colors group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div
                                                    onClick={() => handleLoadNote(note)}
                                                    className="flex items-center space-x-4 flex-1 cursor-pointer"
                                                >
                                                    <div className="p-3 rounded-lg bg-blue-900/20 text-blue-400">
                                                        <FileText className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-white">{note.title}</h3>
                                                        <p className="text-sm text-slate-400">{note.type} • {note.doctor}</p>
                                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{note.content.substring(0, 100)}...</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-sm text-slate-500">
                                                        {new Date(note.created_at).toLocaleDateString()}
                                                    </span>
                                                    <button
                                                        onClick={(e) => handleDeleteNote(note.id, e)}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete note"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                    <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-slate-300 transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'medications' && (
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Pill className="h-5 w-5 text-pink-400" /> Medications from Notes
                            </h3>
                            {savedNotes.length === 0 ? (
                                <div className="text-center py-8">
                                    <Pill className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">No medications recorded yet</p>
                                    <p className="text-sm text-slate-500 mt-2">Medications mentioned in consultation notes will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {savedNotes.map(note => {
                                        const meds = note.patient_context?.medications || [];
                                        console.log(`Note ${note.id}: ${meds.length} medications`, meds);
                                        if (meds.length === 0) return null;
                                        return (
                                            <div key={note.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                                <p className="text-xs text-slate-400 mb-2">From: {note.title}</p>
                                                <div className="space-y-2">
                                                    {meds.map((med, idx) => (
                                                        <div key={idx} className="flex items-center space-x-3">
                                                            <div className="p-2 bg-pink-900/20 text-pink-400 rounded">
                                                                <Pill className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-white">{med}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {savedNotes.every(note => (note.patient_context?.medications || []).length === 0) && (
                                        <div className="text-center py-8">
                                            <Pill className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                            <p className="text-slate-400">No medications found in your notes</p>
                                            <p className="text-sm text-slate-500 mt-2">Add medications to your consultation notes under a "medications:" section</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-400" /> Chronic Conditions from Notes
                            </h3>
                            {savedNotes.length === 0 ? (
                                <div className="text-center py-8">
                                    <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">No medical history recorded yet</p>
                                    <p className="text-sm text-slate-500 mt-2">Conditions mentioned in consultation notes will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {savedNotes.map(note => {
                                        const conditions = note.patient_context?.conditions || [];
                                        if (conditions.length === 0) return null;
                                        return (
                                            <div key={note.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                                <p className="text-xs text-slate-400 mb-2">From: {note.title}</p>
                                                <div className="space-y-2">
                                                    {conditions.map((condition, idx) => (
                                                        <div key={idx} className="flex items-center justify-between">
                                                            <span className="text-white font-medium">{condition}</span>
                                                            <span className="px-2 py-1 bg-red-900/30 text-red-300 rounded text-xs border border-red-800/50">Active</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <VideoConsultation
                            patientName="John Doe"
                            onVideoSent={() => {
                                console.log('Video sent, refreshing videos');
                                loadVideoConsultations();
                            }}
                        />
                    )}
                </div>

                {/* Right Column - Timeline/Summary */}
                <div className="space-y-6">


                    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                            <History className="h-5 w-5 text-blue-400" />
                            <span>Recent Activity</span>
                        </h2>
                        {recentVideos.length === 0 ? (
                            <div className="text-center py-8">
                                <History className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm">No video consultations yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentVideos.map((video) => (
                                    <div
                                        key={video.video_id}
                                        className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer"
                                        onClick={() => handleVideoClick(video)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-purple-900/20 rounded-lg">
                                                <Video className="h-4 w-4 text-purple-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">Video Consultation</p>
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                                    {video.description || 'Video message to doctor'}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {new Date(video.uploaded_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Video Playback Modal */}
                {selectedVideo && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeVideoModal}>
                        <div className="bg-slate-900 rounded-xl max-w-4xl w-full border border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Video Consultation</h3>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {new Date(selectedVideo.uploaded_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDeleteVideo(selectedVideo.video_id)}
                                        className="p-2 hover:bg-red-900/20 rounded-lg transition-colors text-red-400 hover:text-red-300"
                                        title="Delete video"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={closeVideoModal}
                                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <video
                                    controls
                                    autoPlay
                                    className="w-full rounded-lg bg-black"
                                    src={selectedVideo.videoUrl}
                                >
                                    Your browser does not support the video tag.
                                </video>
                                {selectedVideo.description && (
                                    <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                                        <p className="text-sm font-medium text-slate-300 mb-1">Patient Notes:</p>
                                        <p className="text-sm text-slate-400">{selectedVideo.description}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DoctorNotes;
