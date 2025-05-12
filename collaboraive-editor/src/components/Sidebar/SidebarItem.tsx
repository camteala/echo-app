import React from 'react';

interface SidebarItemProps {
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-12 h-12 flex items-center justify-center hover:bg-gray-700 transition-colors ${
      isActive ? 'border-l-2 border-blue-500 bg-gray-800' : 'text-gray-400'
    }`}
  >
    {icon}
  </button>
);

export default SidebarItem;