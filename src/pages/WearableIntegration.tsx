import React, { useState } from 'react';
import { Watch, Smartphone, Activity, Heart, Moon, Zap, CheckCircle2, Plus, RefreshCw, BarChart3 } from 'lucide-react';

const WearableIntegration: React.FC = () => {
    const [connectedDevices, setConnectedDevices] = useState<string[]>(['Apple Health']);
    const [isSyncing, setIsSyncing] = useState(false);

    const devices = [
        { id: 'Apple Health', name: 'Apple Health', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10', status: 'Connected' },
        { id: 'Google Fit', name: 'Google Fit', icon: Heart, color: 'text-blue-500', bg: 'bg-blue-500/10', status: 'Available' },
        { id: 'Fitbit', name: 'Fitbit', icon: Watch, color: 'text-teal-500', bg: 'bg-teal-500/10', status: 'Available' },
        { id: 'Oura', name: 'Oura Ring', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-500/10', status: 'Available' },
    ];

    const handleConnect = (deviceId: string) => {
        if (connectedDevices.includes(deviceId)) {
            setConnectedDevices(connectedDevices.filter(id => id !== deviceId));
        } else {
            setConnectedDevices([...connectedDevices, deviceId]);
        }
    };

    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 2000);
    };

    return (
        <div className="space-y-8 page-transition">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse"></div>
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-2">
                        <Watch className="h-8 w-8 text-blue-400" />
                        <h1 className="text-4xl font-bold text-white tracking-tight">Wearable Integration</h1>
                    </div>
                    <p className="text-slate-400 text-lg max-w-2xl">
                        Connect your devices to sync real-time health metrics and get a holistic view of your well-being.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Device Connections */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Data Sources</h2>
                        <div className="space-y-4">
                            {devices.map((device) => {
                                const isConnected = connectedDevices.includes(device.id);
                                return (
                                    <div key={device.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                                        <div className="flex items-center space-x-4">
                                            <div className={`p-3 rounded-lg ${device.bg}`}>
                                                <device.icon className={`h-6 w-6 ${device.color}`} />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-medium">{device.name}</h3>
                                                <p className={`text-xs ${isConnected ? 'text-blue-400' : 'text-slate-500'}`}>
                                                    {isConnected ? 'Syncing Active' : 'Not Connected'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleConnect(device.id)}
                                            className={`p-2 rounded-lg transition-colors ${isConnected
                                                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                                : 'bg-slate-700 hover:bg-slate-600 text-white'
                                                }`}
                                        >
                                            {isConnected ? <CheckCircle2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Sync Status</h3>
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Last Sync</span>
                                <span className="text-white">Just now</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Data Points</span>
                                <span className="text-white">1,240</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Battery Optimization</span>
                                <span className="text-blue-400">Enabled</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Heart Rate Card */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 relative overflow-hidden group hover:border-rose-500/30 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Heart className="h-24 w-24 text-rose-500" />
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-rose-500/10 rounded-lg">
                                    <Heart className="h-6 w-6 text-rose-500" />
                                </div>
                                <span className="text-xs font-medium text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full">Live</span>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-1">72 <span className="text-lg text-slate-500 font-normal">bpm</span></h3>
                            <p className="text-slate-400 text-sm mb-4">Resting Heart Rate</p>
                            <div className="h-16 flex items-end space-x-1">
                                {[40, 65, 55, 80, 60, 75, 50, 70, 65, 55, 85, 72].map((h, i) => (
                                    <div key={i} className="flex-1 bg-rose-500/20 rounded-t-sm relative overflow-hidden">
                                        <div style={{ height: `${h}%` }} className="absolute bottom-0 w-full bg-rose-500 rounded-t-sm"></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sleep Card */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Moon className="h-24 w-24 text-indigo-500" />
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                    <Moon className="h-6 w-6 text-indigo-500" />
                                </div>
                                <span className="text-xs font-medium text-slate-400">Last Night</span>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-1">7h 42m</h3>
                            <p className="text-slate-400 text-sm mb-4">Sleep Duration</p>
                            <div className="flex items-center space-x-2 text-sm">
                                <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded">Deep: 1h 20m</span>
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">REM: 2h 10m</span>
                            </div>
                        </div>

                        {/* Activity Card */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 relative overflow-hidden group hover:border-orange-500/30 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap className="h-24 w-24 text-orange-500" />
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Zap className="h-6 w-6 text-orange-500" />
                                </div>
                                <span className="text-xs font-medium text-slate-400">Today</span>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-1">8,432</h3>
                            <p className="text-slate-400 text-sm mb-4">Steps Taken</p>
                            <div className="w-full bg-slate-700/30 rounded-full h-2">
                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-right">Goal: 12,000</p>
                        </div>

                        {/* HRV Card */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <BarChart3 className="h-24 w-24 text-blue-500" />
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Activity className="h-6 w-6 text-blue-500" />
                                </div>
                                <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">Optimal</span>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-1">45 <span className="text-lg text-slate-500 font-normal">ms</span></h3>
                            <p className="text-slate-400 text-sm mb-4">Heart Rate Variability</p>
                            <p className="text-xs text-slate-400">
                                Your HRV indicates good recovery. You are ready for high-intensity training today.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WearableIntegration;
