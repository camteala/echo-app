import React from 'react';
import ExplorerItem from './ExplorerItem';
import { FileEntry } from '../../interfaces';

interface ExplorerProps {
  folderContents: FileEntry[];
  onFileClick: (filePath: string) => void;
}

const Explorer: React.FC<ExplorerProps> = ({ folderContents, onFileClick }) => (
  <div className="space-y-2">
    {folderContents.map((item, index) => (
      <ExplorerItem key={index} item={item} onFileClick={onFileClick} />
    ))}
  </div>
);

export default Explorer;