import React from 'react';
import {
  FolderOpen, Play, ChevronRight, Moon, Sun, Download, Settings,
  StopCircle, RefreshCcw
} from 'lucide-react';
import { File, User } from '../../types';
import UserPresence from '../Users/UserPresence';

interface ToolbarProps {
  activeFile: File | undefined;
  language: string;
  setLanguage: (language: string) => void;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  activeFileId: number | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectToServer: () => void;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  tabSize: number;
  setTabSize: React.Dispatch<React.SetStateAction<number>>;
  handleFormatCode: () => Promise<void>;
  handleFileOpen: () => void;
  downloadFile: () => void;
  isRunning: boolean;
  isWaitingForInput: boolean;
  isConnected: boolean;
  handleStopProcess: () => void;
  handleRunCode: () => Promise<void>;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  theme: any; // You could create a more specific type for this
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeUsers: User[];
  currentUserId: string;
}

const Toolbar: React.FC<ToolbarProps> = ({
  activeFile,
  language,
  setLanguage,
  files,
  setFiles,
  activeFileId,
  connectionStatus,
  reconnectToServer,
  showSettings,
  setShowSettings,
  fontSize,
  setFontSize,
  tabSize,
  setTabSize,
  handleFormatCode,
  handleFileOpen,
  downloadFile,
  isRunning,
  isWaitingForInput,
  isConnected,
  handleStopProcess,
  handleRunCode,
  darkMode,
  setDarkMode,
  theme,
  sidebarCollapsed,
  toggleSidebar,
  activeUsers,
  currentUserId,
}) => {
  // Get connection status indicator
  const getConnectionStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return <div className={`w-2 h-2 rounded-full ${theme.statusConnected}`} title="Connected" />;
      case 'disconnected':
        return <div className={`w-2 h-2 rounded-full ${theme.statusDisconnected}`} title="Disconnected" />;
      case 'connecting':
        return <div className={`w-2 h-2 rounded-full ${theme.statusConnecting} animate-pulse`} title="Connecting..." />;
      case 'error':
        return <div className={`w-2 h-2 rounded-full ${theme.statusDisconnected}`} title="Connection Error" />;
      default:
        return null;
    }
  };
  

  return (
    <div className={`${theme.header} p-2 flex items-center justify-between shadow-md ${theme.border} border-b`}>
      <div className="flex items-center space-x-2">
        {/* Toggle sidebar button */}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-md ${theme.button}`}
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Language Selector */}
        <select
          value={activeFile?.language || language}
          onChange={(e) => {
            setLanguage(e.target.value);
            if (activeFileId) {
              setFiles(files.map(file =>
                file.id === activeFileId
                  ? { ...file, language: e.target.value }
                  : file
              ));
            }
          }}
          className={`${theme.input} px-3 py-1.5 rounded-md text-sm`}
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="c">C</option>
          <option value="cpp">C++</option>
          <option value="go">Go</option>
          <option value="rust">Rust</option>
          <option value="ruby">Ruby</option>
          <option value="php">PHP</option>
        </select>

    
    
       
       
      </div>

      <div className="flex items-center space-x-2">
        {/* Settings Button */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 ${theme.button} rounded-md`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Settings Dropdown */}
          {showSettings && (
            <div className={`absolute right-0 mt-1 w-48 rounded-md shadow-lg py-1 ${theme.dropdownBg} border z-10`}>
              <div className="px-3 py-2">
                <label className={`block text-sm font-medium ${theme.text} mb-1`}>Font Size</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="10"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className={`ml-2 text-sm ${theme.text}`}>{fontSize}px</span>
                </div>
              </div>
              <div className="px-3 py-2">
                <label className={`block text-sm font-medium ${theme.text} mb-1`}>Tab Size</label>
                <div className="flex items-center">
                  <select
                    value={tabSize}
                    onChange={(e) => setTabSize(parseInt(e.target.value))}
                    className={`${theme.input} px-2 py-1 text-sm rounded-md w-full`}
                  >
                    <option value="2">2 spaces</option>
                    <option value="4">4 spaces</option>
                    <option value="8">8 spaces</option>
                  </select>
                </div>
              </div>
              <div className="px-3 py-2 border-t border-gray-600 mt-1">
                <button
                  onClick={handleFormatCode}
                  className={`w-full px-2 py-1 text-left text-sm rounded-md ${theme.button}`}
                >
                  Format Document
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Open File Button */}
        <button
          onClick={handleFileOpen}
          className={`px-3 py-1.5 ${theme.button} rounded-md flex items-center space-x-1 text-sm`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Open</span>
        </button>

        {/* Download Button */}
        <button
          onClick={downloadFile}
          className={`px-3 py-1.5 ${theme.button} rounded-md flex items-center space-x-1 text-sm`}
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </button>

        {/* Run/Stop Code Button */}
        {isRunning && !isWaitingForInput ? (
          <button
            onClick={handleStopProcess}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center space-x-1 text-sm"
          >
            <StopCircle className="w-4 h-4" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={handleRunCode}
            disabled={!isConnected}
            className={`px-3 py-1.5 ${!isConnected
              ? 'bg-gray-500 cursor-not-allowed text-gray-300'
              : 'bg-green-600 hover:bg-green-700 text-white'
              } rounded-md flex items-center space-x-1 text-sm`}
            title={!isConnected ? "Server disconnected" : "Run code"}
          >
            <Play className="w-4 h-4" />
            <span>Run</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-1.5 ${theme.button} rounded-md`}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;