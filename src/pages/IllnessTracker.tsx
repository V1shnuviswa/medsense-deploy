import React, { useState } from 'react';
import { Activity, Heart, Droplet, Wind, Thermometer, Plus, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface MetricLog {
    id: string;
    condition: string;
    metric: string;
    value: string;
    unit: string;
    timestamp: Date;
}

const IllnessTracker: React.FC = () => {
    const [selectedCondition, setSelectedCondition] = useState('Diabetes');
    const [metricValue, setMetricValue] = useState('');
    const [logs, setLogs] = useState<MetricLog[]>([]);

    const conditions = [
        { name: 'Diabetes', icon: Droplet, color: 'text-blue-400', metric: 'Blood Glucose', unit: 'mg/dL' },
        { name: 'Hypertension', icon: Heart, color: 'text-rose-400', metric: 'Blood Pressure', unit: 'mmHg' },
        { name: 'Asthma', icon: Wind, color: 'text-teal-400', metric: 'Peak Flow', unit: 'L/min' },
        { name: 'COPD', icon: Wind, color: 'text-cyan-400', metric: 'SpO2', unit: '%' },
        { name: 'Heart Health', icon: Activity, color: 'text-indigo-400', metric: 'Heart Rate', unit: 'bpm' },
        { name: 'CKD', icon: Activity, color: 'text-yellow-400', metric: 'Creatinine', unit: 'mg/dL' },
        { name: 'Chronic Pain', icon: AlertCircle, color: 'text-purple-400', metric: 'Pain Score', unit: '1-10' },
        { name: 'Fever', icon: Thermometer, color: 'text-orange-400', metric: 'Temperature', unit: '°F' },
    ];

    const handleLogMetric = () => {
        if (!metricValue) return;

        const condition = conditions.find(c => c.name === selectedCondition);
        if (!condition) return;

        const newLog: MetricLog = {
            id: Date.now().toString(),
            condition: condition.name,
            metric: condition.metric,
            value: metricValue,
            unit: condition.unit,
            timestamp: new Date(),
        };

        setLogs([newLog, ...logs]);
        setMetricValue('');
    };

    const activeCondition = conditions.find(c => c.name === selectedCondition);

    return (
        <div className="space-y-8 page-transition">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse"></div>
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-2">
                        <Activity className="h-8 w-8 text-blue-400" />
                        <h1 className="text-4xl font-bold text-white tracking-tight">Illness Tracker</h1>
                    </div>
                    <p className="text-slate-400 text-lg max-w-2xl">
                        Monitor your chronic conditions and track vital health metrics over time.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tracker Input */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Log New Measurement</h2>

                        {/* Condition Selector */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {conditions.map((c) => (
                                <button
                                    key={c.name}
                                    onClick={() => setSelectedCondition(c.name)}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${selectedCondition === c.name
                                        ? `bg-slate-800 border-blue-500 ring-1 ring-blue-500/50`
                                        : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
                                        }`}
                                >
                                    <c.icon className={`h-6 w-6 mb-2 ${c.color}`} />
                                    <span className="text-sm font-medium text-slate-300">{c.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Input Field */}
                        <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                {activeCondition?.metric} ({activeCondition?.unit})
                            </label>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="number"
                                    value={metricValue}
                                    onChange={(e) => setMetricValue(e.target.value)}
                                    placeholder="0"
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                                <button
                                    onClick={handleLogMetric}
                                    disabled={!metricValue}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    <Plus className="h-5 w-5 mr-2" />
                                    Add Log
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* History Log */}
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                            <Calendar className="h-5 w-5 mr-2 text-slate-400" />
                            Recent Logs
                        </h3>
                        {logs.length > 0 ? (
                            <div className="space-y-3">
                                {logs.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                                        <div className="flex items-center space-x-4">
                                            <div className={`p-2 rounded-lg bg-slate-800 ${conditions.find(c => c.name === log.condition)?.color
                                                }`}>
                                                {React.createElement(conditions.find(c => c.name === log.condition)?.icon || Activity, { className: "h-5 w-5" })}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{log.condition}</p>
                                                <p className="text-xs text-slate-500">
                                                    {log.timestamp.toLocaleDateString()} at {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-white">{log.value}</span>
                                            <span className="text-sm text-slate-500 ml-1">{log.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-500">
                                No logs yet. Add your first measurement above.
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Insights</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                                <div className="flex items-center mb-2">
                                    <TrendingUp className="h-4 w-4 text-blue-400 mr-2" />
                                    <span className="text-sm font-semibold text-blue-300">Glucose Trend</span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Your average glucose level is stable. Keep maintaining your diet.
                                </p>
                            </div>
                            <div className="p-4 bg-rose-900/20 border border-rose-800/30 rounded-lg">
                                <div className="flex items-center mb-2">
                                    <Activity className="h-4 w-4 text-rose-400 mr-2" />
                                    <span className="text-sm font-semibold text-rose-300">Blood Pressure</span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Last reading was slightly elevated. Consider a 5-minute meditation.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Reminders</h3>
                        <ul className="space-y-3">
                            <li className="flex items-center justify-between text-sm">
                                <span className="text-slate-300">Morning Insulin</span>
                                <span className="text-blue-400 bg-blue-900/20 px-2 py-1 rounded text-xs">8:00 AM</span>
                            </li>
                            <li className="flex items-center justify-between text-sm">
                                <span className="text-slate-300">BP Check</span>
                                <span className="text-blue-400 bg-blue-900/20 px-2 py-1 rounded text-xs">12:00 PM</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IllnessTracker;
