import { ReactNode } from 'react';

export interface SidebarItemProps {
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
}

export interface MenuItemProps {
  label: string;
  items: string[];
}

export interface ChatMessage {
  id: number;
  user: string;
  message: string;
  time: string;
}

export interface FileEntry {
  name: string;
  type: 'file' | 'folder';
  path: string;
  items?: FileEntry[];
}