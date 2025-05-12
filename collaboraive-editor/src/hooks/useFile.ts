import { useState } from 'react';
import { File } from '../types';
import { languageExtensions } from '../lib/constants';

interface UseFileManagementProps {
  onLanguageChange: (language: string) => void;
}

export function useFile({ onLanguageChange }: UseFileManagementProps) {
  const [files, setFiles] = useState<File[]>([
    { id: 1, name: 'Main.py', content: '// Start coding here...', language: 'python' },
  ]);
  const [activeFileId, setActiveFileId] = useState<number | null>(1);
  const [newFileName, setNewFileName] = useState<string>('');
  const [newFileLanguage, setNewFileLanguage] = useState<string>('python');
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [isCreatingFile, setIsCreatingFile] = useState<boolean>(false);

  const createFile = () => {
    if (newFileName.trim() === '') return;

    let finalFileName = newFileName;
    if (!finalFileName.includes('.')) {
      const extension = languageExtensions[newFileLanguage] || newFileLanguage;
      finalFileName = `${finalFileName}.${extension}`;
    }

    const newFile: File = {
      id: Date.now(),
      name: finalFileName,
      content: '// Start coding here...',
      language: newFileLanguage,
    };

    setFiles([...files, newFile]);
    setNewFileName('');
    setActiveFileId(newFile.id);
    onLanguageChange(newFileLanguage);
    setIsCreatingFile(false);
  };

  const renameFile = (id: number, newName: string) => {
    const updatedFiles = files.map((file) =>
      file.id === id ? { ...file, name: newName } : file
    );
    setFiles(updatedFiles);
    setEditingFileId(null);
  };

  const deleteFile = (id: number) => {
    const updatedFiles = files.filter((file) => file.id !== id);
    setFiles(updatedFiles);

    if (activeFileId === id) {
      setActiveFileId(updatedFiles[0]?.id || null);
    }
  };

  const updateFileContent = (fileId: number, content: string) => {
    const updatedFiles = files.map((file) =>
      file.id === fileId ? { ...file, content } : file
    );
    setFiles(updatedFiles);
    return updatedFiles;
  };

  const addFileFromUpload = (fileName: string, content: string, language: string) => {
    const newFile: File = {
      id: Date.now(),
      name: fileName,
      content,
      language,
    };

    setFiles([...files, newFile]);
    setActiveFileId(newFile.id);
    onLanguageChange(language);
    return newFile;
  };

  const getActiveFile = () => files.find(file => file.id === activeFileId);

  return {
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    newFileName,
    setNewFileName,
    newFileLanguage,
    setNewFileLanguage,
    editingFileId,
    setEditingFileId,
    isCreatingFile,
    setIsCreatingFile,
    createFile,
    renameFile,
    deleteFile,
    updateFileContent,
    addFileFromUpload,
    getActiveFile
  };
}