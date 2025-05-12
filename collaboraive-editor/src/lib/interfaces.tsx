
export interface File {
    id: number;
    name: string;
    content: string;
    language: string;
  }
  
  export interface CodeEditorProps {
    roomId: string;
  }

  export interface UseCodeExecutionSocketProps {
    onOutputReceived: (data: string) => void;
  }