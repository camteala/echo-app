import { useState, useRef } from 'react';

export const useCodeEditor = () => {
  const [language, setLanguage] = useState<string>('javascript'); // Default language
  const [output, setOutput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file open
  const handleFileOpen = () => {
    fileInputRef.current?.click();
  };

  // Handle file select
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      return new Promise<{ content: string; language: string }>((resolve, reject) => {
        reader.onload = (e) => {
          const content = e.target?.result as string;

          // Detect the file's language based on its extension
          const extension = file.name.split('.').pop()?.toLowerCase();
          let detectedLanguage = 'plaintext'; // Default language
          switch (extension) {
            case 'js':
              detectedLanguage = 'javascript';
              break;
            case 'py':
              detectedLanguage = 'python';
              break;
            case 'java':
              detectedLanguage = 'java';
              break;
            case 'ts':
              detectedLanguage = 'typescript';
              break;
            case 'c':
              detectedLanguage = 'c';
              break;
            case 'cpp':
              detectedLanguage = 'cpp';
              break;
            case 'go':
              detectedLanguage = 'go';
              break;
            case 'rs':
              detectedLanguage = 'rust';
              break;
            case 'rb':
              detectedLanguage = 'ruby';
              break;
            case 'php':
              detectedLanguage = 'php';
              break;
            default:
              detectedLanguage = 'plaintext';
          }

          resolve({ content, language: detectedLanguage });
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
      });
    }
    return null;
  };

  // Handle save file
  const handleSaveFile = (code: string, language: string) => {
    // Map language to file extension
    const extensionMap: { [key: string]: string } = {
      javascript: 'js',
      python: 'py',
      java: 'java',
      typescript: 'ts',
      c: 'c',
      cpp: 'cpp',
      go: 'go',
      rust: 'rs',
      ruby: 'rb',
      php: 'php',
      plaintext: 'txt', // Default extension
    };

    // Get the file extension based on the language
    const extension = extensionMap[language] || 'txt';

    // Create a Blob with the file content
    const blob = new Blob([code], { type: 'text/plain' });

    // Create a temporary URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a link element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${extension}`; // Use the correct file extension
    document.body.appendChild(a);

    // Trigger the download
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Run code
  const runCode = async (inputValues: string, fileName: string, code: string, language: string) => {
    setOutput('Running...');

    try {
      const response = await fetch('http://localhost:5000/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language, // Pass the file's language
          code,
          input: inputValues,
          fileName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'HTTP error!');
      }

      const data = await response.json();
      setOutput(data.output || data.error || 'No output');
    } catch (error) {
      if (error instanceof Error) {
        setOutput(`Error: ${error.message}`);
      } else {
        setOutput('An unknown error occurred');
      }
    }
  };

  return {
    language,
    output,
    fileInputRef,
    setLanguage,
    handleFileOpen,
    handleFileSelect,
    handleSaveFile,
    runCode,
    setOutput,
  };
};