import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import VLMAnalysis from './pages/VLMAnalysis';
import Segmentation from './pages/Segmentation';
import Home from './pages/Home';
import Login from './pages/Login';
import SymptomChecker from './pages/SymptomChecker';
import DoctorNotes from './pages/DoctorNotes';
import UploadExplanation from './pages/UploadExplanation';
import FallDetection from './pages/FallDetection';
import Locator from './pages/Locator';
import OpenEvidence from './pages/OpenEvidence';
import MentalHealth from './pages/MentalHealth';
import IllnessTracker from './pages/IllnessTracker';
import WearableIntegration from './pages/WearableIntegration';
import VitalityRoadmap from './pages/VitalityRoadmap';

function AppContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'
          }`}>
          <TopBar onLogout={logout} />

          <main className="p-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/symptom-checker" element={<SymptomChecker />} />
              <Route path="/doctor-notes" element={<DoctorNotes />} />
              <Route path="/locator" element={<Locator />} />
              <Route path="/fall-detection" element={<FallDetection />} />
              <Route path="/radiology" element={<Segmentation />} />
              <Route path="/vlm-analysis" element={<VLMAnalysis />} />
              <Route path="/upload-explanation" element={<UploadExplanation />} />
              <Route path="/clinical-evidence" element={<OpenEvidence />} />
              <Route path="/mental-wellness" element={<MentalHealth />} />
              <Route path="/illness-tracker" element={<IllnessTracker />} />
              <Route path="/wearable-integration" element={<WearableIntegration />} />
              <Route path="/vitality-roadmap" element={<VitalityRoadmap />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;