import React, { useState } from 'react';
import { User, Settings, LogOut, Bell, Shield, X, Mail, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';


interface TopBarProps {
  onLogout: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username || 'User';

  const initials = user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : user?.username?.[0]?.toUpperCase() || 'U';

  return (
    <>
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800/50 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-white">MedSense</h1>
            <div className="hidden md:block">
              <span className="px-3 py-1 bg-blue-900/30 text-blue-300 text-xs font-medium rounded-full border border-blue-700/50 flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>HIPAA Compliant</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-3 p-2 pr-3 text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {initials}
                </div>
                <span className="hidden md:block font-medium text-white">{displayName}</span>
              </button>

              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-50"
                    onClick={() => setShowDropdown(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 z-[60] overflow-hidden">
                    {/* User Info Section */}
                    <div className="p-4 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-b border-slate-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {initials}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-white">{displayName}</div>
                          <div className="text-sm text-slate-400">{user?.email}</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          setShowSettings(true);
                        }}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-3 text-blue-400" />
                        <span>Account Settings</span>
                      </button>

                      <div className="my-2 border-t border-slate-700"></div>

                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          onLogout();
                        }}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-red-400 hover:bg-slate-800 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Settings className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Account Settings</h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                {/* Profile Section */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                        {initials}
                      </div>
                      <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors">
                        Change Photo
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">First Name</label>
                        <div className="flex items-center px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                          <UserCircle className="h-4 w-4 text-slate-400 mr-2" />
                          <span className="text-white">{user?.first_name || 'Not set'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Last Name</label>
                        <div className="flex items-center px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                          <UserCircle className="h-4 w-4 text-slate-400 mr-2" />
                          <span className="text-white">{user?.last_name || 'Not set'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Username</label>
                      <div className="flex items-center px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                        <User className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="text-white">@{user?.username}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
                      <div className="flex items-center px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                        <Mail className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="text-white">{user?.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Section */}
                <div className="pt-4 border-t border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Account</h3>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors text-left">
                      <span className="text-white text-sm">Change Password</span>
                      <span className="text-slate-400 text-xs">••••••••</span>
                    </button>
                    <button className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors text-left">
                      <span className="text-white text-sm">Privacy Settings</span>
                      <span className="text-blue-400 text-xs">Manage</span>
                    </button>
                  </div>
                </div>

                {/* Preferences */}
                <div className="pt-4 border-t border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Preferences</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <span className="text-white text-sm">Email Notifications</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <span className="text-white text-sm">SMS Alerts</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex justify-end space-x-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;