export interface Theme {
  background: string;
  sidebar: string;
  header: string;
  button: string;
  activeButton: string;
  input: string;
  text: string;
  subtext: string;
  border: string;
  fileItem: string;
  activeFileItem: string;
  terminalBackground: string;
  terminalText: string;
  tabActive: string;
  tabInactive: string;
  statusConnected: string;
  statusDisconnected: string;
  statusConnecting: string;
  dropdownBg: string;
  modalOverlay: string;
  modalContent: string;
}

export const getTheme = (darkMode: boolean): Theme => {
  return darkMode ? {
    background: 'bg-gray-900',
    sidebar: 'bg-gray-800',
    header: 'bg-gray-800',
    button: 'bg-gray-700 hover:bg-gray-600 text-white',
    activeButton: 'bg-blue-600 hover:bg-blue-500 text-white',
    input: 'bg-gray-700 text-white border-gray-600',
    text: 'text-white',
    subtext: 'text-gray-300',
    border: 'border-gray-700',
    fileItem: 'bg-gray-700 hover:bg-gray-600 text-white',
    activeFileItem: 'bg-blue-600 text-white',
    terminalBackground: 'bg-dark-indigo',
    terminalText: 'text-white',
    tabActive: 'bg-gray-700 text-white',
    tabInactive: 'bg-gray-800 text-gray-400 hover:bg-gray-700',
    statusConnected: 'bg-green-500',
    statusDisconnected: 'bg-red-500',
    statusConnecting: 'bg-yellow-500',
    dropdownBg: 'bg-gray-800 border-gray-700',
    modalOverlay: 'bg-black bg-opacity-60',
    modalContent: 'bg-gray-800',
    
    
  } : {
    background: 'bg-gray-100',
    sidebar: 'bg-white',
    header: 'bg-white',
    button: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    activeButton: 'bg-blue-500 hover:bg-blue-400 text-white',
    input: 'bg-white text-gray-800 border-gray-300',
    text: 'text-gray-800',
    subtext: 'text-gray-600',
    border: 'border-gray-200',
    fileItem: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
    activeFileItem: 'bg-blue-500 text-white',
    terminalBackground: 'bg-gray-800',
    terminalText: 'text-green-400',
    tabActive: 'bg-white text-gray-800',
    tabInactive: 'bg-gray-200 text-gray-600 hover:bg-gray-300',
    statusConnected: 'bg-green-500',
    statusDisconnected: 'bg-red-500',
    statusConnecting: 'bg-yellow-500',
    dropdownBg: 'bg-white border-gray-300',
    modalOverlay: 'bg-black bg-opacity-40',
    modalContent: 'bg-white',
  };
};