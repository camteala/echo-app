import { Monaco } from '@monaco-editor/react';

/**
 * Basic code indentation formatter
 * @param code The code to format
 * @param tabSize The number of spaces to use for each indentation level
 * @returns Formatted code with proper indentation
 */
export const indentCode = (code: string, tabSize: number): string => {
  const lines = code.split('\n');
  let indentLevel = 0;
  const indentChar = ' '.repeat(tabSize);

  // Characters that typically increase indent on the next line
  const increaseIndentChars = ['{', '[', '('];
  // Characters that typically decrease indent on the current line
  const decreaseIndentChars = ['}', ']', ')'];

  const result = lines.map((line) => {
    // Trim the line to handle existing indentation
    const trimmedLine = line.trim();

    // Decrease indent for lines that start with closing brackets
    if (trimmedLine.length > 0 && decreaseIndentChars.includes(trimmedLine[0])) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Apply the current indent level
    const indentedLine = indentLevel > 0 ? indentChar.repeat(indentLevel) + trimmedLine : trimmedLine;

    // Increase indent for next line if this line ends with opening brackets
    if (trimmedLine.length > 0) {
      const lastChar = trimmedLine[trimmedLine.length - 1];
      if (increaseIndentChars.includes(lastChar)) {
        indentLevel++;
      }
    }

    return indentedLine;
  });

  return result.join('\n');
};

/**
 * Format code using Monaco editor's built-in formatter first, 
 * then fall back to basic indentation if needed
 */
export const formatCode = async ({
  editor,
  content,
  tabSize,
  onNotification,
  onUpdateContent,
}: {
  editor: any;
  content: string;
  tabSize: number;
  onNotification: (message: string, isError?: boolean) => void;
  onUpdateContent: (newContent: string) => void;
}): Promise<void> => {
  try {
    onNotification("Formatting document...");

    // Get the model
    const model = editor.getModel();
    if (!model) {
      onNotification("No active document to format", true);
      return;
    }

    // First try Monaco's built-in formatter
    try {
      // Use the editor's formatting action
      await editor.getAction('editor.action.formatDocument').run();

      // Check if anything changed by getting the new value
      const newContent = model.getValue();

      // If no changes were made (or no formatter available), fall back to our basic formatter
      if (newContent === content) {
        const formattedContent = indentCode(content, tabSize);

        // Only update if our formatting actually changed something
        if (formattedContent !== content) {
          // Set the formatted content in the editor
          editor.setValue(formattedContent);
          onUpdateContent(formattedContent);
          onNotification("Document formatted using basic indentation");
        } else {
          onNotification("No formatting changes needed");
        }
      } else {
        // Update with Monaco's formatting changes
        onUpdateContent(newContent);
        onNotification("Document formatted");
      }
    } catch (err) {
      console.error("Monaco formatter error:", err);

      // Fall back to our basic formatter
      const formattedContent = indentCode(content, tabSize);

      // Only update if our formatting actually changed something
      if (formattedContent !== content) {
        // Set the formatted content in the editor
        editor.setValue(formattedContent);
        onUpdateContent(formattedContent);
        onNotification("Document formatted using basic indentation");
      } else {
        onNotification("No formatting changes needed");
      }
    }
  } catch (error) {
    console.error("Format error:", error);
    onNotification(`Formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
  }
};