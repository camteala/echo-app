interface FormatCodeArgs {
    editor: any;
    content: string;
    tabSize: number;
    onNotification: (message: string, isError?: boolean) => void;
    onUpdateContent: (newContent: string) => void;
  }
  
  export const formatCode = async ({
    editor,
    content,
    tabSize,
    onNotification,
    onUpdateContent
  }: FormatCodeArgs): Promise<void> => {
    try {
      onNotification("Formatting code...");
      
      // Get the current model
      const model = editor.getModel();
      if (!model) {
        onNotification("Editor model not available", true);
        return;
      }
      
      // Request formatting from Monaco
      await editor.getAction('editor.action.formatDocument').run();
      
      // Get the updated content
      const formattedContent = editor.getValue();
      
      // Update content if it changed
      if (formattedContent !== content) {
        onUpdateContent(formattedContent);
        onNotification("Code formatted successfully");
      } else {
        onNotification("No formatting changes needed");
      }
    } catch (error) {
      onNotification(`Formatting failed: ${error instanceof Error ? error.message : String(error)}`, true);
      console.error("Format error:", error);
    }
  };