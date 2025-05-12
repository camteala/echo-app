import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Clipboard, Trash2, StopCircle, RefreshCw } from 'lucide-react';

interface TerminalProps {
  output: string;
  isRunning: boolean;
  isWaitingForInput: boolean;
  onSendInput: (input: string) => void;
  onStopProcess: () => void;
  onClearTerminal: () => void;
  onReconnect?: () => void; // Add new prop for reconnection

  theme: {
    terminalBackground: string;
    terminalText: string;
    input: string;
    button: string;
  };
  height: number;
  executingUser?: string | null; // Added prop for who is executing
}

const InteractiveTerminal: React.FC<TerminalProps> = ({
  output,
  isRunning,
  isWaitingForInput,
  onSendInput,
  onStopProcess,
  onClearTerminal,
  onReconnect, // Add new prop
  theme,
  height,
  executingUser
}) => {
  const [currentInput, setCurrentInput] = useState<string>('');
  const outputRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const [actualHeight, setActualHeight] = useState(height);
  
  useEffect(() => {
    // Ensure height doesn't exceed viewport
    const updateHeight = () => {
      const viewportHeight = window.innerHeight;
      // Reserve 120px for header and input areas
      const maxAllowedHeight = viewportHeight - 120;
      const safeHeight = Math.min(height, maxAllowedHeight);
      setActualHeight(safeHeight);
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => window.removeEventListener('resize', updateHeight);
  }, [height]);
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentInput(e.target.value);
  };

  // Handle sending input to the program
  const handleSendInput = () => {
    if (currentInput && isWaitingForInput) {
      onSendInput(currentInput);
      setCurrentInput('');
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendInput();
    } else if (e.ctrlKey && e.key === 'c') {
      // Handle CTRL+C to interrupt the process
      onStopProcess();
    }
  };

  // Copy output to clipboard
  const copyOutputToClipboard = () => {
    if (output) {
      navigator.clipboard.writeText(output);
    }
  };

  // Auto-focus input when waiting for input
  useEffect(() => {
    if (isWaitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isWaitingForInput]);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
      console.log("Terminal scrolled to bottom after output update");
    }
  }, [output]);

  

  return (
    
    <div
      ref={terminalRef}
      className={`${theme.terminalBackground} flex flex-col`}
      style={{ 
        height: `${actualHeight}px`,
        maxHeight: '70vh', // Prevent taking too much space
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Terminal Header */}
      <div className="flex items-center border-b border-gray-700">
        <div className="flex items-center px-4 py-2 text-sm font-medium">
          <Terminal className="w-3.5 h-3.5 mr-1.5 text-logo-beige" />
          <span className="text-logo-beige font-medium">Terminal</span>
          {isRunning && executingUser && (
            <span className="ml-2 text-green-400 text-xs font-semibold">
              {executingUser !== 'You' 
                ? `${executingUser} is running code` 
                : 'You are running code'}
            </span>
          )}
          {isWaitingForInput && (
            <span className="ml-2 text-yellow-400 text-xs">(Waiting for input)</span>
          )}
        </div>
        <div className="flex-1"></div>
        <div className="flex space-x-1 p-1">
           {/* Add reconnect button */}
           {onReconnect && (
            <button
              onClick={onReconnect}
              className={`p-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white`}
              title="Reconnect to server"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={copyOutputToClipboard}
            className={`p-1 rounded-md ${theme.button}`}
            title="Copy to clipboard"
          >
            <Clipboard className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClearTerminal}
            className={`p-1 rounded-md ${theme.button}`}
            title="Clear terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {isRunning && (
            <button
              onClick={onStopProcess}
              className="p-1 rounded-md bg-red-600 hover:bg-red-700"
              title="Stop process (Ctrl+C)"
            >
              <StopCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

   {/* Terminal Content - flexible height with scroll */}
   <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-2 h-full">
          {executingUser && executingUser !== 'You' && isRunning && (
            <div className="sticky top-0 z-10 mb-2 px-2 py-1 bg-blue-600 bg-opacity-80 text-white rounded text-sm font-medium">
              Code execution by {executingUser} in progress...
            </div>
          )}
          
          <pre
            ref={outputRef}
            className={`terminal-output ${theme.terminalText} font-mono text-sm whitespace-pre-wrap h-full overflow-y-auto`}
            data-test-id="terminal-output"
          >
            {output || "Terminal ready. Run your code to see output here."}
          </pre>
        </div>
      </div>

   {/* Input Area - fixed height, always visible */}
   <div className="p-2 py-6 border-t border-gray-700 flex-shrink-0">
        <div className="flex items-center">
          <span className={`${theme.terminalText} mr-2 ${isWaitingForInput ? "text-green-400" : "text-gray-500"}`}>
            {isWaitingForInput ? "❯" : "○"}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isWaitingForInput ? "Type your input here..." : "Waiting for program to request input..."}
            disabled={!isWaitingForInput}
            className={`flex-1 px-3 py-2 ${theme.input} rounded-md focus:outline-none 
              ${isWaitingForInput && isRunning
                ? "border-green-500 focus:ring-2 focus:ring-green-500"
                : "opacity-75"}`}
          />
          <button
            onClick={handleSendInput}
            disabled={!isWaitingForInput}
            className={`ml-2 px-3 py-2 rounded-md ${isWaitingForInput && isRunning
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default InteractiveTerminal;