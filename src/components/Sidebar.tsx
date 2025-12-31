import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Brain,
  Layers,
  MessageCircle,
  Mic,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileText,
  MapPin,
  BookOpen,
  ClipboardList,
  Watch,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/symptom-checker', icon: MessageCircle, label: 'Symptom Checker' },
    { path: '/doctor-notes', icon: Mic, label: 'Doctor\'s Notes' },
    { path: '/locator', icon: MapPin, label: 'Care Locator' },
    { path: '/upload-explanation', icon: FileText, label: 'Medical Report Analysis' },
    { path: '/clinical-evidence', icon: BookOpen, label: 'Clinical Evidence' },
    { path: '/mental-wellness', icon: Brain, label: 'Mental Wellness' },
    { path: '/illness-tracker', icon: ClipboardList, label: 'Illness Tracker' },
    { path: '/wearable-integration', icon: Watch, label: 'Wearable Integration' },
    { path: '/vitality-roadmap', icon: TrendingUp, label: 'Vitality Roadmap' },
    { path: '/fall-detection', icon: AlertTriangle, label: 'Fall Detection' },
    { path: '/radiology', icon: Layers, label: 'Radiology' },
    { path: '/vlm-analysis', icon: Brain, label: 'Vision Language Models' },
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-slate-950/95 backdrop-blur-sm border-r border-slate-800/50 text-white transition-all duration-300 z-40 ${collapsed ? 'w-16' : 'w-64'
      }`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">MedSense</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav className="mt-8">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${isActive
                ? 'bg-gradient-to-r from-blue-600/20 to-blue-700/20 text-blue-300 border-r-4 border-blue-400'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <span className="ml-3">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;