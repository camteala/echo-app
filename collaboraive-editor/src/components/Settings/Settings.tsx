import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Bell, Monitor, Palette, Globe, User } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('security');

  // Settings sections
  const sections = [
    { id: 'account', label: 'Account', icon: <User size={18} /> },
    { id: 'security', label: 'Security', icon: <Lock size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'editor', label: 'Editor', icon: <Monitor size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'language', label: 'Language', icon: <Globe size={18} /> }
  ];
  
  return (
    <div className="flex h-full">
      {/* Settings sidebar */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Settings</h2>
        <ul>
          {sections.map(section => (
            <li key={section.id} className="mb-1">
              <button
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center p-2 rounded-md ${
                  activeSection === section.id 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Settings content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeSection === 'security' && (
          <div>
            <h2 className="text-xl font-bold mb-6">Security Settings</h2>
            
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                <h3 className="text-lg font-medium">Multi-Factor Authentication</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Enhance your account security by setting up two-factor authentication.
              </p>
              
              {/* MFA Button to navigate to MFA setup page */}
              <button
                onClick={() => navigate('/authentication/mfa')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Set up MFA
              </button>
            </div>
            
            {/* Additional security settings here */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4">Password</h3>
              <button 
                onClick={() => navigate('/authentication/change-password')}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Change Password
              </button>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4">Sessions</h3>
              <button 
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                onClick={() => {
                  // Handle sign out of all sessions
                  // You might want to call a function from your auth service here
                  alert('Signing out of all sessions...');
                }}
              >
                Sign out of all sessions
              </button>
            </div>
          </div>
        )}
        
        {activeSection === 'account' && (
          <div>
            <h2 className="text-xl font-bold mb-6">Account Settings</h2>
            {/* Account settings content */}
            <p className="text-gray-500">Account management options will appear here.</p>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default SettingsPage;