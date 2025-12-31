import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Brain, Smile, Activity, Moon, Sun, Cloud, Wind, BookOpen, Headphones, Heart, Save, Loader2 } from 'lucide-react';

interface JournalEntry {
    id: string;
    mood: string;
    content: string;
    tags: string;
    created_at: string;
}

const MentalHealth: React.FC = () => {
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showVideoModal, setShowVideoModal] = useState(false);

    // CBT Video Library
    const videoCategories = [
        {
            title: "Cognitive Behavioral Therapy for Anxiety",
            videos: [
                { title: "5 CBT Exercises for Anxiety – Therapy in a Nutshell", url: "https://www.youtube.com/watch?v=8-2WQF3SWwo", thumbnail: "https://img.youtube.com/vi/8-2WQF3SWwo/mqdefault.jpg" },
                { title: "How to Do CBT for Anxiety", url: "https://www.youtube.com/watch?v=qLEAhXAYUnQ", thumbnail: "https://img.youtube.com/vi/qLEAhXAYUnQ/mqdefault.jpg" },
            ]
        },
        {
            title: "Cognitive Behavioral Therapy for Depression",
            videos: [
                { title: "CBT for Depression | Mental Health Webinar", url: "https://www.youtube.com/watch?v=ebLO9_viq2g", thumbnail: "https://img.youtube.com/vi/ebLO9_viq2g/mqdefault.jpg" },
                { title: "How CBT Treats Depression – Animated Explanation", url: "https://www.youtube.com/watch?v=ZdyOwZ4_RnI", thumbnail: "https://img.youtube.com/vi/ZdyOwZ4_RnI/mqdefault.jpg" },
            ]
        },
        {
            title: "Cognitive Behavioral Therapy for Insomnia (CBT-I)",
            videos: [
                { title: "CBT-I: Cognitive Behavioral Therapy for Insomnia", url: "https://www.youtube.com/watch?v=PFP7LOQNbO8", thumbnail: "https://img.youtube.com/vi/PFP7LOQNbO8/mqdefault.jpg" },
                { title: "CBT-I: How to Sleep Better", url: "https://www.youtube.com/watch?v=XXplGH5v1P8", thumbnail: "https://img.youtube.com/vi/XXplGH5v1P8/mqdefault.jpg" },
            ]
        },
        {
            title: "Cognitive Behavioral Therapy for Chronic Pain",
            videos: [
                { title: "Introduction to CBT for Chronic Pain", url: "https://www.youtube.com/watch?v=F5O9tKbKVmU", thumbnail: "https://img.youtube.com/vi/F5O9tKbKVmU/mqdefault.jpg" },
            ]
        },
        {
            title: "Cognitive Behavioral Therapy for OCD",
            videos: [
                { title: "CBT Explained for OCD", url: "https://www.youtube.com/watch?v=xIYECtNlhpE", thumbnail: "https://img.youtube.com/vi/xIYECtNlhpE/mqdefault.jpg" },
            ]
        },
        {
            title: "Cognitive Behavioral Therapy for PTSD",
            videos: [
                { title: "CBT for PTSD – Basics", url: "https://www.youtube.com/watch?v=iiqu2Zaivqk", thumbnail: "https://img.youtube.com/vi/iiqu2Zaivqk/mqdefault.jpg" },
            ]
        },
        {
            title: "General Cognitive Behavioral Therapy",
            videos: [
                { title: "CBT for Anxiety, Depression, OCD, Chronic Fatigue", url: "https://www.youtube.com/watch?v=Q_40fnZ1LKc", thumbnail: "https://img.youtube.com/vi/Q_40fnZ1LKc/mqdefault.jpg" },
                { title: "LIVE Cognitive Behavioral Therapy Session", url: "https://youtube.com/playlist?list=PLPJVlVRVmhc4_4WqjBXuWXB_0MQunBEjb", thumbnail: "https://img.youtube.com/vi/videoseries/mqdefault.jpg?list=PLPJVlVRVmhc4_4WqjBXuWXB_0MQunBEjb" },
                { title: "Introduction to the Magic of CBT", url: "https://www.youtube.com/watch?v=0ViaCs0k2jM", thumbnail: "https://img.youtube.com/vi/0ViaCs0k2jM/mqdefault.jpg" },
            ]
        },
    ];

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            const response = await fetch('/api/journal');
            if (response.ok) {
                const data = await response.json();
                setEntries(data);
            }
        } catch (error) {
            console.error('Failed to fetch journal entries:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEntry = async () => {
        if (!selectedMood && !note.trim()) return;

        setIsSaving(true);
        try {
            const response = await fetch('/api/journal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mood: selectedMood,
                    content: note,
                    tags: 'daily-checkin'
                }),
            });

            if (response.ok) {
                setNote('');
                setSelectedMood(null);
                fetchEntries();
            }
        } catch (error) {
            console.error('Failed to save entry:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const moodOptions = [
        { icon: Sun, label: "Great", color: "text-yellow-400", bg: "bg-yellow-400/10 hover:bg-yellow-400/20", value: "Great" },
        { icon: Cloud, label: "Good", color: "text-blue-400", bg: "bg-blue-400/10 hover:bg-blue-400/20", value: "Good" },
        { icon: Wind, label: "Okay", color: "text-slate-400", bg: "bg-slate-400/10 hover:bg-slate-400/20", value: "Okay" },
        { icon: Moon, label: "Low", color: "text-indigo-400", bg: "bg-indigo-400/10 hover:bg-indigo-400/20", value: "Low" },
        { icon: Activity, label: "Anxious", color: "text-red-400", bg: "bg-red-400/10 hover:bg-red-400/20", value: "Anxious" },
    ];

    return (
        <div className="space-y-8 page-transition">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse"></div>
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-2">
                        <Brain className="h-8 w-8 text-blue-400" />
                        <h1 className="text-4xl font-bold text-white tracking-tight">Mental Wellness</h1>
                    </div>
                    <p className="text-slate-400 text-lg max-w-2xl">
                        Track your mood, journal your thoughts, and access mindfulness resources.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Mood Tracker & Journal */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                            <Smile className="h-5 w-5 mr-2 text-blue-400" />
                            Daily Check-in
                        </h2>

                        <div className="grid grid-cols-5 gap-4 mb-8">
                            {moodOptions.map((mood, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedMood(mood.value)}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all group ${selectedMood === mood.value
                                        ? `${mood.bg} border-blue-500`
                                        : 'border-slate-700/50 ' + mood.bg
                                        }`}
                                >
                                    <mood.icon className={`h-8 w-8 mb-2 ${mood.color} group-hover:scale-110 transition-transform`} />
                                    <span className="text-xs font-medium text-slate-300">{mood.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="How are you feeling today? Write your thoughts here..."
                                className="w-full h-32 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveEntry}
                                    disabled={isSaving || (!selectedMood && !note.trim())}
                                    className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Entry
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Recent Entries */}
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Recent Entries</h3>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                            </div>
                        ) : entries.length > 0 ? (
                            <div className="space-y-4">
                                {entries.map((entry) => (
                                    <div key={entry.id} className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs text-slate-500">
                                                {new Date(entry.created_at).toLocaleDateString()} at {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {entry.mood && (
                                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-700 text-blue-300">
                                                    {entry.mood}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-300 text-sm whitespace-pre-wrap">{entry.content}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-center py-8">No entries yet. Start journaling above!</p>
                        )}
                    </div>
                </div>

                {/* Sidebar Stats & Resources */}
                <div className="space-y-6">
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Wellness Score</h3>
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                                        Optimal
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-semibold inline-block text-blue-400">
                                        85%
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200/10">
                                <div style={{ width: "85%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 mt-4">
                            Your cognitive load is balanced. Sleep quality has improved by 12% this week.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Recommended</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start space-x-3 group cursor-pointer">
                                <Heart className="h-5 w-5 text-rose-400 mt-0.5 group-hover:scale-110 transition-transform" />
                                <div>
                                    <h4 className="text-sm font-semibold text-white group-hover:text-rose-400 transition-colors">Gratitude Journaling</h4>
                                    <p className="text-xs text-slate-400">Write down 3 things you're grateful for.</p>
                                </div>
                            </li>
                            <li className="flex items-start space-x-3 group cursor-pointer">
                                <Wind className="h-5 w-5 text-blue-400 mt-0.5 group-hover:scale-110 transition-transform" />
                                <div>
                                    <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">Box Breathing</h4>
                                    <p className="text-xs text-slate-400">4-4-4-4 breathing technique.</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {/* CBT & Guided Meditation Card */}
                        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/30 transition-all group">
                            <div className="flex items-center justify-between mb-2">
                                <Headphones className="h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform" />
                                <button
                                    onClick={() => setShowVideoModal(true)}
                                    className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                                >
                                    View
                                </button>
                            </div>
                            <h3 className="text-sm font-bold text-white mb-1">CBT & Guided Meditation</h3>
                            <p className="text-slate-400 text-xs">Cognitive behavioral therapy and mindfulness resources</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Modal - Using Portal to break out of parent containers */}
            {showVideoModal && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowVideoModal(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="shrink-0 bg-gradient-to-r from-blue-900 to-blue-800 border-b border-slate-700 p-6 flex items-center justify-between rounded-t-2xl">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Headphones className="h-7 w-7 text-blue-400" />
                                    Cognitive Behavioral Therapy & Guided Meditation Library
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">Cognitive Behavioral Therapy resources for your mental wellness</p>
                            </div>
                            <button
                                onClick={() => setShowVideoModal(false)}
                                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Video Grid */}
                        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
                            {videoCategories.map((category, catIdx) => (
                                <div key={catIdx}>
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                                        {category.title}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {category.videos.map((video, vidIdx) => (
                                            <a
                                                key={vidIdx}
                                                href={video.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all"
                                            >
                                                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                                                    <img
                                                        src={video.thumbnail}
                                                        alt={video.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M8 5v14l11-7z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                                                        {video.title}
                                                    </h4>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default MentalHealth;
