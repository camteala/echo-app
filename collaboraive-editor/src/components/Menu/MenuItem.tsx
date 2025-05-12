import React, { useState } from 'react';

interface MenuItemProps {
  label: string;
  items: string[];
}

const MenuItem: React.FC<MenuItemProps> = ({ label, items }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 hover:bg-gray-700 rounded text-sm text-gray-300"
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded shadow-lg border border-gray-700 min-w-48 z-50">
          {items.map((item, index) => (
            <button
              key={index}
              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
              onClick={() => setIsOpen(false)}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuItem;