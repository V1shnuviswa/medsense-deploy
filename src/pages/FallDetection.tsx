import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Video, CheckCircle, Bell, User, RefreshCw, Camera as CameraIcon } from 'lucide-react';
import { fallDetectionService, FallEvent, Camera, FallStats } from '../services/fallDetectionService';

const FallDetection: React.FC = () => {
    const [isMonitoring, setIsMonitoring] = useState(true);
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');
    const [alerts, setAlerts] = useState<FallEvent[]>([]);
    const [stats, setStats] = useState<FallStats>({ total_events: 0, active_cameras: 0, recent_falls_24h: 0 });
    const [lastInference, setLastInference] = useState<any>(null);
    const [detectingWebcam, setDetectingWebcam] = useState(false);
    const [webcamMessage, setWebcamMessage] = useState<string>('');

    // Initial Data Fetch
    useEffect(() => {
        fetchData();
    }, []);

    // Polling for updates
    useEffect(() => {
        if (!isMonitoring) return;

        const interval = setInterval(() => {
            fetchData();
            if (selectedCamera) {
                runInferenceSimulation();
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [isMonitoring, selectedCamera]);

    const fetchData = async () => {
        const [fetchedCameras, fetchedEvents, fetchedStats] = await Promise.all([
            fallDetectionService.getCameras(),
            fallDetectionService.getEvents(),
            fallDetectionService.getStats()
        ]);

        setCameras(fetchedCameras);
        if (fetchedCameras.length > 0 && !selectedCamera) {
            setSelectedCamera(fetchedCameras[0].id);
        }
        setAlerts(fetchedEvents);
        setStats(fetchedStats);
    };

    const runInferenceSimulation = async () => {
        if (!selectedCamera) return;
        const result = await fallDetectionService.inferFrame(selectedCamera);
        if (result) {
            setLastInference(result);
            if (result.fall_detected) {
                // Refresh events immediately if a fall is detected
                const events = await fallDetectionService.getEvents();
                setAlerts(events);
            }
        }
    };

    const handleDetectWebcam = async () => {
        setDetectingWebcam(true);
        setWebcamMessage('');
        try {
            const result = await fallDetectionService.detectWebcam();
            if (result && result.success) {
                setWebcamMessage(result.message);
                // Refresh camera list
                await fetchData();
                setTimeout(() => setWebcamMessage(''), 5000);
            } else {
                setWebcamMessage(result?.error || 'Failed to detect webcam');
            }
        } catch (error) {
            setWebcamMessage('Error detecting webcam');
        } finally {
            setDetectingWebcam(false);
        }
    };

    return (
        <div className="space-y-6 page-transition">
            {/* Header */}
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2 flex items-center space-x-2">
                            <Activity className="h-7 w-7 text-rose-500" />
                            <span>Fall Detection & Monitoring</span>
                        </h1>
                        <p className="text-slate-400">Real-time AI monitoring for patient safety</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${isMonitoring
                            ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
                            <span className="text-sm font-medium">{isMonitoring ? 'System Active' : 'System Stopped'}</span>
                        </div>
                        <button
                            onClick={() => setIsMonitoring(!isMonitoring)}
                            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                isMonitoring 
                                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                        >
                            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Feed Placeholder */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <Video className="h-4 w-4 text-blue-400" /> Live Camera Feed
                            </h3>
                            <div className="flex items-center gap-2">
                                {cameras.length === 0 && (
                                    <button
                                        onClick={handleDetectWebcam}
                                        disabled={detectingWebcam}
                                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                                    >
                                        <CameraIcon className="h-4 w-4" />
                                        {detectingWebcam ? 'Detecting...' : 'Detect Webcam'}
                                    </button>
                                )}
                                <select
                                    className="bg-slate-800 border-slate-700 text-slate-300 text-sm rounded-lg px-2 py-1"
                                    value={selectedCamera}
                                    onChange={(e) => setSelectedCamera(e.target.value)}
                                >
                                    {cameras.length === 0 && <option>No cameras found</option>}
                                    {cameras.map(cam => (
                                        <option key={cam.id} value={cam.id}>{cam.name} ({cam.location})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {webcamMessage && (
                            <div className="px-4 py-2 bg-blue-900/30 border-b border-slate-800 text-blue-300 text-sm">
                                {webcamMessage}
                            </div>
                        )}
                        <div className="aspect-video bg-slate-950 relative overflow-hidden">
                            {selectedCamera && cameras.length > 0 && isMonitoring ? (
                                <>
                                    {/* Live Video Stream */}
                                    <img 
                                        src={`http://localhost:5001/api/fall-detection/stream/${selectedCamera}`}
                                        alt="Live Camera Feed"
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            console.error('Stream error:', e);
                                            // Keep trying to reload the stream
                                            setTimeout(() => {
                                                e.currentTarget.src = `http://localhost:5001/api/fall-detection/stream/${selectedCamera}?t=${Date.now()}`;
                                            }, 1000);
                                        }}
                                        onLoad={() => console.log('Stream loaded successfully')}
                                    />
                                    
                                    {/* Camera Overlay */}
                                    <div className="absolute top-4 left-4 bg-black/50 px-2 py-1 rounded text-xs text-red-500 font-mono flex items-center gap-2 z-10">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        REC
                                    </div>
                                    <div className="absolute bottom-4 left-4 text-white/70 font-mono text-sm bg-black/50 px-2 py-1 rounded z-10">
                                        {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                                    </div>
                                    
                                    {lastInference?.fall_detected && (
                                        <div className="absolute top-4 right-4 bg-red-500/90 text-white px-3 py-2 rounded-lg font-bold text-sm animate-pulse z-10">
                                            ⚠️ FALL DETECTED
                                        </div>
                                    )}
                                </>
                            ) : selectedCamera && cameras.length > 0 && !isMonitoring ? (
                                /* Monitoring Stopped */
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <Video className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                                        <p className="text-slate-400 text-lg font-semibold mb-2">Monitoring Stopped</p>
                                        <p className="text-slate-500 text-sm">
                                            Click "Start Monitoring" to resume camera feed
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                /* Placeholder when no camera selected */
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <User className="h-16 w-16 text-slate-700 mx-auto mb-2" />
                                        <p className="text-slate-600">
                                            {cameras.length === 0 ? 'No cameras detected' : 'Select a camera'}
                                        </p>
                                        <p className="text-xs text-slate-700">
                                            {cameras.length === 0 ? 'Click "Detect Webcam" to get started' : 'Choose from dropdown above'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900/80 border border-slate-700/50 p-4 rounded-xl">
                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Active Cameras</p>
                            <p className="text-xl font-bold text-white">{stats.active_cameras}</p>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-700/50 p-4 rounded-xl">
                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Events</p>
                            <p className="text-xl font-bold text-white">{stats.total_events}</p>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-700/50 p-4 rounded-xl">
                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Falls (24h)</p>
                            <p className="text-xl font-bold text-emerald-400">{stats.recent_falls_24h}</p>
                        </div>
                    </div>
                </div>

                {/* Alerts Panel */}
                <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6 shadow-xl h-fit">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Bell className="h-4 w-4 text-yellow-400" /> Recent Alerts
                        </h3>
                        <button onClick={fetchData} className="text-slate-400 hover:text-white">
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                        {alerts.map(alert => (
                            <div key={alert.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 transition-colors hover:bg-slate-800">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        {alert.severity === 'High' ? (
                                            <AlertTriangle className="h-4 w-4 text-red-500" />
                                        ) : (
                                            <Activity className="h-4 w-4 text-blue-400" />
                                        )}
                                        <span className={`font-medium ${alert.severity === 'High' ? 'text-red-400' : 'text-blue-300'}`}>
                                            {alert.severity === 'High' ? 'Fall Detected' : 'Warning'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {new Date(alert.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-300 mb-2">Detected in {alert.location || alert.camera_name}</p>
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${alert.severity === 'High'
                                        ? 'bg-red-900/20 border-red-800 text-red-400'
                                        : 'bg-blue-900/20 border-blue-800 text-blue-400'
                                        }`}>
                                        {alert.severity} Priority
                                    </span>
                                    <span className={`text-xs ${alert.status === 'New' ? 'text-yellow-400' : 'text-emerald-400'
                                        }`}>
                                        {alert.status}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {alerts.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No alerts today</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FallDetection;
