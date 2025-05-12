// Common types used across components
export interface File {
  id: number;
  name: string;
  content: string;
  language: string;
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  color?: string;
  isOnline?: boolean; // Added the isOnline property
  cursor?: {
    position: number;
    selection?: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };

  };

}

export interface Selection {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  fileId: string;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
  fileId: string;
}


export interface CodeEditorProps {
  roomId: string;
  currentUser?: User | null; // Make it optional with ? and allow null
}

export interface Theme {
  background: string;
  header: string;
  border: string;
  button: string;
  input: string;
  text: string;
  sidebar: string;
  activeFileItem: string;
  fileItem: string;
  dropdownBg: string;
  statusConnected: string;
  statusDisconnected: string;
  statusConnecting: string;
}

export interface UseCodeExecutionSocketProps {
  onOutputReceived: (data: string) => void;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';


export interface CodeChange {
  id: string;
  fileId: number | string;
  userId: string;
  timestamp: number;
  version: number;
  content: string;
  cursorPosition?: {
    lineNumber: number;
    column: number;
  };
}

// export interface User {
//   id: string;
//   name: string;
//   avatarUrl: string;
//   reputation: number;
//   isOnline: boolean;
// }

export interface Question {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  code: string | null;
  tags: string[];
  votes: number;
  answers: number;
  views: number;
  asked_at: string;
  user_id: string | null;
  user_name: string;
  user_avatar: string | null;
  active_users?: string[]; // Make this optional with '?'

}

export interface Category {
  id: string;
  name: string;
  count: number;
}

