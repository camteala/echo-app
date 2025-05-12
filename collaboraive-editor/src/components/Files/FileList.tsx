import React, { JSX, useState } from 'react';
import { Code, Edit, FileText, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { File } from '../../types';


interface FileListProps {
  files: File[];
  activeFileId: number | null;
  editingFileId: number | null;
  isCreatingFile: boolean;
  newFileName: string;
  newFileLanguage: string;
  theme: any;
  darkMode: boolean;
  languageIcons: Record<string, JSX.Element>;
  
  // Setters
  setActiveFileId: (id: number) => void;
  setLanguage: (language: string) => void;
  setEditingFileId: (id: number | null) => void;
  setIsCreatingFile: (isCreating: boolean) => void;
  setNewFileName: (name: string) => void;
  setNewFileLanguage: (language: string) => void;
  
  // Handlers
  handleCreateFile: () => void;
  handleRenameFile: (id: number, name: string) => void;
  handleDeleteFile: (id: number) => void;
  loadRoomState: () => void; // Function to refresh the file list
}

const FileList: React.FC<FileListProps> = ({
  files,
  activeFileId,
  editingFileId,
  isCreatingFile,
  newFileName,
  newFileLanguage,
  theme,
  darkMode,
  languageIcons,
  setActiveFileId,
  setLanguage,
  setEditingFileId,
  setIsCreatingFile,
  setNewFileName,
  setNewFileLanguage,
  handleCreateFile,
  handleRenameFile,
  handleDeleteFile,
  loadRoomState,
}) => {
  // Add state to track the temporary name during editing
  const [editingName, setEditingName] = useState<string>('');
  
  // Set the initial value when entering edit mode
  const startEditing = (id: number, name: string) => {
    setEditingFileId(id);
    setEditingName(name);
  };
  
  // Complete the rename when editing is finished
  const completeRename = (id: number) => {
    if (editingFileId === id && editingName.trim() !== '') {
      handleRenameFile(id, editingName);
    }
    setEditingFileId(null);
  };

  // Function to handle file creation
  return (
    <div className="p-4 w-48">
    <div className="flex items-center mb-4">
  <h2 className={`${theme.text} font-medium flex items-center`}>
    <FileText className="w-4 h-4 mr-1.5 text-logo-beige" />
    <span className="text-logo-beige font-medium">Files</span>
  </h2>
  <div className="flex-1"></div>
  {/* Wrap buttons in a flex container with space between them */}
  <div className="flex items-center space-x-2">
    <button
      onClick={() => setIsCreatingFile(true)}
      className={`p-1.5 ${theme.button} rounded-md`}
      title="New File"
    >
      <Plus className="w-4 h-4" />
    </button>
    <button
      onClick={() => loadRoomState()}
      className={`p-1.5 ${theme.button} rounded-md`}
      title="Refresh Files"
    >
      <RefreshCw className="w-4 h-4" />
    </button>
  </div>
</div>
      {/* New File Form (inline) */}
      {isCreatingFile && (
        <div className="mb-4 p-3 rounded-md border" style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}>
          <div className="flex flex-col space-y-2 mb-3">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="File name"
              className={`${theme.input} px-2 py-1 text-sm rounded-md w-full border`}
            />
            <select
              value={newFileLanguage}
              onChange={(e) => setNewFileLanguage(e.target.value)}
              className={`${theme.input} px-2 py-1 text-sm rounded-md w-full border`}
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
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsCreatingFile(false)}
              className={`px-2 py-1 ${theme.button} rounded-md text-sm`}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFile}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
            >
              Create
            </button>
          </div>
        </div>
      )}

       {/* File List */}
       <div className="space-y-1">
        {files.map((file) => (
          <div
            key={file.id}
            className={`p-2 rounded-md text-sm flex items-center ${
              file.id === activeFileId
                ? theme.activeFileItem
                : theme.fileItem
            }`}
          >
            {/* File Icon */}
            <div className="mr-2">
              {languageIcons[file.language] || <Code className="w-3 h-3" />}
            </div>

            {/* File Name (editable or display) */}
            {editingFileId === file.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => completeRename(file.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    completeRename(file.id);
                  } else if (e.key === 'Escape') {
                    setEditingFileId(null);
                  }
                }}
                autoFocus
                className={`${theme.input} px-1 py-0.5 text-sm flex-1 rounded-md border`}
              />
            ) : (
              <span
                className="flex-1 cursor-pointer truncate"
                onClick={() => {
                  setActiveFileId(file.id);
                }}
              >
                {file.name}
              </span>
            )}

            {/* File Actions */}
            <div className="flex space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(file.id, file.name);
                }}
                className="p-1 hover:bg-gray-600 rounded-md"
                title="Rename"
              >
                <Edit className="w-3 h-3" />
              </button>
              {files.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(file.id);
                  }}
                  className="p-1 hover:bg-gray-600 rounded-md"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList;