import React, { useEffect, useState } from 'react';
import { MessageCircle, FileText, MapPin, Pill, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


interface DashboardStats {
  user: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    full_name: string;
  };
  stats: {
    health_records_count: number;
    active_medications_count: number;
    symptom_checks_count: number;
    latest_health_record: any;
  };
}

interface Activity {
  type: string;
  title: string;
  desc: string;
  time: string;
  icon: string;
  color: string;
}

const Home: React.FC = () => {
  const { user, token } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch dashboard stats
        const statsResponse = await fetch('http://localhost:5001/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setDashboardStats(statsData);
        }

        // Fetch recent activity
        const activityResponse = await fetch('http://localhost:5001/api/dashboard/recent-activity', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          setRecentActivity(activityData.activities);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      MessageCircle,
      FileText,
      Pill,
      Activity,
    };
    return icons[iconName] || Activity;
  };

  const getTimeAgo = (isoString: string) => {
    // Parse the UTC timestamp from backend
    const date = new Date(isoString);
    const now = new Date();

    // Calculate difference in milliseconds
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

    // For older dates, show the actual date
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Health Records',
      value: dashboardStats?.stats.health_records_count.toString() || '0',
      sub: 'Total records',
      icon: FileText,
      color: 'blue'
    },
    {
      label: 'Active Meds',
      value: dashboardStats?.stats.active_medications_count.toString() || '0',
      sub: dashboardStats?.stats.active_medications_count ? 'On track' : 'No medications',
      icon: Pill,
      color: 'emerald'
    },
    {
      label: 'Symptom Checks',
      value: dashboardStats?.stats.symptom_checks_count.toString() || '0',
      sub: 'Recent checks',
      icon: MessageCircle,
      color: 'violet'
    },
    {
      label: 'Health Score',
      value: '0/100',
      sub: 'Looking good',
      icon: TrendingUp,
      color: 'rose'
    },
  ];

  const displayName = dashboardStats?.user.first_name
    ? `${dashboardStats.user.first_name}${dashboardStats.user.last_name ? ' ' + dashboardStats.user.last_name : ''}`
    : user?.username || 'there';

  return (
    <div className="space-y-8 page-transition">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {displayName}</h1>
          <p className="text-blue-100 text-lg max-w-2xl mb-6">
            {dashboardStats?.stats.active_medications_count
              ? `You have ${dashboardStats.stats.active_medications_count} active medication${dashboardStats.stats.active_medications_count > 1 ? 's' : ''}. Stay on track with your health.`
              : 'Your health overview is ready. Check your symptoms or upload reports to get started.'}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/symptom-checker"
              className="bg-white text-blue-700 px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2 shadow-sm"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Check Symptoms</span>
            </Link>
            <Link
              to="/upload-explanation"
              className="bg-blue-500/30 text-white border border-white/30 px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-500/40 transition-colors flex items-center space-x-2 backdrop-blur-sm"
            >
              <FileText className="h-4 w-4" />
              <span>Upload Report</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const colorClasses = {
            blue: 'bg-blue-500/20 text-blue-400',
            emerald: 'bg-emerald-500/20 text-emerald-400',
            rose: 'bg-rose-500/20 text-rose-400',
            violet: 'bg-violet-500/20 text-violet-400',
          };

          return (
            <div key={index} className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition-colors shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-1 rounded-full">{stat.label}</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
                <p className="text-sm text-slate-400">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/symptom-checker"
              className="group p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-violet-500/20 text-violet-400 rounded-lg group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">Symptom Checker</h3>
                  <p className="text-sm text-slate-400">Analyze your symptoms with AI</p>
                </div>
              </div>
            </Link>

            <Link
              to="/upload-explanation"
              className="group p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">Understand Reports</h3>
                  <p className="text-sm text-slate-400">Get plain English explanations</p>
                </div>
              </div>
            </Link>

            <Link
              to="/locator"
              className="group p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors">Find Care</h3>
                  <p className="text-sm text-slate-400">Locate doctors & pharmacies</p>
                </div>
              </div>
            </Link>

            <Link
              to="/doctor-notes"
              className="group p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-rose-500/20 text-rose-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-rose-300 transition-colors">Health Vault</h3>
                  <p className="text-sm text-slate-400">Manage your health records</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recent Activity</h2>
          </div>
          <div className="space-y-6">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => {
                const IconComponent = getIconComponent(activity.icon);
                return (
                  <div key={index} className="flex gap-4 relative">
                    {index !== recentActivity.length - 1 && (
                      <div className="absolute left-[19px] top-10 bottom-[-24px] w-0.5 bg-slate-800"></div>
                    )}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 border-slate-900 ${activity.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                      activity.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-violet-500/20 text-violet-400'
                      }`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex justify-between items-start">
                        <h4 className="text-white font-medium">{activity.title}</h4>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{getTimeAgo(activity.time)}</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{activity.desc}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No recent activity</p>
                <p className="text-slate-500 text-xs mt-1">Start using the app to see your activity here</p>
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Daily Tip</p>
                <p className="text-sm text-white">Stay hydrated! Aim for 8 glasses today.</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 text-xs">💧</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for TrendingUp icon since it was missing in imports
const TrendingUp = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

export default Home;