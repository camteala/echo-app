import React, { useState } from 'react';
import { Files } from 'lucide-react';
import { FileEntry } from '../../interfaces';

interface ExplorerItemProps {
  item: FileEntry;
  onFileClick: (filePath: string) => void;
}

const ExplorerItem: React.FC<ExplorerItemProps> = ({ item, onFileClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <div
        className="flex items-center text-sm text-gray-300 hover:bg-gray-800 px-2 py-1 rounded cursor-pointer"
        onClick={() => {
          if (item.type === 'file') {
            onFileClick(item.path); // Trigger file click handler
          } else {
            setIsOpen(!isOpen); // Toggle folder open/close
          }
        }}
      >
        <Files size={16} className="mr-2" />
        {item.name}
      </div>
      {item.type === 'folder' && isOpen && item.items && (
        <div className="ml-4">
          {item.items.map((subItem, index) => (
            <ExplorerItem key={index} item={subItem} onFileClick={onFileClick} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExplorerItem;