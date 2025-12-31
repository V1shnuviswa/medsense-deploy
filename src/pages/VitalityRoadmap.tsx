import React, { useState, useMemo } from 'react';
import { Activity, ChevronRight, Dna, Heart, Zap, Shield, Clock, TrendingUp, Search, BookOpen, X, FileText, Download, TestTube, Microscope } from 'lucide-react';
import { BIOMARKER_DATABASE, Biomarker } from '../data/biomarkers';
import { REQUIRED_TESTS } from '../data/test_panels';
import { AGE_GUIDELINES } from '../data/age_guidelines';
import { WOMENS_HEALTH_MODULES } from '../data/womens_health';

const VitalityRoadmap: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'phase1' | 'phase2' | 'phase3' | 'library' | 'required_tests' | 'age_based' | 'womens_health'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedBiomarker, setSelectedBiomarker] = useState<Biomarker | null>(null);

    const categories = Array.from(new Set(BIOMARKER_DATABASE.map(b => b.category)));

    const filteredBiomarkers = useMemo(() => {
        return BIOMARKER_DATABASE.filter(b => {
            const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory ? b.category === selectedCategory : true;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    const phases = {
        phase1: {
            title: "Phase 1: The Baseline",
            subtitle: "Month 0 - Establishing Biological Signature",
            description: "The initial goal is to establish a comprehensive biological signature to detect risks early.",
            pillars: [
                {
                    name: "Cardiometabolic",
                    icon: <Heart className="h-5 w-5 text-rose-400" />,
                    tests: [
                        { name: "ApoB", value: "85", unit: "mg/dL", status: "Optimal", range: "< 90", progress: 85, max: 120 },
                        { name: "Lp(a)", value: "15", unit: "mg/dL", status: "Optimal", range: "< 30", progress: 30, max: 100 },
                        { name: "HbA1c", value: "5.2", unit: "%", status: "Optimal", range: "< 5.7", progress: 50, max: 10 },
                        { name: "Fasting Insulin", value: "4.5", unit: "uIU/mL", status: "Optimal", range: "2.6-24.9", progress: 20, max: 30 }
                    ]
                },
                {
                    name: "Hormonal & Thyroid",
                    icon: <Zap className="h-5 w-5 text-amber-400" />,
                    tests: [
                        { name: "Free T3", value: "3.2", unit: "pg/mL", status: "Normal", range: "2.0-4.4", progress: 60, max: 5 },
                        { name: "Free T4", value: "1.1", unit: "ng/dL", status: "Normal", range: "0.8-1.8", progress: 50, max: 2 },
                        { name: "TSH", value: "1.8", unit: "mIU/L", status: "Optimal", range: "0.4-4.0", progress: 40, max: 5 },
                        { name: "Total Testosterone", value: "650", unit: "ng/dL", status: "Normal", range: "264-916", progress: 65, max: 1000 }
                    ]
                },
                {
                    name: "Nutrient & Toxin",
                    icon: <Shield className="h-5 w-5 text-emerald-400" />,
                    tests: [
                        { name: "Vitamin D", value: "45", unit: "ng/mL", status: "Normal", range: "30-100", progress: 45, max: 100 },
                        { name: "Omega-3 Index", value: "5.8", unit: "%", status: "Suboptimal", range: "> 8", progress: 58, max: 12 },
                        { name: "Magnesium", value: "2.1", unit: "mg/dL", status: "Normal", range: "1.7-2.2", progress: 80, max: 3 },
                        { name: "Mercury", value: "Low", unit: "", status: "Optimal", range: "Low", progress: 10, max: 100 }
                    ]
                },
                {
                    name: "Structural (Ahead Focus)",
                    icon: <Activity className="h-5 w-5 text-blue-400" />,
                    tests: [
                        { name: "Full-body MRI", value: "Completed", unit: "", status: "Normal", range: "No abnormalities", progress: 100, max: 100 },
                        { name: "Bone Density", value: "-0.5", unit: "T-score", status: "Normal", range: "> -1.0", progress: 80, max: 100 }
                    ]
                }
            ]
        },
        phase2: {
            title: "Phase 2: Optimization",
            subtitle: "Months 6-12 - Measuring Efficacy",
            description: "Shifting to measure the efficacy of interventions (diet, exercise, supplements).",
            pillars: [
                {
                    name: "Inflammation Tracking",
                    icon: <Activity className="h-5 w-5 text-red-400" />,
                    tests: [
                        { name: "hs-CRP", value: "0.8", unit: "mg/L", status: "Optimal", range: "< 1.0", progress: 20, max: 5 },
                        { name: "Homocysteine", value: "8.5", unit: "umol/L", status: "Normal", range: "5-15", progress: 40, max: 20 }
                    ]
                },
                {
                    name: "Metabolic Flexibility",
                    icon: <Zap className="h-5 w-5 text-yellow-400" />,
                    tests: [
                        { name: "HbA1c (Re-test)", value: "5.0", unit: "%", status: "Improved", range: "< 5.7", progress: 45, max: 10 },
                        { name: "Fasting Insulin", value: "3.8", unit: "uIU/mL", status: "Improved", range: "2.6-24.9", progress: 15, max: 30 }
                    ]
                },
                {
                    name: "Biological Age",
                    icon: <Clock className="h-5 w-5 text-purple-400" />,
                    tests: [
                        { name: "DunedinPACE", value: "0.85", unit: "", status: "Slow Aging", range: "< 1.0", progress: 85, max: 1.5 },
                        { name: "PhenoAge", value: "-4.2", unit: "years", status: "Optimal", range: "< Chronological", progress: 80, max: 100 }
                    ]
                }
            ]
        },
        phase3: {
            title: "Phase 3: Advanced Screening",
            subtitle: "Annual/Bi-Annual - High Sensitivity",
            description: "Shift from optimization to high-sensitivity, long-term risk detection, integrating cutting-edge diagnostics.",
            pillars: [
                {
                    name: "Advanced Biomarker Testing",
                    icon: <TestTube className="h-5 w-5 text-rose-400" />,
                    tests: [
                        { name: "GRAIL Galleri", value: "Negative", unit: "", status: "Optimal", range: "Negative", progress: 100, max: 100 },
                        { name: "Liquid Biopsy", value: "None", unit: "", status: "Optimal", range: "None", progress: 100, max: 100 },
                        { name: "DunedinPACE", value: "0.85", unit: "", status: "Slow Aging", range: "< 1.0", progress: 85, max: 1.5 },
                        { name: "Lp(a)", value: "15", unit: "mg/dL", status: "Optimal", range: "< 30", progress: 30, max: 100 },
                        { name: "ApoB", value: "85", unit: "mg/dL", status: "Optimal", range: "< 90", progress: 85, max: 120 },
                        { name: "Lp-PLA2 (PLAC Test)", value: "180", unit: "ng/mL", status: "Normal", range: "< 200", progress: 90, max: 300 },
                        { name: "eGFR", value: "105", unit: "", status: "Optimal", range: "> 90", progress: 95, max: 120 },
                        { name: "hs-CRP", value: "0.8", unit: "mg/L", status: "Optimal", range: "< 1.0", progress: 20, max: 5 },
                        { name: "IGF-1", value: "150", unit: "ng/mL", status: "Normal", range: "Age dependent", progress: 50, max: 300 }
                    ]
                },
                {
                    name: "Advanced Imaging",
                    icon: <Activity className="h-5 w-5 text-blue-400" />,
                    tests: [
                        { name: "Full-body MRI", value: "Completed", unit: "", status: "Normal", range: "No abnormalities", progress: 100, max: 100 },
                        { name: "CAC Score", value: "0", unit: "Agatston", status: "Optimal", range: "0", progress: 100, max: 100 },
                        { name: "CIMT", value: "0.6", unit: "mm", status: "Optimal", range: "< 0.9", progress: 60, max: 1.5 },
                        { name: "Brain Volume MRI", value: "98th", unit: "percentile", status: "Optimal", range: "Age adjusted", progress: 98, max: 100 }
                    ]
                },
                {
                    name: "Genetic & Genomic Testing",
                    icon: <Dna className="h-5 w-5 text-purple-400" />,
                    tests: [
                        { name: "ApoE Genotype", value: "E3/E3", unit: "", status: "Neutral", range: "Genotype", progress: 50, max: 100 },
                        { name: "Multi-Gene Panel", value: "Negative", unit: "", status: "Optimal", range: "Negative", progress: 100, max: 100 },
                        { name: "Polygenic Risk Scores", value: "Average", unit: "Risk", status: "Normal", range: "Average", progress: 50, max: 100 },
                        { name: "Pharmacogenomics", value: "Completed", unit: "", status: "Normal", range: "N/A", progress: 100, max: 100 }
                    ]
                },
                {
                    name: "Advanced/Functional Testing",
                    icon: <Microscope className="h-5 w-5 text-emerald-400" />,
                    tests: [
                        { name: "Comprehensive Stool Analysis", value: "Balanced", unit: "", status: "Optimal", range: "Balanced", progress: 90, max: 100 },
                        { name: "Organic Acids Test", value: "Normal", unit: "", status: "Normal", range: "Normal", progress: 80, max: 100 },
                        { name: "Toxin Panel", value: "Negative", unit: "", status: "Optimal", range: "Negative", progress: 100, max: 100 },
                        { name: "Continuous Physiological Monitoring", value: "Active", unit: "", status: "Optimal", range: "Optimal", progress: 95, max: 100 }
                    ]
                }
            ]
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Optimal':
            case 'Improved':
            case 'Slow Aging':
                return 'text-emerald-400 bg-emerald-900/20 border-emerald-800';
            case 'Normal':
            case 'Neutral':
                return 'text-blue-400 bg-blue-900/20 border-blue-800';
            case 'Suboptimal':
                return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
            case 'At Risk':
                return 'text-red-400 bg-red-900/20 border-red-800';
            default:
                return 'text-slate-400 bg-slate-800 border-slate-700';
        }
    };

    const getProgressBarColor = (status: string) => {
        switch (status) {
            case 'Optimal':
            case 'Improved':
            case 'Slow Aging':
                return 'bg-emerald-500';
            case 'Normal':
            case 'Neutral':
                return 'bg-blue-500';
            case 'Suboptimal':
                return 'bg-yellow-500';
            case 'At Risk':
                return 'bg-red-500';
            default:
                return 'bg-slate-500';
        }
    };

    const handleBiomarkerClick = (name: string) => {
        // Handle special cases or direct matches
        const searchName = name.replace(' (Re-test)', '');
        const found = BIOMARKER_DATABASE.find(b =>
            b.name.toLowerCase() === searchName.toLowerCase() ||
            b.name.toLowerCase() === name.toLowerCase()
        );
        if (found) {
            setSelectedBiomarker(found);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 page-transition px-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse"></div>
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-2">
                        <TrendingUp className="h-8 w-8 text-blue-400" />
                        <h1 className="text-4xl font-bold text-white tracking-tight">Vitality Roadmap</h1>
                    </div>
                    <p className="text-slate-400 text-lg max-w-2xl">Your personalized longitudinal health strategy. Transitioning from a single snapshot to a continuous journey of optimization and longevity.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'overview'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 scale-105'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                >
                    Roadmap Overview
                </button>
                <button
                    onClick={() => setActiveTab('phase1')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'phase1'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 scale-105'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                >
                    Phase 1: Baseline
                </button>
                <button
                    onClick={() => setActiveTab('phase2')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'phase2'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 scale-105'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                >
                    Phase 2: Optimization
                </button>
                <button
                    onClick={() => setActiveTab('phase3')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'phase3'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 scale-105'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                >
                    Phase 3: Advanced
                </button>
                <button
                    onClick={() => setActiveTab('age_based')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap flex items-center ${activeTab === 'age_based'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 scale-105'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                >
                    <Clock className="h-4 w-4 mr-2" />
                    Age-Based Guidelines
                </button>
                <button
                    onClick={() => setActiveTab('womens_health')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap flex items-center ${activeTab === 'womens_health'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 scale-105'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                >
                    <Heart className="h-4 w-4 mr-2" />
                    Women's Health
                </button>
                <button
                    onClick={() => setActiveTab('required_tests')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap flex items-center ${activeTab === 'required_tests'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 scale-105'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                >
                    <FileText className="h-4 w-4 mr-2" />
                    Required Tests
                </button>
                <button
                    onClick={() => setActiveTab('library')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap flex items-center ${activeTab === 'library'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 scale-105'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Biomarker Library
                </button>
            </div>

            {/* Content */}
            <div className="min-h-[500px]">
                {activeTab === 'womens_health' ? (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <h2 className="text-2xl font-bold text-white mb-2 relative z-10">Women's Health Optimization</h2>
                            <p className="text-slate-400 relative z-10">Targeted screening protocols for hormonal balance, reproductive health, and longevity.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {WOMENS_HEALTH_MODULES.map((module) => (
                                <div key={module.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/60 transition-all hover:border-pink-500/30 group">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-white group-hover:text-pink-400 transition-colors">{module.title}</h3>
                                        <span className="text-xs font-medium text-pink-300 bg-pink-900/30 px-2 py-1 rounded-full border border-pink-800">
                                            {module.frequency}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-semibold text-pink-400 mb-2">{module.focus}</h4>
                                    <p className="text-slate-400 text-sm mb-6">{module.description}</p>

                                    <div className="space-y-3">
                                        <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-700 pb-2">Recommended Tests</h5>
                                        <ul className="space-y-2">
                                            {module.tests.map((test, idx) => (
                                                <li key={idx} className="flex items-center text-sm text-slate-300">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-pink-500 mr-2"></div>
                                                    {test}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeTab === 'age_based' ? (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                            <h2 className="text-2xl font-bold text-white mb-2">Age-Based Testing Guidelines</h2>
                            <p className="text-slate-400">Optimized screening protocols tailored to your decade of life. Prevention starts early.</p>
                        </div>

                        <div className="relative">
                            {/* Vertical Line for Timeline Effect (Desktop) */}
                            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-slate-800"></div>

                            <div className="space-y-12">
                                {AGE_GUIDELINES.map((guide, index) => (
                                    <div key={guide.id} className={`flex flex-col md:flex-row items-center ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>

                                        {/* Content Card */}
                                        <div className="w-full md:w-5/12">
                                            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/60 transition-all hover:border-blue-500/30">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-2xl font-bold text-white">{guide.ageRange}</h3>
                                                    <span className="text-xs font-medium text-blue-300 bg-blue-900/30 px-2 py-1 rounded-full border border-blue-800">
                                                        {guide.frequency}
                                                    </span>
                                                </div>
                                                <h4 className="text-lg font-semibold text-blue-400 mb-2">{guide.focus}</h4>
                                                <p className="text-slate-400 text-sm mb-4">{guide.description}</p>

                                                <div className="space-y-2">
                                                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Key Tests</h5>
                                                    <ul className="space-y-1">
                                                        {guide.keyTests.map((test, idx) => (
                                                            <li key={idx} className="flex items-center text-sm text-slate-300">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></div>
                                                                {test}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timeline Dot */}
                                        <div className="w-full md:w-2/12 flex justify-center py-4 md:py-0 relative">
                                            <div className="h-8 w-8 bg-slate-900 border-4 border-blue-600 rounded-full z-10"></div>
                                        </div>

                                        {/* Spacer for Timeline Layout */}
                                        <div className="w-full md:w-5/12"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'required_tests' ? (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex justify-between items-center bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Required Blood Tests</h2>
                                <p className="text-slate-400">Comprehensive panels required to establish your biological baseline and track progress.</p>
                            </div>
                            <button className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                                <Download className="h-4 w-4 mr-2" />
                                Download List
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {REQUIRED_TESTS.map((panel) => (
                                <div key={panel.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/50 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-white">{panel.name}</h3>
                                        <span className="text-xs font-medium text-blue-300 bg-blue-900/30 px-2 py-1 rounded-full border border-blue-800">
                                            {panel.frequency}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-4">{panel.description}</p>

                                    <div className="space-y-2">
                                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Included Tests</h4>
                                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {panel.tests.map((test, idx) => (
                                                <li key={idx} className="flex items-center text-sm text-slate-300">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></div>
                                                    {test}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeTab === 'library' ? (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Search and Filters */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search biomarkers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${!selectedCategory
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                        }`}
                                >
                                    All
                                </button>
                                {categories.map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Biomarker Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                            {filteredBiomarkers.map((biomarker) => (
                                <div
                                    key={biomarker.id}
                                    onClick={() => setSelectedBiomarker(biomarker)}
                                    className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/50 hover:border-blue-500/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-slate-800 rounded-lg border border-slate-700 group-hover:border-blue-500/30 transition-colors">
                                            <Activity className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded-full">
                                            {biomarker.category}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{biomarker.name}</h3>
                                    <p className="text-sm text-slate-400 line-clamp-2 mb-4">{biomarker.summary}</p>
                                    <div className="flex items-center text-blue-400 text-sm font-medium">
                                        Learn More <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Detail Modal */}
                        {selectedBiomarker && (
                            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedBiomarker(null)}>
                                <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                                    <div className="p-6 border-b border-slate-800 flex justify-between items-start sticky top-0 bg-slate-900 z-10">
                                        <div>
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h2 className="text-2xl font-bold text-white">{selectedBiomarker.name}</h2>
                                                <span className="text-xs font-medium text-blue-300 bg-blue-900/30 px-2 py-1 rounded-full border border-blue-800">
                                                    {selectedBiomarker.category}
                                                </span>
                                            </div>
                                            <p className="text-slate-400">{selectedBiomarker.summary}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedBiomarker(null)}
                                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                        >
                                            <X className="h-6 w-6" />
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                                                <BookOpen className="h-5 w-5 mr-2 text-blue-400" />
                                                Description
                                            </h3>
                                            <p className="text-slate-300 leading-relaxed">{selectedBiomarker.description}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                                                <Activity className="h-5 w-5 mr-2 text-emerald-400" />
                                                Clinical Significance
                                            </h3>
                                            <p className="text-slate-300 leading-relaxed">{selectedBiomarker.clinicalSignificance}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                                            <h3 className="text-sm font-semibold text-slate-400 mb-1">Reference Range</h3>
                                            <div className="flex items-baseline space-x-2">
                                                <span className="text-2xl font-bold text-white">{selectedBiomarker.referenceRange}</span>
                                                <span className="text-sm text-slate-500">{selectedBiomarker.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'overview' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {/* Phase 1 Card */}
                        <div
                            onClick={() => setActiveTab('phase1')}
                            className="group bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 transition-all group-hover:w-2"></div>
                            <div className="mb-4 flex justify-between items-start">
                                <div className="p-3 bg-blue-900/20 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                                    <Activity className="h-6 w-6" />
                                </div>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Month 0</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">The Baseline</h3>
                            <p className="text-slate-400 text-sm mb-4">Establish a comprehensive biological signature across cardiometabolic, hormonal, and structural pillars.</p>
                            <div className="flex items-center text-blue-400 text-sm font-medium">
                                View Details <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>

                        {/* Phase 2 Card */}
                        <div
                            onClick={() => setActiveTab('phase2')}
                            className="group bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 transition-all group-hover:w-2"></div>
                            <div className="mb-4 flex justify-between items-start">
                                <div className="p-3 bg-purple-900/20 rounded-lg text-purple-400 group-hover:scale-110 transition-transform">
                                    <Zap className="h-6 w-6" />
                                </div>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Months 6-12</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Optimization</h3>
                            <p className="text-slate-400 text-sm mb-4">Measure efficacy of interventions. Track inflammation, metabolic flexibility, and biological age.</p>
                            <div className="flex items-center text-purple-400 text-sm font-medium">
                                View Details <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>

                        {/* Phase 3 Card */}
                        <div
                            onClick={() => setActiveTab('phase3')}
                            className="group bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 hover:border-pink-500/50 hover:bg-slate-800/50 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-pink-500 transition-all group-hover:w-2"></div>
                            <div className="mb-4 flex justify-between items-start">
                                <div className="p-3 bg-pink-900/20 rounded-lg text-pink-400 group-hover:scale-110 transition-transform">
                                    <Dna className="h-6 w-6" />
                                </div>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Annual</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Advanced Screening</h3>
                            <p className="text-slate-400 text-sm mb-4">High-sensitivity liquid biopsies, cancer detection, and neuro-health monitoring.</p>
                            <div className="flex items-center text-pink-400 text-sm font-medium">
                                View Details <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                            <h2 className="text-2xl font-bold text-white mb-1">{phases[activeTab].title}</h2>
                            <p className="text-blue-400 font-medium mb-4">{phases[activeTab].subtitle}</p>
                            <p className="text-slate-300">{phases[activeTab].description}</p>
                        </div>

                        <div className="space-y-8">
                            {phases[activeTab].pillars.map((pillar, idx) => (
                                <div key={idx} className="space-y-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                                            {pillar.icon}
                                        </div>
                                        <h3 className="text-xl font-semibold text-white">{pillar.name}</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                        {pillar.tests.map((test, tIdx) => (
                                            <div
                                                key={tIdx}
                                                onClick={() => handleBiomarkerClick(test.name)}
                                                className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/60 transition-all hover:shadow-lg hover:shadow-blue-900/10 group cursor-pointer"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{test.name}</h4>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(test.status)}`}>
                                                        {test.status}
                                                    </span>
                                                </div>

                                                <div className="flex items-baseline space-x-1 mb-3">
                                                    <span className="text-2xl font-bold text-white">{test.value}</span>
                                                    <span className="text-xs text-slate-500">{test.unit}</span>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${getProgressBarColor(test.status)} transition-all duration-1000`}
                                                            style={{ width: `${(test.progress / test.max) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-slate-500">
                                                        <span>Target: {test.range}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Detail Modal for Phases */}
                        {selectedBiomarker && (
                            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedBiomarker(null)}>
                                <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                                    <div className="p-6 border-b border-slate-800 flex justify-between items-start sticky top-0 bg-slate-900 z-10">
                                        <div>
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h2 className="text-2xl font-bold text-white">{selectedBiomarker.name}</h2>
                                                <span className="text-xs font-medium text-blue-300 bg-blue-900/30 px-2 py-1 rounded-full border border-blue-800">
                                                    {selectedBiomarker.category}
                                                </span>
                                            </div>
                                            <p className="text-slate-400">{selectedBiomarker.summary}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedBiomarker(null)}
                                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                        >
                                            <X className="h-6 w-6" />
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                                                <BookOpen className="h-5 w-5 mr-2 text-blue-400" />
                                                Description
                                            </h3>
                                            <p className="text-slate-300 leading-relaxed">{selectedBiomarker.description}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                                                <Activity className="h-5 w-5 mr-2 text-emerald-400" />
                                                Clinical Significance
                                            </h3>
                                            <p className="text-slate-300 leading-relaxed">{selectedBiomarker.clinicalSignificance}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                                            <h3 className="text-sm font-semibold text-slate-400 mb-1">Reference Range</h3>
                                            <div className="flex items-baseline space-x-2">
                                                <span className="text-2xl font-bold text-white">{selectedBiomarker.referenceRange}</span>
                                                <span className="text-sm text-slate-500">{selectedBiomarker.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VitalityRoadmap;
